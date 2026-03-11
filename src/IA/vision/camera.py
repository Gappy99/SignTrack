import cv2
from hand_pose_detection import detect_landmarks

cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()

    results = detect_landmarks(frame)

    cv2.imshow("Camera", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()