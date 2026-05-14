from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.security import get_current_user
from app.database import get_database
from app.models.timetable import TimetableCreate, TimetableResponse, TimetableGenerateRequest
from typing import List, Optional
from bson import ObjectId
from app.utils.timetable_email import send_timetable_emails_task
from app.services.notification_service import NotificationService
from app.services.activity_service import ActivityService
from fastapi import Response
from app.utils.pdf_generator import generate_timetable_pdf

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_timetable(
    department_id: Optional[str] = None,
    branch: Optional[str] = None,
    semester: Optional[str] = None,
    section: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """
    Get timetable entries with optional filtering by department, semester, and section.
    """
    db = get_database()
    query = {}
    
    dept_id = branch if branch else department_id
    
    if dept_id and dept_id != "All":
        query["department_id"] = dept_id
    if semester and semester != "All":
        try:
            query["semester"] = int(semester)
        except: pass
    if section and section != "All":
        query["section"] = section

    if user["role"] == "Admin":
        entries = await db.timetable.find(query).to_list(length=1000)
    
    elif user["role"] == "Faculty":
        user_doc = await db.users.find_one({"email": user["sub"]})
        faculty_name = user_doc["name"]
        query["faculty_name"] = faculty_name
        entries = await db.timetable.find(query).to_list(length=500)
    
    elif user["role"] == "Student":
        user_doc = await db.users.find_one({"email": user["sub"]})
        semester = user_doc.get("semester", 1)
        department = user_doc.get("branch", user_doc.get("department", user_doc.get("department_id")))
        query["semester"] = semester
        if department:
            query["department_id"] = department
        entries = await db.timetable.find(query).to_list(length=500)
    
    else:
        raise HTTPException(status_code=403, detail="Invalid role")
    
    for entry in entries:
        entry["id"] = str(entry.pop("_id"))
    
    return entries

@router.post("/generate")
async def generate_timetable(
    request: TimetableGenerateRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Generate a new timetable using the constraint-based engine (Admin only)
    """
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Extract values safely from request body
    department_id = request.department_id
    branch = request.branch
    semester = request.semester
    section = request.section
    constraints = request.constraints

    from app.services.timetable_service import TimetableService
    from app.core.exceptions import SchedulingError
    
    service = TimetableService()
    try:
        # Pass values to service. Note: branch is often used in place of department_id in this logic
        result = await service.generate_timetable(
            department_id=department_id, 
            semester=semester, 
            section=section, 
            branch=branch, 
            constraints=constraints
        )
        
        # Notify Admin
        db = get_database()
        user_doc = await db.users.find_one({"email": user["sub"]})
        if user_doc and result.get("status") == "success":
            await NotificationService.create_notification(
                user_id=str(user_doc["_id"]),
                title="Generation Complete",
                message=f"Timetable for {branch or department_id} S{semester} generated successfully.",
                type="success"
            )
        
        # Log activity
        if result.get("status") == "success":
            await ActivityService.log_activity(
                action=f"Generated timetable for {branch or department_id} S{semester}",
                user=user.get("name", "Admin"),
                type="success"
            )
        else:
            await ActivityService.log_activity(
                action=f"Failed to generate timetable for {branch or department_id} S{semester}",
                user=user.get("name", "Admin"),
                type="error"
            )
        
        # If generation was successful and target is specific, send emails
        dept_id = branch if branch else department_id
        if result.get("status") == "success" and result.get("entries_count", 0) > 0:
            if dept_id and semester:
                background_tasks.add_task(send_timetable_emails_task, dept_id, semester)
                
        return result
    except SchedulingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import logging
        import traceback
        logging.getLogger(__name__).error(f"Unexpected scheduling error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during scheduling")

@router.post("/send-email")
async def send_timetable_email(
    background_tasks: BackgroundTasks,
    department_id: Optional[str] = None,
    branch: Optional[str] = None,
    semester: Optional[int] = None,
    user: dict = Depends(get_current_user)
):
    """
    Safely trigger timetable email delivery. Fails gracefully.
    """
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    dept_id = branch if branch else department_id
    if not dept_id or not semester:
        raise HTTPException(status_code=400, detail="Branch and semester are required for email dispatch")
        
    try:
        background_tasks.add_task(send_timetable_emails_task, dept_id, semester)
        import logging
        logging.getLogger(__name__).info(f"Queued timetable email delivery for {dept_id} Sem {semester}")
        return {"status": "success", "message": f"Email dispatch queued for {dept_id} Sem {semester}"}
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to queue emails safely: {e}")
        return {"status": "warning", "message": "Failed to dispatch emails safely."}

@router.get("/download-pdf")
async def download_timetable_pdf(
    department_id: Optional[str] = None,
    branch: Optional[str] = None,
    semester: Optional[str] = None,
    section: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """
    Generate and download an official university-style GRID-based PDF timetable for Admin.
    """
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_database()
    query = {}
    
    dept_id = branch if branch and branch != "All" else department_id if department_id and department_id != "All" else None
    
    if dept_id:
        query["department_id"] = dept_id
    if semester and semester != "All":
        try:
            query["semester"] = int(semester)
        except: pass
    if section and section != "All":
        query["section"] = section

    schedule_data = await db.timetable.find(query).to_list(length=1000)
    
    courses_query = {}
    if dept_id:
        courses_query["department_id"] = dept_id
    if "semester" in query:
        courses_query["semester"] = query["semester"]

    courses_doc = await db.courses.find(courses_query).to_list(length=100)

    # Use central PDF generator
    pdf_content = generate_timetable_pdf(
        schedule_data=schedule_data,
        courses_doc=courses_doc,
        department_id=dept_id or "All",
        semester=int(semester) if semester and semester != "All" else "All",
        label=f"Section: {section}" if section and section != "All" else "All Sections",
        academic_year="2025-26"
    )
    
    filename_parts = ["timetable"]
    if dept_id: filename_parts.append(dept_id)
    if semester and semester != "All": filename_parts.append(f"sem{semester}")
    if section and section != "All": filename_parts.append(f"sec{section}")
    filename = "_".join(filename_parts) + ".pdf"
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
