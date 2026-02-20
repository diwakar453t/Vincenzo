"""
Library Management models
"""
import enum
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class BookStatus(str, enum.Enum):
    available = "available"
    issued = "issued"
    reserved = "reserved"
    lost = "lost"
    damaged = "damaged"
    withdrawn = "withdrawn"


class MemberType(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    staff = "staff"


class MembershipStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    expired = "expired"


class IssueStatus(str, enum.Enum):
    issued = "issued"
    returned = "returned"
    overdue = "overdue"
    lost = "lost"


class Book(BaseModel):
    __tablename__ = "books"

    title = Column(String(255), nullable=False)
    isbn = Column(String(20), nullable=True)
    author = Column(String(200), nullable=False)
    publisher = Column(String(200), nullable=True)
    edition = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    subject = Column(String(100), nullable=True)
    language = Column(String(50), nullable=True, default="English")
    pages = Column(Integer, nullable=True)
    price = Column(Float, nullable=True, default=0)
    rack_number = Column(String(20), nullable=True)
    total_copies = Column(Integer, nullable=False, default=1)
    available_copies = Column(Integer, nullable=False, default=1)
    description = Column(Text, nullable=True)
    cover_image = Column(String(500), nullable=True)
    publication_year = Column(Integer, nullable=True)
    status = Column(Enum(BookStatus), nullable=False, default=BookStatus.available)
    is_active = Column(Boolean, default=True, nullable=False)

    issues = relationship("IssueReturn", back_populates="book", lazy="dynamic")

    def __repr__(self):
        return f"<Book(title={self.title}, author={self.author})>"


class LibraryMember(BaseModel):
    __tablename__ = "library_members"

    member_code = Column(String(30), nullable=True)
    member_type = Column(Enum(MemberType), nullable=False, default=MemberType.student)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    max_books_allowed = Column(Integer, nullable=False, default=3)
    membership_start = Column(Date, nullable=True)
    membership_end = Column(Date, nullable=True)
    status = Column(Enum(MembershipStatus), nullable=False, default=MembershipStatus.active)
    books_issued = Column(Integer, nullable=False, default=0)

    issues = relationship("IssueReturn", back_populates="member", lazy="dynamic")

    def __repr__(self):
        return f"<LibraryMember(name={self.name}, type={self.member_type})>"


class IssueReturn(BaseModel):
    __tablename__ = "issue_returns"

    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    member_id = Column(Integer, ForeignKey("library_members.id", ondelete="CASCADE"), nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)
    status = Column(Enum(IssueStatus), nullable=False, default=IssueStatus.issued)
    fine_amount = Column(Float, nullable=False, default=0)
    fine_paid = Column(Boolean, default=False, nullable=False)
    fine_per_day = Column(Float, nullable=False, default=2.0)
    remarks = Column(Text, nullable=True)

    book = relationship("Book", back_populates="issues")
    member = relationship("LibraryMember", back_populates="issues")

    def __repr__(self):
        return f"<IssueReturn(book_id={self.book_id}, member_id={self.member_id}, status={self.status})>"
