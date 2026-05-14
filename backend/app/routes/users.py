from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks, File, UploadFile
from app.core.security import get_current_user, get_password_hash, verify_password
from app.database import get_database
from app.models.user import UserCreate, UserResponse, ChangePasswordRequest, DeleteAccountRequest
from typing import List
from bson import ObjectId
from app.utils.email import send_password_change_email, send_delete_account_email
import os
import shutil
import base64
from app.services.activity_service import ActivityService

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_all_users(user: dict = Depends(get_current_user)):
    """
    Get all users (Admin only)
    """
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    users = await db.users.find({}).to_list(length=1000)
    
    # Convert ObjectId to string and remove password
    result = []
    for u in users:
        user_dict = {
            "id": str(u["_id"]),
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "avatar": u.get("avatar", ""),
            "is_active": u.get("is_active", True),
        }
        
        # Add optional fields
        if "department" in u:
            user_dict["department"] = u["department"]
        if "studentId" in u:
            user_dict["studentId"] = u["studentId"]
        if "semester" in u:
            user_dict["semester"] = u["semester"]
        if "max_hours" in u:
            user_dict["max_hours"] = u["max_hours"]
        if "availability" in u:
            user_dict["availability"] = u["availability"]
        if "expertise" in u:
            user_dict["expertise"] = u["expertise"]
        if "current_hours" in u:
            user_dict["current_hours"] = u["current_hours"]
        if "available_slots" in u:
            user_dict["available_slots"] = u["available_slots"]
        
        result.append(user_dict)
    
    return result

@router.post("/", response_model=dict)
async def create_user(
    new_user: UserCreate,
    user: dict = Depends(get_current_user)
):
    """
    Create a new user (Admin only)
    Password is required during creation
    """
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    # Check if email already exists
    existing = await db.users.find_one({"email": new_user.email})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    # Password is required
    if not new_user.password:
        raise HTTPException(
            status_code=400,
            detail="Password is required"
        )
    
    # Create avatar from name
    avatar = ''.join([word[0].upper() for word in new_user.name.split()[:2]])
    
    # Prepare user document WITH password
    user_doc = {
        "email": new_user.email,
        "role": new_user.role,
        "name": new_user.name,
        "avatar": avatar,
        "hashed_password": get_password_hash(new_user.password),
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    # Add optional fields
    if new_user.department:
        user_doc["department"] = new_user.department
    if new_user.studentId:
        user_doc["studentId"] = new_user.studentId
    if new_user.semester:
        user_doc["semester"] = new_user.semester
    if new_user.max_hours:
        user_doc["max_hours"] = new_user.max_hours
    if new_user.availability:
        user_doc["availability"] = new_user.availability
    if new_user.expertise:
        user_doc["expertise"] = new_user.expertise
    
    # Insert user
    result = await db.users.insert_one(user_doc)
    user_id = result.inserted_id

    # Log activity
    await ActivityService.log_activity(
        action=f"Created new user: {new_user.name} ({new_user.role})",
        user=user.get("name", "Admin"),
        type="success"
    )
    
    # If Faculty, also mirror to faculty collection for scheduling
    if new_user.role == "Faculty":
        faculty_doc = {
            "_id": user_id,  # Use same ID for consistency
            "email": new_user.email,
            "name": new_user.name,
            "department": new_user.department,
            "max_hours": user_doc.get("max_hours", 15),
            "availability": user_doc.get("availability", {}),
            "expertise": user_doc.get("expertise", []),
            "current_hours": user_doc.get("current_hours", 0),
            "available_slots": user_doc.get("available_slots", 0),
            "hashed_password": user_doc["hashed_password"],
            "is_verified": True,
            "created_at": user_doc["created_at"]
        }
        await db.faculty.insert_one(faculty_doc)
    
    return {
        "id": str(result.inserted_id),
        "message": "User created successfully",
        "email": new_user.email
    }

from datetime import datetime

@router.put("/change-password", response_model=dict)
async def change_password(
    request: ChangePasswordRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Change user password (Self)
    """
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
        
    db = get_database()
    
    # Check if user role is Faculty to choose correct collection
    collection = db.faculty if user.get("role") == "Faculty" else db.users
    user_record = await collection.find_one({"_id": ObjectId(user["user_id"])})
    
    if not user_record:
        # Fallback to users if somehow not found in faculty
        user_record = await db.users.find_one({"_id": ObjectId(user["user_id"])})
        if not user_record:
            raise HTTPException(status_code=404, detail="User not found")
            
    if not user_record.get("hashed_password"):
        raise HTTPException(status_code=400, detail="Password not set")
        
    if not verify_password(request.current_password, user_record["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect current password")
        
    new_hashed_password = get_password_hash(request.new_password)
    
    # Update across both collections if they exist in both
    await db.users.update_one(
        {"_id": ObjectId(user["user_id"])},
        {"$set": {"hashed_password": new_hashed_password}}
    )
    if user.get("role") == "Faculty" or user_record.get("role") == "Faculty":
        await db.faculty.update_one(
            {"_id": ObjectId(user["user_id"])},
            {"$set": {"hashed_password": new_hashed_password}}
        )
        
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    background_tasks.add_task(send_password_change_email, user_record["email"], user_record.get("name", "User"), timestamp)
    
    # Log activity
    await ActivityService.log_activity(
        action="Changed their password",
        user=user_record.get("name", "User"),
        type="info"
    )
    
    return {"message": "Password changed successfully"}

@router.delete("/delete-account", response_model=dict)
async def delete_account(
    request: DeleteAccountRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Delete user account (Self)
    """
    db = get_database()
    
    collection = db.faculty if user.get("role") == "Faculty" else db.users
    user_record = await collection.find_one({"_id": ObjectId(user["user_id"])})
    
    if not user_record:
        user_record = await db.users.find_one({"_id": ObjectId(user["user_id"])})
        if not user_record:
            raise HTTPException(status_code=404, detail="User not found")
            
    if not verify_password(request.password, user_record.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Incorrect password")
        
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Register email sending in background task
    background_tasks.add_task(send_delete_account_email, user_record["email"], user_record.get("name", "User"), timestamp)
    
    # Delete from collections
    await db.users.delete_one({"_id": ObjectId(user["user_id"])})
    await db.faculty.delete_one({"_id": ObjectId(user["user_id"])})
    
    # Log activity
    await ActivityService.log_activity(
        action="Deleted their own account",
        user=user_record.get("name") or user.get("name") or "User",
        type="warning"
    )
    
    return {"message": "Account deleted successfully"}

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Upload and update user profile photo
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, and WEBP are allowed."
        )
    
    # Get user ID from token
    user_id = user["user_id"]
    
    # Convert file to Base64
    try:
        contents = await file.read()
        # Limit size to 1MB to prevent DB bloating
        if len(contents) > 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size exceeds 1MB limit")
            
        base64_data = base64.b64encode(contents).decode("utf-8")
        avatar_url = f"data:{file.content_type};base64,{base64_data}"
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")
    
    db = get_database()
    
    # Update across both collections
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"avatar": avatar_url}}
    )
    
    if user.get("role") == "Faculty":
        await db.faculty.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"avatar": avatar_url}}
        )
    
    # Log activity
    await ActivityService.log_activity(
        action=f"Updated profile photo",
        user=user.get("name") or "User",
        type="success"
    )
    
    return {
        "message": "Avatar updated successfully",
        "avatar_url": avatar_url
    }

