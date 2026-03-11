import numpy as np

def distance(p1, p2):
    return np.linalg.norm(np.array(p1) - np.array(p2))

def angle(a, b, c):

    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))

    return np.arccos(cosine)

def extract_features(hand_landmarks):

    points = []

    for lm in hand_landmarks.landmark:
        points.append([lm.x, lm.y, lm.z])

    features = []

    # Distancias importantes
    features.append(distance(points[4], points[8]))   # pulgar índice
    features.append(distance(points[8], points[12]))  # índice medio
    features.append(distance(points[12], points[16])) # medio anular
    features.append(distance(points[16], points[20])) # anular meñique
    features.append(distance(points[4], points[20]))  # pulgar meñique

    # Ángulos de dedos
    features.append(angle(points[5], points[6], points[8]))   # índice
    features.append(angle(points[9], points[10], points[12])) # medio
    features.append(angle(points[13], points[14], points[16]))# anular
    features.append(angle(points[17], points[18], points[20]))# meñique

    return features