import logging
import asyncio
import json
import smtplib
import os
import random
import string
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from dotenv import load_dotenv
from app.ml.engine import ml_engine
from app.database import db

load_dotenv()

logger = logging.getLogger(__name__)

async def _run_blocking(func, *args):
    """Run blocking synchronous code in a thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, func, *args)

async def send_otp_email(to_email: str, otp: str, purpose: str = "verification"):
    subject = f"Your OTP for CyberShield XAI {purpose.capitalize()}"
    body = f"Your One-Time Password (OTP) for {purpose} is: {otp}. This OTP will expire in 10 minutes."
    await _run_blocking(_send_email_sync, to_email, subject, body)

async def generate_otp(email: str, purpose: str = "verification"):
    otp = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store or update OTP in database
    await db.otps.update_one(
        {"email": email, "purpose": purpose},
        {"$set": {"otp": otp, "expires_at": expires_at}},
        upsert=True
    )
    return otp

async def verify_otp(email: str, otp: str, purpose: str = "verification"):
    otp_record = await db.otps.find_one({"email": email, "purpose": purpose})
    if not otp_record:
        return False
    
    if otp_record["otp"] == otp and otp_record["expires_at"] > datetime.utcnow():
        # Delete OTP after successful verification
        await db.otps.delete_one({"_id": otp_record["_id"]})
        return True
    
    return False

def _send_email_sync(to_email, subject, body):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    
    if not smtp_user or not smtp_password:
        logger.warning(f"[NOTIFICATION] SMTP credentials not set (SMTP_USER/PASS). Mocking email send to {to_email}.")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        logger.info(f"[NOTIFICATION] Email sent to {to_email}")
    except Exception as e:
        logger.error(f"[NOTIFICATION] Failed to send email: {e}")

def _send_slack_sync(url, message):
    try:
        payload = {"text": message}
        req = Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
        with urlopen(req) as response:
            if 200 <= response.status < 300:
                logger.info(f"[NOTIFICATION] Slack message sent to {url}")
            else:
                logger.error(f"[NOTIFICATION] Slack returned status {response.status}")
    except Exception as e:
        logger.error(f"[NOTIFICATION] Failed to send Slack message: {e}")

def _send_webhook_sync(url, data):
    try:
        req = Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
        with urlopen(req) as response:
             if 200 <= response.status < 300:
                logger.info(f"[NOTIFICATION] Webhook sent to {url}")
             else:
                logger.error(f"[NOTIFICATION] Webhook returned status {response.status}")
    except Exception as e:
        logger.error(f"[NOTIFICATION] Failed to send Webhook: {e}")

def _send_sms_sync(to_phone, message):
    # Twilio implementation
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")

    if not (sid and token and from_number):
        logger.warning(f"[NOTIFICATION] Twilio credentials not set. Mocking SMS send to {to_phone}.")
        return

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    from urllib.parse import urlencode
    import base64

    data = urlencode({
        "From": from_number,
        "To": to_phone,
        "Body": message
    }).encode('utf-8')

    auth = base64.b64encode(f"{sid}:{token}".encode('ascii')).decode('ascii')
    headers = {
        'Authorization': f'Basic {auth}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    try:
        req = Request(url, data=data, headers=headers, method='POST')
        with urlopen(req) as response:
            if 200 <= response.status < 300:
                logger.info(f"[NOTIFICATION] SMS sent to {to_phone}")
            else:
                logger.error(f"[NOTIFICATION] SMS returned status {response.status}")
    except Exception as e:
        logger.error(f"[NOTIFICATION] Failed to send SMS: {e}")


async def send_alert_notification(alert: dict, user_email: str = None):
    """
    Sends notification based on the current alert configuration in ml_engine.
    Optionally sends to a specific user_email if provided and email notifications are enabled.
    """
    config = ml_engine.alert_config
    
    # FAILSAFE: If config looks uninitialized (default), try to load from DB
    notifications = config.get("notifications", {})
    if not notifications.get("email"): 
        # Only check DB if email is disabled in memory (could be default or intentional)
        # But to be safe against startup failures, let's check DB if memory says disabled
        try:
             db_config = await db.admin_settings.find_one({"_id": "alert_config"})
             if db_config and db_config.get("notifications", {}).get("email"):
                 if "_id" in db_config: del db_config["_id"]
                 ml_engine.alert_config = db_config
                 config = db_config
                 logger.info("[NOTIFICATION] Config re-synced from DB (Memory was stale).")
        except Exception as e:
             logger.error(f"[NOTIFICATION] DB Sync failed: {e}")

    if not config:
        logger.warning("[NOTIFICATION] Alert Config is missing in ml_engine!")
        return

    notifications = config.get("notifications", {})
    logger.info(f"[NOTIFICATION] Processing Alert. Config Enabled: {notifications.get('email')}, User Email: {user_email}")

    contacts = config.get("contacts", {})
    
    msg = f"ALERT: {alert.get('severity')} - {alert.get('attack')} detected from {alert.get('details', {}).get('sourceIp')}!"
    tasks = []

    # 1. Send to Admin Contact
    if notifications.get("email") and contacts.get("email"):
        logger.info(f"[NOTIFICATION] Queueing EMAIL to Admin {contacts['email']}")
        tasks.append(_run_blocking(_send_email_sync, contacts['email'], f"CyberShield Alert: {alert.get('severity')}", msg))
    else:
        if not notifications.get("email"):
            logger.info("[NOTIFICATION] Admin Email SKIPPED: Disabled in configuration.")
        elif not contacts.get("email"):
            logger.info("[NOTIFICATION] Admin Email SKIPPED: No email contact provided.")

    # 2. Send to User (if provided)
    if user_email and notifications.get("email"):
        # Avoid duplicate if user is same as admin
        if user_email != contacts.get("email"):
             logger.info(f"[NOTIFICATION] Queueing EMAIL to User {user_email}")
             tasks.append(_run_blocking(_send_email_sync, user_email, f"CyberShield Alert: {alert.get('severity')}", msg))
    elif user_email:
         logger.info(f"[NOTIFICATION] User Email {user_email} SKIPPED: Email notifications disabled in global config.")


    if notifications.get("sms") and contacts.get("phone"):
        logger.info(f"[NOTIFICATION] Queueing SMS to {contacts['phone']}")
        tasks.append(_run_blocking(_send_sms_sync, contacts['phone'], msg))
    else:
        if not notifications.get("sms"):
            logger.info("[NOTIFICATION] SMS notification SKIPPED: Disabled in configuration.")
        elif not contacts.get("phone"):
            logger.info("[NOTIFICATION] SMS notification SKIPPED: No phone number provided.")
        
    if notifications.get("slack") and contacts.get("slackUrl"):
        logger.info(f"[NOTIFICATION] Queueing SLACK to {contacts['slackUrl']}")
        tasks.append(_run_blocking(_send_slack_sync, contacts['slackUrl'], msg))
    else:
        if not notifications.get("slack"):
            logger.info("[NOTIFICATION] Slack notification SKIPPED: Disabled in configuration.")
        elif not contacts.get("slackUrl"):
            logger.info("[NOTIFICATION] Slack notification SKIPPED: No Slack URL provided.")
        
    if notifications.get("webhook") and contacts.get("webhookUrl"):
        logger.info(f"[NOTIFICATION] Queueing WEBHOOK to {contacts['webhookUrl']}")
        tasks.append(_run_blocking(_send_webhook_sync, contacts['webhookUrl'], alert))
    else:
        if not notifications.get("webhook"):
            logger.info("[NOTIFICATION] Webhook notification SKIPPED: Disabled in configuration.")
        elif not contacts.get("webhookUrl"):
            logger.info("[NOTIFICATION] Webhook notification SKIPPED: No Webhook URL provided.")

    if notifications.get("push"):
        logger.info(f"[NOTIFICATION] BROWSER PUSH not implemented (requires VAPID/Frontend subscription). Logged only.")

    if tasks:
        await asyncio.gather(*tasks)

