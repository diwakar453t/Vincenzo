from sqlalchemy.orm import Session
from typing import Optional, List

from app.models.department import Department, Designation


class DepartmentService:
    """Service for department & designation CRUD and hierarchy tree."""

    def __init__(self, db: Session):
        self.db = db

    # ─── Departments ─────────────────────────────────────────────────

    def get_departments(self, tenant_id: str, search: Optional[str] = None,
                        is_active: Optional[bool] = None) -> tuple:
        q = self.db.query(Department).filter(Department.tenant_id == tenant_id)
        if search:
            q = q.filter(Department.name.ilike(f"%{search}%"))
        if is_active is not None:
            q = q.filter(Department.is_active == is_active)
        total = q.count()
        items = q.order_by(Department.order, Department.name).all()
        return [self._dept_dict(d) for d in items], total

    def get_department(self, dept_id: int, tenant_id: str) -> Optional[dict]:
        d = self.db.query(Department).filter(Department.id == dept_id, Department.tenant_id == tenant_id).first()
        return self._dept_dict(d) if d else None

    def create_department(self, data, tenant_id: str) -> Department:
        d = Department(**data.model_dump(), tenant_id=tenant_id)
        self.db.add(d)
        self.db.commit()
        self.db.refresh(d)
        return d

    def update_department(self, dept_id: int, data, tenant_id: str) -> Optional[Department]:
        d = self.db.query(Department).filter(Department.id == dept_id, Department.tenant_id == tenant_id).first()
        if not d:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(d, field, value)
        self.db.commit()
        self.db.refresh(d)
        return d

    def delete_department(self, dept_id: int, tenant_id: str) -> bool:
        d = self.db.query(Department).filter(Department.id == dept_id, Department.tenant_id == tenant_id).first()
        if not d:
            return False
        self.db.delete(d)
        self.db.commit()
        return True

    # ─── Department Tree ─────────────────────────────────────────────

    def get_tree(self, tenant_id: str) -> List[dict]:
        """Returns a hierarchical tree of departments."""
        depts = (self.db.query(Department)
                 .filter(Department.tenant_id == tenant_id)
                 .order_by(Department.order, Department.name)
                 .all())

        by_parent: dict = {}
        for d in depts:
            pid = d.parent_id
            by_parent.setdefault(pid, []).append(d)

        def build(parent_id):
            nodes = []
            for d in by_parent.get(parent_id, []):
                nodes.append({
                    "id": d.id,
                    "name": d.name,
                    "code": d.code,
                    "head_teacher_name": d.head_teacher.full_name if d.head_teacher else None,
                    "designation_count": len(d.designations) if d.designations else 0,
                    "is_active": d.is_active,
                    "children": build(d.id),
                })
            return nodes

        return build(None)

    # ─── Designations ────────────────────────────────────────────────

    def get_designations(self, tenant_id: str, department_id: Optional[int] = None,
                         search: Optional[str] = None, is_active: Optional[bool] = None) -> tuple:
        q = self.db.query(Designation).filter(Designation.tenant_id == tenant_id)
        if department_id:
            q = q.filter(Designation.department_id == department_id)
        if search:
            q = q.filter(Designation.name.ilike(f"%{search}%"))
        if is_active is not None:
            q = q.filter(Designation.is_active == is_active)
        total = q.count()
        items = q.order_by(Designation.level, Designation.order, Designation.name).all()
        return [self._desig_dict(d) for d in items], total

    def create_designation(self, data, tenant_id: str) -> Designation:
        d = Designation(**data.model_dump(), tenant_id=tenant_id)
        self.db.add(d)
        self.db.commit()
        self.db.refresh(d)
        return d

    def update_designation(self, desig_id: int, data, tenant_id: str) -> Optional[Designation]:
        d = self.db.query(Designation).filter(Designation.id == desig_id, Designation.tenant_id == tenant_id).first()
        if not d:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(d, field, value)
        self.db.commit()
        self.db.refresh(d)
        return d

    def delete_designation(self, desig_id: int, tenant_id: str) -> bool:
        d = self.db.query(Designation).filter(Designation.id == desig_id, Designation.tenant_id == tenant_id).first()
        if not d:
            return False
        self.db.delete(d)
        self.db.commit()
        return True

    # ─── Helpers ─────────────────────────────────────────────────────

    def _dept_dict(self, d: Department) -> dict:
        return {
            "id": d.id, "tenant_id": d.tenant_id,
            "name": d.name, "code": d.code, "description": d.description,
            "head_teacher_id": d.head_teacher_id,
            "head_teacher_name": d.head_teacher.full_name if d.head_teacher else None,
            "parent_id": d.parent_id,
            "parent_name": d.parent.name if d.parent else None,
            "is_active": d.is_active, "order": d.order,
            "designation_count": len(d.designations) if d.designations else 0,
            "children_count": len(d.children) if d.children else 0,
            "created_at": d.created_at, "updated_at": d.updated_at,
        }

    def _desig_dict(self, d: Designation) -> dict:
        return {
            "id": d.id, "tenant_id": d.tenant_id,
            "name": d.name, "code": d.code, "description": d.description,
            "department_id": d.department_id,
            "department_name": d.department.name if d.department else None,
            "level": d.level, "is_active": d.is_active, "order": d.order,
            "created_at": d.created_at, "updated_at": d.updated_at,
        }
