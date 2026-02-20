import enum
from sqlalchemy import Column, Integer, String, Float, Date, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ComponentType(str, enum.Enum):
    EARNING = "earning"
    DEDUCTION = "deduction"


class PayrollStatus(str, enum.Enum):
    DRAFT = "draft"
    PROCESSED = "processed"
    APPROVED = "approved"
    PAID = "paid"


class PayrollComponent(BaseModel):
    """Salary components like Basic, HRA, PF, Tax etc."""

    __tablename__ = "payroll_components"

    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    component_type = Column(Enum(ComponentType), nullable=False)
    is_percentage = Column(Boolean, default=False, nullable=False)
    percentage_of = Column(String(50), nullable=True)  # e.g. "basic"
    default_amount = Column(Float, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)

    structure_items = relationship("SalaryStructureItem", back_populates="component")

    def __repr__(self):
        return f"<PayrollComponent({self.name}, {self.component_type})>"


class SalaryStructure(BaseModel):
    """Salary structure assigned to a teacher."""

    __tablename__ = "salary_structures"

    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, unique=True)
    gross_salary = Column(Float, nullable=False, default=0)
    net_salary = Column(Float, nullable=False, default=0)
    effective_from = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    teacher = relationship("Teacher", backref="salary_structure")
    items = relationship("SalaryStructureItem", back_populates="structure", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SalaryStructure(teacher={self.teacher_id}, gross={self.gross_salary})>"


class SalaryStructureItem(BaseModel):
    """Individual component amount in a salary structure."""

    __tablename__ = "salary_structure_items"

    structure_id = Column(Integer, ForeignKey("salary_structures.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(Integer, ForeignKey("payroll_components.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False, default=0)

    structure = relationship("SalaryStructure", back_populates="items")
    component = relationship("PayrollComponent", back_populates="structure_items")

    def __repr__(self):
        return f"<SalaryStructureItem(component={self.component_id}, amount={self.amount})>"


class Payroll(BaseModel):
    """Monthly payroll run for a teacher."""

    __tablename__ = "payrolls"

    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    working_days = Column(Integer, default=30, nullable=False)
    present_days = Column(Float, default=30, nullable=False)
    gross_salary = Column(Float, nullable=False, default=0)
    total_earnings = Column(Float, nullable=False, default=0)
    total_deductions = Column(Float, nullable=False, default=0)
    net_salary = Column(Float, nullable=False, default=0)
    status = Column(Enum(PayrollStatus), default=PayrollStatus.DRAFT, nullable=False)
    remarks = Column(Text, nullable=True)
    paid_date = Column(Date, nullable=True)

    teacher = relationship("Teacher", backref="payrolls")
    items = relationship("PayrollItem", back_populates="payroll", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Payroll(teacher={self.teacher_id}, {self.month}/{self.year}, net={self.net_salary})>"


class PayrollItem(BaseModel):
    """Individual line item in a payroll."""

    __tablename__ = "payroll_items"

    payroll_id = Column(Integer, ForeignKey("payrolls.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(Integer, ForeignKey("payroll_components.id", ondelete="CASCADE"), nullable=False)
    component_name = Column(String(100), nullable=False)
    component_type = Column(Enum(ComponentType), nullable=False)
    amount = Column(Float, nullable=False, default=0)

    payroll = relationship("Payroll", back_populates="items")
    component = relationship("PayrollComponent")

    def __repr__(self):
        return f"<PayrollItem({self.component_name}, {self.amount})>"
