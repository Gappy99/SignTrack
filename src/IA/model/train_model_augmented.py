import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


IA_ROOT = os.path.dirname(os.path.dirname(__file__))
DATASET_PATH = os.path.join(IA_ROOT, "dataset", "sign_dataset.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "sign_model.pkl")


def augment_features(features, noise_level=0.05):
    """
    Agrega ruido pequeño a los features para simular variaciones.
    Esto ayuda al modelo a ser más robusto a pequeñas variaciones.
    """
    augmented = []
    
    # Original
    augmented.append(features)
    
    # Con ruido gaussiano
    noisy = features + np.random.normal(0, noise_level, len(features))
    augmented.append(noisy)
    
    # Con ruido ligeramente mayor
    noisy2 = features + np.random.normal(0, noise_level * 1.5, len(features))
    augmented.append(noisy2)
    
    return augmented


def train():
	if not os.path.exists(DATASET_PATH):
		raise FileNotFoundError(
			f"Dataset not found at {DATASET_PATH}. Run build_letter_dataset.py first."
		)

	data = pd.read_csv(DATASET_PATH)
	if data.empty:
		raise ValueError("Dataset CSV is empty.")

	# Augmenta el dataset
	X_list = []
	y_list = []
	
	for idx, row in data.iterrows():
		label = row.iloc[0]
		features = row.iloc[1:].values.astype(float)
		
		# Original
		X_list.append(features)
		y_list.append(label)
		
		# Versiones augmentadas
		augmented_versions = augment_features(features, noise_level=0.04)
		for aug_features in augmented_versions[1:]:  # Skip original
			X_list.append(aug_features)
			y_list.append(label)
	
	X = np.array(X_list)
	y = np.array(y_list)
	
	print(f"Dataset original: {len(data)} muestras")
	print(f"Dataset augmentado: {len(X)} muestras (3x)")

	# Entrena con parámetros optimizados para dataset pequeño
	model = RandomForestClassifier(
		n_estimators=300,  # Más árboles
		max_depth=15,  # Más profundo
		min_samples_split=2,
		min_samples_leaf=1,
		random_state=42
	)

	class_count = len(np.unique(y))
	
	can_holdout = (
		len(X) >= 10
		and class_count > 1
		and int(len(X) * 0.2) >= class_count
		and pd.Series(y).value_counts().min() >= 2
	)

	if can_holdout:
		X_train, X_test, y_train, y_test = train_test_split(
			X, y, test_size=0.2, random_state=42, stratify=y
		)
		model.fit(X_train, y_train)
		accuracy = model.score(X_test, y_test)
		print(f"✓ Accuracy (holdout): {accuracy:.4f}")
	else:
		model.fit(X, y)
		print("✓ Dataset augmentado y entrenado sin holdout")

	joblib.dump(model, MODEL_PATH)
	print(f"\n✓ Modelo entrenado y guardado en: {MODEL_PATH}")
	print("✓ Ahora el modelo debería ser más robusto a variaciones")


if __name__ == "__main__":
	train()
