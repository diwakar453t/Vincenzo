# PreSkool ERP — API Reference

**Base URL:** `http://localhost:8000/api/v1`  
**Interactive Docs:** `http://localhost:8000/docs` (Swagger UI) · `http://localhost:8000/redoc` (ReDoc)  
**OpenAPI Spec:** `http://localhost:8000/openapi.json`

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

Multi-tenant requests must include:
```
X-Tenant-ID: <tenant_id>
```

Roles: `admin` · `teacher` · `student` · `parent`

---

## Endpoint Summary

| # | Tag | Prefix | Count | Min Role |
|---|-----|--------|-------|----------|
| 1 | Health | `/health` | 1 | Public |
| 2 | Authentication | `/auth` | 7 | Public |
| 3 | Dashboard | `/dashboard` | 3 | Any authenticated |
| 4 | Students | `/students` | 7 | Admin |
| 5 | Teachers | `/teachers` | 7 | Admin |
| 6 | Classes | `/classes` | 7 | Admin |
| 7 | Subjects | `/subjects` | 12 | Admin |
| 8 | Guardians | `/guardians` | 7 | Admin |
| 9 | Rooms | `/rooms` | 8 | Admin |
| 10 | Departments | `/departments` | 8 | Admin |
| 11 | Syllabus | `/syllabus` | 11 | Admin/Teacher |
| 12 | Timetable | `/timetable` | 10 | Admin/Teacher |
| 13 | Exams | `/exams` | 8 | Admin/Teacher |
| 14 | Grades | `/grades` | 10 | Admin/Teacher |
| 15 | Attendance | `/attendance` | 13 | Admin/Teacher |
| 16 | Leaves | `/leaves` | 11 | Any authenticated |
| 17 | Payroll | `/payroll` | 14 | Admin |
| 18 | Fees | `/fees` | 18 | Admin/Parent |
| 19 | Library | `/library` | 15 | Any authenticated |
| 20 | Hostel | `/hostel` | 16 | Admin |
| 21 | Transport | `/transport` | 14 | Admin |
| 22 | Sports | `/sports` | 13 | Any authenticated |
| 23 | Reports | `/reports` | 11 | Admin |
| 24 | Notifications | `/notifications` | 11 | Any authenticated |
| 25 | Search | `/search` | 3 | Any authenticated |
| 26 | Files | `/files` | 8 | Any authenticated |
| 27 | Settings | `/settings` | 12 | Admin |
| 28 | Payments | `/payments` | 8 | Admin/Parent |
| 29 | Plugins | `/plugins` | 8 | Admin |
| 30 | Student Profile | `/student-profile` | 7 | Student |
| 31 | Teacher Profile | `/teacher-profile` | 10 | Teacher |
| 32 | Parent Profile | `/parent-profile` | 9 | Parent |
| 33 | Webhooks | `/webhooks` | 3 | Admin |
| 34 | GDPR | `/gdpr` | 12 | Admin/Self |
| **Total** | | | **313** | |

---

## 1. Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns API health status and version info |

---

## 2. Authentication `/auth`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/auth/register` | Register new user (email, password, role) | Public |
| `POST` | `/auth/login` | Login and receive JWT access token | Public |
| `POST` | `/auth/logout` | Invalidate current session token | Bearer |
| `GET` | `/auth/me` | Get current authenticated user profile | Bearer |
| `POST` | `/auth/refresh` | Refresh access token using refresh token | Public |
| `POST` | `/auth/forgot-password` | Send password reset email | Public |
| `POST` | `/auth/reset-password` | Reset password using reset token | Public |

**Login Request:**
```json
{
  "email": "admin@school.com",
  "password": "SecurePass123!"
}
```
**Login Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "admin@school.com", "role": "admin" }
}
```

---

## 3. Dashboard `/dashboard`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/dashboard/stats` | Summary counts (students, teachers, revenue, etc.) | Bearer |
| `GET` | `/dashboard/recent-activity` | Latest system activity feed | Bearer |
| `GET` | `/dashboard/alerts` | Active system alerts | Bearer |

---

