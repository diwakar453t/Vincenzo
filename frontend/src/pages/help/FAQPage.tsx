import { useState } from 'react';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tab,
    Tabs,
    Chip,
    Divider,
    TextField,
    InputAdornment,
    Container,
    Paper,
} from '@mui/material';
import {
    ExpandMore,
    AdminPanelSettings,
    School,
    Person,
    FamilyRestroom,
    Search,
    HelpOutline,
} from '@mui/icons-material';

interface FAQ {
    question: string;
    answer: string;
}

interface FAQGroup {
    role: string;
    icon: React.ReactNode;
    color: string;
    faqs: FAQ[];
}

const faqGroups: FAQGroup[] = [
    {
        role: 'Admin',
        icon: <AdminPanelSettings />,
        color: '#3d5ee1',
        faqs: [
            {
                question: 'How do I add a new school academic year?',
                answer:
                    'Go to Settings → Academic Years → Add New. Enter the year name (e.g., "2025-2026"), start and end dates, then click Set as Active.',
            },
            {
                question: 'Can I import students from a spreadsheet?',
                answer:
                    'Yes! Go to Students → Bulk Import. Download the CSV template provided, fill in your student data following the column headers, then upload the file. The system validates each row and reports any errors.',
            },
            {
                question: 'How do I configure the school logo and name?',
                answer:
                    'Go to Settings → School Settings. Upload your logo (PNG/JPG, max 2 MB) and fill in all school details. Changes take effect immediately across the platform.',
            },
            {
                question: 'A user forgot their password. How do I reset it?',
                answer:
                    'Direct the user to the Forgot Password link on the login page — they will receive an email reset link. If email is not configured, contact your system administrator to reset the password directly in the database.',
            },
            {
                question: 'How do I set up fee collection for a class?',
                answer:
                    '1. Create a Fee Structure (Fees → Fee Structures → Add) for each fee type and class. 2. Generate Invoices for students (Fees → Invoices → Generate). 3. Record payments as they arrive, or enable Razorpay for online collection in Settings.',
            },
            {
                question: 'Why aren\'t parent notifications being sent when students are absent?',
                answer:
                    'Check that the attendance_alerts plugin is Active in the Plugins page. Also verify that students have their parent linked — check the student profile for a valid parent_id.',
            },
            {
                question: 'How do I generate an end-of-term report?',
                answer:
                    'Go to Reports → Select "Academic" type. Set the date range for the term and click Generate. Export the results to CSV from the report view.',
            },
            {
                question: 'Can multiple schools use the same installation?',
                answer:
                    'Yes! PreSkool is multi-tenant. Each school gets an isolated tenant with their own data. Contact your system administrator to provision a new tenant.',
            },
        ],
    },
    {
        role: 'Teacher',
        icon: <School />,
        color: '#2e7d32',
        faqs: [
            {
                question: 'I marked the wrong attendance. Can I correct it?',
                answer:
                    'Yes. Go to Attendance, find the class and date using the filters, and click Edit. Update individual student records and save. All corrections are logged.',
            },
            {
                question: 'How do I view my full class list?',
                answer:
                    'Go to your Teacher Dashboard → My Classes. Each class card shows the enrollment count. Click any class to see the full alphabetical list of enrolled students.',
            },
            {
                question: 'Where do I enter exam grades?',
                answer:
                    'Go to Grades → Select Exam from the dropdown. Find your exam in the list, then click Enter Grades to open the grading table. Enter marks for each student and click Save.',
            },
            {
                question: 'Can I upload lesson plans or documents for students to access?',
                answer:
                    'Yes. Go to Syllabus → Select your class and subject → Upload Document. Supported formats include PDF, DOC, DOCX, and images. Students can download them from their dashboard.',
            },
            {
                question: 'How many leave days do I have remaining?',
                answer:
                    'Go to Leaves → Leave Balance. It shows your remaining days for each leave type (Sick, Casual, Earned, etc.) for the current academic year.',
            },
            {
                question: 'I can\'t see the timetable for my class — what\'s wrong?',
                answer:
                    'Ask your admin to check if timetable entries have been created for your class in the Timetable module. New classes need their schedule set up before it appears.',
            },
        ],
    },
    {
        role: 'Student',
        icon: <Person />,
        color: '#ed6c02',
        faqs: [
            {
                question: 'Where can I see my exam results?',
                answer:
                    'Go to Grades from your student dashboard. Results are shown by exam with your marks, grade letter (A+, A, B+, etc.), and any teacher remarks.',
            },
            {
                question: 'How do I check which library books I have borrowed?',
                answer:
                    'Go to Library → My Issued Books. It shows all books currently checked out in your name and their due dates. Books past their due date appear in red.',
            },
            {
                question: 'My attendance percentage looks incorrect — what should I do?',
                answer:
                    'Go to Attendance → My Attendance and review the calendar view. If you see a date incorrectly marked, contact your class teacher and ask them to update the record.',
            },
            {
                question: 'I paid my fees online but the invoice still shows "Pending".',
                answer:
                    'Payment verification usually updates within a few seconds. If the status doesn\'t change after 2 minutes, click Refresh on the invoice page. If still pending, contact your administrator with your Razorpay payment transaction ID.',
            },
            {
                question: 'Can I download my grade report card?',
                answer:
                    'Yes! Go to Grades → Report Card and click Download PDF. This generates a formatted report card showing all your grades for the current academic year.',
            },
            {
                question: 'How do I know which room my exam is in?',
                answer:
                    'Go to Exams in your student dashboard. Each upcoming exam shows the scheduled date, time, and room number assigned by your administrator.',
            },
        ],
    },
    {
        role: 'Parent',
        icon: <FamilyRestroom />,
        color: '#9c27b0',
        faqs: [
            {
                question: 'I have two children in this school — how do I switch between their profiles?',
                answer:
                    'Your Parent Dashboard shows all linked children as separate cards. Click on any child\'s name or card to view their specific details (grades, attendance, fees, timetable).',
            },
            {
                question: 'How do I pay my child\'s fees online?',
                answer:
                    'Go to Fees, find the pending invoice, and click Pay Now. You\'ll be redirected to the Razorpay payment gateway. You can pay via UPI, credit/debit card, or net banking. After payment, a receipt is emailed to you.',
            },
            {
                question: 'I receive too many notifications — can I reduce them?',
                answer:
                    'Go to Notifications → Preferences. You can choose which events trigger notifications, such as only receiving absence alerts but not grade publication notifications.',
            },
            {
                question: 'My child was absent but I didn\'t receive a notification. Why?',
                answer:
                    'Notifications require your account to be properly linked to your child\'s record. Contact the school administrator to verify the parent-student link is correctly set up.',
            },
            {
                question: 'Can I see my child\'s homework and assignments?',
                answer:
                    'Assignments and lesson materials are available in the Syllabus section. Teachers upload documents and mark progress. Go to your child\'s dashboard and click on their class syllabus.',
            },
            {
                question: 'How do I access the portal on my phone?',
                answer:
                    'PreSkool ERP is fully mobile-responsive. Open your school\'s URL in any mobile browser (Chrome, Safari). The layout adapts automatically for touch screens. A dedicated mobile app is planned for a future release.',
            },
        ],
    },
];

