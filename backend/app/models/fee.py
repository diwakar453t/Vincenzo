import enum
from sqlalchemy import Column, Integer, String, Float, Date, Enum, ForeignKey, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class PaymentStatus(str, enum.Enum):
    PAID = "paid"
    PARTIAL = "partial"
    UNPAID = "unpaid"
    OVERDUE = "overdue"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CHEQUE = "cheque"
    ONLINE = "online"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"


class FeeGroup(BaseModel):
    """Fee groups like Tuition, Hostel, Transport etc."""

    __tablename__ = "fee_groups"

    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    fee_types = relationship("FeeType", back_populates="fee_group", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FeeGroup({self.name})>"


class FeeType(BaseModel):
    """Specific fee types within a group."""

    __tablename__ = "fee_types"

    fee_group_id = Column(Integer, ForeignKey("fee_groups.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    amount = Column(Float, nullable=False, default=0)
    due_date = Column(Date, nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)
    frequency = Column(String(20), nullable=True)  # monthly, quarterly, yearly
    academic_year = Column(String(20), nullable=False, default="2025-26")
    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)

    fee_group = relationship("FeeGroup", back_populates="fee_types")
    class_ref = relationship("Class", backref="fee_types")
    collections = relationship("FeeCollection", back_populates="fee_type")

    def __repr__(self):
        return f"<FeeType({self.name}, amount={self.amount})>"


class StudentFeeAssignment(BaseModel):
    """Fee assignment to individual students."""

    __tablename__ = "student_fee_assignments"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    fee_type_id = Column(Integer, ForeignKey("fee_types.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False, default=0)          # actual amount (can differ from fee_type)
    discount = Column(Float, nullable=False, default=0)
    net_amount = Column(Float, nullable=False, default=0)      # amount - discount
    paid_amount = Column(Float, nullable=False, default=0)
    balance = Column(Float, nullable=False, default=0)         # net_amount - paid_amount
    status = Column(Enum(PaymentStatus), default=PaymentStatus.UNPAID, nullable=False)
    due_date = Column(Date, nullable=True)
    academic_year = Column(String(20), nullable=False, default="2025-26")

    student = relationship("Student", backref="fee_assignments")
    fee_type = relationship("FeeType")

    def __repr__(self):
        return f"<StudentFeeAssignment(student={self.student_id}, fee={self.fee_type_id}, balance={self.balance})>"


class FeeCollection(BaseModel):
    """Payment records for fee collections."""

    __tablename__ = "fee_collections"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    fee_type_id = Column(Integer, ForeignKey("fee_types.id", ondelete="CASCADE"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("student_fee_assignments.id", ondelete="SET NULL"), nullable=True)
    receipt_number = Column(String(50), nullable=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.CASH, nullable=False)
    payment_date = Column(Date, nullable=False)
    transaction_id = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    academic_year = Column(String(20), nullable=False, default="2025-26")

    student = relationship("Student", backref="fee_payments")
    fee_type = relationship("FeeType", back_populates="collections")
    assignment = relationship("StudentFeeAssignment", backref="payments")

    def __repr__(self):
        return f"<FeeCollection(student={self.student_id}, amount={self.amount}, receipt={self.receipt_number})>"
