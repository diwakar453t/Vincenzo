import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchTimetables, fetchTimetableById, createTimetable, updateTimetable, deleteTimetable,
    addPeriod, updatePeriod, deletePeriod, checkConflicts,
    clearError, clearCurrentTimetable, clearConflicts,
} from '../../store/slices/timetableSlice';
import type { PeriodItem, ConflictItem } from '../../store/slices/timetableSlice';
import { fetchSubjects } from '../../store/slices/subjectsSlice';
import { fetchClasses } from '../../store/slices/classesSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchRooms } from '../../store/slices/roomsSlice';
import {
    Box, Typography, Button, Paper, TextField, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton,
    MenuItem, Select, FormControl, InputLabel, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Divider,
} from '@mui/material';
import {
    Add, Edit, Delete, CalendarMonth, Refresh, Visibility, AccessTime,
    Warning, Print, ArrowBack, Schedule, Close,
} from '@mui/icons-material';

// ─── Constants ──────────────────────────────────────────────────────────

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_LABELS: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
};
const DEFAULT_SLOTS = [
    { start: '08:00', end: '08:45' },
    { start: '08:45', end: '09:30' },
    { start: '09:30', end: '09:45', type: 'break' },
    { start: '09:45', end: '10:30' },
    { start: '10:30', end: '11:15' },
    { start: '11:15', end: '12:00' },
    { start: '12:00', end: '12:45', type: 'lunch' },
    { start: '12:45', end: '13:30' },
    { start: '13:30', end: '14:15' },
];
const PERIOD_COLORS: Record<string, string> = {
    class: '#3D5EE1', break: '#FCC419', lunch: '#FF8C00', free: '#ADB5BD',
};

// ─── Types ──────────────────────────────────────────────────────────────

interface TimetableFormData { class_id: number | ''; academic_year: string; name: string; status: string; }
interface PeriodFormData {
    day_of_week: string; start_time: string; end_time: string;
    subject_id: number | ''; teacher_id: number | ''; room_id: number | '';
    period_type: string;
}

const emptyTTForm: TimetableFormData = { class_id: '', academic_year: '2025-26', name: '', status: 'draft' };
const emptyPeriodForm: PeriodFormData = {
    day_of_week: 'monday', start_time: '08:00', end_time: '08:45',
    subject_id: '', teacher_id: '', room_id: '', period_type: 'class',
};

