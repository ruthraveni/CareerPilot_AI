import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/careerpilot_db")
DB_NAME = os.getenv("DB_NAME", "careerpilot_db")

try:
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    # Test connection lazily
    logger.info("MongoDB client initialized")
except Exception as e:
    logger.exception("Failed to initialize MongoDB client")
    raise

async def init_db_indexes():
    """Create necessary indexes for optimized performance."""
    try:
        await db["users"].create_index("email", unique=True)
        await db["interviews"].create_index("user_id")
        await db["chat_history"].create_index("user_id")
        await db["resume_analyses"].create_index("user_id")
        await db["user_preferences"].create_index("user_id", unique=True)
        logger.info("MongoDB indexes successfully created/verified")
    except Exception as e:
        logger.error(f"Failed to create MongoDB indexes: {e}")

def get_collection(collection_name: str):
    try:
        return db[collection_name]
    except Exception as e:
        logger.exception(f"Error accessing collection {collection_name}")
        raise
