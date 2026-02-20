import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import { createTeacher } from '../../store/slices/teachersSlice';
import {
    Box, Typography, Button, Paper, TextField, Grid, MenuItem, Breadcrumbs,
    Link, Snackbar, Alert, Divider, Avatar, Card, CardContent, InputAdornment, CircularProgress,
} from '@mui/material';
import { Save, ArrowBack, Person, Email, Phone, School, Badge } from '@mui/icons-material';

interface FormData {
    first_name: string; last_name: string; email: string; phone: string;
    specialization: string; hire_date: string; status: string; employee_id: string;
}

const initialForm: FormData = {
    first_name: '', last_name: '', email: '', phone: '',
    specialization: '', hire_date: new Date().toISOString().split('T')[0],
    status: 'active', employee_id: '',
};

export default function AddTeacherPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { loading } = useSelector((state: RootState) => state.teachers);
    const [form, setForm] = useState<FormData>(initialForm);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [field]: e.target.value });
        if (errors[field]) setErrors({ ...errors, [field]: '' });
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        if (!form.first_name.trim()) newErrors.first_name = 'Required';
        if (!form.last_name.trim()) newErrors.last_name = 'Required';
        if (!form.employee_id.trim()) newErrors.employee_id = 'Required';
        if (!form.hire_date) newErrors.hire_date = 'Required';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        const result = await dispatch(createTeacher(form));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Teacher created successfully!', severity: 'success' });
            setTimeout(() => navigate('/teachers'), 1500);
        } else {
            setSnackbar({ open: true, message: 'Failed to create teacher', severity: 'error' });
        }
    };

    const getAvatarColor = () => {
        if (!form.first_name) return '#3D5EE1';
        const colors = ['#3D5EE1', '#FF6B6B', '#51CF66', '#FCC419', '#845EF7', '#FF922B'];
        return colors[form.first_name.charCodeAt(0) % colors.length];
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Link color="inherit" href="/teachers" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/teachers'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Teachers</Link>
                <Typography color="text.primary" fontWeight={500}>Add Teacher</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Add New Teacher</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Fill in the details to add a new teacher</Typography>
                </Box>
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/teachers')} sx={{ borderColor: 'divider', color: 'text.secondary' }}>Back to List</Button>
            </Box>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 90 }}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                                <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: getAvatarColor(), fontSize: '1.75rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                                    {form.first_name ? `${form.first_name[0]}${form.last_name?.[0] || ''}` : '?'}
                                </Avatar>
                                <Typography variant="h6" fontWeight={600} textAlign="center">
                                    {form.first_name || form.last_name ? `${form.first_name} ${form.last_name}`.trim() : 'Teacher Name'}
                                </Typography>
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
                                            <Typography variant="body2" color="text.disabled" noWrap>{item.label}</Typography>
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
                                    <TextField label="First Name" fullWidth required value={form.first_name} onChange={handleChange('first_name')}
                                        error={!!errors.first_name} helperText={errors.first_name}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Badge sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Last Name" fullWidth required value={form.last_name} onChange={handleChange('last_name')} error={!!errors.last_name} helperText={errors.last_name} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Employee ID" fullWidth required value={form.employee_id} onChange={handleChange('employee_id')}
                                        error={!!errors.employee_id} helperText={errors.employee_id} placeholder="e.g. TCH-001" />
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
                                    <TextField label="Specialization" fullWidth value={form.specialization} onChange={handleChange('specialization')} placeholder="e.g. Mathematics" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Hire Date" type="date" fullWidth required value={form.hire_date} onChange={handleChange('hire_date')}
                                        error={!!errors.hire_date} helperText={errors.hire_date} slotProps={{ inputLabel: { shrink: true } }} />
                                </Grid>
                            </Grid>
                        </Paper>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="outlined" onClick={() => navigate('/teachers')} sx={{ minWidth: 120, borderColor: 'divider', color: 'text.secondary' }}>Cancel</Button>
                            <Button type="submit" variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Save />} disabled={loading}
                                sx={{ minWidth: 160, background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)', '&:hover': { background: 'linear-gradient(135deg, #2A44B8, #3D5EE1)' } }}>
                                {loading ? 'Creating...' : 'Create Teacher'}
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
