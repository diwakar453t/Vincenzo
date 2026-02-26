import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import {
    Box, Typography, Grid, Card, CardContent, Avatar, Chip, LinearProgress,
    Tab, Tabs, Button, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Paper, List, ListItem, ListItemText, ListItemIcon,
    Divider, Badge, IconButton, Tooltip,
} from '@mui/material';
import {
    School, Schedule, Assignment, CheckCircle, TrendingUp,
    CalendarMonth, MenuBook, Person, Payment, Notifications,
    Message, EventNote, Download, Star, Warning, AutoGraph,
    Book, EmojiEvents, QuizOutlined, LibraryBooks, CreditCard,
} from '@mui/icons-material';

// ─── Mock data ──────────────────────────────────────────────────────────────
const mockSchedule = [
    { id: 1, subject: 'Mathematics', teacher: 'Mr. Sharma', startTime: '09:00', endTime: '10:00', room: 'A101' },
    { id: 2, subject: 'Physics', teacher: 'Ms. Patel', startTime: '10:00', endTime: '11:00', room: 'B202' },
    { id: 3, subject: 'English', teacher: 'Mrs. Singh', startTime: '11:15', endTime: '12:15', room: 'A103' },
    { id: 4, subject: 'Chemistry', teacher: 'Mr. Kumar', startTime: '12:15', endTime: '01:15', room: 'Lab-1' },
    { id: 5, subject: 'Computer Science', teacher: 'Ms. Gupta', startTime: '02:00', endTime: '03:00', room: 'Lab-2' },
    { id: 6, subject: 'History', teacher: 'Mr. Mehta', startTime: '03:00', endTime: '04:00', room: 'A201' },
];
const mockResults = [
    { id: 1, subject: 'Mathematics', examType: 'Mid Term', marks: 87, total: 100, grade: 'A' },
    { id: 2, subject: 'Physics', examType: 'Mid Term', marks: 74, total: 100, grade: 'B+' },
    { id: 3, subject: 'English', examType: 'Mid Term', marks: 91, total: 100, grade: 'A+' },
    { id: 4, subject: 'Chemistry', examType: 'Mid Term', marks: 65, total: 100, grade: 'B' },
    { id: 5, subject: 'Computer Science', examType: 'Mid Term', marks: 95, total: 100, grade: 'A+' },
];
const mockAssignments = [
    { id: 1, title: 'Calculus Problem Set', subject: 'Mathematics', dueDate: '2026-03-05', status: 'pending' },
    { id: 2, title: 'Essay on Shakespeare', subject: 'English', dueDate: '2026-03-02', status: 'submitted' },
    { id: 3, title: 'Titration Lab Report', subject: 'Chemistry', dueDate: '2026-03-08', status: 'pending' },
    { id: 4, title: 'Binary Tree Implementation', subject: 'Computer Science', dueDate: '2026-02-28', status: 'graded' },
];
const mockExams = [
    { id: 1, subject: 'Mathematics', date: '2026-03-15', time: '10:00 AM', room: 'Hall A', type: 'Final' },
    { id: 2, subject: 'Physics', date: '2026-03-17', time: '10:00 AM', room: 'Hall B', type: 'Final' },
    { id: 3, subject: 'English', date: '2026-03-19', time: '10:00 AM', room: 'Hall A', type: 'Final' },
];
const mockAnnouncements = [
    { id: 1, title: 'Annual Sports Day Registration', date: '2026-02-25', priority: 'high' },
    { id: 2, title: 'Library Book Return Deadline', date: '2026-02-28', priority: 'medium' },
    { id: 3, title: 'Parent-Teacher Meeting – March 10', date: '2026-03-01', priority: 'high' },
];
const mockFees = {
    total: 85000,
    paid: 60000,
    due: 25000,
    nextDueDate: '2026-03-31',
    history: [
        { id: 1, desc: 'Term 1 Tuition', amount: 30000, date: '2026-01-10', status: 'paid' },
        { id: 2, desc: 'Term 2 Tuition', amount: 30000, date: '2026-02-10', status: 'paid' },
        { id: 3, desc: 'Term 3 Tuition', amount: 25000, date: '2026-03-31', status: 'pending' },
    ],
};