## 4. Students `/students`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/students` | List all students (paginated, filterable) | Admin |
| `POST` | `/students` | Create new student record | Admin |
| `GET` | `/students/{id}` | Get student by ID | Admin |
| `PUT` | `/students/{id}` | Update student details | Admin |
| `DELETE` | `/students/{id}` | Delete student record | Admin |
| `GET` | `/students/{id}/performance` | Student academic performance summary | Admin |
| `POST` | `/students/bulk-import` | Import students from CSV | Admin |

**Query Params (GET /students):** `page`, `limit`, `search`, `class_id`, `status`

---

## 5. Teachers `/teachers`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/teachers` | List all teachers (paginated, filterable) | Admin |
| `POST` | `/teachers` | Create new teacher record | Admin |
| `GET` | `/teachers/{id}` | Get teacher by ID | Admin |
| `PUT` | `/teachers/{id}` | Update teacher details | Admin |
| `DELETE` | `/teachers/{id}` | Delete teacher record | Admin |
| `GET` | `/teachers/{id}/schedule` | Get teacher's timetable | Admin |
| `POST` | `/teachers/assign-class` | Assign class to teacher | Admin |

---

## 6. Classes `/classes`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/classes` | List all classes | Admin |
| `POST` | `/classes` | Create new class | Admin |
| `GET` | `/classes/{id}` | Get class details with students | Admin |
| `PUT` | `/classes/{id}` | Update class | Admin |
| `DELETE` | `/classes/{id}` | Delete class | Admin |
| `GET` | `/classes/{id}/students` | List all students in class | Admin |
| `POST` | `/classes/{id}/assign-room` | Assign room to class | Admin |

---

## 7. Subjects `/subjects`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/subjects` | List all subjects | Admin |
| `POST` | `/subjects` | Create subject | Admin |
| `GET` | `/subjects/{id}` | Get subject by ID | Admin |
| `PUT` | `/subjects/{id}` | Update subject | Admin |
| `DELETE` | `/subjects/{id}` | Delete subject | Admin |
| `GET` | `/subjects/groups` | List subject groups | Admin |
| `POST` | `/subjects/groups` | Create subject group | Admin |
| `GET` | `/subjects/groups/{id}` | Get group by ID | Admin |
| `PUT` | `/subjects/groups/{id}` | Update group | Admin |
| `DELETE` | `/subjects/groups/{id}` | Delete group | Admin |
| `POST` | `/subjects/assign-class` | Assign subject to class | Admin |
| `DELETE` | `/subjects/unassign-class` | Remove subject-class assignment | Admin |

---

## 8. Guardians `/guardians`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/guardians` | List all guardians | Admin |
| `POST` | `/guardians` | Create guardian record | Admin |
| `GET` | `/guardians/{id}` | Get guardian details | Admin |
| `PUT` | `/guardians/{id}` | Update guardian | Admin |
| `DELETE` | `/guardians/{id}` | Delete guardian | Admin |
| `POST` | `/guardians/{id}/link-student` | Link guardian to student | Admin |
| `DELETE` | `/guardians/{id}/unlink-student/{sid}` | Unlink guardian from student | Admin |

---

## 9. Rooms `/rooms`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/rooms` | List all rooms (filter by type, capacity) | Admin |
| `POST` | `/rooms` | Create new room | Admin |
| `GET` | `/rooms/{id}` | Get room details | Admin |
| `PUT` | `/rooms/{id}` | Update room | Admin |
| `DELETE` | `/rooms/{id}` | Delete room | Admin |
| `GET` | `/rooms/availability` | Check room availability by time slot | Admin |
| `POST` | `/rooms/{id}/allocate` | Allocate room to class | Admin |
| `DELETE` | `/rooms/{id}/deallocate` | Release room allocation | Admin |

---

## 10. Departments `/departments`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/departments` | List all departments | Admin |
| `POST` | `/departments` | Create department | Admin |
| `GET` | `/departments/{id}` | Get department | Admin |
| `PUT` | `/departments/{id}` | Update department | Admin |
| `DELETE` | `/departments/{id}` | Delete department | Admin |
| `GET` | `/departments/{id}/teachers` | List teachers in department | Admin |
| `POST` | `/departments/{id}/assign-head` | Assign department head | Admin |
| `GET` | `/departments/stats` | Department statistics | Admin |

---

