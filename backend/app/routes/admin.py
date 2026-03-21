from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from app.database import db
from app.utils.deps import get_current_admin_user, get_current_user
from app.schemas.user import UserCreate, UserUpdate
from app.utils.security import get_password_hash
from bson import ObjectId
from datetime import datetime
import psutil
import time
import shutil
import os
import logging
from app.ml.engine import ml_engine
from app.ml.trainer import train_model as train_pipeline
from app.services.audit import log_audit_event

logger = logging.getLogger(__name__)

class SystemSettings(BaseModel):
    systemName: str
    maintenanceMode: bool
    debugLogging: bool
    maxConcurrentAnalysis: int
    dataRetentionDays: int
    autoBackup: bool
    backupFrequency: str
    apiRateLimit: int
    emailNotifications: bool
    smsNotifications: bool

class NotificationChannels(BaseModel):
    email: bool
    sms: bool
    slack: bool
    webhook: bool
    push: bool

class AlertThresholds(BaseModel):
    low: int
    medium: int
    high: int
    critical: int

class ContactInfo(BaseModel):
    email: str
    phone: str
    slackUrl: str
    webhookUrl: str

class AlertConfig(BaseModel):
    thresholds: AlertThresholds
    notifications: NotificationChannels
    contacts: ContactInfo

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.abspath(os.path.join(BASE_DIR, "../../saved_models"))

@router.get("/system/health")
async def get_system_health(current_user = Depends(get_current_admin_user)):
    # CPU usage (non-blocking)
    cpu_percent = psutil.cpu_percent(interval=None)
    if cpu_percent == 0.0:
        # Second call to get immediate value if first one was 0 (init)
        # However, blocking for 0.1s is acceptable
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Network (simple calc for activity, tough to get % without max bandwidth)
    # We'll just return raw bytes or a heuristic
    net = psutil.net_io_counters()
    
    return {
        "cpu": cpu_percent,
        "memory": memory.percent,
        "disk": disk.percent,
        "uptime": int(time.time() - psutil.boot_time())
    }

@router.get("/users")
async def get_all_users(current_user = Depends(get_current_admin_user)):
    users = []
    async for user in db.users.find():
        user["id"] = str(user["_id"])
        del user["_id"]
        if "hashed_password" in user:
            del user["hashed_password"]
        users.append(user)
    return users

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user = Depends(get_current_admin_user)):
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "deleted"}

@router.post("/users")
async def create_user_admin(user: UserCreate, current_user = Depends(get_current_admin_user)):
    # Check if exists
    if await db.users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.dict()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["created_at"] = datetime.utcnow()
    
    new_user = await db.users.insert_one(user_dict)
    return {"id": str(new_user.inserted_id), "message": "User created successfully"}

@router.put("/users/{user_id}")
async def update_user_admin(user_id: str, user_update: UserUpdate, current_user = Depends(get_current_admin_user)):
    user_in_db = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_in_db:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
    if update_data:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
        
    return {"message": "User updated successfully"}

@router.post("/model/upload")
async def upload_model(
    model_file: UploadFile = File(...),
    encoders_file: UploadFile = File(None),
    metrics_file: UploadFile = File(None),
    current_user = Depends(get_current_admin_user)
):
    try:
        os.makedirs(MODEL_DIR, exist_ok=True)
        
        # Save model file
        model_path = os.path.join(MODEL_DIR, "model.json")
        with open(model_path, "wb") as buffer:
            shutil.copyfileobj(model_file.file, buffer)
            
        # Save encoders if provided
        if encoders_file:
            encoders_path = os.path.join(MODEL_DIR, "encoders.pkl")
            with open(encoders_path, "wb") as buffer:
                shutil.copyfileobj(encoders_file.file, buffer)
                
        # Save metrics if provided
        if metrics_file:
            metrics_path = os.path.join(MODEL_DIR, "metrics.json")
            with open(metrics_path, "wb") as buffer:
                shutil.copyfileobj(metrics_file.file, buffer)
        
        # Reload engine
        ml_engine.load_model()
        
        return {"message": "Model uploaded and reloaded successfully", "metrics": ml_engine.metrics}
    except Exception as e:
        logger.error(f"Error uploading model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload model: {str(e)}")

def run_training_and_reload():
    try:
        logger.info("Starting background training task...")
        metrics = train_pipeline()
        logger.info("Training finished. Reloading model...")
        ml_engine.load_model()
        logger.info("Model reloaded.")
    except Exception as e:
        logger.error(f"Training failed: {e}")

@router.post("/model/retrain")
async def retrain_model(
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_admin_user)
):
    background_tasks.add_task(run_training_and_reload)
    return {"message": "Model training started in background. Check metrics later for updates."}

@router.get("/alert-config", response_model=AlertConfig)
async def get_alert_config(current_user = Depends(get_current_admin_user)):
    config = await db.admin_settings.find_one({"_id": "alert_config"})
    if config:
        if "_id" in config:
            del config["_id"]
        # Ensure in-memory is synced
        ml_engine.alert_config = config
        return config
    # Return default from engine if not in DB
    return ml_engine.alert_config

@router.post("/alert-config")
async def update_alert_config(config: AlertConfig, current_user = Depends(get_current_admin_user)):
    config_dict = config.dict()
    await db.admin_settings.update_one(
        {"_id": "alert_config"},
        {"$set": config_dict},
        upsert=True
    )
    # Update in-memory config
    ml_engine.alert_config = config_dict
    
    await log_audit_event(
        action="Alert Configuration",
        resource="Alert Settings",
        details="Updated alert configuration thresholds and notifications",
        user=current_user.get("username", "admin"),
        status="success",
        severity="high"
    )
    
    return {"message": "Configuration updated successfully"}

@router.get("/model/metrics")
async def get_model_metrics(current_user = Depends(get_current_user)):
    return ml_engine.metrics

@router.get("/system-settings", response_model=SystemSettings)
async def get_system_settings(current_user = Depends(get_current_admin_user)):
    settings = await db.admin_settings.find_one({"_id": "system_settings"})
    if settings:
        if "_id" in settings:
            del settings["_id"]
        return settings
    # Return defaults
    return {
        "systemName": "CyberShield XAI Platform",
        "maintenanceMode": False,
        "debugLogging": True,
        "maxConcurrentAnalysis": 10,
        "dataRetentionDays": 90,
        "autoBackup": True,
        "backupFrequency": "daily",
        "apiRateLimit": 1000,
        "emailNotifications": True,
        "smsNotifications": False,
    }

@router.post("/system-settings")
async def update_system_settings(settings: SystemSettings, current_user = Depends(get_current_admin_user)):
    settings_dict = settings.dict()
    await db.admin_settings.update_one(
        {"_id": "system_settings"},
        {"$set": settings_dict},
        upsert=True
    )
    
    await log_audit_event(
        action="System Settings Update",
        resource="Admin Settings",
        details=f"Updated system settings: {settings.systemName}",
        user=current_user.get("username", "admin"),
        status="success",
        severity="high"
    )
    
    return {"message": "System settings updated successfully"}
