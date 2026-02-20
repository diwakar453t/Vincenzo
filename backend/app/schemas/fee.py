from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class PaymentStatusEnum(str, Enum):
    PAID = "paid"
    PARTIAL = "partial"
    UNPAID = "unpaid"
    OVERDUE = "overdue"


class PaymentMethodEnum(str, Enum):
    CASH = "cash"
    CHEQUE = "cheque"
    ONLINE = "online"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"


# ─── Fee Group ───────────────────────────────────────────────────────────

class FeeGroupCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class FeeGroupUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class FeeGroupResponse(BaseModel):
    id: int; tenant_id: str; name: str; code: Optional[str] = None
    description: Optional[str] = None; is_active: bool
    fee_types_count: Optional[int] = 0
    created_at: datetime; updated_at: datetime
    class Config:
        from_attributes = True


class FeeGroupListResponse(BaseModel):
    fee_groups: List[FeeGroupResponse]; total: int


# ─── Fee Type ────────────────────────────────────────────────────────────

class FeeTypeCreate(BaseModel):
    fee_group_id: int; name: str; code: Optional[str] = None
    amount: float = 0; due_date: Optional[date] = None
    is_recurring: bool = False; frequency: Optional[str] = None
    academic_year: str = "2025-26"; is_active: bool = True
    description: Optional[str] = None; class_id: Optional[int] = None


class FeeTypeUpdate(BaseModel):
    fee_group_id: Optional[int] = None; name: Optional[str] = None
    code: Optional[str] = None; amount: Optional[float] = None
    due_date: Optional[date] = None; is_recurring: Optional[bool] = None
    frequency: Optional[str] = None; is_active: Optional[bool] = None
    description: Optional[str] = None; class_id: Optional[int] = None


class FeeTypeResponse(BaseModel):
    id: int; tenant_id: str; fee_group_id: int; fee_group_name: Optional[str] = None
    name: str; code: Optional[str] = None; amount: float
    due_date: Optional[date] = None; is_recurring: bool
    frequency: Optional[str] = None; academic_year: str; is_active: bool
    description: Optional[str] = None; class_id: Optional[int] = None
    class_name: Optional[str] = None
    created_at: datetime; updated_at: datetime
    class Config:
        from_attributes = True


class FeeTypeListResponse(BaseModel):
    fee_types: List[FeeTypeResponse]; total: int


# ─── Fee Assignment ──────────────────────────────────────────────────────

class FeeAssignRequest(BaseModel):
    student_ids: List[int]
    fee_type_id: int
    amount: Optional[float] = None    # override from fee_type.amount
    discount: float = 0
    due_date: Optional[date] = None


class FeeAssignmentResponse(BaseModel):
    id: int; tenant_id: str; student_id: int; student_name: Optional[str] = None
    fee_type_id: int; fee_type_name: Optional[str] = None
    amount: float; discount: float; net_amount: float
    paid_amount: float; balance: float; status: str
    due_date: Optional[date] = None; academic_year: str
    created_at: datetime; updated_at: datetime
    class Config:
        from_attributes = True


class FeeAssignmentListResponse(BaseModel):
    assignments: List[FeeAssignmentResponse]; total: int


# ─── Fee Collection (Payment) ────────────────────────────────────────────

class FeeCollectionCreate(BaseModel):
    student_id: int
    fee_type_id: int
    assignment_id: Optional[int] = None
    amount: float
    payment_method: PaymentMethodEnum = PaymentMethodEnum.CASH
    payment_date: date
    transaction_id: Optional[str] = None
    remarks: Optional[str] = None


class FeeCollectionResponse(BaseModel):
    id: int; tenant_id: str; student_id: int; student_name: Optional[str] = None
    fee_type_id: int; fee_type_name: Optional[str] = None
    assignment_id: Optional[int] = None; receipt_number: Optional[str] = None
    amount: float; payment_method: str; payment_date: date
    transaction_id: Optional[str] = None; remarks: Optional[str] = None
    academic_year: str; created_at: datetime; updated_at: datetime
    class Config:
        from_attributes = True


class FeeCollectionListResponse(BaseModel):
    collections: List[FeeCollectionResponse]; total: int


# ─── Reports ─────────────────────────────────────────────────────────────

class DefaulterInfo(BaseModel):
    student_id: int; student_name: str; class_name: Optional[str] = None
    total_due: float; total_paid: float; balance: float

class DefaulterListResponse(BaseModel):
    defaulters: List[DefaulterInfo]; total: int


class FinancialSummary(BaseModel):
    academic_year: str; total_fees_assigned: float; total_collected: float
    total_outstanding: float; total_discount: float
    collection_rate: float   # percentage
    payment_method_breakdown: dict = {}
    monthly_collection: List[dict] = []