## 11. Syllabus `/syllabus`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/syllabus` | List all syllabus entries | Admin/Teacher |
| `POST` | `/syllabus` | Create syllabus entry | Admin/Teacher |
| `GET` | `/syllabus/{id}` | Get syllabus by ID | Admin/Teacher |
| `PUT` | `/syllabus/{id}` | Update syllabus | Admin/Teacher |
| `DELETE` | `/syllabus/{id}` | Delete syllabus | Admin |
| `GET` | `/syllabus/class/{class_id}` | Get syllabus for a class | Any |
| `GET` | `/syllabus/subject/{subject_id}` | Get syllabus for a subject | Any |
| `POST` | `/syllabus/{id}/upload` | Upload syllabus document | Admin/Teacher |
| `GET` | `/syllabus/{id}/download` | Download syllabus document | Any |
| `PUT` | `/syllabus/{id}/progress` | Update completion progress | Admin/Teacher |
| `GET` | `/syllabus/stats` | Syllabus completion stats | Admin |

---

## 12. Timetable `/timetable`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/timetable` | List all timetable entries | Admin |
| `POST` | `/timetable` | Create timetable slot | Admin |
| `GET` | `/timetable/{id}` | Get slot by ID | Any |
| `PUT` | `/timetable/{id}` | Update timetable slot | Admin |
| `DELETE` | `/timetable/{id}` | Delete slot | Admin |
| `GET` | `/timetable/class/{class_id}` | Get weekly timetable for class | Any |
| `GET` | `/timetable/teacher/{teacher_id}` | Get teacher's weekly schedule | Admin/Teacher |
| `POST` | `/timetable/bulk` | Bulk create slots | Admin |
| `DELETE` | `/timetable/bulk` | Bulk delete slots | Admin |
| `GET` | `/timetable/conflicts` | Detect scheduling conflicts | Admin |

---

## 13. Exams `/exams`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/exams` | List all exams | Admin/Teacher |
| `POST` | `/exams` | Create exam | Admin/Teacher |
| `GET` | `/exams/{id}` | Get exam by ID | Any |
| `PUT` | `/exams/{id}` | Update exam | Admin/Teacher |
| `DELETE` | `/exams/{id}` | Delete exam | Admin |
| `GET` | `/exams/upcoming` | List upcoming exams | Any |
| `POST` | `/exams/{id}/schedule` | Set exam schedule (date/room) | Admin |
| `GET` | `/exams/class/{class_id}` | Exams for a class | Any |

---

## 14. Grades `/grades`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/grades` | List all grade records | Admin |
| `POST` | `/grades` | Record grade for student | Admin/Teacher |
| `GET` | `/grades/{id}` | Get grade by ID | Admin/Teacher |
| `PUT` | `/grades/{id}` | Update grade | Admin/Teacher |
| `DELETE` | `/grades/{id}` | Delete grade | Admin |
| `GET` | `/grades/student/{student_id}` | All grades for a student | Admin/Teacher/Student |
| `GET` | `/grades/exam/{exam_id}` | All grades for an exam | Admin/Teacher |
| `POST` | `/grades/bulk` | Bulk enter grades from CSV | Admin/Teacher |
| `GET` | `/grades/report-card/{student_id}` | Generate report card | Admin/Teacher/Student/Parent |
| `GET` | `/grades/stats` | Grade distribution statistics | Admin |

---

## 15. Attendance `/attendance`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/attendance` | List attendance records | Admin/Teacher |
| `POST` | `/attendance/mark` | Mark attendance for a class | Admin/Teacher |
| `GET` | `/attendance/{id}` | Get attendance record | Admin/Teacher |
| `PUT` | `/attendance/{id}` | Update attendance record | Admin/Teacher |
| `DELETE` | `/attendance/{id}` | Delete attendance record | Admin |
| `GET` | `/attendance/student/{student_id}` | Student attendance history | Admin/Teacher/Student/Parent |
| `GET` | `/attendance/class/{class_id}` | Class attendance for a date | Admin/Teacher |
| `GET` | `/attendance/class/{class_id}/report` | Monthly attendance report | Admin/Teacher |
| `POST` | `/attendance/staff/mark` | Mark staff attendance | Admin |
| `GET` | `/attendance/staff/{teacher_id}` | Staff attendance history | Admin/Teacher |
| `GET` | `/attendance/summary` | School-wide attendance summary | Admin |
| `GET` | `/attendance/absentees` | Today's absentees list | Admin/Teacher |
| `GET` | `/attendance/stats` | Attendance analytics | Admin |

