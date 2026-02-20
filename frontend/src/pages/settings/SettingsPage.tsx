import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchSchoolSettings, updateSchoolSettings,
    fetchAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear,
    fetchPreferences, upsertPreference, clearSettingsError,
} from '../../store/slices/settingsSlice';
import {
    Box, Typography, Button, Paper, Grid, Card, CardContent, Tabs, Tab,
    TextField, Snackbar, Alert, LinearProgress, Breadcrumbs, Link,
    Switch, FormControlLabel, Chip, IconButton, Divider,
    Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
    School, CalendarMonth, Settings as SettingsIcon, Palette,
    Save, Add, Delete, Edit, Star, StarBorder,
} from '@mui/icons-material';

const CATEGORY_ORDER = ['system', 'academic', 'fees', 'attendance', 'notification', 'theme'];
const CAT_LABELS: Record<string, string> = {
    system: '⚙️ System', academic: '🎓 Academic', fees: '💰 Fees',
    attendance: '📋 Attendance', notification: '🔔 Notification', theme: '🎨 Theme',
};

export default function SettingsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { school, academicYears, preferences, loading, saving, error } = useSelector((s: RootState) => s.settings);
    const [tab, setTab] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

    // School settings form
    const [schoolForm, setSchoolForm] = useState<Record<string, string>>({});

    // Academic year dialog
    const [yearDialog, setYearDialog] = useState(false);
    const [yearForm, setYearForm] = useState({ name: '', start_date: '', end_date: '', is_current: false });
    const [editYearId, setEditYearId] = useState<number | null>(null);

    // Preference edit
    const [editPref, setEditPref] = useState<{ key: string; value: string; open: boolean }>({ key: '', value: '', open: false });

    useEffect(() => {
        dispatch(fetchSchoolSettings());
        dispatch(fetchAcademicYears());
        dispatch(fetchPreferences());
    }, [dispatch]);

    useEffect(() => {
        if (school) {
            const f: Record<string, string> = {};
            Object.entries(school).forEach(([k, v]) => { if (typeof v === 'string' || typeof v === 'number') f[k] = String(v ?? ''); });
            setSchoolForm(f);
        }
    }, [school]);

    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearSettingsError()); } }, [error, dispatch]);

    const handleSaveSchool = async () => {
        const result = await dispatch(updateSchoolSettings(schoolForm));
        if (!result.type.endsWith('/rejected')) setSnack({ open: true, msg: 'School settings saved!', sev: 'success' });
    };

    const handleSaveYear = async () => {
        if (!yearForm.name || !yearForm.start_date || !yearForm.end_date) return;
        const data = { ...yearForm, start_date: new Date(yearForm.start_date).toISOString(), end_date: new Date(yearForm.end_date).toISOString() };
        const result = editYearId
            ? await dispatch(updateAcademicYear({ id: editYearId, ...data }))
            : await dispatch(createAcademicYear(data));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: editYearId ? 'Year updated!' : 'Year created!', sev: 'success' });
            setYearDialog(false); setEditYearId(null); setYearForm({ name: '', start_date: '', end_date: '', is_current: false });
        }
    };

    const handleSavePref = async () => {
        const result = await dispatch(upsertPreference({ key: editPref.key, value: editPref.value }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: `"${editPref.key}" updated!`, sev: 'success' });
            setEditPref({ ...editPref, open: false });
        }
    };

    const groupedPrefs = CATEGORY_ORDER.map(cat => ({
        category: cat,
        label: CAT_LABELS[cat] || cat,
        items: preferences.filter(p => p.category === cat),
    })).filter(g => g.items.length > 0);

    const SCHOOL_FIELDS = [
        { key: 'school_name', label: 'School Name', xs: 6 },
        { key: 'school_code', label: 'School Code', xs: 3 },
        { key: 'school_type', label: 'School Type', xs: 3 },
        { key: 'tagline', label: 'Tagline', xs: 12 },
        { key: 'address', label: 'Address', xs: 12 },
        { key: 'city', label: 'City', xs: 3 },
        { key: 'state', label: 'State', xs: 3 },
        { key: 'country', label: 'Country', xs: 3 },
        { key: 'pincode', label: 'Pincode', xs: 3 },
        { key: 'phone', label: 'Phone', xs: 4 },
        { key: 'email', label: 'Email', xs: 4 },
        { key: 'website', label: 'Website', xs: 4 },
        { key: 'principal_name', label: 'Principal Name', xs: 4 },
        { key: 'board_affiliation', label: 'Board Affiliation', xs: 4 },
        { key: 'established_year', label: 'Established Year', xs: 4 },
    ];

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Settings</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>⚙️ Settings & Configuration</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage school profile, academic years, and system preferences</Typography>
                </Box>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <Paper sx={{ mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
                    <Tab label="School Profile" icon={<School sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Academic Years" icon={<CalendarMonth sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="System Preferences" icon={<SettingsIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Theme" icon={<Palette sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ── Tab 0: School Profile ─────────────────────── */}
            {tab === 0 && (
                <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <Typography variant="h6" fontWeight={700} mb={2}>🏫 School Profile</Typography>
                    <Grid container spacing={2}>
                        {SCHOOL_FIELDS.map(f => (
                            <Grid key={f.key} size={{ xs: 12, md: f.xs }}>
                                <TextField fullWidth label={f.label} size="small"
                                    value={schoolForm[f.key] || ''}
                                    onChange={e => setSchoolForm({ ...schoolForm, [f.key]: e.target.value })} />
                            </Grid>
                        ))}
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" startIcon={<Save />} onClick={handleSaveSchool} disabled={saving}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', fontWeight: 700 }}>
                            {saving ? 'Saving…' : 'Save School Settings'}
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* ── Tab 1: Academic Years ────────────────────── */}
            {tab === 1 && (
                <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>📅 Academic Years</Typography>
                        <Button variant="contained" size="small" startIcon={<Add />}
                            onClick={() => { setEditYearId(null); setYearForm({ name: '', start_date: '', end_date: '', is_current: false }); setYearDialog(true); }}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', fontWeight: 700 }}>
                            Add Academic Year
                        </Button>
                    </Box>
                    {academicYears.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <CalendarMonth sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">No academic years configured</Typography>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {academicYears.map((y) => (
                                <Grid key={y.id} size={{ xs: 12, md: 4 }}>
                                    <Card sx={{
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        border: y.is_current ? '2px solid #3D5EE1' : '1px solid rgba(0,0,0,0.06)',
                                        position: 'relative',
                                    }}>
                                        {y.is_current && <Chip label="Current" size="small" color="primary" sx={{ position: 'absolute', top: 8, right: 8, fontWeight: 700 }} />}
                                        <CardContent>
                                            <Typography variant="h6" fontWeight={700}>{y.name}</Typography>
                                            <Typography variant="body2" color="text.secondary" mt={0.5}>
                                                {new Date(y.start_date).toLocaleDateString()} — {new Date(y.end_date).toLocaleDateString()}
                                            </Typography>
                                            <Box sx={{ mt: 2, display: 'flex', gap: 0.5 }}>
                                                {!y.is_current && (
                                                    <IconButton size="small" title="Set as current"
                                                        onClick={() => dispatch(updateAcademicYear({ id: y.id, is_current: true })).then(() => dispatch(fetchAcademicYears()))}>
                                                        <StarBorder fontSize="small" sx={{ color: '#FCC419' }} />
                                                    </IconButton>
                                                )}
                                                {y.is_current && <Star fontSize="small" sx={{ color: '#FCC419', mt: 1, ml: 1 }} />}
                                                <IconButton size="small" onClick={() => {
                                                    setEditYearId(y.id);
                                                    setYearForm({ name: y.name, start_date: y.start_date.slice(0, 10), end_date: y.end_date.slice(0, 10), is_current: y.is_current });
                                                    setYearDialog(true);
                                                }}><Edit fontSize="small" /></IconButton>
                                                <IconButton size="small" onClick={() => dispatch(deleteAcademicYear(y.id))}>
                                                    <Delete fontSize="small" sx={{ color: 'text.disabled', '&:hover': { color: '#DC3545' } }} />
                                                </IconButton>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Paper>
            )}

            {/* ── Tab 2: System Preferences ───────────────── */}
            {tab === 2 && (
                <Box>
                    {groupedPrefs.map(group => (
                        <Paper key={group.category} sx={{ p: 3, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>{group.label}</Typography>
                            {group.items.map((pref, i) => (
                                <Box key={pref.key}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
                                        <Box>
                                            <Typography fontWeight={600}>{pref.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Typography>
                                            <Typography variant="caption" color="text.secondary">{pref.description}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {pref.value_type === 'boolean' ? (
                                                <Switch checked={pref.value === 'true'} size="small"
                                                    onChange={(e) => dispatch(upsertPreference({ key: pref.key, value: String(e.target.checked) }))} />
                                            ) : (
                                                <>
                                                    <Chip label={pref.value || '—'} size="small" variant="outlined"
                                                        sx={{ fontWeight: 700, minWidth: 60, justifyContent: 'center' }} />
                                                    <IconButton size="small" onClick={() => setEditPref({ key: pref.key, value: pref.value || '', open: true })}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                    {i < group.items.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </Paper>
                    ))}
                </Box>
            )}

            {/* ── Tab 3: Theme ────────────────────────────── */}
            {tab === 3 && (
                <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <Typography variant="h6" fontWeight={700} mb={2}>🎨 Theme Customization</Typography>
                    <Grid container spacing={3}>
                        {preferences.filter(p => p.category === 'theme').map(pref => (
                            <Grid key={pref.key} size={{ xs: 12, md: 4 }}>
                                <Card sx={{ p: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                    <Typography fontWeight={600} mb={1}>{pref.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>{pref.description}</Typography>
                                    {pref.value_type === 'boolean' ? (
                                        <FormControlLabel
                                            control={<Switch checked={pref.value === 'true'} onChange={(e) => dispatch(upsertPreference({ key: pref.key, value: String(e.target.checked) }))} />}
                                            label={pref.value === 'true' ? 'Enabled' : 'Disabled'}
                                        />
                                    ) : pref.key.includes('color') ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <input type="color" value={pref.value || '#000000'} style={{ width: 48, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                                                onChange={(e) => dispatch(upsertPreference({ key: pref.key, value: e.target.value }))} />
                                            <Typography variant="body2" fontWeight={600} fontFamily="monospace">{pref.value}</Typography>
                                        </Box>
                                    ) : (
                                        <TextField size="small" fullWidth value={pref.value || ''}
                                            onBlur={(e) => { if (e.target.value !== pref.value) dispatch(upsertPreference({ key: pref.key, value: e.target.value })); }} />
                                    )}
                                </Card>
                            </Grid>
                        ))}
                        {preferences.filter(p => p.category === 'theme').length === 0 && (
                            <Grid size={12}>
                                <Box sx={{ py: 6, textAlign: 'center' }}>
                                    <Palette sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                    <Typography color="text.secondary">No theme preferences configured yet</Typography>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </Paper>
            )}

            {/* ── Academic Year Dialog ────────────────────── */}
            <Dialog open={yearDialog} onClose={() => setYearDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{editYearId ? '✏️ Edit Academic Year' : '📅 New Academic Year'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={12}><TextField fullWidth label="Year Name" placeholder="2025-26" value={yearForm.name} onChange={e => setYearForm({ ...yearForm, name: e.target.value })} /></Grid>
                        <Grid size={6}><TextField fullWidth label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={yearForm.start_date} onChange={e => setYearForm({ ...yearForm, start_date: e.target.value })} /></Grid>
                        <Grid size={6}><TextField fullWidth label="End Date" type="date" InputLabelProps={{ shrink: true }} value={yearForm.end_date} onChange={e => setYearForm({ ...yearForm, end_date: e.target.value })} /></Grid>
                        <Grid size={12}><FormControlLabel control={<Switch checked={yearForm.is_current} onChange={e => setYearForm({ ...yearForm, is_current: e.target.checked })} />} label="Set as current year" /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setYearDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveYear} sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', fontWeight: 700 }}>
                        {editYearId ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Preference Edit Dialog ──────────────────── */}
            <Dialog open={editPref.open} onClose={() => setEditPref({ ...editPref, open: false })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>✏️ Edit Preference</DialogTitle>
                <DialogContent>
                    <Typography variant="caption" color="text.secondary" display="block" mb={2}>{editPref.key}</Typography>
                    <TextField fullWidth label="Value" value={editPref.value} onChange={e => setEditPref({ ...editPref, value: e.target.value })} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setEditPref({ ...editPref, open: false })}>Cancel</Button>
                    <Button variant="contained" onClick={handleSavePref} sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', fontWeight: 700 }}>Save</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
