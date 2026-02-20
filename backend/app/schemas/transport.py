"""
Transport Management schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Route ───────────────────────────────────────────────────────────────

class RouteCreate(BaseModel):
    route_name: str
    route_code: Optional[str] = None
    start_point: str
    end_point: str
    stops: Optional[str] = None
    distance_km: Optional[float] = 0
    estimated_time_min: Optional[int] = 0
    morning_departure: Optional[str] = None
    evening_departure: Optional[str] = None
    monthly_fee: float = 0
    max_capacity: int = 40
    vehicle_id: Optional[int] = None
    description: Optional[str] = None


class RouteUpdate(BaseModel):
    route_name: Optional[str] = None
    route_code: Optional[str] = None
    start_point: Optional[str] = None
    end_point: Optional[str] = None
    stops: Optional[str] = None
    distance_km: Optional[float] = None
    estimated_time_min: Optional[int] = None
    morning_departure: Optional[str] = None
    evening_departure: Optional[str] = None
    monthly_fee: Optional[float] = None
    max_capacity: Optional[int] = None
    vehicle_id: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RouteResponse(BaseModel):
    id: int
    tenant_id: str
    route_name: str
    route_code: Optional[str] = None
    start_point: str
    end_point: str
    stops: Optional[str] = None
    distance_km: Optional[float] = None
    estimated_time_min: Optional[int] = None
    morning_departure: Optional[str] = None
    evening_departure: Optional[str] = None
    monthly_fee: float
    max_capacity: int
    current_students: int
    available_seats: Optional[int] = 0
    vehicle_id: Optional[int] = None
    vehicle_number: Optional[str] = None
    status: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Vehicle ────────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    vehicle_number: str
    vehicle_type: str = "bus"
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    capacity: int = 40
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_license: Optional[str] = None
    conductor_name: Optional[str] = None
    conductor_phone: Optional[str] = None
    insurance_expiry: Optional[str] = None
    fitness_expiry: Optional[str] = None
    fuel_type: Optional[str] = "diesel"
    gps_enabled: bool = False
    description: Optional[str] = None


class VehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    capacity: Optional[int] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_license: Optional[str] = None
    conductor_name: Optional[str] = None
    conductor_phone: Optional[str] = None
    insurance_expiry: Optional[str] = None
    fitness_expiry: Optional[str] = None
    fuel_type: Optional[str] = None
    gps_enabled: Optional[bool] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class VehicleResponse(BaseModel):
    id: int
    tenant_id: str
    vehicle_number: str
    vehicle_type: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    capacity: int
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_license: Optional[str] = None
    conductor_name: Optional[str] = None
    conductor_phone: Optional[str] = None
    insurance_expiry: Optional[str] = None
    fitness_expiry: Optional[str] = None
    fuel_type: Optional[str] = None
    gps_enabled: bool
    status: str
    description: Optional[str] = None
    is_active: bool
    assigned_routes: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Assignment ──────────────────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    student_id: int
    route_id: int
    pickup_stop: Optional[str] = None
    drop_stop: Optional[str] = None
    assignment_date: Optional[str] = None
    end_date: Optional[str] = None
    monthly_fee: float = 0
    remarks: Optional[str] = None


class AssignmentCancel(BaseModel):
    end_date: Optional[str] = None
    remarks: Optional[str] = None


class AssignmentResponse(BaseModel):
    id: int
    tenant_id: str
    student_id: int
    student_name: Optional[str] = None
    route_id: int
    route_name: Optional[str] = None
    route_code: Optional[str] = None
    pickup_stop: Optional[str] = None
    drop_stop: Optional[str] = None
    assignment_date: str
    end_date: Optional[str] = None
    monthly_fee: float
    fee_paid_till: Optional[str] = None
    status: str
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Lists & Stats ──────────────────────────────────────────────────────

class RouteListResponse(BaseModel):
    routes: List[RouteResponse]
    total: int

class VehicleListResponse(BaseModel):
    vehicles: List[VehicleResponse]
    total: int

class AssignmentListResponse(BaseModel):
    assignments: List[AssignmentResponse]
    total: int

class TransportStatsResponse(BaseModel):
    total_routes: int
    total_vehicles: int
    total_students: int
    active_assignments: int
    total_monthly_revenue: float
    avg_occupancy_rate: float
    route_breakdown: List[dict]