---

## 16. Leaves `/leaves`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/leaves` | List leave requests (filterable by status/role) | Admin |
| `POST` | `/leaves` | Submit leave request | Any authenticated |
| `GET` | `/leaves/{id}` | Get leave request details | Any (own) |
| `PUT` | `/leaves/{id}` | Update pending leave request | Admin/Requester |
| `DELETE` | `/leaves/{id}` | Cancel leave request | Admin/Requester |
| `POST` | `/leaves/{id}/approve` | Approve leave request | Admin |
| `POST` | `/leaves/{id}/reject` | Reject leave request | Admin |
| `GET` | `/leaves/my` | My leave requests | Any authenticated |
| `GET` | `/leaves/balance` | View leave balance | Any authenticated |
| `GET` | `/leaves/calendar` | Leave calendar view | Admin |
| `GET` | `/leaves/stats` | Leave analytics | Admin |

---

## 17. Payroll `/payroll`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/payroll` | List all payroll records | Admin |
| `POST` | `/payroll` | Create payroll entry | Admin |
| `GET` | `/payroll/{id}` | Get payroll record | Admin |
| `PUT` | `/payroll/{id}` | Update payroll entry | Admin |
| `DELETE` | `/payroll/{id}` | Delete payroll entry | Admin |
| `POST` | `/payroll/process` | Process payroll for a month | Admin |
| `GET` | `/payroll/teacher/{teacher_id}` | Payroll history for a teacher | Admin/Teacher |
| `GET` | `/payroll/{id}/slip` | Download pay slip (PDF) | Admin/Teacher |
| `POST` | `/payroll/bulk-process` | Bulk process all teachers | Admin |
| `GET` | `/payroll/summary` | Monthly payroll summary | Admin |
| `POST` | `/payroll/{id}/mark-paid` | Mark payroll as paid | Admin |
| `GET` | `/payroll/stats` | Payroll analytics | Admin |
| `GET` | `/payroll/pending` | List unpaid payroll | Admin |
| `POST` | `/payroll/allowances` | Manage allowances | Admin |

---

## 18. Fees `/fees`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/fees/structures` | List fee structures | Admin |
| `POST` | `/fees/structures` | Create fee structure | Admin |
| `GET` | `/fees/structures/{id}` | Get fee structure | Admin |
| `PUT` | `/fees/structures/{id}` | Update fee structure | Admin |
| `DELETE` | `/fees/structures/{id}` | Delete fee structure | Admin |
| `GET` | `/fees/invoices` | List fee invoices | Admin |
| `POST` | `/fees/invoices` | Generate fee invoice | Admin |
| `GET` | `/fees/invoices/{id}` | Get invoice | Admin/Parent |
| `PUT` | `/fees/invoices/{id}` | Update invoice | Admin |
| `DELETE` | `/fees/invoices/{id}` | Delete invoice | Admin |
| `GET` | `/fees/invoices/student/{student_id}` | All invoices for student | Admin/Parent |
| `POST` | `/fees/payments` | Record fee payment | Admin |
| `GET` | `/fees/payments` | List fee payments | Admin |
| `GET` | `/fees/payments/{id}` | Get payment record | Admin/Parent |
| `GET` | `/fees/pending` | List pending fee payments | Admin |
| `GET` | `/fees/overdue` | List overdue fees | Admin |
| `GET` | `/fees/stats` | Fee collection statistics | Admin |
| `GET` | `/fees/summary` | Revenue summary | Admin |

---

## 19. Library `/library`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/library/books` | List all books (search, filter) | Any authenticated |
| `POST` | `/library/books` | Add book to library | Admin |
| `GET` | `/library/books/{id}` | Get book details | Any authenticated |
| `PUT` | `/library/books/{id}` | Update book | Admin |
| `DELETE` | `/library/books/{id}` | Remove book | Admin |
| `POST` | `/library/issue` | Issue book to member | Admin |
| `GET` | `/library/issues` | List all book issues | Admin |
| `GET` | `/library/issues/{id}` | Get issue record | Any (own) |
| `POST` | `/library/return/{issue_id}` | Return issued book | Admin |
| `GET` | `/library/member/{user_id}/books` | Books issued to a member | Admin/Self |
| `GET` | `/library/overdue` | List overdue books | Admin |
| `GET` | `/library/availability/{book_id}` | Check book availability | Any |
| `POST` | `/library/reserve/{book_id}` | Reserve a book | Any authenticated |
| `GET` | `/library/stats` | Library statistics | Admin |
| `GET` | `/library/catalogue` | Full catalogue export | Admin |

