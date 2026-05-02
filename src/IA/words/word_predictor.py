import os

import joblib

from shared.hand_features import WORD_FEATURE_COUNT


MODEL_PATH = os.path.join(os.path.dirname(__file__), "word_model.pkl")


def _load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Word model file not found at {MODEL_PATH}. Train the model first."
        )
    loaded_model = joblib.load(MODEL_PATH)
    if hasattr(loaded_model, "n_features_in_") and loaded_model.n_features_in_ != WORD_FEATURE_COUNT:
        raise ValueError(
            f"Existing word model expects {loaded_model.n_features_in_} features, but the pipeline now uses {WORD_FEATURE_COUNT}. Re-export the dataset and retrain word_model.pkl."
        )
    return loaded_model


model = _load_model()


def predict(features):
    if len(features) != WORD_FEATURE_COUNT:
        raise ValueError(
            f"Expected {WORD_FEATURE_COUNT} features for word prediction, got {len(features)}. Retrain the word model after rebuilding the dataset."
        )
    result = model.predict([features])[0]

    confidence = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([features])[0]
        confidence = float(probabilities.max())

    return str(result), confidence
