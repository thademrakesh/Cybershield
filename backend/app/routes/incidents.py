from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from app.database import db
from app.utils.deps import get_current_user, get_current_admin_user
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

router = APIRouter()

class IncidentNote(BaseModel):
    content: str
    author: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class IncidentAction(BaseModel):
    action_type: str
    details: str
    performed_by: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "Completed"

class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: str  # Critical, High, Medium, Low
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    alert_id: Optional[str] = None
    assigned_to: Optional[str] = None

class IncidentUpdate(BaseModel):
    status: Optional[str] = None  # Open, Investigating, Resolved, Closed
    assigned_to: Optional[str] = None
    severity: Optional[str] = None

class Incident(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    created_at: datetime
    updated_at: datetime
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    alert_id: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: List[IncidentNote] = []
    actions: List[IncidentAction] = []
    timeline: List[Dict[str, Any]] = []

@router.get("/export/{incident_id}")
async def export_forensic_log(incident_id: str, current_user = Depends(get_current_user)):
    if not ObjectId.is_valid(incident_id):
        raise HTTPException(status_code=400, detail="Invalid incident ID")
        
    incident = await db.incidents.find_one({"_id": ObjectId(incident_id)})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    # Title
    elements.append(Paragraph(f"Forensic Incident Report: {incident.get('title')}", styles['Title']))
    elements.append(Spacer(1, 12))

    # Basic Info
    elements.append(Paragraph(f"<b>Incident ID:</b> {str(incident['_id'])}", styles['Normal']))
    elements.append(Paragraph(f"<b>Status:</b> {incident.get('status')}", styles['Normal']))
    elements.append(Paragraph(f"<b>Severity:</b> {incident.get('severity')}", styles['Normal']))
    elements.append(Paragraph(f"<b>Created At:</b> {incident.get('created_at')}", styles['Normal']))
    elements.append(Paragraph(f"<b>Assigned To:</b> {incident.get('assigned_to', 'Unassigned')}", styles['Normal']))
    elements.append(Spacer(1, 12))

    # Description
    elements.append(Paragraph("<b>Description:</b>", styles['Heading2']))
    elements.append(Paragraph(incident.get('description', ''), styles['Normal']))
    elements.append(Spacer(1, 12))

    # Technical Details
    elements.append(Paragraph("<b>Technical Details:</b>", styles['Heading2']))
    data = [
        ["Source IP", incident.get('source_ip', 'N/A')],
        ["Target IP", incident.get('target_ip', 'N/A')],
        ["Alert ID", incident.get('alert_id', 'N/A')]
    ]
    t = Table(data, colWidths=[100, 400])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 12))

    # Timeline
    if incident.get('timeline'):
        elements.append(Paragraph("<b>Timeline of Events:</b>", styles['Heading2']))
        timeline_data = [["Time", "Event", "Details"]]
        for event in incident.get('timeline', []):
            timeline_data.append([
                str(event.get('timestamp')),
                event.get('event'),
                event.get('details')
            ])
        
        t_timeline = Table(timeline_data, colWidths=[120, 100, 300])
        t_timeline.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t_timeline)
        elements.append(Spacer(1, 12))

    # Actions Taken
    if incident.get('actions'):
        elements.append(Paragraph("<b>Actions Taken:</b>", styles['Heading2']))
        actions_data = [["Time", "Action", "Performed By", "Details"]]
        for action in incident.get('actions', []):
            actions_data.append([
                str(action.get('timestamp')),
                action.get('action_type'),
                action.get('performed_by'),
                action.get('details')
            ])
            
        t_actions = Table(actions_data, colWidths=[120, 100, 100, 200])
        t_actions.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t_actions)
        elements.append(Spacer(1, 12))

    # Notes
    if incident.get('notes'):
        elements.append(Paragraph("<b>Investigation Notes:</b>", styles['Heading2']))
        for note in incident.get('notes', []):
            elements.append(Paragraph(f"<b>{note.get('author')} ({note.get('timestamp')}):</b>", styles['Normal']))
            elements.append(Paragraph(note.get('content'), styles['Normal']))
            elements.append(Spacer(1, 6))

    doc.build(elements)
    buffer.seek(0)
    
    filename = f"incident_report_{incident_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/", response_model=List[Incident])
