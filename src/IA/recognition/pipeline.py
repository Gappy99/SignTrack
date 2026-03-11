from datetime import datetime
from typing import Any, Dict

from features.feature_extractor import extract_features
from model.predictor import predict


def predict_from_hand_landmarks(hand_landmarks: Any) -> Dict[str, Any]:
    """Ejecuta el flujo minimo de reconocimiento para un frame.

    1. Extrae features desde landmarks.
    2. Invoca el modelo clasificador.
    3. Devuelve una salida normalizada para el modulo IA.
    """
    features = extract_features(hand_landmarks)
    label = predict(features)

    return {
        "label": str(label),
        "confidence": None,
        "source": "letter-model",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
