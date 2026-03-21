from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import List
from app.database import db
from app.utils.deps import get_current_user
from pydantic import BaseModel
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

router = APIRouter()

class LogEntry(BaseModel):
    id: str
    attack_type: str
    severity: str
    timestamp: datetime
    user_id: str

@router.get("/", response_model=List[dict])
async def get_logs(limit: int = 100, session_id: str = None, current_user = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    query = {"user_id": user_id}
    if session_id:
        # Use session-specific collection, still filter by user_id for security
        logs_cursor = db[f"logs_{session_id}"].find(query).sort("timestamp", -1).limit(limit)
    else:
        logs_cursor = db.logs.find(query).sort("timestamp", -1).limit(limit)

    logs = []
    async for log in logs_cursor:
        log["id"] = str(log["_id"])
        # Flatten structure if needed, or return as is
        # Simplify for response
        # Helper to extract IPs
        features = log.get("features", {})
        details = log.get("details", {})
        
        source_ip = details.get("sourceIp") or features.get("src_ip") or "N/A"
        dest_ip = details.get("destIp") or features.get("dst_ip") or "N/A"

        log_entry = {
            "id": str(log["_id"]),
            "attack_type": log.get("prediction", {}).get("attack_type", "Unknown"),
            "severity": log.get("prediction", {}).get("severity", "Unknown"),
            "timestamp": log["timestamp"],
            "user_id": log.get("user_id"),
            "details": {
                "sourceIp": source_ip,
                "destIp": dest_ip
            }
        }
        logs.append(log_entry)
    return logs

@router.get("/export")
async def export_logs(session_id: str = None, current_user = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    query = {"user_id": user_id}
    collection = db[f"logs_{session_id}"] if session_id else db.logs
    
    # Fetch data
    logs = await collection.find(query).sort("timestamp", -1).limit(1000).to_list(None)
    
    # Prepare data for charts
    attack_types = {}
    severity_counts = {}
    
    for log in logs:
        # Attack Type
        a_type = log.get("prediction", {}).get("attack_type", "Unknown")
        if a_type != "Normal":
            attack_types[a_type] = attack_types.get(a_type, 0) + 1
            
        # Severity
        sev = log.get("prediction", {}).get("severity", "Unknown")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Generate PDF
    buffer = BytesIO()
    # Optimized margins for landscape layout (0.5 inch all around)
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter),
                            leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    elements = []
    styles = getSampleStyleSheet()
    
    # --- Professional Header ---
    # We use a table for the header to neatly align title and metadata
    user_name = getattr(current_user, 'username', 'N/A')
    header_data = [
        [Paragraph("<b>CYBERSHIELD XAI - FORENSIC THREAT REPORT</b>", styles['Title']), ""],
        [f"Session Context: {session_id or 'Global Traffic Analysis'}", f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"],
        [f"Analyst: {user_name}", "Confidentiality Level: HIGH"]
    ]
    
    # Layout: Title spans 2 cols. Left col aligns left, Right col aligns right.
    # Page width ~792 pts. Margins 72. Usable 720.
    header_table = Table(header_data, colWidths=[400, 320])
    header_table.setStyle(TableStyle([
        ('SPAN', (0, 0), (1, 0)),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),   # Title Left
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Left column Left
        ('ALIGN', (1, 1), (1, -1), 'RIGHT'), # Right column Right
        ('TEXTCOLOR', (0, 0), (1, 0), colors.darkblue),
        ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (1, 0), 18),
        ('BOTTOMPADDING', (0, 0), (1, 0), 12),
        ('LINEBELOW', (0, -1), (-1, -1), 2, colors.darkgrey),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 15),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # --- Executive Summary ---
    total = len(logs)
    attacks = sum(1 for log in logs if log.get("prediction", {}).get("attack_type") != "Normal")
    critical = sum(1 for log in logs if log.get("prediction", {}).get("severity") == "Critical")
    
    # Full width summary table
    summary_data = [
        ["Total Packets Analyzed", "Malicious Threats Detected", "Critical Severity Events"],
        [str(total), str(attacks), str(critical)]
    ]
    summary_table = Table(summary_data, colWidths=[240, 240, 240])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1e293b')), # Dark slate
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        
        ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f1f5f9')), # Light gray
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 14),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 15))
    
    # --- Visualizations (Side-by-Side) ---
    elements.append(Paragraph("Threat Visualization Analysis", styles['Heading2']))
    
    viz_row = []
    
    # 1. Attack Distribution Pie Chart
    if attack_types:
        plt.figure(figsize=(5, 4))
        plt.pie(attack_types.values(), labels=attack_types.keys(), autopct='%1.1f%%', startangle=90, colors=['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'])
        plt.title('Attack Type Distribution', fontsize=10, pad=10)
        plt.tight_layout()
        pie_buffer = BytesIO()
        plt.savefig(pie_buffer, format='png', dpi=100)
        plt.close()
        pie_buffer.seek(0)
        # 350 width fits nicely in half of 720
        viz_row.append(Image(pie_buffer, width=340, height=260))
    else:
        viz_row.append(Paragraph("No attack data available for visualization.", styles['Normal']))
    
    # 2. Severity Bar Chart
    if severity_counts:
        plt.figure(figsize=(5, 4))
        # Custom color map for severity
        sev_colors = [
            '#ef4444' if k == 'Critical' else 
            '#f97316' if k == 'High' else 
            '#eab308' if k == 'Medium' else 
            '#22c55e' for k in severity_counts.keys()
        ]
        plt.bar(severity_counts.keys(), severity_counts.values(), color=sev_colors)
        plt.title('Severity Distribution', fontsize=10, pad=10)
        plt.xlabel('Severity Level', fontsize=8)
        plt.ylabel('Count', fontsize=8)
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        plt.tight_layout()
        bar_buffer = BytesIO()
        plt.savefig(bar_buffer, format='png', dpi=100)
        plt.close()
        bar_buffer.seek(0)
        viz_row.append(Image(bar_buffer, width=340, height=260))
    else:
        viz_row.append(Paragraph("No severity data available for visualization.", styles['Normal']))

    # Place charts in a 1x2 table
    if len(viz_row) == 2:
        viz_table = Table([viz_row], colWidths=[360, 360])
        viz_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(viz_table)
    elif len(viz_row) == 1:
        # If only one chart, center it
        elements.append(viz_row[0])

    elements.append(Spacer(1, 15))

    # --- Detailed Logs Table ---
    elements.append(Paragraph("Detailed Network Traffic Logs", styles['Heading2']))
    
    table_header = ["Timestamp", "Source IP", "Destination IP", "Attack Type", "Severity", "Conf."]
    table_data = [table_header]
    
    for log in logs:
        pred = log.get("prediction", {})
        features = log.get("features", {})
        details = log.get("details", {})
        
        source_ip = details.get("sourceIp") or features.get("src_ip") or "N/A"
        dest_ip = details.get("destIp") or features.get("dst_ip") or "N/A"
        
        timestamp = log.get("timestamp")
        if isinstance(timestamp, datetime):
            ts_str = timestamp.strftime("%H:%M:%S")
        else:
            ts_str = str(timestamp)
            
        table_data.append([
            ts_str,
            source_ip,
            dest_ip,
            pred.get("attack_type", "Unknown"),
            pred.get("severity", "Unknown"),
            f"{pred.get('confidence', 0):.1f}%"
        ])
        
    # Optimized Column Widths for Landscape (Total ~720)
    # Timestamp: 90, Src: 140, Dst: 140, Attack: 150, Severity: 100, Conf: 80 => Total 700
    col_widths = [90, 140, 140, 150, 100, 80]
    
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1e293b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor('#f8fafc')]), # Alternating rows
        ('ALIGN', (1, 1), (2, -1), 'LEFT'), # Left align IPs for readability? Actually Center is fine for IPs
    ]))
    
    elements.append(t)
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{session_id or 'all'}.pdf"}
    )
