from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Department Schemas ────────────────────────────────────────────────

class DepartmentBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    head_teacher_id: Optional[int] = None
    parent_id: Optional[int] = None
    is_active: bool = True
    order: int = 0


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    head_teacher_id: Optional[int] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None


class DepartmentResponse(DepartmentBase):
    id: int
    tenant_id: str
    head_teacher_name: Optional[str] = None
    parent_name: Optional[str] = None
    designation_count: int = 0
    children_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DepartmentListResponse(BaseModel):
    departments: List[DepartmentResponse]
    total: int


# ─── Hierarchy node for tree view ──────────────────────────────────────

class DepartmentTreeNode(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    head_teacher_name: Optional[str] = None
    designation_count: int = 0
    is_active: bool = True
    children: List['DepartmentTreeNode'] = []

DepartmentTreeNode.model_rebuild()


class DepartmentTreeResponse(BaseModel):
    tree: List[DepartmentTreeNode]


# ─── Designation Schemas ───────────────────────────────────────────────

class DesignationBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    department_id: Optional[int] = None
    level: int = 1
    is_active: bool = True
    order: int = 0


class DesignationCreate(DesignationBase):
    pass


class DesignationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    department_id: Optional[int] = None
    level: Optional[int] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None


class DesignationResponse(DesignationBase):
    id: int
    tenant_id: str
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DesignationListResponse(BaseModel):
    designations: List[DesignationResponse]
    total: int
