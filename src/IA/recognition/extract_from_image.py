import argparse
import json

import cv2
import mediapipe as mp
import numpy as np


def distance(p1, p2):
    return float(np.linalg.norm(np.array(p1) - np.array(p2)))


def angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    denominator = np.linalg.norm(ba) * np.linalg.norm(bc)
    if denominator == 0:
        return 0.0

    cosine = np.dot(ba, bc) / denominator
    cosine = np.clip(cosine, -1.0, 1.0)

    return float(np.arccos(cosine))


def extract_features(points):
    features = []

    features.append(distance(points[4], points[8]))
    features.append(distance(points[8], points[12]))
    features.append(distance(points[12], points[16]))
    features.append(distance(points[16], points[20]))
    features.append(distance(points[4], points[20]))

    features.append(angle(points[5], points[6], points[8]))
    features.append(angle(points[9], points[10], points[12]))
    features.append(angle(points[13], points[14], points[16]))
    features.append(angle(points[17], points[18], points[20]))

    return features


def extract_from_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        return {
            "success": False,
            "error": "IMAGE_NOT_FOUND_OR_INVALID",
        }

    hands = mp.solutions.hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
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

    hand_landmarks = results.multi_hand_landmarks[0]
    points = [[float(lm.x), float(lm.y), float(lm.z)] for lm in hand_landmarks.landmark]

    return {
        "success": True,
        "landmarks": points,
        "features": extract_features(points),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image_path", help="Absolute or relative path to image")
    args = parser.parse_args()

    result = extract_from_image(args.image_path)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
