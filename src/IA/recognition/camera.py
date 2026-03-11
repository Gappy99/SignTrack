import sys
import time
import os
from pathlib import Path
from collections import deque

import cv2
import numpy as np

IA_ROOT = Path(__file__).resolve().parent.parent
if str(IA_ROOT) not in sys.path:
    sys.path.append(str(IA_ROOT))

from shared.mp_hands_compat import (
    Hands as _MpHands,
    HAND_CONNECTIONS as _HAND_CONNECTIONS,
    DrawingUtils,
    DrawingSpec,
)
from shared.hand_features import LETTER_FEATURE_COUNT, build_letter_feature_vector, extract_ordered_hands

from model.predictor import predict as predict_letter
from shared.sentence_builder import SentenceBuilder
from shared.speech import speak_text
from translation.coherence import make_coherent_text
from translation.museum_guide import ask_museum_guide

# Intenta cargar el modelo de palabras (opcional — puede no estar entrenado aún)
try:
    from words.word_predictor import predict as predict_word
    WORD_MODEL_AVAILABLE = True
except Exception:
    predict_word = None
    WORD_MODEL_AVAILABLE = False

# ------------------------------------------------------------------
# Constantes de UI
# ------------------------------------------------------------------
MODE_LETTER = "LETRA"
MODE_WORD   = "PALABRA"
FLOW_NORMAL = "NORMAL"
FLOW_MUSEUM = "MUSEO"

COLOR_GREEN  = (0, 220, 0)
COLOR_BLUE   = (255, 180, 0)
COLOR_WHITE  = (255, 255, 255)
COLOR_GRAY   = (180, 180, 180)
COLOR_RED    = (0, 60, 220)
COLOR_YELLOW = (0, 220, 220)
COLOR_BG     = (30, 30, 30)

FONT = cv2.FONT_HERSHEY_SIMPLEX

# ------------------------------------------------------------------
# Captura automática
# ------------------------------------------------------------------
# Distancia media entre vectores para considerar que la seña sigue estable.
STABLE_DIFF_THRESHOLD = 0.030
# Distancia media para liberar el bloqueo después de capturar una seña.
RELEASE_DIFF_THRESHOLD = 0.05

# Tiempo mínimo de estabilidad antes de capturar automáticamente.
LETTER_STABLE_SECONDS = 0.35
WORD_STABLE_SECONDS = 0.9
LETTER_MIN_CONFIDENCE = 0.05
WORD_MIN_CONFIDENCE = 0.05
LETTER_CONSENSUS_FRAMES = 3
SMOOTHING_ALPHA = 0.45

# Si desaparece la mano por este tiempo, se libera el bloqueo para siguiente seña.
NO_HAND_RELEASE_SECONDS = 0.35
WORD_MIN_FRAMES = 5


def _feature_diff(a, b):
    if a is None or b is None:
        return 999.0
    arr_a = np.asarray(a, dtype=float)
    arr_b = np.asarray(b, dtype=float)
    return float(np.mean(np.abs(arr_a - arr_b)))


def _smooth_features(previous, current):
    if previous is None:
        return current

    prev_arr = np.asarray(previous, dtype=float)
    curr_arr = np.asarray(current, dtype=float)
    return ((1.0 - SMOOTHING_ALPHA) * prev_arr + SMOOTHING_ALPHA * curr_arr).astype(float).tolist()


def _has_prediction_consensus(history):
    if len(history) < LETTER_CONSENSUS_FRAMES:
        return None

    labels = [item[0] for item in history]
    first_label = labels[0]
    if any(label != first_label for label in labels[1:]):
        return None

    confidences = [item[1] for item in history if item[1] is not None]
    confidence = min(confidences) if confidences else None
    return first_label, confidence


