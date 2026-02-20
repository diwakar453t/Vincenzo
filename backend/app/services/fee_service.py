from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
import uuid

from app.models.fee import (
    FeeGroup, FeeType, StudentFeeAssignment, FeeCollection,
    PaymentStatus, PaymentMethod,
)
from app.models.student import Student
from app.models.class_model import Class
from app.schemas.fee import FeeAssignRequest, FeeCollectionCreate


class FeeService:
    def __init__(self, db: Session):
        self.db = db

    # ═══ Fee Groups ══════════════════════════════════════════════════════

    def get_fee_groups(self, tenant_id: str, is_active: Optional[bool] = None) -> tuple:
        q = self.db.query(FeeGroup).filter(FeeGroup.tenant_id == tenant_id)
        if is_active is not None:
            q = q.filter(FeeGroup.is_active == is_active)
        items = q.order_by(FeeGroup.name).all()
        return [self._group_dict(g) for g in items], len(items)

    def create_fee_group(self, data: dict, tenant_id: str):
        g = FeeGroup(**data, tenant_id=tenant_id)
        self.db.add(g)
        self.db.commit()
        self.db.refresh(g)
        return self._group_dict(g)

    def update_fee_group(self, gid: int, data: dict, tenant_id: str):
        g = self.db.query(FeeGroup).filter(FeeGroup.id == gid, FeeGroup.tenant_id == tenant_id).first()
        if not g:
            return None
        for k, v in data.items():
            if v is not None:
                setattr(g, k, v)
        self.db.commit()
        self.db.refresh(g)
        return self._group_dict(g)

    def delete_fee_group(self, gid: int, tenant_id: str) -> bool:
        g = self.db.query(FeeGroup).filter(FeeGroup.id == gid, FeeGroup.tenant_id == tenant_id).first()
        if not g:
            return False
        self.db.delete(g)
        self.db.commit()
        return True

    # ═══ Fee Types ═══════════════════════════════════════════════════════

    def get_fee_types(self, tenant_id: str, fee_group_id: Optional[int] = None,
                       class_id: Optional[int] = None, is_active: Optional[bool] = None) -> tuple:
        q = self.db.query(FeeType).filter(FeeType.tenant_id == tenant_id)
        if fee_group_id:
            q = q.filter(FeeType.fee_group_id == fee_group_id)
        if class_id:
            q = q.filter(FeeType.class_id == class_id)
        if is_active is not None:
            q = q.filter(FeeType.is_active == is_active)
        items = q.order_by(FeeType.name).all()
        return [self._type_dict(t) for t in items], len(items)

    def create_fee_type(self, data: dict, tenant_id: str):
        t = FeeType(**data, tenant_id=tenant_id)
        self.db.add(t)
        self.db.commit()
        self.db.refresh(t)
        return self._type_dict(t)

    def update_fee_type(self, tid: int, data: dict, tenant_id: str):
        t = self.db.query(FeeType).filter(FeeType.id == tid, FeeType.tenant_id == tenant_id).first()
        if not t:
            return None
        for k, v in data.items():
            if v is not None:
                setattr(t, k, v)
        self.db.commit()
        self.db.refresh(t)
        return self._type_dict(t)

    def delete_fee_type(self, tid: int, tenant_id: str) -> bool:
        t = self.db.query(FeeType).filter(FeeType.id == tid, FeeType.tenant_id == tenant_id).first()
        if not t:
            return False
        self.db.delete(t)
        self.db.commit()
        return True

    # ═══ Fee Assignments ═════════════════════════════════════════════════

    def assign_fees(self, data: FeeAssignRequest, tenant_id: str) -> list:
        fee_type = self.db.query(FeeType).filter(FeeType.id == data.fee_type_id).first()
        if not fee_type:
            raise ValueError("Fee type not found")

        amount = data.amount if data.amount is not None else fee_type.amount
        net_amount = amount - data.discount
        results = []

        for student_id in data.student_ids:
            existing = self.db.query(StudentFeeAssignment).filter(
                StudentFeeAssignment.tenant_id == tenant_id,
                StudentFeeAssignment.student_id == student_id,
                StudentFeeAssignment.fee_type_id == data.fee_type_id,
            ).first()
            if existing:
                results.append(self._assignment_dict(existing))
                continue

            a = StudentFeeAssignment(
                student_id=student_id, fee_type_id=data.fee_type_id,
                amount=amount, discount=data.discount, net_amount=net_amount,
                paid_amount=0, balance=net_amount, status=PaymentStatus.UNPAID,
                due_date=data.due_date or fee_type.due_date,
                tenant_id=tenant_id)
            self.db.add(a)
            self.db.flush()
            results.append(a)

        self.db.commit()
        for r in results:
            if not isinstance(r, dict):
                self.db.refresh(r)
        return [self._assignment_dict(r) if not isinstance(r, dict) else r for r in results]

    def get_assignments(self, tenant_id: str, student_id: Optional[int] = None,
                         fee_type_id: Optional[int] = None,
                         status_filter: Optional[str] = None) -> tuple:
        q = self.db.query(StudentFeeAssignment).filter(StudentFeeAssignment.tenant_id == tenant_id)
        if student_id:
            q = q.filter(StudentFeeAssignment.student_id == student_id)
        if fee_type_id:
            q = q.filter(StudentFeeAssignment.fee_type_id == fee_type_id)
        if status_filter:
            q = q.filter(StudentFeeAssignment.status == status_filter)
        items = q.all()
        return [self._assignment_dict(a) for a in items], len(items)

    # ═══ Fee Collection (Payments) ═══════════════════════════════════════

    def collect_fee(self, data: FeeCollectionCreate, tenant_id: str):
        receipt = f"RCP-{uuid.uuid4().hex[:8].upper()}"

        fc = FeeCollection(
            student_id=data.student_id, fee_type_id=data.fee_type_id,
            assignment_id=data.assignment_id, receipt_number=receipt,
            amount=data.amount, payment_method=data.payment_method,
            payment_date=data.payment_date, transaction_id=data.transaction_id,
            remarks=data.remarks, tenant_id=tenant_id)
        self.db.add(fc)

        # Update assignment if linked
        if data.assignment_id:
            a = self.db.query(StudentFeeAssignment).filter(
                StudentFeeAssignment.id == data.assignment_id).first()
            if a:
                a.paid_amount += data.amount
                a.balance = a.net_amount - a.paid_amount
                if a.balance <= 0:
                    a.status = PaymentStatus.PAID
                    a.balance = 0
                else:
                    a.status = PaymentStatus.PARTIAL

        self.db.commit()
        self.db.refresh(fc)
        return self._collection_dict(fc)

    def get_collections(self, tenant_id: str, student_id: Optional[int] = None,
                         fee_type_id: Optional[int] = None,
                         from_date: Optional[date] = None,
                         to_date: Optional[date] = None) -> tuple:
        q = self.db.query(FeeCollection).filter(FeeCollection.tenant_id == tenant_id)
        if student_id:
            q = q.filter(FeeCollection.student_id == student_id)
        if fee_type_id:
            q = q.filter(FeeCollection.fee_type_id == fee_type_id)
        if from_date:
            q = q.filter(FeeCollection.payment_date >= from_date)
        if to_date:
            q = q.filter(FeeCollection.payment_date <= to_date)
        total = q.count()
        items = q.order_by(FeeCollection.payment_date.desc()).all()
        return [self._collection_dict(c) for c in items], total

    def delete_collection(self, cid: int, tenant_id: str) -> bool:
        c = self.db.query(FeeCollection).filter(
            FeeCollection.id == cid, FeeCollection.tenant_id == tenant_id).first()
        if not c:
            return False
        # Reverse the assignment update
        if c.assignment_id:
            a = self.db.query(StudentFeeAssignment).filter(
                StudentFeeAssignment.id == c.assignment_id).first()
            if a:
                a.paid_amount -= c.amount
                a.balance = a.net_amount - a.paid_amount
                if a.paid_amount <= 0:
                    a.status = PaymentStatus.UNPAID
                else:
                    a.status = PaymentStatus.PARTIAL
        self.db.delete(c)
        self.db.commit()
        return True

    # ═══ Defaulters ══════════════════════════════════════════════════════

    def get_defaulters(self, tenant_id: str, class_id: Optional[int] = None) -> tuple:
        q = self.db.query(StudentFeeAssignment).filter(
            StudentFeeAssignment.tenant_id == tenant_id,
            StudentFeeAssignment.balance > 0)
        if class_id:
            q = q.join(Student, Student.id == StudentFeeAssignment.student_id
                        ).filter(Student.class_id == class_id)

        assignments = q.all()
        student_map: dict = {}
        for a in assignments:
            sid = a.student_id
            if sid not in student_map:
                student = a.student
                class_name = None
                if student and student.class_id:
                    cls = self.db.query(Class).filter(Class.id == student.class_id).first()
                    if cls:
                        class_name = cls.name
                student_map[sid] = {
                    "student_id": sid,
                    "student_name": student.full_name if student else "—",
                    "class_name": class_name,
                    "total_due": 0, "total_paid": 0, "balance": 0,
                }
            student_map[sid]["total_due"] += a.net_amount
            student_map[sid]["total_paid"] += a.paid_amount
            student_map[sid]["balance"] += a.balance

        result = sorted(student_map.values(), key=lambda x: x["balance"], reverse=True)
        return result, len(result)

    # ═══ Financial Report ════════════════════════════════════════════════

    def get_financial_summary(self, tenant_id: str, academic_year: str = "2025-26") -> dict:
        assignments = self.db.query(StudentFeeAssignment).filter(
            StudentFeeAssignment.tenant_id == tenant_id,
            StudentFeeAssignment.academic_year == academic_year).all()

        total_assigned = sum(a.net_amount for a in assignments)
        total_collected = sum(a.paid_amount for a in assignments)
        total_outstanding = sum(a.balance for a in assignments)
        total_discount = sum(a.discount for a in assignments)

        collections = self.db.query(FeeCollection).filter(
            FeeCollection.tenant_id == tenant_id,
            FeeCollection.academic_year == academic_year).all()

        method_breakdown: dict = {}
        for c in collections:
            method = c.payment_method.value if hasattr(c.payment_method, 'value') else c.payment_method
            method_breakdown[method] = method_breakdown.get(method, 0) + c.amount

        monthly: dict = {}
        for c in collections:
            key = f"{c.payment_date.year}-{c.payment_date.month:02d}"
            monthly[key] = monthly.get(key, 0) + c.amount

        return {
            "academic_year": academic_year,
            "total_fees_assigned": total_assigned,
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
            "total_discount": total_discount,
            "collection_rate": round((total_collected / total_assigned * 100) if total_assigned > 0 else 0, 1),
            "payment_method_breakdown": method_breakdown,
            "monthly_collection": [{"month": k, "amount": v} for k, v in sorted(monthly.items())],
        }

    # ═══ Receipt ═════════════════════════════════════════════════════════

    def get_receipt(self, collection_id: int, tenant_id: str) -> Optional[dict]:
        c = self.db.query(FeeCollection).filter(
            FeeCollection.id == collection_id, FeeCollection.tenant_id == tenant_id).first()
        if not c:
            return None
        return self._collection_dict(c)

    # ═══ Helpers ═════════════════════════════════════════════════════════

    def _group_dict(self, g: FeeGroup) -> dict:
        return {
            "id": g.id, "tenant_id": g.tenant_id, "name": g.name, "code": g.code,
            "description": g.description, "is_active": g.is_active,
            "fee_types_count": len(g.fee_types) if g.fee_types else 0,
            "created_at": g.created_at, "updated_at": g.updated_at,
        }

    def _type_dict(self, t: FeeType) -> dict:
        return {
            "id": t.id, "tenant_id": t.tenant_id, "fee_group_id": t.fee_group_id,
            "fee_group_name": t.fee_group.name if t.fee_group else None,
            "name": t.name, "code": t.code, "amount": t.amount,
            "due_date": t.due_date, "is_recurring": t.is_recurring,
            "frequency": t.frequency, "academic_year": t.academic_year,
            "is_active": t.is_active, "description": t.description,
            "class_id": t.class_id,
            "class_name": t.class_ref.name if t.class_ref else None,
            "created_at": t.created_at, "updated_at": t.updated_at,
        }

    def _assignment_dict(self, a) -> dict:
        if isinstance(a, dict):
            return a
        student = a.student
        fee_type = a.fee_type
        return {
            "id": a.id, "tenant_id": a.tenant_id,
            "student_id": a.student_id,
            "student_name": student.full_name if student else None,
            "fee_type_id": a.fee_type_id,
            "fee_type_name": fee_type.name if fee_type else None,
            "amount": a.amount, "discount": a.discount, "net_amount": a.net_amount,
            "paid_amount": a.paid_amount, "balance": a.balance,
            "status": a.status.value if hasattr(a.status, 'value') else a.status,
            "due_date": a.due_date, "academic_year": a.academic_year,
            "created_at": a.created_at, "updated_at": a.updated_at,
        }

    def _collection_dict(self, c: FeeCollection) -> dict:
        student = c.student
        fee_type = c.fee_type
        return {
            "id": c.id, "tenant_id": c.tenant_id,
            "student_id": c.student_id,
            "student_name": student.full_name if student else None,
            "fee_type_id": c.fee_type_id,
            "fee_type_name": fee_type.name if fee_type else None,
            "assignment_id": c.assignment_id,
            "receipt_number": c.receipt_number,
            "amount": c.amount,
            "payment_method": c.payment_method.value if hasattr(c.payment_method, 'value') else c.payment_method,
            "payment_date": c.payment_date,
            "transaction_id": c.transaction_id, "remarks": c.remarks,
            "academic_year": c.academic_year,
            "created_at": c.created_at, "updated_at": c.updated_at,
        }
