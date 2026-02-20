import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchExams, fetchExamById, createExam, updateExam, deleteExam,
    addSchedule, updateSchedule, deleteSchedule, fetchCalendar,
    clearError, clearCurrentExam,
} from '../../store/slices/examSlice';
import type { ExamScheduleItem, CalendarEvent } from '../../store/slices/examSlice';
import { fetchSubjects } from '../../store/slices/subjectsSlice';
import { fetchClasses } from '../../store/slices/classesSlice';
import { fetchRooms } from '../../store/slices/roomsSlice';
import {
    Box, Typography, Button, Paper, TextField, InputAdornment, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton,
    MenuItem, Select, FormControl, InputLabel, Tabs, Tab, Divider, Table,
    TableBody, TableCell, TableHead, TableRow, TableContainer,
} from '@mui/material';
import {
    Search, Add, Edit, Delete, Assignment, Refresh, Visibility,
    CalendarMonth, ArrowBack, Event, Schedule, ChevronLeft, ChevronRight,
    Notifications, Warning,
} from '@mui/icons-material';

// ─── Constants ──────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
    unit_test: 'Unit Test', mid_term: 'Mid Term', final: 'Final',
    practical: 'Practical', assignment: 'Assignment', other: 'Other',
};
const STATUS_COLORS: Record<string, string> = {
    upcoming: '#3D5EE1', ongoing: '#FCC419', completed: '#51CF66', cancelled: '#DC3545',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Types ──────────────────────────────────────────────────────────────

interface ExamFormData {
    name: string; description: string; exam_type: string; academic_year: string;
    status: string; start_date: string; end_date: string; class_id: number | '';
    total_marks: number; passing_marks: number;
}
interface ScheduleFormData {
    subject_id: number | ''; exam_date: string; start_time: string; end_time: string;
    room_id: number | ''; max_marks: number; passing_marks: number; instructions: string;
}

const emptyExamForm: ExamFormData = {
    name: '', description: '', exam_type: 'mid_term', academic_year: '2025-26',
    status: 'upcoming', start_date: '', end_date: '', class_id: '',
    total_marks: 100, passing_marks: 35,
};
const emptyScheduleForm: ScheduleFormData = {
    subject_id: '', exam_date: '', start_time: '09:00', end_time: '12:00',
    room_id: '', max_marks: 100, passing_marks: 35, instructions: '',
};

// ═════════════════════════════════════════════════════════════════════════
export default function ExamsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { exams, total, loading, currentExam, detailLoading, calendarEvents, error } = useSelector((s: RootState) => s.exams);
    const { subjects } = useSelector((s: RootState) => s.subjects);
    const { classes } = useSelector((s: RootState) => s.classes);
    const { rooms } = useSelector((s: RootState) => s.rooms);

    // ── Mode ────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [tabIndex, setTabIndex] = useState(0); // 0=list, 1=calendar

    // ── Filters ─────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [classFilter, setClassFilter] = useState<number | ''>('');

    // ── Calendar state ──────────────────────────────────────────────────
    const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
    const [calYear, setCalYear] = useState(new Date().getFullYear());

    // ── Dialogs ─────────────────────────────────────────────────────────
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<ExamFormData>(emptyExamForm);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // ── Schedule dialog ─────────────────────────────────────────────────
    const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
    const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
    const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>(emptyScheduleForm);

    // ── Snackbar ────────────────────────────────────────────────────────
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });

    // ── Load ────────────────────────────────────────────────────────────
    const loadExams = useCallback(() => {
        const params: any = {};
        if (searchQuery) params.search = searchQuery;
        if (statusFilter) params.status_filter = statusFilter;
        if (typeFilter) params.exam_type = typeFilter;
        if (classFilter) params.class_id = classFilter;
        dispatch(fetchExams(params));
    }, [dispatch, searchQuery, statusFilter, typeFilter, classFilter]);

    useEffect(() => { loadExams(); }, [loadExams]);
    useEffect(() => { dispatch(fetchSubjects({})); dispatch(fetchClasses({})); dispatch(fetchRooms({})); }, [dispatch]);
    useEffect(() => { if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); } }, [error, dispatch]);
    useEffect(() => { if (tabIndex === 1) dispatch(fetchCalendar({ month: calMonth, year: calYear })); }, [tabIndex, calMonth, calYear, dispatch]);

    // ── Upcoming exams (notifications) ──────────────────────────────────
    const upcomingExams = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return exams.filter(e => e.status === 'upcoming' && e.start_date && e.start_date >= today).slice(0, 5);
    }, [exams]);

    // ── Exam handlers ───────────────────────────────────────────────────
    const handleOpenAdd = () => { setEditingId(null); setForm(emptyExamForm); setFormOpen(true); };
    const handleOpenEdit = (e: any) => {
        setEditingId(e.id);
        setForm({
            name: e.name, description: e.description || '', exam_type: e.exam_type,
            academic_year: e.academic_year, status: e.status,
            start_date: e.start_date || '', end_date: e.end_date || '',
            class_id: e.class_id, total_marks: e.total_marks, passing_marks: e.passing_marks,
        });
        setFormOpen(true);
    };
    const handleSave = async () => {
        if (!form.name.trim() || !form.class_id) return;
        const payload: any = { ...form, start_date: form.start_date || null, end_date: form.end_date || null };
        const result = editingId
            ? await dispatch(updateExam({ id: editingId, data: { name: payload.name, description: payload.description, exam_type: payload.exam_type, status: payload.status, start_date: payload.start_date, end_date: payload.end_date, total_marks: payload.total_marks, passing_marks: payload.passing_marks } }))
            : await dispatch(createExam(payload));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingId ? 'Exam updated!' : 'Exam created!', severity: 'success' });
            setFormOpen(false); loadExams();
        }
    };
    const handleDelete = async () => {
        if (selectedId) {
            const result = await dispatch(deleteExam(selectedId));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: 'Exam deleted', severity: 'success' });
                if (viewMode === 'detail') { setViewMode('list'); dispatch(clearCurrentExam()); }
            }
        }
        setDeleteDialogOpen(false);
    };
    const handleViewDetail = (id: number) => { dispatch(fetchExamById(id)); setViewMode('detail'); };
    const handleBackToList = () => { setViewMode('list'); dispatch(clearCurrentExam()); loadExams(); };

    // ── Schedule handlers ───────────────────────────────────────────────
    const handleOpenAddSchedule = () => { setEditingScheduleId(null); setScheduleForm(emptyScheduleForm); setScheduleFormOpen(true); };
    const handleOpenEditSchedule = (s: ExamScheduleItem) => {
        setEditingScheduleId(s.id);
        setScheduleForm({
            subject_id: s.subject_id, exam_date: s.exam_date, start_time: s.start_time,
            end_time: s.end_time, room_id: s.room_id || '', max_marks: s.max_marks,
            passing_marks: s.passing_marks, instructions: s.instructions || '',
        });
        setScheduleFormOpen(true);
    };
    const handleSaveSchedule = async () => {
        if (!currentExam || !scheduleForm.subject_id || !scheduleForm.exam_date) return;
        const payload = { ...scheduleForm, room_id: scheduleForm.room_id || null };
        const result = editingScheduleId
            ? await dispatch(updateSchedule({ scheduleId: editingScheduleId, data: payload }))
            : await dispatch(addSchedule({ examId: currentExam.id, data: payload }));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingScheduleId ? 'Schedule updated!' : 'Schedule added!', severity: 'success' });
            setScheduleFormOpen(false);
            dispatch(fetchExamById(currentExam.id));
        }
    };
    const handleDeleteSchedule = async (scheduleId: number) => {
        if (!currentExam) return;
        const result = await dispatch(deleteSchedule(scheduleId));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Schedule removed', severity: 'success' });
            dispatch(fetchExamById(currentExam.id));
        }
    };

    // ── Calendar helpers ────────────────────────────────────────────────
    const calDays = useMemo(() => {
        const d = new Date(calYear, calMonth - 1, 1);
        const startDay = d.getDay(); // 0=Sun
        const daysInMonth = new Date(calYear, calMonth, 0).getDate();
        const cells: (number | null)[] = Array.from({ length: startDay }, () => null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [calMonth, calYear]);

    const getEventsForDay = (day: number) =>
        calendarEvents.filter(e => {
            const d = new Date(e.exam_date);
            return d.getDate() === day && d.getMonth() + 1 === calMonth && d.getFullYear() === calYear;
        });

    // ═══════════════════════════════════════════════════════════════════
    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                {viewMode === 'detail' && (
                    <Link color="inherit" href="#" onClick={(e: React.MouseEvent) => { e.preventDefault(); handleBackToList(); }}
                        sx={{ textDecoration: 'none', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>Exams</Link>
                )}
                <Typography color="text.primary" fontWeight={500}>{viewMode === 'list' ? 'Exams' : currentExam?.name || 'Details'}</Typography>
            </Breadcrumbs>

            {/* ═══ LIST VIEW ════════════════════════════════════════════════ */}
            {viewMode === 'list' && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h4" fontWeight={700}>Exams</Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>Manage exams, schedules, and view the exam calendar</Typography>
                        </Box>
                    </Box>

                    {/* Upcoming notifications */}
                    {upcomingExams.length > 0 && (
                        <Paper sx={{ p: 2, mb: 2, border: '1.5px solid #3D5EE130', bgcolor: '#3D5EE108', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Notifications sx={{ color: '#3D5EE1', fontSize: 20 }} />
                                <Typography variant="subtitle2" fontWeight={700} color="primary">Upcoming Exams</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {upcomingExams.map(e => (
                                    <Chip key={e.id} label={`${e.name} — ${e.class_name || ''} (${e.start_date})`}
                                        size="small" variant="outlined" color="primary"
                                        onClick={() => handleViewDetail(e.id)} sx={{ cursor: 'pointer' }} />
                                ))}
                            </Box>
                        </Paper>
                    )}

                    {/* Stats */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {[
                            { label: 'Total Exams', value: total, icon: <Assignment />, color: '#3D5EE1' },
                            { label: 'Upcoming', value: exams.filter(e => e.status === 'upcoming').length, icon: <Event />, color: '#3D5EE1' },
                            { label: 'Ongoing', value: exams.filter(e => e.status === 'ongoing').length, icon: <Schedule />, color: '#FCC419' },
                            { label: 'Completed', value: exams.filter(e => e.status === 'completed').length, icon: <Assignment />, color: '#51CF66' },
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
                        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ px: 2 }}>
                            <Tab label="Exams List" icon={<Assignment sx={{ fontSize: 18 }} />} iconPosition="start" />
                            <Tab label="Calendar" icon={<CalendarMonth sx={{ fontSize: 18 }} />} iconPosition="start" />
                        </Tabs>
                    </Paper>

                    {/* ─── Tab 0: Exams List ──── */}
                    {tabIndex === 0 && (
                        <>
                            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <TextField placeholder="Search exams..." size="small" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ minWidth: 200, flex: 1 }}
                                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> } }} />
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Status</InputLabel>
                                    <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
                                        <MenuItem value="">All</MenuItem>
                                        <MenuItem value="upcoming">Upcoming</MenuItem>
                                        <MenuItem value="ongoing">Ongoing</MenuItem>
                                        <MenuItem value="completed">Completed</MenuItem>
                                        <MenuItem value="cancelled">Cancelled</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Type</InputLabel>
                                    <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
                                        <MenuItem value="">All</MenuItem>
                                        {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Class</InputLabel>
                                    <Select value={classFilter} label="Class" onChange={e => setClassFilter(e.target.value as any)}>
                                        <MenuItem value="">All</MenuItem>
                                        {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <Tooltip title="Refresh"><IconButton onClick={loadExams} color="primary"><Refresh /></IconButton></Tooltip>
                                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}
                                    sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
                                    New Exam
                                </Button>
                            </Paper>

                            <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                {loading && <LinearProgress />}
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                                <TableCell sx={{ fontWeight: 600 }}>Exam</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Dates</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Subjects</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {loading && exams.length === 0 ? (
                                                Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                                            ) : exams.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                                        <Assignment sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                                        <Typography variant="h6" color="text.secondary">No exams found</Typography>
                                                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ mt: 2 }}>Create Exam</Button>
                                                    </TableCell>
                                                </TableRow>
                                            ) : exams.map(e => (
                                                <TableRow key={e.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' }, cursor: 'pointer' }} onClick={() => handleViewDetail(e.id)}>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'rgba(61,94,225,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Assignment sx={{ fontSize: 18, color: '#3D5EE1' }} />
                                                            </Box>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight={600}>{e.name}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{e.academic_year}</Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell><Chip label={TYPE_LABELS[e.exam_type] || e.exam_type} size="small" variant="outlined" /></TableCell>
                                                    <TableCell><Typography variant="body2">{e.class_name || '—'}</Typography></TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption">{e.start_date || '—'} → {e.end_date || '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={e.status} size="small"
                                                            sx={{ bgcolor: `${STATUS_COLORS[e.status] || '#999'}18`, color: STATUS_COLORS[e.status] || '#999', fontWeight: 600, textTransform: 'capitalize' }} />
                                                    </TableCell>
                                                    <TableCell><Chip label={e.schedule_count} size="small" color="primary" variant="outlined" /></TableCell>
                                                    <TableCell align="center" onClick={ev => ev.stopPropagation()}>
                                                        <Tooltip title="View"><IconButton size="small" sx={{ color: '#3D5EE1' }} onClick={() => handleViewDetail(e.id)}><Visibility fontSize="small" /></IconButton></Tooltip>
                                                        <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEdit(e)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                        <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => { setSelectedId(e.id); setDeleteDialogOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </>
                    )}

                    {/* ─── Tab 1: Calendar ──── */}
                    {tabIndex === 1 && (
                        <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
                                <IconButton onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}><ChevronLeft /></IconButton>
                                <Typography variant="h6" fontWeight={700}>{MONTHS[calMonth - 1]} {calYear}</Typography>
                                <IconButton onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}><ChevronRight /></IconButton>
                            </Box>
                            {/* Day headers */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <Box key={d} sx={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'text.secondary', py: 0.5 }}>{d}</Box>
                                ))}
                            </Box>
                            {/* Calendar cells */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                                {calDays.map((day, idx) => {
                                    const events = day ? getEventsForDay(day) : [];
                                    const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() + 1 && calYear === new Date().getFullYear();
                                    return (
                                        <Box key={idx} sx={{
                                            minHeight: 80, border: '1px solid #e0e0e0', borderRadius: 1, p: 0.5,
                                            bgcolor: day ? (isToday ? '#3D5EE108' : '#fff') : '#fafafa',
                                            ...(isToday && { border: '2px solid #3D5EE1' }),
                                        }}>
                                            {day && (
                                                <>
                                                    <Typography variant="caption" fontWeight={isToday ? 700 : 400} color={isToday ? 'primary' : 'text.secondary'}>{day}</Typography>
                                                    {events.map(ev => (
                                                        <Tooltip key={ev.id} title={`${ev.exam_name} — ${ev.subject_name} (${ev.start_time}–${ev.end_time})`}>
                                                            <Box sx={{
                                                                bgcolor: `${STATUS_COLORS[ev.status] || '#3D5EE1'}20`,
                                                                border: `1px solid ${STATUS_COLORS[ev.status] || '#3D5EE1'}`,
                                                                borderRadius: 0.5, px: 0.5, mb: 0.25, cursor: 'pointer',
                                                            }} onClick={() => handleViewDetail(ev.exam_id)}>
                                                                <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {ev.subject_name}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    ))}
                                                </>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ DETAIL VIEW ══════════════════════════════════════════════ */}
            {viewMode === 'detail' && (
                <>
                    {detailLoading ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}><LinearProgress /><Typography sx={{ mt: 2 }}>Loading exam…</Typography></Paper>
                    ) : currentExam ? (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <IconButton onClick={handleBackToList}><ArrowBack /></IconButton>
                                    <Box>
                                        <Typography variant="h5" fontWeight={700}>{currentExam.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {TYPE_LABELS[currentExam.exam_type]} • {currentExam.class_name} • {currentExam.academic_year}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip label={currentExam.status} sx={{ bgcolor: `${STATUS_COLORS[currentExam.status] || '#999'}18`, color: STATUS_COLORS[currentExam.status], fontWeight: 600, textTransform: 'capitalize' }} />
                                    <Button variant="outlined" size="small" startIcon={<Edit />} onClick={() => handleOpenEdit(currentExam)}>Edit</Button>
                                </Box>
                            </Box>

                            {/* Info cards */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                            <Typography variant="caption" color="text.secondary">Total Marks</Typography>
                                            <Typography variant="h5" fontWeight={700}>{currentExam.total_marks}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                            <Typography variant="caption" color="text.secondary">Pass Marks</Typography>
                                            <Typography variant="h5" fontWeight={700}>{currentExam.passing_marks}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                            <Typography variant="caption" color="text.secondary">Start → End</Typography>
                                            <Typography variant="body2" fontWeight={600}>{currentExam.start_date || '—'} → {currentExam.end_date || '—'}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                            <Typography variant="caption" color="text.secondary">Subjects</Typography>
                                            <Typography variant="h5" fontWeight={700}>{currentExam.schedule_count}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {currentExam.description && (
                                <Paper sx={{ p: 2, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                    <Typography variant="body2" color="text.secondary">{currentExam.description}</Typography>
                                </Paper>
                            )}

                            {/* Schedule Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={600}>Exam Schedule ({currentExam.schedules?.length || 0})</Typography>
                                <Button variant="contained" size="small" startIcon={<Add />} onClick={handleOpenAddSchedule}
                                    sx={{ background: 'linear-gradient(135deg, #51CF66, #40C057)' }}>Add Subject</Button>
                            </Box>

                            {/* Schedule Table */}
                            {(!currentExam.schedules || currentExam.schedules.length === 0) ? (
                                <Paper sx={{ p: 4, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                                    <CalendarMonth sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">No schedule yet</Typography>
                                    <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddSchedule} sx={{ mt: 2 }}>Add Subject Schedule</Button>
                                </Paper>
                            ) : (
                                <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                                    <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Marks</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {currentExam.schedules.map(s => (
                                                    <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight={600}>{s.subject_name || `Subject #${s.subject_id}`}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={s.exam_date} size="small" variant="outlined" icon={<Event sx={{ fontSize: 14 }} />} />
                                                        </TableCell>
                                                        <TableCell><Typography variant="body2">{s.start_time} – {s.end_time}</Typography></TableCell>
                                                        <TableCell><Typography variant="body2">{s.room_name || '—'}</Typography></TableCell>
                                                        <TableCell><Typography variant="body2">{s.max_marks} (pass: {s.passing_marks})</Typography></TableCell>
                                                        <TableCell align="center">
                                                            <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEditSchedule(s)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                            <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => handleDeleteSchedule(s.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            )}
                        </>
                    ) : (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="error">Exam not found</Typography>
                            <Button onClick={handleBackToList} sx={{ mt: 2 }}>Back to List</Button>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ DIALOGS ═════════════════════════════════════════════════ */}

            {/* Create / Edit Exam */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? 'Edit Exam' : 'Create Exam'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={12}><TextField label="Exam Name" fullWidth required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required disabled={!!editingId}>
                                <InputLabel>Class</InputLabel>
                                <Select value={form.class_id} label="Class" onChange={e => setForm({ ...form, class_id: Number(e.target.value) })}>
                                    {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select value={form.exam_type} label="Type" onChange={e => setForm({ ...form, exam_type: e.target.value })}>
                                    {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Academic Year" fullWidth value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select value={form.status} label="Status" onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <MenuItem value="upcoming">Upcoming</MenuItem>
                                    <MenuItem value="ongoing">Ongoing</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                    <MenuItem value="cancelled">Cancelled</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Start Date" type="date" fullWidth value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="End Date" type="date" fullWidth value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Total Marks" type="number" fullWidth value={form.total_marks} onChange={e => setForm({ ...form, total_marks: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Passing Marks" type="number" fullWidth value={form.passing_marks} onChange={e => setForm({ ...form, passing_marks: Number(e.target.value) })} /></Grid>
                        <Grid size={12}><TextField label="Description" fullWidth multiline rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Exam</DialogTitle>
                <DialogContent><Typography>This will delete the exam and all its schedules. Continue?</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Add/Edit Schedule */}
            <Dialog open={scheduleFormOpen} onClose={() => setScheduleFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingScheduleId ? 'Edit Schedule' : 'Add Subject Schedule'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Subject</InputLabel>
                                <Select value={scheduleForm.subject_id} label="Subject" onChange={e => setScheduleForm({ ...scheduleForm, subject_id: Number(e.target.value) })}>
                                    {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Exam Date" type="date" fullWidth required value={scheduleForm.exam_date}
                                onChange={e => setScheduleForm({ ...scheduleForm, exam_date: e.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField label="Start Time" type="time" fullWidth value={scheduleForm.start_time}
                                onChange={e => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField label="End Time" type="time" fullWidth value={scheduleForm.end_time}
                                onChange={e => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Room</InputLabel>
                                <Select value={scheduleForm.room_id} label="Room" onChange={e => setScheduleForm({ ...scheduleForm, room_id: e.target.value as number })}>
                                    <MenuItem value="">—</MenuItem>
                                    {rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.room_number}{r.name ? ` - ${r.name}` : ''}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 6 }}><TextField label="Max Marks" type="number" fullWidth value={scheduleForm.max_marks} onChange={e => setScheduleForm({ ...scheduleForm, max_marks: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 6, sm: 6 }}><TextField label="Pass Marks" type="number" fullWidth value={scheduleForm.passing_marks} onChange={e => setScheduleForm({ ...scheduleForm, passing_marks: Number(e.target.value) })} /></Grid>
                        <Grid size={12}><TextField label="Instructions" fullWidth multiline rows={2} value={scheduleForm.instructions} onChange={e => setScheduleForm({ ...scheduleForm, instructions: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setScheduleFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveSchedule}
                        sx={{ background: 'linear-gradient(135deg, #51CF66, #40C057)' }}>{editingScheduleId ? 'Update' : 'Add'}</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
