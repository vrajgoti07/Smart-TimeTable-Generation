import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB Connection Configuration
MONGO_URI = "mongodb+srv://vrajgoti07_timetable_db_user:Vrajgoti%40200602@timetable-cluster.ulim3cx.mongodb.net/timetable_db"
DB_NAME = "timetable_db"

async def cleanup():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    print("=== SYSTEM CLEANUP started ===")
    
    # 1. Initialize Faculty Availability & Reset Load
    faculty_list = await db.faculty.find({}).to_list(length=1000)
    for f in faculty_list:
        update_doc = {}
        
        # Initialize Availability if missing
        if not f.get("availability"):
            update_doc["availability"] = {
                "Monday": ["09:10", "10:10", "12:10", "13:10", "14:20", "15:20"],
                "Tuesday": ["09:10", "10:10", "12:10", "13:10", "14:20", "15:20"],
                "Wednesday": ["09:10", "10:10", "12:10", "13:10", "14:20", "15:20"],
                "Thursday": ["09:10", "10:10", "12:10", "13:10", "14:20", "15:20"],
                "Friday": ["09:10", "10:10", "12:10", "13:10", "14:20", "15:20"]
            }
        
        # Reset Load for re-generation
        update_doc["current_hours"] = 0
        
        if update_doc:
            await db.faculty.update_one({"_id": f["_id"]}, {"$set": update_doc})
            print(f"Cleaned up faculty: {f.get('name')}")

    # 2. Clear existing Timetable (to ensure fresh start with strict rules)
    await db.timetable.delete_many({})
    print("Cleared existing timetable entries for fresh generation.")

    print("\n=== CLEANUP COMPLETE ===")
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup())
