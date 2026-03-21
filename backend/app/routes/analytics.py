from fastapi import APIRouter, Depends
from app.database import db
from app.utils.deps import get_current_user
from datetime import datetime, timedelta
import random

router = APIRouter()

@router.get("/summary")
async def get_analytics_summary(session_id: str = None, current_user = Depends(get_current_user)):
    # Admin sees everything, regular user sees only their own data
    is_admin = current_user.get("role") == "admin"
    user_id = str(current_user["_id"])
    query = {} if is_admin else {"user_id": user_id}
    
    collection = db[f"logs_{session_id}"] if session_id else db.logs
    
    total_traffic = await collection.count_documents(query)
    total_attacks = await collection.count_documents({**query, "prediction.attack_type": {"$ne": "Normal"}})
    
    severity_counts = await collection.aggregate([
        {"$match": query},
        {"$group": {"_id": "$prediction.severity", "count": {"$sum": 1}}}
    ]).to_list(None)
    
    attack_types = await collection.aggregate([
        {"$match": query},
        {"$group": {"_id": "$prediction.attack_type", "count": {"$sum": 1}}}
    ]).to_list(None)
    
    return {
        "total_traffic": total_traffic,
        "total_attacks": total_attacks,
        "severity_counts": {item["_id"]: item["count"] for item in severity_counts},
        "attack_type_counts": {item["_id"]: item["count"] for item in attack_types if item["_id"] != "Normal"}
    }

@router.get("/trends")
async def get_trends(current_user = Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    user_id = str(current_user["_id"])
    query = {} if is_admin else {"user_id": user_id}
    
    # Last 24 hours
    start_time = datetime.utcnow() - timedelta(hours=24)
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_time}, **query}},
        {"$group": {
            "_id": {
                "year": {"$year": "$timestamp"},
                "month": {"$month": "$timestamp"},
                "day": {"$dayOfMonth": "$timestamp"},
                "hour": {"$hour": "$timestamp"}
            },
            "count": {"$sum": 1},
            "threats": {
                "$sum": {
                    "$cond": [{"$ne": ["$prediction.attack_type", "Normal"]}, 1, 0]
                }
            }
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1}}
    ]
    
    results = await db.logs.aggregate(pipeline).to_list(None)
    
    data = []
    for r in results:
        try:
            dt = datetime(r["_id"]["year"], r["_id"]["month"], r["_id"]["day"], r["_id"]["hour"])
            time_str = dt.strftime("%H:00")
            data.append({
                "time": time_str,
                "traffic": r["count"],
                "threats": r["threats"]
            })
        except Exception:
            continue
            
    return data

@router.get("/threat-trends")
async def get_threat_trends(current_user = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    # Last 6 months
    start_time = datetime.utcnow() - timedelta(days=180)
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_time}, "prediction.attack_type": {"$ne": "Normal"}, "user_id": user_id}},
        {"$group": {
            "_id": {
                "year": {"$year": "$timestamp"},
                "month": {"$month": "$timestamp"},
                "attack": "$prediction.attack_type"
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]
    
    results = await db.logs.aggregate(pipeline).to_list(None)
    
    # Process into: [{date: 'Jan', malware: 10, ddos: 5...}, ...]
    processed = {}
    for r in results:
        dt = datetime(r["_id"]["year"], r["_id"]["month"], 1)
        month_str = dt.strftime("%b")
        
        if month_str not in processed:
            processed[month_str] = {"date": month_str}
        
        attack_type = r["_id"]["attack"].lower()
        processed[month_str][attack_type] = r["count"]
    
    return list(processed.values())

@router.get("/detection-rate")
async def get_detection_rate(current_user = Depends(get_current_user)):
    # Last 4 weeks
    start_time = datetime.utcnow() - timedelta(weeks=4)
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_time}}},
        {"$group": {
            "_id": {"week": {"$week": "$timestamp"}},
            "total": {"$sum": 1},
            "blocked": {
                "$sum": {
                    "$cond": [{"$ne": ["$prediction.attack_type", "Normal"]}, 1, 0]
                }
            }
        }},
        {"$sort": {"_id.week": 1}}
    ]
    
    results = await db.logs.aggregate(pipeline).to_list(None)
    
    data = []
    for i, r in enumerate(results):
        rate = (r["blocked"] / r["total"] * 100) if r["total"] > 0 else 0
        data.append({
            "week": f"Week {i+1}",
            "rate": round(rate, 1),
            "blocked": r["blocked"],
            "total": r["total"]
        })
        
    return data

@router.get("/geo-distribution")
async def get_geo_distribution(current_user = Depends(get_current_user)):
    # Group by src_ip
    pipeline = [
        {"$match": {"prediction.attack_type": {"$ne": "Normal"}}},
        {"$group": {
            "_id": "$features.src_ip",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    results = await db.logs.aggregate(pipeline).to_list(None)
    
    # Calculate total for percentage
    total_threats = await db.logs.count_documents({"prediction.attack_type": {"$ne": "Normal"}})
    
    data = []
    for r in results:
        ip = r.get("_id", "Unknown")
        count = r.get("count", 0)
        percentage = (count / total_threats * 100) if total_threats > 0 else 0
        
        data.append({
            "source_ip": ip,
            "threats": count,
            "percentage": round(percentage, 1)
        })
        
    return data

@router.get("/user-activity")
async def get_user_activity(current_user = Depends(get_current_user)):
    # Group by hour of day (0-23)
    pipeline = [
        {"$group": {
            "_id": {"$hour": "$timestamp"},
            "active": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.logs.aggregate(pipeline).to_list(None)
    
    data = []
    # Fill 0-23
    activity_map = {r["_id"]: r["active"] for r in results}
    
    for h in range(0, 24, 4): # Every 4 hours as per frontend example
        count = activity_map.get(h, 0)
        # Maybe average of surrounding hours? Or just point value.
        # Let's aggregate 4-hour blocks
        block_count = 0
        for i in range(4):
            block_count += activity_map.get(h+i, 0)
            
        data.append({
            "hour": f"{h:02d}:00",
            "active": block_count
        })
        
    return data
