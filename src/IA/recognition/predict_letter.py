import argparse
import json
import sys
from pathlib import Path

from extract_from_image import extract_from_image


IA_ROOT = Path(__file__).resolve().parent.parent
if str(IA_ROOT) not in sys.path:
    sys.path.append(str(IA_ROOT))

from model.predictor import predict  # noqa: E402


def run_prediction(features=None, image_path=None):
    if image_path:
        extraction = extract_from_image(image_path)
        if not extraction.get("success"):
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

    label = predict(features)
    return {
        "success": True,
        "label": str(label),
        "features": features,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--features-json", help="JSON array of numeric features")
    parser.add_argument("--image-path", help="Path to image file")
    args = parser.parse_args()

    features = None
    if args.features_json:
        try:
            features = json.loads(args.features_json)
        except json.JSONDecodeError:
            print(json.dumps({"success": False, "error": "INVALID_FEATURES_JSON"}))
            raise SystemExit(1)

    result = run_prediction(features=features, image_path=args.image_path)
    print(json.dumps(result))

    if not result.get("success"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
