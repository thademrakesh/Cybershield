from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialize MongoDB Client
client = AsyncIOMotorClient(
    settings.MONGO_URI,
    serverSelectionTimeoutMS=5000  # 5 second timeout for server selection
)
db = client[settings.DB_NAME]

async def check_db_connection():
    """Verify database connection."""
    try:
        # The ping command is cheap and does not require auth.
        await client.admin.command('ping')
        logger.info("Successfully connected to MongoDB server.")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        return False

async def get_database():
    return db
