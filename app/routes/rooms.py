from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_database
from app.models.room import RoomCreate, RoomResponse
from app.core.security import get_current_user, require_role
from typing import List
from bson import ObjectId
from app.services.activity_service import ActivityService

router = APIRouter()

@router.get("/", response_model=List[RoomResponse])
async def get_rooms(user: dict = Depends(get_current_user)):
    db = get_database()
    rooms = await db.rooms.find().to_list(1000)
    return [
        {**room, "id": str(room["_id"])} 
        for room in rooms
    ]

@router.post("/", response_model=RoomResponse)
async def create_room(
    room: RoomCreate, 
    user: dict = Depends(require_role(["Admin"]))
):
    db = get_database()
    room_dict = room.model_dump()
    
    # Check if name already exists
    existing = await db.rooms.find_one({"name": room.name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room {room.name} already exists"
        )
        
    result = await db.rooms.insert_one(room_dict)

    # Log activity
    await ActivityService.log_activity(
        action=f"Created room: {room.name}",
        user=user.get("name", "Admin"),
        type="success"
    )
    return {**room_dict, "id": str(result.inserted_id)}

@router.put("/{id}", response_model=RoomResponse)
async def update_room(
    id: str, 
    room: RoomCreate, 
    user: dict = Depends(require_role(["Admin"]))
):
    db = get_database()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid room ID")
        
    result = await db.rooms.update_one(
        {"_id": ObjectId(id)},
        {"$set": room.model_dump()}
    )
    
    # Log activity
    await ActivityService.log_activity(
        action=f"Updated room: {room.name}",
        user=user.get("name", "Admin"),
        type="info"
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
        
    return {**room.model_dump(), "id": id}

@router.delete("/{id}")
async def delete_room(
    id: str, 
    user: dict = Depends(require_role(["Admin"]))
):
    db = get_database()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid room ID")
        
    result = await db.rooms.delete_one({"_id": ObjectId(id)})

    # Log activity
    # Note: We don't have the room name here easily without extra query, 
    # but we can fetch it or just use ID. Let's fetch it for better logs.
    # Actually, let's keep it simple or check if result exists.
    await ActivityService.log_activity(
        action=f"Deleted room ID: {id}",
        user=user.get("name", "Admin"),
        type="warning"
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
        
    return {"message": "Room deleted successfully"}
