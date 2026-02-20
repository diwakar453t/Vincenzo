"""
Library Management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.library import (
    BookCreate, BookUpdate, BookResponse, BookListResponse,
    MemberCreate, MemberUpdate, MemberResponse, MemberListResponse,
    IssueBookRequest, ReturnBookRequest, IssueReturnResponse, IssueReturnListResponse,
    OverdueListResponse, LibraryStatsResponse,
)
from app.services.library_service import LibraryService

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _require_admin(user: User):
    if user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


# ═══════════════════════════════════════════════════════════════════════
# Books
# ═══════════════════════════════════════════════════════════════════════

@router.get("/books", response_model=BookListResponse)
def list_books(
    category: Optional[str] = None, search: Optional[str] = None,
    status: Optional[str] = None, is_active: Optional[bool] = None,
    skip: int = 0, limit: int = 100,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    svc = LibraryService(db)
    books, total = svc.get_books(user.tenant_id, category=category, search=search,
                                  status=status, is_active=is_active, skip=skip, limit=limit)
    return BookListResponse(books=[BookResponse(**b) for b in books], total=total)


@router.post("/books", response_model=BookResponse)
def create_book(data: BookCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    return BookResponse(**LibraryService(db).create_book(data.model_dump(), user.tenant_id))


@router.put("/books/{book_id}", response_model=BookResponse)
def update_book(book_id: int, data: BookUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return BookResponse(**LibraryService(db).update_book(book_id, data.model_dump(exclude_unset=True), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/books/{book_id}")
def delete_book(book_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        LibraryService(db).delete_book(book_id, user.tenant_id)
        return {"message": "Book deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Members
# ═══════════════════════════════════════════════════════════════════════

@router.get("/members", response_model=MemberListResponse)
def list_members(
    member_type: Optional[str] = None, status: Optional[str] = None,
    search: Optional[str] = None, skip: int = 0, limit: int = 100,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    members, total = LibraryService(db).get_members(user.tenant_id, member_type=member_type,
                                                     status=status, search=search, skip=skip, limit=limit)
    return MemberListResponse(members=[MemberResponse(**m) for m in members], total=total)


@router.post("/members", response_model=MemberResponse)
def create_member(data: MemberCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    return MemberResponse(**LibraryService(db).create_member(data.model_dump(), user.tenant_id))


@router.put("/members/{mid}", response_model=MemberResponse)
def update_member(mid: int, data: MemberUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return MemberResponse(**LibraryService(db).update_member(mid, data.model_dump(exclude_unset=True), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/members/{mid}")
def delete_member(mid: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        LibraryService(db).delete_member(mid, user.tenant_id)
        return {"message": "Member deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Issue / Return
# ═══════════════════════════════════════════════════════════════════════

@router.post("/issue", response_model=IssueReturnResponse)
def issue_book(data: IssueBookRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return IssueReturnResponse(**LibraryService(db).issue_book(data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/return/{issue_id}", response_model=IssueReturnResponse)
def return_book(issue_id: int, data: ReturnBookRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return IssueReturnResponse(**LibraryService(db).return_book(issue_id, data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/issues", response_model=IssueReturnListResponse)
def list_issues(
    member_id: Optional[int] = None, book_id: Optional[int] = None,
    status: Optional[str] = None, skip: int = 0, limit: int = 100,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    issues, total = LibraryService(db).get_issues(user.tenant_id, member_id=member_id,
                                                   book_id=book_id, status=status, skip=skip, limit=limit)
    return IssueReturnListResponse(issues=[IssueReturnResponse(**i) for i in issues], total=total)


# ═══════════════════════════════════════════════════════════════════════
# Overdue & Fines
# ═══════════════════════════════════════════════════════════════════════

@router.get("/overdue", response_model=OverdueListResponse)
def get_overdue(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    items, total = LibraryService(db).get_overdue_books(user.tenant_id)
    return OverdueListResponse(overdue_items=items, total=total)


@router.get("/fine/{issue_id}")
def calculate_fine(issue_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    try:
        return LibraryService(db).calculate_fine(issue_id, user.tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/fine/{issue_id}/pay", response_model=IssueReturnResponse)
def pay_fine(issue_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return IssueReturnResponse(**LibraryService(db).pay_fine(issue_id, user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Stats
# ═══════════════════════════════════════════════════════════════════════

@router.get("/stats", response_model=LibraryStatsResponse)
def library_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return LibraryStatsResponse(**LibraryService(db).get_stats(user.tenant_id))
