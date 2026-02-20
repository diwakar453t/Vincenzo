"""
Hostel Management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.hostel import (
    HostelCreate, HostelUpdate, HostelResponse, HostelListResponse,
    HostelRoomCreate, HostelRoomUpdate, HostelRoomResponse, HostelRoomListResponse,
    AllocationCreate, AllocationVacate, AllocationResponse, AllocationListResponse,
    HostelStatsResponse,
)
from app.services.hostel_service import HostelService

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _require_admin(user: User):
    if user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


# ═══════════════════════════════════════════════════════════════════════
# Hostels
# ═══════════════════════════════════════════════════════════════════════

@router.get("/", response_model=HostelListResponse)
def list_hostels(
    hostel_type: Optional[str] = None, is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    hostels, total = HostelService(db).get_hostels(user.tenant_id, hostel_type=hostel_type, is_active=is_active)
    return HostelListResponse(hostels=[HostelResponse(**h) for h in hostels], total=total)


@router.post("/", response_model=HostelResponse)
def create_hostel(data: HostelCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    return HostelResponse(**HostelService(db).create_hostel(data.model_dump(), user.tenant_id))


@router.put("/{hostel_id}", response_model=HostelResponse)
def update_hostel(hostel_id: int, data: HostelUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return HostelResponse(**HostelService(db).update_hostel(hostel_id, data.model_dump(exclude_unset=True), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{hostel_id}")
def delete_hostel(hostel_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        HostelService(db).delete_hostel(hostel_id, user.tenant_id)
        return {"message": "Hostel deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Hostel Rooms
# ═══════════════════════════════════════════════════════════════════════

@router.get("/rooms", response_model=HostelRoomListResponse)
def list_rooms(
    hostel_id: Optional[int] = None, status: Optional[str] = None,
    room_type: Optional[str] = None, skip: int = 0, limit: int = 100,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    rooms, total = HostelService(db).get_rooms(user.tenant_id, hostel_id=hostel_id,
                                                status=status, room_type=room_type, skip=skip, limit=limit)
    return HostelRoomListResponse(rooms=[HostelRoomResponse(**r) for r in rooms], total=total)


@router.post("/rooms", response_model=HostelRoomResponse)
def create_room(data: HostelRoomCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return HostelRoomResponse(**HostelService(db).create_room(data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/rooms/{room_id}", response_model=HostelRoomResponse)
def update_room(room_id: int, data: HostelRoomUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return HostelRoomResponse(**HostelService(db).update_room(room_id, data.model_dump(exclude_unset=True), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/rooms/{room_id}")
def delete_room(room_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        HostelService(db).delete_room(room_id, user.tenant_id)
        return {"message": "Room deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Allocations
# ═══════════════════════════════════════════════════════════════════════

@router.post("/allocate", response_model=AllocationResponse)
def allocate_room(data: AllocationCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return AllocationResponse(**HostelService(db).allocate_room(data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/vacate/{alloc_id}", response_model=AllocationResponse)
def vacate_room(alloc_id: int, data: AllocationVacate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return AllocationResponse(**HostelService(db).vacate_room(alloc_id, data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/allocations", response_model=AllocationListResponse)
def list_allocations(
    hostel_id: Optional[int] = None, room_id: Optional[int] = None,
    student_id: Optional[int] = None, status: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    allocs, total = HostelService(db).get_allocations(user.tenant_id, hostel_id=hostel_id,
                                                       room_id=room_id, student_id=student_id,
                                                       status=status, skip=skip, limit=limit)
    return AllocationListResponse(allocations=[AllocationResponse(**a) for a in allocs], total=total)


@router.get("/residents", response_model=AllocationListResponse)
def list_residents(
    hostel_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    allocs, total = HostelService(db).get_residents(user.tenant_id, hostel_id=hostel_id)
    return AllocationListResponse(allocations=[AllocationResponse(**a) for a in allocs], total=total)


# ═══════════════════════════════════════════════════════════════════════
# Availability & Fees
# ═══════════════════════════════════════════════════════════════════════

@router.get("/availability", response_model=HostelRoomListResponse)
def room_availability(
    hostel_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    rooms, total = HostelService(db).get_availability(user.tenant_id, hostel_id=hostel_id)
    return HostelRoomListResponse(rooms=[HostelRoomResponse(**r) for r in rooms], total=total)


@router.put("/fees/{hostel_id}", response_model=HostelResponse)
def update_hostel_fees(hostel_id: int, monthly_fee: float, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return HostelResponse(**HostelService(db).update_hostel_fees(hostel_id, monthly_fee, user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/allocation-fee/{alloc_id}", response_model=AllocationResponse)
def update_allocation_fee(
    alloc_id: int, monthly_fee: float, fee_paid_till: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return AllocationResponse(**HostelService(db).update_allocation_fee(alloc_id, monthly_fee, fee_paid_till, user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Stats
# ═══════════════════════════════════════════════════════════════════════

@router.get("/stats", response_model=HostelStatsResponse)
def hostel_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return HostelStatsResponse(**HostelService(db).get_stats(user.tenant_id))
