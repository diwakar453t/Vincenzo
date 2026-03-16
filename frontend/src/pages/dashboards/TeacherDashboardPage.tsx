import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import {
    fetchTeacherProfile,
    fetchTeacherClasses,
    fetchTeacherStudents,
    fetchTeacherAssignments,
    fetchTeacherSchedule,
} from '../../store/slices/teacherDashboardSlice';
import {
    Box, Typography, Grid, Card, CardContent, Chip, Tab, Tabs,
    Button, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Paper, Avatar, LinearProgress, Badge,
    IconButton, List, ListItem, ListItemText, ListItemAvatar, Divider,
    CircularProgress, Alert,
} from '@mui/material';
import {
    Schedule, People, Assignment, CheckCircle, TrendingUp,
    Notifications, Message, Upload, Grade, Assessment,
    Class, AttachFile, BarChart, CalendarToday, Star, Warning,
    Add, Edit, Visibility, Refresh,
} from '@mui/icons-material';

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
    const [attendanceData, setAttendanceData] = useState<Record<number, string>>({});
    const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.auth.user);
    const { profile, classes, students, assignments, schedule, loading, error } = useSelector((state: RootState) => state.teacherDashboard);

    useEffect(() => {
        dispatch(fetchTeacherProfile());
        dispatch(fetchTeacherClasses());
        dispatch(fetchTeacherStudents());
        dispatch(fetchTeacherAssignments());
        dispatch(fetchTeacherSchedule());
    }, [dispatch]);

    useEffect(() => {
        // Initialize attendance state from live student data
        if (students.length > 0) {
            const init = Object.fromEntries(students.map(s => [s.id, 'present']));
            setAttendanceData(init);
        }
    }, [students]);

    const handleAttendance = (id: number, status: string) => {
        setAttendanceData(prev => ({ ...prev, [id]: status }));
    };

    const presentCount = Object.values(attendanceData).filter(v => v === 'present').length;
    const totalStudents = classes.reduce((a, c) => a + (c.student_count ?? 0), 0);

    if (loading && !profile) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 60, height: 60, background: 'linear-gradient(135deg,#28A745,#51CF66)', fontSize: '1.5rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(40,167,69,0.35)' }}>
                        {(profile?.full_name || user?.full_name)?.charAt(0) || 'T'}
                    </Avatar>
                    <Box>
                        <Typography variant="h4" fontWeight={700}>Welcome, {(profile?.full_name || user?.full_name)?.split(' ')[0] || 'Teacher'}! 👩🏫</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {profile?.specialization || 'Teacher'} · Employee ID: {profile?.employee_id || '—'}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={() => { dispatch(fetchTeacherProfile()); dispatch(fetchTeacherClasses()); dispatch(fetchTeacherStudents()); dispatch(fetchTeacherAssignments()); dispatch(fetchTeacherSchedule()); }} title="Refresh">
                        <Refresh />
                    </IconButton>
                    <Badge badgeContent={2} color="error">
                        <IconButton sx={{ bgcolor: 'white', boxShadow: 1 }}><Notifications /></IconButton>
                    </Badge>
                    <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2 }}>New Assignment</Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {error} — Showing available data. Connect the backend to view live records.
                </Alert>
            )}

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { icon: <Class />, label: 'Assigned Classes', value: classes.length || '—', color: 'blue' as const },
                    { icon: <People />, label: 'Total Students', value: totalStudents || students.length || '—', color: 'green' as const },
                    { icon: <Assignment />, label: 'Active Assignments', value: assignments.length || '—', color: 'amber' as const },
                    { icon: <CheckCircle />, label: "Today's Attendance", value: students.length > 0 ? `${presentCount}/${students.length}` : '—', color: 'purple' as const },
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
                    {/* 0: My Classes — LIVE DATA */}
                    {tab === 0 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>📅 Assigned Classes & Timetable</Typography>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                            ) : classes.length === 0 ? (
                                <Alert severity="info" sx={{ borderRadius: 2 }}>No classes assigned yet. Ask your admin to assign you to classes.</Alert>
                            ) : (
                                <Grid container spacing={2}>
                                    {classes.map(cls => (
                                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cls.id}>
                                            <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: '#28A745', boxShadow: '0 2px 10px rgba(40,167,69,0.15)' }, transition: 'all .2s' }}>
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                        <Chip label={`${cls.name}${cls.section ? ` - ${cls.section}` : ''}`} sx={{ bgcolor: 'rgba(40,167,69,0.1)', color: '#28A745', fontWeight: 700 }} />
                                                        <Chip label={`Grade ${cls.grade_level}`} size="small" variant="outlined" />
                                                    </Box>
                                                    <Typography variant="h6" fontWeight={700} mt={1}>{cls.subject}</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                        <People sx={{ fontSize: 16, color: 'text.disabled' }} />
                                                        <Typography variant="caption" color="text.secondary">{cls.student_count} students</Typography>
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
                            )}

                            {/* Schedule (Live from DB) */}
                            {schedule.length > 0 && (
                                <>
                                    <Typography variant="h6" fontWeight={700} mt={4} mb={2}>🕐 My Schedule</Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'rgba(61,94,225,0.05)' }}>
                                                    {['Day', 'Time', 'Class', 'Subject', 'Room'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {schedule.map((s, i) => (
                                                    <TableRow key={i} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.03)' } }}>
                                                        <TableCell><Typography fontWeight={600}>{s.day}</Typography></TableCell>
                                                        <TableCell><Typography variant="body2">{s.start_time} – {s.end_time}</Typography></TableCell>
                                                        <TableCell><Chip label={s.class_name} size="small" sx={{ bgcolor: 'rgba(40,167,69,0.1)', color: '#28A745' }} /></TableCell>
                                                        <TableCell><Typography variant="body2">{s.subject_name}</Typography></TableCell>
                                                        <TableCell><Typography variant="body2" color="text.secondary">{s.room_number || '—'}</Typography></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}

                            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>👥 Student List (Live)</Typography>
                            {students.length === 0 ? (
                                <Alert severity="info" sx={{ borderRadius: 2 }}>No students found for your classes.</Alert>
                            ) : (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'rgba(40,167,69,0.05)' }}>
                                                {['Student ID', 'Student', 'Class', 'Status'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {students.map(s => (
                                                <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(40,167,69,0.03)' } }}>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{s.student_id}</Typography></TableCell>
                                                    <TableCell><Typography fontWeight={600}>{s.full_name}</Typography></TableCell>
                                                    <TableCell><Typography variant="body2">{s.class_name}</Typography></TableCell>
                                                    <TableCell><Chip label={s.grade || s.attendance_percentage ? `${s.attendance_percentage}%` : '—'} size="small" color="primary" /></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}

                    {/* 1: Mark Attendance — uses live student list */}
                    {tab === 1 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>✅ Mark Attendance</Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip label={`Present: ${presentCount}`} color="success" />
                                    <Chip label={`Absent: ${students.length - presentCount}`} color="error" />
                                </Box>
                            </Box>
                            {students.length === 0 ? (
                                <Alert severity="info" sx={{ borderRadius: 2 }}>No students loaded. Please check the My Classes tab first.</Alert>
                            ) : (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'rgba(61,94,225,0.05)' }}>
                                                {['Student', 'Student ID', 'Mark Attendance'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {students.map(s => (
                                                <TableRow key={s.id}>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#3D5EE1', fontSize: '0.75rem' }}>{s.full_name.charAt(0)}</Avatar>
                                                            <Typography fontWeight={600}>{s.full_name}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell><Typography color="text.secondary">{s.student_id}</Typography></TableCell>
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
                            )}
                            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                <Button variant="contained" color="success" sx={{ borderRadius: 2 }}>Save Attendance</Button>
                                <Button variant="outlined" sx={{ borderRadius: 2 }}>Bulk Upload CSV</Button>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                ℹ️ All edits are logged with timestamp for audit trail.
                            </Typography>
                        </Box>
                    )}

                    {/* 2: Assignments — LIVE DATA */}
                    {tab === 2 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>📝 Assignment Management</Typography>
                                <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2 }}>Create Assignment</Button>
                            </Box>
                            {assignments.length === 0 ? (
                                <Alert severity="info" sx={{ borderRadius: 2 }}>No assignments yet. Create one to get started.</Alert>
                            ) : (
                                <Grid container spacing={2}>
                                    {assignments.map(a => (
                                        <Grid size={{ xs: 12 }} key={a.id}>
                                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                                                        <Box>
                                                            <Typography fontWeight={700}>{a.title}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{a.class_name} · {a.subject_name} · Due: {a.due_date}</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                                            <Button size="small" startIcon={<Visibility />} sx={{ borderRadius: 2 }}>View Submissions</Button>
                                                            <Button size="small" variant="outlined" startIcon={<Grade />} sx={{ borderRadius: 2 }}>Grade</Button>
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{ mt: 2 }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                            <Typography variant="caption">Submissions: {a.submission_count}/{a.submission_count + a.pending_count}</Typography>
                                                            <Typography variant="caption">{a.submission_count + a.pending_count > 0 ? Math.round((a.submission_count / (a.submission_count + a.pending_count)) * 100) : 0}%</Typography>
                                                        </Box>
                                                        <LinearProgress variant="determinate" value={a.submission_count + a.pending_count > 0 ? (a.submission_count / (a.submission_count + a.pending_count)) * 100 : 0}
                                                            sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: '#28A745', borderRadius: 3 } }} />
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
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
                                <Chip label="Mid Term" color="primary" />
                            </Box>
                            {students.length === 0 ? (
                                <Alert severity="info" sx={{ borderRadius: 2 }}>No students loaded. Ensure you have classes assigned.</Alert>
                            ) : (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'rgba(61,94,225,0.05)' }}>
                                                {['Student', 'Student ID', 'Class', 'Status'].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {students.map(s => (
                                                <TableRow key={s.id}>
                                                    <TableCell><Typography fontWeight={600}>{s.full_name}</Typography></TableCell>
                                                    <TableCell><Typography color="text.secondary">{s.student_id}</Typography></TableCell>
                                                    <TableCell><Typography variant="body2">{s.class_name}</Typography></TableCell>
                                                    <TableCell><Chip label={s.grade || '—'} size="small" color="primary" /></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
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
                                            <Typography fontWeight={700} mb={2}>🚨 At-Risk Students (Attendance &lt; 75%)</Typography>
                                            {students.filter(s => (s.attendance_percentage || 0) < 75).length === 0 ? (
                                                <Typography variant="body2" color="text.secondary">✅ No at-risk students currently.</Typography>
                                            ) : (
                                                students.filter(s => (s.attendance_percentage || 0) < 75).map(s => (
                                                    <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                                        <Typography variant="body2" fontWeight={600}>{s.full_name}</Typography>
                                                        <Chip label={`${s.attendance_percentage}% attendance`} size="small" color="error" />
                                                    </Box>
                                                ))
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
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
                                            <Typography fontWeight={700} mb={2}>💬 Message Students / Parents</Typography>
                                            <Typography variant="body2" color="text.secondary" mb={2}>Send direct messages to students or notify parents about academic progress.</Typography>
                                            <Button variant="contained" startIcon={<Message />} fullWidth sx={{ mb: 1.5, borderRadius: 2 }}>Message a Student</Button>
                                            <Button variant="outlined" fullWidth sx={{ mb: 1.5, borderRadius: 2 }}>Notify Parents</Button>
                                            <Button variant="outlined" startIcon={<CalendarToday />} fullWidth sx={{ borderRadius: 2 }}>Schedule Extra Class</Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent>
                                            <Typography fontWeight={700} mb={2}>📋 Assignments Summary</Typography>
                                            {assignments.length === 0 ? (
                                                <Typography variant="body2" color="text.secondary">No assignments created yet.</Typography>
                                            ) : (
                                                <List disablePadding>
                                                    {assignments.slice(0, 3).map((a, i) => (
                                                        <Box key={a.id}>
                                                            <ListItem sx={{ px: 0 }}>
                                                                <ListItemAvatar><Avatar sx={{ bgcolor: '#28A745', width: 36, height: 36 }}><Assignment sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                                                                <ListItemText primary={<Typography variant="body2" fontWeight={600}>{a.title}</Typography>} secondary={`${a.class_name} • Due: ${a.due_date}`} />
                                                            </ListItem>
                                                            {i < Math.min(assignments.length, 3) - 1 && <Divider />}
                                                        </Box>
                                                    ))}
                                                </List>
                                            )}
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
