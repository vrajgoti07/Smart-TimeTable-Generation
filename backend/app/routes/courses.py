from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_database
from app.models.course import CourseCreate, CourseResponse, FacultyAssignment
from app.core.security import get_current_user, require_role
from app.utils.faculty_matcher import get_auto_mapped_faculty, get_subject_key
from app.services.activity_service import ActivityService
from typing import List
from bson import ObjectId

router = APIRouter()

@router.get("/", response_model=List[CourseResponse])
async def get_courses(user: dict = Depends(get_current_user)):
    db = get_database()
    courses = await db.courses.find().to_list(1000)
    result = []
    for course in courses:
        doc = {**course, "id": str(course["_id"])}
        doc.pop("_id", None)
        # Normalize faculty: ensure each branch value is a proper dict
        faculty = doc.get("faculty", {})
        if isinstance(faculty, dict):
            normalized = {}
            for k, v in faculty.items():
                if isinstance(v, dict):
                    normalized[k] = {
                        "theory": v.get("theory", []) if isinstance(v.get("theory"), list) else [],
                        "practical": v.get("practical", []) if isinstance(v.get("practical"), list) else []
                    }
                elif isinstance(v, list) and k in ("theory", "practical"):
                    # Old flat format - migrate
                    branch = doc.get("branch", "CSE")
                    if branch not in normalized:
                        normalized[branch] = {"theory": [], "practical": []}
                    normalized[branch][k] = v
            doc["faculty"] = normalized
        result.append(doc)
    return result

from app.utils.email import send_course_assignment_email
 
async def notify_faculty_assignment(db, course_data: dict, old_faculty: dict = None):
    """
    Helper to send emails to newly assigned faculty across all branches
    """
    new_faculty_map = course_data.get("faculty", {})
    if not isinstance(new_faculty_map, dict):
        return  # Skip notification if faculty data is not in the expected format
    old_faculty_map = old_faculty if old_faculty and isinstance(old_faculty, dict) else {}
    
    # Iterate through each branch in the new map
    for branch_name, new_assignment in new_faculty_map.items():
        # Skip if the assignment value is not a dict (e.g. legacy list format)
        if not isinstance(new_assignment, dict):
            continue
        old_assignment = old_faculty_map.get(branch_name, {"theory": [], "practical": []})
        if not isinstance(old_assignment, dict):
            old_assignment = {"theory": [], "practical": []}
        
        new_theory = set(new_assignment.get("theory", []))
        new_practical = set(new_assignment.get("practical", []))
        
        old_theory = set(old_assignment.get("theory", []))
        old_practical = set(old_assignment.get("practical", []))
        
        # Identify newly added faculty
        added_theory = new_theory - old_theory
        added_practical = new_practical - old_practical
        
        notifications = []
        for name in added_theory:
            notifications.append((name, "Theory"))
        for name in added_practical:
            notifications.append((name, "Practical"))
            
        for name, l_type in notifications:
            faculty_doc = await db.faculty.find_one({"name": name})
            if faculty_doc and faculty_doc.get("email"):
                send_course_assignment_email(
                    to_email=faculty_doc["email"],
                    user_name=name,
                    course_name=course_data["name"],
                    course_code=course_data["code"],
                    lecture_type=f"{l_type} ({branch_name})"
                )

@router.post("/", response_model=CourseResponse)
async def create_course(
    course: CourseCreate, 
    user: dict = Depends(require_role(["Admin"]))
):
    db = get_database()
    

    course_dict = course.model_dump()
    
    # Check if code already exists
    existing = await db.courses.find_one({"code": course.code})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Course with code {course.code} already exists"
        )
        
    # Log activity
    await ActivityService.log_activity(
        action=f"Created course: {course.name} ({course.code})",
        user=user.get("name", "Admin"),
        type="success"
    )
    
    return {**course_dict, "id": str(result.inserted_id)}

