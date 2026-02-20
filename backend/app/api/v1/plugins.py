"""
Plugin Management API endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.plugin_service import PluginService

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user = db.query(User).filter(User.id == int(current_user.get("sub"))).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/")
def list_plugins(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return PluginService(db).list_plugins(user.tenant_id)


@router.get("/stats")
def plugin_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_user(current_user, db)
    return PluginService(db).get_stats()


@router.get("/hooks")
def available_hooks(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_user(current_user, db)
    return PluginService(db).get_available_hooks()


@router.get("/{name}")
def get_plugin(name: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_user(current_user, db)
    return PluginService(db).get_plugin(name)


@router.post("/{name}/activate")
def activate_plugin(name: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return PluginService(db).activate_plugin(name, user.tenant_id)


@router.post("/{name}/deactivate")
def deactivate_plugin(name: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return PluginService(db).deactivate_plugin(name, user.tenant_id)


@router.delete("/{name}")
def uninstall_plugin(name: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    PluginService(db).uninstall_plugin(name, user.tenant_id)
    return {"message": f"Plugin '{name}' uninstalled"}


@router.put("/{name}/config")
def update_plugin_config(name: str, config: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return PluginService(db).update_config(name, user.tenant_id, config)
