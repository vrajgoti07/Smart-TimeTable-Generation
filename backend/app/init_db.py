"""
Database initialization script
Creates database structure and one admin account
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.security import get_password_hash
from app.core.config import settings

async def init_database():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    print("🔄 Initializing database...")
    
    # Clear existing data (keeping users)
    await db.courses.delete_many({})
    await db.timetable.delete_many({})
    await db.rooms.delete_many({})
    await db.faculty.delete_many({})
    
    print("✅ Collections cleared (except users)")
    
    # Create indexes for better performance
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.courses.create_index("code", unique=True)
    await db.courses.create_index("semester")
    await db.timetable.create_index([("day", 1), ("time", 1)])
    
    print("✅ Indexes created")
    
    # Create default admin account
    print("\n" + "="*50)
    print("CREATING ADMIN ACCOUNT")
    print("="*50)
    
    # Default admin credentials
    admin_name = "Admin"
    admin_email = "vrajgoti07@gmail.com"
    admin_password = "123456789"
    
    admin_user = {
        "email": admin_email,
        "hashed_password": get_password_hash(admin_password),
        "role": "Admin",
        "name": admin_name,
        "avatar": "AD"
    }
    
    try:
        await db.users.insert_one(admin_user)
        print("\n✅ Admin account created successfully!")
        print(f"\n📝 Admin Login Credentials:")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
        print(f"   Role: Admin")
        print(f"\n⚠️  IMPORTANT: Change this password after first login!")
        print(f"\n🎉 Database is ready!")
        print(f"\n📌 Next Steps:")
        print(f"   1. Start backend: uvicorn app.main:app --reload")
        print(f"   2. Start frontend: npm run dev")
        print(f"   3. Login with above credentials")
        print(f"   4. Add faculty and students through the UI")
    except Exception as e:
        print(f"\n❌ Error creating admin account: {e}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_database())
