from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.services.syllabus_service import SyllabusService
from app.schemas.syllabus import (
    SyllabusCreate, SyllabusUpdate, SyllabusResponse,
    SyllabusListResponse, SyllabusListItem,
    SyllabusTopicCreate, SyllabusTopicUpdate, SyllabusTopicResponse,
    DocumentUploadResponse,
)
from app.models.user import User

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")


# ═══════════════════════════════════════════════════════════════════════════
# Syllabus endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=SyllabusListResponse)
def list_syllabi(
    subject_id: Optional[int] = None,
    class_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List syllabi with optional filters"""
    user = _get_user(current_user, db)
    service = SyllabusService(db)
    items, total = service.get_syllabi(user.tenant_id, subject_id, class_id, status, search)
    return SyllabusListResponse(
        syllabi=[SyllabusListItem(**item) for item in items],
        total=total,
    )


@router.get("/{syllabus_id}", response_model=SyllabusResponse)
def get_syllabus(
    syllabus_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single syllabus with all topics"""
    user = _get_user(current_user, db)
    service = SyllabusService(db)
    result = service.get_syllabus(syllabus_id, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return result


@router.post("/", response_model=SyllabusResponse, status_code=status.HTTP_201_CREATED)
def create_syllabus(
    data: SyllabusCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new syllabus"""
    user = _get_user(current_user, db)
    _require_admin(user)
    service = SyllabusService(db)
    try:
        syllabus = service.create_syllabus(data, user.tenant_id)
        detail = service.get_syllabus(syllabus.id, user.tenant_id)
        return detail
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{syllabus_id}", response_model=SyllabusResponse)
def update_syllabus(
    syllabus_id: int,
    data: SyllabusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a syllabus"""
    user = _get_user(current_user, db)
    _require_admin(user)
    service = SyllabusService(db)
    result = service.update_syllabus(syllabus_id, data, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return service.get_syllabus(syllabus_id, user.tenant_id)


@router.delete("/{syllabus_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_syllabus(
    syllabus_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a syllabus and all its topics"""
    user = _get_user(current_user, db)
    _require_admin(user)
    service = SyllabusService(db)
    if not service.delete_syllabus(syllabus_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════
# Topic endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{syllabus_id}/topics", response_model=SyllabusTopicResponse, status_code=status.HTTP_201_CREATED)
def add_topic(
    syllabus_id: int,
    data: SyllabusTopicCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a topic to a syllabus"""
    user = _get_user(current_user, db)
    _require_admin(user)
    service = SyllabusService(db)
    try:
        topic = service.add_topic(syllabus_id, data, user.tenant_id)
        return SyllabusTopicResponse.model_validate(topic)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/topics/{topic_id}", response_model=SyllabusTopicResponse)
def update_topic(
    topic_id: int,
    data: SyllabusTopicUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a topic"""
    user = _get_user(current_user, db)
    _require_admin(user)
    service = SyllabusService(db)
    topic = service.update_topic(topic_id, data, user.tenant_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return SyllabusTopicResponse.model_validate(topic)


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(
    topic_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a topic"""
    user = _get_user(current_user, db)
    _require_admin(user)
    service = SyllabusService(db)
    if not service.delete_topic(topic_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Topic not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/topics/{topic_id}/toggle", response_model=SyllabusTopicResponse)
def toggle_topic_completion(
    topic_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle a topic's completion status"""
    user = _get_user(current_user, db)
    service = SyllabusService(db)
    topic = service.toggle_topic_completion(topic_id, user.tenant_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return SyllabusTopicResponse.model_validate(topic)


# ═══════════════════════════════════════════════════════════════════════════
# Document upload endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/topics/{topic_id}/upload", response_model=DocumentUploadResponse)
async def upload_document(
    topic_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document for a topic"""
    user = _get_user(current_user, db)
    _require_admin(user)

    # Validate file size
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB")

    service = SyllabusService(db)
    topic = service.save_topic_document(topic_id, user.tenant_id, contents, file.filename or "document")
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    return DocumentUploadResponse(
        topic_id=topic.id,
        document_path=topic.document_path or "",
        document_name=topic.document_name or "",
        message="Document uploaded successfully",
    )


@router.delete("/topics/{topic_id}/document", status_code=status.HTTP_200_OK)
def delete_document(
    topic_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a topic's document"""
    user = _get_user(current_user, db)
    _require_admin(user)
    service = SyllabusService(db)
    topic = service.delete_topic_document(topic_id, user.tenant_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return {"message": "Document deleted successfully"}
