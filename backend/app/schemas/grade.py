from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── GradeCategory Schemas ─────────────────────────────────────────────

class GradeCategoryBase(BaseModel):
    name: str = Field(..., max_length=20)
    min_percentage: float
    max_percentage: float
    grade_point: float
    description: Optional[str] = Field(None, max_length=100)
    is_passing: bool = True
    order: int = 0


class GradeCategoryCreate(GradeCategoryBase):
    pass


class GradeCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=20)
    min_percentage: Optional[float] = None
    max_percentage: Optional[float] = None
    grade_point: Optional[float] = None
    description: Optional[str] = Field(None, max_length=100)
    is_passing: Optional[bool] = None
    order: Optional[int] = None


class GradeCategoryResponse(GradeCategoryBase):
    id: int
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GradeCategoryListResponse(BaseModel):
    categories: List[GradeCategoryResponse]


# ─── Grade Schemas ─────────────────────────────────────────────────────

class GradeBase(BaseModel):
    student_id: int
    exam_id: int
    subject_id: int
    class_id: int
    academic_year: str = Field(..., max_length=20)
    marks_obtained: float
    max_marks: float = 100
    remarks: Optional[str] = None


class GradeCreate(GradeBase):
    pass


class GradeBulkEntry(BaseModel):
    """Bulk grade entry for one exam + subject (multiple students)."""
    exam_id: int
    subject_id: int
    class_id: int
    academic_year: str = Field(..., max_length=20)
    max_marks: float = 100
    grades: List[dict]  # [{ student_id, marks_obtained, remarks? }]


class GradeUpdate(BaseModel):
    marks_obtained: Optional[float] = None
    max_marks: Optional[float] = None
    remarks: Optional[str] = None


class GradeResponse(GradeBase):
    id: int
    tenant_id: str
    percentage: Optional[float] = None
    grade_name: Optional[str] = None
    grade_point: Optional[float] = None
    student_name: Optional[str] = None
    exam_name: Optional[str] = None
    subject_name: Optional[str] = None
    class_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GradeListResponse(BaseModel):
    grades: List[GradeResponse]
    total: int


# ─── GPA / Report Card ────────────────────────────────────────────────

class SubjectGrade(BaseModel):
    subject_id: int
    subject_name: str
    marks_obtained: float
    max_marks: float
    percentage: float
    grade_name: Optional[str] = None
    grade_point: Optional[float] = None
    remarks: Optional[str] = None


class StudentGPA(BaseModel):
    student_id: int
    student_name: str
    exam_id: int
    exam_name: str
    class_name: Optional[str] = None
    academic_year: str
    subjects: List[SubjectGrade]
    total_marks_obtained: float
    total_max_marks: float
    overall_percentage: float
    gpa: float
    grade: Optional[str] = None
    result: str  # "Pass" or "Fail"


class ReportCardResponse(BaseModel):
    student_id: int
    student_name: str
    admission_number: Optional[str] = None
    class_name: Optional[str] = None
    academic_year: str
    exams: List[StudentGPA]
    cumulative_gpa: float
    cumulative_percentage: float
    overall_result: str
