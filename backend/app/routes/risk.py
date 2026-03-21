from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from app.database import db
from app.utils.deps import get_current_user
from datetime import datetime, timedelta
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

router = APIRouter()

def calculate_risk_score(logs):
    """
    Calculate risk score based on logs.
    Weights: Critical=10, High=7, Medium=4, Low=1
    """
    score = 0
    weights = {
        "Critical": 10,
        "High": 7,
        "Medium": 4,
        "Low": 1,
        "Normal": 0
    }
    
    # This is a simplified calculation. 
    # In a real system, we'd consider time decay, asset value, etc.
    total_weight = 0
    for log in logs:
        severity = log.get("prediction", {}).get("severity", "Low")
        # If severity is not in weights, map based on attack type or default to Low
        if severity not in weights:
            severity = "Low"
            
        total_weight += weights.get(severity, 1)
        
    # Normalize to 0-100 based on some threshold (e.g., 1000 points = 100% risk)
    # This ensures the score is dynamic but capped.
    risk_score = min(100, total_weight / 10)
    return round(risk_score, 1)

def get_risk_level(score):
    if score >= 80:
        return "Critical"
    elif score >= 50:
        return "High"
    elif score >= 20:
        return "Medium"
    else:
        return "Low"

@router.get("/summary")
async def get_risk_summary(current_user = Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    user_id = str(current_user["_id"])
    query = {} if is_admin else {"user_id": user_id}
    
    # Analyze last 24 hours
    start_time = datetime.utcnow() - timedelta(hours=24)
    
    pipeline = [
        {"$match": {
            "timestamp": {"$gte": start_time},
            "prediction.attack_type": {"$ne": "Normal"},
            **query
        }},
        {"$project": {
            "prediction": 1,
            "features": 1,
            "timestamp": 1
        }}
    ]
    
    threats = await db.logs.aggregate(pipeline).to_list(None)
    
    risk_score = calculate_risk_score(threats)
    risk_level = get_risk_level(risk_score)
    
    # Count unique targets and sources
    targets = set()
    sources = set()
    for t in threats:
        features = t.get("features", {})
        if "dst_ip" in features:
            targets.add(features["dst_ip"])
        if "src_ip" in features:
            sources.add(features["src_ip"])
            
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "active_threats": len(threats),
        "affected_systems": len(targets),
        "risky_sources": len(sources)
    }

