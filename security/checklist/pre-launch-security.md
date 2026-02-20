# PreSkool ERP — Pre-Launch Security Sign-Off Checklist

> **Instructions**: Complete each item before Go-Live. Mark status as ✅ Pass, ⚠️ Warning (accepted risk), or ❌ Fail (blocker). All ❌ must be resolved before launch.

---

## Sign-Off Summary

| Domain | Verified By | Date | Overall Status |
|--------|-------------|------|----------------|
| Authentication & Authorization | | | |
| Data Protection | | | |
| Infrastructure | | | |
| Frontend Security | | | |
| API Security | | | |
| OWASP Top 10 | | | |

---

## 1. Authentication & Authorization

| # | Check | Status | Notes | Verified By |
|---|-------|--------|-------|-------------|
| 1.1 | JWT secret key is ≥ 256-bit random value in production | | | |
| 1.2 | JWT tokens expire (access: 15 min, refresh: 7 days) | | | |
| 1.3 | Refresh token rotation implemented | | | |
| 1.4 | Account lockout after 5 failed login attempts | | | |
| 1.5 | Password minimum 8 chars, requires complexity | | | |
| 1.6 | Password reset tokens are single-use and expire in 1 hour | | | |
| 1.7 | Role-based access control enforced on all API endpoints | | | |
| 1.8 | Admin routes protected from Teacher/Student/Parent roles | | | |
| 1.9 | Session invalidated on logout (token blacklist or short TTL) | | | |
| 1.10 | Default admin password changed from factory value | | | |

---

## 2. Data Protection

| # | Check | Status | Notes | Verified By |
|---|-------|--------|-------|-------------|
| 2.1 | All passwords hashed using bcrypt (cost ≥ 12) | | | |
| 2.2 | No passwords stored in plaintext anywhere in DB | | | |
| 2.3 | PII fields (Aadhaar, medical records) encrypted at rest | | | |
| 2.4 | DB connection uses SSL/TLS in production | | | |
| 2.5 | Database credentials not hardcoded in source code | | | |
| 2.6 | `.env` file not committed to git repository | | | |
| 2.7 | Backup files encrypted before upload to S3/cloud | | | |
| 2.8 | GDPR/DPDP: data retention policy documented and implemented | | | |
| 2.9 | Sensitive logs (passwords, tokens) not written to log files | | | |
| 2.10 | Student/guardian PII only accessible to authorized roles | | | |

---

## 3. Infrastructure Security

| # | Check | Status | Notes | Verified By |
|---|-------|--------|-------|-------------|
| 3.1 | TLS 1.2+ enforced on all HTTPS endpoints | | | |
| 3.2 | HTTP redirects to HTTPS (301 redirect) | | | |
| 3.3 | TLS certificate is valid and auto-renews (Let's Encrypt / ACM) | | | |
| 3.4 | Rate limiting enabled (100 req/min per IP on auth endpoints) | | | |
| 3.5 | DDoS protection in place (Cloudflare / WAF) | | | |
| 3.6 | Docker images run as non-root user | | | |
| 3.7 | Container images scanned with Trivy — no CRITICAL CVEs | | | |
| 3.8 | SSH access restricted to VPN / bastion host only | | | |
| 3.9 | PostgreSQL not exposed to public internet | | | |
| 3.10 | Redis (if used) password-protected and not public | | | |
| 3.11 | Firewall: only ports 80, 443 (and 22 to bastion) open | | | |
| 3.12 | Backup automated and tested (restore test passed) | | | |

---

## 4. Frontend Security

| # | Check | Status | Notes | Verified By |
|---|-------|--------|-------|-------------|
| 4.1 | `Content-Security-Policy` header set in nginx | | | |
| 4.2 | `X-Frame-Options: SAMEORIGIN` set | | | |
| 4.3 | `X-Content-Type-Options: nosniff` set | | | |
| 4.4 | `Referrer-Policy: strict-origin-when-cross-origin` set | | | |
| 4.5 | Source maps disabled for production build | | | |
| 4.6 | npm audit: 0 critical/high vulnerabilities | | | |
| 4.7 | No sensitive data stored in `localStorage` unencrypted | | | |
| 4.8 | JWT stored in `httpOnly` cookie OR secure `localStorage` with XSS mitigation | | | |
| 4.9 | All API calls use HTTPS (no mixed content) | | | |
| 4.10 | No inline `<script>` tags with user-provided content | | | |

---

## 5. API Security

| # | Check | Status | Notes | Verified By |
|---|-------|--------|-------|-------------|
| 5.1 | All endpoints validated with Pydantic schemas | | | |
| 5.2 | SQL injection: ORM used everywhere, no raw queries with user input | | | |
| 5.3 | File upload: type validation + size limit (50MB) enforced | | | |
| 5.4 | CORS: only allow-listed origins accepted (not `*`) | | | |
| 5.5 | Error responses: no stack traces exposed to clients | | | |
| 5.6 | Pagination enforced on all list endpoints (max 100) | | | |
| 5.7 | API versioned at `/api/v1/` | | | |
| 5.8 | Swagger/OpenAPI docs disabled or password-protected in production | | | |
| 5.9 | Bandit SAST scan: 0 HIGH issues | | | |
| 5.10 | All Python dependencies pinned with version constraints | | | |

---

## 6. OWASP Top 10 (2021) Checklist

| # | OWASP Category | Mitigated? | Implementation | Verified By |
|---|---------------|------------|----------------|-------------|
| A01 | Broken Access Control | | RBAC + route guards | |
| A02 | Cryptographic Failures | | bcrypt, TLS, encrypted backups | |
| A03 | Injection | | Pydantic + SQLAlchemy ORM | |
| A04 | Insecure Design | | Architecture review complete | |
| A05 | Security Misconfiguration | | Trivy scan + config audit | |
| A06 | Vulnerable & Outdated Components | | npm audit + pip-audit | |
| A07 | Identification & Auth Failures | | Account lockout, MFA-ready | |
| A08 | Software & Data Integrity Failures | | Signed Docker images | |
| A09 | Security Logging & Monitoring | | Grafana + structured logging | |
| A10 | Server-Side Request Forgery | | Internal URLs not user-controllable | |

---

## 7. School-Specific Privacy (DPDP Act / FERPA)

| # | Check | Status | Notes | Verified By |
|---|-------|--------|-------|-------------|
| 7.1 | Minor student data requires guardian consent | | | |
| 7.2 | Biometric data (if collected) encrypted | | | |
| 7.3 | Student data not shared with third parties without consent | | | |
| 7.4 | Data deletion / right-to-be-forgotten workflow documented | | | |
| 7.5 | Privacy policy page linked in app footer | | | |

---

## Final Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | | | |
| Security Reviewer | | | |
| Product Owner | | | |
| School Admin | | | |

> **Go-Live Approved**: ☐ Yes ☐ No  
> **Conditions**: _______________________________________________
