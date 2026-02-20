import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchSports, createSport, updateSport, deleteSport,
    registerStudent, fetchParticipations, updateParticipation, deleteParticipation,
    createAchievement, fetchAchievements, updateAchievement, deleteAchievement,
    fetchSportsStats, clearSportsError,
} from '../../store/slices/sportsSlice';
import type { SportItem, AchievementItem } from '../../store/slices/sportsSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import {
    Box, Typography, Button, Paper, TextField, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, MenuItem, Select,
    FormControl, InputLabel, Tabs, Tab, Table, TableBody, TableCell, TableHead,
    TableRow, TableContainer, Switch, FormControlLabel,
} from '@mui/material';
import {
    Add, Edit, Delete, SportsSoccer, EmojiEvents, People,
    Person, SportsBasketball, FitnessCenter,
} from '@mui/icons-material';

const CATEGORY_ICONS: Record<string, string> = {
    team: '⚽', individual: '🏃', aquatic: '🏊', athletics: '🏅',
    combat: '🥊', racquet: '🏸', other: '🎯',
};

const ACH_COLORS: Record<string, string> = {
    gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32',
    participation: '#3D5EE1', mvp: '#DC3545', best_player: '#51CF66', special: '#9B59B6',
};

const LEVEL_COLORS: Record<string, string> = {
    school: '#51CF66', district: '#3D5EE1', state: '#FCC419',
    national: '#DC3545', international: '#9B59B6',
};

