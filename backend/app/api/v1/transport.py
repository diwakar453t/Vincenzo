"""
Transport Management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.transport import (
    RouteCreate, RouteUpdate, RouteResponse, RouteListResponse,
    VehicleCreate, VehicleUpdate, VehicleResponse, VehicleListResponse,
    AssignmentCreate, AssignmentCancel, AssignmentResponse, AssignmentListResponse,
    TransportStatsResponse,
)
from app.services.transport_service import TransportService

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
# Routes
# ═══════════════════════════════════════════════════════════════════════

@router.get("/routes", response_model=RouteListResponse)
def list_routes(
    status: Optional[str] = None, is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    routes, total = TransportService(db).get_routes(user.tenant_id, status=status, is_active=is_active)
    return RouteListResponse(routes=[RouteResponse(**r) for r in routes], total=total)


@router.post("/routes", response_model=RouteResponse)
def create_route(data: RouteCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    return RouteResponse(**TransportService(db).create_route(data.model_dump(), user.tenant_id))


@router.put("/routes/{route_id}", response_model=RouteResponse)
def update_route(route_id: int, data: RouteUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return RouteResponse(**TransportService(db).update_route(route_id, data.model_dump(exclude_unset=True), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/routes/{route_id}")
def delete_route(route_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        TransportService(db).delete_route(route_id, user.tenant_id)
        return {"message": "Route deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Vehicles
# ═══════════════════════════════════════════════════════════════════════

@router.get("/vehicles", response_model=VehicleListResponse)
def list_vehicles(
    vehicle_type: Optional[str] = None, status: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    vehicles, total = TransportService(db).get_vehicles(user.tenant_id, vehicle_type=vehicle_type, status=status)
    return VehicleListResponse(vehicles=[VehicleResponse(**v) for v in vehicles], total=total)


@router.post("/vehicles", response_model=VehicleResponse)
def create_vehicle(data: VehicleCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return VehicleResponse(**TransportService(db).create_vehicle(data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: int, data: VehicleUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return VehicleResponse(**TransportService(db).update_vehicle(vehicle_id, data.model_dump(exclude_unset=True), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        TransportService(db).delete_vehicle(vehicle_id, user.tenant_id)
        return {"message": "Vehicle deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Assignments
# ═══════════════════════════════════════════════════════════════════════

@router.post("/assign", response_model=AssignmentResponse)
def assign_student(data: AssignmentCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return AssignmentResponse(**TransportService(db).assign_student(data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cancel/{assign_id}", response_model=AssignmentResponse)
def cancel_assignment(assign_id: int, data: AssignmentCancel, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return AssignmentResponse(**TransportService(db).cancel_assignment(assign_id, data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/assignments", response_model=AssignmentListResponse)
def list_assignments(
    route_id: Optional[int] = None, student_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    assigns, total = TransportService(db).get_assignments(user.tenant_id, route_id=route_id,
                                                           student_id=student_id, status=status)
    return AssignmentListResponse(assignments=[AssignmentResponse(**a) for a in assigns], total=total)


# ═══════════════════════════════════════════════════════════════════════
# Fees & Stats
# ═══════════════════════════════════════════════════════════════════════

@router.put("/route-fee/{route_id}", response_model=RouteResponse)
def update_route_fee(route_id: int, monthly_fee: float, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return RouteResponse(**TransportService(db).update_route_fee(route_id, monthly_fee, user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/assignment-fee/{assign_id}", response_model=AssignmentResponse)
def update_assignment_fee(
    assign_id: int, monthly_fee: float, fee_paid_till: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return AssignmentResponse(**TransportService(db).update_assignment_fee(assign_id, monthly_fee, fee_paid_till, user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/stats", response_model=TransportStatsResponse)
def transport_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return TransportStatsResponse(**TransportService(db).get_stats(user.tenant_id))
