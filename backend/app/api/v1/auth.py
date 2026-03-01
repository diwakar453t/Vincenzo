"""Authentication API router for PreSkool ERP — Security Hardened."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    revoke_token,
)
from app.core.config import settings
from app.core.security import (
    PasswordPolicy,
    account_lockout,
    audit,
    InputSanitizer,
)
from app.models.user import User, Tenant, UserRole
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenRefreshRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
    TokenResponse,
    MessageResponse,
    ValidatePasswordRequest,
)
from datetime import timedelta

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(request: UserRegisterRequest, req: Request, db: Session = Depends(get_db)):
    """Register a new user account with password policy enforcement."""
    ip = req.client.host if req.client else "unknown"

    # Sanitize inputs
    email = InputSanitizer.sanitize_input(request.email).lower().strip()
    full_name = InputSanitizer.sanitize_input(request.full_name)

    # Validate password against policy
    policy_result = PasswordPolicy.validate(request.password, email)
    if not policy_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Password does not meet security requirements",
                "policy_errors": policy_result["errors"],
                "strength": policy_result["strength"],
            }
        )

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"  # Don't reveal the email
        )

    tenant = db.query(Tenant).filter(Tenant.id == request.tenant_id).first()
    if not tenant:
        tenant = Tenant(
            id=request.tenant_id,
            name=request.tenant_id.replace("-", " ").title(),
            domain=f"{request.tenant_id}.preskool.local",
            is_active=True
        )
        db.add(tenant)
        db.flush()

    valid_roles = [r.value for r in UserRole]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )

    user = User(
        email=email,
        hashed_password=get_password_hash(request.password),
        full_name=full_name,
        role=request.role,
        tenant_id=request.tenant_id,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit.log_login_success(email, ip, request.tenant_id)

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role, "tenant_id": user.tenant_id}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, req: Request, db: Session = Depends(get_db)):
    """
    Authenticate user with account lockout protection.
    
    Security features:
    - Account lockout after 5 failed attempts (progressive)
    - Constant-time comparison (prevent timing attacks)
    - Audit logging for all attempts
    - Generic error messages (don't reveal valid emails)
    """
    ip = req.client.host if req.client else "unknown"
    email = request.email.lower().strip()

    # Check if account is locked
    is_locked, remaining = account_lockout.is_locked(email)
    if is_locked:
        audit.log_login_failure(email, ip, reason="account_locked")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Account temporarily locked",
                "message": f"Too many failed attempts. Try again in {remaining} seconds.",
                "retry_after": remaining,
            }
        )

    user = db.query(User).filter(User.email == email).first()

    # Constant-time: always verify password even if user doesn't exist
    # (prevents timing-based email enumeration)
    if not user:
        # Hash a dummy password to consume same time
        get_password_hash("dummy_password_for_timing")
        lockout_status = account_lockout.record_failure(email, ip)
        audit.log_login_failure(email, ip, reason="user_not_found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(request.password, user.hashed_password):
        lockout_status = account_lockout.record_failure(email, ip)
        audit.log_login_failure(email, ip, reason="invalid_password")

        if lockout_status["locked"]:
            audit.log_account_locked(email, ip, 900)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Account temporarily locked",
                    "message": "Too many failed attempts. Account locked for 15 minutes.",
                }
            )

        # Issue 1 (partial): Don't reveal attempt count — reduces attacker info
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        audit.log_login_failure(email, ip, reason="account_deactivated")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact administrator."
        )

    # Successful login — clear lockout
    account_lockout.record_success(email)
    audit.log_login_success(email, ip, user.tenant_id)

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role, "tenant_id": user.tenant_id}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    payload = decode_token(request.refresh_token)

    # Issue 1: Validate this is actually a refresh token — not an access token
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: a refresh token is required"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated"
        )

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role, "tenant_id": user.tenant_id}
    new_access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's profile."""
    user_id = current_user.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserResponse.model_validate(user)


@router.put("/change-password", response_model=MessageResponse)
def change_password(
    request: ChangePasswordRequest,
    req: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password with policy enforcement."""
    ip = req.client.host if req.client else "unknown"
    user_id = current_user.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not verify_password(request.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password against policy
    policy_result = PasswordPolicy.validate(request.new_password, user.email)
    if not policy_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "New password does not meet security requirements",
                "policy_errors": policy_result["errors"],
                "strength": policy_result["strength"],
            }
        )

    # Prevent reuse of current password
    if verify_password(request.new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    user.hashed_password = get_password_hash(request.new_password)
    db.commit()

    audit.log_password_change(int(user_id), ip)

    return MessageResponse(message="Password changed successfully")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset link.

    For security, always returns success even if email doesn't exist.
    In production, this would send an email with a reset link.
    """
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()

    if user:
        # Generate a short-lived reset token (15 min)
        reset_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "type": "password_reset"},
            expires_delta=timedelta(minutes=15)
        )
        # TODO: In production, send email with the reset link (token must NOT be logged)
        # Email service integration point — send reset_token via email only
        logger.info(
            "Password reset token generated",
            extra={"user_id": user.id, "event": "password_reset_requested"},
        )

    return MessageResponse(message="If an account with that email exists, a password reset link has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(request: ResetPasswordRequest, req: Request, db: Session = Depends(get_db)):
    """Reset password using a reset token with policy enforcement."""
    ip = req.client.host if req.client else "unknown"

    # Validate reset token
    try:
        payload = decode_token(request.token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Verify it's a password reset token
    if payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Validate new password against policy
    policy_result = PasswordPolicy.validate(request.new_password, user.email)
    if not policy_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Password does not meet security requirements",
                "policy_errors": policy_result["errors"],
            }
        )

    user.hashed_password = get_password_hash(request.new_password)
    db.commit()

    # Clear any lockout on password reset
    account_lockout.record_success(user.email)
    audit.log_password_change(int(user_id), ip)

    return MessageResponse(message="Password has been reset successfully")


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: dict = Depends(get_current_user)):
    """Logout user — revokes the current access token JTI immediately.

    NOTE(production): _revoked_jtis is an in-memory set. In a multi-worker
    deployment, replace with a Redis SET keyed by jti with TTL matching
    ACCESS_TOKEN_EXPIRE_MINUTES. See docs/security/token-revocation.md.
    """
    jti = current_user.get("jti")
    if jti:
        revoke_token(jti)  # Issue 4: actual token invalidation
    return MessageResponse(message="Logged out successfully")


@router.get("/password-policy")
def get_password_policy():
    """Return password requirements for frontend display."""
    min_length = 8 if settings.APP_ENV == "development" else 12
    return {
        "min_length": min_length,
        "max_length": 128,
        "require_uppercase": True,
        "require_lowercase": True,
        "require_digit": True,
        "require_special": True,
        "no_common_passwords": True,
        "no_email_in_password": True,
        "no_sequential_chars": True,
    }


@router.post("/validate-password")
def validate_password_strength(request: ValidatePasswordRequest):
    """
    Check password strength without creating/changing password.
    Frontend can call this for real-time validation.
    Issue 3: Uses a typed Pydantic schema instead of raw dict to prevent
    type confusion / unhandled exceptions on malformed input.
    """
    result = PasswordPolicy.validate(request.password, request.email or "")
    return result
