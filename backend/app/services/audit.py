from datetime import datetime
from app.database import db

async def log_audit_event(
    action: str,
    resource: str,
    details: str,
    user: str = "system",
    status: str = "success",
    severity: str = "info",
    ip_address: str = "127.0.0.1"
):
    """
    Log an audit event to the database.
    """
    event = {
        "timestamp": datetime.utcnow(),
        "user": user,
        "action": action,
        "resource": resource,
        "details": details,
        "ipAddress": ip_address,
        "status": status,
        "severity": severity
    }
    await db.audit_logs.insert_one(event)