---

## 20. Hostel `/hostel`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/hostel/blocks` | List hostel blocks | Admin |
| `POST` | `/hostel/blocks` | Create hostel block | Admin |
| `GET` | `/hostel/blocks/{id}` | Get block details | Admin |
| `PUT` | `/hostel/blocks/{id}` | Update block | Admin |
| `DELETE` | `/hostel/blocks/{id}` | Delete block | Admin |
| `GET` | `/hostel/rooms` | List hostel rooms | Admin |
| `POST` | `/hostel/rooms` | Create hostel room | Admin |
| `GET` | `/hostel/rooms/{id}` | Get room details | Admin |
| `PUT` | `/hostel/rooms/{id}` | Update hostel room | Admin |
| `DELETE` | `/hostel/rooms/{id}` | Delete hostel room | Admin |
| `POST` | `/hostel/allot` | Allot student to room | Admin |
| `DELETE` | `/hostel/allot/{id}` | Remove allotment | Admin |
| `GET` | `/hostel/allotments` | List all allotments | Admin |
| `GET` | `/hostel/stats` | Hostel occupancy stats | Admin |
| `GET` | `/hostel/availability` | Available rooms | Admin |
| `GET` | `/hostel/complaints` | List hostel complaints | Admin |

---

## 21. Transport `/transport`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/transport/routes` | List routes | Admin |
| `POST` | `/transport/routes` | Create route | Admin |
| `GET` | `/transport/routes/{id}` | Get route details | Admin |
| `PUT` | `/transport/routes/{id}` | Update route | Admin |
| `DELETE` | `/transport/routes/{id}` | Delete route | Admin |
| `GET` | `/transport/vehicles` | List vehicles | Admin |
| `POST` | `/transport/vehicles` | Add vehicle | Admin |
| `GET` | `/transport/vehicles/{id}` | Get vehicle details | Admin |
| `PUT` | `/transport/vehicles/{id}` | Update vehicle | Admin |
| `DELETE` | `/transport/vehicles/{id}` | Delete vehicle | Admin |
| `POST` | `/transport/enroll` | Enroll student in transport | Admin |
| `DELETE` | `/transport/enroll/{id}` | Remove enrollment | Admin |
| `GET` | `/transport/enrollments` | List enrollments | Admin |
| `GET` | `/transport/stats` | Transport statistics | Admin |

---

## 22. Sports `/sports`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/sports/activities` | List sports activities | Any authenticated |
| `POST` | `/sports/activities` | Create activity | Admin |
| `GET` | `/sports/activities/{id}` | Get activity details | Any |
| `PUT` | `/sports/activities/{id}` | Update activity | Admin |
| `DELETE` | `/sports/activities/{id}` | Delete activity | Admin |
| `POST` | `/sports/enroll` | Enroll student in activity | Admin |
| `DELETE` | `/sports/enroll/{id}` | Remove enrollment | Admin |
| `GET` | `/sports/enrollments` | List student enrollments | Admin |
| `GET` | `/sports/achievements` | List achievements | Any |
| `POST` | `/sports/achievements` | Record achievement | Admin |
| `PUT` | `/sports/achievements/{id}` | Update achievement | Admin |
| `DELETE` | `/sports/achievements/{id}` | Delete achievement | Admin |
| `GET` | `/sports/stats` | Sports participation stats | Admin |

---

