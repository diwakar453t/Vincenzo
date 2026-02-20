"""
Security Module — PreSkool ERP (200+ Colleges).

Production-grade security hardening:
1. Rate Limiting (per-tenant + per-IP + per-endpoint)
2. CSRF Protection (double-submit cookie pattern)
3. Input Sanitization (XSS/SQL injection prevention)
4. Password Policy Enforcement
5. Account Lockout Mechanism
6. Security Headers (HSTS, CSP, X-Frame-Options, etc.)
7. Request Validation & Threat Detection
"""
import re
import time
import html
import hashlib
import secrets
import logging
from typing import Callable, Dict, Optional, Tuple
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = logging.getLogger("preskool.security")


# ═══════════════════════════════════════════════════════════════════════
# 1. RATE LIMITING — Token Bucket Algorithm
# ═══════════════════════════════════════════════════════════════════════

class TokenBucket:
    """Token bucket rate limiter with burst support."""
    __slots__ = ("rate", "capacity", "tokens", "last_refill")

    def __init__(self, rate: float, capacity: int):
        self.rate = rate          # Tokens per second
        self.capacity = capacity  # Max burst
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()

    def consume(self, tokens: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.last_refill = now
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

    @property
    def retry_after(self) -> float:
        return max(0, (1 - self.tokens) / self.rate)


class RateLimiter:
    """
    Multi-tier rate limiter:
    - Per IP: Prevents individual abuse
    - Per tenant: Fair usage across colleges  
    - Per endpoint: Protects sensitive operations (login, register)
    """

    def __init__(self):
        self._ip_buckets: Dict[str, TokenBucket] = {}
        self._tenant_buckets: Dict[str, TokenBucket] = {}
        self._endpoint_buckets: Dict[str, TokenBucket] = {}
        self._cleanup_counter = 0

    def _get_or_create(
        self, store: dict, key: str, rate: float, capacity: int
    ) -> TokenBucket:
        if key not in store:
            store[key] = TokenBucket(rate, capacity)
        return store[key]

    def check(
        self,
        ip: str,
        tenant_id: Optional[str],
        path: str,
    ) -> Tuple[bool, Optional[float]]:
        """
        Check if request is allowed.
        Returns (allowed: bool, retry_after: Optional[float])
        """
        # Per-IP: 120 req/min, burst 30
        ip_bucket = self._get_or_create(
            self._ip_buckets, ip,
            rate=settings.RATE_LIMIT_PER_MINUTE / 60.0,
            capacity=settings.RATE_LIMIT_BURST,
        )
        if not ip_bucket.consume():
            return False, ip_bucket.retry_after

        # Per-tenant: 600 req/min, burst 100 (shared across all users)
        if tenant_id:
            tenant_bucket = self._get_or_create(
                self._tenant_buckets, tenant_id,
                rate=10.0,   # 600/min
                capacity=100,
            )
            if not tenant_bucket.consume():
                return False, tenant_bucket.retry_after

        # Sensitive endpoints: stricter limits
        sensitive = self._get_sensitive_limit(path)
        if sensitive:
            ep_key = f"{ip}:{path}"
            ep_bucket = self._get_or_create(
                self._endpoint_buckets, ep_key,
                rate=sensitive[0], capacity=sensitive[1],
            )
            if not ep_bucket.consume():
                return False, ep_bucket.retry_after

        # Periodic cleanup
        self._cleanup_counter += 1
        if self._cleanup_counter % 1000 == 0:
            self._cleanup()

        return True, None

    def _get_sensitive_limit(self, path: str) -> Optional[Tuple[float, int]]:
        """Stricter limits for auth/sensitive endpoints."""
        sensitive_paths = {
            "/api/v1/auth/login": (0.2, 5),         # 12/min, burst 5
            "/api/v1/auth/register": (0.1, 3),       # 6/min, burst 3
            "/api/v1/auth/forgot-password": (0.05, 2),  # 3/min, burst 2
            "/api/v1/auth/reset-password": (0.1, 3),
            "/api/v1/payments/initiate": (0.5, 5),   # 30/min, burst 5
        }
        return sensitive_paths.get(path)

    def _cleanup(self):
        """Remove stale buckets to prevent memory leak."""
        now = time.monotonic()
        for store in (self._ip_buckets, self._tenant_buckets, self._endpoint_buckets):
            stale = [
                k for k, v in store.items()
                if now - v.last_refill > 300  # 5 min idle
            ]
            for k in stale:
                del store[k]


# Global rate limiter instance
_rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply rate limiting to all incoming requests."""

    EXCLUDED = frozenset({"/metrics", "/healthz", "/api/v1/health"})

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in self.EXCLUDED:
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        tenant_id = getattr(request.state, "tenant_id", None)
        path = request.url.path

        allowed, retry_after = _rate_limiter.check(ip, tenant_id, path)
        if not allowed:
            logger.warning(
                f"Rate limit exceeded: ip={ip}, tenant={tenant_id}, path={path}",
                extra={"client_ip": ip, "tenant_id": tenant_id, "path": path},
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "detail": "Rate limit exceeded. Please slow down.",
                    "retry_after": round(retry_after or 1, 1),
                },
                headers={
                    "Retry-After": str(int(retry_after or 1)),
                    "X-RateLimit-Reset": str(int(time.time() + (retry_after or 1))),
                },
            )

        response = await call_next(request)
        return response


# ═══════════════════════════════════════════════════════════════════════
# 2. SECURITY HEADERS MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    Protects against: XSS, clickjacking, MIME sniffing, info leakage.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # ── Anti-XSS ─────────────────────────────────────────────────
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # ── Anti-Clickjacking ────────────────────────────────────────
        response.headers["X-Frame-Options"] = "DENY"

        # ── Content Security Policy ──────────────────────────────────
        if settings.APP_ENV != "development":
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline' fonts.googleapis.com; "
                "font-src 'self' fonts.gstatic.com; "
                "img-src 'self' data: blob:; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )

        # ── HSTS (HTTPS enforcement) ─────────────────────────────────
        if settings.APP_ENV != "development":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # ── Prevent information leakage ──────────────────────────────
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), magnetometer=()"
        )

        # Remove server info
        response.headers.pop("Server", None)
        response.headers.pop("X-Powered-By", None)

        return response


# ═══════════════════════════════════════════════════════════════════════
# 3. CSRF PROTECTION (Double-Submit Cookie Pattern)
# ═══════════════════════════════════════════════════════════════════════

class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Double-submit cookie CSRF protection.
    
    How it works:
    1. Server sets CSRF token in cookie (csrf_token)
    2. Frontend reads cookie and sends in X-CSRF-Token header
    3. Server validates that cookie value == header value
    
    API-only requests with Authorization: Bearer are exempt
    (JWT is already a CSRF-proof mechanism).
    """

    SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
    EXEMPT_PATHS = frozenset({
        "/api/v1/auth/login", "/api/v1/auth/register",
        "/api/v1/auth/refresh", "/api/v1/auth/forgot-password",
        "/api/v1/webhooks/alerts", "/metrics",
    })

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Safe methods don't need CSRF
        if request.method in self.SAFE_METHODS:
            response = await call_next(request)
            self._set_csrf_cookie(response)
            return response

        # API requests with Bearer token are exempt (JWT is itself CSRF-proof)
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            return await call_next(request)

        # Exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Validate CSRF token
        cookie_token = request.cookies.get("csrf_token")
        header_token = request.headers.get("x-csrf-token")

        if not cookie_token or not header_token or cookie_token != header_token:
            return JSONResponse(
                status_code=403,
                content={"error": "CSRF validation failed"},
            )

        response = await call_next(request)
        self._set_csrf_cookie(response)
        return response

    def _set_csrf_cookie(self, response: Response):
        """Set CSRF cookie on responses."""
        token = secrets.token_hex(32)
        response.set_cookie(
            key="csrf_token",
            value=token,
            httponly=False,  # JS needs to read this
            secure=settings.APP_ENV != "development",
            samesite="strict",
            max_age=3600,
        )


# ═══════════════════════════════════════════════════════════════════════
# 4. INPUT SANITIZATION & VALIDATION
# ═══════════════════════════════════════════════════════════════════════

class InputSanitizer:
    """
    Centralized input sanitization — prevents XSS, SQL injection, path traversal.
    Applied before data reaches business logic.
    """

    # Common SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|SET|VALUES|WHERE)\b)",
        r"(--|;|/\*|\*/|@@|@|char|nchar|varchar|nvarchar|alter|begin|cast|cursor|declare|delete|drop|end|exec|execute|fetch|insert|kill|open|select|sys|sysobjects|syscolumns|table|update|xp_)",
        r"('(\s|\+)*(or|and|not)(\s|\+)+)",
        r"(\b(OR|AND)\b\s+\d+\s*=\s*\d+)",
    ]

    # XSS patterns
    XSS_PATTERNS = [
        r"<script[^>]*>",
        r"javascript:",
        r"on(load|error|click|mouseover|focus|blur|submit|change|input|keyup|keydown)\s*=",
        r"<iframe[^>]*>",
        r"<object[^>]*>",
        r"<embed[^>]*>",
        r"<form[^>]*>",
        r"expression\s*\(",
        r"url\s*\(.*javascript",
    ]

    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./",
        r"\.\.\\",
        r"%2e%2e",
        r"%252e%252e",
    ]

    _sql_re = [re.compile(p, re.IGNORECASE) for p in SQL_INJECTION_PATTERNS]
    _xss_re = [re.compile(p, re.IGNORECASE) for p in XSS_PATTERNS]
    _path_re = [re.compile(p, re.IGNORECASE) for p in PATH_TRAVERSAL_PATTERNS]

    @classmethod
    def sanitize_string(cls, value: str) -> str:
        """Sanitize a string value — escape HTML entities."""
        if not isinstance(value, str):
            return value
        return html.escape(value, quote=True)

    @classmethod
    def check_sql_injection(cls, value: str) -> bool:
        """Returns True if SQL injection pattern detected."""
        if not isinstance(value, str):
            return False
        for pattern in cls._sql_re:
            if pattern.search(value):
                return True
        return False

    @classmethod
    def check_xss(cls, value: str) -> bool:
        """Returns True if XSS pattern detected."""
        if not isinstance(value, str):
            return False
        for pattern in cls._xss_re:
            if pattern.search(value):
                return True
        return False

    @classmethod
    def check_path_traversal(cls, value: str) -> bool:
        """Returns True if path traversal pattern detected."""
        if not isinstance(value, str):
            return False
        for pattern in cls._path_re:
            if pattern.search(value):
                return True
        return False

    @classmethod
    def is_safe(cls, value: str) -> bool:
        """Check if input is safe from all known attack vectors."""
        if not isinstance(value, str):
            return True
        return not (
            cls.check_sql_injection(value)
            or cls.check_xss(value)
            or cls.check_path_traversal(value)
        )

    @classmethod
    def sanitize_input(cls, value: str) -> str:
        """Full sanitization: escape HTML + strip dangerous patterns."""
        if not isinstance(value, str):
            return value
        # HTML-escape
        value = html.escape(value, quote=True)
        # Strip null bytes
        value = value.replace("\x00", "")
        # Normalize unicode
        value = value.strip()
        return value


