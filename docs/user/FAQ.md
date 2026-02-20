# Frequently Asked Questions — PreSkool ERP

---

## 🛠️ Admin FAQs

**Q: How do I add a new school year?**  
A: Go to **Settings → Academic Years → Add New**. Enter the year name (e.g., "2025-2026"), start and end dates, then click **Set as Active**.

**Q: Can I import students from a spreadsheet?**  
A: Yes! Go to **Students → Bulk Import**. Download the CSV template, fill in student data, then upload the file. The system validates and imports all records.

**Q: How do I configure the school logo and name?**  
A: Go to **Settings → School Settings**. Upload your logo (PNG/JPG, max 2 MB) and fill in all school details. Changes are reflected immediately in the app.

**Q: A teacher forgot their password. How do I reset it?**  
A: Direct the teacher to the **Forgot Password** link on the login page. They'll receive a reset email. If email isn't configured, you can set a new password directly from **Settings → User Management**.

**Q: How do I set up fee collection?**  
A: 1. Create a **Fee Structure** (Fees → Fee Structures) for each fee type and class.  
2. Generate **Invoices** for students (Fees → Invoices → Generate).  
3. Record payments as they arrive, or enable Razorpay for online payments.

**Q: Why aren't notifications being sent to parents?**  
A: Check that the `attendance_alerts` plugin is **Active** in the Plugins page. Also verify that students have their `parent_id` linked (check under each student's profile).

**Q: How do I generate the end-of-term report?**  
A: Go to **Reports → Academic**. Set the date range and click **Generate**. Export to CSV from the results page.

**Q: Can different schools use the same system?**  
A: Yes! PreSkool is multi-tenant. Each school gets an isolated `tenant_id`. Contact your system administrator to provision a new tenant.

---

## 📚 Teacher FAQs

**Q: I marked the wrong attendance. Can I correct it?**  
A: Yes. Go to **Attendance**, find the class and date, and click **Edit**. Update the individual student records and save. All corrections are logged.

**Q: How do I view my full class list?**  
A: Go to your **Teacher Dashboard → My Classes**. Each class card shows enrolled students. Click a class to see the full list.

**Q: Where do I add exam grades?**  
A: Go to **Grades → Select Exam**. Find your exam in the list, then click **Enter Grades** to open the grading table. Enter marks and click **Save**.

**Q: Can I upload lesson plans or documents?**  
A: Yes. Go to **Syllabus → Select Class → Upload Document**. Supported formats: PDF, DOC, DOCX, PPT, images.

**Q: How many leave days do I have remaining?**  
A: Go to **Leaves → Leave Balance**. It shows your remaining days for each leave type (Sick, Casual, Earned, etc.).

**Q: I can't see the timetable for my class. What's wrong?**  
A: Ask your admin to check if timetable entries have been created for your class in the **Timetable** module. New classes need their schedule set up first.

---

## 🎓 Student FAQs

**Q: Where can I see my exam results?**  
A: Go to **Grades** from your dashboard. Results are shown by exam with your marks, grade letter, and teacher remarks.

**Q: How do I check which books I have borrowed from the library?**  
A: Go to **Library → My Issued Books**. It shows all books currently with you and their due dates. Overdue books appear in red.

**Q: My attendance percentage looks wrong. What should I do?**  
A: Go to **Attendance → My Attendance** and review the calendar. If you see a date marked incorrectly, contact your class teacher to update it.

**Q: I paid my fees online but the invoice still shows "Pending". Is that normal?**  
A: Payment verification usually happens within a few seconds. If the status doesn't update after 2 minutes, click the **Refresh** button on the invoice. If still not updated, contact your administrator with your payment transaction ID.

**Q: Can I download my grade report card?**  
A: Yes! Go to **Grades → Report Card** and click **Download PDF**. This shows all your grades for the current academic year.

**Q: How do I know which room my exam is in?**  
A: Go to **Exams**. Each exam listing shows the scheduled date, time, and room number.

---

## 👨‍👩‍👧 Parent FAQs

**Q: I have two children in this school. How do I switch between their profiles?**  
A: Your dashboard shows all linked children as separate cards. Click on any child's name/card to view their specific details (grades, attendance, fees).

**Q: How do I pay my child's fees online?**  
A: Go to **Fees**, find the pending invoice, and click **Pay Now**. You'll be redirected to the Razorpay payment gateway. After payment, a receipt is emailed to you and available to download.

**Q: I receive too many notifications. Can I reduce them?**  
A: Go to **Notifications → Preferences**. You can choose which events trigger notifications (e.g., only absences, not grade updates).

**Q: My child was absent but I didn't get a notification. Why?**  
A: Notifications depend on your child's `parent_id` being correctly configured by the admin. Also check your notification preferences. Ask the school administrator to verify the linkage.

**Q: Can I see my child's homework or assignments?**  
A: Assignments are visible in the **Syllabus** section. Teachers upload documents and mark completion progress. Go to **Classes → View Syllabus** for your child's class.

**Q: How do I access the portal on my phone?**  
A: PreSkool ERP is mobile-responsive. Open your school's URL in any mobile browser (Chrome, Safari). It works on all screen sizes. A dedicated mobile app is planned for a future release.

---

## 🔐 Account & Login FAQs

**Q: I forgot my password.**  
A: Click **Forgot Password** on the login page. Enter your registered email and you'll receive a reset link.

**Q: My account is locked. What do I do?**  
A: After 5 failed login attempts, accounts are temporarily locked for 15 minutes. Wait and try again, or contact your school administrator to unlock immediately.

**Q: Can I change my email address?**  
A: Currently, email change requires an administrator action. Contact your school admin and they can update your email from User Management.

**Q: Is my data secure?**  
A: Yes. All data is encrypted in transit (HTTPS/TLS), passwords are hashed with bcrypt, and JWT tokens expire after 30 minutes. The system is GDPR-compliant with full data export and deletion rights.
