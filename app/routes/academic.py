from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user
from app.database import get_database
from app.models.academic import Department
from typing import List

router = APIRouter()

@router.get("/departments", response_model=List[Department])
async def get_departments(user: dict = Depends(get_current_user)):
    db = get_database()
    depts = await db.departments.find().to_list(length=100)
    return depts

@router.post("/departments", response_model=Department)
async def create_department(dept: Department, user: dict = Depends(get_current_user)):
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    db = get_database()
    dept_dict = dept.dict(by_alias=True, exclude={"id"})
    result = await db.departments.insert_one(dept_dict)
    
    # Log activity
    from app.services.activity_service import ActivityService
    await ActivityService.log_activity(
        action=f"Created department: {dept.name}",
        user=user.get("name", "Admin"),
        type="success"
    )
    
    dept_dict["_id"] = result.inserted_id
    return dept_dict
