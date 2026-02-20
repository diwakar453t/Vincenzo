from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.department_service import DepartmentService
from app.schemas.department import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse, DepartmentListResponse,
    DepartmentTreeNode, DepartmentTreeResponse,
    DesignationCreate, DesignationUpdate, DesignationResponse, DesignationListResponse,
)
from app.models.user import User

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")


# ═══════════════════════════════════════════════════════════════════════
# Department endpoints
# ═══════════════════════════════════════════════════════════════════════

@router.get("/", response_model=DepartmentListResponse)
def list_departments(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = DepartmentService(db)
    items, total = service.get_departments(user.tenant_id, search, is_active)
    return DepartmentListResponse(departments=[DepartmentResponse(**d) for d in items], total=total)


@router.get("/tree", response_model=DepartmentTreeResponse)
def department_tree(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = DepartmentService(db)
    tree = service.get_tree(user.tenant_id)
    return DepartmentTreeResponse(tree=[DepartmentTreeNode(**n) for n in tree])


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = DepartmentService(db)
    d = service.get_department(department_id, user.tenant_id)
    if not d:
        raise HTTPException(status_code=404, detail="Department not found")
    return d


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    data: DepartmentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = DepartmentService(db)
    d = service.create_department(data, user.tenant_id)
    result = service.get_department(d.id, user.tenant_id)
    return result


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    data: DepartmentUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = DepartmentService(db)
    d = service.update_department(department_id, data, user.tenant_id)
    if not d:
        raise HTTPException(status_code=404, detail="Department not found")
    result = service.get_department(d.id, user.tenant_id)
    return result


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = DepartmentService(db)
    if not service.delete_department(department_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Department not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Designation endpoints
# ═══════════════════════════════════════════════════════════════════════

@router.get("/designations/all", response_model=DesignationListResponse)
def list_designations(
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = DepartmentService(db)
    items, total = service.get_designations(user.tenant_id, department_id, search, is_active)
    return DesignationListResponse(designations=[DesignationResponse(**d) for d in items], total=total)


@router.post("/designations", response_model=DesignationResponse, status_code=status.HTTP_201_CREATED)
def create_designation(
    data: DesignationCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = DepartmentService(db)
    d = service.create_designation(data, user.tenant_id)
    items, _ = service.get_designations(user.tenant_id)
    for item in items:
        if item["id"] == d.id:
            return item
    return DesignationResponse.model_validate(d)


@router.put("/designations/{designation_id}", response_model=DesignationResponse)
def update_designation(
    designation_id: int,
    data: DesignationUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = DepartmentService(db)
    d = service.update_designation(designation_id, data, user.tenant_id)
    if not d:
        raise HTTPException(status_code=404, detail="Designation not found")
    items, _ = service.get_designations(user.tenant_id)
    for item in items:
        if item["id"] == d.id:
            return item
    return DesignationResponse.model_validate(d)


@router.delete("/designations/{designation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_designation(
    designation_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = DepartmentService(db)
    if not service.delete_designation(designation_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Designation not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
