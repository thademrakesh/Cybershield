from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.schemas.ml import PredictionRequest, PredictionResponse, ExplanationRequest, ExplanationResponse
from app.ml.engine import ml_engine
from app.utils.deps import get_current_user
from datetime import datetime
from app.database import db
import pandas as pd
import io
from scapy.all import rdpcap
from app.services.capture import capture_service
from app.services.notifications import send_alert_notification

router = APIRouter()

@router.post("/upload", response_model=PredictionResponse)
async def upload_file(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    try:
        name = file.filename.lower()
        content = await file.read()
        features = None
        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
            if df.empty:
                raise HTTPException(status_code=400, detail="Empty file")
            features = df.iloc[0].to_dict()
        elif name.endswith(".pcap"):
            packets = rdpcap(io.BytesIO(content))
            if not packets:
                raise HTTPException(status_code=400, detail="Empty pcap")
            
            # Create session first to use ID
            from bson import ObjectId
            session_id = str(ObjectId())
            
            processed_logs = []
            processed_alerts = []
            
            # Simple Flow Tracker for uploaded file context
            # Map: dst_ip -> count
            host_count = {}
            # Map: (dst_ip, port) -> count
            service_count = {}
            
            for packet in packets:
                try:
                    # Extract base features
                    features = capture_service._extract_features(packet)
                    
                    # Enhanced Feature Engineering for File Context
                    dst = features.get('dst_ip')
                    port = features.get('port')
                    
                    if dst:
                        host_count[dst] = host_count.get(dst, 0) + 1
                        features['count'] = host_count[dst]
                        
                        if port:
                            key = (dst, port)
                            service_count[key] = service_count.get(key, 0) + 1
                            features['srv_count'] = service_count[key]
                            
                            # Recalculate rates
                            if features['count'] > 0:
                                features['same_srv_rate'] = features['srv_count'] / features['count']
                                features['diff_srv_rate'] = (features['count'] - features['srv_count']) / features['count']
                    
                    # Predict
                    result = ml_engine.predict(features)
                    
                    # Timestamp from packet if available, else now
                    pkt_time = datetime.fromtimestamp(float(packet.time)) if hasattr(packet, 'time') else datetime.utcnow()
                    result["timestamp"] = pkt_time.isoformat()
                    
                    # Prepare Log Entry
                    log_entry = {
                        "features": features,
                        "prediction": result,
                        "user_id": str(current_user["_id"]),
                        "timestamp": pkt_time,
                        "source": "file_upload",
                        "filename": file.filename,
                        "session_id": session_id,
                        "interface": "upload"
                    }
                    processed_logs.append(log_entry)
                    
                    # Prepare Alert if needed
                    if result["severity"] in ["Medium", "High", "Critical"] or result["attack_type"] in ["DoS", "Probe", "R2L", "U2R"]:
                        alert_details = {
                            "sourceIp": features.get("src_ip"),
                            "destIp": features.get("dst_ip"),
                            "protocol": features.get("protocol_type"),
                            "port": features.get("port"),
                        }
                        alert = {
                            "attack": result["attack_type"],
                        "severity": result["severity"],
                        "timestamp": pkt_time,
                        "status": "New",
                        "details": alert_details,
                        "source": f"File: {file.filename}",
                        "session_id": session_id,
                        "user_id": str(current_user["_id"]),
                        "features": features
                    }
                        processed_alerts.append(alert)
                except Exception as e:
                    # Skip malformed packets but continue
                    continue

            # Batch Insert Logs
            if processed_logs:
                await db.logs.insert_many(processed_logs)
                await db[f"logs_{session_id}"].insert_many(processed_logs)
            
            # Batch Insert Alerts
            if processed_alerts:
                await db.alerts.insert_many(processed_alerts)
                await db[f"alerts_{session_id}"].insert_many(processed_alerts)
                
                # Send notifications for alerts
                for alert in processed_alerts:
                    await send_alert_notification(alert, user_email=current_user.get("email"))

            # Update Session Info
            await db.sessions.insert_one({
                "_id": ObjectId(session_id),
                "type": "file_upload",
                "start_time": datetime.utcnow(),
                "end_time": datetime.utcnow(),
                "name": f"Upload: {file.filename}",
                "status": "completed",
                "filename": file.filename,
                "user_id": str(current_user["_id"]),
                "packet_count": len(processed_logs),
                "alert_count": len(processed_alerts)
            })

            # Return the result of the LAST packet as a summary/sample
            # or a custom summary object
            if processed_logs:
                last_result = processed_logs[-1]["prediction"]
                # Add summary stats to response if needed, but the model expects PredictionResponse
                return last_result
            else:
                raise HTTPException(status_code=400, detail="No valid packets processed")

        elif name.endswith(".json"):
            try:
                df = pd.read_json(io.BytesIO(content))
                if df.empty:
                    raise HTTPException(status_code=400, detail="Empty file")
                features = df.iloc[0].to_dict()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid JSON")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Create session
        from bson import ObjectId
        session_id = str(ObjectId())
        await db.sessions.insert_one({
            "_id": ObjectId(session_id),
            "type": "file_upload",
            "start_time": datetime.utcnow(),
            "end_time": datetime.utcnow(),
            "name": f"Upload: {file.filename}",
            "status": "completed",
            "filename": file.filename,
            "user_id": str(current_user["_id"])
        })
        
        result = ml_engine.predict(features)
        result["timestamp"] = datetime.utcnow().isoformat()
        log_entry = {
            "features": features,
            "prediction": result,
            "user_id": str(current_user["_id"]),
            "timestamp": datetime.utcnow(),
            "source": "file_upload",
            "filename": file.filename,
            "session_id": session_id
        }
        await db.logs.insert_one(log_entry)
        await db[f"logs_{session_id}"].insert_one(log_entry)

        if result["severity"] in ["Medium", "High", "Critical"]:
            alert_details = {
                "sourceIp": (features or {}).get("src_ip"),
                "destIp": (features or {}).get("dst_ip"),
                "protocol": (features or {}).get("protocol_type"),
                "port": (features or {}).get("port"),
            }
            alert = {
                "attack": result["attack_type"],
            "severity": result["severity"],
            "timestamp": datetime.utcnow(),
            "status": "New",
            "details": alert_details,
            "source": f"File: {file.filename}",
            "session_id": session_id,
            "user_id": str(current_user["_id"])
        }
            await db.alerts.insert_one(alert)
            await db[f"alerts_{session_id}"].insert_one(alert)
            await send_alert_notification(alert)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest, current_user = Depends(get_current_user)):
    try:
        keys = list((request.features or {}).keys())
        import logging
        logging.getLogger(__name__).info(f"/predict features keys: {keys}")
    except Exception:
        pass
    result = ml_engine.predict(request.features)
    result["timestamp"] = datetime.utcnow().isoformat()
    
    # Log prediction
    log_entry = {
        "features": request.features,
        "prediction": result,
        "user_id": str(current_user["_id"]),
        "timestamp": datetime.utcnow()
    }
    await db.logs.insert_one(log_entry)
    
    # Generate Alert if Medium/High/Critical
    if result["severity"] in ["Medium", "High", "Critical"]:
        alert_details = {
            "sourceIp": (request.features or {}).get("src_ip"),
            "destIp": (request.features or {}).get("dst_ip"),
            "protocol": (request.features or {}).get("protocol_type"),
            "port": (request.features or {}).get("port"),
        }
        alert = {
            "attack": result["attack_type"],
            "severity": result["severity"],
            "timestamp": datetime.utcnow(),
            "status": "New",
            "details": alert_details,
            "user_id": str(current_user["_id"]),
            "features": request.features
        }
        await db.alerts.insert_one(alert)
        await send_alert_notification(alert, user_email=current_user.get("email"))
        
    return result

@router.post("/explain", response_model=ExplanationResponse)
async def explain(request: ExplanationRequest, current_user = Depends(get_current_user)):
    try:
        keys = list((request.features or {}).keys())
        import logging
        logging.getLogger(__name__).info(f"/explain features keys: {keys}")
    except Exception:
        pass
    explanation = ml_engine.explain(request.features)
    return explanation