## 23. Reports `/reports`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/reports` | List saved reports | Admin |
| `POST` | `/reports/generate` | Generate a report | Admin |
| `GET` | `/reports/{id}` | Get report by ID | Admin |
| `DELETE` | `/reports/{id}` | Delete report | Admin |
| `GET` | `/reports/academic` | Academic performance report | Admin |
| `GET` | `/reports/attendance` | Attendance report | Admin |
| `GET` | `/reports/financial` | Financial summary report | Admin |
| `GET` | `/reports/enrollment` | Student enrollment report | Admin |
| `GET` | `/reports/staff` | Staff report | Admin |
| `GET` | `/reports/{id}/export/csv` | Export report as CSV | Admin |
| `GET` | `/reports/{id}/export/pdf` | Export report as PDF | Admin |

---

## 24. Notifications `/notifications`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/notifications` | List all notifications (for user) | Any authenticated |
| `POST` | `/notifications` | Create/send notification | Admin |
| `GET` | `/notifications/{id}` | Get notification by ID | Admin |
| `DELETE` | `/notifications/{id}` | Delete notification | Admin |
| `POST` | `/notifications/{id}/read` | Mark notification as read | Any (own) |
| `POST` | `/notifications/read-all` | Mark all as read | Any authenticated |
| `GET` | `/notifications/unread` | Get unread notifications | Any authenticated |
| `GET` | `/notifications/unread/count` | Count unread notifications | Any authenticated |
| `POST` | `/notifications/broadcast` | Broadcast to all users/role | Admin |
| `GET` | `/notifications/stats` | Notification stats | Admin |
| `GET` | `/notifications/preferences` | Get notification preferences | Any |

---

## 25. Search `/search`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/search` | Global search across all entities | Any authenticated |
| `GET` | `/search/students` | Search students | Admin |
| `GET` | `/search/teachers` | Search teachers | Admin |

**Query Params:** `q` (required), `type`, `limit`

---

## 26. Files `/files`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/files` | List uploaded files | Any authenticated |
| `POST` | `/files/upload` | Upload a file | Any authenticated |
| `GET` | `/files/{id}` | Get file metadata | Any authenticated |
| `DELETE` | `/files/{id}` | Delete file | Admin/Owner |
| `GET` | `/files/{id}/download` | Download file | Any authenticated |
| `PUT` | `/files/{id}` | Update file metadata | Admin/Owner |
| `GET` | `/files/stats` | File storage stats | Admin |
| `POST` | `/files/{id}/share` | Share file with user | Admin/Owner |

---

## 27. Settings `/settings`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/settings/school` | Get school configuration | Admin |
| `PUT` | `/settings/school` | Update school settings | Admin |
| `GET` | `/settings/academic-years` | List academic years | Admin |
| `POST` | `/settings/academic-years` | Create academic year | Admin |
| `PUT` | `/settings/academic-years/{id}` | Update academic year | Admin |
| `DELETE` | `/settings/academic-years/{id}` | Delete academic year | Admin |
| `POST` | `/settings/academic-years/{id}/activate` | Set active academic year | Admin |
| `GET` | `/settings/preferences` | Get system preferences | Admin |
| `PUT` | `/settings/preferences` | Update preferences | Admin |
| `GET` | `/settings/theme` | Get UI theme settings | Admin |
| `PUT` | `/settings/theme` | Update theme settings | Admin |
| `POST` | `/settings/reset` | Reset to default settings | Admin |

---

## 28. Payments `/payments`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/payments/initiate` | Initiate Razorpay payment | Admin/Parent |
| `POST` | `/payments/verify` | Verify payment signature | Admin/Parent |
| `POST` | `/payments/webhook` | Razorpay webhook receiver | Internal |
| `GET` | `/payments` | List all payment transactions | Admin |
| `GET` | `/payments/stats` | Payment statistics | Admin |
| `GET` | `/payments/{id}` | Get transaction by ID | Admin |
| `GET` | `/payments/{id}/receipt` | Download payment receipt | Admin/Parent |
| `POST` | `/payments/{id}/refund` | Process refund | Admin |

---

## 29. Plugins `/plugins`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/plugins` | List all installed plugins | Admin |
| `GET` | `/plugins/stats` | Plugin system statistics | Admin |
| `GET` | `/plugins/hooks` | List all registered hooks | Admin |
| `GET` | `/plugins/{name}` | Get plugin details | Admin |
| `POST` | `/plugins/{name}/activate` | Activate a plugin | Admin |
| `POST` | `/plugins/{name}/deactivate` | Deactivate a plugin | Admin |
| `DELETE` | `/plugins/{name}` | Uninstall a plugin | Admin |
| `PUT` | `/plugins/{name}/config` | Update plugin configuration | Admin |

