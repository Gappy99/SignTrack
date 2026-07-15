from __future__ import annotations

import numpy as np

PER_HAND_FEATURE_COUNT = 9
MAX_HANDS = 2
LETTER_FEATURE_COUNT = PER_HAND_FEATURE_COUNT * MAX_HANDS
WORD_FEATURE_COUNT = LETTER_FEATURE_COUNT * 5 + 1


def distance(p1, p2):
    return float(np.linalg.norm(np.array(p1) - np.array(p2)))


def angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    denominator = np.linalg.norm(ba) * np.linalg.norm(bc)
    if denominator == 0:
        return 0.0

    cosine = np.dot(ba, bc) / denominator
    cosine = np.clip(cosine, -1.0, 1.0)

    return float(np.arccos(cosine))


def extract_single_hand_features(points):
    features = []

    features.append(distance(points[4], points[8]))
    features.append(distance(points[8], points[12]))
    features.append(distance(points[12], points[16]))
    features.append(distance(points[16], points[20]))
    features.append(distance(points[4], points[20]))

    features.append(angle(points[5], points[6], points[8]))
    features.append(angle(points[9], points[10], points[12]))
    features.append(angle(points[13], points[14], points[16]))
    features.append(angle(points[17], points[18], points[20]))

    return features


def _normalize_handedness_label(value):
    normalized = str(value or "").strip().lower()
    if normalized in {"left", "izquierda"}:
        return "left"
    if normalized in {"right", "derecha"}:
        return "right"
    return None


def _extract_handedness_label(entry):
    candidate = entry
    if isinstance(candidate, (list, tuple)):
        candidate = candidate[0] if candidate else None

    if candidate is None:
        return None

    if isinstance(candidate, dict):
        for key in ("category_name", "display_name", "label", "name"):
            if candidate.get(key):
                return _normalize_handedness_label(candidate.get(key))
        return None

    for attr in ("category_name", "display_name", "label", "name"):
        if hasattr(candidate, attr):
            value = getattr(candidate, attr)
            if value:
                return _normalize_handedness_label(value)

    return None


def extract_ordered_hands(results):
    landmarks = list(getattr(results, "multi_hand_landmarks", None) or [])
    handedness = list(getattr(results, "multi_handedness", None) or [])

    hands = []
    for index, hand_landmarks in enumerate(landmarks[:MAX_HANDS]):
        points = [
            [float(lm.x), float(lm.y), float(lm.z)]
            for lm in hand_landmarks.landmark
        ]
        label = _extract_handedness_label(handedness[index]) if index < len(handedness) else None
        wrist_x = float(points[0][0]) if points else float(index)
        hands.append({
            "points": points,
            "label": label,
            "wrist_x": wrist_x,
        })

    if len(hands) <= 1:
        return hands

    if any(hand["label"] in {"left", "right"} for hand in hands):
        order = {"left": 0, "right": 1, None: 2}
        hands.sort(key=lambda hand: (order.get(hand["label"], 2), hand["wrist_x"]))
    else:
        hands.sort(key=lambda hand: hand["wrist_x"])

    return hands


def build_letter_feature_vector(hands):
    active_hands = list(hands[:MAX_HANDS])
    if len(active_hands) == 1:
        active_hands = [active_hands[0]]

    vector = []
    for hand in active_hands:
        vector.extend(extract_single_hand_features(hand["points"]))

    if len(active_hands) < MAX_HANDS:
        vector.extend([0.0] * ((MAX_HANDS - len(active_hands)) * PER_HAND_FEATURE_COUNT))

    return vector


def build_landmark_payload(hands):
    serialized_hands = []
    for index, hand in enumerate(hands[:MAX_HANDS]):
        serialized_hands.append({
            "slot": index,
            "label": hand.get("label"),
            "points": hand.get("points", []),
        })

    return {
        "schema_version": "two-hand-v1",
        "hand_count": len(serialized_hands),
        "hands": serialized_hands,
    }