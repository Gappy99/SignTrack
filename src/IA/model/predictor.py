import joblib

model = joblib.load("model/sign_model.pkl")

def predict(features):

    result = model.predict([features])

    return result[0]