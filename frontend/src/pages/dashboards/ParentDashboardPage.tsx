import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchParentChildren, fetchParentFeeStatus } from '../../store/slices/parentDashboardSlice';
import {
    Box, Typography, Grid, Card, CardContent, Avatar, Chip,
    LinearProgress, Skeleton, Divider,
} from '@mui/material';
import {
    School, People, Payment, CheckCircle, CalendarMonth,
    TrendingUp, Person, Notifications,
} from '@mui/icons-material';

export default function ParentDashboardPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { children, feeStatus, loading } = useSelector((state: RootState) => state.parentDashboard);

    useEffect(() => {
        dispatch(fetchParentChildren());
        dispatch(fetchParentFeeStatus());
    }, [dispatch]);

    if (loading && children.length === 0) {
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

    const totalFees = feeStatus?.total_fees || 50000;
    const paidFees = feeStatus?.paid || 35000;
    const pendingFees = feeStatus?.pending || 15000;
    const paymentPercentage = Math.round((paidFees / totalFees) * 100);

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} mb={0.5}>
                Welcome, Parent! 👨‍👩‍👧‍👦
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Monitor your children's progress and school activities
            </Typography>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Children', value: children.length || 2, icon: <People />, color: '#3D5EE1', bg: 'rgba(61,94,225,0.1)' },
                    { label: 'Fees Paid', value: `₹${paidFees.toLocaleString()}`, icon: <Payment />, color: '#28A745', bg: 'rgba(40,167,69,0.1)' },
                    { label: 'Fees Pending', value: `₹${pendingFees.toLocaleString()}`, icon: <Payment />, color: '#DC3545', bg: 'rgba(220,53,69,0.1)' },
                    { label: 'Notifications', value: 3, icon: <Notifications />, color: '#FFC107', bg: 'rgba(255,193,7,0.1)' },
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
                {/* Children Cards */}
                <Grid size={12}>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                        <People sx={{ fontSize: 20, mr: 1, verticalAlign: 'text-bottom' }} />
                        My Children
                    </Typography>
                    <Grid container spacing={2}>
                        {(children.length > 0 ? children : [
                            { id: 1, student_id: 'STU-001', full_name: 'Child Name', class_name: 'Grade 5', section: 'A', attendance_percentage: 92, gpa: 3.8, status: 'active' },
                        ]).map((child) => (
                            <Grid size={{ xs: 12, md: 6 }} key={child.id}>
                                <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Avatar sx={{ width: 56, height: 56, bgcolor: '#3D5EE1', fontSize: '1.25rem', fontWeight: 700 }}>
                                                {child.full_name.split(' ').map(n => n[0]).join('')}
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="h6" fontWeight={600}>{child.full_name}</Typography>
                                                <Typography variant="body2" color="text.secondary">{child.student_id} • {child.class_name} - {child.section}</Typography>
                                            </Box>
                                            <Chip label={child.status} color="success" size="small" />
                                        </Box>
                                        <Divider sx={{ mb: 2 }} />
                                        <Grid container spacing={2}>
                                            <Grid size={4}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                                                        <CheckCircle sx={{ fontSize: 16, color: '#28A745' }} />
                                                        <Typography variant="body1" fontWeight={700}>{child.attendance_percentage}%</Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary">Attendance</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={4}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                                                        <TrendingUp sx={{ fontSize: 16, color: '#3D5EE1' }} />
                                                        <Typography variant="body1" fontWeight={700}>{child.gpa}</Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary">GPA</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={4}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                                                        <School sx={{ fontSize: 16, color: '#845EF7' }} />
                                                        <Typography variant="body1" fontWeight={700}>{child.class_name}</Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary">Class</Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>

                {/* Fee Status */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Payment sx={{ color: '#28A745' }} />
                                <Typography variant="h6" fontWeight={600}>Fee Status</Typography>
                            </Box>
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Payment Progress</Typography>
                                    <Typography variant="body2" fontWeight={600}>{paymentPercentage}%</Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate" value={paymentPercentage}
                                    sx={{
                                        height: 10, borderRadius: 5, bgcolor: 'rgba(40,167,69,0.1)',
                                        '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(90deg, #28A745, #51CF66)' }
                                    }}
                                />
                            </Box>
                            <Grid container spacing={2}>
                                <Grid size={4}>
                                    <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(61,94,225,0.05)' }}>
                                        <Typography variant="body2" fontWeight={700}>₹{totalFees.toLocaleString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">Total</Typography>
                                    </Box>
                                </Grid>
                                <Grid size={4}>
                                    <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(40,167,69,0.05)' }}>
                                        <Typography variant="body2" fontWeight={700} color="#28A745">₹{paidFees.toLocaleString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">Paid</Typography>
                                    </Box>
                                </Grid>
                                <Grid size={4}>
                                    <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(220,53,69,0.05)' }}>
                                        <Typography variant="body2" fontWeight={700} color="#DC3545">₹{pendingFees.toLocaleString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">Pending</Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* School Events */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <CalendarMonth sx={{ color: '#845EF7' }} />
                                <Typography variant="h6" fontWeight={600}>Upcoming Events</Typography>
                            </Box>
                            {[
                                { title: 'Parent-Teacher Meeting', date: 'Feb 25, 2026', type: 'meeting' },
                                { title: 'Annual Sports Day', date: 'Mar 5, 2026', type: 'event' },
                                { title: 'Mid-Term Exams Begin', date: 'Mar 15, 2026', type: 'exam' },
                            ].map((event, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'rgba(132,94,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CalendarMonth sx={{ fontSize: 20, color: '#845EF7' }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" fontWeight={600}>{event.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{event.date}</Typography>
                                    </Box>
                                    <Chip label={event.type} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
