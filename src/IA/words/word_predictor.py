import os

import joblib


MODEL_PATH = os.path.join(os.path.dirname(__file__), "word_model.pkl")


def _load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Word model file not found at {MODEL_PATH}. Train the model first."
        )
    return joblib.load(MODEL_PATH)


model = _load_model()


def predict(features):
    result = model.predict([features])[0]

    confidence = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([features])[0]
        confidence = float(probabilities.max())

    return str(result), confidence
