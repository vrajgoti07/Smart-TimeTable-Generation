from pydantic import BaseModel, Field
from typing import Dict, List, Optional

class RoomBase(BaseModel):
    name: str
    room_type: str # 'Theory' or 'Lab'
    capacity: int
    availability: Dict[str, List[str]] # e.g. {"Monday": ["09:10", "10:10"]}

class RoomCreate(RoomBase):
    pass

class RoomInDB(RoomBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True

class RoomResponse(RoomBase):
    id: str
