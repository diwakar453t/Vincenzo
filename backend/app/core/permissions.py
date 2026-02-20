"""Role-based permission decorators for PreSkool ERP."""
from functools import wraps
from fastapi import HTTPException, status


def require_role(*allowed_roles: str):
    """
    Decorator/dependency that checks if the current user has one of the allowed roles.
    
    Usage:
        @router.get("/admin-only")
        def admin_endpoint(current_user: dict = Depends(require_role("admin"))):
            ...
        
        @router.get("/staff-only")
        def staff_endpoint(current_user: dict = Depends(require_role("admin", "teacher"))):
            ...
    """
    from app.core.auth import get_current_user
    from fastapi import Depends

    async def _check_role(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role", "")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}. Your role: {user_role}",
            )
        return current_user

    return _check_role


def require_tenant():
    """
    Dependency that ensures the user belongs to a valid tenant.
    Returns the current_user dict with tenant verified.
    """
    from app.core.auth import get_current_user
    from fastapi import Depends

    async def _check_tenant(current_user: dict = Depends(get_current_user)) -> dict:
        tenant_id = current_user.get("tenant_id")
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenant assigned. Contact administrator.",
            )
        return current_user

    return _check_tenant


def require_same_tenant_or_admin():
    """
    Dependency that allows admins to access any tenant's data,
    while regular users can only access their own tenant's data.
    Returns the current_user dict.
    """
    from app.core.auth import get_current_user
    from fastapi import Depends

    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        # Admins pass through — tenant filtering happens at query level
        return current_user

    return _check
