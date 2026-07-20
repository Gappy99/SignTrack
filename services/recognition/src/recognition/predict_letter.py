import argparse
import json
import os
import sys
from pathlib import Path

from extract_from_image import extract_from_image


IA_ROOT = Path(__file__).resolve().parent.parent
if str(IA_ROOT) not in sys.path:
    sys.path.append(str(IA_ROOT))

from model.predictor import predict  # noqa: E402
from gemini_letter import predict_letter_from_image  # noqa: E402


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def _merge_predictions(local_label: str, local_conf: float | None, gemini_result: dict) -> dict:
    gemini_label = gemini_result.get("label")
    gemini_conf = gemini_result.get("confidence")

    if local_label and gemini_label and local_label == gemini_label:
        merged_conf = max(local_conf or 0.0, gemini_conf or 0.0, 0.85)
        return {
            "label": local_label,
            "confidence": round(merged_conf, 4),
            "source": "hybrid",
            "local_label": local_label,
            "gemini_label": gemini_label,
        }

    local_score = local_conf if local_conf is not None else 0.0
    gemini_score = gemini_conf if gemini_conf is not None else 0.0

    if gemini_label and gemini_score >= local_score:
        return {
            "label": gemini_label,
            "confidence": round(gemini_score, 4),
            "source": "gemini",
            "local_label": local_label,
            "gemini_label": gemini_label,
        }

    return {
        "label": local_label,
        "confidence": round(local_score, 4) if local_conf is not None else None,
        "source": "local",
        "local_label": local_label,
        "gemini_label": gemini_label,
    }


def run_prediction(features=None, image_path=None, hybrid=False):
    threshold = _env_float("GEMINI_HYBRID_CONFIDENCE_THRESHOLD", 0.55)
    hybrid_enabled = hybrid or _env_bool("GEMINI_HYBRID_ENABLED", False)
    has_gemini_key = bool(os.getenv("GEMINI_API_KEY", "").strip())

    if image_path:
        extraction = extract_from_image(image_path)
        if not extraction.get("success"):
            if hybrid_enabled and has_gemini_key:
                gemini_only = predict_letter_from_image(image_path)
                if gemini_only.get("success"):
                    return {
                        "success": True,
                        "label": gemini_only["label"],
                        "confidence": gemini_only.get("confidence"),
                        "source": "gemini",
                        "features": None,
                        "local_label": None,
                        "gemini_label": gemini_only["label"],
                    }
            return {
                "success": False,
                "error": extraction.get("error", "LANDMARK_EXTRACTION_FAILED"),
            }
        features = extraction.get("features")

    if not features:
        return {
            "success": False,
            "error": "MISSING_FEATURES",
        }

    local_label, local_conf = predict(features, return_confidence=True)
    local_label = str(local_label)

    use_gemini = hybrid_enabled and has_gemini_key and image_path
    needs_gemini = local_conf is None or local_conf < threshold

    if use_gemini and needs_gemini:
        gemini_result = predict_letter_from_image(image_path)
        if gemini_result.get("success"):
            merged = _merge_predictions(local_label, local_conf, gemini_result)
            return {
                "success": True,
                "features": features,
                **merged,
            }

    return {
        "success": True,
        "label": local_label,
        "confidence": round(local_conf, 4) if local_conf is not None else None,
        "source": "local",
        "local_label": local_label,
        "gemini_label": None,
        "features": features,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--features-json", help="JSON array of numeric features")
    parser.add_argument("--image-path", help="Path to image file")
    parser.add_argument("--hybrid", action="store_true", help="Enable local+Gemini fusion")
    args = parser.parse_args()

    features = None
    if args.features_json:
        try:
            features = json.loads(args.features_json)
        except json.JSONDecodeError:
            print(json.dumps({"success": False, "error": "INVALID_FEATURES_JSON"}))
            raise SystemExit(1)

    result = run_prediction(
        features=features,
        image_path=args.image_path,
        hybrid=args.hybrid,
    )
    print(json.dumps(result))

    if not result.get("success"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
