import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import {
    Box, Typography, Grid, Card, CardContent, Chip, Tab, Tabs,
    Button, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Paper, Avatar, LinearProgress, Badge,
    IconButton, List, ListItem, ListItemText, ListItemAvatar, Divider,
} from '@mui/material';
import {
    Schedule, People, Assignment, CheckCircle, TrendingUp,
    Notifications, Message, Upload, Grade, Assessment,
    Class, AttachFile, BarChart, CalendarToday, Star, Warning,
    Add, Edit, Visibility,
} from '@mui/icons-material';

// ─── Mock Data ───────────────────────────────────────────────────────────────
const mockClasses = [
    { id: 1, name: 'Class 10-A', subject: 'Mathematics', students: 32, time: '09:00–10:00', room: 'A101' },
    { id: 2, name: 'Class 10-B', subject: 'Mathematics', students: 30, time: '11:00–12:00', room: 'A103' },
    { id: 3, name: 'Class 9-A', subject: 'Mathematics', students: 28, time: '02:00–03:00', room: 'B201' },
];
const mockStudentsInClass = [
    { id: 1, name: 'Rahul Sharma', rollNo: 'STU001', attendance: 92, avgGrade: 'A', status: 'present' },
    { id: 2, name: 'Priya Patel', rollNo: 'STU002', attendance: 78, avgGrade: 'B+', status: 'present' },
    { id: 3, name: 'Amit Kumar', rollNo: 'STU003', attendance: 65, avgGrade: 'B', status: 'absent' },
    { id: 4, name: 'Sneha Gupta', rollNo: 'STU004', attendance: 95, avgGrade: 'A+', status: 'present' },
    { id: 5, name: 'Karan Singh', rollNo: 'STU005', attendance: 55, avgGrade: 'C', status: 'present' },
];
const mockAssignments = [
    { id: 1, title: 'Algebra Problem Set', class: 'Class 10-A', dueDate: '2026-03-05', submitted: 28, total: 32 },
    { id: 2, title: 'Calculus Practice', class: 'Class 10-B', dueDate: '2026-03-07', submitted: 20, total: 30 },
    { id: 3, title: 'Statistics Project', class: 'Class 9-A', dueDate: '2026-03-10', submitted: 15, total: 28 },
];
const mockInternalMarks = [
    { id: 1, student: 'Rahul Sharma', marks: 87, total: 100, grade: 'A' },
    { id: 2, student: 'Priya Patel', marks: 74, total: 100, grade: 'B+' },
    { id: 3, student: 'Amit Kumar', marks: 65, total: 100, grade: 'B' },
    { id: 4, student: 'Sneha Gupta', marks: 95, total: 100, grade: 'A+' },
];
const mockAnnouncements = [
    { id: 1, title: 'Extra class for Class 10-A', date: '2026-02-27', audience: 'Class 10-A' },
    { id: 2, title: 'Exam guidelines shared', date: '2026-02-25', audience: 'All Classes' },
];

const COLORS = {
    blue: { bg: 'rgba(61,94,225,0.1)', fg: '#3D5EE1' },
    green: { bg: 'rgba(40,167,69,0.1)', fg: '#28A745' },
    amber: { bg: 'rgba(255,193,7,0.1)', fg: '#FFC107' },
    purple: { bg: 'rgba(132,94,247,0.1)', fg: '#845EF7' },
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: keyof typeof COLORS }) {
    const c = COLORS[color];
    return (
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)', transition: 'transform .2s', '&:hover': { transform: 'translateY(-3px)' } }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.fg }}>{icon}</Box>
                <Box><Typography variant="h5" fontWeight={700}>{value}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></Box>
            </CardContent>
        </Card>
    );
}