@router.put("/{id}", response_model=CourseResponse)
async def update_course(
    id: str, 
    course: CourseCreate, 
    user: dict = Depends(require_role(["Admin"]))
):
    db = get_database()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid course ID")
        
    # Get old data for comparison
    old_course = await db.courses.find_one({"_id": ObjectId(id)})
    if not old_course:
        raise HTTPException(status_code=404, detail="Course not found")
        

    course_dict = course.model_dump()
    result = await db.courses.update_one(
        {"_id": ObjectId(id)},
        {"$set": course_dict}
    )
    
    # Identify changed fields
    changed = [k for k in course_dict if old_course.get(k) != course_dict[k]]
    fields_str = f" ({', '.join(changed)})" if changed else ""

    # Log activity
    await ActivityService.log_activity(
        action=f"Updated course: {course.name}{fields_str}",
        user=user.get("name", "Admin"),
        type="info"
    )
    
    return {**course_dict, "id": id}

@router.delete("/{id}")
async def delete_course(
    id: str, 
    user: dict = Depends(require_role(["Admin"]))
):
    db = get_database()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid course ID")
        
    # Log activity
    await ActivityService.log_activity(
        action=f"Deleted course ID: {id}",
        user=user.get("name", "Admin"),
        type="warning"
    )
    
    return {"message": "Course deleted successfully"}

