from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.payroll_service import PayrollService
from app.schemas.payroll import (
    PayrollComponentCreate, PayrollComponentUpdate, PayrollComponentResponse,
    PayrollComponentListResponse, SalaryStructureCreate, SalaryStructureResponse,
    SalaryStructureListResponse, PayrollProcessRequest, PayrollActionRequest,
    PayrollResponse, PayrollListResponse, PayrollSummary, SalaryHistoryResponse,
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
# Payroll Components
# ═══════════════════════════════════════════════════════════════════════

@router.get("/components", response_model=PayrollComponentListResponse)
def list_components(
    component_type: Optional[str] = None, is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = PayrollService(db)
    items, total = service.get_components(user.tenant_id, component_type, is_active)
    return PayrollComponentListResponse(components=[PayrollComponentResponse(**c) for c in items], total=total)


@router.post("/components", response_model=PayrollComponentResponse, status_code=status.HTTP_201_CREATED)
def create_component(data: PayrollComponentCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    return PayrollComponentResponse(**PayrollService(db).create_component(data.model_dump(), user.tenant_id))


@router.put("/components/{cid}", response_model=PayrollComponentResponse)
def update_component(cid: int, data: PayrollComponentUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    result = PayrollService(db).update_component(cid, data.model_dump(exclude_unset=True), user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Component not found")
    return PayrollComponentResponse(**result)


@router.delete("/components/{cid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_component(cid: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    if not PayrollService(db).delete_component(cid, user.tenant_id):
        raise HTTPException(status_code=404, detail="Component not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Salary Structures
# ═══════════════════════════════════════════════════════════════════════

@router.get("/structures", response_model=SalaryStructureListResponse)
def list_structures(
    teacher_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    items, total = PayrollService(db).get_structures(user.tenant_id, teacher_id)
    return SalaryStructureListResponse(structures=[SalaryStructureResponse(**s) for s in items], total=total)


@router.post("/structures", response_model=SalaryStructureResponse, status_code=status.HTTP_201_CREATED)
def create_structure(data: SalaryStructureCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    return SalaryStructureResponse(**PayrollService(db).create_or_update_structure(data, user.tenant_id))


@router.delete("/structures/{sid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_structure(sid: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    if not PayrollService(db).delete_structure(sid, user.tenant_id):
        raise HTTPException(status_code=404, detail="Structure not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Payroll Processing
# ═══════════════════════════════════════════════════════════════════════

@router.post("/process", response_model=PayrollListResponse)
def process_payroll(data: PayrollProcessRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = PayrollService(db)
    items = service.process_payroll(data, user.tenant_id)
    return PayrollListResponse(payrolls=[PayrollResponse(**p) for p in items], total=len(items))


@router.get("/payrolls", response_model=PayrollListResponse)
def list_payrolls(
    month: Optional[int] = None, year: Optional[int] = None,
    teacher_id: Optional[int] = None, status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    items, total = PayrollService(db).get_payrolls(user.tenant_id, month, year, teacher_id, status_filter)
    return PayrollListResponse(payrolls=[PayrollResponse(**p) for p in items], total=total)


@router.get("/payrolls/{pid}", response_model=PayrollResponse)
def get_payroll(pid: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    result = PayrollService(db).get_payroll(pid, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Payroll not found")
    return PayrollResponse(**result)


@router.put("/payrolls/{pid}/action", response_model=PayrollResponse)
def action_payroll(pid: int, data: PayrollActionRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    result = PayrollService(db).action_payroll(pid, data, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Payroll not found")
    return PayrollResponse(**result)


@router.delete("/payrolls/{pid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payroll(pid: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    if not PayrollService(db).delete_payroll(pid, user.tenant_id):
        raise HTTPException(status_code=404, detail="Payroll not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Reports
# ═══════════════════════════════════════════════════════════════════════

@router.get("/summary", response_model=PayrollSummary)
def payroll_summary(month: int, year: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return PayrollService(db).get_summary(month, year, user.tenant_id)


@router.get("/history/{teacher_id}", response_model=SalaryHistoryResponse)
def salary_history(teacher_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return PayrollService(db).get_salary_history(teacher_id, user.tenant_id)
