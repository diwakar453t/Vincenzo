from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class RoomBase(BaseModel):
    """Base schema for Room"""
    room_number: str = Field(..., min_length=1, max_length=20)
    name: Optional[str] = Field(None, max_length=100)
    building: Optional[str] = Field(None, max_length=100)
    floor: Optional[int] = None
    room_type: str = Field(default="classroom", pattern="^(classroom|laboratory|computer_lab|library|auditorium|sports_hall|staff_room|other)$")
    capacity: int = Field(default=40, ge=1, le=500)
    status: str = Field(default="available", pattern="^(available|occupied|maintenance|reserved)$")
    has_projector: bool = False
    has_ac: bool = False
    has_whiteboard: bool = True
    has_smartboard: bool = False
    description: Optional[str] = None


class RoomCreate(RoomBase):
    """Schema for creating a room"""
    pass


class RoomUpdate(BaseModel):
    """Schema for updating a room"""
    room_number: Optional[str] = Field(None, min_length=1, max_length=20)
    name: Optional[str] = Field(None, max_length=100)
    building: Optional[str] = Field(None, max_length=100)
    floor: Optional[int] = None
    room_type: Optional[str] = Field(None, pattern="^(classroom|laboratory|computer_lab|library|auditorium|sports_hall|staff_room|other)$")
    capacity: Optional[int] = Field(None, ge=1, le=500)
    status: Optional[str] = Field(None, pattern="^(available|occupied|maintenance|reserved)$")
    has_projector: Optional[bool] = None
    has_ac: Optional[bool] = None
    has_whiteboard: Optional[bool] = None
    has_smartboard: Optional[bool] = None
    description: Optional[str] = None


class AssignedClassInfo(BaseModel):
    """Info about a class assigned to a room"""
    id: int
    name: str
    grade_level: int
    section: str
    student_count: int = 0

    class Config:
        from_attributes = True


class RoomResponse(RoomBase):
    """Schema for room response"""
    id: int
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    display_name: str
    assigned_classes: List[AssignedClassInfo] = []
    current_occupancy: int = 0

    class Config:
        from_attributes = True


class RoomListItem(BaseModel):
    """Schema for room list item (simplified)"""
    id: int
    room_number: str
    name: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[int] = None
    room_type: str
    capacity: int
    status: str
    has_projector: bool
    has_ac: bool
    has_whiteboard: bool
    has_smartboard: bool
    assigned_class_count: int = 0
    current_occupancy: int = 0

    class Config:
        from_attributes = True


class RoomListResponse(BaseModel):
    """Schema for paginated room list"""
    rooms: list[RoomListItem]
    total: int
    skip: int
    limit: int
