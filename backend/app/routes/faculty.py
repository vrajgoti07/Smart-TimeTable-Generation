from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, require_role
from pydantic import BaseModel
from app.database import get_database
from app.models.faculty import FacultyCreate, FacultyResponse
from typing import List
from bson import ObjectId
from app.services.activity_service import ActivityService
from fastapi import Response
from io import BytesIO
import datetime

# ReportLab Imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

router = APIRouter()

@router.get("/", response_model=List[FacultyResponse])
async def get_all_faculty(user: dict = Depends(get_current_user)):
    db = get_database()
    faculty_list = await db.faculty.find().to_list(1000)
    return [
        {**f, "id": str(f["_id"])} 
        for f in faculty_list
    ]

@router.post("/", response_model=FacultyResponse)
async def create_faculty(
    faculty: FacultyCreate, 
    user: dict = Depends(require_role(["Admin"]))
):
    db = get_database()
    
    # Check if email already exists
    existing = await db.faculty.find_one({"email": faculty.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Faculty with email {faculty.email} already exists"
        )
        
    faculty_dict = faculty.model_dump()
    result = await db.faculty.insert_one(faculty_dict)

    # Log activity
    await ActivityService.log_activity(
        action=f"Added faculty member: {faculty.name}",
        user=user.get("name", "Admin"),
        type="success"
    )
    return {**faculty_dict, "id": str(result.inserted_id)}

@router.put("/{id}", response_model=FacultyResponse)
async def update_faculty(
    id: str, 
    faculty: FacultyCreate, 
    user: dict = Depends(require_role(["Admin"]))
):
    db = get_database()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid faculty ID")
        
    result = await db.faculty.update_one(
        {"_id": ObjectId(id)},
        {"$set": faculty.model_dump()}
    )
    
    # Log activity
    await ActivityService.log_activity(
        action=f"Updated faculty details: {faculty.name}",
        user=user.get("name", "Admin"),
        type="info"
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Faculty not found")
        
    return {**faculty.model_dump(), "id": id}

@router.delete("/{id}")
async def delete_faculty(
    id: str, 
    user: dict = Depends(require_role(["Admin"]))
):
    db = get_database()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid faculty ID")
        
    result = await db.faculty.delete_one({"_id": ObjectId(id)})

    # Log activity
    await ActivityService.log_activity(
        action=f"Deleted faculty member ID: {id}",
        user=user.get("name", "Admin"),
        type="warning"
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Faculty not found")
        
    return {"message": "Faculty deleted successfully"}

@router.get("/dashboard-data")
async def get_faculty_dashboard(user: dict = Depends(get_current_user)):
    """
    Get faculty dashboard data including schedule, courses, and statistics.
    Returns real-time data based on the logged-in faculty member.
    """
    if user.get("role") != "Faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    db = get_database()
    
    # Get user details from faculty collection
    user_doc = await db.faculty.find_one({"email": user["sub"]})
    if not user_doc:
        # Fallback to users collection for legacy support
        user_doc = await db.users.find_one({"email": user["sub"]})
        
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    faculty_name = user_doc["name"]
    
    # Get FULL faculty schedule (all days)
    schedule = await db.timetable.find({"faculty_name": faculty_name}).to_list(length=500)
    
    # Serialize ObjectId for JSON
    for entry in schedule:
        entry["id"] = str(entry.pop("_id"))
    
    # Calculate stats
    total_classes = len(schedule)
    weekly_hours = total_classes  # 1 slot = 1 hour
    
    # Get assigned courses - support both flat and branch-specific formats
    all_courses = await db.courses.find().to_list(length=200)
    courses = []
    for c in all_courses:
        fac_data = c.get("faculty", {})
        is_assigned = False
        
        if isinstance(fac_data, dict):
            # Check flat format (legacy)
            if faculty_name in fac_data.get("theory", []) or faculty_name in fac_data.get("practical", []):
                is_assigned = True
            else:
                # Check branch-specific format: {"CSE": {"theory": [...], "practical": [...]}}
                for branch_data in fac_data.values():
                    if isinstance(branch_data, dict):
                        if faculty_name in branch_data.get("theory", []) or \
                           faculty_name in branch_data.get("practical", []):
                            is_assigned = True
                            break
        
        if is_assigned:
            c["id"] = str(c.pop("_id"))
            courses.append(c)
    
    # Count students: count users whose semester/section match the timetable entries
    student_sections = set()
    for entry in schedule:
        sem = entry.get("semester")
        sec = entry.get("section")
        dept = entry.get("department_id")
        if sem:
            student_sections.add((dept, sem, sec))
    
    total_students = 0
    for dept, sem, sec in student_sections:
        q = {"role": "Student", "semester": sem}
        if sec:
            q["section"] = sec
        if dept:
            q["department_id"] = dept
        count = await db.users.count_documents(q)
        total_students += count
    
    # If no students found via sections, estimate from courses
    if total_students == 0 and len(courses) > 0:
        total_students = await db.users.count_documents({"role": "Student"})
    
    # Today's schedule based on real current day
    from datetime import datetime, timezone, timedelta
    ist = timezone(timedelta(hours=5, minutes=30))
    today = datetime.now(ist).strftime("%A")
    
    today_schedule = sorted(
        [entry for entry in schedule if (entry.get("day") or entry.get("day_of_week", "")).lower() == today.lower()],
        key=lambda e: e.get("time") or e.get("start_time") or ""
    )
    
    return {
        "facultyName": faculty_name,
        "department": user_doc.get("department", ""),
        "maxHours": user_doc.get("max_hours", 15),
        "availability": user_doc.get("availability", {}),
        "expertise": user_doc.get("expertise", []),
        "stats": {
            "totalClasses": total_classes,
            "weeklyHours": weekly_hours,
            "totalStudents": total_students,
            "totalCourses": len(courses)
        },
        "todaySchedule": today_schedule,
        "fullSchedule": schedule,
        "courses": courses
    }

class AvailabilityUpdate(BaseModel):
    availability: Dict[str, List[str]]

@router.put("/me/availability")
async def update_my_availability(
    data: AvailabilityUpdate,
    user: dict = Depends(get_current_user)
):
    if user.get("role") != "Faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    db = get_database()
    
    fac_result = await db.faculty.update_one(
        {"email": user["sub"]},
        {"$set": {"availability": data.availability}}
    )
    
    user_result = await db.users.update_one(
        {"email": user["sub"]},
        {"$set": {"availability": data.availability}}
    )
    
    if fac_result.matched_count == 0 and user_result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    await ActivityService.log_activity(
        action="Updated their availability schedule",
        user=user.get("name", "Faculty"),
        type="info"
    )
    
    return {"message": "Availability updated successfully"}

@router.get("/download-timetable-pdf")
async def download_faculty_timetable_pdf(user: dict = Depends(get_current_user)):
    """
    Generate and download an official university-style GRID-based PDF timetable for faculty.
    """
    if user.get("role") != "Faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    db = get_database()
    # Get user details from faculty collection or users collection
    user_doc = await db.faculty.find_one({"email": user["sub"]})
    if not user_doc:
        user_doc = await db.users.find_one({"email": user["sub"]})
        
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
        
    faculty_name = user_doc["name"]
    academic_year = "2025-26"
    
    # Fetch real data for grid
    schedule_data = await db.timetable.find({"faculty_name": faculty_name}).to_list(length=500)
    
    # Fetch course details for Subject Mapping
    courses_doc = await db.courses.find({
        "$or": [
            {"faculty.theory": faculty_name},
            {"faculty.practical": faculty_name}
        ]
    }).to_list(length=50)
    course_map = {c["name"]: {"code": c.get("code", c["name"][:4].upper()), "full_name": c["name"]} for c in courses_doc}

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), topMargin=0.3*inch, bottomMargin=0.3*inch)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, textColor=colors.black, alignment=1, spaceAfter=5)
    info_style = ParagraphStyle('InfoStyle', parent=styles['Normal'], fontSize=10, textColor=colors.black, alignment=1, spaceAfter=2)
    
    # 1. HEADER
    elements.append(Paragraph("CHRONOS SMART SCHEDULE - FACULTY COPY", title_style))
    elements.append(Paragraph(f"Faculty Name: {faculty_name}  |  Academic Year: {academic_year}", info_style))
    elements.append(Paragraph(f"Generated on: {datetime.datetime.now().strftime('%d-%m-%Y %H:%M')}", info_style))
    elements.append(Spacer(1, 0.2*inch))

    # 2. DATA MATRIX PREPARATION
    days_full = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    days_short = ["MON", "TUE", "WED", "THU", "FRI"]
    slots = [
        ("09:10", "10:10"),
        ("10:10", "11:10"),
        ("11:10", "12:10"), # BREAK
        ("12:10", "13:10"),
        ("13:10", "14:10"),
        ("14:10", "14:20"), # SHORT BREAK
        ("14:20", "15:20"),
        ("15:20", "16:20")
    ]
    
    header = ["HRS"] + days_short
    table_data = [header]
    
    bg_colors = []
    spans = []

    C_GRID_HEADER = colors.HexColor("#f1f5f9")
    C_BREAK_BG = colors.HexColor("#f8fafc")
    C_FREE_TEXT = colors.HexColor("#94a3b8")
    
    free_style = ParagraphStyle('FreeStyle', parent=styles['Normal'], fontSize=8, textColor=C_FREE_TEXT, alignment=1)
    cell_style = ParagraphStyle('CellStyle', parent=styles['Normal'], fontSize=8, alignment=1, leading=10)

    subjects_in_use = set()

    for r_idx, (start, end) in enumerate(slots, 1):
        row = [f"{start}\n-\n{end}"]
        
        if start == "11:10":
            row += ["BREAK"] * 5
            bg_colors.append(('BACKGROUND', (1, r_idx), (5, r_idx), C_BREAK_BG))
            spans.append(('SPAN', (1, r_idx), (5, r_idx)))
        elif start == "14:10":
            row += ["SHORT BREAK"] * 5
            bg_colors.append(('BACKGROUND', (1, r_idx), (5, r_idx), C_BREAK_BG))
            spans.append(('SPAN', (1, r_idx), (5, r_idx)))
        else:
            for c_idx, day in enumerate(days_full, 1):
                matching = [e for e in schedule_data if 
                           (e.get("day") or e.get("day_of_week", "")).lower() == day.lower() and 
                           (e.get("time") or e.get("start_time", "")).lstrip('0') == start.lstrip('0')]
                if matching:
                    entry = matching[0]
                    subj_name = entry.get('course_name') or entry.get('subject', 'Unknown')
                    subjects_in_use.add(subj_name)
                    code = course_map.get(subj_name, {}).get("code", subj_name[:4].upper())
                    room = entry.get('room_name') or entry.get('room', 'N/A')
                    section = f"{entry.get('department_id', '')} {entry.get('semester', '')}-{entry.get('section', '')}"
                    
                    content = f"<b>{code}</b><br/>{room}<br/>{section}"
                    row.append(Paragraph(content, cell_style))
                else:
                    row.append(Paragraph("FREE", free_style))
        table_data.append(row)

    # 3. TABLE STYLING
    col_widths = [0.9*inch] + [1.6*inch] * 5
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    t_style = [
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
        ('BACKGROUND', (0,0), (-1,0), C_GRID_HEADER),
        ('BACKGROUND', (0,0), (0,-1), C_GRID_HEADER),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
    ]
    t_style.extend(bg_colors)
    t_style.extend(spans)
    t.setStyle(TableStyle(t_style))
    elements.append(t)

    # 4. SUBJECT MAPPING SECTION
    elements.append(PageBreak())
    if subjects_in_use:
        # Title with more space
        elements.append(Paragraph("<b>Course Details</b>", ParagraphStyle('Sub', parent=styles['Normal'], fontSize=14, alignment=0, spaceAfter=10)))
        elements.append(Spacer(1, 0.1*inch))
        
        mapping_data = [["Code", "Course Name", "Type"]]
        for subj in sorted(list(subjects_in_use)):
            code = course_map.get(subj, {}).get("code", subj[:4].upper())
            mapping_data.append([code, subj, "Lecture/Lab"])
        
        m_table = Table(mapping_data, colWidths=[1.5*inch, 4.5*inch, 2.5*inch], repeatRows=1)
        m_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('BACKGROUND', (0,0), (-1,0), C_GRID_HEADER),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(m_table)

    # 5. FOOTER & SIGNATURES
    elements.append(Spacer(1, 0.8*inch))
    sig_data = [
        ["________________________", "________________________"], 
        ["HOD Signature", "Principal Signature"]
    ]
    sig_table = Table(sig_data, colWidths=[4.25*inch, 4.25*inch])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('ALIGN', (1,0), (1,-1), 'CENTER'),
        ('FONTNAME', (0,1), (-1,1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,1), 11),
        ('TOPPADDING', (0,1), (-1,1), 5),
    ]))
    elements.append(sig_table)

    elements.append(Spacer(1, 0.3*inch))
    footer_text = f"<i>Generated by Chronos Smart Schedule System on {datetime.datetime.now().strftime('%d-%m-%Y %H:%M:%S')}</i>"
    elements.append(Paragraph(footer_text, ParagraphStyle('F', fontSize=8, alignment=1, textColor=colors.grey)))

    doc.build(elements)
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Log activity for Admin
    await ActivityService.log_activity(
        action="Downloaded their timetable PDF",
        user=faculty_name,
        type="info"
    )
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=faculty_timetable_{faculty_name.replace(' ', '_')}.pdf"
        }
    )