@router.post("/auto-assign", response_model=List[CourseResponse])
async def auto_assign_faculty(
    user: dict = Depends(require_role(["Admin"]))
):
    """
    Automatically assign faculty to all courses without assignments.
    Uses intelligent keyword matching with balanced fallback.
    """
    db = get_database()
    courses = await db.courses.find().to_list(1000)
    faculty_list = await db.faculty.find().to_list(1000)
    
    if not faculty_list:
        return [{**c, "id": str(c["_id"])} for c in courses]

    # Track usage for balancing
    usage = {f["name"]: 0 for f in faculty_list}
    # Track which faculty are assigned to which subject name for diversity
    branch_assignments = {}

    for c in courses:
        f_data = c.get("faculty", {})
        if isinstance(f_data, dict):
            # Collect all faculty names from both flat and branch-keyed formats
            all_names = []
            for key, val in f_data.items():
                if key in ["theory", "practical"] and isinstance(val, list):
                    # Flat format: {"theory": [...], "practical": [...]}
                    all_names.extend(val)
                elif isinstance(val, dict):
                    # Branch-keyed format: {"CSE": {"theory": [...], "practical": [...]}}
                    for t in ["theory", "practical"]:
                        if isinstance(val.get(t), list):
                            all_names.extend(val[t])
            for name in all_names:
                if name in usage:
                    usage[name] += 1
                    f_doc = next((f for f in faculty_list if f["name"] == name), None)
                    if f_doc:
                        name_key = get_subject_key(c.get("name", ""))
                        if name_key not in branch_assignments:
                            branch_assignments[name_key] = []
                        f_id = str(f_doc.get("_id") or f_doc.get("id"))
                        if f_id not in branch_assignments[name_key]:
                            branch_assignments[name_key].append(f_id)

    updated_courses = []
    
    from app.utils.faculty_matcher import normalize, get_normalized_keywords

    for course in courses:
        fac_map = course.get("faculty", {})
        if not isinstance(fac_map, dict): fac_map = {}
        
        # Determine all branches this course applies to
        target_branches = [course.get("branch")] if course.get("type") != "COMMON" else course.get("branches", [])
        if not target_branches: target_branches = [course.get("branch", "CSE")]
        
        dirty = False
        course_name = course.get("name", "")
        subj_key = get_subject_key(course_name)
        c_name_norm = normalize(course_name)
        c_keywords = get_normalized_keywords(course_name)
        
        for br in target_branches:
            if br not in fac_map:
                fac_map[br] = {"theory": [], "practical": []}
            
            assignment = fac_map[br]
            
            # 1. Check Theory
            current_theory = assignment.get("theory", [])
            is_expert_t = False
            if current_theory:
                fac_name = current_theory[0]
                fac_doc = next((f for f in faculty_list if f["name"] == fac_name), None)
                if fac_doc:
                    exp = [normalize(e) for e in (fac_doc.get("expertise") or [])]
                    if c_name_norm in exp or any(kw in exp for kw in c_keywords):
                        is_expert_t = True
            
            if (not current_theory or not is_expert_t) and course.get("theory_credit", 0) > 0:
                # Distribution Rule: Only exclude those teaching this same subject in ANOTHER branch
                assigned_to_subject = branch_assignments.get(subj_key, [])
                # We need to knows WHO is teaching in which branch to be precise, 
                # but for now, we'll exclude all who were already picked for this subject
                # EXCEPT the one we are about to pick for this branch if we are re-evaluating.
                exclude_ids = [fid for fid in assigned_to_subject]
                
                matches = get_auto_mapped_faculty(course, faculty_list, "theory", exclude_ids=exclude_ids, current_branch=br)
                if matches:
                    chosen = min(matches, key=lambda f: usage.get(f["name"], 0))
                    assignment["theory"] = [chosen["name"]]
                    usage[chosen["name"]] += 1
                    
                    if subj_key not in branch_assignments: branch_assignments[subj_key] = []
                    f_id = str(chosen.get("_id") or chosen.get("id"))
                    if f_id not in branch_assignments[subj_key]: branch_assignments[subj_key].append(f_id)
                    dirty = True
            
            # 2. Check Practical
            current_pract = assignment.get("practical", [])
            is_expert_p = False
            theory_fac_id = None
            if assignment.get("theory"):
                t_fac_name = assignment["theory"][0]
                t_fac_doc = next((f for f in faculty_list if f["name"] == t_fac_name), None)
                if t_fac_doc:
                    theory_fac_id = str(t_fac_doc.get("_id") or t_fac_doc.get("id"))

            if current_pract:
                fac_name = current_pract[0]
                fac_doc = next((f for f in faculty_list if f["name"] == fac_name), None)
                if fac_doc:
                    exp = [normalize(e) for e in (fac_doc.get("expertise") or [])]
                    if c_name_norm in exp or any(kw in exp for kw in c_keywords):
                        is_expert_p = True

            if (not current_pract or not is_expert_p) and course.get("practical_credit", 0) > 0:
                assigned_to_subject = branch_assignments.get(subj_key, [])
                # IMPORTANT: For Practical, we ONLY exclude people teaching in OTHER branches.
                # If the Theory teacher (theory_fac_id) is in the list, we REMOVE them from exclusion
                # so they can teach their own lab!
                exclude_ids = [fid for fid in assigned_to_subject if fid != theory_fac_id]
                
                matches = get_auto_mapped_faculty(course, faculty_list, "practical", exclude_ids=exclude_ids, current_branch=br)
                if matches:
                    # Preference: Same as theory if they match
                    theory_names = assignment.get("theory", [])
                    chosen_for_theory = next((f for f in matches if f["name"] in theory_names), None)
                    
                    chosen = chosen_for_theory if chosen_for_theory else min(matches, key=lambda f: usage.get(f["name"], 0))
                        
                    assignment["practical"] = [chosen["name"]]
                    usage[chosen["name"]] += 1
                    
                    if subj_key not in branch_assignments: branch_assignments[subj_key] = []
                    f_id = str(chosen.get("_id") or chosen.get("id"))
                    if f_id not in branch_assignments[subj_key]: branch_assignments[subj_key].append(f_id)
                    dirty = True

        if dirty:
            await db.courses.update_one(
                {"_id": course["_id"]},
                {"$set": {"faculty": fac_map}}
            )
            course["faculty"] = fac_map
            # Notifications handled as batch or individually; here individually for simplicity
            await notify_faculty_assignment(db, course)
            
        doc = {**course, "id": str(course["_id"])}
        doc.pop("_id", None)
        updated_courses.append(doc)
        
    # Log activity
    await ActivityService.log_activity(
        action="Auto-assigned faculty to courses",
        user=user.get("name", "Admin"),
        type="success"
    )
    
    return updated_courses
