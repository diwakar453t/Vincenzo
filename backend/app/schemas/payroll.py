from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class ComponentTypeEnum(str, Enum):
    EARNING = "earning"
    DEDUCTION = "deduction"


class PayrollStatusEnum(str, Enum):
    DRAFT = "draft"
    PROCESSED = "processed"
    APPROVED = "approved"
    PAID = "paid"


# ─── Payroll Component ──────────────────────────────────────────────────

class PayrollComponentCreate(BaseModel):
    name: str
    code: Optional[str] = None
    component_type: ComponentTypeEnum
    is_percentage: bool = False
    percentage_of: Optional[str] = None
    default_amount: float = 0
    is_active: bool = True
    description: Optional[str] = None
    sort_order: int = 0


class PayrollComponentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    component_type: Optional[ComponentTypeEnum] = None
    is_percentage: Optional[bool] = None
    percentage_of: Optional[str] = None
    default_amount: Optional[float] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None


class PayrollComponentResponse(BaseModel):
    id: int; tenant_id: str; name: str; code: Optional[str] = None
    component_type: str; is_percentage: bool; percentage_of: Optional[str] = None
    default_amount: float; is_active: bool; description: Optional[str] = None
    sort_order: int; created_at: datetime; updated_at: datetime
    class Config:
        from_attributes = True


class PayrollComponentListResponse(BaseModel):
    components: List[PayrollComponentResponse]; total: int


# ─── Salary Structure ───────────────────────────────────────────────────

class SalaryStructureItemInput(BaseModel):
    component_id: int
    amount: float


class SalaryStructureCreate(BaseModel):
    teacher_id: int
    effective_from: Optional[date] = None
    items: List[SalaryStructureItemInput]


class SalaryStructureItemResponse(BaseModel):
    id: int; component_id: int; component_name: Optional[str] = None
    component_type: Optional[str] = None; amount: float


class SalaryStructureResponse(BaseModel):
    id: int; tenant_id: str; teacher_id: int; teacher_name: Optional[str] = None
    gross_salary: float; net_salary: float; effective_from: Optional[date] = None
    is_active: bool; items: List[SalaryStructureItemResponse] = []
    created_at: datetime; updated_at: datetime
    class Config:
        from_attributes = True


class SalaryStructureListResponse(BaseModel):
    structures: List[SalaryStructureResponse]; total: int


# ─── Payroll ─────────────────────────────────────────────────────────────

class PayrollProcessRequest(BaseModel):
    month: int
    year: int
    teacher_ids: Optional[List[int]] = None   # None = all teachers
    working_days: int = 30


class PayrollActionRequest(BaseModel):
    status: PayrollStatusEnum
    remarks: Optional[str] = None
    paid_date: Optional[date] = None


class PayrollItemResponse(BaseModel):
    id: int; component_id: int; component_name: str
    component_type: str; amount: float


class PayrollResponse(BaseModel):
    id: int; tenant_id: str; teacher_id: int; teacher_name: Optional[str] = None
    month: int; year: int; working_days: int; present_days: float
    gross_salary: float; total_earnings: float; total_deductions: float
    net_salary: float; status: str; remarks: Optional[str] = None
    paid_date: Optional[date] = None; items: List[PayrollItemResponse] = []
    created_at: datetime; updated_at: datetime
    class Config:
        from_attributes = True


class PayrollListResponse(BaseModel):
    payrolls: List[PayrollResponse]; total: int


# ─── Reports ─────────────────────────────────────────────────────────────

class PayrollSummary(BaseModel):
    month: int; year: int; total_teachers: int; total_gross: float
    total_earnings: float; total_deductions: float; total_net: float
    draft_count: int; processed_count: int; paid_count: int


class SalaryHistoryItem(BaseModel):
    month: int; year: int; gross_salary: float; net_salary: float
    status: str; paid_date: Optional[date] = None


class SalaryHistoryResponse(BaseModel):
    teacher_id: int; teacher_name: str
    history: List[SalaryHistoryItem]
