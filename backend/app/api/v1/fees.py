from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.fee_service import FeeService
from app.schemas.fee import (
    FeeGroupCreate, FeeGroupUpdate, FeeGroupResponse, FeeGroupListResponse,
    FeeTypeCreate, FeeTypeUpdate, FeeTypeResponse, FeeTypeListResponse,
    FeeAssignRequest, FeeAssignmentResponse, FeeAssignmentListResponse,
    FeeCollectionCreate, FeeCollectionResponse, FeeCollectionListResponse,
    DefaulterListResponse, DefaulterInfo, FinancialSummary,
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
# Fee Groups
# ═══════════════════════════════════════════════════════════════════════

@router.get("/groups", response_model=FeeGroupListResponse)
def list_fee_groups(is_active: Optional[bool] = None, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    items, total = FeeService(db).get_fee_groups(user.tenant_id, is_active)
    return FeeGroupListResponse(fee_groups=[FeeGroupResponse(**g) for g in items], total=total)


@router.post("/groups", response_model=FeeGroupResponse, status_code=status.HTTP_201_CREATED)
def create_fee_group(data: FeeGroupCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    return FeeGroupResponse(**FeeService(db).create_fee_group(data.model_dump(), user.tenant_id))


@router.put("/groups/{gid}", response_model=FeeGroupResponse)
def update_fee_group(gid: int, data: FeeGroupUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    result = FeeService(db).update_fee_group(gid, data.model_dump(exclude_unset=True), user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Fee group not found")
    return FeeGroupResponse(**result)


@router.delete("/groups/{gid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fee_group(gid: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    if not FeeService(db).delete_fee_group(gid, user.tenant_id):
        raise HTTPException(status_code=404, detail="Fee group not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Fee Types
# ═══════════════════════════════════════════════════════════════════════

@router.get("/types", response_model=FeeTypeListResponse)
def list_fee_types(fee_group_id: Optional[int] = None, class_id: Optional[int] = None,
                    is_active: Optional[bool] = None,
                    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    items, total = FeeService(db).get_fee_types(user.tenant_id, fee_group_id, class_id, is_active)
    return FeeTypeListResponse(fee_types=[FeeTypeResponse(**t) for t in items], total=total)


@router.post("/types", response_model=FeeTypeResponse, status_code=status.HTTP_201_CREATED)
def create_fee_type(data: FeeTypeCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    return FeeTypeResponse(**FeeService(db).create_fee_type(data.model_dump(), user.tenant_id))


@router.put("/types/{tid}", response_model=FeeTypeResponse)
def update_fee_type(tid: int, data: FeeTypeUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    result = FeeService(db).update_fee_type(tid, data.model_dump(exclude_unset=True), user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Fee type not found")
    return FeeTypeResponse(**result)


@router.delete("/types/{tid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fee_type(tid: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    if not FeeService(db).delete_fee_type(tid, user.tenant_id):
        raise HTTPException(status_code=404, detail="Fee type not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Fee Assignments
# ═══════════════════════════════════════════════════════════════════════

@router.post("/assignments", response_model=FeeAssignmentListResponse, status_code=status.HTTP_201_CREATED)
def assign_fees(data: FeeAssignRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        items = FeeService(db).assign_fees(data, user.tenant_id)
        return FeeAssignmentListResponse(assignments=[FeeAssignmentResponse(**a) for a in items], total=len(items))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/assignments", response_model=FeeAssignmentListResponse)
def list_assignments(student_id: Optional[int] = None, fee_type_id: Optional[int] = None,
                      status_filter: Optional[str] = None,
                      current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    items, total = FeeService(db).get_assignments(user.tenant_id, student_id, fee_type_id, status_filter)
    return FeeAssignmentListResponse(assignments=[FeeAssignmentResponse(**a) for a in items], total=total)


# ═══════════════════════════════════════════════════════════════════════
# Fee Collections (Payments)
# ═══════════════════════════════════════════════════════════════════════

@router.post("/collections", response_model=FeeCollectionResponse, status_code=status.HTTP_201_CREATED)
def collect_fee(data: FeeCollectionCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return FeeCollectionResponse(**FeeService(db).collect_fee(data, user.tenant_id))


@router.get("/collections", response_model=FeeCollectionListResponse)
def list_collections(student_id: Optional[int] = None, fee_type_id: Optional[int] = None,
                      from_date: Optional[date] = None, to_date: Optional[date] = None,
                      current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    items, total = FeeService(db).get_collections(user.tenant_id, student_id, fee_type_id, from_date, to_date)
    return FeeCollectionListResponse(collections=[FeeCollectionResponse(**c) for c in items], total=total)


@router.delete("/collections/{cid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(cid: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    if not FeeService(db).delete_collection(cid, user.tenant_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Receipt
# ═══════════════════════════════════════════════════════════════════════

@router.get("/receipts/{collection_id}", response_model=FeeCollectionResponse)
def get_receipt(collection_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    result = FeeService(db).get_receipt(collection_id, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return FeeCollectionResponse(**result)


# ═══════════════════════════════════════════════════════════════════════
# Reports
# ═══════════════════════════════════════════════════════════════════════

@router.get("/defaulters", response_model=DefaulterListResponse)
def get_defaulters(class_id: Optional[int] = None, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    items, total = FeeService(db).get_defaulters(user.tenant_id, class_id)
    return DefaulterListResponse(defaulters=[DefaulterInfo(**d) for d in items], total=total)


@router.get("/summary", response_model=FinancialSummary)
def financial_summary(academic_year: str = "2025-26", current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return FeeService(db).get_financial_summary(user.tenant_id, academic_year)
