import os

import joblib


MODEL_PATH = os.path.join(os.path.dirname(__file__), "sign_model.pkl")


def _load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model file not found at {MODEL_PATH}. Train the model first."
        )
    return joblib.load(MODEL_PATH)


model = _load_model()


def predict(features):
    result = model.predict([features])
    return result[0]