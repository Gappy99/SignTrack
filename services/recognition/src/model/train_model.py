import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


IA_ROOT = os.path.dirname(os.path.dirname(__file__))
DATASET_PATH = os.path.join(IA_ROOT, "dataset", "sign_dataset.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "sign_model.pkl")


def train():
	if not os.path.exists(DATASET_PATH):
		raise FileNotFoundError(
			f"Dataset not found at {DATASET_PATH}. Run build_letter_dataset.py first."
		)

	data = pd.read_csv(DATASET_PATH)
	if data.empty:
		raise ValueError("Dataset CSV is empty.")

	X = data.iloc[:, 1:]
	y = data.iloc[:, 0]
	class_count = y.nunique()

	model = RandomForestClassifier(n_estimators=200, random_state=42)

	can_holdout = (
		len(data) >= 10
		and class_count > 1
		and int(len(data) * 0.2) >= class_count
		and y.value_counts().min() >= 2
	)

	if can_holdout:
		X_train, X_test, y_train, y_test = train_test_split(
			X, y, test_size=0.2, random_state=42, stratify=y
		)
		model.fit(X_train, y_train)
		accuracy = model.score(X_test, y_test)
		print(f"Accuracy (holdout): {accuracy:.4f}")
	else:
		model.fit(X, y)
		print("Dataset pequeno o desbalanceado: entrenado sin holdout")

	joblib.dump(model, MODEL_PATH)
	print(f"Modelo entrenado y guardado en: {MODEL_PATH}")


if __name__ == "__main__":
	train()