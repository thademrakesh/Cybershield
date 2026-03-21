# CyberShield XAI Backend

Python-based backend system for the CyberShield Explainable Threat Intelligence System.

## Features
- **Real-Time Packet Capture**: Using Scapy to capture and analyze network traffic.
- **Threat Detection**: XGBoost-based machine learning model for attack classification.
- **Explainable AI (XAI)**: SHAP integration to explain model predictions.
- **Authentication**: JWT-based role-based access control (Admin/User).
- **Data Storage**: MongoDB for users, logs, and alerts.

## Requirements
- Python 3.10+
- MongoDB (running on default port 27017)
- Npcap (for Windows packet capture) or libpcap (Linux)

## Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure Environment:
   - The `.env` file is pre-configured with defaults. Update `MONGO_URI` or `SECRET_KEY` if needed.

## Running the Server

1. Start MongoDB:
   Ensure your MongoDB service is running.

2. Start the Backend:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`.
   API Documentation (Swagger UI): `http://localhost:8000/docs`.

## Default Credentials
- **Username**: admin
- **Password**: adminpassword

## Project Structure
- `app/main.py`: Application entry point.
- `app/routes/`: API route definitions.
- `app/services/`: Business logic (User management, Capture service).
- `app/ml/`: Machine Learning engine (Model loading, Prediction, XAI).
- `app/models/` & `app/schemas/`: Data models and Pydantic schemas.
- `saved_models/`: Directory to place trained `model.json` or `model.pkl`.

## ML Model Integration
Place your trained XGBoost model in `saved_models/model.json`. The `MLEngine` will automatically load it. If missing, it runs in Mock mode for testing.