const STAT_COLORS = {
    green: { bg: 'rgba(40,167,69,0.1)', fg: '#28A745' },
    blue: { bg: 'rgba(61,94,225,0.1)', fg: '#3D5EE1' },
    amber: { bg: 'rgba(255,193,7,0.1)', fg: '#FFC107' },
    purple: { bg: 'rgba(132,94,247,0.1)', fg: '#845EF7' },
    red: { bg: 'rgba(220,53,69,0.1)', fg: '#DC3545' },
    cyan: { bg: 'rgba(23,162,184,0.1)', fg: '#17A2B8' },
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: keyof typeof STAT_COLORS }) {
    const c = STAT_COLORS[color];
    return (
        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)', transition: 'transform .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 6px 20px rgba(0,0,0,0.11)' }, borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
                <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.fg, fontSize: 26 }}>{icon}</Box>
                <Box>
                    <Typography variant="h5" fontWeight={700}>{value}</Typography>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function StudentDashboardPage() {
    const [tab, setTab] = useState(0);
    const user = useSelector((state: RootState) => state.auth.user);

    const avgScore = Math.round(mockResults.reduce((a, r) => a + (r.marks / r.total) * 100, 0) / mockResults.length);
    const attendancePct = 88;
    const pendingTasks = mockAssignments.filter(a => a.status === 'pending').length;

    return (
        <Box>
            {/* ── Header ─────────────────────────────────────────── */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 60, height: 60, bgcolor: 'linear-gradient(135deg,#3D5EE1,#6366f1)', background: 'linear-gradient(135deg,#3D5EE1,#6366f1)', fontSize: '1.5rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
                        {user?.full_name?.charAt(0) || 'S'}
                    </Avatar>
                    <Box>
                        <Typography variant="h4" fontWeight={700}>Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}! 👋</Typography>
                        <Typography variant="body2" color="text.secondary">🎓 Your academic overview for today</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Badge badgeContent={3} color="error">
                        <IconButton sx={{ bgcolor: 'white', boxShadow: 1 }}><Notifications /></IconButton>
                    </Badge>
                    <Button variant="outlined" startIcon={<CreditCard />} size="small" sx={{ borderRadius: 2 }}>View ID Card</Button>
                </Box>
            </Box>

            {/* ── Quick Stats ────────────────────────────────────── */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { icon: <CheckCircle />, label: 'Attendance', value: `${attendancePct}%`, color: 'green' as const },
                    { icon: <TrendingUp />, label: 'Average Score', value: `${avgScore}%`, color: 'blue' as const },
                    { icon: <Assignment />, label: 'Pending Tasks', value: pendingTasks, color: 'amber' as const },
                    { icon: <Schedule />, label: "Today's Classes", value: mockSchedule.length, color: 'purple' as const },
                    { icon: <Payment />, label: 'Fee Due', value: '₹25,000', color: 'red' as const },
                    { icon: <EmojiEvents />, label: 'Top Subject', value: 'CS – 95%', color: 'cyan' as const },
                ].map(s => (
                    <Grid size={{ xs: 6, sm: 4, md: 2 }} key={s.label}>
                        <StatCard {...s} />
                    </Grid>
                ))}
            </Grid>

            {/* ── Tabs ───────────────────────────────────────────── */}
            <Paper sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', mb: 3, overflow: 'hidden' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
                    sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)', '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 52 } }}>
                    <Tab icon={<Schedule />} iconPosition="start" label="Timetable" />
                    <Tab icon={<Assignment />} iconPosition="start" label="Assignments" />
                    <Tab icon={<Star />} iconPosition="start" label="Results" />
                    <Tab icon={<QuizOutlined />} iconPosition="start" label="Exam Schedule" />
                    <Tab icon={<Payment />} iconPosition="start" label="Fees" />
                    <Tab icon={<Notifications />} iconPosition="start" label="Announcements" />
                    <Tab icon={<AutoGraph />} iconPosition="start" label="Analytics" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {/* ── 0: Timetable ── */}
                    {tab === 0 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>📅 Today's Class Schedule</Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'rgba(61,94,225,0.05)' }}>
                                            {['Time', 'Subject', 'Teacher', 'Room'].map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {mockSchedule.map(cls => (
                                            <TableRow key={cls.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.03)' } }}>
                                                <TableCell><Chip label={`${cls.startTime}–${cls.endTime}`} size="small" variant="outlined" /></TableCell>
                                                <TableCell><Typography fontWeight={600}>{cls.subject}</Typography></TableCell>
                                                <TableCell><Typography color="text.secondary">{cls.teacher}</Typography></TableCell>
                                                <TableCell><Chip label={cls.room} size="small" sx={{ bgcolor: 'rgba(132,94,247,0.1)', color: '#845EF7' }} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {/* ── 1: Assignments ── */}
                    {tab === 1 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>📝 Assignments & Submissions</Typography>
                                <Chip label={`${pendingTasks} Pending`} color="warning" />
                            </Box>
                            <Grid container spacing={2}>
                                {mockAssignments.map(a => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={a.id}>
                                        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: a.status === 'pending' ? '#FFC107' : a.status === 'graded' ? '#28A745' : 'rgba(0,0,0,0.12)' }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography fontWeight={700}>{a.title}</Typography>
                                                    <Chip label={a.status} size="small"
                                                        color={a.status === 'graded' ? 'success' : a.status === 'submitted' ? 'primary' : 'warning'} />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">{a.subject}</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                                                    <CalendarMonth sx={{ fontSize: 14, color: 'text.disabled' }} />
                                                    <Typography variant="caption" color="text.secondary">Due: {a.dueDate}</Typography>
                                                </Box>
                                                {a.status === 'pending' && (
                                                    <Button size="small" variant="contained" sx={{ mt: 1.5, borderRadius: 2 }}>Submit</Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* ── 2: Results ── */}
                    {tab === 2 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>🎯 Internal Marks & Results</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {mockResults.map(r => {
                                    const pct = Math.round((r.marks / r.total) * 100);
                                    return (
                                        <Grid size={{ xs: 12, sm: 6 }} key={r.id}>
                                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                        <Typography fontWeight={700}>{r.subject}</Typography>
                                                        <Chip label={r.grade} size="small" color={r.grade.startsWith('A') ? 'success' : 'primary'} />
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary">{r.examType}</Typography>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, mb: 0.5 }}>
                                                        <Typography variant="body2">{r.marks}/{r.total}</Typography>
                                                        <Typography variant="body2" fontWeight={700}>{pct}%</Typography>
                                                    </Box>
                                                    <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: pct >= 80 ? '#28A745' : pct >= 60 ? '#3D5EE1' : '#FFC107' } }} />
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button variant="outlined" startIcon={<Download />} sx={{ borderRadius: 2 }}>Download Report Card</Button>
                            </Box>
                        </Box>
                    )}

                    {/* ── 3: Exam Schedule ── */}
                    {tab === 3 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>🧪 Upcoming Exams</Typography>
                            <Grid container spacing={2}>
                                {mockExams.map(e => (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={e.id}>
                                        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#3D5EE1' }}>
                                            <CardContent>
                                                <Chip label={e.type} size="small" color="primary" sx={{ mb: 1 }} />
                                                <Typography variant="h6" fontWeight={700}>{e.subject}</Typography>
                                                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">📅 {e.date} at {e.time}</Typography>
                                                    <Typography variant="caption" color="text.secondary">🏫 {e.room}</Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* ── 4: Fees ── */}
                    {tab === 4 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>💳 Fee Status & Payments</Typography>
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Card sx={{ bgcolor: '#28A745', color: 'white', borderRadius: 3 }}>
                                        <CardContent>
                                            <Typography variant="body2" sx={{ opacity: 0.85 }}>Total Fee</Typography>
                                            <Typography variant="h4" fontWeight={700}>₹{mockFees.total.toLocaleString()}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Card sx={{ bgcolor: '#3D5EE1', color: 'white', borderRadius: 3 }}>
                                        <CardContent>
                                            <Typography variant="body2" sx={{ opacity: 0.85 }}>Paid</Typography>
                                            <Typography variant="h4" fontWeight={700}>₹{mockFees.paid.toLocaleString()}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Card sx={{ bgcolor: '#DC3545', color: 'white', borderRadius: 3 }}>
                                        <CardContent>
                                            <Typography variant="body2" sx={{ opacity: 0.85 }}>Due (by {mockFees.nextDueDate})</Typography>
                                            <Typography variant="h4" fontWeight={700}>₹{mockFees.due.toLocaleString()}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" mb={0.5}>Fee Payment Progress</Typography>
                                <LinearProgress variant="determinate" value={(mockFees.paid / mockFees.total) * 100}
                                    sx={{ height: 12, borderRadius: 6, bgcolor: 'rgba(0,0,0,0.07)', '& .MuiLinearProgress-bar': { borderRadius: 6, bgcolor: '#28A745' } }} />
                            </Box>
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow><TableCell sx={{ fontWeight: 700 }}>Description</TableCell><TableCell sx={{ fontWeight: 700 }}>Amount</TableCell><TableCell sx={{ fontWeight: 700 }}>Date</TableCell><TableCell sx={{ fontWeight: 700 }}>Status</TableCell><TableCell /></TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {mockFees.history.map(h => (
                                            <TableRow key={h.id}>
                                                <TableCell>{h.desc}</TableCell>
                                                <TableCell>₹{h.amount.toLocaleString()}</TableCell>
                                                <TableCell>{h.date}</TableCell>
                                                <TableCell><Chip label={h.status} size="small" color={h.status === 'paid' ? 'success' : 'warning'} /></TableCell>
                                                <TableCell>{h.status === 'paid' && <Tooltip title="Download Receipt"><IconButton size="small"><Download fontSize="small" /></IconButton></Tooltip>}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Box sx={{ mt: 2 }}>
                                <Button variant="contained" sx={{ borderRadius: 2, mr: 1 }}>Pay Now ₹25,000</Button>
                                <Button variant="outlined" startIcon={<Download />} sx={{ borderRadius: 2 }}>Download All Receipts</Button>
                            </Box>
                        </Box>
                    )}

                    {/* ── 5: Announcements ── */}
                    {tab === 5 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>📢 Announcements & Events</Typography>
                            <List disablePadding>
                                {mockAnnouncements.map((a, i) => (
                                    <Box key={a.id}>
                                        <ListItem sx={{ px: 0 }}>
                                            <ListItemIcon><Notifications sx={{ color: a.priority === 'high' ? '#DC3545' : '#FFC107' }} /></ListItemIcon>
                                            <ListItemText primary={<Typography fontWeight={600}>{a.title}</Typography>} secondary={a.date} />
                                            {a.priority === 'high' && <Chip label="Important" size="small" color="error" />}
                                        </ListItem>
                                        {i < mockAnnouncements.length - 1 && <Divider />}
                                    </Box>
                                ))}
                            </List>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" fontWeight={700} mb={2}>🎫 Apply for Leave</Typography>
                            <Button variant="outlined" startIcon={<EventNote />} sx={{ borderRadius: 2 }}>Apply Leave</Button>
                            <Typography variant="body2" color="text.secondary" mt={1}>You can apply for leave, subject to department approval.</Typography>
                        </Box>
                    )}

                    {/* ── 6: Analytics ── */}
                    {tab === 6 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={1}>📈 Performance Analytics</Typography>
                            <Typography variant="body2" color="text.secondary" mb={3}>AI-powered insights based on your academic data</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                <Warning sx={{ color: '#FFC107' }} />
                                                <Typography fontWeight={700}>⚠️ Weak Subjects</Typography>
                                            </Box>
                                            {mockResults.filter(r => (r.marks / r.total) < 0.75).map(r => (
                                                <Box key={r.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                                    <Typography variant="body2">{r.subject}</Typography>
                                                    <Chip label={`${Math.round((r.marks / r.total) * 100)}%`} size="small" color="warning" />
                                                </Box>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                <AutoGraph sx={{ color: '#28A745' }} />
                                                <Typography fontWeight={700}>📊 Attendance Prediction</Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" mb={1}>Current Attendance: <strong>88%</strong></Typography>
                                            <LinearProgress variant="determinate" value={88} sx={{ height: 10, borderRadius: 5, mb: 1, '& .MuiLinearProgress-bar': { bgcolor: '#28A745', borderRadius: 5 } }} />
                                            <Chip label="✅ Safe – Above 75% threshold" color="success" size="small" />
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #3D5EE1 0%, #6366f1 100%)', color: 'white' }}>
                                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                                            <Book sx={{ fontSize: 48, opacity: 0.85 }} />
                                            <Box>
                                                <Typography variant="h6" fontWeight={700}>🤖 AI Study Assistant</Typography>
                                                <Typography variant="body2" sx={{ opacity: 0.9 }}>Get personalized study plans, concept explanations, and practice questions powered by AI.</Typography>
                                                <Button variant="contained" size="small" sx={{ mt: 1.5, bgcolor: 'white', color: '#3D5EE1', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }, borderRadius: 2 }}>
                                                    Launch AI Assistant
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* ── Quick Actions Row ───────────────────────────────── */}
            <Typography variant="h6" fontWeight={700} mb={2}>Quick Actions</Typography>
            <Grid container spacing={2}>
                {[
                    { icon: <Message />, label: 'Message Teacher', color: '#3D5EE1' },
                    { icon: <EventNote />, label: 'Apply Leave', color: '#845EF7' },
                    { icon: <LibraryBooks />, label: 'Study Materials', color: '#28A745' },
                    { icon: <Download />, label: 'Download ID Card', color: '#17A2B8' },
                ].map(a => (
                    <Grid size={{ xs: 6, sm: 3 }} key={a.label}>
                        <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'transform .2s', '&:hover': { transform: 'translateY(-3px)' }, textAlign: 'center' }}>
                            <CardContent sx={{ py: 3 }}>
                                <Box sx={{ width: 50, height: 50, borderRadius: '50%', bgcolor: `${a.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, mx: 'auto', mb: 1.5 }}>{a.icon}</Box>
                                <Typography variant="body2" fontWeight={600}>{a.label}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
