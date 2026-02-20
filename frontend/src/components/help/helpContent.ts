export interface HelpTopic {
    title: string;
    description: string;
    steps: string[];
    tips?: string[];
}

export const helpContent: Record<string, HelpTopic> = {
    '/dashboard': {
        title: 'Dashboard',
        description: 'Overview of key metrics and recent activity across your school.',
        steps: [
            'View summary cards: total students, teachers, attendance rate, and revenue',
            'Check Recent Activity for latest system events',
            'View Alerts for any issues requiring your attention',
            'Use the sidebar navigation to go to any module',
            'Click your name (top-right) to access profile and settings',
        ],
        tips: [
            'Dashboard data refreshes every 30 seconds automatically',
            'Click any summary card to navigate to the full module',
        ],
    },
    '/students': {
        title: 'Students',
        description: 'Manage all student records in your school.',
        steps: [
            'Use the search bar to find students by name or student ID',
            'Filter by Class or Status using the dropdowns',
            'Click a student row to view their full profile',
            'Click Add Student (top-right) to create a new record',
            'Use the edit (✏️) icon in any row to update a student',
            'Use the delete (🗑️) icon to remove a student record',
        ],
        tips: [
            'Use Bulk Import to add many students at once from a CSV file',
            'Student ID must be unique across your school',
            'Deleting a student removes their attendance and grade records',
        ],
    },
    '/students/add': {
        title: 'Add Student',
        description: 'Create a new student record in the system.',
        steps: [
            'Fill in all required fields: Name, Student ID, Date of Birth, Class',
            'Add contact information: email, phone, address',
            'Add emergency contact details for safety',
            'Optionally add medical information to assist staff',
            'Select Guardian from the dropdown or add a new one',
            'Click Save Student to create the record',
        ],
        tips: ['Student ID format: use your school\'s standard (e.g., STU-2026-001)'],
    },
    '/teachers': {
        title: 'Teachers',
        description: 'Manage all teacher and staff records.',
        steps: [
            'Browse the teacher list with search and department filter',
            'Click Add Teacher to onboard a new staff member',
            'Click any row to view full teacher details',
            'Edit teacher records with the pencil icon',
            'Assign classes and departments from the teacher detail view',
        ],
        tips: ['Teacher email becomes their login credential', 'Employee ID must be unique'],
    },
    '/classes': {
        title: 'Classes',
        description: 'Manage class groups, assign teachers and rooms.',
        steps: [
            'View all classes with their section, capacity, and current enrollment',
            'Click Add Class to create a new class group',
            'Assign a Class Teacher and Room to each class',
            'Click a class to see enrolled students',
            'Assign Rooms using the assign button on a class card',
        ],
        tips: ['A class can only have one room assigned at a time', 'Room capacity must match or exceed class size'],
    },
    '/subjects': {
        title: 'Subjects',
        description: 'Configure curriculum subjects and subject groups.',
        steps: [
            'View all subjects with their codes and credit hours',
            'Create Subject Groups to categorize related subjects',
            'Add new subjects using the Add Subject button',
            'Assign subjects to classes in the Subject-Class tab',
            'Each assignment also specifies which teacher teaches it',
        ],
        tips: ['Group subjects logically: Sciences, Languages, Arts, etc.', 'Credit hours affect GPA calculation'],
    },
    '/timetable': {
        title: 'Timetable',
        description: 'Build and view class schedules for the week.',
        steps: [
            'Select a class from the dropdown to view its timetable',
            'Click an empty time slot to add a new period',
            'Select: Subject, Teacher, Room, Day, Start Time, End Time',
            'Use Conflict Detection to find scheduling overlaps',
            'Click an existing slot to edit or delete it',
        ],
        tips: [
            'Each teacher can only be assigned to one room per time slot',
            'Use Bulk Create to set up a full week at once',
        ],
    },
    '/exams': {
        title: 'Exams',
        description: 'Schedule and manage examination sessions.',
        steps: [
            'View all upcoming and past exams in the list',
            'Click Add Exam to schedule a new examination',
            'Set: Name, Type (midterm/final/quiz), Class, Subject, Date, Room',
            'Set Total Marks and Passing Marks',
            'Students can view upcoming exams from their dashboard',
        ],
        tips: ['Book the exam room in advance to avoid conflicts', 'Exam results are entered via the Grades module'],
    },
    '/grades': {
        title: 'Grades',
        description: 'Record and view student exam results.',
        steps: [
            'Select an Exam from the dropdown',
            'The student list loads automatically for that exam\'s class',
            'Enter marks obtained for each student',
            'Use the checkbox to mark a student as Absent',
            'Grade letter is calculated automatically',
            'Click Save Grades to commit the results',
        ],
        tips: [
            'Use Bulk Upload to import grades from a CSV file',
            'Grade letters: A+ (90+), A (80+), B+ (70+), B (60+), C (50+), D (40+), F (<40)',
        ],
    },
    '/attendance/students': {
        title: 'Student Attendance',
        description: 'Mark and review daily student attendance.',
        steps: [
            'Select the Class and Date at the top',
            'The student list for that class loads automatically',
            'Mark each student: Present (✅), Absent (❌), Late (⏰), or Excused (📋)',
            'Add notes for individual students if needed',
            'Click Submit Attendance to save',
            'View attendance reports and trends in the Report tab',
        ],
        tips: [
            'Parents are automatically notified when their child is marked absent',
            'Attendance can be edited after submission — look for the Edit button',
        ],
    },
    '/attendance/staff': {
        title: 'Staff Attendance',
        description: 'Track daily teacher and staff attendance.',
        steps: [
            'Select the Date at the top',
            'All active teachers appear in the list',
            'Mark each teacher as Present, Absent, or On Leave',
            'Click Submit to save staff attendance for the day',
        ],
        tips: ['Staff attendance feeds into leave balance calculations'],
    },
    '/leaves': {
        title: 'Leave Management',
        description: 'Manage leave requests for students and staff.',
        steps: [
            'View all pending leave requests in the Pending tab',
            'Click Approve or Reject on any request',
            'Add a rejection reason when rejecting',
            'View the Leave Calendar to see team availability',
            'Check Leave Stats for overall leave usage trends',
            'Submit your own leave request using Apply for Leave',
        ],
        tips: ['Approved leave automatically updates the staff attendance record'],
    },
    '/payroll': {
        title: 'Payroll',
        description: 'Process monthly salary payments for teaching staff.',
        steps: [
            'Select Month and Year at the top',
            'View all teachers with their salary details',
            'Click Process Payroll to calculate net salary (basic + allowances - deductions)',
            'Click Mark as Paid after actual payment is made',
            'Download Pay Slip (PDF) for any teacher',
            'Use Bulk Process to process all teachers at once',
        ],
        tips: [
            'Set teacher salary in the Teacher record under the Payroll section',
            'Allowances and deductions can be added per teacher',
        ],
    },
    '/fees': {
        title: 'Fees Management',
        description: 'Manage fee structures, invoices, and payments.',
        steps: [
            'Fee Structures tab: create fee types per class (tuition, transport, etc.)',
            'Invoices tab: generate invoices for students from a fee structure',
            'Payments tab: record fee payments as they arrive',
            'Filter by status: Pending, Paid, Overdue, Partial',
            'Click an invoice to see details and record a payment',
            'Enable Razorpay in Settings for online fee collection',
        ],
        tips: [
            'Generate invoices at the start of each term',
            'Overdue fees appear highlighted in red',
        ],
    },
    '/library': {
        title: 'Library',
        description: 'Manage the school library catalog and book issues.',
        steps: [
            'Books tab: search and browse the full book catalogue',
            'Add books using the Add Book button',
            'Issue a book: click Issue Book, select member and book',
            'Return a book: find the issue record and click Return',
            'Overdue tab: see all books past their due date',
            'View Stats for library usage analytics',
        ],
        tips: [
            'Fine for overdue books: configured per book or library settings',
            'Reservations can be made for checked-out books',
        ],
    },
    '/hostel': {
        title: 'Hostel',
        description: 'Manage hostel blocks, rooms, and student allotments.',
        steps: [
            'Blocks tab: create hostel blocks (Boys Block A, Girls Block B, etc.)',
            'Rooms tab: add rooms to each block with type and capacity',
            'Allotments tab: assign students to rooms',
            'Click Check Out to end a student\'s hostel stay',
            'View occupancy stats on the Blocks tab',
        ],
        tips: ['Room type: Single, Double, Triple, or Dormitory affects capacity'],
    },
    '/transport': {
        title: 'Transport',
        description: 'Manage school bus routes, vehicles, and student enrollment.',
        steps: [
            'Routes tab: create named routes with pickup stops',
            'Vehicles tab: add buses/vans with driver details',
            'Assign a vehicle to a route in the Vehicle form',
            'Enroll students: select student and their pickup stop',
            'View Stats for transport usage',
        ],
        tips: ['Keep insurance and fitness expiry dates up to date for compliance'],
    },
    '/sports': {
        title: 'Sports',
        description: 'Manage sports activities and student achievements.',
        steps: [
            'Activities tab: create sports activities (Cricket, Football, Chess, etc.)',
            'Assign a coach teacher to each activity',
            'Enroll students in activities they participate in',
            'Achievements tab: record medals and certificates',
            'Filter achievements by sport and student',
        ],
        tips: ['Achievement types: Gold, Silver, Bronze, Participation, Special Award'],
    },
    '/reports': {
        title: 'Reports',
        description: 'Generate and export school management reports.',
        steps: [
            'Select a report type: Academic, Attendance, Financial, Enrollment, Staff',
            'Set filters: date range, class, academic year',
            'Click Generate Report',
            'View results in the interactive table',
            'Export to CSV using the Export button',
        ],
        tips: ['Saved reports appear in the Saved Reports tab for later access'],
    },
    '/notifications': {
        title: 'Notifications',
        description: 'Manage and send system notifications.',
        steps: [
            'View all your notifications in the list',
            'Click a notification to read it — it\'s marked as read automatically',
            'Use Mark All Read to clear all badges',
            'Click Send Notification (admin) to broadcast to a group or role',
            'Use Preferences to control what types of notifications you receive',
        ],
        tips: ['Urgent notifications appear at the top', 'Notifications from plugins are labeled with the plugin name'],
    },
    '/files': {
        title: 'File Manager',
        description: 'Upload and manage documents and media files.',
        steps: [
            'My Files tab: view all files you have uploaded',
            'Click Upload File to upload a new document (PDF, image, Word, etc.)',
            'Set the document type (Syllabus, Assignment, Report, etc.)',
            'Click Download to download any file',
            'Delete files using the delete icon (only your own files)',
        ],
        tips: ['Maximum file size: 10 MB per file', 'Mark a file as Public to allow other users to access it'],
    },
    '/payments': {
        title: 'Payments',
        description: 'Track online fee payments via Razorpay.',
        steps: [
            'View all payment transactions in the main list',
            'Filter by status: Pending, Success, Failed, Refunded',
            'Click a payment to view details and download the receipt',
            'Click Refund to initiate a partial or full refund',
            'Initiate Payment lets you create a new payment link for a parent',
        ],
        tips: [
            'Razorpay must be enabled in Settings → Preferences for online payments',
            'Webhook must be configured in Razorpay dashboard pointing to your backend',
        ],
    },
    '/plugins': {
        title: 'Plugin Management',
        description: 'Manage the plugin extensions installed in your system.',
        steps: [
            'View all installed plugins with their status (Active/Inactive)',
            'Click Activate to enable a plugin',
            'Click Deactivate to disable a plugin without uninstalling',
            'Click Configure to set plugin-specific settings',
            'Hooks tab: see all registered event hooks and their handlers',
        ],
        tips: [
            'New plugins are discovered automatically on server restart',
            'Deactivating a plugin does not delete its data or configuration',
        ],
    },
    '/settings': {
        title: 'Settings',
        description: 'Configure school-wide settings, academic years, and theme.',
        steps: [
            'School tab: update school name, logo, address, contact info',
            'Academic Years tab: create and activate academic years',
            'Preferences tab: set timezone, currency, date format',
            'Theme tab: choose light or dark mode, primary color',
            'Click Save after making any changes',
        ],
        tips: [
            'Only one academic year can be active at a time',
            'Theme changes apply to all users (school-wide setting)',
        ],
    },
    '/departments': {
        title: 'Departments',
        description: 'Organize teachers into academic departments.',
        steps: [
            'View all departments with their teacher count',
            'Click Add Department to create a new one',
            'Assign a Department Head from existing teachers',
            'Teachers are assigned to departments in the Teacher form',
        ],
    },
    '/rooms': {
        title: 'Rooms',
        description: 'Manage classrooms, labs, and other school spaces.',
        steps: [
            'View all rooms with type, capacity, and availability',
            'Click Add Room to register a new room',
            'Mark rooms as Available or Unavailable',
            'Check Availability to see if a room is free at a specific time',
            'Rooms are assigned to classes and timetable slots',
        ],
        tips: ['Mark rooms as Unavailable during renovation or events'],
    },
    '/syllabus': {
        title: 'Syllabus',
        description: 'Manage curriculum content and track completion progress.',
        steps: [
            'Filter by Class and Subject using the dropdowns',
            'Click Add Syllabus to create a new syllabus entry',
            'Upload syllabus documents (PDF, Word) for student reference',
            'Update Progress: drag the slider to show % completed',
            'Students can view syllabus from their dashboard',
        ],
        tips: ['Link syllabus to academic years for proper archiving'],
    },
    '/faq': {
        title: 'FAQ — Frequently Asked Questions',
        description: 'Common questions answered by role.',
        steps: [
            'Select your role tab: Admin, Teacher, Student, or Parent',
            'Click any question to expand the answer',
            'Use your browser\'s Ctrl+F to search within the FAQ',
        ],
    },
    '/help': {
        title: 'Help Manual',
        description: 'Complete user manual for all roles.',
        steps: [
            'Navigate to your role section using the page anchor links',
            'Follow step-by-step instructions for each task',
            'Use Ctrl+F to search for specific topics',
        ],
    },
};
