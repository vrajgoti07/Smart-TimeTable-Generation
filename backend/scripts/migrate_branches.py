import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB Connection Configuration
MONGO_URI = "mongodb+srv://vrajgoti07_timetable_db_user:Vrajgoti%40200602@timetable-cluster.ulim3cx.mongodb.net/timetable_db"
DB_NAME = "timetable_db"

async def migrate_branches():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    print("Starting Branch Migration...")
    
    # 1. Update Courses
    courses = await db.courses.find({}).to_list(length=1000)
    for course in courses:
        # Determine branch from branches list or department_id
        current_branch = course.get("branch")
        if not current_branch:
            branches = course.get("branches", [])
            dept_id = course.get("department_id")
            
            # Map existing field to new branch field
            new_branch = branches[0] if branches else dept_id or "CSE"
            
            await db.courses.update_one(
                {"_id": course["_id"]},
                {"$set": {"branch": new_branch}}
            )
            print(f"Updated course {course.get('name')} to branch {new_branch}")

    print("Migration Complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_branches())
