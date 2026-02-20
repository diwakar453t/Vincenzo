"""
Library Management schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


# ─── Book ────────────────────────────────────────────────────────────────

class BookCreate(BaseModel):
    title: str
    isbn: Optional[str] = None
    author: str
    publisher: Optional[str] = None
    edition: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    language: Optional[str] = "English"
    pages: Optional[int] = None
    price: Optional[float] = 0
    rack_number: Optional[str] = None
    total_copies: int = 1
    description: Optional[str] = None
    cover_image: Optional[str] = None
    publication_year: Optional[int] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None
    isbn: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    edition: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    language: Optional[str] = None
    pages: Optional[int] = None
    price: Optional[float] = None
    rack_number: Optional[str] = None
    total_copies: Optional[int] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    publication_year: Optional[int] = None
    is_active: Optional[bool] = None


class BookResponse(BaseModel):
    id: int
    tenant_id: str
    title: str
    isbn: Optional[str] = None
    author: str
    publisher: Optional[str] = None
    edition: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    language: Optional[str] = None
    pages: Optional[int] = None
    price: Optional[float] = None
    rack_number: Optional[str] = None
    total_copies: int
    available_copies: int
    description: Optional[str] = None
    cover_image: Optional[str] = None
    publication_year: Optional[int] = None
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookListResponse(BaseModel):
    books: List[BookResponse]
    total: int


# ─── Library Member ──────────────────────────────────────────────────────

class MemberCreate(BaseModel):
    member_type: str = "student"
    student_id: Optional[int] = None
    teacher_id: Optional[int] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    max_books_allowed: int = 3
    membership_start: Optional[str] = None
    membership_end: Optional[str] = None


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    max_books_allowed: Optional[int] = None
    membership_start: Optional[str] = None
    membership_end: Optional[str] = None
    status: Optional[str] = None


class MemberResponse(BaseModel):
    id: int
    tenant_id: str
    member_code: Optional[str] = None
    member_type: str
    student_id: Optional[int] = None
    teacher_id: Optional[int] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    max_books_allowed: int
    membership_start: Optional[str] = None
    membership_end: Optional[str] = None
    status: str
    books_issued: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MemberListResponse(BaseModel):
    members: List[MemberResponse]
    total: int


# ─── Issue / Return ──────────────────────────────────────────────────────

class IssueBookRequest(BaseModel):
    book_id: int
    member_id: int
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    remarks: Optional[str] = None


class ReturnBookRequest(BaseModel):
    return_date: Optional[str] = None
    remarks: Optional[str] = None


class IssueReturnResponse(BaseModel):
    id: int
    tenant_id: str
    book_id: int
    book_title: Optional[str] = None
    book_isbn: Optional[str] = None
    member_id: int
    member_name: Optional[str] = None
    member_code: Optional[str] = None
    issue_date: str
    due_date: str
    return_date: Optional[str] = None
    status: str
    fine_amount: float
    fine_paid: bool
    fine_per_day: float
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IssueReturnListResponse(BaseModel):
    issues: List[IssueReturnResponse]
    total: int


# ─── Reports ─────────────────────────────────────────────────────────────

class OverdueItem(BaseModel):
    issue_id: int
    book_title: str
    member_name: str
    member_code: Optional[str] = None
    issue_date: str
    due_date: str
    days_overdue: int
    fine_amount: float


class OverdueListResponse(BaseModel):
    overdue_items: List[OverdueItem]
    total: int


class LibraryStatsResponse(BaseModel):
    total_books: int
    total_copies: int
    available_copies: int
    issued_copies: int
    total_members: int
    active_members: int
    total_issued: int
    total_returned: int
    total_overdue: int
    total_fines: float
    fines_collected: float
    fines_pending: float
    category_breakdown: dict
