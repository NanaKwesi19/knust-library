from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import os
import numpy as np

app = FastAPI(title="KNUST Library Intelligence ML Core", version="1.0.0")

# Define structural layout validation constraints for incoming post payload data
class PredictionRequest(BaseModel):
    category: str
    subject: str
    borrow_month: int

MODEL_PATH = "models/library_demand_model.pkl"

@app.post("/api/v1/predict/demand")
def predict_checkout_demand(payload: PredictionRequest):
    # 1. Verify that a serialized model file exists to read from
    if not os.path.exists(MODEL_PATH):
        raise HTTPException(status_code=503, detail="Machine learning prediction model has not been compiled yet.")
    
    try:
        # 2. De-serialize and load the model matrix pipeline
        model = joblib.load(MODEL_PATH)
        
        # 3. Transform input payload into a tabular pandas DataFrame array format matching our training set
        input_data = pd.DataFrame([{
            'category': payload.category,
            'subject': payload.subject,
            'borrow_month': payload.borrow_month
        }])
        
        # 4. Generate prediction
        prediction = model.predict(input_data)
        
        # 5. Return the result safely (rounded up since you can't borrow fractional books)
        return {
            "success": True,
            "predicted_checkout_demand": float(np.ceil(prediction[0]))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction internal execution failure: {str(e)}")

# Health checkpoint endpoint
@app.get("/health")
def health_check():
    return {"status": "online", "model_loaded": os.path.exists(MODEL_PATH)}