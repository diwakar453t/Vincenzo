import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherProfile, fetchTeacherClasses, fetchTeacherStudents } from '../../store/slices/teacherDashboardSlice';
import {
    Box, Typography, Grid, Card, CardContent, Avatar, Chip, Paper,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    LinearProgress, Skeleton, Divider,
} from '@mui/material';
import {
    School, People, Assignment, CheckCircle, CalendarMonth, Person, MenuBook,
} from '@mui/icons-material';

export default function TeacherDashboardPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { profile, classes: teacherClasses, students, loading } = useSelector(
        (state: RootState) => state.teacherDashboard
    );

    useEffect(() => {
        dispatch(fetchTeacherProfile());
        dispatch(fetchTeacherClasses());
        dispatch(fetchTeacherStudents());
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

    const totalStudents = teacherClasses.reduce((acc, c) => acc + (c.student_count || 0), 0);

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} mb={0.5}>
                Welcome, {profile?.first_name || 'Teacher'}! 👨‍🏫
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Here's your teaching overview for today
            </Typography>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'My Classes', value: teacherClasses.length || 4, icon: <School />, color: '#3D5EE1', bg: 'rgba(61,94,225,0.1)' },
                    { label: 'Total Students', value: totalStudents || 120, icon: <People />, color: '#28A745', bg: 'rgba(40,167,69,0.1)' },
                    { label: 'Pending Tasks', value: 5, icon: <Assignment />, color: '#FFC107', bg: 'rgba(255,193,7,0.1)' },
                    { label: 'Attendance Rate', value: '92%', icon: <CheckCircle />, color: '#845EF7', bg: 'rgba(132,94,247,0.1)' },
                ].map((stat) => (
                    <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
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
                            <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: '#845EF7', fontSize: '1.75rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(132,94,247,0.3)' }}>
                                {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : '?'}
                            </Avatar>
                            <Typography variant="h6" fontWeight={600}>{profile?.full_name || 'Teacher Name'}</Typography>
                            <Typography variant="body2" color="text.secondary" mb={1}>{profile?.employee_id}</Typography>
                            <Chip label={profile?.status || 'active'} color="success" size="small" sx={{ mb: 2 }} />
                            <Divider sx={{ width: '100%', mb: 2 }} />
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[
                                    { icon: <MenuBook sx={{ fontSize: 16 }} />, text: profile?.specialization || 'Specialization' },
                                    { icon: <Person sx={{ fontSize: 16 }} />, text: profile?.phone || 'Phone' },
                                    { icon: <CalendarMonth sx={{ fontSize: 16 }} />, text: `Joined: ${profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString() : '—'}` },
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

                {/* My Classes */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <School sx={{ color: '#3D5EE1' }} />
                                <Typography variant="h6" fontWeight={600}>My Classes</Typography>
                            </Box>
                            {teacherClasses.length > 0 ? (
                                <Grid container spacing={2}>
                                    {teacherClasses.map((cls) => (
                                        <Grid size={{ xs: 12, sm: 6 }} key={cls.id}>
                                            <Paper sx={{ p: 2, border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } }}>
                                                <Typography variant="body1" fontWeight={600}>{cls.name} - {cls.section}</Typography>
                                                <Typography variant="caption" color="text.secondary" display="block">Grade {cls.grade_level} • {cls.subject}</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                    <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary">{cls.student_count} students</Typography>
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <School sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body2" color="text.secondary">No classes assigned yet</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Student Performance */}
                <Grid size={12}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <People sx={{ color: '#28A745' }} />
                                <Typography variant="h6" fontWeight={600}>Student Performance Overview</Typography>
                            </Box>
                            {students.length > 0 ? (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                                <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Attendance</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {students.slice(0, 10).map((student) => (
                                                <TableRow key={student.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                                    <TableCell><Typography variant="body2" fontWeight={500}>{student.full_name}</Typography></TableCell>
                                                    <TableCell><Chip label={student.student_id} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} /></TableCell>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{student.class_name}</Typography></TableCell>
                                                    <TableCell><Chip label={student.grade || 'N/A'} size="small" color={student.grade?.startsWith('A') ? 'success' : 'default'} /></TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <LinearProgress
                                                                variant="determinate" value={student.attendance_percentage || 0}
                                                                sx={{
                                                                    width: 60, height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.06)',
                                                                    '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: student.attendance_percentage >= 75 ? '#28A745' : '#DC3545' }
                                                                }}
                                                            />
                                                            <Typography variant="caption">{student.attendance_percentage || 0}%</Typography>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No students data available</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