export default function FAQPage() {
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [expanded, setExpanded] = useState<string | false>(false);

    const handleAccordion = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    // Flatten and search across all FAQs
    const searchResults =
        searchQuery.trim()
            ? faqGroups.flatMap((group) =>
                group.faqs
                    .filter(
                        (faq) =>
                            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((faq) => ({ ...faq, role: group.role, color: group.color }))
            )
            : [];

    const activeGroup = faqGroups[activeTab];

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        mb: 2,
                    }}
                >
                    <HelpOutline sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    Frequently Asked Questions
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Find answers to common questions about PreSkool ERP
                </Typography>
            </Box>

            {/* Search */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid rgba(0,0,0,0.09)', borderRadius: 3 }}>
                <TextField
                    fullWidth
                    placeholder="Search all FAQ topics across all roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search color="action" />
                            </InputAdornment>
                        ),
                    }}
                    variant="outlined"
                    size="small"
                />
            </Paper>

            {/* Search Results */}
            {searchQuery.trim() && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                        {searchResults.length === 0
                            ? 'No results found'
                            : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`}
                    </Typography>
                    {searchResults.map((faq, index) => (
                        <Accordion
                            key={index}
                            expanded={expanded === `search-${index}`}
                            onChange={handleAccordion(`search-${index}`)}
                            elevation={0}
                            sx={{
                                mb: 1,
                                border: '1px solid rgba(0,0,0,0.09)',
                                borderRadius: '12px !important',
                                '&:before': { display: 'none' },
                                overflow: 'hidden',
                            }}
                        >
                            <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2.5, py: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                    <Chip
                                        label={faq.role}
                                        size="small"
                                        sx={{ bgcolor: faq.color, color: 'white', fontSize: '0.7rem', height: 20 }}
                                    />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {faq.question}
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                                    {faq.answer}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            )}

            {/* Tabbed FAQ (hidden during search) */}
            {!searchQuery.trim() && (
                <>
                    {/* Role Tabs */}
                    <Paper
                        elevation={0}
                        sx={{ border: '1px solid rgba(0,0,0,0.09)', borderRadius: 3, overflow: 'hidden', mb: 3 }}
                    >
                        <Tabs
                            value={activeTab}
                            onChange={(_, v) => setActiveTab(v)}
                            variant="fullWidth"
                            sx={{
                                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' },
                            }}
                        >
                            {faqGroups.map((group, i) => (
                                <Tab
                                    key={i}
                                    label={group.role}
                                    icon={group.icon as React.ReactElement}
                                    iconPosition="start"
                                    sx={{
                                        '&.Mui-selected': { color: group.color },
                                        gap: 0.5,
                                    }}
                                />
                            ))}
                        </Tabs>
                    </Paper>

                    {/* FAQ Accordions */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Box sx={{ color: activeGroup.color }}>{activeGroup.icon}</Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {activeGroup.role} Questions
                            </Typography>
                            <Chip
                                label={`${activeGroup.faqs.length} questions`}
                                size="small"
                                sx={{ bgcolor: activeGroup.color, color: 'white', fontSize: '0.7rem' }}
                            />
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        {activeGroup.faqs.map((faq, index) => (
                            <Accordion
                                key={index}
                                expanded={expanded === `${activeTab}-${index}`}
                                onChange={handleAccordion(`${activeTab}-${index}`)}
                                elevation={0}
                                sx={{
                                    mb: 1.5,
                                    border: '1px solid rgba(0,0,0,0.09)',
                                    borderRadius: '12px !important',
                                    '&:before': { display: 'none' },
                                    overflow: 'hidden',
                                    transition: 'box-shadow 0.2s',
                                    '&.Mui-expanded': {
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                        borderColor: activeGroup.color,
                                    },
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMore sx={{ color: activeGroup.color }} />}
                                    sx={{
                                        px: 3,
                                        py: 0.5,
                                        '&.Mui-expanded': { minHeight: 48 },
                                    }}
                                >
                                    <Typography variant="body1" sx={{ fontWeight: 600, pr: 2 }}>
                                        {faq.question}
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ px: 3, pt: 0, pb: 2.5 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                                        {faq.answer}
                                    </Typography>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                </>
            )}

            {/* Footer */}
            <Paper
                elevation={0}
                sx={{ mt: 4, p: 3, textAlign: 'center', bgcolor: 'rgba(61,94,225,0.04)', borderRadius: 3 }}
            >
                <Typography variant="body2" color="text.secondary">
                    Didn't find your answer?{' '}
                    <Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600, cursor: 'pointer' }}>
                        Click the{' '}
                        <HelpOutline sx={{ fontSize: 14, verticalAlign: 'middle' }} /> button on any page
                    </Typography>{' '}
                    for context-sensitive help, or contact your school administrator.
                </Typography>
            </Paper>
        </Container>
    );
}
