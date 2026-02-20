"""
Payment Service — Razorpay UPI integration
Supports: payment initiation, verification, receipts, refunds, stats
"""
import hashlib
import hmac
import uuid
import os
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app.models.payment import PaymentTransaction, PaymentStatus, PaymentMethod, PaymentPurpose

logger = logging.getLogger(__name__)

# ─── Razorpay config (from env or defaults for dev) ──────────────────────────
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo_key")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "demo_secret_key")
RAZORPAY_ENABLED = os.getenv("RAZORPAY_ENABLED", "false").lower() == "true"

# Try importing razorpay SDK
try:
    import razorpay
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_ENABLED else None
except ImportError:
    razorpay_client = None
    logger.warning("⚠️ razorpay SDK not installed. Payment gateway in DEMO mode.")


class PaymentService:
    def __init__(self, db: Session):
        self.db = db

    # ═════════════════════════════════════════════════════════════════════
    # 1. Initiate Payment (create Razorpay order)
    # ═════════════════════════════════════════════════════════════════════

    def initiate_payment(self, tenant_id: str, user_id: int, data: dict) -> dict:
        """Create a payment order. In live mode → Razorpay order. In demo → mock order."""
        amount = data["amount"]
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

        receipt_prefix = f"RCP-{tenant_id[:8].upper()}-"
        receipt_num = f"{receipt_prefix}{uuid.uuid4().hex[:8].upper()}"

        # Create Razorpay order (or mock)
        amount_paise = int(amount * 100)     # Razorpay uses paise
        order_data = None

        if razorpay_client and RAZORPAY_ENABLED:
            try:
                order_data = razorpay_client.order.create({
                    "amount": amount_paise,
                    "currency": data.get("currency", "INR"),
                    "receipt": receipt_num,
                    "notes": {
                        "tenant_id": tenant_id,
                        "student_id": str(data.get("student_id", "")),
                        "purpose": data.get("purpose", "tuition_fee"),
                    }
                })
                logger.info(f"💳 Razorpay order created: {order_data['id']}")
            except Exception as e:
                logger.error(f"Razorpay order creation failed: {e}")
                raise HTTPException(status_code=502, detail=f"Payment gateway error: {str(e)}")
        else:
            # Demo mode — generate mock order
            order_data = {
                "id": f"order_demo_{uuid.uuid4().hex[:16]}",
                "amount": amount_paise,
                "currency": data.get("currency", "INR"),
                "receipt": receipt_num,
                "status": "created",
            }
            logger.info(f"🧪 Demo payment order created: {order_data['id']}")

        # Store transaction
        txn = PaymentTransaction(
            tenant_id=tenant_id,
            order_id=order_data["id"],
            amount=amount,
            currency=data.get("currency", "INR"),
            status=PaymentStatus.initiated,
            payment_method=data.get("payment_method", "upi"),
            purpose=data.get("purpose", "tuition_fee"),
            description=data.get("description"),
            payer_user_id=user_id,
            student_id=data.get("student_id"),
            payer_name=data.get("payer_name"),
            payer_email=data.get("payer_email"),
            payer_phone=data.get("payer_phone"),
            fee_assignment_id=data.get("fee_assignment_id"),
            receipt_number=receipt_num,
            gateway_response=order_data,
        )
        self.db.add(txn)
        self.db.commit()
        self.db.refresh(txn)

        return {
            **self._txn_dict(txn),
            "razorpay_order_id": order_data["id"],
            "razorpay_key_id": RAZORPAY_KEY_ID if RAZORPAY_ENABLED else "rzp_test_demo",
            "amount_paise": amount_paise,
            "gateway_mode": "live" if RAZORPAY_ENABLED else "demo",
        }

    # ═════════════════════════════════════════════════════════════════════
    # 2. Verify Payment (callback from frontend)
    # ═════════════════════════════════════════════════════════════════════

    def verify_payment(self, tenant_id: str, order_id: str, payment_id: str, signature: str) -> dict:
        """Verify Razorpay payment signature and mark as completed."""
        txn = self.db.query(PaymentTransaction).filter(
            PaymentTransaction.order_id == order_id,
            PaymentTransaction.tenant_id == tenant_id,
        ).first()
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")

        if txn.status == PaymentStatus.completed:
            return self._txn_dict(txn)

        # Verify signature
        is_valid = False
        if razorpay_client and RAZORPAY_ENABLED:
            try:
                razorpay_client.utility.verify_payment_signature({
                    "razorpay_order_id": order_id,
                    "razorpay_payment_id": payment_id,
                    "razorpay_signature": signature,
                })
                is_valid = True
            except Exception:
                is_valid = False
        else:
            # Demo mode — verify using HMAC with demo secret
            expected_sig = hmac.new(
                RAZORPAY_KEY_SECRET.encode(),
                f"{order_id}|{payment_id}".encode(),
                hashlib.sha256
            ).hexdigest()
            is_valid = (signature == expected_sig) or signature.startswith("demo_sig_")

        if is_valid:
            txn.payment_id = payment_id
            txn.gateway_signature = signature
            txn.status = PaymentStatus.completed
            txn.paid_at = datetime.utcnow()
            txn.verified_at = datetime.utcnow()
            txn.receipt_generated = True
            logger.info(f"✅ Payment verified: {payment_id} for ₹{txn.amount}")
        else:
            txn.status = PaymentStatus.failed
            txn.error_code = "SIGNATURE_MISMATCH"
            txn.error_description = "Payment signature verification failed"
            logger.warning(f"❌ Payment verification failed: {order_id}")

        self.db.commit()
        self.db.refresh(txn)
        return self._txn_dict(txn)

    # ═════════════════════════════════════════════════════════════════════
    # 3. Handle Payment Callback / Webhook
    # ═════════════════════════════════════════════════════════════════════

    def handle_callback(self, tenant_id: str, payload: dict) -> dict:
        """Process Razorpay webhook/callback events."""
        event = payload.get("event", "")
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

        order_id = payment_entity.get("order_id")
        if not order_id:
            return {"status": "ignored", "reason": "no order_id"}

        txn = self.db.query(PaymentTransaction).filter(
            PaymentTransaction.order_id == order_id,
        ).first()
        if not txn:
            return {"status": "ignored", "reason": "transaction not found"}

        if event == "payment.captured":
            txn.payment_id = payment_entity.get("id")
            txn.status = PaymentStatus.captured
            txn.paid_at = datetime.utcnow()
            txn.upi_id = payment_entity.get("vpa")
            txn.gateway_response = payment_entity
        elif event == "payment.failed":
            txn.status = PaymentStatus.failed
            txn.error_code = payment_entity.get("error_code")
            txn.error_description = payment_entity.get("error_description")
            txn.gateway_response = payment_entity
        elif event == "refund.processed":
            refund = payload.get("payload", {}).get("refund", {}).get("entity", {})
            txn.refund_id = refund.get("id")
            txn.refund_amount = refund.get("amount", 0) / 100
            txn.refund_status = "processed"
            txn.refunded_at = datetime.utcnow()
            txn.status = PaymentStatus.refunded

        self.db.commit()
        return {"status": "processed", "event": event, "order_id": order_id}

    # ═════════════════════════════════════════════════════════════════════
    # 4. Payment Receipts
    # ═════════════════════════════════════════════════════════════════════

    def get_receipt(self, txn_id: int, tenant_id: str) -> dict:
        """Generate/get payment receipt."""
        txn = self.db.query(PaymentTransaction).filter(
            PaymentTransaction.id == txn_id,
            PaymentTransaction.tenant_id == tenant_id,
        ).first()
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn.status not in [PaymentStatus.completed, PaymentStatus.captured]:
            raise HTTPException(status_code=400, detail="Receipt only available for completed payments")

        from app.models.settings import SchoolSettings
        school = self.db.query(SchoolSettings).filter(SchoolSettings.tenant_id == tenant_id).first()
        school_name = school.school_name if school else "PreSkool"

        return {
            "receipt_number": txn.receipt_number,
            "transaction_id": txn.id,
            "order_id": txn.order_id,
            "payment_id": txn.payment_id,
            "amount": txn.amount,
            "currency": txn.currency,
            "status": txn.status.value if hasattr(txn.status, 'value') else str(txn.status),
            "purpose": txn.purpose.value if hasattr(txn.purpose, 'value') else str(txn.purpose),
            "payer_name": txn.payer_name,
            "student_id": txn.student_id,
            "paid_at": txn.paid_at,
            "school_name": school_name,
        }

    # ═════════════════════════════════════════════════════════════════════
    # 5. Refunds
    # ═════════════════════════════════════════════════════════════════════

    def initiate_refund(self, txn_id: int, tenant_id: str, amount: float = None, reason: str = "Admin refund") -> dict:
        """Initiate a full or partial refund."""
        txn = self.db.query(PaymentTransaction).filter(
            PaymentTransaction.id == txn_id,
            PaymentTransaction.tenant_id == tenant_id,
        ).first()
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn.status not in [PaymentStatus.completed, PaymentStatus.captured]:
            raise HTTPException(status_code=400, detail="Can only refund completed payments")

        refund_amount = amount or txn.amount

        if razorpay_client and RAZORPAY_ENABLED and txn.payment_id:
            try:
                refund_data = razorpay_client.payment.refund(txn.payment_id, {
                    "amount": int(refund_amount * 100),
                    "notes": {"reason": reason},
                })
                txn.refund_id = refund_data.get("id")
                txn.refund_status = refund_data.get("status", "processed")
                logger.info(f"💸 Razorpay refund initiated: {refund_data['id']}")
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Refund failed: {str(e)}")
        else:
            txn.refund_id = f"refund_demo_{uuid.uuid4().hex[:12]}"
            txn.refund_status = "processed"

        txn.refund_amount = refund_amount
        txn.refund_reason = reason
        txn.refunded_at = datetime.utcnow()
        txn.status = PaymentStatus.refunded if refund_amount >= txn.amount else PaymentStatus.partially_refunded
        self.db.commit()
        self.db.refresh(txn)
        logger.info(f"💸 Refund ₹{refund_amount} for txn #{txn.id}")
        return self._txn_dict(txn)

    # ═════════════════════════════════════════════════════════════════════
    # 6. List & Stats
    # ═════════════════════════════════════════════════════════════════════

    def list_transactions(self, tenant_id: str, status: str = None, student_id: int = None,
                          purpose: str = None, limit: int = 50, offset: int = 0) -> dict:
        q = self.db.query(PaymentTransaction).filter(
            PaymentTransaction.tenant_id == tenant_id,
            PaymentTransaction.is_active == True,
        )
        if status:
            q = q.filter(PaymentTransaction.status == status)
        if student_id:
            q = q.filter(PaymentTransaction.student_id == student_id)
        if purpose:
            q = q.filter(PaymentTransaction.purpose == purpose)

        total = q.count()
        txns = q.order_by(PaymentTransaction.created_at.desc()).offset(offset).limit(limit).all()
        return {"transactions": [self._txn_dict(t) for t in txns], "total": total}

    def get_transaction(self, txn_id: int, tenant_id: str) -> dict:
        txn = self.db.query(PaymentTransaction).filter(
            PaymentTransaction.id == txn_id,
            PaymentTransaction.tenant_id == tenant_id,
        ).first()
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return self._txn_dict(txn)

    def get_stats(self, tenant_id: str) -> dict:
        base = self.db.query(PaymentTransaction).filter(
            PaymentTransaction.tenant_id == tenant_id,
            PaymentTransaction.is_active == True,
        )

        total_collected = base.filter(
            PaymentTransaction.status.in_([PaymentStatus.completed, PaymentStatus.captured])
        ).with_entities(func.coalesce(func.sum(PaymentTransaction.amount), 0)).scalar()

        total_pending = base.filter(
            PaymentTransaction.status.in_([PaymentStatus.initiated, PaymentStatus.pending])
        ).with_entities(func.coalesce(func.sum(PaymentTransaction.amount), 0)).scalar()

        total_refunded = base.filter(
            PaymentTransaction.status.in_([PaymentStatus.refunded, PaymentStatus.partially_refunded])
        ).with_entities(func.coalesce(func.sum(PaymentTransaction.refund_amount), 0)).scalar()

        total_count = base.count()
        completed_count = base.filter(PaymentTransaction.status.in_([PaymentStatus.completed, PaymentStatus.captured])).count()
        failed_count = base.filter(PaymentTransaction.status == PaymentStatus.failed).count()
        refunded_count = base.filter(PaymentTransaction.status.in_([PaymentStatus.refunded, PaymentStatus.partially_refunded])).count()

        # By method
        method_stats = self.db.query(
            PaymentTransaction.payment_method, func.count(), func.coalesce(func.sum(PaymentTransaction.amount), 0)
        ).filter(
            PaymentTransaction.tenant_id == tenant_id, PaymentTransaction.is_active == True,
            PaymentTransaction.status.in_([PaymentStatus.completed, PaymentStatus.captured])
        ).group_by(PaymentTransaction.payment_method).all()

        # By purpose
        purpose_stats = self.db.query(
            PaymentTransaction.purpose, func.count(), func.coalesce(func.sum(PaymentTransaction.amount), 0)
        ).filter(
            PaymentTransaction.tenant_id == tenant_id, PaymentTransaction.is_active == True,
            PaymentTransaction.status.in_([PaymentStatus.completed, PaymentStatus.captured])
        ).group_by(PaymentTransaction.purpose).all()

        recent = base.order_by(PaymentTransaction.created_at.desc()).limit(5).all()

        return {
            "total_collected": float(total_collected),
            "total_pending": float(total_pending),
            "total_refunded": float(total_refunded),
            "total_transactions": total_count,
            "completed_count": completed_count,
            "failed_count": failed_count,
            "refunded_count": refunded_count,
            "by_method": [{"method": str(m.value) if hasattr(m, 'value') else str(m), "count": c, "amount": float(a)} for m, c, a in method_stats],
            "by_purpose": [{"purpose": str(p.value) if hasattr(p, 'value') else str(p), "count": c, "amount": float(a)} for p, c, a in purpose_stats],
            "recent_transactions": [self._txn_dict(t) for t in recent],
        }

    # ═════════════════════════════════════════════════════════════════════
    # Serializer
    # ═════════════════════════════════════════════════════════════════════

    def _txn_dict(self, t) -> dict:
        d = {}
        for c in t.__table__.columns:
            val = getattr(t, c.name)
            if hasattr(val, 'value'):
                val = val.value
            d[c.name] = val
        return d
