"""
Hostel Management schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Hostel ──────────────────────────────────────────────────────────────

class HostelCreate(BaseModel):
    name: str
    code: Optional[str] = None
    hostel_type: str = "boys"
    address: Optional[str] = None
    warden_name: Optional[str] = None
    warden_phone: Optional[str] = None
    warden_email: Optional[str] = None
    monthly_fee: float = 0
    description: Optional[str] = None


class HostelUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    hostel_type: Optional[str] = None
    address: Optional[str] = None
    warden_name: Optional[str] = None
    warden_phone: Optional[str] = None
    warden_email: Optional[str] = None
    monthly_fee: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class HostelResponse(BaseModel):
    id: int
    tenant_id: str
    name: str
    code: Optional[str] = None
    hostel_type: str
    address: Optional[str] = None
    warden_name: Optional[str] = None
    warden_phone: Optional[str] = None
    warden_email: Optional[str] = None
    total_rooms: int
    total_beds: int
    occupied_beds: int
    available_beds: Optional[int] = 0
    monthly_fee: float
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Hostel Room ─────────────────────────────────────────────────────────

class HostelRoomCreate(BaseModel):
    hostel_id: int
    room_number: str
    floor: Optional[int] = 0
    room_type: str = "double"
    capacity: int = 2
    has_attached_bathroom: bool = False
    has_ac: bool = False
    has_wifi: bool = False
    monthly_rent: Optional[float] = 0
    description: Optional[str] = None


class HostelRoomUpdate(BaseModel):
    room_number: Optional[str] = None
    floor: Optional[int] = None
    room_type: Optional[str] = None
    capacity: Optional[int] = None
    has_attached_bathroom: Optional[bool] = None
    has_ac: Optional[bool] = None
    has_wifi: Optional[bool] = None
    monthly_rent: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class HostelRoomResponse(BaseModel):
    id: int
    tenant_id: str
    hostel_id: int
    hostel_name: Optional[str] = None
    room_number: str
    floor: Optional[int] = None
    room_type: str
    capacity: int
    occupied: int
    available: Optional[int] = 0
    status: str
    has_attached_bathroom: bool
    has_ac: bool
    has_wifi: bool
    monthly_rent: Optional[float] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Room Allocation ────────────────────────────────────────────────────

class AllocationCreate(BaseModel):
    hostel_id: int
    room_id: int
    student_id: int
    bed_number: Optional[str] = None
    allocation_date: Optional[str] = None
    expected_vacating_date: Optional[str] = None
    monthly_fee: float = 0
    remarks: Optional[str] = None


class AllocationVacate(BaseModel):
    vacating_date: Optional[str] = None
    remarks: Optional[str] = None


class AllocationResponse(BaseModel):
    id: int
    tenant_id: str
    hostel_id: int
    hostel_name: Optional[str] = None
    room_id: int
    room_number: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    bed_number: Optional[str] = None
    allocation_date: str
    vacating_date: Optional[str] = None
    expected_vacating_date: Optional[str] = None
    status: str
    monthly_fee: float
    fee_paid_till: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Lists & Stats ──────────────────────────────────────────────────────

class HostelListResponse(BaseModel):
    hostels: List[HostelResponse]
    total: int

class HostelRoomListResponse(BaseModel):
    rooms: List[HostelRoomResponse]
    total: int

class AllocationListResponse(BaseModel):
    allocations: List[AllocationResponse]
    total: int

class HostelStatsResponse(BaseModel):
    total_hostels: int
    total_rooms: int
    total_beds: int
    occupied_beds: int
    available_beds: int
    total_residents: int
    occupancy_rate: float
    total_monthly_revenue: float
    hostel_breakdown: List[dict]