---

## 30. Student Profile `/student-profile`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/student-profile/me` | Get own profile & dashboard | Student |
| `PUT` | `/student-profile/me` | Update own profile | Student |
| `GET` | `/student-profile/me/grades` | Own grades summary | Student |
| `GET` | `/student-profile/me/attendance` | Own attendance summary | Student |
| `GET` | `/student-profile/me/fees` | Own fee invoices | Student |
| `GET` | `/student-profile/me/timetable` | Own class timetable | Student |
| `GET` | `/student-profile/me/notifications` | Own notifications | Student |

---

## 31. Teacher Profile `/teacher-profile`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/teacher-profile/me` | Get own profile & dashboard | Teacher |
| `PUT` | `/teacher-profile/me` | Update own profile | Teacher |
| `GET` | `/teacher-profile/me/timetable` | Own teaching schedule | Teacher |
| `GET` | `/teacher-profile/me/classes` | Classes I teach | Teacher |
| `GET` | `/teacher-profile/me/attendance` | My attendance record | Teacher |
| `GET` | `/teacher-profile/me/leaves` | My leave requests | Teacher |
| `GET` | `/teacher-profile/me/payslips` | My pay slips | Teacher |
| `GET` | `/teacher-profile/me/students` | My students list | Teacher |
| `POST` | `/teacher-profile/me/attendance/mark` | Mark class attendance | Teacher |
| `GET` | `/teacher-profile/me/notifications` | My notifications | Teacher |

---

## 32. Parent Profile `/parent-profile`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/parent-profile/me` | Get own profile & children list | Parent |
| `PUT` | `/parent-profile/me` | Update own profile | Parent |
| `GET` | `/parent-profile/me/children` | My children's details | Parent |
| `GET` | `/parent-profile/me/children/{id}/grades` | Child's grades | Parent |
| `GET` | `/parent-profile/me/children/{id}/attendance` | Child's attendance | Parent |
| `GET` | `/parent-profile/me/fees` | My fee invoices | Parent |
| `POST` | `/parent-profile/me/fees/pay` | Pay fees online | Parent |
| `GET` | `/parent-profile/me/notifications` | My notifications | Parent |
| `GET` | `/parent-profile/me/timetable/{child_id}` | Child's timetable | Parent |

---

## 33. Webhooks

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/webhooks/payment` | Payment gateway webhook | HMAC Signed |
| `GET` | `/webhooks` | List registered webhooks | Admin |
| `POST` | `/webhooks` | Register new webhook | Admin |

---

## 34. GDPR `/gdpr`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/gdpr/data/export/{user_id}` | Export all personal data | Admin/Self |
| `DELETE` | `/gdpr/data/delete/{user_id}` | Request data deletion | Admin |
| `POST` | `/gdpr/consent` | Record consent | Any authenticated |
| `GET` | `/gdpr/consent/{user_id}` | Get consent records | Admin/Self |
| `GET` | `/gdpr/audit-log` | View data access audit log | Admin |
| `POST` | `/gdpr/anonymize/{user_id}` | Anonymize user data | Admin |
| `GET` | `/gdpr/retention-policy` | Get data retention policies | Admin |
| `PUT` | `/gdpr/retention-policy` | Update retention policy | Admin |
| `GET` | `/gdpr/breach-records` | List data breach records | Admin |
| `POST` | `/gdpr/breach-records` | Record data breach | Admin |
| `GET` | `/gdpr/compliance-report` | Generate GDPR compliance report | Admin |
| `POST` | `/gdpr/data/portability/{user_id}` | Export data in portable format | Admin/Self |

---

## Error Responses

All endpoints use standard HTTP status codes:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request — validation error |
| `401` | Unauthorized — missing/invalid token |
| `403` | Forbidden — insufficient role |
| `404` | Not Found |
| `409` | Conflict — duplicate resource |
| `422` | Unprocessable Entity — Pydantic validation |
| `429` | Too Many Requests — rate limited |
| `500` | Internal Server Error |

**Error Response Format:**
```json
{
  "detail": "Error message here",
  "status_code": 404,
  "error": "not_found"
}
```
