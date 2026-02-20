"""
Payment schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PaymentInitiate(BaseModel):
    amount: float
    purpose: str = "tuition_fee"
    description: Optional[str] = None
    student_id: Optional[int] = None
    fee_assignment_id: Optional[int] = None
    payer_name: Optional[str] = None
    payer_email: Optional[str] = None
    payer_phone: Optional[str] = None
    payment_method: str = "upi"
    currency: str = "INR"


class PaymentVerify(BaseModel):
    order_id: str
    payment_id: str
    signature: str


class PaymentRefundRequest(BaseModel):
    transaction_id: int
    amount: Optional[float] = None        # None = full refund
    reason: str = "Requested by admin"


class PaymentTransactionResponse(BaseModel):
    id: int
    tenant_id: str
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    payment_method: str
    purpose: str
    description: Optional[str] = None
    upi_id: Optional[str] = None
    payer_user_id: Optional[int] = None
    student_id: Optional[int] = None
    payer_name: Optional[str] = None
    payer_email: Optional[str] = None
    payer_phone: Optional[str] = None
    fee_assignment_id: Optional[int] = None
    receipt_number: Optional[str] = None
    receipt_generated: bool = False
    refund_id: Optional[str] = None
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    refund_status: Optional[str] = None
    refunded_at: Optional[datetime] = None
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    paid_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    transactions: List[PaymentTransactionResponse]
    total: int


class PaymentStats(BaseModel):
    total_collected: float
    total_pending: float
    total_refunded: float
    total_transactions: int
    completed_count: int
    failed_count: int
    refunded_count: int
    by_method: List[dict]
    by_purpose: List[dict]
    recent_transactions: List[PaymentTransactionResponse]


class PaymentReceipt(BaseModel):
    receipt_number: str
    transaction_id: int
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    purpose: str
    payer_name: Optional[str] = None
    student_id: Optional[int] = None
    paid_at: Optional[datetime] = None
    school_name: str = "PreSkool"