export default function SportsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { sports, participations, achievements, stats, loading, error } = useSelector((s: RootState) => s.sports);
    const { students } = useSelector((s: RootState) => s.students);

    const [tabIndex, setTabIndex] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

    // Sport dialog
    const [sportDialog, setSportDialog] = useState(false);
    const [editSportItem, setEditSportItem] = useState<SportItem | null>(null);
    const [sportForm, setSportForm] = useState({
        name: '', code: '', category: 'team', description: '',
        coach_name: '', coach_phone: '', venue: '', practice_schedule: '',
        max_participants: 30, season: '', registration_fee: 0, equipment_provided: false,
    });

    // Registration dialog
    const [regDialog, setRegDialog] = useState(false);
    const [regForm, setRegForm] = useState({
        sport_id: '' as number | '', student_id: '' as number | '',
        position: '', jersey_number: '', remarks: '',
    });

    // Achievement dialog
    const [achDialog, setAchDialog] = useState(false);
    const [editAchItem, setEditAchItem] = useState<AchievementItem | null>(null);
    const [achForm, setAchForm] = useState({
        sport_id: '' as number | '', student_id: '' as number | '', title: '',
        achievement_type: 'participation', level: 'school',
        event_name: '', event_date: '', event_venue: '', description: '',
    });

    useEffect(() => {
        dispatch(fetchSports({})); dispatch(fetchStudents({}));
    }, [dispatch]);

    useEffect(() => {
        if (tabIndex === 0) { dispatch(fetchSportsStats()); dispatch(fetchSports({})); }
        if (tabIndex === 1) dispatch(fetchSports({}));
        if (tabIndex === 2) dispatch(fetchParticipations({}));
        if (tabIndex === 3) dispatch(fetchAchievements({}));
    }, [tabIndex, dispatch]);

    useEffect(() => {
        if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearSportsError()); }
    }, [error, dispatch]);

    // ─── Sport handlers ───────────────────────────────────────────────
    const handleSaveSport = async () => {
        if (editSportItem) await dispatch(updateSport({ id: editSportItem.id, data: sportForm }));
        else await dispatch(createSport(sportForm));
        setSnack({ open: true, msg: editSportItem ? 'Sport updated!' : 'Sport added!', sev: 'success' });
        setSportDialog(false); setEditSportItem(null); dispatch(fetchSports({})); dispatch(fetchSportsStats());
    };
    const openEditSport = (s: SportItem) => {
        setEditSportItem(s);
        setSportForm({ name: s.name, code: s.code || '', category: s.category, description: s.description || '', coach_name: s.coach_name || '', coach_phone: s.coach_phone || '', venue: s.venue || '', practice_schedule: s.practice_schedule || '', max_participants: s.max_participants, season: s.season || '', registration_fee: s.registration_fee, equipment_provided: s.equipment_provided });
        setSportDialog(true);
    };
    const openNewSport = () => {
        setEditSportItem(null);
        setSportForm({ name: '', code: '', category: 'team', description: '', coach_name: '', coach_phone: '', venue: '', practice_schedule: '', max_participants: 30, season: '', registration_fee: 0, equipment_provided: false });
        setSportDialog(true);
    };

    // ─── Registration handlers ──────────────────────────────────────────
    const handleRegister = async () => {
        if (!regForm.sport_id || !regForm.student_id) return;
        const result = await dispatch(registerStudent(regForm));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Student registered!', sev: 'success' });
            setRegDialog(false); dispatch(fetchSports({})); dispatch(fetchParticipations({})); dispatch(fetchSportsStats());
        }
    };
    const openRegister = () => {
        setRegForm({ sport_id: sports.length > 0 ? sports[0].id : '', student_id: '', position: '', jersey_number: '', remarks: '' });
        setRegDialog(true);
    };

    // ─── Achievement handlers ───────────────────────────────────────────
    const handleSaveAchievement = async () => {
        const payload = { ...achForm, student_id: achForm.student_id || null };
        if (editAchItem) await dispatch(updateAchievement({ id: editAchItem.id, data: payload }));
        else await dispatch(createAchievement(payload));
        setSnack({ open: true, msg: editAchItem ? 'Achievement updated!' : 'Achievement added!', sev: 'success' });
        setAchDialog(false); setEditAchItem(null); dispatch(fetchAchievements({})); dispatch(fetchSportsStats());
    };
    const openEditAch = (a: AchievementItem) => {
        setEditAchItem(a);
        setAchForm({ sport_id: a.sport_id, student_id: a.student_id || '', title: a.title, achievement_type: a.achievement_type, level: a.level, event_name: a.event_name || '', event_date: a.event_date || '', event_venue: a.event_venue || '', description: a.description || '' });
        setAchDialog(true);
    };
    const openNewAch = () => {
        setEditAchItem(null);
        setAchForm({ sport_id: sports.length > 0 ? sports[0].id : '', student_id: '', title: '', achievement_type: 'participation', level: 'school', event_name: '', event_date: '', event_venue: '', description: '' });
        setAchDialog(true);
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Sports Management</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>🏆 Sports Management</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage sports, registrations, and achievements</Typography>
                </Box>
            </Box>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Sports', value: stats?.total_sports ?? sports.length, icon: <SportsSoccer />, color: '#3D5EE1' },
                    { label: 'Active Sports', value: stats?.active_sports ?? 0, icon: <SportsBasketball />, color: '#51CF66' },
                    { label: 'Participants', value: stats?.total_participants ?? 0, icon: <People />, color: '#FCC419' },
                    { label: 'Achievements', value: stats?.total_achievements ?? 0, icon: <EmojiEvents />, color: '#DC3545' },
                ].map((stat, i) => (
                    <Grid key={i} size={{ xs: 6, md: 3 }}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>{stat.icon}</Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
                    <Tab label="Dashboard" icon={<FitnessCenter sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Sports" icon={<SportsSoccer sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Registration" icon={<People sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Achievements" icon={<EmojiEvents sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Dashboard ══════════════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    {stats && stats.category_breakdown.length > 0 && (
                        <>
                            <Typography variant="h6" fontWeight={700} mb={2}>📊 Category Breakdown</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {stats.category_breakdown.map((cat, i) => (
                                    <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
                                        <Card sx={{ border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                                            <CardContent>
                                                <Typography variant="h3">{CATEGORY_ICONS[cat.category] || '🎯'}</Typography>
                                                <Typography fontWeight={700} sx={{ textTransform: 'capitalize' }}>{cat.category}</Typography>
                                                <Typography variant="body2" color="text.secondary">{cat.count} sport{cat.count !== 1 ? 's' : ''}</Typography>
                                                <Typography variant="body2" sx={{ color: '#3D5EE1', fontWeight: 600 }}>{cat.participants} participant{cat.participants !== 1 ? 's' : ''}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </>
                    )}
                    {stats && stats.achievement_breakdown.length > 0 && (
                        <>
                            <Typography variant="h6" fontWeight={700} mb={2}>🏅 Achievements by Level</Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                                {stats.achievement_breakdown.map((ab, i) => (
                                    <Chip key={i} label={`${ab.level}: ${ab.count}`}
                                        sx={{ bgcolor: `${LEVEL_COLORS[ab.level] || '#999'}18`, color: LEVEL_COLORS[ab.level] || '#999', fontWeight: 700, fontSize: 14, px: 1, textTransform: 'capitalize' }} />
                                ))}
                            </Box>
                        </>
                    )}
                    {/* Active sports overview */}
                    {sports.length > 0 && (
                        <>
                            <Typography variant="h6" fontWeight={700} mb={2}>🏟️ Active Sports</Typography>
                            <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                <TableContainer>
                                    <Table>
                                        <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Sport</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Coach</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Venue</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Participants</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Available</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Fee</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">🏆</TableCell>
                                        </TableRow></TableHead>
                                        <TableBody>
                                            {sports.filter(s => s.is_active).map(s => (
                                                <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                                    <TableCell>
                                                        <Typography fontWeight={600}>{CATEGORY_ICONS[s.category] || '🎯'} {s.name}</Typography>
                                                        {s.code && <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#3D5EE1' }}>{s.code}</Typography>}
                                                    </TableCell>
                                                    <TableCell><Chip label={s.category} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} /></TableCell>
                                                    <TableCell>{s.coach_name || '—'}</TableCell>
                                                    <TableCell>{s.venue || '—'}</TableCell>
                                                    <TableCell align="center"><Typography fontWeight={700}>{s.current_participants}/{s.max_participants}</Typography></TableCell>
                                                    <TableCell align="center"><Typography fontWeight={700} sx={{ color: s.available_slots > 0 ? '#51CF66' : '#DC3545' }}>{s.available_slots}</Typography></TableCell>
                                                    <TableCell align="right">{s.registration_fee > 0 ? <Typography fontWeight={700} sx={{ color: '#3D5EE1' }}>₹{s.registration_fee.toLocaleString()}</Typography> : <Typography variant="caption" color="text.secondary">Free</Typography>}</TableCell>
                                                    <TableCell align="center"><Typography fontWeight={700}>{s.achievements_count}</Typography></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </>
                    )}
                    {sports.length === 0 && !loading && (
                        <Paper sx={{ p: 6, textAlign: 'center' }}>
                            <SportsSoccer sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="h6" color="text.secondary">No sports configured. Add sports to get started!</Typography>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ Tab 1: Sports ═════════════════════════════════════════ */}
            {tabIndex === 1 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<Add />} onClick={openNewSport}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Sport</Button>
                    </Box>
                    <Grid container spacing={2}>
                        {sports.length === 0 ? (
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 6, textAlign: 'center' }}>
                                    <SportsSoccer sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">No sports added yet</Typography>
                                </Paper>
                            </Grid>
                        ) : sports.map(s => (
                            <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card sx={{ height: '100%', border: '1px solid rgba(0,0,0,0.06)', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }, transition: 'all 0.2s' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Chip label={s.category} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} variant="outlined" />
                                            <Box>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditSport(s)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { dispatch(deleteSport(s.id)); dispatch(fetchSportsStats()); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </Box>
                                        </Box>
                                        <Typography variant="h6" fontWeight={700} gutterBottom>{CATEGORY_ICONS[s.category] || '🎯'} {s.name}</Typography>
                                        {s.code && <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#3D5EE1' }}>{s.code}</Typography>}
                                        {s.description && <Typography variant="body2" color="text.secondary" mt={0.5} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</Typography>}
                                        <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
                                            <Box><Typography variant="caption" color="text.secondary">Participants</Typography><Typography fontWeight={700}>{s.current_participants}/{s.max_participants}</Typography></Box>
                                            <Box><Typography variant="caption" color="text.secondary">Available</Typography><Typography fontWeight={700} sx={{ color: s.available_slots > 0 ? '#51CF66' : '#DC3545' }}>{s.available_slots}</Typography></Box>
                                            {s.achievements_count > 0 && <Box><Typography variant="caption" color="text.secondary">Achievements</Typography><Typography fontWeight={700} sx={{ color: '#FCC419' }}>🏆 {s.achievements_count}</Typography></Box>}
                                        </Box>
                                        {s.coach_name && <Typography variant="body2" mt={1} color="text.secondary">👨‍🏫 {s.coach_name}</Typography>}
                                        {s.venue && <Typography variant="body2" color="text.secondary">📍 {s.venue}</Typography>}
                                        {s.practice_schedule && <Typography variant="body2" color="text.secondary">🕐 {s.practice_schedule}</Typography>}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                                            {s.registration_fee > 0 ? <Typography variant="body2" sx={{ color: '#3D5EE1', fontWeight: 700 }}>₹{s.registration_fee.toLocaleString()}</Typography> : <Chip label="Free" size="small" sx={{ bgcolor: '#51CF6618', color: '#51CF66' }} />}
                                            {s.equipment_provided && <Chip label="🎒 Equipment" size="small" variant="outlined" />}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {/* ═══ Tab 2: Registration ═══════════════════════════════════ */}
            {tabIndex === 2 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<People />} onClick={openRegister}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Register Student</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#E8F5E9' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Sport</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Jersey</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Since</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Fee Paid</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {participations.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                            <Person sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No registrations found</Typography>
                                        </TableCell></TableRow>
                                    ) : participations.map(p => (
                                        <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'rgba(81,207,102,0.04)' } }}>
                                            <TableCell><Typography fontWeight={600}>{p.student_name || `Student #${p.student_id}`}</Typography></TableCell>
                                            <TableCell><Typography fontWeight={600}>{p.sport_name}</Typography></TableCell>
                                            <TableCell>{p.position || '—'}</TableCell>
                                            <TableCell>{p.jersey_number ? <Chip label={`#${p.jersey_number}`} size="small" variant="outlined" /> : '—'}</TableCell>
                                            <TableCell>{p.registration_date}</TableCell>
                                            <TableCell><Chip label={p.fee_paid ? 'Paid' : 'Pending'} size="small" sx={{ bgcolor: p.fee_paid ? '#51CF6618' : '#FCC41918', color: p.fee_paid ? '#51CF66' : '#FCC419', fontWeight: 700 }} /></TableCell>
                                            <TableCell><Chip label={p.status} size="small" sx={{ textTransform: 'capitalize', fontWeight: 700 }} /></TableCell>
                                            <TableCell>
                                                {p.status !== 'dropped' && (
                                                    <Tooltip title="Drop"><IconButton size="small" color="warning" onClick={async () => {
                                                        await dispatch(updateParticipation({ id: p.id, data: { status: 'dropped' } }));
                                                        dispatch(fetchParticipations({})); dispatch(fetchSports({})); dispatch(fetchSportsStats());
                                                        setSnack({ open: true, msg: 'Student dropped', sev: 'success' });
                                                    }}><Delete fontSize="small" /></IconButton></Tooltip>
                                                )}
                                                <Tooltip title="Remove"><IconButton size="small" color="error" onClick={async () => {
                                                    await dispatch(deleteParticipation(p.id));
                                                    dispatch(fetchSports({})); dispatch(fetchSportsStats());
                                                }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 3: Achievements ═══════════════════════════════════ */}
            {tabIndex === 3 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<EmojiEvents />} onClick={openNewAch}
                            sx={{ background: 'linear-gradient(135deg, #FFD700, #FFA000)', color: '#000', boxShadow: '0 4px 14px rgba(255,215,0,0.35)' }}>Add Achievement</Button>
                    </Box>
                    <Grid container spacing={2}>
                        {achievements.length === 0 ? (
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 6, textAlign: 'center' }}>
                                    <EmojiEvents sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">No achievements recorded yet</Typography>
                                </Paper>
                            </Grid>
                        ) : achievements.map(a => (
                            <Grid key={a.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card sx={{ height: '100%', border: `2px solid ${ACH_COLORS[a.achievement_type] || '#999'}30`, '&:hover': { boxShadow: `0 4px 20px ${ACH_COLORS[a.achievement_type] || '#999'}30` }, transition: 'all 0.2s' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <Chip label={a.achievement_type.replace('_', ' ')} size="small"
                                                    sx={{ bgcolor: `${ACH_COLORS[a.achievement_type] || '#999'}18`, color: ACH_COLORS[a.achievement_type] || '#999', textTransform: 'capitalize', fontWeight: 700 }} />
                                                <Chip label={a.level} size="small"
                                                    sx={{ bgcolor: `${LEVEL_COLORS[a.level] || '#999'}18`, color: LEVEL_COLORS[a.level] || '#999', textTransform: 'capitalize', fontWeight: 700 }} />
                                            </Box>
                                            <Box>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditAch(a)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { dispatch(deleteAchievement(a.id)); dispatch(fetchSportsStats()); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </Box>
                                        </Box>
                                        <Typography variant="h6" fontWeight={700} gutterBottom>🏆 {a.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">{a.sport_name}</Typography>
                                        {a.student_name && <Typography variant="body2" mt={0.5}>👤 {a.student_name}</Typography>}
                                        {a.event_name && <Typography variant="body2" color="text.secondary" mt={0.5}>🎪 {a.event_name}</Typography>}
                                        {a.event_date && <Typography variant="caption" color="text.secondary">📅 {a.event_date}</Typography>}
                                        {a.event_venue && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>📍 {a.event_venue}</Typography>}
                                        {a.description && <Typography variant="body2" mt={1} sx={{ color: '#666', fontStyle: 'italic' }}>{a.description}</Typography>}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {/* ═══ Sport Dialog ═══════════════════════════════════════════ */}
            <Dialog open={sportDialog} onClose={() => setSportDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editSportItem ? 'Edit Sport' : 'Add New Sport'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 8 }}><TextField fullWidth label="Sport Name *" value={sportForm.name} onChange={e => setSportForm({ ...sportForm, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Code" value={sportForm.code} onChange={e => setSportForm({ ...sportForm, code: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Category</InputLabel>
                                <Select value={sportForm.category} label="Category" onChange={e => setSportForm({ ...sportForm, category: e.target.value })}>
                                    {Object.entries(CATEGORY_ICONS).map(([k, icon]) => <MenuItem key={k} value={k}>{icon} {k.charAt(0).toUpperCase() + k.slice(1)}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 3 }}><TextField fullWidth label="Max Participants" type="number" value={sportForm.max_participants} onChange={e => setSportForm({ ...sportForm, max_participants: Number(e.target.value) || 30 })} /></Grid>
                        <Grid size={{ xs: 3 }}><TextField fullWidth label="Fee (₹)" type="number" value={sportForm.registration_fee} onChange={e => setSportForm({ ...sportForm, registration_fee: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Coach Name" value={sportForm.coach_name} onChange={e => setSportForm({ ...sportForm, coach_name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Coach Phone" value={sportForm.coach_phone} onChange={e => setSportForm({ ...sportForm, coach_phone: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Venue" value={sportForm.venue} onChange={e => setSportForm({ ...sportForm, venue: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Practice Schedule" placeholder="Mon,Wed,Fri 4:00-5:30 PM" value={sportForm.practice_schedule} onChange={e => setSportForm({ ...sportForm, practice_schedule: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Season" placeholder="e.g., Winter 2026" value={sportForm.season} onChange={e => setSportForm({ ...sportForm, season: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><FormControlLabel control={<Switch checked={sportForm.equipment_provided} onChange={e => setSportForm({ ...sportForm, equipment_provided: e.target.checked })} />} label="🎒 Equipment Provided" /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Description" value={sportForm.description} onChange={e => setSportForm({ ...sportForm, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSportDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveSport} disabled={!sportForm.name}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editSportItem ? 'Update' : 'Add Sport'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Registration Dialog ════════════════════════════════════ */}
            <Dialog open={regDialog} onClose={() => setRegDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Register Student for Sport</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Sport</InputLabel>
                                <Select value={regForm.sport_id} label="Sport" onChange={e => setRegForm({ ...regForm, sport_id: e.target.value as number })}>
                                    {sports.filter(s => s.available_slots > 0).map(s => (
                                        <MenuItem key={s.id} value={s.id}>{CATEGORY_ICONS[s.category] || '🎯'} {s.name} ({s.available_slots} slots)</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Student</InputLabel>
                                <Select value={regForm.student_id} label="Student" onChange={e => setRegForm({ ...regForm, student_id: e.target.value as number })}>
                                    {students.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Position" placeholder="Captain, Goalkeeper..." value={regForm.position} onChange={e => setRegForm({ ...regForm, position: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Jersey Number" value={regForm.jersey_number} onChange={e => setRegForm({ ...regForm, jersey_number: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline label="Remarks" value={regForm.remarks} onChange={e => setRegForm({ ...regForm, remarks: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRegDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleRegister} disabled={!regForm.sport_id || !regForm.student_id}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Register</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Achievement Dialog ═════════════════════════════════════ */}
            <Dialog open={achDialog} onClose={() => setAchDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editAchItem ? 'Edit Achievement' : 'Add Achievement'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Title *" value={achForm.title} onChange={e => setAchForm({ ...achForm, title: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Sport</InputLabel>
                                <Select value={achForm.sport_id} label="Sport" onChange={e => setAchForm({ ...achForm, sport_id: e.target.value as number })}>
                                    {sports.map(s => <MenuItem key={s.id} value={s.id}>{CATEGORY_ICONS[s.category] || '🎯'} {s.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Student (optional)</InputLabel>
                                <Select value={achForm.student_id} label="Student (optional)" onChange={e => setAchForm({ ...achForm, student_id: e.target.value as number })}>
                                    <MenuItem value="">Team Achievement</MenuItem>
                                    {students.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Type</InputLabel>
                                <Select value={achForm.achievement_type} label="Type" onChange={e => setAchForm({ ...achForm, achievement_type: e.target.value })}>
                                    <MenuItem value="gold">🥇 Gold</MenuItem>
                                    <MenuItem value="silver">🥈 Silver</MenuItem>
                                    <MenuItem value="bronze">🥉 Bronze</MenuItem>
                                    <MenuItem value="participation">🎖️ Participation</MenuItem>
                                    <MenuItem value="mvp">⭐ MVP</MenuItem>
                                    <MenuItem value="best_player">🌟 Best Player</MenuItem>
                                    <MenuItem value="special">✨ Special</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Level</InputLabel>
                                <Select value={achForm.level} label="Level" onChange={e => setAchForm({ ...achForm, level: e.target.value })}>
                                    <MenuItem value="school">🏫 School</MenuItem>
                                    <MenuItem value="district">🏘️ District</MenuItem>
                                    <MenuItem value="state">🗺️ State</MenuItem>
                                    <MenuItem value="national">🇮🇳 National</MenuItem>
                                    <MenuItem value="international">🌍 International</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Event Name" value={achForm.event_name} onChange={e => setAchForm({ ...achForm, event_name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 3 }}><TextField fullWidth label="Event Date" type="date" InputLabelProps={{ shrink: true }} value={achForm.event_date} onChange={e => setAchForm({ ...achForm, event_date: e.target.value })} /></Grid>
                        <Grid size={{ xs: 3 }}><TextField fullWidth label="Venue" value={achForm.event_venue} onChange={e => setAchForm({ ...achForm, event_venue: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Description" value={achForm.description} onChange={e => setAchForm({ ...achForm, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAchDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveAchievement} disabled={!achForm.title || !achForm.sport_id}
                        sx={{ background: 'linear-gradient(135deg, #FFD700, #FFA000)', color: '#000' }}>{editAchItem ? 'Update' : 'Add Achievement'}</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