async def get_incidents(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 50,
    current_user = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
        
    cursor = db.incidents.find(query).sort("created_at", -1).limit(limit)
    
    incidents = []
    async for incident in cursor:
        incident["id"] = str(incident["_id"])
        incidents.append(incident)
    return incidents

@router.post("/", response_model=Incident)
async def create_incident(
    incident_in: IncidentCreate,
    current_user = Depends(get_current_user)
):
    incident_dict = incident_in.dict()
    incident_dict["user_id"] = str(current_user["_id"])
    incident_dict["created_at"] = datetime.utcnow()
    incident_dict["updated_at"] = datetime.utcnow()
    incident_dict["status"] = "Open"
    incident_dict["notes"] = []
    incident_dict["actions"] = []
    incident_dict["timeline"] = [
        {
            "event": "Incident Created",
            "timestamp": incident_dict["created_at"],
            "details": f"Created by {current_user.get('username', 'system')}"
        }
    ]
    
    # If no assignee, maybe assign to current user if admin? 
    # For now, leave unassigned or assigned_to from input.
    
    result = await db.incidents.insert_one(incident_dict)
    incident_dict["id"] = str(result.inserted_id)
    
    return incident_dict

@router.get("/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str, current_user = Depends(get_current_user)):
    if not ObjectId.is_valid(incident_id):
        raise HTTPException(status_code=400, detail="Invalid incident ID")
        
    incident = await db.incidents.find_one({"_id": ObjectId(incident_id)})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident["id"] = str(incident["_id"])
    return incident

@router.put("/{incident_id}", response_model=Incident)
async def update_incident(
    incident_id: str,
    update_data: IncidentUpdate,
    current_user = Depends(get_current_user) # Allow users to update for now, or restrict to admin/assignee
):
    if not ObjectId.is_valid(incident_id):
        raise HTTPException(status_code=400, detail="Invalid incident ID")
        
    incident = await db.incidents.find_one({"_id": ObjectId(incident_id)})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if not update_dict:
        return incident # No changes
        
    update_dict["updated_at"] = datetime.utcnow()
    
    # Add timeline event for status change
    if "status" in update_dict and update_dict["status"] != incident["status"]:
        await db.incidents.update_one(
            {"_id": ObjectId(incident_id)},
            {"$push": {"timeline": {
                "event": "Status Changed",
                "timestamp": datetime.utcnow(),
                "details": f"Changed from {incident['status']} to {update_dict['status']} by {current_user.get('username', 'unknown')}"
            }}}
        )
        
    if "assigned_to" in update_dict and update_dict["assigned_to"] != incident.get("assigned_to"):
         await db.incidents.update_one(
            {"_id": ObjectId(incident_id)},
            {"$push": {"timeline": {
                "event": "Assignee Changed",
                "timestamp": datetime.utcnow(),
                "details": f"Assigned to {update_dict['assigned_to']} by {current_user.get('username', 'unknown')}"
            }}}
        )

    await db.incidents.update_one(
        {"_id": ObjectId(incident_id)},
        {"$set": update_dict}
    )
    
    updated_incident = await db.incidents.find_one({"_id": ObjectId(incident_id)})
    updated_incident["id"] = str(updated_incident["_id"])
    return updated_incident

@router.post("/{incident_id}/notes", response_model=IncidentNote)
async def add_note(
    incident_id: str,
    note: str = Body(..., embed=True),
    current_user = Depends(get_current_user)
):
    if not ObjectId.is_valid(incident_id):
        raise HTTPException(status_code=400, detail="Invalid incident ID")
        
    new_note = {
        "content": note,
        "author": current_user.get("username", "unknown"),
        "timestamp": datetime.utcnow()
    }
    
    result = await db.incidents.update_one(
        {"_id": ObjectId(incident_id)},
        {
            "$push": {
                "notes": new_note,
                "timeline": {
                    "event": "Note Added",
                    "timestamp": new_note["timestamp"],
                    "details": f"Note added by {new_note['author']}"
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    return new_note

@router.post("/{incident_id}/actions", response_model=IncidentAction)
async def perform_action(
    incident_id: str,
    action_type: str = Body(..., embed=True), # block_ip, isolate_device, etc.
    details: str = Body(..., embed=True),
    current_user = Depends(get_current_admin_user) # Only admins can perform actions
):
    if not ObjectId.is_valid(incident_id):
        raise HTTPException(status_code=400, detail="Invalid incident ID")
        
    new_action = {
        "action_type": action_type,
        "details": details,
        "performed_by": current_user.get("username", "admin"),
        "timestamp": datetime.utcnow(),
        "status": "Completed" # Simulated success
    }
    
    # In a real system, here we would call firewall API, etc.
    # For simulation, we just log it.
    
    result = await db.incidents.update_one(
        {"_id": ObjectId(incident_id)},
        {
            "$push": {
                "actions": new_action,
                "timeline": {
                    "event": f"Action: {action_type}",
                    "timestamp": new_action["timestamp"],
                    "details": f"{details} - Performed by {new_action['performed_by']}"
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    return new_action

