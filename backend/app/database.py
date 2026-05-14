from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from app.core.config import settings

class Database:
    client: Optional[AsyncIOMotorClient] = None

db = Database()

async def connect_db():
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)
        # Verify connection
        await db.client.admin.command('ping')
        print("Connected to MongoDB Atlas")
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")
        raise e

async def close_db():
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")

def get_database():
    return db.client[settings.DATABASE_NAME]

