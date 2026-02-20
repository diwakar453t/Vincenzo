"""
Payment models — transactions, receipts, refunds
"""
import enum
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class PaymentStatus(str, enum.Enum):
    initiated = "initiated"
    pending = "pending"
    authorized = "authorized"
    captured = "captured"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"
    partially_refunded = "partially_refunded"
    cancelled = "cancelled"


class PaymentMethod(str, enum.Enum):
    upi = "upi"
    card = "card"
    netbanking = "netbanking"
    wallet = "wallet"
    bank_transfer = "bank_transfer"
    cash = "cash"
    cheque = "cheque"


class PaymentPurpose(str, enum.Enum):
    tuition_fee = "tuition_fee"
    exam_fee = "exam_fee"
    transport_fee = "transport_fee"
    hostel_fee = "hostel_fee"
    library_fine = "library_fine"
    admission_fee = "admission_fee"
    sports_fee = "sports_fee"
    lab_fee = "lab_fee"
    other = "other"


class PaymentTransaction(BaseModel):
    __tablename__ = "payment_transactions"

    # Gateway fields
    order_id = Column(String(100), nullable=True, unique=True)       # Razorpay order_id
    payment_id = Column(String(100), nullable=True, unique=True)     # Razorpay payment_id
    gateway_signature = Column(String(300), nullable=True)           # Payment verification signature

    # Transaction details
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.initiated, nullable=False)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.upi, nullable=False)
    purpose = Column(Enum(PaymentPurpose), default=PaymentPurpose.tuition_fee, nullable=False)
    description = Column(Text, nullable=True)

    # UPI specific
    upi_id = Column(String(100), nullable=True)                     # payer UPI ID (e.g. user@paytm)
    upi_transaction_id = Column(String(100), nullable=True)

    # Payer/student info
    payer_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True)
    payer_name = Column(String(200), nullable=True)
    payer_email = Column(String(255), nullable=True)
    payer_phone = Column(String(20), nullable=True)

    # Fee linkage
    fee_assignment_id = Column(Integer, nullable=True)              # links to student_fee_assignments

    # Receipt
    receipt_number = Column(String(50), nullable=True, unique=True)
    receipt_generated = Column(Boolean, default=False, nullable=False)
    receipt_url = Column(String(500), nullable=True)

    # Refund tracking
    refund_id = Column(String(100), nullable=True)
    refund_amount = Column(Float, nullable=True)
    refund_reason = Column(Text, nullable=True)
    refund_status = Column(String(30), nullable=True)
    refunded_at = Column(DateTime, nullable=True)

    # Gateway response (full JSON)
    gateway_response = Column(JSON, nullable=True)
    error_code = Column(String(50), nullable=True)
    error_description = Column(Text, nullable=True)

    # Timestamps
    paid_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    payer = relationship("User", backref="payments", foreign_keys=[payer_user_id])

    def __repr__(self):
        return f"<PaymentTransaction(order={self.order_id}, amount={self.amount}, status={self.status})>"
