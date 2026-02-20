"""
Reports schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class ReportRequest(BaseModel):
    report_type: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    class_id: Optional[int] = None
    student_id: Optional[int] = None
    teacher_id: Optional[int] = None
    subject_id: Optional[int] = None
    format: str = "json"


class ReportResponse(BaseModel):
    id: int
    tenant_id: str
    title: str
    report_type: str
    format: str
    status: str
    parameters: Optional[dict] = None
    summary: Optional[str] = None
    record_count: int
    generated_by: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int


class ReportDataResponse(BaseModel):
    title: str
    report_type: str
    generated_at: str
    parameters: dict
    summary: dict
    columns: List[str]
    data: List[dict]
    record_count: int


class DashboardStatsResponse(BaseModel):
    total_reports: int
    recent_reports: List[ReportResponse]
    available_report_types: List[dict]
