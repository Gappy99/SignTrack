import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

IA_ROOT = Path(__file__).resolve().parent.parent
if str(IA_ROOT) not in sys.path:
    sys.path.append(str(IA_ROOT))

from shared.hand_features import LETTER_FEATURE_COUNT, build_letter_feature_vector, extract_ordered_hands
from shared.mp_hands_compat import Hands as _MpHands

VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def _to_feature_vector(frame_features: np.ndarray, sampled_frames: int) -> list[float]:
    mean = frame_features.mean(axis=0)
    std = frame_features.std(axis=0)
    min_vals = frame_features.min(axis=0)
    max_vals = frame_features.max(axis=0)

    if len(frame_features) > 1:
        diffs = np.abs(np.diff(frame_features, axis=0)).mean(axis=0)
    else:
        diffs = np.zeros(frame_features.shape[1], dtype=float)

    detection_ratio = float(len(frame_features) / max(sampled_frames, 1))
    output = np.concatenate([mean, std, min_vals, max_vals, diffs, [detection_ratio]])
    return output.astype(float).tolist()


def extract_video_features(video_path: str, max_frames: int = 64) -> dict:
    path = Path(video_path)
    if not path.exists():
        return {"success": False, "error": "VIDEO_NOT_FOUND"}

    if path.suffix.lower() not in VIDEO_EXTENSIONS:
        return {"success": False, "error": "UNSUPPORTED_VIDEO_TYPE"}

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return {"success": False, "error": "VIDEO_OPEN_FAILED"}

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    stride = max(total_frames // max_frames, 1) if total_frames > 0 else 1

    hands = _MpHands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    collected = []
    sampled = 0
    index = 0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            if index % stride != 0:
                index += 1
                continue

            sampled += 1
            if sampled > max_frames:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)

            if results.multi_hand_landmarks:
                hands_data = extract_ordered_hands(results)
                collected.append(build_letter_feature_vector(hands_data))

            index += 1
    finally:
        cap.release()
        hands.close()

    if not collected:
        return {
            "success": False,
            "error": "NO_HAND_DETECTED_IN_VIDEO",
            "sampled_frames": sampled,
        }

    feature_matrix = np.asarray(collected, dtype=float)
    if feature_matrix.ndim != 2 or feature_matrix.shape[1] != LETTER_FEATURE_COUNT:
        return {
            "success": False,
            "error": "INVALID_TWO_HAND_FEATURE_MATRIX",
            "detected_frames": len(collected),
        }
    vector = _to_feature_vector(feature_matrix, sampled)

    return {
        "success": True,
        "features": vector,
        "sampled_frames": sampled,
        "detected_frames": len(collected),
        "feature_count": len(vector),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video_path", help="Absolute or relative path to MP4/video")
    parser.add_argument("--max-frames", type=int, default=64)
    args = parser.parse_args()

    result = extract_video_features(args.video_path, max_frames=args.max_frames)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