def _to_word_feature_vector(frame_features_window):
    """Convierte una ventana de features por frame al vector temporal de palabras."""
    if not frame_features_window:
        return None

    frame_features = np.asarray(frame_features_window, dtype=float)
    if frame_features.ndim != 2 or frame_features.shape[1] != LETTER_FEATURE_COUNT:
        return None

    mean = frame_features.mean(axis=0)
    std = frame_features.std(axis=0)
    min_vals = frame_features.min(axis=0)
    max_vals = frame_features.max(axis=0)

    if len(frame_features) > 1:
        diffs = np.abs(np.diff(frame_features, axis=0)).mean(axis=0)
    else:
        diffs = np.zeros(frame_features.shape[1], dtype=float)

    detection_ratio = 1.0
    output = np.concatenate([mean, std, min_vals, max_vals, diffs, [detection_ratio]])
    return output.astype(float).tolist()


def _put_text_bg(frame, text, pos, scale, color, thickness=1):
    """Dibuja texto con fondo semiopaco para mejor legibilidad."""
    (tw, th), _ = cv2.getTextSize(text, FONT, scale, thickness)
    x, y = pos
    cv2.rectangle(frame, (x - 4, y - th - 4), (x + tw + 4, y + 6), COLOR_BG, -1)
    cv2.putText(frame, text, (x, y), FONT, scale, color, thickness, cv2.LINE_AA)


