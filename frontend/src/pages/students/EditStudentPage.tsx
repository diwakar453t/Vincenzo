import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchStudentById, updateStudent, clearCurrentStudent } from '../../store/slices/studentsSlice';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    Grid,
    MenuItem,
    Breadcrumbs,
    Link,
    Snackbar,
    Alert,
    Divider,
    Avatar,
    Card,
    CardContent,
    InputAdornment,
    CircularProgress,
    Skeleton,
} from '@mui/material';
import {
    Save,
    ArrowBack,
    Person,
    Email,
    Phone,
    CalendarMonth,
    Home,
    School,
    Badge,
} from '@mui/icons-material';

interface FormData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: string;
    address: string;
    enrollment_date: string;
    status: string;
    student_id: string;
}

export default function EditStudentPage() {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { currentStudent, loading } = useSelector((state: RootState) => state.students);

    const [form, setForm] = useState<FormData>({
        first_name: '', last_name: '', email: '', phone: '',
        date_of_birth: '', gender: '', address: '', enrollment_date: '', status: 'active', student_id: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });

    useEffect(() => {
        if (id) dispatch(fetchStudentById(Number(id)));
        return () => { dispatch(clearCurrentStudent()); };
    }, [dispatch, id]);

    useEffect(() => {
        if (currentStudent) {
            setForm({
                first_name: currentStudent.first_name || '',
                last_name: currentStudent.last_name || '',
                email: currentStudent.email || '',
                phone: currentStudent.phone || '',
                date_of_birth: currentStudent.date_of_birth || '',
                gender: currentStudent.gender || '',
                address: currentStudent.address || '',
                enrollment_date: currentStudent.enrollment_date || '',
                status: currentStudent.status || 'active',
                student_id: currentStudent.student_id || '',
            });
        }
    }, [currentStudent]);

    const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [field]: e.target.value });
        if (errors[field]) setErrors({ ...errors, [field]: '' });
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        if (!form.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!form.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!form.student_id.trim()) newErrors.student_id = 'Student ID is required';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email address';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !id) return;
        setSaving(true);
        const result = await dispatch(updateStudent({ id: Number(id), data: form }));
        setSaving(false);
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Student updated successfully!', severity: 'success' });
            setTimeout(() => navigate('/students'), 1500);
        } else {
            setSnackbar({ open: true, message: 'Failed to update student', severity: 'error' });
        }
    };

    const getAvatarColor = () => {
        if (!form.first_name) return '#3D5EE1';
        const colors = ['#3D5EE1', '#FF6B6B', '#51CF66', '#FCC419', '#845EF7', '#FF922B'];
        return colors[form.first_name.charCodeAt(0) % colors.length];
    };

    if (loading && !currentStudent) {
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
            {/* Breadcrumb */}
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Link color="inherit" href="/students" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/students'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Students</Link>
                <Typography color="text.primary" fontWeight={500}>Edit Student</Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} color="text.primary">Edit Student</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Update student information</Typography>
                </Box>
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/students')}
                    sx={{ borderColor: 'divider', color: 'text.secondary' }}>Back to List</Button>
            </Box>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    {/* Preview Card */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 90 }}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                                <Avatar sx={{
                                    width: 80, height: 80, mb: 2, bgcolor: getAvatarColor(),
                                    fontSize: '1.75rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                                }}>
                                    {form.first_name ? `${form.first_name[0]}${form.last_name?.[0] || ''}` : '?'}
                                </Avatar>
                                <Typography variant="h6" fontWeight={600} textAlign="center">
                                    {`${form.first_name} ${form.last_name}`.trim() || 'Student Name'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mb={2}>{form.student_id || 'Student ID'}</Typography>
                                <Divider sx={{ width: '100%', mb: 2 }} />
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, px: 1 }}>
                                    {[
                                        { icon: <Email sx={{ fontSize: 16 }} />, label: form.email || 'Email' },
                                        { icon: <Phone sx={{ fontSize: 16 }} />, label: form.phone || 'Phone' },
                                        { icon: <CalendarMonth sx={{ fontSize: 16 }} />, label: form.date_of_birth || 'DOB' },
                                        { icon: <Home sx={{ fontSize: 16 }} />, label: form.address || 'Address' },
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

                    {/* Form Fields */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                <Person sx={{ color: '#3D5EE1' }} />
                                <Typography variant="h6" fontWeight={600}>Personal Information</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="First Name" fullWidth required value={form.first_name}
                                        onChange={handleChange('first_name')} error={!!errors.first_name} helperText={errors.first_name}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Badge sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Last Name" fullWidth required value={form.last_name}
                                        onChange={handleChange('last_name')} error={!!errors.last_name} helperText={errors.last_name} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Student ID" fullWidth required value={form.student_id}
                                        onChange={handleChange('student_id')} error={!!errors.student_id} helperText={errors.student_id} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Gender" select fullWidth value={form.gender} onChange={handleChange('gender')}>
                                        <MenuItem value="male">Male</MenuItem>
                                        <MenuItem value="female">Female</MenuItem>
                                        <MenuItem value="other">Other</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Date of Birth" type="date" fullWidth value={form.date_of_birth}
                                        onChange={handleChange('date_of_birth')} slotProps={{ inputLabel: { shrink: true } }} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Status" select fullWidth value={form.status} onChange={handleChange('status')}>
                                        <MenuItem value="active">Active</MenuItem>
                                        <MenuItem value="inactive">Inactive</MenuItem>
                                        <MenuItem value="graduated">Graduated</MenuItem>
                                        <MenuItem value="suspended">Suspended</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                <Phone sx={{ color: '#28A745' }} />
                                <Typography variant="h6" fontWeight={600}>Contact Information</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Email" fullWidth type="email" value={form.email}
                                        onChange={handleChange('email')} error={!!errors.email} helperText={errors.email}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Phone" fullWidth value={form.phone} onChange={handleChange('phone')}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
                                    />
                                </Grid>
                                <Grid size={12}>
                                    <TextField label="Address" fullWidth multiline rows={2} value={form.address}
                                        onChange={handleChange('address')} />
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                <School sx={{ color: '#FFC107' }} />
                                <Typography variant="h6" fontWeight={600}>Academic Information</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Enrollment Date" type="date" fullWidth value={form.enrollment_date}
                                        onChange={handleChange('enrollment_date')} slotProps={{ inputLabel: { shrink: true } }} />
                                </Grid>
                            </Grid>
                        </Paper>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="outlined" onClick={() => navigate('/students')}
                                sx={{ minWidth: 120, borderColor: 'divider', color: 'text.secondary' }}>Cancel</Button>
                            <Button type="submit" variant="contained"
                                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                                disabled={saving}
                                sx={{
                                    minWidth: 160, background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)',
                                    boxShadow: '0 4px 14px rgba(61, 94, 225, 0.35)',
                                    '&:hover': { background: 'linear-gradient(135deg, #2A44B8, #3D5EE1)' },
                                }}>
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
