from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.database import db
from app.utils.deps import get_current_user
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId

router = APIRouter()

class Session(BaseModel):
    id: str
    type: str
    start_time: datetime
    end_time: Optional[datetime] = None
    name: str
    status: str
    packet_count: Optional[int] = 0

@router.get("/", response_model=List[Session])
async def get_sessions(current_user = Depends(get_current_user)):
    cursor = db.sessions.find({"user_id": str(current_user["_id"])}).sort("start_time", -1).limit(100)
    sessions = []
    async for s in cursor:
        sessions.append({
            "id": str(s["_id"]),
            "type": s.get("type", "unknown"),
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time"),
            "name": s.get("name", "Unnamed Session"),
            "status": s.get("status", "unknown"),
            "packet_count": s.get("packet_count", 0)
        })
    return sessions

@router.delete("/{session_id}")
async def delete_session(session_id: str, current_user = Depends(get_current_user)):
    try:
        # Check if exists
        s = await db.sessions.find_one({"_id": ObjectId(session_id)})
        if not s:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete logs
        await db.logs.delete_many({"session_id": session_id})
        try:
            await db[f"logs_{session_id}"].drop()
        except Exception:
            pass

        # Delete alerts
        await db.alerts.delete_many({"session_id": session_id})
        try:
            await db[f"alerts_{session_id}"].drop()
        except Exception:
            pass

        # Delete session
        await db.sessions.delete_one({"_id": ObjectId(session_id)})
        
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
