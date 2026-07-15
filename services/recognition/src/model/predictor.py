import os

import joblib

from shared.hand_features import LETTER_FEATURE_COUNT


MODEL_PATH = os.path.join(os.path.dirname(__file__), "sign_model.pkl")


def _load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model file not found at {MODEL_PATH}. Train the model first."
        )
    loaded_model = joblib.load(MODEL_PATH)
    if hasattr(loaded_model, "n_features_in_") and loaded_model.n_features_in_ != LETTER_FEATURE_COUNT:
        raise ValueError(
            f"Existing sign model expects {loaded_model.n_features_in_} features, but the pipeline now uses {LETTER_FEATURE_COUNT}. Re-export the dataset and retrain sign_model.pkl."
        )
    return loaded_model


model = _load_model()


def predict(features, return_confidence=False):
    if len(features) != LETTER_FEATURE_COUNT:
        raise ValueError(
            f"Expected {LETTER_FEATURE_COUNT} features for letter prediction, got {len(features)}. Retrain the model after rebuilding the dataset."
        )
    label = model.predict([features])[0]

    confidence = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([features])[0]
        confidence = float(probabilities.max())

    if return_confidence:
        return label, confidence

    return label