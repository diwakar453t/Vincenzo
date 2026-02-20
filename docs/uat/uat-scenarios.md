# PreSkool ERP — UAT Scenario Scripts

> **How to use:** Follow each scenario step-by-step on the staging environment.  
> Record the actual result and mark ✅ Pass or ❌ Fail.  
> Note any bugs with screenshots in the Bug column.

**Environment:** `http://staging.preskool.school`

---

## Role 1: School Administrator

### Scenario A-1: Student Enrollment (Critical Path)

**Pre-condition:** Logged in as Admin (`admin@preskool.test`)

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Navigate to **Students → Add Student** | Add Student form opens | | |
| 2 | Fill: First Name=`Arjun`, Last Name=`Sharma`, DOB=`2010-06-15`, Gender=`Male` | Fields accept input | | |
| 3 | Fill: Email=`arjun.sharma.uat@test.edu`, Enrollment Date=`today` | Fields accept input | | |
| 4 | Click **Save** | Success toast shown; redirected to student list | | |
| 5 | Search for `Arjun` in the student list | Student `Arjun Sharma` appears in results | | |
| 6 | Click the student to view detail | Student profile opens with correct data | | |
| 7 | Click **Edit** — change phone number — click **Save** | Update success; new phone shown | | |

**Pass Criteria:** Student can be created, found, and edited without errors.

---

### Scenario A-2: Fee Collection

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Navigate to **Finance → Fees** | Fees page loads with fee list | | |
| 2 | Find a student with pending dues | Student with ₹ amount shown | | |
| 3 | Click **Collect Fee** | Fee collection dialog opens | | |
| 4 | Enter amount, select payment method `UPI`, click **Confirm** | Collection recorded; balance updated | | |
| 5 | Navigate to **Fees → Pending** | The student's dues reduced by collected amount | | |
| 6 | Click **Generate Receipt** for the collected fee | Receipt PDF opens / downloads | | |

---

### Scenario A-3: Report Generation

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Navigate to **Reports** | Reports page loads | | |
| 2 | Select report type: `Academic` | Report options shown | | |
| 3 | Select Month: `February`, Year: `2026` — click **Generate** | Report generates (may take a few seconds) | | |
| 4 | Verify data: total students, attendance %, top performers shown | Stats are non-zero and correct | | |
| 5 | Click **Export / Download** | File downloads (CSV or PDF) | | |

---

### Scenario A-4: System Settings

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Navigate to **Settings** | Settings page loads | | |
| 2 | Update school name to `UAT Test School` — save | Success toast shown | | |
| 3 | Refresh page | Updated school name persists | | |
| 4 | Restore original school name — save | Restored successfully | | |

---

## Role 2: Teacher

### Scenario T-1: Mark Attendance (Critical Path)

**Pre-condition:** Logged in as Teacher (`teacher@preskool.test`)

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Navigate to **Attendance → Students** | Attendance page loads | | |
| 2 | Select class, date = today | Student list for class shown | | |
| 3 | Mark 3 students as `Absent`, rest as `Present` | Status toggles correctly | | |
| 4 | Click **Submit** | Success message: "Attendance recorded" | | |
| 5 | Navigate away, return to Attendance | Today's attendance shows correct records | | |
| 6 | Attempt to edit attendance for a different class (not assigned) | Access denied message shown | | |

---

### Scenario T-2: Record Grades

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Navigate to **Grades** | Grades page loads | | |
| 2 | Select exam from dropdown | Student list shown | | |
| 3 | Enter marks for 5 students (e.g., 85, 70, 91, 60, 77) | Input accepted; no errors | | |
| 4 | Click **Save Grades** | Success notification shown | | |
| 5 | Filter by student name | Correct marks displayed | | |

---

### Scenario T-3: View Timetable

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Navigate to **Timetable** | Teacher's timetable shown | | |
| 2 | Verify class periods, subjects, and room numbers | Data is consistent and non-empty | | |
| 3 | Switch to weekly view (if available) | Weekly layout loads correctly | | |

---

## Role 3: Student

### Scenario S-1: View Dashboard (Critical Path)

**Pre-condition:** Logged in as Student (`student@preskool.test`)

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Login with student credentials | Redirected to Student Dashboard | | |
| 2 | Verify dashboard shows: attendance %, recent grades, upcoming exams | Data cards are visible and non-zero | | |
| 3 | Navigate to **Attendance** | Student's own attendance history shown | | |
| 4 | Navigate to **Grades** | Student's own grades shown (not other students) | | |
| 5 | Attempt to navigate to `/students` (admin route) | Redirected to appropriate page or Access Denied | | |

---

### Scenario S-2: Library

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Navigate to **Library** | Library page loads | | |
| 2 | Search for `Mathematics` | Relevant books listed | | |
| 3 | View book details | Author, ISBN, availability shown | | |

---

## Role 4: Parent / Guardian

### Scenario P-1: View Ward's Academic Progress

**Pre-condition:** Logged in as Parent (`parent@preskool.test`), ward linked in system

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Login with parent credentials | Redirected to Parent Dashboard | | |
| 2 | View ward's attendance summary | Attendance % and calendar shown | | |
| 3 | View ward's recent grades | Subject-wise marks displayed | | |
| 4 | View fee dues | Outstanding amount shown | | |
| 5 | Attempt to edit student profile | Not allowed / no edit button | | |

---

## Cross-Role Scenarios

### Scenario X-1: Authentication & Security

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Enter wrong password 5 times | Account locked / CAPTCHA shown | | |
| 2 | Use Forgot Password — enter email — click Send | Password reset email received (Mailhog) | | |
| 3 | Click reset link in email | Reset password page opens | | |
| 4 | Enter new valid password | Password updated; can login with new password | | |
| 5 | Try old password | Login rejected | | |
| 6 | Open app in incognito tab — visit `/dashboard` | Redirected to `/login` | | |

---

### Scenario X-2: Mobile Responsiveness

Perform on a physical phone or Chrome DevTools (iPhone 12 / Pixel 5 mode):

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Open login page on mobile | Form visible, no horizontal scroll | | |
| 2 | Login successfully | Redirected to dashboard | | |
| 3 | Open navigation menu | Hamburger icon → drawer slides open | | |
| 4 | Navigate to Students list | Table scrolls horizontally, not clipped | | |
| 5 | Tap a student row | Detail opens or expands | | |

---

### Scenario X-3: Data Integrity

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Admin creates a student | Student visible in admin view | | |
| 2 | Teacher checks class list | New student appears (if in teacher's class) | | |
| 3 | Admin deletes the test student | Student removed from all lists | | |
| 4 | Teacher refreshes class list | Deleted student no longer appears | | |

---

## UAT Sign-Off by Scenario

| Scenario | Tester | Date | Result |
|----------|--------|------|--------|
| A-1 Student Enrollment | | | |
| A-2 Fee Collection | | | |
| A-3 Report Generation | | | |
| A-4 System Settings | | | |
| T-1 Mark Attendance | | | |
| T-2 Record Grades | | | |
| T-3 View Timetable | | | |
| S-1 Student Dashboard | | | |
| S-2 Library | | | |
| P-1 Parent Dashboard | | | |
| X-1 Auth & Security | | | |
| X-2 Mobile | | | |
| X-3 Data Integrity | | | |
