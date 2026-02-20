# Terms of Service — PreSkool ERP
**Version:** 1.0 | **Effective Date:** February 1, 2026

**Provider:** PreSkool Technologies Pvt. Ltd., Bengaluru, India  
**Contact:** legal@preskool.com  
**Governing Law:** Republic of India

---

## 1. Acceptance of Terms

By accessing or using PreSkool ERP ("Service"), you ("Institution" or "User") agree to these Terms of Service. If you do not agree, do not use the Service.

These Terms constitute a legally binding agreement between:
- **Institution**: The educational institution that has subscribed to the Service
- **Users**: Administrators, teachers, students, and parents accessing the Service
- **PreSkool Technologies Pvt. Ltd.**: The Service provider

---

## 2. Service Description

PreSkool ERP is a cloud-based multi-tenant Educational Resource Planning platform providing:
- Student Information Management
- Academic management (classes, attendance, examinations, grades)
- Financial management (fees, payroll)
- Administrative tools (staffing, departments, transport, hostel)
- Communication and notification systems
- Reporting and analytics

---

## 3. Account Security & Responsibilities

### 3.1 Institution Responsibilities
- Maintain accurate, up-to-date institutional information
- Assign appropriate roles and permissions to users
- Safeguard administrator credentials
- Notify PreSkool immediately of any security breach

### 3.2 User Responsibilities
- Use strong passwords (minimum 8 characters with complexity requirements)
- Never share login credentials
- Log out from shared devices
- Report suspicious activity to your institution administrator

### 3.3 Security Obligations
Users must not:
- Attempt to access data belonging to other tenants or users
- Conduct security testing without written permission
- Use automated tools to scrape or bulk-download data
- Attempt SQL injection, XSS, or other attacks
- Share API credentials with third parties

---

## 4. Data Ownership & Privacy

### 4.1 Data Ownership
- All data entered by the Institution remains the property of the Institution
- PreSkool does not claim ownership of Institution data
- Upon termination, data can be exported within 90 days (after which it may be deleted)

### 4.2 Data Processing
PreSkool processes Institution data as a **Data Processor** under GDPR Article 28. The Institution acts as the **Data Controller** for student, parent, and staff data.

### 4.3 Data Protection Agreement (DPA)
By using the Service, the Institution agrees to the Data Processing Agreement available at `/docs/dpa.md`. Key commitments:
- Process data only per Institution instructions
- Implement appropriate technical and organisational security measures
- Notify of data breaches within 72 hours
- Delete/return data at end of service

### 4.4 Personal Data
Processing of student / staff personal data must comply with applicable law. The Institution is responsible for:
- Obtaining appropriate legal basis for data processing
- Maintaining records of processing activities
- Responding to data subject rights requests (we provide tooling via our GDPR API)
- Obtaining parental consent for students under 18 (GDPR Art. 8)

---

## 5. Acceptable Use Policy

The Service must not be used to:
- Store or process data unrelated to educational management
- Upload illegal content or content that violates intellectual property rights
- Conduct phishing or social engineering attacks
- Circumvent access controls or security measures
- Violate the privacy of data subjects
- Use the Service for commercial purposes outside the subscriber's institution

**Violation may result in immediate account suspension and legal action.**

---

## 6. Service Availability & SLA

| Tier | Target Uptime | Maintenance Window |
|------|--------------|-------------------|
| Standard | 99.5% | Sundays 02:00–06:00 IST |
| Professional | 99.9% | Saturdays 02:00–04:00 IST |
| Enterprise | 99.95% | Scheduled with 7-day notice |

**Exclusions:** Planned maintenance, Force majeure, Actions of the Institution

---

## 7. Intellectual Property

### 7.1 PreSkool IP
The Service, including software, algorithms, design, and documentation, is owned by PreSkool Technologies. You may not copy, modify, reverse-engineer, or create derivative works.

### 7.2 Institution IP
All Institution data, logos, and content remain the property of the Institution. You grant PreSkool a limited licence to process this data solely to provide the Service.

---

## 8. Fees & Billing

- Subscription fees are billed monthly/annually per agreement
- Payment due within 15 days of invoice
- Late payments incur 18% per annum interest (as per Indian Contract Act)
- Non-payment for 60+ days may result in account suspension
- Refund policy: Pro-rata refund within 30 days of annual subscription only

---

## 9. Limitation of Liability

To the maximum extent permitted by law:
- PreSkool's aggregate liability is limited to **fees paid in the preceding 3 months**
- PreSkool is not liable for indirect, consequential, or incidental damages
- PreSkool is not liable for data loss arising from Institution user actions

---

## 10. Data Security Commitments

PreSkool commits to:
- **AES-256-GCM** encryption for sensitive data at rest
- **TLS 1.2/1.3** for all data in transit
- **ISO 27001** aligned security controls
- Annual security audits (penetration testing)
- Immediate notification of security incidents affecting Institution data (within 72 hours)
- OWASP security best practices
- No access to production data by PreSkool staff without Institution consent (except for emergency support)

---

## 11. Termination

### 11.1 By Institution
- Cancel with 30 days written notice
- Data export available for 90 days post-termination
- No refund for unused period of monthly subscriptions

### 11.2 By PreSkool
- Immediate termination for AUP violations
- 30 days notice for other reasons
- All Institution data deleted after 90 days post-termination

---

## 12. Governing Law & Dispute Resolution

- **Governing law:** Laws of India
- **Jurisdiction:** Courts of Bengaluru, Karnataka
- **Dispute resolution:** Arbitration under the Arbitration and Conciliation Act 1996
- **Notices:** legal@preskool.com or PostalAddress above

---

## 13. Contact

**Legal:** legal@preskool.com  
**Support:** support@preskool.com  
**Privacy:** privacy@preskool.com  
**Security:** security@preskool.com

*These terms were last updated: February 20, 2026. Version history available at `/api/v1/gdpr/terms`*
