from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import auth, ml, capture, alerts, logs, analytics, admin, sessions, audit, risk, incidents
from app.database import db, check_db_connection
from app.services.user import create_user, get_user_by_username
from app.ml.engine import ml_engine
from app.schemas.user import UserCreate
import logging
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi.staticfiles import StaticFiles
import os

# Ensure static directories exist
os.makedirs("static/profile_images", exist_ok=True)

app = FastAPI(title="CyberShield XAI Backend", version="1.0.0")

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://cybershield-two-pearl.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(ml.router, prefix="", tags=["ML Prediction"]) # /predict, /explain
app.include_router(capture.router, prefix="/capture", tags=["Packet Capture"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(audit.router, prefix="/admin/audit", tags=["Audit"])
app.include_router(risk.router, prefix="/risk", tags=["Risk Assessment"])
app.include_router(incidents.router, prefix="/incidents", tags=["Incident Response"])
app.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])

@app.on_event("startup")
async def startup_db_client():
    connected = await check_db_connection()
    if not connected:
        print("\n" + "!"*50)
        print("CRITICAL: Could not connect to MongoDB.")
        print("Please check your MONGO_URI in the .env file.")
        print("!"*50 + "\n")

    # Create initial admin user if not exists
    admin_user = await get_user_by_username("admin")
    if not admin_user:
        logger.info("Creating default admin user...")
        try:
            admin_data = UserCreate(
                username="admin",
                email="admin@cybershield.ai",
                password="adminpassword",
                role="admin"
            )

            admin_data.role = "admin" 
            await create_user(admin_data)
            logger.info("Default admin user created.")
        except Exception as e:
            logger.error(f"Error creating admin user: {e}")

    # Load Alert Configuration
    try:
        alert_config = await db.admin_settings.find_one({"_id": "alert_config"})
        if alert_config:
            if "_id" in alert_config:
                del alert_config["_id"]
            ml_engine.alert_config = alert_config
            logger.info(f"Alert configuration loaded from database: {alert_config}")
        else:
            logger.info("No alert configuration found in database. Using defaults (Notifications Disabled).")
    except Exception as e:
        logger.error(f"Error loading alert configuration: {e}")

@app.get("/")
async def root():
    return {"message": "CyberShield XAI Backend API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
