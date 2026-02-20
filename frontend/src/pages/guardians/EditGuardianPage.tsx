import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchGuardianById, updateGuardian, clearCurrentGuardian } from '../../store/slices/guardiansSlice';
import {
    Box, Typography, Button, Paper, TextField, Grid, MenuItem, Breadcrumbs,
    Link, Snackbar, Alert, Divider, Avatar, Card, CardContent, InputAdornment,
    CircularProgress, Skeleton, Chip,
} from '@mui/material';
import { Save, ArrowBack, Person, Email, Phone, Work, Badge, People } from '@mui/icons-material';

interface FormData {
    first_name: string; last_name: string; email: string; phone: string; alt_phone: string;
    address: string; occupation: string; annual_income: string; relationship_type: string; status: string;
}

export default function EditGuardianPage() {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { currentGuardian, loading } = useSelector((state: RootState) => state.guardians);
    const [form, setForm] = useState<FormData>({
        first_name: '', last_name: '', email: '', phone: '', alt_phone: '',
        address: '', occupation: '', annual_income: '', relationship_type: 'guardian', status: 'active',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        if (id) dispatch(fetchGuardianById(Number(id)));
        return () => { dispatch(clearCurrentGuardian()); };
    }, [dispatch, id]);

    useEffect(() => {
        if (currentGuardian) {
            setForm({
                first_name: currentGuardian.first_name || '', last_name: currentGuardian.last_name || '',
                email: currentGuardian.email || '', phone: currentGuardian.phone || '',
                alt_phone: currentGuardian.alt_phone || '', address: currentGuardian.address || '',
                occupation: currentGuardian.occupation || '', annual_income: currentGuardian.annual_income || '',
                relationship_type: currentGuardian.relationship_type || 'guardian',
                status: currentGuardian.status || 'active',
            });
        }
    }, [currentGuardian]);

    const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [field]: e.target.value });
        if (errors[field]) setErrors({ ...errors, [field]: '' });
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        if (!form.first_name.trim()) newErrors.first_name = 'Required';
        if (!form.last_name.trim()) newErrors.last_name = 'Required';
        if (!form.phone.trim()) newErrors.phone = 'Required';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !id) return;
        setSaving(true);
        const result = await dispatch(updateGuardian({ id: Number(id), data: form }));
        setSaving(false);
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Guardian updated successfully!', severity: 'success' });
            setTimeout(() => navigate('/guardians'), 1500);
        } else {
            setSnackbar({ open: true, message: 'Failed to update guardian', severity: 'error' });
        }
    };

    const getAvatarColor = () => {
        if (!form.first_name) return '#845EF7';
        const colors = ['#3D5EE1', '#FF6B6B', '#51CF66', '#FCC419', '#845EF7', '#FF922B'];
        return colors[form.first_name.charCodeAt(0) % colors.length];
    };

    if (loading && !currentGuardian) {
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
                <Link color="inherit" href="/guardians" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/guardians'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Guardians</Link>
                <Typography color="text.primary" fontWeight={500}>Edit Guardian</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Edit Guardian</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Update guardian information</Typography>
                </Box>
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/guardians')} sx={{ borderColor: 'divider', color: 'text.secondary' }}>Back to List</Button>
            </Box>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 90 }}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                                <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: getAvatarColor(), fontSize: '1.75rem', fontWeight: 700 }}>
                                    {form.first_name ? `${form.first_name[0]}${form.last_name?.[0] || ''}` : '?'}
                                </Avatar>
                                <Typography variant="h6" fontWeight={600}>{`${form.first_name} ${form.last_name}`.trim() || 'Guardian Name'}</Typography>
                                <Typography variant="body2" color="text.secondary" mb={1} sx={{ textTransform: 'capitalize' }}>{form.relationship_type}</Typography>
                                <Divider sx={{ width: '100%', mb: 2 }} />
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, px: 1 }}>
                                    {[
                                        { icon: <Phone sx={{ fontSize: 16 }} />, label: form.phone || 'Phone' },
                                        { icon: <Email sx={{ fontSize: 16 }} />, label: form.email || 'Email' },
                                        { icon: <Work sx={{ fontSize: 16 }} />, label: form.occupation || 'Occupation' },
                                    ].map((item, i) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ color: 'text.disabled' }}>{item.icon}</Box>
                                            <Typography variant="body2" color="text.secondary" noWrap>{item.label}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                                {currentGuardian?.linked_students && currentGuardian.linked_students.length > 0 && (
                                    <>
                                        <Divider sx={{ width: '100%', my: 2 }} />
                                        <Box sx={{ width: '100%' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                                <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                <Typography variant="caption" fontWeight={600} color="text.secondary">Linked Students</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {currentGuardian.linked_students.map((s: any) => (
                                                    <Chip key={s.id} label={s.full_name} size="small" variant="outlined" />
                                                ))}
                                            </Box>
                                        </Box>
                                    </>
                                )}
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
                                    <TextField label="Relationship" select fullWidth value={form.relationship_type} onChange={handleChange('relationship_type')}>
                                        {['father', 'mother', 'guardian', 'uncle', 'aunt', 'grandparent', 'sibling', 'other'].map(r =>
                                            <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
                                        )}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Status" select fullWidth value={form.status} onChange={handleChange('status')}>
                                        <MenuItem value="active">Active</MenuItem>
                                        <MenuItem value="inactive">Inactive</MenuItem>
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
                                    <TextField label="Phone" fullWidth required value={form.phone} onChange={handleChange('phone')} error={!!errors.phone} helperText={errors.phone} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Alternate Phone" fullWidth value={form.alt_phone} onChange={handleChange('alt_phone')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Email" fullWidth type="email" value={form.email} onChange={handleChange('email')} error={!!errors.email} helperText={errors.email} />
                                </Grid>
                                <Grid size={12}>
                                    <TextField label="Address" fullWidth multiline rows={2} value={form.address} onChange={handleChange('address')} />
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                <Work sx={{ color: '#845EF7' }} />
                                <Typography variant="h6" fontWeight={600}>Professional Information</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Occupation" fullWidth value={form.occupation} onChange={handleChange('occupation')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField label="Annual Income" fullWidth value={form.annual_income} onChange={handleChange('annual_income')} />
                                </Grid>
                            </Grid>
                        </Paper>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="outlined" onClick={() => navigate('/guardians')} sx={{ minWidth: 120, borderColor: 'divider', color: 'text.secondary' }}>Cancel</Button>
                            <Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />} disabled={saving}
                                sx={{ minWidth: 160, background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
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
