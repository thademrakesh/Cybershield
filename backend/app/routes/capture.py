from fastapi import APIRouter, Depends, Body
from app.services.capture import capture_service
from app.utils.deps import get_current_user
from app.database import db

router = APIRouter()

@router.get("/interfaces")
async def list_interfaces(current_user = Depends(get_current_user)):
    return {
        "interfaces": capture_service.list_interfaces(),
        "default": str(capture_service.get_default_interface()) if capture_service.get_default_interface() else None
    }

@router.post("/start")
async def start_capture(payload: dict = Body(...), current_user = Depends(get_current_user)):
    interface = payload.get("interface", "auto")
    bpf = payload.get("filter")
    return await capture_service.start_capture(interface, bpf, user_id=str(current_user["_id"]))

@router.post("/stop")
async def stop_capture(current_user = Depends(get_current_user)):
    return await capture_service.stop_capture()

@router.get("/status")
async def get_capture_status(current_user = Depends(get_current_user)):
    return capture_service.get_status(user_id=str(current_user["_id"]))

@router.get("/recent")
async def recent_packets(limit: int = 5, current_user = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cursor = db.logs.find({"source": "live_capture", "user_id": user_id}).sort("timestamp", -1).limit(limit)
    packets = []
    async for log in cursor:
        packets.append({
            "id": str(log.get("_id")),
            "time": log.get("timestamp").isoformat() if log.get("timestamp") else None,
            "interface": log.get("interface"),
            "protocol": (log.get("features") or {}).get("protocol_type"),
            "service": (log.get("features") or {}).get("service"),
            "src_ip": (log.get("features") or {}).get("src_ip"),
            "dst_ip": (log.get("features") or {}).get("dst_ip"),
            "src_bytes": (log.get("features") or {}).get("src_bytes", 0),
            "dst_bytes": (log.get("features") or {}).get("dst_bytes", 0),
            "attack_type": (log.get("prediction") or {}).get("attack_type", "Unknown"),
            "severity": (log.get("prediction") or {}).get("severity", "Unknown"),
        })
    return packets

@router.get("/latest_features")
async def latest_features(current_user = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    doc = await db.logs.find_one({"source": "live_capture", "user_id": user_id}, sort=[("timestamp", -1)])
    if not doc:
        return {"features": None}
    return {"features": doc.get("features")}

@router.get("/recent_features")
async def recent_features(limit: int = 10, source: str = "live_capture", session_id: str = None, current_user = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    query = {"user_id": user_id}
    
    if session_id:
        # Use session-specific collection, still filter by user_id for security
        cursor = db[f"logs_{session_id}"].find(query).sort("timestamp", -1).limit(limit)
    else:
        query["source"] = source
        cursor = db.logs.find(query).sort("timestamp", -1).limit(limit)
        
    items = []
    async for log in cursor:
        items.append({
            "id": str(log.get("_id")),
            "time": log.get("timestamp").isoformat() if log.get("timestamp") else None,
            "features": log.get("features"),
            "prediction": log.get("prediction"),
            "interface": log.get("interface")
        })
    return items
