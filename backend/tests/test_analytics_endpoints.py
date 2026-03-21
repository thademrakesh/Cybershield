
import asyncio
import os
import sys
import logging
from datetime import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_analytics")

from app.database import db
from app.routes.analytics import get_trends, get_threat_trends, get_detection_rate, get_geo_distribution, get_user_activity

async def test_endpoints():
    print("--- Testing Analytics Endpoints ---")
    
    # Mock current_user
    current_user = {"username": "admin", "role": "admin"}
    
    try:
        print("Testing get_trends...")
        trends = await get_trends(current_user)
        print(f"Trends: {len(trends)} items")
        if trends: print(f"Sample: {trends[0]}")
        
        print("\nTesting get_threat_trends...")
        threat_trends = await get_threat_trends(current_user)
        print(f"Threat Trends: {len(threat_trends)} items")
        if threat_trends: print(f"Sample: {threat_trends[0]}")

        print("\nTesting get_detection_rate...")
        detection_rate = await get_detection_rate(current_user)
        print(f"Detection Rate: {len(detection_rate)} items")
        if detection_rate: print(f"Sample: {detection_rate[0]}")

        print("\nTesting get_geo_distribution...")
        geo = await get_geo_distribution(current_user)
        print(f"Geo: {len(geo)} items")
        if geo: print(f"Sample: {geo[0]}")

        print("\nTesting get_user_activity...")
        activity = await get_user_activity(current_user)
        print(f"Activity: {len(activity)} items")
        if activity: print(f"Sample: {activity[0]}")

        print("\nSUCCESS: All endpoints executed without error.")
        
    except Exception as e:
        print(f"\nFAILURE: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_endpoints())
