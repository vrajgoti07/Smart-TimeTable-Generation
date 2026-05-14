from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user, require_role
from app.database import get_database
from typing import Dict
import os
from app.services.monitoring_service import MonitoringService
from app.services.activity_service import ActivityService

router = APIRouter()

@router.get("/dashboard-data")
async def get_admin_dashboard(user: dict = Depends(get_current_user)):
    """
    Get admin dashboard statistics and data
    """
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    # Count statistics
    total_users = await db.users.count_documents({})
    total_courses = await db.courses.count_documents({})
    total_rooms = await db.rooms.count_documents({})
    total_schedules = await db.timetable.count_documents({})
    total_faculty = await db.faculty.count_documents({})
    
    # Role breakdown
    admin_count = await db.users.count_documents({"role": "Admin"})
    student_count = await db.users.count_documents({"role": "Student"})
    
    # System Metrics
    system_status = await MonitoringService.get_system_metrics()
    
    # Trigger a snapshot for history (Background)
    # Note: In a real app, this would be a separate background task
    await MonitoringService.save_metric_snapshot()
    
    # Recent Activities
    recent_activities = await ActivityService.get_recent_activities(limit=5)
    
    # Fallback to demo data if no real activities yet
    if not recent_activities:
        recent_activities = [
            {"action": "System monitoring initialized", "user": "System", "time": "Just now", "type": "info"},
            {"action": "Dashboard connected to live data", "user": "System", "time": "Recently", "type": "success"}
        ]
    
    return {
        "stats": {
            "totalUsers": total_users,
            "totalCourses": total_courses,
            "totalRooms": total_rooms,
            "totalSchedules": total_schedules,
            "adminCount": admin_count,
            "facultyCount": total_faculty,
            "studentCount": student_count
        },
        "systemStatus": system_status,
        "recentActivities": recent_activities
    }

@router.get("/metrics-history")
async def get_metrics_history(limit: int = 60, user: dict = Depends(get_current_user)):
    """
    Get historical system metrics
    """
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return await MonitoringService.get_metrics_history(limit=limit)

from app.models.user import UserInvite
from app.utils.email import send_invite_email
import secrets
from datetime import datetime, timedelta

@router.post("/create-user")
async def create_user(
    new_user: UserInvite,
    user: dict = Depends(get_current_user)
):
    """
    Invite a new user (Admin only)
    Generates an invite token and sends an email
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
    
    # Generate invite token
    invite_token = secrets.token_urlsafe(32)
    
    # Create avatar from name
    avatar = ''.join([word[0].upper() for word in new_user.name.split()[:2]])
    
    # Prepare user document WITHOUT password
    user_doc = {
        "email": new_user.email,
        "role": new_user.role,
        "name": new_user.name,
        "avatar": avatar,
        "is_active": True,
        "is_verified": False,
        "invite_token": invite_token,
        "created_at": datetime.utcnow()
    }
    
    # Add optional fields
    if new_user.department:
        user_doc["department"] = new_user.department
    if new_user.studentId:
        user_doc["studentId"] = new_user.studentId
    if new_user.semester:
        try:
            user_doc["semester"] = int(new_user.semester)
        except (ValueError, TypeError):
            user_doc["semester"] = None
    
    # Insert into users collection (Main user list)
    result = await db.users.insert_one(user_doc)
    user_id = result.inserted_id
    
    # If Faculty, also mirror to faculty collection for scheduling
    if new_user.role == "Faculty":
        faculty_doc = {
            "_id": user_id,  # Use same ID for consistency
            "email": new_user.email,
            "name": new_user.name,
            "department": new_user.department or "General",
            "workingHours": user_doc.get("workingHours", 15),
            "availability": user_doc.get("availability", {}),
            "subjects_can_teach": user_doc.get("subjects_can_teach", []),
            "max_weekly_load": user_doc.get("max_weekly_load", 20),
            "current_load": user_doc.get("current_load", 0),
            "available_slots": user_doc.get("available_slots", 0),
            "invite_token": invite_token,
            "is_verified": False,
            "created_at": user_doc["created_at"]
        }
        await db.faculty.insert_one(faculty_doc)
    
    # Send invite email
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    invite_link = f"{frontend_url}/set-password?token={invite_token}"
    email_sent = send_invite_email(
        to_email=new_user.email,
        user_name=new_user.name,
        invite_token=invite_token
    )
    
    # If email not configured, print to console
    if not email_sent:
        print(f"\n📨 [SIMULATED EMAIL] to {new_user.email}")
        print(f"🔗 Invite Link: {invite_link}\n")
    
    # Log activity
    await ActivityService.log_activity(
        action=f"Invited new user: {new_user.name} ({new_user.role})",
        user=user.get("name", "Admin"),
        type="success"
    )
    
    return {
        "id": str(result.inserted_id),
        "message": "Invite email sent successfully",
        "email": new_user.email,
        "invite_link": invite_link  # Returning for easy testing
    }

