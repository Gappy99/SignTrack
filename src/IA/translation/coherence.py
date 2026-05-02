import json
import os
import re
from urllib import error, request

from shared.env_loader import load_project_env
from translation.text_normalizer import normalize_text

load_project_env()

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
REQUEST_TIMEOUT_SECONDS = 10


def _basic_cleanup(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    return cleaned


def _request_gemini(model: str, api_key: str, prompt: str) -> str:
    prompt = (
        prompt
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 120,
        },
    }

    body = json.dumps(payload).encode("utf-8")
    url = GEMINI_API_URL.format(model=model, api_key=api_key)
    req = request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"GEMINI_HTTP_{exc.code}: {detail}") from exc
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"GEMINI_REQUEST_FAILED: {exc}") from exc

    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("GEMINI_EMPTY_CANDIDATES")

    parts = (((candidates[0].get("content") or {}).get("parts")) or [])
    text = " ".join((part.get("text") or "").strip() for part in parts).strip()
    if not text:
        raise RuntimeError("GEMINI_EMPTY_TEXT")

    return _basic_cleanup(text)


def _call_gemini(raw_text: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY_MISSING")

    preferred_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    prompt = (
        "Eres un corrector de texto para salida de reconocimiento de señas. "
        "Debes mejorar coherencia, ortografía, puntuación y mayúsculas del español. "
        "Corrige letras repetidas por error de captura (ejemplo: BELLLA -> BELLA). "
        "No inventes hechos ni agregues información nueva. "
        "Devuelve solo la frase corregida, sin comillas ni explicaciones.\n\n"
        f"Texto detectado: {raw_text}"
    )

    models_to_try = []
    for candidate in (preferred_model, "gemini-2.0-flash", "gemini-1.5-flash-latest"):
        if candidate and candidate not in models_to_try:
            models_to_try.append(candidate)

    last_error = None
    for model in models_to_try:
        try:
            return _request_gemini(model=model, api_key=api_key, prompt=prompt)
        except RuntimeError as exc:
            last_error = exc
            # Si el modelo no existe o no soporta generateContent, intenta siguiente fallback.
            if "GEMINI_HTTP_404" in str(exc):
                continue
            raise

    raise RuntimeError(f"GEMINI_ALL_MODELS_FAILED: {last_error}")


def make_coherent_text(raw_text: str) -> dict:
    """
    Mejora el texto detectado usando Gemini y cae a normalización local si falla.
    """
    base = normalize_text(raw_text)
    cleaned = _basic_cleanup(base.get("normalized_text", ""))

    if not cleaned:
        return {
            "success": True,
            "provider": "local",
            "coherent_text": "",
            "changes_applied": base.get("changes_applied", []),
        }

    try:
        coherent = _call_gemini(cleaned)
        return {
            "success": True,
            "provider": "gemini",
            "coherent_text": coherent,
            "changes_applied": base.get("changes_applied", []),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "success": False,
            "provider": "local",
            "coherent_text": cleaned,
            "changes_applied": base.get("changes_applied", []),
            "error": str(exc),
        }
