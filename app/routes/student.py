from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.database import get_database

from app.services.activity_service import ActivityService

router = APIRouter()

from fastapi import APIRouter, Depends, HTTPException, Response
from app.core.security import get_current_user
from app.database import get_database
from app.utils.pdf_generator import generate_timetable_pdf
from io import BytesIO
import datetime

# ReportLab Imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

router = APIRouter()

@router.get("/dashboard-data")
async def get_student_dashboard(user: dict = Depends(get_current_user)):
    # ... (existing dashboard-data implementation remains same)
    if user.get("role") != "Student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    db = get_database()
    user_doc = await db.users.find_one({"email": user["sub"]})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    semester = user_doc.get("semester", 4)
    # Be more robust about where the branch name is stored
    branch_name = user_doc.get("department") or user_doc.get("department_id") or user_doc.get("branch") or "AI&ML"
    
    # Query schedule from timetable collection (uses department_id)
    schedule = await db.timetable.find({
        "semester": semester, 
        "department_id": branch_name
    }).to_list(length=100)
    
    # Query courses (uses branch and branches for COMMON)
    courses_query = {
        "semester": semester,
        "$or": [
            {"branch": branch_name},
            {"type": "COMMON", "branches": branch_name}
        ]
    }
    courses = await db.courses.find(courses_query).to_list(length=50)
    
    total_courses = len(courses)
    weekly_hours = 0
    for entry in schedule:
        try:
            start = datetime.datetime.strptime(entry["start_time"], "%H:%M")
            end = datetime.datetime.strptime(entry["end_time"], "%H:%M")
            delta = end - start
            weekly_hours += delta.total_seconds() / 3600
        except:
            weekly_hours += 1
            
    today_day = datetime.datetime.now().strftime("%A")
    today_schedule = [
        {
            "id": str(entry["_id"]),
            "time": entry["start_time"],
            "subject": entry["course_name"],
            "room": entry["room_name"],
            "professor": entry["faculty_name"],
            "status": "upcoming"
        } for entry in schedule if entry.get("day_of_week") == today_day
    ]
    
    course_faculty_map = {} # {course_id: {"theory": set(), "practical": set()}}
    for entry in schedule:
        c_id = str(entry.get("course_id", ""))
        c_name = entry.get("course_name", "")
        f_name = entry.get("faculty_name", "")
        e_type = entry.get("type", "Theory") # "Theory" or "Practical"
        
        # Don't add 'Free' or 'Unknown' as faculty
        if not f_name or f_name.lower() in ("free", "unknown", "none"):
            continue
            
        key = c_id if c_id else c_name
        if key not in course_faculty_map:
            course_faculty_map[key] = {"theory": set(), "practical": set()}
        
        if e_type == "Practical":
            course_faculty_map[key]["practical"].add(f_name)
        else:
            course_faculty_map[key]["theory"].add(f_name)

    formatted_courses = []
    for c in courses:
        c_id = str(c["_id"])
        c_name = c["name"]
        
        # Look up by ID first, then Name
        fac_data = course_faculty_map.get(c_id) or course_faculty_map.get(c_name) or {"theory": set(), "practical": set()}
        
        formatted_courses.append({
            "id": c_id,
            "name": c_name,
            "code": c.get("code", ""),
            "credits": c.get("credits", 4),
            "department": c.get("branch", branch_name),
            "faculty": {
                "theory": list(fac_data["theory"]),
                "practical": list(fac_data["practical"])
            }
        })
    
    return {
        "stats": {
            "totalCourses": len(courses),
            "weeklyHours": round(weekly_hours, 1),
            "semester": semester,
            "attendance": 92,
            "studentId": user_doc.get("studentId") or user_doc.get("student_id") or ""
        },
        "profile": {
            "name": user_doc.get("name"),
            "email": user_doc.get("email"),
            "studentId": user_doc.get("studentId") or user_doc.get("student_id") or "",
            "phone": user_doc.get("phone", ""),
            "department": branch_name,
            "semester": semester
        },
        "todaySchedule": sorted(today_schedule, key=lambda x: x["time"]),
        "courses": formatted_courses,
        "semester": semester
    }

@router.put("/update-profile")
async def update_student_profile(request: dict = None, user: dict = Depends(get_current_user)):
    """Update student profile fields (phone, address, dob, guardian info)."""
    if user.get("role") != "Student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    from fastapi import Request
    db = get_database()
    
    # Only allow updating specific fields
    allowed_fields = {
        "phone": "phone",
        "address": "address",
        "dob": "dob",
        "guardianName": "guardian_name",
        "guardianContact": "guardian_contact",
    }
    
    update_data = {}
    if request:
        for frontend_key, db_key in allowed_fields.items():
            if frontend_key in request:
                update_data[db_key] = request[frontend_key]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_result = await db.users.update_one(
        {"email": user["sub"]},
        {"$set": update_data}
    )
    
    # Log activity for Admin
    if update_result.modified_count > 0:
        fields_str = ", ".join(update_data.keys())
        # Better user identification for logs
        student_id = user.get("studentId") or ""
        id_suffix = f" ({student_id})" if student_id else ""
        
        await ActivityService.log_activity(
            action=f"Student updated profile fields: {fields_str}",
            user=f"{user.get('name') or user.get('sub')}{id_suffix}",
            type="info"
        )
    
    return {"message": "Profile updated successfully"}

@router.get("/download-timetable-pdf")
async def download_timetable_pdf(user: dict = Depends(get_current_user)):
    """
    Generate and download an official university-style GRID-based PDF timetable.
    """
    if user.get("role") != "Student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    db = get_database()
    user_doc = await db.users.find_one({"email": user["sub"]})
    
    # FORCE SEMESTER = 4 and Academic Year
    semester = 4
    academic_year = "2025-26"
    department_id = user_doc.get("department_id", "AI&ML")
    student_name = user_doc["name"]
    
    # Fetch real data for grid
    schedule_data = await db.timetable.find({"semester": semester, "department_id": department_id}).to_list(length=100)
    
    # Fetch course details for Subject Mapping
    courses_doc = await db.courses.find({"semester": semester, "department_id": department_id}).to_list(length=50)
    
    # Use central PDF generator
    pdf_content = generate_timetable_pdf(
        schedule_data=schedule_data,
        courses_doc=courses_doc,
        department_id=department_id,
        semester=semester,
        label=f"Student Name: {student_name}",
        academic_year="2025-26"
    )
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=timetable_semester_{semester}.pdf"
        }
    )
