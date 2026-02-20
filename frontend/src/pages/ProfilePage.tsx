import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import {
    Box, Typography, Grid, Card, CardContent, Avatar, Chip, Divider, Paper, Button,
} from '@mui/material';
import {
    Person, Email, Phone, CalendarMonth, Badge, Edit, School, Home,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);

    const getAvatarColor = () => {
        if (!user?.full_name) return '#3D5EE1';
        const colors = ['#3D5EE1', '#FF6B6B', '#51CF66', '#FCC419', '#845EF7', '#FF922B'];
        return colors[user.full_name.charCodeAt(0) % colors.length];
    };

    const getRoleBadge = (role: string) => {
        const map: Record<string, { color: 'primary' | 'secondary' | 'success' | 'warning'; label: string }> = {
            admin: { color: 'primary', label: 'Administrator' },
            teacher: { color: 'secondary', label: 'Teacher' },
            student: { color: 'success', label: 'Student' },
            parent: { color: 'warning', label: 'Parent' },
        };
        return map[role] || { color: 'primary' as const, label: role };
    };

    const roleBadge = getRoleBadge(user?.role || 'admin');

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} mb={3}>My Profile</Typography>

            <Grid container spacing={3}>
                {/* Profile Card */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <Box sx={{
                            height: 120,
                            background: 'linear-gradient(135deg, #3D5EE1, #6B82F0, #845EF7)',
                            position: 'relative',
                        }} />
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: -6 }}>
                            <Avatar sx={{
                                width: 96, height: 96, bgcolor: getAvatarColor(),
                                fontSize: '2rem', fontWeight: 700,
                                border: '4px solid white',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                                mb: 2,
                            }}>
                                {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('') : '?'}
                            </Avatar>
                            <Typography variant="h5" fontWeight={700}>{user?.full_name || 'User Name'}</Typography>
                            <Typography variant="body2" color="text.secondary" mb={1}>{user?.username || 'username'}</Typography>
                            <Chip label={roleBadge.label} color={roleBadge.color} sx={{ fontWeight: 600, mb: 2 }} />
                            <Divider sx={{ width: '100%', mb: 2 }} />
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[
                                    { icon: <Email sx={{ fontSize: 18 }} />, label: 'Email', value: user?.email || '—' },
                                    { icon: <Phone sx={{ fontSize: 18 }} />, label: 'Phone', value: user?.phone || '—' },
                                    { icon: <CalendarMonth sx={{ fontSize: 18 }} />, label: 'Joined', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
                                ].map((item, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ color: '#3D5EE1' }}>{item.icon}</Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                            <Typography variant="body2" fontWeight={500}>{item.value}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Details */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Person sx={{ color: '#3D5EE1' }} />
                                <Typography variant="h6" fontWeight={600}>Personal Information</Typography>
                            </Box>
                            <Button variant="outlined" startIcon={<Edit />} size="small" sx={{ borderColor: 'divider', color: 'text.secondary' }}>
                                Edit Profile
                            </Button>
                        </Box>
                        <Grid container spacing={3}>
                            {[
                                { label: 'Full Name', value: user?.full_name || '—', icon: <Badge sx={{ fontSize: 18, color: 'text.disabled' }} /> },
                                { label: 'Username', value: user?.username || '—', icon: <Person sx={{ fontSize: 18, color: 'text.disabled' }} /> },
                                { label: 'Email Address', value: user?.email || '—', icon: <Email sx={{ fontSize: 18, color: 'text.disabled' }} /> },
                                { label: 'Phone Number', value: user?.phone || '—', icon: <Phone sx={{ fontSize: 18, color: 'text.disabled' }} /> },
                                { label: 'Role', value: roleBadge.label, icon: <School sx={{ fontSize: 18, color: 'text.disabled' }} /> },
                                { label: 'Address', value: user?.address || '—', icon: <Home sx={{ fontSize: 18, color: 'text.disabled' }} /> },
                            ].map((item, i) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={i}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        {item.icon}
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">{item.label}</Typography>
                                            <Typography variant="body2" fontWeight={500}>{item.value}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>

                    <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                            <School sx={{ color: '#845EF7' }} />
                            <Typography variant="h6" fontWeight={600}>Account Settings</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>Change Password</Typography>
                                    <Typography variant="caption" color="text.secondary">Update your password regularly for security</Typography>
                                </Box>
                                <Button variant="outlined" size="small">Change</Button>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>Notification Preferences</Typography>
                                    <Typography variant="caption" color="text.secondary">Manage your notification settings</Typography>
                                </Box>
                                <Button variant="outlined" size="small">Configure</Button>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
