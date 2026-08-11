import pandas as pd
import numpy as np
import psycopg2
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib

def fetch_and_train():
    print("[ML ENGINE] Connecting to PostgreSQL to extract training features...")
    
    # 1. Connect natively to your database using your environment variable
    # Example URL fallback if variable is not mapped: "postgresql://user:pass@localhost:5432/db"
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/knust_library")
    
    conn = psycopg2.connect(db_url)
    
    query = """
        SELECT 
            b.category,
            b.subject,
            EXTRACT(MONTH FROM l.borrow_date)::int AS borrow_month,
            COUNT(l.id)::int AS total_checkout_demands
        FROM loans l
        JOIN book_copies bc ON l.copy_id = bc.id
        JOIN books b ON bc.book_id = b.id
        GROUP BY b.category, b.subject, borrow_month;
    """
    
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    if df.empty or len(df) < 5:
        print("[ML ENGINE] Aborting: Insufficient loan history data available to train accurately.")
        return False

    # 2. Map Features (X) and Target labels (y)
    X = df[['category', 'subject', 'borrow_month']]
    y = df['total_checkout_demands']

    # 3. Handle non-numeric strings safely via One-Hot encoding arrays
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['category', 'subject'])
        ],
        remainder='passthrough'
    )

    # 4. Bind the model into a unified runtime Pipeline architecture
    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=150, random_state=42))
    ])

    # 5. Train the execution weights
    print("[ML ENGINE] Commencing Random Forest optimization training cycle...")
    model_pipeline.fit(X, y)

    # 6. Serialize and store the compiled analytical brain file safely
    os.makedirs('models', exist_ok=True)
    joblib.dump(model_pipeline, 'models/library_demand_model.pkl')
    print("[ML ENGINE] Model training successful! Weights locked inside 'models/library_demand_model.pkl'.")
    return True

if __name__ == "__main__":
    fetch_and_train()