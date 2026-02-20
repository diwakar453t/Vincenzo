"""
Library Management service
"""
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.library import Book, LibraryMember, IssueReturn, BookStatus, IssueStatus, MembershipStatus
import uuid


class LibraryService:
    def __init__(self, db: Session):
        self.db = db

    # ─── Books CRUD ──────────────────────────────────────────────────────

    def get_books(self, tenant_id: str, category: str = None, search: str = None,
                  status: str = None, is_active: bool = None, skip: int = 0, limit: int = 100):
        q = self.db.query(Book).filter(Book.tenant_id == tenant_id)
        if category:
            q = q.filter(Book.category == category)
        if status:
            q = q.filter(Book.status == status)
        if is_active is not None:
            q = q.filter(Book.is_active == is_active)
        if search:
            pattern = f"%{search}%"
            q = q.filter(or_(
                Book.title.ilike(pattern),
                Book.author.ilike(pattern),
                Book.isbn.ilike(pattern),
                Book.publisher.ilike(pattern),
                Book.subject.ilike(pattern),
            ))
        total = q.count()
        books = q.order_by(Book.title).offset(skip).limit(limit).all()
        return [self._book_dict(b) for b in books], total

    def create_book(self, data: dict, tenant_id: str):
        book = Book(**data, tenant_id=tenant_id, available_copies=data.get("total_copies", 1))
        self.db.add(book)
        self.db.commit()
        self.db.refresh(book)
        return self._book_dict(book)

    def update_book(self, book_id: int, data: dict, tenant_id: str):
        book = self.db.query(Book).filter(Book.id == book_id, Book.tenant_id == tenant_id).first()
        if not book:
            raise ValueError("Book not found")
        for k, v in data.items():
            if v is not None:
                setattr(book, k, v)
        # Recalculate available copies if total_copies changed
        if "total_copies" in data and data["total_copies"] is not None:
            issued = book.total_copies - book.available_copies
            book.available_copies = max(0, data["total_copies"] - issued)
        self.db.commit()
        self.db.refresh(book)
        return self._book_dict(book)

    def delete_book(self, book_id: int, tenant_id: str):
        book = self.db.query(Book).filter(Book.id == book_id, Book.tenant_id == tenant_id).first()
        if not book:
            raise ValueError("Book not found")
        self.db.delete(book)
        self.db.commit()

    def _book_dict(self, b: Book) -> dict:
        return {
            "id": b.id, "tenant_id": b.tenant_id, "title": b.title, "isbn": b.isbn,
            "author": b.author, "publisher": b.publisher, "edition": b.edition,
            "category": b.category, "subject": b.subject, "language": b.language,
            "pages": b.pages, "price": b.price, "rack_number": b.rack_number,
            "total_copies": b.total_copies, "available_copies": b.available_copies,
            "description": b.description, "cover_image": b.cover_image,
            "publication_year": b.publication_year,
            "status": b.status.value if hasattr(b.status, 'value') else str(b.status),
            "is_active": b.is_active,
            "created_at": b.created_at, "updated_at": b.updated_at,
        }

    # ─── Members CRUD ────────────────────────────────────────────────────

    def get_members(self, tenant_id: str, member_type: str = None, status: str = None,
                    search: str = None, skip: int = 0, limit: int = 100):
        q = self.db.query(LibraryMember).filter(LibraryMember.tenant_id == tenant_id)
        if member_type:
            q = q.filter(LibraryMember.member_type == member_type)
        if status:
            q = q.filter(LibraryMember.status == status)
        if search:
            pattern = f"%{search}%"
            q = q.filter(or_(
                LibraryMember.name.ilike(pattern),
                LibraryMember.member_code.ilike(pattern),
                LibraryMember.email.ilike(pattern),
            ))
        total = q.count()
        members = q.order_by(LibraryMember.name).offset(skip).limit(limit).all()
        return [self._member_dict(m) for m in members], total

    def create_member(self, data: dict, tenant_id: str):
        code = f"LIB-{uuid.uuid4().hex[:6].upper()}"
        member = LibraryMember(**data, tenant_id=tenant_id, member_code=code)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return self._member_dict(member)

    def update_member(self, member_id: int, data: dict, tenant_id: str):
        member = self.db.query(LibraryMember).filter(
            LibraryMember.id == member_id, LibraryMember.tenant_id == tenant_id
        ).first()
        if not member:
            raise ValueError("Member not found")
        for k, v in data.items():
            if v is not None:
                setattr(member, k, v)
        self.db.commit()
        self.db.refresh(member)
        return self._member_dict(member)

    def delete_member(self, member_id: int, tenant_id: str):
        member = self.db.query(LibraryMember).filter(
            LibraryMember.id == member_id, LibraryMember.tenant_id == tenant_id
        ).first()
        if not member:
            raise ValueError("Member not found")
        if member.books_issued > 0:
            raise ValueError("Cannot delete member with issued books")
        self.db.delete(member)
        self.db.commit()

    def _member_dict(self, m: LibraryMember) -> dict:
        return {
            "id": m.id, "tenant_id": m.tenant_id, "member_code": m.member_code,
            "member_type": m.member_type.value if hasattr(m.member_type, 'value') else str(m.member_type),
            "student_id": m.student_id, "teacher_id": m.teacher_id,
            "name": m.name, "email": m.email, "phone": m.phone,
            "max_books_allowed": m.max_books_allowed,
            "membership_start": str(m.membership_start) if m.membership_start else None,
            "membership_end": str(m.membership_end) if m.membership_end else None,
            "status": m.status.value if hasattr(m.status, 'value') else str(m.status),
            "books_issued": m.books_issued,
            "created_at": m.created_at, "updated_at": m.updated_at,
        }

    # ─── Issue Book ──────────────────────────────────────────────────────

    def issue_book(self, data: dict, tenant_id: str):
        book = self.db.query(Book).filter(Book.id == data["book_id"], Book.tenant_id == tenant_id).first()
        if not book:
            raise ValueError("Book not found")
        if book.available_copies <= 0:
            raise ValueError("No copies available")

        member = self.db.query(LibraryMember).filter(
            LibraryMember.id == data["member_id"], LibraryMember.tenant_id == tenant_id
        ).first()
        if not member:
            raise ValueError("Member not found")
        if member.status != MembershipStatus.active:
            raise ValueError("Member is not active")
        if member.books_issued >= member.max_books_allowed:
            raise ValueError(f"Member has reached max limit ({member.max_books_allowed} books)")

        issue_date = date.fromisoformat(data["issue_date"]) if data.get("issue_date") else date.today()
        due_date = date.fromisoformat(data["due_date"]) if data.get("due_date") else issue_date + timedelta(days=14)

        issue = IssueReturn(
            book_id=book.id, member_id=member.id,
            issue_date=issue_date, due_date=due_date,
            status=IssueStatus.issued, tenant_id=tenant_id,
            remarks=data.get("remarks"),
        )
        self.db.add(issue)

        book.available_copies -= 1
        if book.available_copies == 0:
            book.status = BookStatus.issued
        member.books_issued += 1

        self.db.commit()
        self.db.refresh(issue)
        return self._issue_dict(issue)

    # ─── Return Book ─────────────────────────────────────────────────────

    def return_book(self, issue_id: int, data: dict, tenant_id: str):
        issue = self.db.query(IssueReturn).filter(
            IssueReturn.id == issue_id, IssueReturn.tenant_id == tenant_id
        ).first()
        if not issue:
            raise ValueError("Issue record not found")
        if issue.status == IssueStatus.returned:
            raise ValueError("Book already returned")

        return_date = date.fromisoformat(data["return_date"]) if data.get("return_date") else date.today()
        issue.return_date = return_date
        issue.status = IssueStatus.returned

        # Calculate fine
        if return_date > issue.due_date:
            overdue_days = (return_date - issue.due_date).days
            issue.fine_amount = overdue_days * issue.fine_per_day

        if data.get("remarks"):
            issue.remarks = data["remarks"]

        # Update book & member
        book = self.db.query(Book).filter(Book.id == issue.book_id).first()
        if book:
            book.available_copies += 1
            if book.available_copies > 0:
                book.status = BookStatus.available

        member = self.db.query(LibraryMember).filter(LibraryMember.id == issue.member_id).first()
        if member and member.books_issued > 0:
            member.books_issued -= 1

        self.db.commit()
        self.db.refresh(issue)
        return self._issue_dict(issue)

    # ─── Get Issues ──────────────────────────────────────────────────────

    def get_issues(self, tenant_id: str, member_id: int = None, book_id: int = None,
                   status: str = None, skip: int = 0, limit: int = 100):
        q = self.db.query(IssueReturn).filter(IssueReturn.tenant_id == tenant_id)
        if member_id:
            q = q.filter(IssueReturn.member_id == member_id)
        if book_id:
            q = q.filter(IssueReturn.book_id == book_id)
        if status:
            q = q.filter(IssueReturn.status == status)
        total = q.count()
        issues = q.order_by(IssueReturn.issue_date.desc()).offset(skip).limit(limit).all()
        return [self._issue_dict(i) for i in issues], total

    # ─── Overdue Books ───────────────────────────────────────────────────

    def get_overdue_books(self, tenant_id: str):
        today = date.today()
        issues = self.db.query(IssueReturn).filter(
            IssueReturn.tenant_id == tenant_id,
            IssueReturn.status == IssueStatus.issued,
            IssueReturn.due_date < today,
        ).all()

        # Update status to overdue
        for issue in issues:
            if issue.status != IssueStatus.overdue:
                issue.status = IssueStatus.overdue

        if issues:
            self.db.commit()

        results = []
        for issue in issues:
            days_overdue = (today - issue.due_date).days
            fine = days_overdue * issue.fine_per_day
            book = self.db.query(Book).filter(Book.id == issue.book_id).first()
            member = self.db.query(LibraryMember).filter(LibraryMember.id == issue.member_id).first()
            results.append({
                "issue_id": issue.id,
                "book_title": book.title if book else "Unknown",
                "member_name": member.name if member else "Unknown",
                "member_code": member.member_code if member else None,
                "issue_date": str(issue.issue_date),
                "due_date": str(issue.due_date),
                "days_overdue": days_overdue,
                "fine_amount": fine,
            })

        return results, len(results)

    # ─── Calculate Fine ──────────────────────────────────────────────────

    def calculate_fine(self, issue_id: int, tenant_id: str):
        issue = self.db.query(IssueReturn).filter(
            IssueReturn.id == issue_id, IssueReturn.tenant_id == tenant_id
        ).first()
        if not issue:
            raise ValueError("Issue record not found")

        if issue.status == IssueStatus.returned:
            return {"fine_amount": issue.fine_amount, "fine_paid": issue.fine_paid, "days_overdue": 0}

        today = date.today()
        if today > issue.due_date:
            days = (today - issue.due_date).days
            return {"fine_amount": days * issue.fine_per_day, "fine_paid": False, "days_overdue": days}
        return {"fine_amount": 0, "fine_paid": False, "days_overdue": 0}

    def pay_fine(self, issue_id: int, tenant_id: str):
        issue = self.db.query(IssueReturn).filter(
            IssueReturn.id == issue_id, IssueReturn.tenant_id == tenant_id
        ).first()
        if not issue:
            raise ValueError("Issue record not found")
        issue.fine_paid = True
        self.db.commit()
        self.db.refresh(issue)
        return self._issue_dict(issue)

    # ─── Library Stats ───────────────────────────────────────────────────

    def get_stats(self, tenant_id: str):
        total_books = self.db.query(Book).filter(Book.tenant_id == tenant_id, Book.is_active == True).count()
        total_copies = self.db.query(func.sum(Book.total_copies)).filter(
            Book.tenant_id == tenant_id, Book.is_active == True).scalar() or 0
        available = self.db.query(func.sum(Book.available_copies)).filter(
            Book.tenant_id == tenant_id, Book.is_active == True).scalar() or 0
        total_members = self.db.query(LibraryMember).filter(LibraryMember.tenant_id == tenant_id).count()
        active_members = self.db.query(LibraryMember).filter(
            LibraryMember.tenant_id == tenant_id, LibraryMember.status == MembershipStatus.active).count()

        total_issued = self.db.query(IssueReturn).filter(
            IssueReturn.tenant_id == tenant_id, IssueReturn.status == IssueStatus.issued).count()
        total_returned = self.db.query(IssueReturn).filter(
            IssueReturn.tenant_id == tenant_id, IssueReturn.status == IssueStatus.returned).count()
        total_overdue = self.db.query(IssueReturn).filter(
            IssueReturn.tenant_id == tenant_id, IssueReturn.status == IssueStatus.overdue).count()

        total_fines = self.db.query(func.sum(IssueReturn.fine_amount)).filter(
            IssueReturn.tenant_id == tenant_id).scalar() or 0
        fines_collected = self.db.query(func.sum(IssueReturn.fine_amount)).filter(
            IssueReturn.tenant_id == tenant_id, IssueReturn.fine_paid == True).scalar() or 0

        # Category breakdown
        cats = self.db.query(Book.category, func.count(Book.id)).filter(
            Book.tenant_id == tenant_id, Book.is_active == True, Book.category.isnot(None)
        ).group_by(Book.category).all()
        category_breakdown = {c: n for c, n in cats}

        return {
            "total_books": total_books, "total_copies": int(total_copies),
            "available_copies": int(available), "issued_copies": int(total_copies) - int(available),
            "total_members": total_members, "active_members": active_members,
            "total_issued": total_issued, "total_returned": total_returned,
            "total_overdue": total_overdue,
            "total_fines": float(total_fines), "fines_collected": float(fines_collected),
            "fines_pending": float(total_fines) - float(fines_collected),
            "category_breakdown": category_breakdown,
        }

    def _issue_dict(self, i: IssueReturn) -> dict:
        book = self.db.query(Book).filter(Book.id == i.book_id).first()
        member = self.db.query(LibraryMember).filter(LibraryMember.id == i.member_id).first()
        return {
            "id": i.id, "tenant_id": i.tenant_id,
            "book_id": i.book_id, "book_title": book.title if book else None,
            "book_isbn": book.isbn if book else None,
            "member_id": i.member_id, "member_name": member.name if member else None,
            "member_code": member.member_code if member else None,
            "issue_date": str(i.issue_date), "due_date": str(i.due_date),
            "return_date": str(i.return_date) if i.return_date else None,
            "status": i.status.value if hasattr(i.status, 'value') else str(i.status),
            "fine_amount": i.fine_amount, "fine_paid": i.fine_paid,
            "fine_per_day": i.fine_per_day, "remarks": i.remarks,
            "created_at": i.created_at, "updated_at": i.updated_at,
        }
