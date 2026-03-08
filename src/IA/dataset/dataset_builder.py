import numpy as np

def distance(p1, p2):
    return np.linalg.norm(np.array(p1) - np.array(p2))

def extract_features(hand_landmarks):

    points = []

    for lm in hand_landmarks.landmark:
        points.append([lm.x, lm.y, lm.z])

    features = []

    # ejemplo: distancia pulgar índice
    features.append(distance(points[4], points[8]))

    # índice medio
    features.append(distance(points[8], points[12]))

    # medio anular
    features.append(distance(points[12], points[16]))

    # anular meñique
    features.append(distance(points[16], points[20]))

    return features