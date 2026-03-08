import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

data = pd.read_csv("dataset/sign_dataset.csv")

X = data.iloc[:,1:]
y = data.iloc[:,0]

model = RandomForestClassifier()

model.fit(X, y)

joblib.dump(model, "model/sign_model.pkl")

print("Modelo entrenado")