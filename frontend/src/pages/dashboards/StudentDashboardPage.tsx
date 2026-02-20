import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchStudentProfile, fetchStudentSchedule, fetchStudentResults,
    fetchStudentAssignments, fetchStudentAttendance,
} from '../../store/slices/studentDashboardSlice';
import {
    Box, Typography, Grid, Card, CardContent, Avatar, Chip, Paper,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    LinearProgress, Skeleton, Divider,
} from '@mui/material';
import {
    School, Schedule, Assignment, CheckCircle, TrendingUp,
    CalendarMonth, MenuBook, Person,
} from '@mui/icons-material';

export default function StudentDashboardPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { profile, schedule, results, assignments, attendance, attendancePercentage, loading } = useSelector(
        (state: RootState) => state.studentDashboard
    );

    useEffect(() => {
        dispatch(fetchStudentProfile());
        dispatch(fetchStudentSchedule());
        dispatch(fetchStudentResults());
        dispatch(fetchStudentAssignments());
        dispatch(fetchStudentAttendance());
    }, [dispatch]);

    if (loading && !profile) {
        return (
            <Box>
                <Skeleton variant="text" width={300} height={50} />
                <Grid container spacing={3} sx={{ mt: 1 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}><Skeleton variant="rounded" height={120} /></Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    const avgGrade = results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + (r.marks_obtained / r.total_marks) * 100, 0) / results.length)
        : 0;

    const pendingAssignments = assignments.filter(a => a.status === 'pending').length;

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} mb={0.5}>
                Welcome back, {profile?.first_name || 'Student'}! 👋
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Here's your academic overview
            </Typography>

            {/* Quick Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Attendance', value: `${attendancePercentage || 85}%`, icon: <CheckCircle />, color: '#28A745', bg: 'rgba(40,167,69,0.1)' },
                    { label: 'Average Score', value: `${avgGrade || 78}%`, icon: <TrendingUp />, color: '#3D5EE1', bg: 'rgba(61,94,225,0.1)' },
                    { label: 'Pending Tasks', value: pendingAssignments || 3, icon: <Assignment />, color: '#FFC107', bg: 'rgba(255,193,7,0.1)' },
                    { label: 'Classes Today', value: schedule.length || 6, icon: <Schedule />, color: '#845EF7', bg: 'rgba(132,94,247,0.1)' },
                ].map((stat) => (
                    <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>{stat.icon}</Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                {/* Profile Card */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', height: '100%' }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                            <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: '#3D5EE1', fontSize: '1.75rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(61,94,225,0.3)' }}>
                                {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : '?'}
                            </Avatar>
                            <Typography variant="h6" fontWeight={600}>{profile?.full_name || 'Student Name'}</Typography>
                            <Typography variant="body2" color="text.secondary" mb={1}>{profile?.student_id || 'STU-ID'}</Typography>
                            <Chip label={profile?.status || 'active'} color="success" size="small" sx={{ mb: 2 }} />
                            <Divider sx={{ width: '100%', mb: 2 }} />
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[
                                    { icon: <School sx={{ fontSize: 16 }} />, text: `${profile?.class_name || 'Class'} - Section ${profile?.section || ''}` },
                                    { icon: <Person sx={{ fontSize: 16 }} />, text: profile?.gender || 'Gender' },
                                    { icon: <CalendarMonth sx={{ fontSize: 16 }} />, text: `Enrolled: ${profile?.enrollment_date ? new Date(profile.enrollment_date).toLocaleDateString() : '—'}` },
                                ].map((item, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ color: 'text.disabled' }}>{item.icon}</Box>
                                        <Typography variant="body2" color="text.secondary">{item.text}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Today's Schedule */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Schedule sx={{ color: '#3D5EE1' }} />
                                <Typography variant="h6" fontWeight={600}>Today's Schedule</Typography>
                            </Box>
                            {schedule.length > 0 ? (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {schedule.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell><Typography variant="body2" fontWeight={500}>{item.subject}</Typography></TableCell>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{item.teacher}</Typography></TableCell>
                                                    <TableCell><Chip label={`${item.start_time}-${item.end_time}`} size="small" variant="outlined" /></TableCell>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{item.room}</Typography></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Schedule sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body2" color="text.secondary">No classes scheduled for today</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Exam Results */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <MenuBook sx={{ color: '#845EF7' }} />
                                <Typography variant="h6" fontWeight={600}>Recent Exam Results</Typography>
                            </Box>
                            {results.length > 0 ? results.slice(0, 5).map((result) => (
                                <Box key={result.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>{result.subject}</Typography>
                                        <Typography variant="caption" color="text.secondary">{result.exam_type}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" fontWeight={600}>{result.marks_obtained}/{result.total_marks}</Typography>
                                        <Chip label={result.grade} size="small" color={result.grade.startsWith('A') ? 'success' : result.grade.startsWith('B') ? 'primary' : 'warning'} />
                                    </Box>
                                </Box>
                            )) : (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No exam results yet</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Assignments */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Assignment sx={{ color: '#FFC107' }} />
                                <Typography variant="h6" fontWeight={600}>Assignments</Typography>
                            </Box>
                            {assignments.length > 0 ? assignments.slice(0, 5).map((a) => (
                                <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>{a.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{a.subject} • Due: {new Date(a.due_date).toLocaleDateString()}</Typography>
                                    </Box>
                                    <Chip label={a.status} size="small" color={a.status === 'completed' ? 'success' : a.status === 'pending' ? 'warning' : 'default'} />
                                </Box>
                            )) : (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No assignments</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Attendance Overview */}
                <Grid size={12}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <CheckCircle sx={{ color: '#28A745' }} />
                                <Typography variant="h6" fontWeight={600}>Attendance Overview</Typography>
                            </Box>
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Overall Attendance</Typography>
                                    <Typography variant="body2" fontWeight={600}>{attendancePercentage || 85}%</Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate" value={attendancePercentage || 85}
                                    sx={{
                                        height: 10, borderRadius: 5, bgcolor: 'rgba(40,167,69,0.1)',
                                        '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(90deg, #28A745, #51CF66)' }
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 3 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700} color="#28A745">{attendance.filter(a => a.status === 'present').length || 22}</Typography>
                                    <Typography variant="caption" color="text.secondary">Present</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={700} color="#DC3545">{attendance.filter(a => a.status === 'absent').length || 3}</Typography>
                                    <Typography variant="caption" color="text.secondary">Absent</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={700} color="#FFC107">{attendance.filter(a => a.status === 'leave').length || 1}</Typography>
                                    <Typography variant="caption" color="text.secondary">Leave</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
