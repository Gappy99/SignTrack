import argparse
import json
import sys
from pathlib import Path

import cv2

IA_ROOT = Path(__file__).resolve().parent.parent
if str(IA_ROOT) not in sys.path:
    sys.path.append(str(IA_ROOT))

from shared.hand_features import (
    build_landmark_payload,
    build_letter_feature_vector,
    extract_ordered_hands,
)
from shared.mp_hands_compat import Hands as _MpHands


def extract_from_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        return {
            "success": False,
            "error": "IMAGE_NOT_FOUND_OR_INVALID",
        }

    hands = _MpHands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5,
    )

    try:
        frame_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = hands.process(frame_rgb)
    finally:
        hands.close()

    if not results.multi_hand_landmarks:
        return {
            "success": False,
            "error": "NO_HAND_DETECTED",
        }

    hands_data = extract_ordered_hands(results)

    return {
        "success": True,
        "landmarks": build_landmark_payload(hands_data),
        "features": build_letter_feature_vector(hands_data),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image_path", help="Absolute or relative path to image")
    args = parser.parse_args()

    result = extract_from_image(args.image_path)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
