"""
Payment API endpoints
"""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.payments import (
    PaymentInitiate, PaymentVerify, PaymentRefundRequest,
    PaymentTransactionResponse, PaymentListResponse, PaymentStats, PaymentReceipt,
)
from app.services.payment_service import PaymentService

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user = db.query(User).filter(User.id == int(current_user.get("sub"))).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ─── Payment Initiation ──────────────────────────────────────────────────

@router.post("/initiate")
def initiate_payment(data: PaymentInitiate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Initiate a new payment. Returns Razorpay order details for frontend checkout."""
    user = _get_user(current_user, db)
    return PaymentService(db).initiate_payment(user.tenant_id, user.id, data.model_dump())


# ─── Payment Verification ────────────────────────────────────────────────

@router.post("/verify")
def verify_payment(data: PaymentVerify, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verify payment after Razorpay checkout completes."""
    user = _get_user(current_user, db)
    result = PaymentService(db).verify_payment(user.tenant_id, data.order_id, data.payment_id, data.signature)
    return PaymentTransactionResponse(**result)


# ─── Webhook / Callback ──────────────────────────────────────────────────

@router.post("/webhook")
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Razorpay webhook callbacks. No auth required (validated by signature)."""
    payload = await request.json()
    # In production, validate webhook signature here
    return PaymentService(db).handle_callback("", payload)


# ─── Transaction List ────────────────────────────────────────────────────

@router.get("/", response_model=PaymentListResponse)
def list_transactions(
    status: Optional[str] = None,
    student_id: Optional[int] = None,
    purpose: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    result = PaymentService(db).list_transactions(user.tenant_id, status=status, student_id=student_id, purpose=purpose, limit=limit, offset=offset)
    return PaymentListResponse(
        transactions=[PaymentTransactionResponse(**t) for t in result["transactions"]],
        total=result["total"],
    )


# ─── Transaction Detail ──────────────────────────────────────────────────

@router.get("/stats", response_model=PaymentStats)
def payment_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    data = PaymentService(db).get_stats(user.tenant_id)
    data["recent_transactions"] = [PaymentTransactionResponse(**t) for t in data["recent_transactions"]]
    return PaymentStats(**data)


@router.get("/{txn_id}", response_model=PaymentTransactionResponse)
def get_transaction(txn_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return PaymentTransactionResponse(**PaymentService(db).get_transaction(txn_id, user.tenant_id))


# ─── Receipt ──────────────────────────────────────────────────────────────

@router.get("/{txn_id}/receipt", response_model=PaymentReceipt)
def get_receipt(txn_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return PaymentReceipt(**PaymentService(db).get_receipt(txn_id, user.tenant_id))


# ─── Refund ───────────────────────────────────────────────────────────────

@router.post("/refund")
def initiate_refund(data: PaymentRefundRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    result = PaymentService(db).initiate_refund(data.transaction_id, user.tenant_id, data.amount, data.reason)
    return PaymentTransactionResponse(**result)