def main():
    mp_hands = _MpHands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5,
    )
    mp_drawing = DrawingUtils()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print(" No se pudo abrir la cámara")
        return

    print(" Cámara abierta")
    print("  CAPTURA AUTOMÁTICA ACTIVADA")
    print("  W       : cambiar modo letra / palabra")
    print("  M       : activar/desactivar modo museo")
    print("  BKSP    : deshacer último signo")
    print("  ENTER   : finalizar — imprimir oración")
    print("  ESC     : salir")
    print("  Gemini  : correccion de coherencia al finalizar")
    if not WORD_MODEL_AVAILABLE:
        print("  Modelo de palabras no disponible (entrena con train_word_model.py)")

    builder  = SentenceBuilder()
    mode     = MODE_LETTER
    flow_mode = FLOW_NORMAL
    current_museum_node = os.getenv("MUSEUM_START_NODE", "lobby")
    last_sign = ""
    feedback  = ""           # mensaje de estado temporal en pantalla

    # Estado de captura automática
    stable_start_ts = None
    last_features = None
    capture_locked = False
    captured_features = None
    hand_missing_since = None
    word_frame_features = []
    smoothed_features = None
    recent_letter_predictions = deque(maxlen=LETTER_CONSENSUS_FRAMES)

    while True:
        now = time.monotonic()

        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = mp_hands.process(rgb)

        # ── Landmarks ──────────────────────────────────────────────
        if results.multi_hand_landmarks:
            for hand_lm in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    frame, hand_lm, _HAND_CONNECTIONS,
                    DrawingSpec(color=COLOR_GREEN, thickness=2, circle_radius=2),
                    DrawingSpec(color=COLOR_BLUE,  thickness=2),
                )

        # ── HUD ────────────────────────────────────────────────────
        # Fila 1: modo activo
        mode_color = COLOR_GREEN if mode == MODE_LETTER else COLOR_YELLOW
        flow_suffix = f" | FLUJO: {flow_mode}"
        mode_label = f"MODO: {mode}{flow_suffix}"
        if mode == MODE_WORD and not WORD_MODEL_AVAILABLE:
            mode_label += " (sin modelo)"
            mode_color = COLOR_RED
        _put_text_bg(frame, mode_label, (10, 35), 0.8, mode_color, 2)

        if flow_mode == FLOW_MUSEUM:
            _put_text_bg(frame, f"Ubicacion actual: {current_museum_node}", (10, 105), 0.6, COLOR_YELLOW, 1)

        # Fila 2: último signo detectado
        if last_sign:
            _put_text_bg(frame, f"Detectado: {last_sign}", (10, 75), 0.8, COLOR_WHITE, 2)

        # Fila 3: oración acumulada (con wrap si es larga)
        preview = builder.preview()
        max_chars = w // 14          # caracteres aproximados por línea
        lines = [preview[i:i+max_chars] for i in range(0, max(len(preview), 1), max_chars)]
        for idx, line in enumerate(lines):
            _put_text_bg(frame, line, (10, 120 + idx * 32), 0.75, COLOR_WHITE, 2)

        # Fila inferior: ayuda
        hint_y = h - 10
        if feedback:
            _put_text_bg(frame, feedback, (10, hint_y - 28), 0.55, COLOR_YELLOW, 1)
        auto_state = "Bloqueado: cambia o quita la mano" if capture_locked else "Listo para detectar"
        _put_text_bg(frame, f"Auto: {auto_state}", (10, hint_y - 56), 0.5, COLOR_GRAY, 1)
        _put_text_bg(
            frame,
            "Auto ON  W:modo  M:museo  BKSP:deshacer  ENTER:finalizar  ESC:salir",
            (10, hint_y), 0.45, COLOR_GRAY, 1,
        )

        cv2.imshow("SignTrack - Reconocimiento de Senas", frame)

        # ── Captura automática ─────────────────────────────────────
        detected_hands = extract_ordered_hands(results)

        if not detected_hands:
            stable_start_ts = None
            last_features = None
            smoothed_features = None
            recent_letter_predictions.clear()
            if not capture_locked:
                word_frame_features = []

            if capture_locked:
                if hand_missing_since is None:
                    hand_missing_since = now
                elif (now - hand_missing_since) >= NO_HAND_RELEASE_SECONDS:
                    capture_locked = False
                    captured_features = None
                    hand_missing_since = None
                    feedback = "Listo: vuelve a mostrar la siguiente seña"
            else:
                hand_missing_since = None
        else:
            hand_missing_since = None

            try:
                current_features = build_letter_feature_vector(detected_hands)
            except Exception as exc:
                feedback = f"Error extrayendo features: {exc}"
                current_features = None

            if current_features is not None:
                smoothed_features = _smooth_features(smoothed_features, current_features)

                if mode == MODE_WORD and not capture_locked:
                    word_frame_features.append(smoothed_features)
                    if len(word_frame_features) > 64:
                        word_frame_features.pop(0)
                elif mode == MODE_LETTER:
                    word_frame_features = []

                if capture_locked:
                    # Se desbloquea cuando cambia suficientemente respecto a la seña capturada.
                    if _feature_diff(smoothed_features, captured_features) >= RELEASE_DIFF_THRESHOLD:
                        capture_locked = False
                        captured_features = None
                        stable_start_ts = now
                        last_features = smoothed_features
                        recent_letter_predictions.clear()
                        feedback = "Cambio detectado: listo para nueva seña"
                else:
                    if stable_start_ts is None:
                        stable_start_ts = now
                        last_features = smoothed_features
                        recent_letter_predictions.clear()
                    else:
                        # Si cambia demasiado, reinicia ventana de estabilidad.
                        if _feature_diff(smoothed_features, last_features) > STABLE_DIFF_THRESHOLD:
                            stable_start_ts = now
                            recent_letter_predictions.clear()
                        last_features = smoothed_features

                    required_stable = LETTER_STABLE_SECONDS if mode == MODE_LETTER else WORD_STABLE_SECONDS
                    stable_for = now - stable_start_ts

                    if stable_for >= required_stable:
                        try:
                            if mode == MODE_LETTER:
                                label, conf = predict_letter(smoothed_features, return_confidence=True)
                                recent_letter_predictions.append((str(label), conf))
                                consensus = _has_prediction_consensus(recent_letter_predictions)
                                if consensus is None:
                                    conf_str = f"{conf*100:.0f}%" if conf is not None else "?"
                                    feedback = f"Validando letra ({len(recent_letter_predictions)}/{LETTER_CONSENSUS_FRAMES})..."
                                    continue

                                label, conf = consensus
                                builder.add_letter(label)
                                last_sign = label
                                conf_str = f"{conf*100:.0f}%" if conf is not None else "?"
                                feedback = f"Letra: {label} ({conf_str})"
                                print(f"  Letra: {label} ({conf_str})  →  {builder.build()}")
                            else:
                                if len(word_frame_features) < WORD_MIN_FRAMES:
                                    feedback = f"Mantén la seña más tiempo ({len(word_frame_features)}/{WORD_MIN_FRAMES})"
                                    stable_start_ts = now
                                    continue

                                word_features = _to_word_feature_vector(word_frame_features)
                                if not word_features:
                                    feedback = "No se pudieron construir features de palabra"
                                    stable_start_ts = now
                                    continue

                                label, conf = predict_word(word_features)
                                if conf is not None and conf < WORD_MIN_CONFIDENCE:
                                    feedback = f"Palabra ambigua ({conf*100:.0f}%). Repite el movimiento"
                                    stable_start_ts = now
                                    continue

                                builder.add_word(label)
                                ure_locked = True
                            captured_features = smoothed_features
                            stable_start_ts = None
                            last_features = None
                            word_frame_features = []
                            recent_letter_predictions.clear()

                        except Exception as exc:
                            feedback = f"Error: {exc}"
                            print(f"Error {exc}")

        # ── Teclado ────────────────────────────────────────────────
        key = cv2.waitKey(1) & 0xFF

        if key == 27:       # ESC → salir
            break

        elif key == 13:     # ENTER → finalizar oración
            sentence = builder.build()
            if sentence:
                coherence = make_coherent_text(sentence)
                coherent_sentence = coherence.get("coherent_text", sentence)
                provider = coherence.get("provider", "local")

                print(f"\n Oración cruda: {sentence}")
                print(f" Oración coherente ({provider}): {coherent_sentence}\n")

                if flow_mode == FLOW_MUSEUM:
                    guide = ask_museum_guide(coherent_sentence, current_museum_node)
                    if guide.get("success"):
                        response_text = guide.get("response_text") or coherent_sentence
                        spoke = speak_text(response_text)
                        target_name = guide.get("target_name") or "seccion"
                        current_museum_node = guide.get("next_node_key", current_museum_node)
                        print(f" Guia museo: {response_text}")
                        if spoke:
                            feedback = f"Museo: {target_name} + voz"
                        else:
                            feedback = f"Museo: {response_text}"
                    else:
                        guide_error = guide.get("error", "Guia museo no disponible")
                        print(f" Guia museo fallback: {guide_error}")
                        spoke = speak_text(coherent_sentence)
                        if spoke:
                            feedback = "Museo fallback + voz"
                        else:
                            feedback = f"Museo fallback: {coherent_sentence}"
                else:
                    spoke = speak_text(coherent_sentence)

                    if coherence.get("success"):
                        if spoke:
                            feedback = f"Final ({provider}) + voz"
                        else:
                            feedback = f"Final ({provider}): {coherent_sentence}"
                    else:
                        gemini_error = coherence.get("error", "Gemini no disponible")
                        print(f" Gemini fallback: {gemini_error}")
                        if spoke:
                            feedback = "Final (fallback local) + voz"
                        else:
                            feedback = f"Fallback local (Gemini): {coherent_sentence}"
            else:
                feedback = "Nada acumulado aún"
            builder.clear()
            last_sign = ""

        elif key == 8:      # BACKSPACE → deshacer último signo
            removed = builder.undo()
            if removed:
                feedback = f"Deshecho: {removed}"
                last_sign = ""
            else:
                feedback = "Nada que deshacer"

        elif key in (ord("w"), ord("W")):   # W → cambiar modo
            if not WORD_MODEL_AVAILABLE:
                feedback = "Modelo de palabras no disponible"
            else:
                mode = MODE_WORD if mode == MODE_LETTER else MODE_LETTER
                feedback = f"Modo cambiado a: {mode}"

        elif key in (ord("m"), ord("M")):   # M → activar/desactivar flujo museo
            flow_mode = FLOW_MUSEUM if flow_mode == FLOW_NORMAL else FLOW_NORMAL
            feedback = f"Flujo cambiado a: {flow_mode}"

    cap.release()
    cv2.destroyAllWindows()
    final = builder.build()
    if final:
        print(f"\n Oración final: {final}")
    print("✓ Cámara cerrada")


if __name__ == "__main__":
    main()
