import os

import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

IA_ROOT = os.path.dirname(os.path.dirname(__file__))
DATASET_PATH = os.path.join(IA_ROOT, "dataset", "sign_dataset.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "sign_model.pkl")


def _print_confusion_matrix(cm, labels):
    col_w = max(len(str(l)) for l in labels) + 2
    header = " " * (col_w + 2) + "".join(l.center(col_w) for l in labels)
    print(header)
    print(" " * (col_w + 2) + "-" * (col_w * len(labels)))
    for i, row_label in enumerate(labels):
        row = f"{row_label:<{col_w}} | " + "".join(str(cm[i][j]).center(col_w) for j in range(len(labels)))
        print(row)


def evaluate():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}. Run train_model.py first.")

    data = pd.read_csv(DATASET_PATH)
    if data.empty:
        raise ValueError("Dataset CSV is empty.")

    X = data.iloc[:, 1:]
    y = data.iloc[:, 0]
    labels = sorted(y.unique())
    class_count = len(labels)

    model = joblib.load(MODEL_PATH)

    can_holdout = (
        len(data) >= 10
        and class_count > 1
        and int(len(data) * 0.2) >= class_count
        and y.value_counts().min() >= 2
    )

    if can_holdout:
        _, X_test, _, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    else:
        print("⚠️  Dataset muy pequeño para holdout — evaluando sobre TODO el dataset (sobreajuste esperado).\n")
        X_test, y_test = X, y

    y_pred = model.predict(X_test)

    accuracy = (y_pred == y_test).mean()
    print(f"=== Evaluación de letras ===")
    print(f"Muestras evaluadas : {len(y_test)}")
    print(f"Accuracy global    : {accuracy:.4f} ({accuracy*100:.1f}%)\n")

    print("--- Reporte por letra ---")
    print(classification_report(y_test, y_pred, labels=labels, zero_division=0))

    cm = confusion_matrix(y_test, y_pred, labels=labels)
    print("--- Matriz de confusión ---")
    _print_confusion_matrix(cm, labels)

    print("\n--- Pares más confundidos (real → predicho) ---")
    pairs = []
    for i, real in enumerate(labels):
        for j, pred in enumerate(labels):
            if i != j and cm[i][j] > 0:
                pairs.append((cm[i][j], real, pred))

    if pairs:
        pairs.sort(reverse=True)
        for count, real, pred in pairs:
            print(f"  {real} → {pred} : {count} vez/veces")
    else:
        print("  Sin confusiones detectadas en el conjunto evaluado.")


if __name__ == "__main__":
    evaluate()