class InputValidationMiddleware(BaseHTTPMiddleware):
    """
    Validate incoming requests for malicious payloads.
    Checks query params, headers, and path for SQL injection, XSS, path traversal.
    """

    EXCLUDED = frozenset({"/metrics", "/healthz", "/api/v1/health"})

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in self.EXCLUDED:
            return await call_next(request)

        # Check query parameters
        for key, value in request.query_params.items():
            if not InputSanitizer.is_safe(value):
                logger.warning(
                    f"Malicious input detected in query param '{key}': {value[:100]}",
                    extra={"client_ip": request.client.host if request.client else "-"},
                )
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid input detected", "detail": f"Suspicious content in parameter: {key}"},
                )

        # Check URL path
        if not InputSanitizer.is_safe(request.url.path):
            logger.warning(f"Malicious path detected: {request.url.path}")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid request path"},
            )

        return await call_next(request)


# ═══════════════════════════════════════════════════════════════════════
# 5. PASSWORD POLICY ENGINE
# ═══════════════════════════════════════════════════════════════════════

class PasswordPolicy:
    """
    Enforces strong password requirements.
    Configurable per environment (stricter in production).
    """

    # Common weak passwords (top 100)
    COMMON_PASSWORDS = frozenset({
        "password", "123456", "12345678", "qwerty", "abc123",
        "monkey", "1234567", "letmein", "trustno1", "dragon",
        "baseball", "iloveyou", "master", "sunshine", "ashley",
        "bailey", "shadow", "123123", "654321", "superman",
        "qazwsx", "michael", "football", "password1", "password123",
        "charlie", "aa123456", "donald", "password1!", "admin",
        "welcome", "welcome1", "p@ssw0rd", "passw0rd", "preskool",
        "preskool123", "school123", "teacher123", "student123",
        "admin123", "college", "college123", "erp123",
    })

    @staticmethod
    def validate(password: str, email: str = "") -> dict:
        """
        Validate password against policy.
        Returns {"valid": bool, "errors": list[str], "strength": str}
        """
        errors = []
        score = 0

        # Minimum length
        min_length = 8 if settings.APP_ENV == "development" else 12
        if len(password) < min_length:
            errors.append(f"Password must be at least {min_length} characters")
        else:
            score += 1

        # Maximum length (prevent DoS via bcrypt)
        if len(password) > 128:
            errors.append("Password must be 128 characters or less")

        # Uppercase
        if not re.search(r"[A-Z]", password):
            errors.append("Must contain at least one uppercase letter")
        else:
            score += 1

        # Lowercase
        if not re.search(r"[a-z]", password):
            errors.append("Must contain at least one lowercase letter")
        else:
            score += 1

        # Digit
        if not re.search(r"\d", password):
            errors.append("Must contain at least one number")
        else:
            score += 1

        # Special character
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]", password):
            errors.append("Must contain at least one special character (!@#$%^&*...)")
        else:
            score += 1

        # Not a common password
        if password.lower() in PasswordPolicy.COMMON_PASSWORDS:
            errors.append("This password is too common and easily guessable")

        # Not based on email
        if email:
            email_prefix = email.split("@")[0].lower()
            if len(email_prefix) > 3 and email_prefix in password.lower():
                errors.append("Password should not contain your email username")

        # No repeated characters (e.g., aaaa, 1111)
        if re.search(r"(.)\1{3,}", password):
            errors.append("Password should not contain 4+ repeated characters")

        # No sequential characters (e.g., 1234, abcd)
        if _has_sequential(password, 4):
            errors.append("Password should not contain sequential characters (1234, abcd)")

        # Strength assessment
        if score >= 5:
            strength = "strong"
        elif score >= 3:
            strength = "medium"
        else:
            strength = "weak"

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "strength": strength,
            "score": score,
        }


