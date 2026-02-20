from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.room_service import RoomService
from app.schemas.room import (
    RoomCreate,
    RoomUpdate,
    RoomResponse,
    RoomListResponse,
    RoomListItem,
    AssignedClassInfo,
)
from app.models.user import User
from app.models.student import Student

router = APIRouter()


@router.get("/", response_model=RoomListResponse)
def list_rooms(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    room_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    building: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all rooms with pagination and filtering"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    service = RoomService(db)
    rooms, total = service.get_rooms(
        tenant_id=user.tenant_id,
        skip=skip,
        limit=limit,
        search=search,
        room_type=room_type,
        status=status_filter,
        building=building,
    )

    room_items = []
    for r in rooms:
        occupancy = service.get_room_occupancy(r.id, user.tenant_id)
        assigned_count = len(r.classes) if r.classes else 0
        room_items.append(
            RoomListItem(
                id=r.id,
                room_number=r.room_number,
                name=r.name,
                building=r.building,
                floor=r.floor,
                room_type=r.room_type,
                capacity=r.capacity,
                status=r.status,
                has_projector=r.has_projector,
                has_ac=r.has_ac,
                has_whiteboard=r.has_whiteboard,
                has_smartboard=r.has_smartboard,
                assigned_class_count=assigned_count,
                current_occupancy=occupancy,
            )
        )

    return RoomListResponse(rooms=room_items, total=total, skip=skip, limit=limit)


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    room_data: RoomCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new room"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create rooms")

    service = RoomService(db)
    try:
        room = service.create_room(room_data, user.tenant_id)
        response = RoomResponse.model_validate(room)
        response.assigned_classes = []
        response.current_occupancy = 0
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{room_id}", response_model=RoomResponse)
def get_room(
    room_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single room by ID"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    service = RoomService(db)
    room = service.get_room(room_id, user.tenant_id)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    occupancy = service.get_room_occupancy(room_id, user.tenant_id)
    assigned = [
        AssignedClassInfo(
            id=c.id,
            name=c.name,
            grade_level=c.grade_level,
            section=c.section,
            student_count=len(c.students) if c.students else 0,
        )
        for c in (room.classes or [])
    ]

    response = RoomResponse.model_validate(room)
    response.assigned_classes = assigned
    response.current_occupancy = occupancy
    return response


@router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int,
    room_data: RoomUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a room"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update rooms")

    service = RoomService(db)
    room = service.update_room(room_id, room_data, user.tenant_id)

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    occupancy = service.get_room_occupancy(room_id, user.tenant_id)
    response = RoomResponse.model_validate(room)
    response.current_occupancy = occupancy
    return response


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a room"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete rooms")

    service = RoomService(db)
    try:
        success = service.delete_room(room_id, user.tenant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Room not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{room_id}/assign/{class_id}", status_code=status.HTTP_200_OK)
def assign_room_to_class(
    room_id: int,
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a room to a class"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign rooms")

    service = RoomService(db)
    success = service.assign_room_to_class(room_id, class_id, user.tenant_id)

    if not success:
        raise HTTPException(status_code=404, detail="Room or class not found")

    return {"message": "Room assigned to class successfully"}


@router.delete("/{room_id}/unassign/{class_id}", status_code=status.HTTP_200_OK)
def unassign_room_from_class(
    room_id: int,
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove room assignment from a class"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can unassign rooms")

    service = RoomService(db)
    success = service.unassign_room_from_class(class_id, user.tenant_id)

    if not success:
        raise HTTPException(status_code=404, detail="Class not found")

    return {"message": "Room unassigned from class successfully"}


@router.get("/{room_id}/capacity")
def get_room_capacity(
    room_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed capacity information for a room"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    service = RoomService(db)
    capacity_info = service.get_room_capacity_info(room_id, user.tenant_id)

    if not capacity_info:
        raise HTTPException(status_code=404, detail="Room not found")

    return capacity_info