@router.delete("/avatar")
async def delete_avatar(
    user: dict = Depends(get_current_user)
):
    """
    Remove user profile photo and revert to initials
    """
    user_id = user["user_id"]
    db = get_database()
    
    # Update across both collections
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"avatar": ""}}
    )
    
    if user.get("role") == "Faculty":
        await db.faculty.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"avatar": ""}}
        )
        
    # Log activity
    await ActivityService.log_activity(
        action=f"Removed profile photo",
        user=user.get("name") or "User",
        type="info"
    )
        
    return {"message": "Avatar removed successfully", "avatar_url": ""}

@router.put("/{user_id}", response_model=dict)
async def update_user(
    user_id: str,
    updated_user: UserCreate,
    user: dict = Depends(get_current_user)
):
    """
    Update a user (Admin only)
    """
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    # Check if user exists
    existing = await db.users.find_one({"_id": ObjectId(user_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is taken by another user
    email_check = await db.users.find_one({
        "email": updated_user.email,
        "_id": {"$ne": ObjectId(user_id)}
    })
    if email_check:
        raise HTTPException(
            status_code=400,
            detail="Email already taken by another user"
        )
    
    # Create avatar from name
    avatar = ''.join([word[0].upper() for word in updated_user.name.split()[:2]])
    
    # Prepare update document
    update_doc = {
        "email": updated_user.email,
        "role": updated_user.role,
        "name": updated_user.name,
        "avatar": avatar
    }
    
    # Update password only if provided
    if updated_user.password:
        update_doc["hashed_password"] = get_password_hash(updated_user.password)
    
    # Add optional fields
    if updated_user.department is not None:
        update_doc["department"] = updated_user.department
    if updated_user.studentId is not None:
        update_doc["studentId"] = updated_user.studentId
    if updated_user.semester is not None:
        update_doc["semester"] = updated_user.semester
    if updated_user.max_hours is not None:
        update_doc["max_hours"] = updated_user.max_hours
    if updated_user.availability is not None:
        update_doc["availability"] = updated_user.availability
    if updated_user.expertise is not None:
        update_doc["expertise"] = updated_user.expertise
    
    # Update user in users collection
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_doc}
    )
    
    # If Faculty (or previously Faculty), sync with faculty collection
    if updated_user.role == "Faculty":
        faculty_update = {
            "email": updated_user.email,
            "name": updated_user.name,
            "department": updated_user.department,
            "expertise": updated_user.expertise,
            "max_hours": updated_user.max_hours,
            "availability": updated_user.availability
        }
        if updated_user.password:
            faculty_update["hashed_password"] = get_password_hash(updated_user.password)
            
        await db.faculty.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": faculty_update},
            upsert=True  # Create if it didn't exist (e.g. role changed to Faculty)
        )
    elif existing.get("role") == "Faculty":
        # Role changed from Faculty to something else, remove from faculty collection
        await db.faculty.delete_one({"_id": ObjectId(user_id)})
    
    # Log activity
    # Identify changed fields
    changed = [k for k in update_doc if existing.get(k) != update_doc[k]]
    fields_str = f" ({', '.join(changed)})" if changed else ""
    
    await ActivityService.log_activity(
        action=f"Updated user profile: {updated_user.name}{fields_str}",
        user=user.get("name") or "Admin",
        type="info"
    )
    
    return {"message": "User updated successfully"}

@router.delete("/{user_id}", response_model=dict)
async def delete_user(
    user_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete a user (Admin only)
    """
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    # Check if user exists
    existing = await db.users.find_one({"_id": ObjectId(user_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Delete from main users collection
    await db.users.delete_one({"_id": ObjectId(user_id)})
    
    # If Faculty, also delete from faculty collection
    if existing.get("role") == "Faculty":
        await db.faculty.delete_one({"_id": ObjectId(user_id)})
        
    # Log activity
    await ActivityService.log_activity(
        action=f"Deleted user: {existing.get('name', 'Unknown')}",
        user=user.get("name") or "Admin",
        type="warning"
    )
        
    return {"message": "User deleted successfully"}

