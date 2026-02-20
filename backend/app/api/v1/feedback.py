"""
Feedback API Endpoints
POST /api/v1/feedback        — Submit feedback (any authenticated user)
GET  /api/v1/feedback        — List feedback (admin only, with filters)
GET  /api/v1/feedback/stats  — Aggregated stats by module/type/rating (admin only)
"""
import uuid
import json
import logging
from datetime import datetime
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.schemas.feedback import FeedbackCreate, FeedbackResponse, FeedbackListResponse
from app.core.deps import get_current_user, require_admin
from app.core.database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/feedback", tags=["Feedback"])
logger = logging.getLogger(__name__)

# ── In-memory store (replace with SQLAlchemy model in production) ─────
# Production: create a Feedback model and migrate the DB
_FEEDBACK_STORE: list[dict] = []


def _to_response(item: dict) -> FeedbackResponse:
    return FeedbackResponse(**item)


# ── POST /feedback ────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit user feedback",
)
async def submit_feedback(
    payload: FeedbackCreate,
    current_user=Depends(get_current_user),
):
    """
    Submit feedback for any authenticated user.
    Accepts bug reports, feature requests, general comments, or praise.
    """
    item = {
        "id": str(uuid.uuid4()),
        "type": payload.type,
        "module": payload.module,
        "rating": payload.rating,
        "message": payload.message,
        "page_url": payload.page_url,
        "user_id": str(getattr(current_user, "id", "unknown")),
        "tenant_id": str(getattr(current_user, "tenant_id", "unknown")),
        "created_at": datetime.utcnow(),
    }
    _FEEDBACK_STORE.append(item)

    logger.info(
        "feedback_submitted",
        extra={
            "feedback_id": item["id"],
            "type": item["type"],
            "module": item["module"],
            "rating": item["rating"],
            "user_id": item["user_id"],
            "tenant_id": item["tenant_id"],
        },
    )

    return _to_response(item)


# ── GET /feedback ─────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=FeedbackListResponse,
    summary="List all feedback (admin only)",
    dependencies=[Depends(require_admin)],
)
async def list_feedback(
    type: Optional[Literal["bug", "feature", "general", "praise"]] = Query(None),
    module: Optional[str] = Query(None),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List submitted feedback. Admin-only. Supports filtering by type, module, and rating.
    """
    items = _FEEDBACK_STORE.copy()

    if type:
        items = [i for i in items if i["type"] == type]
    if module:
        items = [i for i in items if i.get("module") == module]
    if min_rating is not None:
        items = [i for i in items if i.get("rating") is not None and i["rating"] >= min_rating]

    # Sort newest first
    items.sort(key=lambda x: x["created_at"], reverse=True)
    total = len(items)
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]

    return FeedbackListResponse(
        items=[_to_response(i) for i in page_items],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── GET /feedback/stats ───────────────────────────────────────────────
@router.get(
    "/stats",
    summary="Feedback statistics (admin only)",
    dependencies=[Depends(require_admin)],
)
async def feedback_stats():
    """
    Returns aggregated feedback stats: totals by type, average rating per module,
    most-reported modules.
    """
    from collections import Counter, defaultdict

    type_counts = Counter(i["type"] for i in _FEEDBACK_STORE)
    module_counts = Counter(i["module"] for i in _FEEDBACK_STORE if i.get("module"))

    # Average rating per module
    module_ratings: dict = defaultdict(list)
    for item in _FEEDBACK_STORE:
        if item.get("module") and item.get("rating"):
            module_ratings[item["module"]].append(item["rating"])

    avg_ratings = {
        mod: round(sum(ratings) / len(ratings), 2)
        for mod, ratings in module_ratings.items()
    }

    overall_ratings = [i["rating"] for i in _FEEDBACK_STORE if i.get("rating")]
    overall_avg = round(sum(overall_ratings) / len(overall_ratings), 2) if overall_ratings else None

    return {
        "total": len(_FEEDBACK_STORE),
        "by_type": dict(type_counts),
        "by_module": dict(module_counts.most_common(10)),
        "avg_rating_overall": overall_avg,
        "avg_rating_by_module": avg_ratings,
    }
