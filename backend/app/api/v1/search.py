"""
Search API endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.search_service import SearchService

router = APIRouter()


def _get_tenant(current_user: dict, db: Session) -> str:
    user = db.query(User).filter(User.id == int(current_user.get("sub"))).first()
    return user.tenant_id if user else ""


@router.get("/")
def global_search(
    q: str = Query(..., min_length=1, description="Search query"),
    modules: Optional[str] = Query(None, description="Comma-separated modules"),
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant(current_user, db)
    module_list = modules.split(",") if modules else None
    return SearchService(db).global_search(q, tenant_id, modules=module_list, limit=limit, offset=offset)


@router.get("/autocomplete")
def autocomplete(
    q: str = Query(..., min_length=1),
    limit: int = Query(8, le=20),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant(current_user, db)
    return {"suggestions": SearchService(db).autocomplete(q, tenant_id, limit=limit)}


@router.get("/facets")
def faceted_search(
    q: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant_id = _get_tenant(current_user, db)
    result = SearchService(db).global_search(q, tenant_id, limit=50)
    return {"query": q, "facets": result["facets"], "total": result["total"]}
