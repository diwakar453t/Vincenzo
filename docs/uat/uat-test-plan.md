# PreSkool ERP — UAT Test Plan

**Version:** 1.0  
**Phase:** 17.3 Pre-Launch  
**Environment:** Staging  
**Prepared by:** Engineering Team  
**Date:** 2026-02-20

---

## 1. Scope

This UAT covers all user-facing modules of the PreSkool ERP system. It validates that:
- All defined user roles can perform their core workflows without errors
- Data entered is persisted correctly and visible to appropriate roles
- The system handles edge cases gracefully (empty states, invalid input, permissions)

### In Scope
All modules: Authentication, Student Management, Teacher Management, Guardian Management, Classes, Subjects, Rooms, Attendance, Timetable, Exams, Grades, Payroll, Fees, Library, Transport, Hostel, Sports, Reports, Notifications, File Manager, Settings

### Out of Scope
- Infrastructure performance (covered by load tests)
- Security penetration testing (covered by security audit)
- API-level testing (covered by backend tests)

---

## 2. Test Environment

| Component | URL / Connection |
|-----------|-----------------|
| Frontend | `http://staging.preskool.school` |
| Backend API | `http://staging.preskool.school/api/v1` |
| Database | PostgreSQL (staging replica) |
| Email (SMTP) | Mailhog at `http://staging.preskool.school:8025` |

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@preskool.test | AdminPass1!@# |
| Teacher | teacher@preskool.test | Teacher1!@# |
| Student | student@preskool.test | Student1!@# |
| Parent | parent@preskool.test | Parent1!@# |

---

## 3. Entry Criteria (Before UAT Starts)

- [ ] All automated tests passing (unit + integration + e2e)
- [ ] Security audit completed with no CRITICAL findings
- [ ] Staging environment deployed with production-equivalent data
- [ ] Test credentials seeded in staging database
- [ ] UAT team briefed on test scenarios

## 4. Exit Criteria (Before Go-Live)

- [ ] All P1 (Critical) scenarios: PASS
- [ ] All P2 (High) scenarios: PASS or ACCEPTED RISK
- [ ] No unresolved Critical/High bugs
- [ ] All sign-off columns completed
- [ ] Final sign-off from Product Owner and School Admin representative

---

## 5. Bug Priority Definitions

| Priority | Definition | SLA to Fix |
|----------|-----------|-----------|
| P1 – Critical | System crash, data loss, security breach, login failure | Before Go-Live |
| P2 – High | Core feature broken, wrong data displayed | Before Go-Live |
| P3 – Medium | Non-critical feature degraded, workaround exists | Sprint +1 |
| P4 – Low | Cosmetic issue, minor UX | Backlog |

---

## 6. Module Sign-Off Table

> **Key**: ✅ Pass | ❌ Fail | ⚠️ Pass with Issues | ⏭️ Deferred

| Module | Priority | Tester | Result | Date | Bug Ref | Notes |
|--------|----------|--------|--------|------|---------|-------|
| **Authentication** | P1 | | | | | |
| Login / Logout | P1 | | | | | |
| Forgot Password | P1 | | | | | |
| Role-based Access | P1 | | | | | |
| **Student Management** | P1 | | | | | |
| Create Student | P1 | | | | | |
| Edit Student | P1 | | | | | |
| Search / Filter | P2 | | | | | |
| Student List Export | P3 | | | | | |
| **Teacher Management** | P1 | | | | | |
| Create / Edit Teacher | P1 | | | | | |
| **Guardian Management** | P2 | | | | | |
| Link Guardian to Student | P2 | | | | | |
| **Classes & Subjects** | P2 | | | | | |
| Create Class / Assign Teacher | P2 | | | | | |
| **Attendance** | P1 | | | | | |
| Mark Student Attendance | P1 | | | | | |
| View Attendance Report | P2 | | | | | |
| **Timetable** | P2 | | | | | |
| Create / View Timetable | P2 | | | | | |
| **Exams & Grades** | P1 | | | | | |
| Create Exam | P2 | | | | | |
| Record Grades | P1 | | | | | |
| View Grade Report | P2 | | | | | |
| **Fee Management** | P1 | | | | | |
| Collect Fee | P1 | | | | | |
| View Pending Dues | P1 | | | | | |
| Generate Fee Receipt | P2 | | | | | |
| **Payroll** | P2 | | | | | |
| Process Payroll | P2 | | | | | |
| **Library** | P3 | | | | | |
| Issue / Return Book | P3 | | | | | |
| **Hostel / Transport / Sports** | P3 | | | | | |
| View / Manage Records | P3 | | | | | |
| **Notifications** | P2 | | | | | |
| Receive / Mark Read | P2 | | | | | |
| **Reports** | P2 | | | | | |
| Generate Academic Report | P2 | | | | | |
| **Settings** | P3 | | | | | |
| Update School Info | P3 | | | | | |
| **Mobile Responsiveness** | P2 | | | | | |
| Login on Mobile | P2 | | | | | |
| Dashboard on Mobile | P2 | | | | | |

---

## 7. Final Sign-Off

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| QA Lead | | | | ☐ Approve ☐ Reject |
| Product Owner | | | | ☐ Approve ☐ Reject |
| School Admin Representative | | | | ☐ Approve ☐ Reject |
| Engineering Lead | | | | ☐ Approve ☐ Reject |

> **Go-Live Decision**: ☐ APPROVED ☐ CONDITIONAL ☐ DEFERRED  
> **Conditions / Notes**: _______________________________________________