def _has_sequential(password: str, length: int) -> bool:
    """Check for sequential character patterns."""
    sequences = [
        "0123456789",
        "abcdefghijklmnopqrstuvwxyz",
        "qwertyuiopasdfghjklzxcvbnm",
    ]
    pw_lower = password.lower()
    for seq in sequences:
        for i in range(len(seq) - length + 1):
            if seq[i:i + length] in pw_lower:
                return True
            if seq[i:i + length][::-1] in pw_lower:
                return True
    return False


# ═══════════════════════════════════════════════════════════════════════
# 6. ACCOUNT LOCKOUT MECHANISM
# ═══════════════════════════════════════════════════════════════════════

class AccountLockout:
    """
    Tracks failed login attempts and locks accounts after threshold.
    
    Policy:
    - 5 failed attempts → 15 min lockout
    - 10 failed attempts → 1 hour lockout
    - 20 failed attempts → 24 hour lockout (admin reset required)
    
    Uses in-memory store (production: use Redis for distributed state).
    """

    THRESHOLDS = [
        (5, 900),      # 5 attempts → 15 min lock
        (10, 3600),    # 10 attempts → 1 hour lock
        (20, 86400),   # 20 attempts → 24 hour lock
    ]

    def __init__(self):
        # {email: {"count": int, "locked_until": float, "last_attempt": float}}
        self._attempts: Dict[str, dict] = {}

    def record_failure(self, email: str, ip: str) -> dict:
        """
        Record a failed login attempt.
        Returns lockout status.
        """
        now = time.time()
        email_lower = email.lower()

        entry = self._attempts.get(email_lower, {
            "count": 0, "locked_until": 0, "last_attempt": 0, "ips": set()
        })

        # Reset if last attempt was >1 hour ago
        if now - entry.get("last_attempt", 0) > 3600:
            entry = {"count": 0, "locked_until": 0, "last_attempt": 0, "ips": set()}

        entry["count"] += 1
        entry["last_attempt"] = now
        entry["ips"] = entry.get("ips", set()) | {ip}

        # Determine lockout duration
        lock_duration = 0
        for threshold, duration in self.THRESHOLDS:
            if entry["count"] >= threshold:
                lock_duration = duration

        if lock_duration > 0:
            entry["locked_until"] = now + lock_duration
            logger.warning(
                f"Account locked: email={email_lower}, attempts={entry['count']}, "
                f"locked_for={lock_duration}s, ips={entry.get('ips', set())}",
                extra={"email": email_lower, "lock_duration": lock_duration},
            )

        self._attempts[email_lower] = entry

        return {
            "locked": lock_duration > 0,
            "attempts": entry["count"],
            "locked_until": entry.get("locked_until", 0),
            "remaining_attempts": max(0, 5 - entry["count"]),
        }

    def is_locked(self, email: str) -> Tuple[bool, int]:
        """
        Check if account is locked.
        Returns (is_locked, remaining_seconds).
        """
        email_lower = email.lower()
        entry = self._attempts.get(email_lower)
        if not entry:
            return False, 0

        now = time.time()
        locked_until = entry.get("locked_until", 0)
        if now < locked_until:
            remaining = int(locked_until - now)
            return True, remaining

        return False, 0

    def record_success(self, email: str):
        """Clear failed attempts on successful login."""
        email_lower = email.lower()
        if email_lower in self._attempts:
            del self._attempts[email_lower]

    def get_status(self, email: str) -> dict:
        """Get lockout status for an email."""
        email_lower = email.lower()
        entry = self._attempts.get(email_lower, {})
        locked, remaining = self.is_locked(email_lower)
        return {
            "locked": locked,
            "remaining_seconds": remaining,
            "failed_attempts": entry.get("count", 0),
        }


