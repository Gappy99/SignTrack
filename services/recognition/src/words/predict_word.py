import argparse
import json

from video_feature_extractor import extract_video_features
from word_predictor import predict


def run_prediction(video_path=None, features=None):
    if video_path:
        extraction = extract_video_features(video_path)
        if not extraction.get("success"):
            return {
                "success": False,
                "error": extraction.get("error", "VIDEO_FEATURE_EXTRACTION_FAILED"),
            }
        features = extraction.get("features")

    if not features:
        return {
            "success": False,
            "error": "MISSING_FEATURES",
        }

    label, confidence = predict(features)
    return {
        "success": True,
        "label": str(label),
        "confidence": confidence,
        "features": features,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-path", help="Path to MP4/video file")
    parser.add_argument("--features-json", help="JSON array of numeric features")
    args = parser.parse_args()

    features = None
    if args.features_json:
        try:
            features = json.loads(args.features_json)
        except json.JSONDecodeError:
            print(json.dumps({"success": False, "error": "INVALID_FEATURES_JSON"}))
            raise SystemExit(1)

    result = run_prediction(video_path=args.video_path, features=features)
    print(json.dumps(result))

    if not result.get("success"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
