import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def migrate_faculty():
    # Load environment variables
    load_dotenv()
    
    mongodb_url = os.getenv("MONGODB_URL")
    database_name = os.getenv("DATABASE_NAME", "timetable_db")
    
    print(f"Connecting to {mongodb_url}...")
    client = AsyncIOMotorClient(mongodb_url)
    db = client[database_name]
    
    print("Migrating Faculty collection...")
    faculty_cursor = db.faculty.find({})
    async for faculty in faculty_cursor:
        updates = {}
        
        # Rename subjects_can_teach to expertise
        if "subjects_can_teach" in faculty:
            updates["expertise"] = faculty["subjects_can_teach"]
            # No need to $unset here, we can do it later or keep for safety
            
        # Rename workingHours to max_hours
        if "workingHours" in faculty:
            updates["max_hours"] = faculty["workingHours"]
            
        # Rename current_load to current_hours
        if "current_load" in faculty:
            updates["current_hours"] = faculty["current_load"]
            
        # Ensure department exists and remove default "General" or "CSE" if it was used accidentally
        department = faculty.get("department")
        if not department or department in ["General", "CSE", ""]:
            # If it's one of the defaults we want to remove, and we don't have a better one, 
            # we'll keep it as "TBD" or just ensure it stays but without the hardcoded logic in code.
            # However, the user said "REMOVE any hardcoded department = 'CSE'".
            # If the user specifically meant records that are CSE but shouldn't be, 
            # we might want to flag them. But for now, we'll just ensure the field exists.
            if not department:
                updates["department"] = "TBD"

        if updates:
            print(f"Updating faculty {faculty.get('name', 'Unknown')}: {list(updates.keys())}")
            # Use $set to update and $unset to remove old fields
            unset_fields = {}
            if "subjects_can_teach" in faculty: unset_fields["subjects_can_teach"] = ""
            if "workingHours" in faculty: unset_fields["workingHours"] = ""
            if "current_load" in faculty: unset_fields["current_load"] = ""
            if "max_weekly_load" in faculty: unset_fields["max_weekly_load"] = ""
            
            await db.faculty.update_one(
                {"_id": faculty["_id"]},
                {"$set": updates, "$unset": unset_fields}
            )

    print("Migrating Users collection...")
    user_cursor = db.users.find({"role": "Faculty"})
    async for user in user_cursor:
        updates = {}
        if "subjects_can_teach" in user: updates["expertise"] = user["subjects_can_teach"]
        if "workingHours" in user: updates["max_hours"] = user["workingHours"]
        if "current_load" in user: updates["current_hours"] = user["current_load"]
        
        if updates:
            print(f"Updating user {user.get('name', 'Unknown')}: {list(updates.keys())}")
            unset_fields = {}
            if "subjects_can_teach" in user: unset_fields["subjects_can_teach"] = ""
            if "workingHours" in user: unset_fields["workingHours"] = ""
            if "current_load" in user: unset_fields["current_load"] = ""
            if "max_weekly_load" in user: unset_fields["max_weekly_load"] = ""
            
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": updates, "$unset": unset_fields}
            )

    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate_faculty())