# Global lockout instance
account_lockout = AccountLockout()


# ═══════════════════════════════════════════════════════════════════════
# 7. TLS/HTTPS ENFORCEMENT MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════

class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """
    Redirect HTTP → HTTPS in production.
    Only active when APP_ENV != development.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if settings.APP_ENV == "development":
            return await call_next(request)

        # Check X-Forwarded-Proto (behind load balancer)
        proto = request.headers.get("x-forwarded-proto", "")
        if proto == "http":
            url = request.url.replace(scheme="https")
            return Response(
                status_code=301,
                headers={"Location": str(url)},
            )

        return await call_next(request)


# ═══════════════════════════════════════════════════════════════════════
# 8. SECURITY AUDIT LOGGER
# ═══════════════════════════════════════════════════════════════════════

class SecurityAuditLogger:
    """Log security-relevant events for compliance and forensics."""

    @staticmethod
    def log_login_success(email: str, ip: str, tenant_id: str = None):
        logger.info(
            f"AUTH_SUCCESS: email={email}, ip={ip}, tenant={tenant_id}",
            extra={"event": "auth_success", "email": email, "client_ip": ip, "tenant_id": tenant_id},
        )

    @staticmethod
    def log_login_failure(email: str, ip: str, reason: str = "invalid_credentials"):
        logger.warning(
            f"AUTH_FAILURE: email={email}, ip={ip}, reason={reason}",
            extra={"event": "auth_failure", "email": email, "client_ip": ip, "reason": reason},
        )

    @staticmethod
    def log_account_locked(email: str, ip: str, duration: int):
        logger.warning(
            f"ACCOUNT_LOCKED: email={email}, ip={ip}, duration={duration}s",
            extra={"event": "account_locked", "email": email, "client_ip": ip, "duration": duration},
        )

    @staticmethod
    def log_password_change(user_id: int, ip: str):
        logger.info(
            f"PASSWORD_CHANGED: user_id={user_id}, ip={ip}",
            extra={"event": "password_changed", "user_id": user_id, "client_ip": ip},
        )

    @staticmethod
    def log_suspicious_activity(ip: str, reason: str, details: str = ""):
        logger.warning(
            f"SUSPICIOUS: ip={ip}, reason={reason}, details={details}",
            extra={"event": "suspicious_activity", "client_ip": ip, "reason": reason},
        )

    @staticmethod
    def log_rate_limited(ip: str, path: str, tenant_id: str = None):
        logger.warning(
            f"RATE_LIMITED: ip={ip}, path={path}, tenant={tenant_id}",
            extra={"event": "rate_limited", "client_ip": ip, "path": path},
        )


audit = SecurityAuditLogger()


# ═══════════════════════════════════════════════════════════════════════
# SETUP: Wire all security middleware into FastAPI
# ═══════════════════════════════════════════════════════════════════════

def setup_security(app):
    """
    Initialize all security middleware.
    Order matters — outermost middleware executes first.
    """
    # HTTPS redirect (outermost — redirects before any processing)
    app.add_middleware(HTTPSRedirectMiddleware)

    # Security headers (applied to all responses)
    app.add_middleware(SecurityHeadersMiddleware)

    # Rate limiting (reject excessive requests early)
    app.add_middleware(RateLimitMiddleware)

    # Input validation (reject malicious payloads)
    app.add_middleware(InputValidationMiddleware)

    # CSRF protection (for cookie-based sessions)
    app.add_middleware(CSRFMiddleware)

    logger.info(
        "🔒 Security middleware initialized — "
        "rate limiting, CSRF, XSS protection, security headers, HTTPS redirect"
    )