// ═════════════════════════════════════════════════════════════════════════
export default function TimetablePage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);

    const { timetables, total, loading, currentTimetable, detailLoading, conflicts, error } = useSelector((s: RootState) => s.timetable);
    const { subjects } = useSelector((s: RootState) => s.subjects);
    const { classes } = useSelector((s: RootState) => s.classes);
    const { teachers } = useSelector((s: RootState) => s.teachers);
    const { rooms } = useSelector((s: RootState) => s.rooms);

    // ── Mode ────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

    // ── List filters ────────────────────────────────────────────────────
    const [classFilter, setClassFilter] = useState<number | ''>('');
    const [statusFilter, setStatusFilter] = useState('');

    // ── Dialogs ─────────────────────────────────────────────────────────
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<TimetableFormData>(emptyTTForm);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // ── Period ──────────────────────────────────────────────────────────
    const [periodFormOpen, setPeriodFormOpen] = useState(false);
    const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
    const [periodForm, setPeriodForm] = useState<PeriodFormData>(emptyPeriodForm);

    // ── Snackbar ────────────────────────────────────────────────────────
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });

    // ── Load ────────────────────────────────────────────────────────────
    const loadTimetables = useCallback(() => {
        const params: any = {};
        if (classFilter) params.class_id = classFilter;
        if (statusFilter) params.status = statusFilter;
        dispatch(fetchTimetables(params));
    }, [dispatch, classFilter, statusFilter]);

    useEffect(() => { loadTimetables(); }, [loadTimetables]);
    useEffect(() => {
        dispatch(fetchSubjects({})); dispatch(fetchClasses({}));
        dispatch(fetchTeachers({})); dispatch(fetchRooms({}));
    }, [dispatch]);
    useEffect(() => {
        if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); }
    }, [error, dispatch]);

    // ── Timetable handlers ──────────────────────────────────────────────
    const handleOpenAdd = () => { setEditingId(null); setForm(emptyTTForm); setFormOpen(true); };
    const handleOpenEdit = (t: any) => {
        setEditingId(t.id);
        setForm({ class_id: t.class_id, academic_year: t.academic_year, name: t.name || '', status: t.status });
        setFormOpen(true);
    };
    const handleSave = async () => {
        if (!form.class_id) return;
        const result = editingId
            ? await dispatch(updateTimetable({ id: editingId, data: { name: form.name, status: form.status } }))
            : await dispatch(createTimetable(form));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingId ? 'Updated!' : 'Created!', severity: 'success' });
            setFormOpen(false); loadTimetables();
        }
    };
    const handleDelete = async () => {
        if (selectedId) {
            const result = await dispatch(deleteTimetable(selectedId));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: 'Timetable deleted', severity: 'success' });
                if (viewMode === 'detail') { setViewMode('list'); dispatch(clearCurrentTimetable()); }
            }
        }
        setDeleteDialogOpen(false);
    };
    const handleViewDetail = (id: number) => { dispatch(fetchTimetableById(id)); setViewMode('detail'); };
    const handleBackToList = () => { setViewMode('list'); dispatch(clearCurrentTimetable()); dispatch(clearConflicts()); loadTimetables(); };
    const handleCheckConflicts = () => { if (currentTimetable) dispatch(checkConflicts(currentTimetable.id)); };

    // ── Period handlers ─────────────────────────────────────────────────
    const handleOpenAddPeriod = (day?: string, start?: string, end?: string) => {
        setEditingPeriodId(null);
        setPeriodForm({
            ...emptyPeriodForm,
            day_of_week: day || 'monday',
            start_time: start || '08:00',
            end_time: end || '08:45',
        });
        setPeriodFormOpen(true);
    };
    const handleOpenEditPeriod = (p: PeriodItem) => {
        setEditingPeriodId(p.id);
        setPeriodForm({
            day_of_week: p.day_of_week, start_time: p.start_time, end_time: p.end_time,
            subject_id: p.subject_id || '', teacher_id: p.teacher_id || '', room_id: p.room_id || '',
            period_type: p.period_type,
        });
        setPeriodFormOpen(true);
    };
    const handleSavePeriod = async () => {
        if (!currentTimetable) return;
        const payload = {
            ...periodForm,
            subject_id: periodForm.subject_id || null,
            teacher_id: periodForm.teacher_id || null,
            room_id: periodForm.room_id || null,
        };
        const result = editingPeriodId
            ? await dispatch(updatePeriod({ periodId: editingPeriodId, data: payload }))
            : await dispatch(addPeriod({ timetableId: currentTimetable.id, data: payload }));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingPeriodId ? 'Period updated!' : 'Period added!', severity: 'success' });
            setPeriodFormOpen(false);
            dispatch(fetchTimetableById(currentTimetable.id));
        }
    };
    const handleDeletePeriod = async (periodId: number) => {
        if (!currentTimetable) return;
        const result = await dispatch(deletePeriod(periodId));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Period deleted', severity: 'success' });
            dispatch(fetchTimetableById(currentTimetable.id));
        }
    };

    // ── Print ───────────────────────────────────────────────────────────
    const handlePrint = () => {
        const el = printRef.current;
        if (!el) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<html><head><title>${currentTimetable?.name || 'Timetable'}</title>
            <style>body{font-family:Arial,sans-serif;margin:20px}table{border-collapse:collapse;width:100%}
            th,td{border:1px solid #ddd;padding:8px;text-align:center;font-size:12px}
            th{background:#3D5EE1;color:#fff}h2{color:#333;margin-bottom:10px}.break{background:#FFF3CD}.lunch{background:#FFE5CC}</style>
            </head><body>${el.innerHTML}</body></html>`);
        win.document.close();
        win.print();
    };

    // ── Build grid data ─────────────────────────────────────────────────
    const getPeriodAtSlot = (day: string, start: string, end: string): PeriodItem | undefined => {
        return currentTimetable?.periods?.find(p => p.day_of_week === day && p.start_time === start && p.end_time === end);
    };

    const getConflictsForSlot = (day: string, start: string, end: string): ConflictItem[] => {
        return conflicts.filter(c => c.day_of_week === day && c.start_time === start && c.end_time === end);
    };

    // ═══════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                {viewMode === 'detail' && (
                    <Link color="inherit" href="#" onClick={(e: React.MouseEvent) => { e.preventDefault(); handleBackToList(); }}
                        sx={{ textDecoration: 'none', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>Timetable</Link>
                )}
                <Typography color="text.primary" fontWeight={500}>{viewMode === 'list' ? 'Timetable' : currentTimetable?.name || 'Details'}</Typography>
            </Breadcrumbs>

            {/* ═══ LIST VIEW ════════════════════════════════════════════════ */}
            {viewMode === 'list' && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h4" fontWeight={700}>Timetable</Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>Manage weekly class schedules and check for conflicts</Typography>
                        </Box>
                    </Box>

                    {/* Stats */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {[
                            { label: 'Total Timetables', value: total, icon: <CalendarMonth />, color: '#3D5EE1' },
                            { label: 'Active', value: timetables.filter(t => t.status === 'active').length, icon: <Schedule />, color: '#51CF66' },
                            { label: 'Draft', value: timetables.filter(t => t.status === 'draft').length, icon: <Edit />, color: '#FCC419' },
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

                    {/* Filters */}
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Class</InputLabel>
                            <Select value={classFilter} label="Class" onChange={e => setClassFilter(e.target.value as any)}>
                                <MenuItem value="">All</MenuItem>
                                {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="draft">Draft</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                            </Select>
                        </FormControl>
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Refresh"><IconButton onClick={loadTimetables} color="primary"><Refresh /></IconButton></Tooltip>
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
                            New Timetable
                        </Button>
                    </Paper>

                    {/* Table */}
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Timetable</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Periods</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading && timetables.length === 0 ? (
                                        Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                                    ) : timetables.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                                                <CalendarMonth sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                                <Typography variant="h6" color="text.secondary">No timetables found</Typography>
                                                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ mt: 2 }}>Create Timetable</Button>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        timetables.map(t => (
                                            <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' }, cursor: 'pointer' }} onClick={() => handleViewDetail(t.id)}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'rgba(61,94,225,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <CalendarMonth sx={{ fontSize: 18, color: '#3D5EE1' }} />
                                                        </Box>
                                                        <Typography variant="body2" fontWeight={600}>{t.name || `Timetable #${t.id}`}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell><Typography variant="body2">{t.class_name || '—'}</Typography></TableCell>
                                                <TableCell><Chip label={t.academic_year} size="small" variant="outlined" /></TableCell>
                                                <TableCell>
                                                    <Chip label={t.status} size="small"
                                                        sx={{ bgcolor: t.status === 'active' ? '#51CF6618' : '#FCC41918', color: t.status === 'active' ? '#51CF66' : '#FCC419', fontWeight: 600, textTransform: 'capitalize' }} />
                                                </TableCell>
                                                <TableCell><Chip label={t.total_periods} size="small" color="primary" variant="outlined" /></TableCell>
                                                <TableCell align="center" onClick={e => e.stopPropagation()}>
                                                    <Tooltip title="View"><IconButton size="small" sx={{ color: '#3D5EE1' }} onClick={() => handleViewDetail(t.id)}><Visibility fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEdit(t)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => { setSelectedId(t.id); setDeleteDialogOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ DETAIL VIEW — Weekly Calendar Grid ═══════════════════════ */}
            {viewMode === 'detail' && (
                <>
                    {detailLoading ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}><LinearProgress /><Typography sx={{ mt: 2 }}>Loading timetable…</Typography></Paper>
                    ) : currentTimetable ? (
                        <>
                            {/* Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <IconButton onClick={handleBackToList}><ArrowBack /></IconButton>
                                    <Box>
                                        <Typography variant="h5" fontWeight={700}>{currentTimetable.name || 'Timetable'}</Typography>
                                        <Typography variant="body2" color="text.secondary">{currentTimetable.class_name} • {currentTimetable.academic_year} • {currentTimetable.total_periods} periods</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip label={currentTimetable.status} sx={{ bgcolor: currentTimetable.status === 'active' ? '#51CF6618' : '#FCC41918', color: currentTimetable.status === 'active' ? '#51CF66' : '#FCC419', fontWeight: 600, textTransform: 'capitalize' }} />
                                    <Button size="small" variant="outlined" startIcon={<Warning />} onClick={handleCheckConflicts} color="warning">Check Conflicts</Button>
                                    <Button size="small" variant="outlined" startIcon={<Print />} onClick={handlePrint}>Print</Button>
                                    <Button size="small" variant="contained" startIcon={<Add />} onClick={() => handleOpenAddPeriod()}
                                        sx={{ background: 'linear-gradient(135deg, #51CF66, #40C057)' }}>Add Period</Button>
                                </Box>
                            </Box>

                            {/* Conflict Warnings */}
                            {conflicts.length > 0 && (
                                <Paper sx={{ p: 2, mb: 2, border: '2px solid #FF6B6B', bgcolor: '#FFF5F5', borderRadius: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Warning sx={{ color: '#DC3545' }} />
                                        <Typography variant="subtitle1" fontWeight={700} color="error">{conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Found</Typography>
                                    </Box>
                                    {conflicts.map((c, i) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, pl: 4 }}>
                                            <Chip label={c.type === 'teacher_conflict' ? 'Teacher' : 'Room'} size="small" color={c.type === 'teacher_conflict' ? 'error' : 'warning'} variant="outlined" />
                                            <Typography variant="body2">{c.message} — <strong>{DAY_LABELS[c.day_of_week]} {c.start_time}–{c.end_time}</strong></Typography>
                                        </Box>
                                    ))}
                                </Paper>
                            )}

                            {/* Calendar Grid */}
                            <Box ref={printRef}>
                                <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'auto' }}>
                                    <Table sx={{ minWidth: 900, tableLayout: 'fixed' }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700, bgcolor: '#3D5EE1', color: '#fff', width: 100, textAlign: 'center' }}>
                                                    <AccessTime sx={{ fontSize: 16, mr: 0.5 }} />Time
                                                </TableCell>
                                                {DAYS.map(d => (
                                                    <TableCell key={d} sx={{ fontWeight: 700, bgcolor: '#3D5EE1', color: '#fff', textAlign: 'center' }}>{DAY_LABELS[d]}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {DEFAULT_SLOTS.map((slot, si) => (
                                                <TableRow key={si} sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafbfc' } }}>
                                                    <TableCell sx={{ fontWeight: 600, fontSize: 12, bgcolor: '#f0f2f5', textAlign: 'center', verticalAlign: 'middle', borderRight: '2px solid #e0e0e0' }}>
                                                        {slot.start}<br />–<br />{slot.end}
                                                    </TableCell>
                                                    {DAYS.map(day => {
                                                        const period = getPeriodAtSlot(day, slot.start, slot.end);
                                                        const slotConflicts = getConflictsForSlot(day, slot.start, slot.end);
                                                        const isBreak = slot.type === 'break' || slot.type === 'lunch' || period?.period_type === 'break' || period?.period_type === 'lunch';
                                                        const periodType = period?.period_type || slot.type || 'free';

                                                        return (
                                                            <TableCell key={day} sx={{
                                                                textAlign: 'center', verticalAlign: 'middle', p: 0.5, position: 'relative',
                                                                cursor: !isBreak ? 'pointer' : 'default',
                                                                border: slotConflicts.length > 0 ? '2px solid #FF6B6B' : '1px solid #e0e0e0',
                                                                bgcolor: isBreak ? (slot.type === 'lunch' ? '#FFE5CC55' : '#FFF3CD55') : 'transparent',
                                                                '&:hover': !isBreak ? { bgcolor: 'rgba(61,94,225,0.06)' } : {},
                                                            }}
                                                                onClick={() => { if (!isBreak && !period) handleOpenAddPeriod(day, slot.start, slot.end); }}
                                                            >
                                                                {period ? (
                                                                    <Box sx={{
                                                                        bgcolor: `${PERIOD_COLORS[periodType] || PERIOD_COLORS.class}14`,
                                                                        border: `1.5px solid ${PERIOD_COLORS[periodType] || PERIOD_COLORS.class}`,
                                                                        borderRadius: 1.5, p: 0.75, minHeight: 56, display: 'flex', flexDirection: 'column',
                                                                        justifyContent: 'center', position: 'relative',
                                                                    }}>
                                                                        <Typography variant="caption" fontWeight={700} sx={{ color: PERIOD_COLORS[periodType], lineHeight: 1.2 }}>
                                                                            {period.subject_name || periodType.toUpperCase()}
                                                                        </Typography>
                                                                        {period.teacher_name && <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>{period.teacher_name}</Typography>}
                                                                        {period.room_name && <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>{period.room_name}</Typography>}
                                                                        {/* Actions on hover */}
                                                                        <Box className="period-actions" sx={{
                                                                            position: 'absolute', top: 0, right: 0, display: 'flex', opacity: 0, transition: 'opacity 0.2s',
                                                                            '.MuiTableCell-root:hover &': { opacity: 1 }
                                                                        }}>
                                                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditPeriod(period); }} sx={{ p: 0.25 }}><Edit sx={{ fontSize: 13 }} /></IconButton>
                                                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeletePeriod(period.id); }} sx={{ p: 0.25, color: '#DC3545' }}><Delete sx={{ fontSize: 13 }} /></IconButton>
                                                                        </Box>
                                                                    </Box>
                                                                ) : isBreak ? (
                                                                    <Typography variant="caption" fontWeight={600} color="text.secondary">{slot.type === 'lunch' ? '🍽️ Lunch' : '☕ Break'}</Typography>
                                                                ) : (
                                                                    <Box sx={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Add sx={{ fontSize: 18, color: 'text.disabled', opacity: 0, '.MuiTableCell-root:hover &': { opacity: 1 } }} />
                                                                    </Box>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            </Box>

                            {/* Legend */}
                            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                                {Object.entries(PERIOD_COLORS).map(([type, color]) => (
                                    <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color }} />
                                        <Typography variant="caption" textTransform="capitalize">{type}</Typography>
                                    </Box>
                                ))}
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                                    Click an empty slot to add a period • Hover a period for edit/delete
                                </Typography>
                            </Box>
                        </>
                    ) : (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="error">Timetable not found</Typography>
                            <Button onClick={handleBackToList} sx={{ mt: 2 }}>Back to List</Button>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ DIALOGS ═════════════════════════════════════════════════ */}

            {/* Create / Edit Timetable */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? 'Edit Timetable' : 'Create Timetable'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required disabled={!!editingId}>
                                <InputLabel>Class</InputLabel>
                                <Select value={form.class_id} label="Class" onChange={e => setForm({ ...form, class_id: Number(e.target.value) })}>
                                    {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Academic Year" fullWidth required disabled={!!editingId} value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />
                        </Grid>
                        <Grid size={12}><TextField label="Name" fullWidth value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 10-A Weekly Schedule" /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select value={form.status} label="Status" onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <MenuItem value="draft">Draft</MenuItem>
                                    <MenuItem value="active">Active</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Timetable */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Timetable</DialogTitle>
                <DialogContent><Typography>This will delete the timetable and all its periods. Continue?</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Add / Edit Period */}
            <Dialog open={periodFormOpen} onClose={() => setPeriodFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingPeriodId ? 'Edit Period' : 'Add Period'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Day</InputLabel>
                                <Select value={periodForm.day_of_week} label="Day" onChange={e => setPeriodForm({ ...periodForm, day_of_week: e.target.value })}>
                                    {DAYS.map(d => <MenuItem key={d} value={d}>{DAY_LABELS[d]}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField label="Start Time" fullWidth type="time" value={periodForm.start_time}
                                onChange={e => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField label="End Time" fullWidth type="time" value={periodForm.end_time}
                                onChange={e => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Period Type</InputLabel>
                                <Select value={periodForm.period_type} label="Period Type" onChange={e => setPeriodForm({ ...periodForm, period_type: e.target.value })}>
                                    <MenuItem value="class">Class</MenuItem>
                                    <MenuItem value="break">Break</MenuItem>
                                    <MenuItem value="lunch">Lunch</MenuItem>
                                    <MenuItem value="free">Free</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Subject</InputLabel>
                                <Select value={periodForm.subject_id} label="Subject" onChange={e => setPeriodForm({ ...periodForm, subject_id: e.target.value as number })}>
                                    <MenuItem value="">—</MenuItem>
                                    {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Teacher</InputLabel>
                                <Select value={periodForm.teacher_id} label="Teacher" onChange={e => setPeriodForm({ ...periodForm, teacher_id: e.target.value as number })}>
                                    <MenuItem value="">—</MenuItem>
                                    {teachers.map(t => <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Room</InputLabel>
                                <Select value={periodForm.room_id} label="Room" onChange={e => setPeriodForm({ ...periodForm, room_id: e.target.value as number })}>
                                    <MenuItem value="">—</MenuItem>
                                    {rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.room_number}{r.name ? ` - ${r.name}` : ''}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPeriodFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSavePeriod}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editingPeriodId ? 'Update' : 'Add'}</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
