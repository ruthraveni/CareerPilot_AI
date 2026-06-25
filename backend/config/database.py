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

def get_collection(collection_name: str):
    try:
        return db[collection_name]
    except Exception as e:
        logger.exception(f"Error accessing collection {collection_name}")
        raise
