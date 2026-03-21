from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from app.database import db
from app.utils.deps import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class Alert(BaseModel):
    id: str
    attack: str
    severity: str
    timestamp: datetime
    status: str
    details: dict
    features: Optional[Dict[str, Any]] = None

@router.get("/", response_model=List[Alert])
async def get_alerts(session_id: str = None, current_user = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    query = {"user_id": user_id}
    if session_id:
        # Use session-specific collection, still filter by user_id for security
        alerts_cursor = db[f"alerts_{session_id}"].find(query).sort("timestamp", -1).limit(100)
    else:
        alerts_cursor = db.alerts.find(query).sort("timestamp", -1).limit(100)

    alerts = []
    async for alert in alerts_cursor:
        alert["id"] = str(alert["_id"])
        alerts.append(alert)
    return alerts

@router.post("/acknowledge/{alert_id}")
async def acknowledge_alert(alert_id: str, session_id: str = None, current_user = Depends(get_current_user)):
    from bson import ObjectId
    
    # Update logic helper
    async def update_collection(collection_name):
        return await db[collection_name].update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"status": "Acknowledged"}}
        )

    # Always try to update main alerts collection
    result_main = await update_collection("alerts")
    
    # If session_id provided, also update session collection
    result_session = None
    if session_id:
        result_session = await update_collection(f"alerts_{session_id}")

    # Check if at least one found
    found = (result_main.matched_count > 0) or (result_session and result_session.matched_count > 0)
    
    if not found:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    return {"status": "success"}
