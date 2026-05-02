"""
Compatibility wrapper for MediaPipe 0.10+ (Tasks API) that exposes the same
interface as the legacy mp.solutions.hands API used throughout this project.
"""

import time
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as _mp_tasks
from mediapipe.tasks.python import vision as _mp_vision

_MODEL_PATH = str(Path(__file__).resolve().parent.parent / "model" / "hand_landmarker.task")

HAND_CONNECTIONS = [
    (c.start, c.end)
    for c in _mp_vision.HandLandmarksConnections.HAND_CONNECTIONS
]


class _NormalizedLandmark:
    __slots__ = ("x", "y", "z")

    def __init__(self, x: float, y: float, z: float) -> None:
        self.x = x
        self.y = y
        self.z = z


class _HandLandmarkList:
    """Mimics mp.solutions.hands HandLandmarkList with a .landmark attribute."""

    def __init__(self, landmarks) -> None:
        self.landmark = [_NormalizedLandmark(lm.x, lm.y, lm.z) for lm in landmarks]


class _HandsResult:
    """Mimics the object returned by mp.solutions.hands.Hands.process()."""

    def __init__(self, result) -> None:
        if result.hand_landmarks:
            self.multi_hand_landmarks = [_HandLandmarkList(hand) for hand in result.hand_landmarks]
        else:
            self.multi_hand_landmarks = None
        self.multi_handedness = list(result.handedness or [])


class Hands:
    """
    Drop-in replacement for mp.solutions.hands.Hands using the MediaPipe
    Tasks API (mediapipe >= 0.10).
    """

    def __init__(
        self,
        static_image_mode: bool = False,
        max_num_hands: int = 2,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ) -> None:
        mode = (
            _mp_vision.RunningMode.IMAGE
            if static_image_mode
            else _mp_vision.RunningMode.VIDEO
        )
        options = _mp_vision.HandLandmarkerOptions(
            base_options=_mp_tasks.BaseOptions(model_asset_path=_MODEL_PATH),
            num_hands=max_num_hands,
            min_hand_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            running_mode=mode,
        )
        self._detector = _mp_vision.HandLandmarker.create_from_options(options)
        self._static = static_image_mode
        self._ts_ms: int = 0

    def process(self, rgb_image):
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        if self._static:
            result = self._detector.detect(mp_image)
        else:
            # Timestamps must be strictly increasing (milliseconds).
            ts = int(time.monotonic() * 1000)
            if ts <= self._ts_ms:
                ts = self._ts_ms + 1
            self._ts_ms = ts
            result = self._detector.detect_for_video(mp_image, ts)
        return _HandsResult(result)

    def close(self) -> None:
        self._detector.close()

    def __enter__(self):
        return self

    def __exit__(self, *args) -> None:
        self.close()


class DrawingSpec:
    """Mimics mp.solutions.drawing_utils.DrawingSpec."""

    def __init__(self, color=(0, 255, 0), thickness: int = 2, circle_radius: int = 2) -> None:
        self.color = color
        self.thickness = thickness
        self.circle_radius = circle_radius


class DrawingUtils:
    """
    Minimal replacement for mp.solutions.drawing_utils that draws hand
    landmarks and connections using OpenCV.
    """

    DrawingSpec = DrawingSpec

    def draw_landmarks(
        self,
        image,
        hand_lm,
        connections,
        landmark_drawing_spec=None,
        connection_drawing_spec=None,
    ) -> None:
        h, w = image.shape[:2]
        lm_spec = landmark_drawing_spec or DrawingSpec()
        cn_spec = connection_drawing_spec or DrawingSpec()

        points = [
            (int(lm.x * w), int(lm.y * h)) for lm in hand_lm.landmark
        ]

        for start_idx, end_idx in connections:
            if start_idx < len(points) and end_idx < len(points):
                cv2.line(image, points[start_idx], points[end_idx], cn_spec.color, cn_spec.thickness)

        for pt in points:
            cv2.circle(image, pt, lm_spec.circle_radius, lm_spec.color, -1)
