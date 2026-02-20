"""
Reports model
"""
import enum
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, Enum, JSON
from app.models.base import BaseModel


class ReportType(str, enum.Enum):
    student_attendance = "student_attendance"
    staff_attendance = "staff_attendance"
    academic_performance = "academic_performance"
    financial_summary = "financial_summary"
    fee_collection = "fee_collection"
    custom = "custom"


class ReportFormat(str, enum.Enum):
    json = "json"
    csv = "csv"
    excel = "excel"
    pdf = "pdf"


class ReportStatus(str, enum.Enum):
    generated = "generated"
    saved = "saved"
    archived = "archived"


class Report(BaseModel):
    __tablename__ = "reports"

    title = Column(String(300), nullable=False)
    report_type = Column(Enum(ReportType), nullable=False)
    format = Column(Enum(ReportFormat), nullable=False, default=ReportFormat.json)
    status = Column(Enum(ReportStatus), nullable=False, default=ReportStatus.generated)
    parameters = Column(JSON, nullable=True)   # stored filter params
    summary = Column(Text, nullable=True)
    record_count = Column(Integer, nullable=False, default=0)
    generated_by = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<Report(title={self.title}, type={self.report_type})>"
