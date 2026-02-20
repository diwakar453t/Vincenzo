# Privacy Policy — PreSkool ERP
**Version:** 1.0 | **Effective Date:** February 1, 2026 | **Last Updated:** February 20, 2026

**Data Controller:** PreSkool Technologies Pvt. Ltd., Bengaluru, India  
**Contact:** privacy@preskool.com | **DPO:** dpo@preskool.com

---

## 1. Introduction

PreSkool ERP ("we," "us," "our") is a multi-tenant educational institution management platform serving 200+ colleges across India. This Privacy Policy explains how we collect, use, protect, and share personal data, and your rights as a data subject under:

- **GDPR** (EU General Data Protection Regulation 2016/679)
- **PDPB 2023** (India Personal Data Protection Bill)
- **IT Act 2000** and IT (Amendment) Act 2008
- **ISO 27001** information security standards

---

## 2. Data We Collect

### 2.1 Account Data (GENERAL PII)
- Full name, email address, username
- Role (admin, teacher, student, parent)
- College/institution association

### 2.2 Academic Records (SENSITIVE PII)
- Enrollment details, student ID, roll number
- Attendance records, examination marks and grades
- Syllabus and curriculum data
- Fee payment history and receipts

### 2.3 Personal & Contact Information (SENSITIVE PII)
- Phone number, mobile number
- Date of birth, gender, nationality
- Residential address, emergency contacts
- Guardian/parent relationships

### 2.4 Financial Data (CRITICAL PII - Encrypted at Rest)
- Fee amounts and payment records
- Bank account details (if applicable)
- Payroll information (for staff)

### 2.5 Sensitive Data (Requires Explicit Consent - Encrypted at Rest)
- Aadhaar number / national identity (collected and encrypted per PDPB)
- Health/disability information
- Caste/religion (where legally required for reservations)

### 2.6 Technical Data
- IP addresses, browser information (for security auditing)
- Application logs (anonymised after 365 days)
- Access patterns (used for security monitoring)

---

## 3. Legal Basis for Processing

| Data Type | Legal Basis |
|-----------|-------------|
| Account data | **Contract** — necessary to provide the service |
| Academic records | **Contract** + **Legal obligation** (educational regulations) |
| Financial records | **Legal obligation** (IT Act, tax regulations — 7 years) |
| Health/sensitive data | **Explicit consent** |
| Security logs | **Legitimate interests** (security and fraud prevention) |
| Analytics | **Consent** (you can opt-out) |

---

## 4. Data Encryption & Security

### 4.1 Encryption at Rest
Sensitive and critical PII fields are encrypted using **AES-256-GCM** before storage in the database:

- Email, phone numbers → `EncryptedString` column type (AES-256-GCM)
- Financial data (bank accounts, payroll) → `EncryptedString` column type
- National IDs, health data → `EncryptedText` column type (AES-256-GCM)
- Passwords → **bcrypt** (cost factor 12) — one-way, never decryptable
- Database backup files → AES-256 encrypted, separate key management

### 4.2 Encryption in Transit
- All data transmitted via **TLS 1.2/1.3** only (A+ SSL Labs rating)
- API endpoints → nginx reverse proxy with ECDHE cipher suite
- Database connections → SSL/TLS encrypted
- Redis connections → TLS encrypted (production)
- Backup transfers → Encrypted in transit

### 4.3 Key Management
- Encryption keys managed via **PBKDF2-SHA256 key derivation** (100,000 iterations)
- Production: keys stored in **AWS KMS** / **HashiCorp Vault**
- Key rotation: supported via `ENCRYPTION_OLD_KEY_N` environment variables
- No keys are hardcoded in source code

### 4.4 Additional Controls
- **Field-level access control**: encrypted fields only decrypted for authorised users
- **Pseudonymisation**: searchable fields use HMAC-SHA256 tokens (irreversible)
- **Immutable audit log**: tamper-evident chain-hash chain for all data access

---

## 5. Data Sharing

We do **not** sell your personal data. We may share data with:

| Recipient | Purpose | Safeguard |
|-----------|---------|-----------|
| Cloud infrastructure (AWS/GCP) | Hosting & storage | DPA, SOC2, ISO27001 |
| Payment gateway (Razorpay) | Fee processing | PCI-DSS compliant |
| Email providers | System notifications | DPA, encryption |
| Educational regulators | Compliance reporting | Legal obligation only |

We do **not** share data with:
- Advertisers or marketing companies
- Data brokers
- Third parties without a DPA

---

## 6. Your Rights Under GDPR / PDPB

You can exercise these rights via the API at `POST /api/v1/gdpr/requests` or by emailing privacy@preskool.com.

| Right | What it means | Response time |
|-------|--------------|---------------|
| **Access (Art. 15)** | Get a copy of all your data | 30 days |
| **Rectification (Art. 16)** | Correct inaccurate data | 30 days |
| **Erasure (Art. 17)** | Delete / anonymise your data | 30 days |
| **Portability (Art. 20)** | Export your data in JSON/CSV | 30 days |
| **Object (Art. 21)** | Stop specific processing | Immediate |
| **Withdraw consent (Art. 7)** | Remove consent for optional processing | Immediate |
| **Restrict processing (Art. 18)** | Limit use of your data | 30 days |

**Note on erasure:** Financial records, examination marks, and attendance records are retained for legal compliance periods (7 years financial, 10 years academic) even after erasure requests. Your personal identifiers are anonymised.

---

## 7. Data Retention

| Data Category | Retention Period | Basis |
|--------------|-----------------|-------|
| Active account data | Duration of account | Contract |
| Financial records | 7 years after last transaction | IT Act 2000, tax law |
| Academic records | 10 years after graduation | University regulations |
| Attendance records | 3 years | College regulations |
| System/security logs | 1 year active, 7 years archived | Security compliance |
| Consent records | Until withdrawn + 3 years | GDPR accountability |
| Anonymised data | Indefinitely | No PII retained |

---

## 8. Cookies & Tracking

We use only **essential cookies** required for service operation:
- `session_id` — authentication session (httpOnly, Secure, SameSite=Strict)
- `csrf_token` — CSRF protection (Secure, SameSite=Strict)
- No advertising cookies
- No third-party tracking pixels

---

## 9. Data Breach Notification

In the event of a data breach affecting your personal data:
- We will notify you within **72 hours** of becoming aware (GDPR requirement)
- Notification will be sent to your registered email
- Serious breaches will be reported to the relevant Data Protection Authority

---

## 10. Contact Us

**Data Protection Officer:** dpo@preskool.com  
**Privacy Enquiries:** privacy@preskool.com  
**Grievance Officer (India):** grievance@preskool.com  
**Postal:** PreSkool Technologies Pvt. Ltd., Koramangala, Bengaluru 560034, India

---

## 11. Changes to This Policy

We will notify you of material changes via email and in-app notification at least 30 days before changes take effect. Continued use after the effective date constitutes acceptance.

**Policy hash (SHA-256):** Computed at publication for integrity verification  
**Previous versions:** Available at `/api/v1/gdpr/privacy-policy/history`
