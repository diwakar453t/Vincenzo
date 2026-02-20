import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherById, updateTeacher, clearCurrentTeacher } from '../../store/slices/teachersSlice';
import {
    Box, Typography, Button, Paper, TextField, Grid, MenuItem, Breadcrumbs,
    Link, Snackbar, Alert, Divider, Avatar, Card, CardContent, InputAdornment,
    CircularProgress, Skeleton,
} from '@mui/material';
import { Save, ArrowBack, Person, Email, Phone, School, Badge } from '@mui/icons-material';

interface FormData {
    first_name: string; last_name: string; email: string; phone: string;
    specialization: string; hire_date: string; status: string; employee_id: string;
}

export default function EditTeacherPage() {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { currentTeacher, loading } = useSelector((state: RootState) => state.teachers);
    const [form, setForm] = useState<FormData>({
        first_name: '', last_name: '', email: '', phone: '',
        specialization: '', hire_date: '', status: 'active', employee_id: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        if (id) dispatch(fetchTeacherById(Number(id)));
        return () => { dispatch(clearCurrentTeacher()); };
    }, [dispatch, id]);

    useEffect(() => {
        if (currentTeacher) {
            setForm({
                first_name: currentTeacher.first_name || '', last_name: currentTeacher.last_name || '',
                email: '', phone: currentTeacher.phone || '', specialization: currentTeacher.specialization || '',
                hire_date: currentTeacher.hire_date || '', status: currentTeacher.status || 'active',
                employee_id: currentTeacher.employee_id || '',
            });
        }
    }, [currentTeacher]);

    const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [field]: e.target.value });
        if (errors[field]) setErrors({ ...errors, [field]: '' });
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        if (!form.first_name.trim()) newErrors.first_name = 'Required';
        if (!form.last_name.trim()) newErrors.last_name = 'Required';
        if (!form.employee_id.trim()) newErrors.employee_id = 'Required';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !id) return;
        setSaving(true);
        const result = await dispatch(updateTeacher({ id: Number(id), data: form }));
        setSaving(false);
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Teacher updated successfully!', severity: 'success' });
            setTimeout(() => navigate('/teachers'), 1500);
        } else {
            setSnackbar({ open: true, message: 'Failed to update teacher', severity: 'error' });
        }
    };

    const getAvatarColor = () => {
        if (!form.first_name) return '#3D5EE1';
        const colors = ['#3D5EE1', '#FF6B6B', '#51CF66', '#FCC419', '#845EF7', '#FF922B'];
        return colors[form.first_name.charCodeAt(0) % colors.length];
    };

    if (loading && !currentTeacher) {
        return (
            <Box>
                <Skeleton variant="text" width={200} height={40} />
                <Skeleton variant="text" width={300} height={50} sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rounded" height={300} /></Grid>
                    <Grid size={{ xs: 12, md: 8 }}><Skeleton variant="rounded" height={400} /></Grid>
                </Grid>
            </Box>
        );
    }

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Link color="inherit" href="/teachers" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/teachers'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Teachers</Link>
                <Typography color="text.primary" fontWeight={500}>Edit Teacher</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Edit Teacher</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Update teacher information</Typography>
                </Box>
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/teachers')} sx={{ borderColor: 'divider', color: 'text.secondary' }}>Back to List</Button>
            </Box>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 90 }}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                                <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: getAvatarColor(), fontSize: '1.75rem', fontWeight: 700 }}>
                                    {form.first_name ? `${form.first_name[0]}${form.last_name?.[0] || ''}` : '?'}
                                </Avatar>
                                <Typography variant="h6" fontWeight={600}>{`${form.first_name} ${form.last_name}`.trim() || 'Teacher Name'}</Typography>
                                <Typography variant="body2" color="text.secondary" mb={2}>{form.employee_id || 'Employee ID'}</Typography>
                                <Divider sx={{ width: '100%', mb: 2 }} />
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, px: 1 }}>
                                    {[
                                        { icon: <Email sx={{ fontSize: 16 }} />, label: form.email || 'Email' },
                                        { icon: <Phone sx={{ fontSize: 16 }} />, label: form.phone || 'Phone' },
                                        { icon: <School sx={{ fontSize: 16 }} />, label: form.specialization || 'Specialization' },
                                    ].map((item, i) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ color: 'text.disabled' }}>{item.icon}</Box>
                                            <Typography variant="body2" color="text.secondary" noWrap>{item.label}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }}>
                        <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                <Person sx={{ color: '#3D5EE1' }} />
                                <Typography variant="h6" fontWeight={600}>Personal Information</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="First Name" fullWidth required value={form.first_name} onChange={handleChange('first_name')} error={!!errors.first_name} helperText={errors.first_name}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Badge sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Last Name" fullWidth required value={form.last_name} onChange={handleChange('last_name')} error={!!errors.last_name} helperText={errors.last_name} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Employee ID" fullWidth required value={form.employee_id} onChange={handleChange('employee_id')} error={!!errors.employee_id} helperText={errors.employee_id} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Status" select fullWidth value={form.status} onChange={handleChange('status')}>
                                        <MenuItem value="active">Active</MenuItem>
                                        <MenuItem value="inactive">Inactive</MenuItem>
                                        <MenuItem value="on_leave">On Leave</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                <Phone sx={{ color: '#28A745' }} />
                                <Typography variant="h6" fontWeight={600}>Contact & Professional</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Email" fullWidth type="email" value={form.email} onChange={handleChange('email')} error={!!errors.email} helperText={errors.email}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Phone" fullWidth value={form.phone} onChange={handleChange('phone')}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Specialization" fullWidth value={form.specialization} onChange={handleChange('specialization')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Hire Date" type="date" fullWidth value={form.hire_date} onChange={handleChange('hire_date')}
                                        slotProps={{ inputLabel: { shrink: true } }} />
                                </Grid>
                            </Grid>
                        </Paper>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="outlined" onClick={() => navigate('/teachers')} sx={{ minWidth: 120, borderColor: 'divider', color: 'text.secondary' }}>Cancel</Button>
                            <Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />} disabled={saving}
                                sx={{ minWidth: 160, background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)', '&:hover': { background: 'linear-gradient(135deg, #2A44B8, #3D5EE1)' } }}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </form>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