@router.get("/hosts")
async def get_vulnerable_hosts(current_user = Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    user_id = str(current_user["_id"])
    query = {} if is_admin else {"user_id": user_id}
    
    # Group threats by destination IP
    start_time = datetime.utcnow() - timedelta(days=7)
    
    pipeline = [
        {"$match": {
            "timestamp": {"$gte": start_time},
            "prediction.attack_type": {"$ne": "Normal"},
            **query
        }},
        {"$group": {
            "_id": "$features.dst_ip",
            "count": {"$sum": 1},
            "critical_count": {
                "$sum": {"$cond": [{"$in": ["$prediction.severity", ["High", "Critical"]]}, 1, 0]}
            },
            "last_attack": {"$max": "$timestamp"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    results = await db.logs.aggregate(pipeline).to_list(None)
    
    hosts = []
    for r in results:
        ip = r.get("_id")
        if not ip:
            continue
            
        # Calculate host-specific risk
        host_risk = min(100, (r["critical_count"] * 10 + (r["count"] - r["critical_count"]) * 2) / 5)
        
        hosts.append({
            "ip": ip,
            "total_attacks": r["count"],
            "critical_attacks": r["critical_count"],
            "last_attack": r["last_attack"],
            "risk_score": round(host_risk, 1),
            "status": "Vulnerable" if host_risk > 50 else "Warning"
        })
        
    return hosts

@router.get("/sources")
async def get_risky_sources(current_user = Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    user_id = str(current_user["_id"])
    query = {} if is_admin else {"user_id": user_id}
    
    # Group threats by source IP
    start_time = datetime.utcnow() - timedelta(days=7)
    
    pipeline = [
        {"$match": {
            "timestamp": {"$gte": start_time},
            "prediction.attack_type": {"$ne": "Normal"},
            **query
        }},
        {"$group": {
            "_id": "$features.src_ip",
            "count": {"$sum": 1},
            "attack_types": {"$addToSet": "$prediction.attack_type"},
            "last_seen": {"$max": "$timestamp"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    results = await db.logs.aggregate(pipeline).to_list(None)
    
    sources = []
    for r in results:
        ip = r.get("_id")
        if not ip:
            continue
            
        sources.append({
            "ip": ip,
            "attacks_count": r["count"],
            "attack_types": r["attack_types"],
            "last_seen": r["last_seen"],
            "risk_level": "Critical" if r["count"] > 50 else "High" if r["count"] > 20 else "Medium"
        })
        
    return sources

@router.get("/trends")
async def get_risk_trends(current_user = Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    user_id = str(current_user["_id"])
    query = {} if is_admin else {"user_id": user_id}
    
    # Calculate daily risk score for last 7 days
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=7)
    
    pipeline = [
        {"$match": {
            "timestamp": {"$gte": start_time},
            "prediction.attack_type": {"$ne": "Normal"},
            **query
        }},
        {"$group": {
            "_id": {
                "year": {"$year": "$timestamp"},
                "month": {"$month": "$timestamp"},
                "day": {"$dayOfMonth": "$timestamp"}
            },
            "logs": {"$push": {
                "severity": "$prediction.severity"
            }}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
    ]
    
    results = await db.logs.aggregate(pipeline).to_list(None)
    
    trends = []
    # Create a map for quick lookup
    result_map = {}
    for r in results:
        date_str = f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}"
        # Calculate score for this day
        day_logs = [{"prediction": {"severity": l["severity"]}} for l in r["logs"]]
        score = calculate_risk_score(day_logs)
        result_map[date_str] = score
        
    # Fill in all 7 days
    for i in range(7):
        d = start_time + timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        trends.append({
            "date": d.strftime("%b %d"),
            "risk_score": result_map.get(date_str, 0)
        })
        
    return trends

@router.get("/export")
async def export_risk_report(current_user = Depends(get_current_user)):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    elements.append(Paragraph("Risk Assessment Report", styles['Title']))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 12))
    
    # Summary Section
    elements.append(Paragraph("Executive Summary", styles['Heading2']))
    
    # Get summary data
    summary = await get_risk_summary(current_user)
    
    summary_data = [
        ["Metric", "Value"],
        ["Overall Risk Score", f"{summary['risk_score']}/100"],
        ["Risk Level", summary['risk_level']],
        ["Active Threats (24h)", str(summary['active_threats'])],
        ["Affected Systems", str(summary['affected_systems'])],
        ["Risky Sources", str(summary['risky_sources'])]
    ]
    
    t = Table(summary_data, colWidths=[3*inch, 3*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(t)
    elements.append(Spacer(1, 24))
    
    # Top Risky Sources
    elements.append(Paragraph("Top Risky Sources", styles['Heading2']))
    sources = await get_risky_sources(current_user)
    
    if sources:
        source_data = [["Source IP", "Attack Count", "Risk Level", "Last Seen"]]
        for s in sources:
            source_data.append([
                s["ip"],
                str(s["attacks_count"]),
                s["risk_level"],
                s["last_seen"].strftime("%Y-%m-%d %H:%M") if isinstance(s["last_seen"], datetime) else str(s["last_seen"])
            ])
            
        t2 = Table(source_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 2*inch])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkred),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(t2)
    else:
        elements.append(Paragraph("No risky sources detected in the last 7 days.", styles['Normal']))
        
    elements.append(Spacer(1, 24))
    
    # Vulnerable Hosts
    elements.append(Paragraph("Vulnerable Hosts (Top Targets)", styles['Heading2']))
    hosts = await get_vulnerable_hosts(current_user)
    
    if hosts:
        host_data = [["Target IP", "Total Attacks", "Risk Score", "Status"]]
        for h in hosts:
            host_data.append([
                h["ip"],
                str(h["total_attacks"]),
                str(h["risk_score"]),
                h["status"]
            ])
            
        t3 = Table(host_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 2*inch])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.navy),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(t3)
    else:
        elements.append(Paragraph("No vulnerable hosts detected in the last 7 days.", styles['Normal']))

    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=risk_assessment_report.pdf"}
    )