export default function TeacherDashboardPage() {
    const [tab, setTab] = useState(0);
    const [attendanceData, setAttendanceData] = useState<Record<number, string>>(
        Object.fromEntries(mockStudentsInClass.map(s => [s.id, s.status]))
    );
    const user = useSelector((state: RootState) => state.auth.user);

    const presentCount = Object.values(attendanceData).filter(v => v === 'present').length;

    const handleAttendance = (id: number, status: string) => {
        setAttendanceData(prev => ({ ...prev, [id]: status }));
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 60, height: 60, background: 'linear-gradient(135deg,#28A745,#51CF66)', fontSize: '1.5rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(40,167,69,0.35)' }}>
                        {user?.full_name?.charAt(0) || 'T'}
                    </Avatar>
                    <Box>
                        <Typography variant="h4" fontWeight={700}>Welcome, {user?.full_name?.split(' ')[0] || 'Teacher'}! 👩🏫</Typography>
                        <Typography variant="body2" color="text.secondary">Here's your teaching overview for today</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Badge badgeContent={2} color="error">
                        <IconButton sx={{ bgcolor: 'white', boxShadow: 1 }}><Notifications /></IconButton>
                    </Badge>
                    <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2 }}>New Assignment</Button>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { icon: <Class />, label: 'Assigned Classes', value: mockClasses.length, color: 'blue' as const },
                    { icon: <People />, label: 'Total Students', value: mockClasses.reduce((a, c) => a + c.students, 0), color: 'green' as const },
                    { icon: <Assignment />, label: 'Active Assignments', value: mockAssignments.length, color: 'amber' as const },
                    { icon: <CheckCircle />, label: "Today's Attendance", value: `${presentCount}/${mockStudentsInClass.length}`, color: 'purple' as const },
                ].map(s => (
                    <Grid size={{ xs: 6, sm: 6, md: 3 }} key={s.label}>
                        <StatCard {...s} />
                    </Grid>
                ))}
            </Grid>

            {/* Tabs */}
            <Paper sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', mb: 3, overflow: 'hidden' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
                    sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)', '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 52 } }}>
                    <Tab icon={<Schedule />} iconPosition="start" label="My Classes" />
                    <Tab icon={<CheckCircle />} iconPosition="start" label="Mark Attendance" />
                    <Tab icon={<Assignment />} iconPosition="start" label="Assignments" />
                    <Tab icon={<Grade />} iconPosition="start" label="Enter Marks" />
                    <Tab icon={<Assessment />} iconPosition="start" label="Performance" />
                    <Tab icon={<Message />} iconPosition="start" label="Communication" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {/* 0: My Classes */}
                    {tab === 0 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>📅 Assigned Classes & Timetable</Typography>
                            <Grid container spacing={2}>
                                {mockClasses.map(cls => (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cls.id}>
                                        <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: '#28A745', boxShadow: '0 2px 10px rgba(40,167,69,0.15)' }, transition: 'all .2s' }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Chip label={cls.name} sx={{ bgcolor: 'rgba(40,167,69,0.1)', color: '#28A745', fontWeight: 700 }} />
                                                    <Chip label={cls.time} size="small" variant="outlined" />
                                                </Box>
                                                <Typography variant="h6" fontWeight={700} mt={1}>{cls.subject}</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                    <People sx={{ fontSize: 16, color: 'text.disabled' }} />
                                                    <Typography variant="caption" color="text.secondary">{cls.students} students</Typography>
                                                    <Box sx={{ flex: 1 }} />
                                                    <Typography variant="caption" color="text.secondary">Room {cls.room}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                                    <Button size="small" startIcon={<Visibility />} sx={{ borderRadius: 2 }}>View Students</Button>
                                                    <Button size="small" startIcon={<Upload />} variant="outlined" sx={{ borderRadius: 2 }}>Upload Material</Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>👥 Student List – Class 10-A</Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'rgba(40,167,69,0.05)' }}>
                                            {['Roll No', 'Student', 'Attendance', 'Avg Grade', 'Status'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {mockStudentsInClass.map(s => (
                                            <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(40,167,69,0.03)' } }}>
                                                <TableCell><Typography variant="body2" color="text.secondary">{s.rollNo}</Typography></TableCell>
                                                <TableCell><Typography fontWeight={600}>{s.name}</Typography></TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <LinearProgress variant="determinate" value={s.attendance} sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: s.attendance >= 75 ? '#28A745' : '#DC3545', borderRadius: 3 } }} />
                                                        <Typography variant="caption">{s.attendance}%</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell><Chip label={s.avgGrade} size="small" color={s.avgGrade.startsWith('A') ? 'success' : 'primary'} /></TableCell>
                                                <TableCell><Chip label={s.status} size="small" color={s.status === 'present' ? 'success' : 'error'} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {/* 1: Mark Attendance */}
                    {tab === 1 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>✅ Mark Attendance – Class 10-A</Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip label={`Present: ${presentCount}`} color="success" />
                                    <Chip label={`Absent: ${mockStudentsInClass.length - presentCount}`} color="error" />
                                </Box>
                            </Box>
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'rgba(61,94,225,0.05)' }}>
                                            {['Student', 'Roll No', 'Mark Attendance'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {mockStudentsInClass.map(s => (
                                            <TableRow key={s.id}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#3D5EE1', fontSize: '0.75rem' }}>{s.name.charAt(0)}</Avatar>
                                                        <Typography fontWeight={600}>{s.name}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell><Typography color="text.secondary">{s.rollNo}</Typography></TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        {['present', 'absent', 'leave'].map(v => (
                                                            <Button key={v} size="small" variant={attendanceData[s.id] === v ? 'contained' : 'outlined'}
                                                                color={v === 'present' ? 'success' : v === 'absent' ? 'error' : 'warning'}
                                                                onClick={() => handleAttendance(s.id, v)}
                                                                sx={{ textTransform: 'capitalize', borderRadius: 2, minWidth: 80 }}>
                                                                {v}
                                                            </Button>
                                                        ))}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                <Button variant="contained" color="success" sx={{ borderRadius: 2 }}>Save Attendance</Button>
                                <Button variant="outlined" sx={{ borderRadius: 2 }}>Bulk Upload CSV</Button>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                ℹ️ All edits are logged with timestamp for audit trail.
                            </Typography>
                        </Box>
                    )}

                    {/* 2: Assignments */}
                    {tab === 2 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>📝 Assignment Management</Typography>
                                <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2 }}>Create Assignment</Button>
                            </Box>
                            <Grid container spacing={2}>
                                {mockAssignments.map(a => (
                                    <Grid size={{ xs: 12 }} key={a.id}>
                                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                                                    <Box>
                                                        <Typography fontWeight={700}>{a.title}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{a.class} • Due: {a.dueDate}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                                        <Button size="small" startIcon={<Visibility />} sx={{ borderRadius: 2 }}>View Submissions</Button>
                                                        <Button size="small" variant="outlined" startIcon={<Grade />} sx={{ borderRadius: 2 }}>Grade</Button>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ mt: 2 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="caption">Submissions: {a.submitted}/{a.total}</Typography>
                                                        <Typography variant="caption">{Math.round((a.submitted / a.total) * 100)}%</Typography>
                                                    </Box>
                                                    <LinearProgress variant="determinate" value={(a.submitted / a.total) * 100}
                                                        sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: '#28A745', borderRadius: 3 } }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                            <Box sx={{ mt: 2 }}>
                                <Button variant="outlined" startIcon={<AttachFile />} sx={{ borderRadius: 2 }}>Upload Study Material</Button>
                            </Box>
                        </Box>
                    )}

                    {/* 3: Enter Marks */}
                    {tab === 3 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>📊 Enter Internal Marks</Typography>
                                <Chip label="Class 10-A – Mid Term" color="primary" />
                            </Box>
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'rgba(61,94,225,0.05)' }}>
                                            {['Student', 'Marks Obtained', 'Total Marks', 'Grade'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {mockInternalMarks.map(m => (
                                            <TableRow key={m.id}>
                                                <TableCell><Typography fontWeight={600}>{m.student}</Typography></TableCell>
                                                <TableCell><Typography fontWeight={700}>{m.marks}</Typography></TableCell>
                                                <TableCell><Typography color="text.secondary">{m.total}</Typography></TableCell>
                                                <TableCell><Chip label={m.grade} size="small" color={m.grade.startsWith('A') ? 'success' : 'primary'} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                <Button variant="contained" startIcon={<Edit />} sx={{ borderRadius: 2 }}>Edit & Save Marks</Button>
                                <Button variant="outlined" sx={{ borderRadius: 2 }}>Auto-Calculate Results</Button>
                                <Button variant="outlined" startIcon={<BarChart />} sx={{ borderRadius: 2 }}>Generate Report</Button>
                            </Box>
                        </Box>
                    )}

                    {/* 4: Performance */}
                    {tab === 4 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>📈 Class Performance Analytics</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent>
                                            <Typography fontWeight={700} mb={2}>📊 Average Score by Subject</Typography>
                                            {[
                                                { subject: 'Mathematics (Class 10-A)', avg: 78 },
                                                { subject: 'Mathematics (Class 10-B)', avg: 72 },
                                                { subject: 'Mathematics (Class 9-A)', avg: 68 },
                                            ].map(s => (
                                                <Box key={s.subject} sx={{ mb: 2 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="body2">{s.subject}</Typography>
                                                        <Typography variant="body2" fontWeight={700}>{s.avg}%</Typography>
                                                    </Box>
                                                    <LinearProgress variant="determinate" value={s.avg}
                                                        sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: s.avg >= 75 ? '#28A745' : '#FFC107' } }} />
                                                </Box>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                <Warning sx={{ color: '#DC3545' }} />
                                                <Typography fontWeight={700}>🚨 At-Risk Students</Typography>
                                            </Box>
                                            {mockStudentsInClass.filter(s => s.attendance < 75).map(s => (
                                                <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                                    <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                                                    <Chip label={`${s.attendance}% attendance`} size="small" color="error" />
                                                </Box>
                                            ))}
                                            {mockStudentsInClass.filter(s => s.attendance < 75).length === 0 &&
                                                <Typography variant="body2" color="text.secondary">✅ No at-risk students</Typography>}
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg,#28A745,#51CF66)', color: 'white' }}>
                                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                                            <Star sx={{ fontSize: 48, opacity: 0.85 }} />
                                            <Box>
                                                <Typography variant="h6" fontWeight={700}>🤖 AI Grading Assist</Typography>
                                                <Typography variant="body2" sx={{ opacity: 0.9 }}>Automatically grade open-ended answers using AI, with manual override support.</Typography>
                                                <Button size="small" variant="contained" sx={{ mt: 1.5, bgcolor: 'white', color: '#28A745', borderRadius: 2 }}>Enable AI Grading</Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* 5: Communication */}
                    {tab === 5 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>📢 Communication Center</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent>
                                            <Typography fontWeight={700} mb={2}>📋 My Announcements</Typography>
                                            <List disablePadding>
                                                {mockAnnouncements.map((a, i) => (
                                                    <Box key={a.id}>
                                                        <ListItem sx={{ px: 0 }}>
                                                            <ListItemAvatar><Avatar sx={{ bgcolor: '#28A745', width: 36, height: 36 }}><Notifications sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                                                            <ListItemText primary={<Typography variant="body2" fontWeight={600}>{a.title}</Typography>} secondary={`${a.date} • ${a.audience}`} />
                                                        </ListItem>
                                                        {i < mockAnnouncements.length - 1 && <Divider />}
                                                    </Box>
                                                ))}
                                            </List>
                                            <Button variant="outlined" startIcon={<Add />} fullWidth sx={{ mt: 2, borderRadius: 2 }}>Post Announcement</Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent>
                                            <Typography fontWeight={700} mb={2}>💬 Message Students / Parents</Typography>
                                            <Typography variant="body2" color="text.secondary" mb={2}>Send direct messages to students or notify parents about academic progress.</Typography>
                                            <Button variant="contained" startIcon={<Message />} fullWidth sx={{ mb: 1.5, borderRadius: 2 }}>Message a Student</Button>
                                            <Button variant="outlined" fullWidth sx={{ mb: 1.5, borderRadius: 2 }}>Notify Parents</Button>
                                            <Button variant="outlined" startIcon={<CalendarToday />} fullWidth sx={{ borderRadius: 2 }}>Schedule Extra Class</Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Box>
    );
}
