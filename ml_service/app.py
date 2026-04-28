from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app)

logistic_model = joblib.load("model_logistic.pkl")
rf_model = joblib.load("model_random_forest.pkl")

@app.route("/")
def home():
    return "ML API Running Successfully"

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        input_data = {
            "Campaign_Duration_Days": int(data["Campaign_Duration_Days"]),
            "Goal_Amount": float(data["Goal_Amount"]),
            "Pledged_Amount": float(data["Pledged_Amount"]),
            "Backers_Count": int(data["Backers_Count"]),
            "Funding_Gap": float(data["Funding_Gap"])
        }

        df = pd.DataFrame([input_data])

        log_pred = logistic_model.predict(df)[0]
        rf_pred = rf_model.predict(df)[0]

        return jsonify({
            "success": True,
            "logistic": "Successful" if int(log_pred) == 1 else "Failed",
            "random_forest": "Successful" if int(rf_pred) == 1 else "Failed"
        })

    except Exception as e:
        print("Flask prediction error:", e)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)