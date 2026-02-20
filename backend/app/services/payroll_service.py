from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.payroll import (
    PayrollComponent, SalaryStructure, SalaryStructureItem,
    Payroll, PayrollItem, ComponentType, PayrollStatus,
)
from app.models.teacher import Teacher
from app.schemas.payroll import SalaryStructureCreate, PayrollProcessRequest, PayrollActionRequest


class PayrollService:
    def __init__(self, db: Session):
        self.db = db

    # ═══ Payroll Components ══════════════════════════════════════════════

    def get_components(self, tenant_id: str, component_type: Optional[str] = None,
                        is_active: Optional[bool] = None) -> tuple:
        q = self.db.query(PayrollComponent).filter(PayrollComponent.tenant_id == tenant_id)
        if component_type:
            q = q.filter(PayrollComponent.component_type == component_type)
        if is_active is not None:
            q = q.filter(PayrollComponent.is_active == is_active)
        items = q.order_by(PayrollComponent.sort_order, PayrollComponent.name).all()
        return [self._comp_dict(c) for c in items], len(items)

    def create_component(self, data: dict, tenant_id: str):
        c = PayrollComponent(**data, tenant_id=tenant_id)
        self.db.add(c)
        self.db.commit()
        self.db.refresh(c)
        return self._comp_dict(c)

    def update_component(self, cid: int, data: dict, tenant_id: str):
        c = self.db.query(PayrollComponent).filter(
            PayrollComponent.id == cid, PayrollComponent.tenant_id == tenant_id).first()
        if not c:
            return None
        for k, v in data.items():
            if v is not None:
                setattr(c, k, v)
        self.db.commit()
        self.db.refresh(c)
        return self._comp_dict(c)

    def delete_component(self, cid: int, tenant_id: str) -> bool:
        c = self.db.query(PayrollComponent).filter(
            PayrollComponent.id == cid, PayrollComponent.tenant_id == tenant_id).first()
        if not c:
            return False
        self.db.delete(c)
        self.db.commit()
        return True

    # ═══ Salary Structures ═══════════════════════════════════════════════

    def get_structures(self, tenant_id: str, teacher_id: Optional[int] = None) -> tuple:
        q = self.db.query(SalaryStructure).filter(SalaryStructure.tenant_id == tenant_id)
        if teacher_id:
            q = q.filter(SalaryStructure.teacher_id == teacher_id)
        items = q.all()
        return [self._struct_dict(s) for s in items], len(items)

    def create_or_update_structure(self, data: SalaryStructureCreate, tenant_id: str):
        existing = self.db.query(SalaryStructure).filter(
            SalaryStructure.tenant_id == tenant_id,
            SalaryStructure.teacher_id == data.teacher_id).first()

        if existing:
            # Delete old items
            self.db.query(SalaryStructureItem).filter(
                SalaryStructureItem.structure_id == existing.id).delete()
            structure = existing
        else:
            structure = SalaryStructure(
                teacher_id=data.teacher_id, tenant_id=tenant_id,
                effective_from=data.effective_from)
            self.db.add(structure)
            self.db.flush()

        # Add items and calculate totals
        total_earnings = 0
        total_deductions = 0
        for item in data.items:
            comp = self.db.query(PayrollComponent).filter(PayrollComponent.id == item.component_id).first()
            si = SalaryStructureItem(
                structure_id=structure.id, component_id=item.component_id,
                amount=item.amount, tenant_id=tenant_id)
            self.db.add(si)
            if comp:
                ct = comp.component_type.value if hasattr(comp.component_type, 'value') else comp.component_type
                if ct == "earning":
                    total_earnings += item.amount
                else:
                    total_deductions += item.amount

        structure.gross_salary = total_earnings
        structure.net_salary = total_earnings - total_deductions
        if data.effective_from:
            structure.effective_from = data.effective_from
        structure.is_active = True
        self.db.commit()
        self.db.refresh(structure)
        return self._struct_dict(structure)

    def delete_structure(self, sid: int, tenant_id: str) -> bool:
        s = self.db.query(SalaryStructure).filter(
            SalaryStructure.id == sid, SalaryStructure.tenant_id == tenant_id).first()
        if not s:
            return False
        self.db.delete(s)
        self.db.commit()
        return True

    # ═══ Payroll Processing ══════════════════════════════════════════════

    def process_payroll(self, data: PayrollProcessRequest, tenant_id: str) -> list:
        # Get teachers to process
        if data.teacher_ids:
            structures = self.db.query(SalaryStructure).filter(
                SalaryStructure.tenant_id == tenant_id,
                SalaryStructure.teacher_id.in_(data.teacher_ids),
                SalaryStructure.is_active == True).all()
        else:
            structures = self.db.query(SalaryStructure).filter(
                SalaryStructure.tenant_id == tenant_id,
                SalaryStructure.is_active == True).all()

        results = []
        for struct in structures:
            # Check if already processed
            existing = self.db.query(Payroll).filter(
                Payroll.tenant_id == tenant_id,
                Payroll.teacher_id == struct.teacher_id,
                Payroll.month == data.month,
                Payroll.year == data.year).first()
            if existing:
                results.append(self._payroll_dict(existing))
                continue

            # Create payroll
            payroll = Payroll(
                teacher_id=struct.teacher_id, month=data.month, year=data.year,
                working_days=data.working_days, present_days=data.working_days,
                gross_salary=struct.gross_salary, status=PayrollStatus.PROCESSED,
                tenant_id=tenant_id)
            self.db.add(payroll)
            self.db.flush()

            # Create items from structure
            total_earnings = 0
            total_deductions = 0
            for si in struct.items:
                comp = si.component
                ct = comp.component_type.value if hasattr(comp.component_type, 'value') else comp.component_type
                pi = PayrollItem(
                    payroll_id=payroll.id, component_id=si.component_id,
                    component_name=comp.name, component_type=comp.component_type,
                    amount=si.amount, tenant_id=tenant_id)
                self.db.add(pi)
                if ct == "earning":
                    total_earnings += si.amount
                else:
                    total_deductions += si.amount

            payroll.total_earnings = total_earnings
            payroll.total_deductions = total_deductions
            payroll.net_salary = total_earnings - total_deductions
            results.append(payroll)

        self.db.commit()
        for r in results:
            if hasattr(r, 'id') and not isinstance(r, dict):
                self.db.refresh(r)
        return [self._payroll_dict(r) if not isinstance(r, dict) else r for r in results]

    def get_payrolls(self, tenant_id: str, month: Optional[int] = None,
                      year: Optional[int] = None, teacher_id: Optional[int] = None,
                      status: Optional[str] = None) -> tuple:
        q = self.db.query(Payroll).filter(Payroll.tenant_id == tenant_id)
        if month:
            q = q.filter(Payroll.month == month)
        if year:
            q = q.filter(Payroll.year == year)
        if teacher_id:
            q = q.filter(Payroll.teacher_id == teacher_id)
        if status:
            q = q.filter(Payroll.status == status)
        total = q.count()
        items = q.order_by(Payroll.year.desc(), Payroll.month.desc()).all()
        return [self._payroll_dict(p) for p in items], total

    def get_payroll(self, pid: int, tenant_id: str):
        p = self.db.query(Payroll).filter(Payroll.id == pid, Payroll.tenant_id == tenant_id).first()
        if not p:
            return None
        return self._payroll_dict(p)

    def action_payroll(self, pid: int, data: PayrollActionRequest, tenant_id: str):
        p = self.db.query(Payroll).filter(Payroll.id == pid, Payroll.tenant_id == tenant_id).first()
        if not p:
            return None
        p.status = data.status
        if data.remarks:
            p.remarks = data.remarks
        if data.paid_date:
            p.paid_date = data.paid_date
        self.db.commit()
        self.db.refresh(p)
        return self._payroll_dict(p)

    def delete_payroll(self, pid: int, tenant_id: str) -> bool:
        p = self.db.query(Payroll).filter(Payroll.id == pid, Payroll.tenant_id == tenant_id).first()
        if not p:
            return False
        self.db.delete(p)
        self.db.commit()
        return True

    # ═══ Reports ═════════════════════════════════════════════════════════

    def get_summary(self, month: int, year: int, tenant_id: str) -> dict:
        payrolls = self.db.query(Payroll).filter(
            Payroll.tenant_id == tenant_id,
            Payroll.month == month, Payroll.year == year).all()
        return {
            "month": month, "year": year,
            "total_teachers": len(payrolls),
            "total_gross": sum(p.gross_salary for p in payrolls),
            "total_earnings": sum(p.total_earnings for p in payrolls),
            "total_deductions": sum(p.total_deductions for p in payrolls),
            "total_net": sum(p.net_salary for p in payrolls),
            "draft_count": sum(1 for p in payrolls if (p.status.value if hasattr(p.status, 'value') else p.status) == "draft"),
            "processed_count": sum(1 for p in payrolls if (p.status.value if hasattr(p.status, 'value') else p.status) == "processed"),
            "paid_count": sum(1 for p in payrolls if (p.status.value if hasattr(p.status, 'value') else p.status) == "paid"),
        }

    def get_salary_history(self, teacher_id: int, tenant_id: str) -> dict:
        teacher = self.db.query(Teacher).filter(Teacher.id == teacher_id).first()
        payrolls = self.db.query(Payroll).filter(
            Payroll.tenant_id == tenant_id,
            Payroll.teacher_id == teacher_id,
        ).order_by(Payroll.year.desc(), Payroll.month.desc()).all()
        return {
            "teacher_id": teacher_id,
            "teacher_name": teacher.full_name if teacher else "—",
            "history": [{
                "month": p.month, "year": p.year,
                "gross_salary": p.gross_salary, "net_salary": p.net_salary,
                "status": p.status.value if hasattr(p.status, 'value') else p.status,
                "paid_date": p.paid_date,
            } for p in payrolls],
        }

    # ═══ Helpers ═════════════════════════════════════════════════════════

    def _comp_dict(self, c: PayrollComponent) -> dict:
        return {
            "id": c.id, "tenant_id": c.tenant_id, "name": c.name, "code": c.code,
            "component_type": c.component_type.value if hasattr(c.component_type, 'value') else c.component_type,
            "is_percentage": c.is_percentage, "percentage_of": c.percentage_of,
            "default_amount": c.default_amount, "is_active": c.is_active,
            "description": c.description, "sort_order": c.sort_order,
            "created_at": c.created_at, "updated_at": c.updated_at,
        }

    def _struct_dict(self, s: SalaryStructure) -> dict:
        teacher = s.teacher
        return {
            "id": s.id, "tenant_id": s.tenant_id, "teacher_id": s.teacher_id,
            "teacher_name": teacher.full_name if teacher else None,
            "gross_salary": s.gross_salary, "net_salary": s.net_salary,
            "effective_from": s.effective_from, "is_active": s.is_active,
            "items": [{
                "id": si.id, "component_id": si.component_id,
                "component_name": si.component.name if si.component else None,
                "component_type": si.component.component_type.value if si.component and hasattr(si.component.component_type, 'value') else None,
                "amount": si.amount,
            } for si in s.items],
            "created_at": s.created_at, "updated_at": s.updated_at,
        }

    def _payroll_dict(self, p) -> dict:
        if isinstance(p, dict):
            return p
        teacher = p.teacher
        return {
            "id": p.id, "tenant_id": p.tenant_id, "teacher_id": p.teacher_id,
            "teacher_name": teacher.full_name if teacher else None,
            "month": p.month, "year": p.year,
            "working_days": p.working_days, "present_days": p.present_days,
            "gross_salary": p.gross_salary,
            "total_earnings": p.total_earnings, "total_deductions": p.total_deductions,
            "net_salary": p.net_salary,
            "status": p.status.value if hasattr(p.status, 'value') else p.status,
            "remarks": p.remarks, "paid_date": p.paid_date,
            "items": [{
                "id": pi.id, "component_id": pi.component_id,
                "component_name": pi.component_name,
                "component_type": pi.component_type.value if hasattr(pi.component_type, 'value') else pi.component_type,
                "amount": pi.amount,
            } for pi in p.items],
            "created_at": p.created_at, "updated_at": p.updated_at,
        }
