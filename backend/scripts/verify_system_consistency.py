import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB Connection Configuration
MONGO_URI = "mongodb+srv://vrajgoti07_timetable_db_user:Vrajgoti%40200602@timetable-cluster.ulim3cx.mongodb.net/timetable_db"
DB_NAME = "timetable_db"

async def verify_consistency():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    print("=== SYSTEM CONSISTENCY AUDIT ===")
    
    # 1. Faculty Audit
    print("\n[FACULTY AUDIT]")
    faculty_list = await db.faculty.find({}).to_list(length=1000)
    for f in faculty_list:
        errors = []
        if not f.get("department"): errors.append("Missing Department")
        if not f.get("availability"): errors.append("Missing Availability Grid")
        if f.get("max_hours", 0) <= 0: errors.append(f"Invalid Max Hours: {f.get('max_hours')}")
        
        if errors:
            print(f"[FAIL] {f.get('name')} ({f.get('email')}): {', '.join(errors)}")
        else:
            print(f"[PASS] {f.get('name')} is valid.")

    # 2. Course Audit
    print("\n[COURSE AUDIT]")
    courses = await db.courses.find({}).to_list(length=1000)
    for c in courses:
        errors = []
        if not c.get("branch"): errors.append("Missing Branch")
        if not c.get("semester"): errors.append("Missing Semester")
        
        if errors:
            print(f"[FAIL] {c.get('name')} ({c.get('code')}): {', '.join(errors)}")
        else:
            print(f"[PASS] {c.get('name')} is valid.")

    # 3. Workload Audit
    print("\n[WORKLOAD AUDIT]")
    for f in faculty_list:
        if f.get("current_hours", 0) > f.get("max_hours", 15):
            print(f"[OVERLOAD] {f.get('name')} ({f.get('current_hours')} / {f.get('max_hours')})")
        else:
            print(f"[OK] {f.get('name')} workload OK.")

    print("\n=== AUDIT COMPLETE ===")
    client.close()

if __name__ == "__main__":
    asyncio.run(verify_consistency())
