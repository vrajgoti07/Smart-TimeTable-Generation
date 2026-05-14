from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from pydantic import BaseModel, EmailStr
from app.core.security import verify_password, create_access_token, get_password_hash
from app.database import get_database

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str  # Admin, Faculty, Student

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

import secrets
from datetime import datetime, timedelta
from app.utils.email import send_reset_email

class SetPasswordRequest(BaseModel):
    token: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    role: str = None

router = APIRouter()

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    Initiate password reset - sends email with token
    """
    db = get_database()
    
    print(f"🔍 Forgot password request for email: {request.email}")
    
    # Check "faculty" collection first
    user = await db.faculty.find_one({"email": request.email})
    collection_name = "faculty"
    
    # If not found in faculty, check "users" collection
    if not user:
        user = await db.users.find_one({"email": request.email})
        collection_name = "users"
    
    if not user:
        print(f"❌ User not found with email: {request.email}")
        # Always return a success-like message for security reasons
        return {"message": "If an account exists, a reset link has been sent."}
    
    print(f"✅ User found in {collection_name}: {user.get('name', 'Unknown')}")
    
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)
    
    await db[collection_name].update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expiry": expiry}}
    )
    
    success = send_reset_email(
        to_email=user["email"],
        user_name=user["name"],
        reset_token=reset_token
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send reset email.")
    
    return {"message": "Reset link sent successfully"}

@router.post("/reset-password")
async def reset_password(request: SetPasswordRequest):
    db = get_database()
    
    # Search for token in both collections
    user = await db.users.find_one({
        "reset_token": request.token,
        "reset_token_expiry": {"$gt": datetime.utcnow()}
    })
    collection_name = "users"
    
    if not user:
        user = await db.faculty.find_one({
            "reset_token": request.token,
            "reset_token_expiry": {"$gt": datetime.utcnow()}
        })
        collection_name = "faculty"
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    hashed_password = get_password_hash(request.password)
    await db[collection_name].update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": hashed_password, "reset_token": None, "reset_token_expiry": None}}
    )
    
    return {"message": "Password reset successfully"}

@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    db = get_database()
    
    # Select collection based on role
    if credentials.role == "Faculty":
        collection = db.faculty
        # Search by email only in faculty collection (role is implicit)
        user = await collection.find_one({"email": credentials.email})
    else:
        collection = db.users
        user = await collection.find_one({
            "email": credentials.email,
            "role": credentials.role
        })
    
    # Fallback to users collection for legacy Faculty login during migration if needed
    if not user and credentials.role == "Faculty":
        user = await db.users.find_one({"email": credentials.email, "role": "Faculty"})
        if user:
            collection = db.users

    # Check if the record found in faculty collection actually has a password
    # If not, fallback to main users collection (this handles synchronization lags)
    if user and not user.get("hashed_password"):
        user = await db.users.find_one({"email": credentials.email, "role": "Faculty"})
        if user:
            collection = db.users

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email, password, or role")
    
    if not user.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Please set your password via invite link")
    
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email, password, or role")
    
    token_data = {
        "sub": user["email"],
        "name": user["name"],
        "role": credentials.role,
        "user_id": str(user["_id"]),
        "studentId": user.get("studentId") or user.get("student_id") or ""
    }
    access_token = create_access_token(token_data)
    
    user_response = {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": credentials.role,
        "avatar": user.get("avatar", user["name"][:2].upper()),
    }
    
    if credentials.role == "Faculty":
        user_response["department"] = user.get("department", "")
    
    if credentials.role == "Student":
        user_response["department"] = user.get("department_id", user.get("department", ""))
        user_response["studentId"] = user.get("studentId") or user.get("student_id") or ""
        user_response["semester"] = user.get("semester", 4)
        user_response["phone"] = user.get("phone", "")
        user_response["dob"] = user.get("dob", "")
        user_response["address"] = user.get("address", "")
        user_response["admissionDate"] = user.get("admissionDate") or user.get("admission_date") or ""
        user_response["guardianName"] = user.get("guardianName") or user.get("guardian_name") or ""
        user_response["guardianContact"] = user.get("guardianContact") or user.get("guardian_contact") or ""
    
    return LoginResponse(access_token=access_token, user=user_response)


@router.post("/set-password")
async def set_password(request: SetPasswordRequest):
    db = get_database()
    
    # Search for invite token in both collections
    user = await db.users.find_one({"invite_token": request.token})
    collection_name = "users"
    
    if not user:
        user = await db.faculty.find_one({"invite_token": request.token})
        collection_name = "faculty"
        
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired invite token")
    
    hashed_password = get_password_hash(request.password)
    update_data = {"$set": {"hashed_password": hashed_password, "is_verified": True, "invite_token": None}}
    
    # Update the primary record found
    await db[collection_name].update_one({"_id": user["_id"]}, update_data)
    
    # If it was a Faculty member, ensure the mirror collection is also updated
    # This solves the synchronization bug where Faculty exist in both 'users' and 'faculty'
    other_collection = "faculty" if collection_name == "users" else "users"
    await db[other_collection].update_one(
        {"email": user["email"]}, 
        {"$set": {"hashed_password": hashed_password, "is_verified": True, "invite_token": None}}
    )
    
    return {"message": "Password set successfully"}
