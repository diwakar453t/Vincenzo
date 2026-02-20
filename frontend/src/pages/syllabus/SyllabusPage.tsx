import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchSyllabi, fetchSyllabusById, createSyllabus, updateSyllabus, deleteSyllabus,
    addTopic, updateTopic, deleteTopic, toggleTopicCompletion,
    uploadTopicDocument, deleteTopicDocument,
    clearError, clearCurrentSyllabus,
} from '../../store/slices/syllabusSlice';
import { fetchSubjects } from '../../store/slices/subjectsSlice';
import { fetchClasses } from '../../store/slices/classesSlice';
import {
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, InputAdornment, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton,
    MenuItem, Select, FormControl, InputLabel, Checkbox, Divider,
} from '@mui/material';
import {
    Search, Add, Edit, Delete, MenuBook, Refresh, Visibility,
    CheckCircle, RadioButtonUnchecked, CloudUpload, AttachFile,
    Close, Description, ArrowBack,
} from '@mui/icons-material';

// ─── Constants ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    draft: '#FCC419', active: '#51CF66', completed: '#3D5EE1',
};

// ─── Types ──────────────────────────────────────────────────────────────

interface SyllabusFormData {
    title: string; description: string; academic_year: string; status: string;
    subject_id: number | ''; class_id: number | '';
}
interface TopicFormData { title: string; description: string; order: number; }

const emptySyllabusForm: SyllabusFormData = { title: '', description: '', academic_year: '2025-26', status: 'draft', subject_id: '', class_id: '' };
const emptyTopicForm: TopicFormData = { title: '', description: '', order: 0 };

// ═════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════

export default function SyllabusPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { syllabi, total, loading, currentSyllabus, detailLoading, error } = useSelector((state: RootState) => state.syllabus);
    const { subjects } = useSelector((state: RootState) => state.subjects);
    const { classes } = useSelector((state: RootState) => state.classes);

    // ── Mode ────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

    // ── List state ──────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState<number | ''>('');
    const [classFilter, setClassFilter] = useState<number | ''>('');

    // ── Dialog state ────────────────────────────────────────────────────
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<SyllabusFormData>(emptySyllabusForm);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // ── Topic state ─────────────────────────────────────────────────────
    const [topicFormOpen, setTopicFormOpen] = useState(false);
    const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
    const [topicForm, setTopicForm] = useState<TopicFormData>(emptyTopicForm);
    const [uploadingTopicId, setUploadingTopicId] = useState<number | null>(null);

    // ── Snackbar ────────────────────────────────────────────────────────
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // ── Data loading ────────────────────────────────────────────────────
    const loadSyllabi = useCallback(() => {
        const params: any = {};
        if (searchQuery) params.search = searchQuery;
        if (statusFilter) params.status = statusFilter;
        if (subjectFilter) params.subject_id = subjectFilter;
        if (classFilter) params.class_id = classFilter;
        dispatch(fetchSyllabi(params));
    }, [dispatch, searchQuery, statusFilter, subjectFilter, classFilter]);

    useEffect(() => { loadSyllabi(); }, [loadSyllabi]);
    useEffect(() => { dispatch(fetchSubjects({})); dispatch(fetchClasses({})); }, [dispatch]);
    useEffect(() => {
        if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); }
    }, [error, dispatch]);

    // ── Syllabus handlers ───────────────────────────────────────────────
    const handleOpenAdd = () => { setEditingId(null); setForm(emptySyllabusForm); setFormOpen(true); };
    const handleOpenEdit = (s: any) => {
        setEditingId(s.id);
        setForm({ title: s.title, description: s.description || '', academic_year: s.academic_year, status: s.status, subject_id: s.subject_id, class_id: s.class_id });
        setFormOpen(true);
    };
    const handleSave = async () => {
        if (!form.title.trim() || !form.subject_id || !form.class_id) return;
        const result = editingId
            ? await dispatch(updateSyllabus({ id: editingId, data: form }))
            : await dispatch(createSyllabus(form));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingId ? 'Syllabus updated!' : 'Syllabus created!', severity: 'success' });
            setFormOpen(false); loadSyllabi();
        }
    };
    const handleDelete = async () => {
        if (selectedId) {
            const result = await dispatch(deleteSyllabus(selectedId));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: 'Syllabus deleted', severity: 'success' });
                if (viewMode === 'detail') { setViewMode('list'); dispatch(clearCurrentSyllabus()); }
            }
        }
        setDeleteDialogOpen(false);
    };
    const handleViewDetail = (id: number) => { dispatch(fetchSyllabusById(id)); setViewMode('detail'); };
    const handleBackToList = () => { setViewMode('list'); dispatch(clearCurrentSyllabus()); loadSyllabi(); };

    // ── Topic handlers ──────────────────────────────────────────────────
    const handleOpenAddTopic = () => {
        setEditingTopicId(null);
        setTopicForm({ ...emptyTopicForm, order: (currentSyllabus?.topics?.length || 0) + 1 });
        setTopicFormOpen(true);
    };
    const handleOpenEditTopic = (t: any) => {
        setEditingTopicId(t.id);
        setTopicForm({ title: t.title, description: t.description || '', order: t.order });
        setTopicFormOpen(true);
    };
    const handleSaveTopic = async () => {
        if (!topicForm.title.trim() || !currentSyllabus) return;
        const result = editingTopicId
            ? await dispatch(updateTopic({ topicId: editingTopicId, data: topicForm }))
            : await dispatch(addTopic({ syllabusId: currentSyllabus.id, data: topicForm }));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingTopicId ? 'Topic updated!' : 'Topic added!', severity: 'success' });
            setTopicFormOpen(false);
            dispatch(fetchSyllabusById(currentSyllabus.id));
        }
    };
    const handleDeleteTopic = async (topicId: number) => {
        if (!currentSyllabus) return;
        const result = await dispatch(deleteTopic(topicId));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Topic deleted', severity: 'success' });
            dispatch(fetchSyllabusById(currentSyllabus.id));
        }
    };
    const handleToggleTopic = async (topicId: number) => {
        await dispatch(toggleTopicCompletion(topicId));
    };

    // ── Upload handlers ─────────────────────────────────────────────────
    const handleUploadClick = (topicId: number) => {
        setUploadingTopicId(topicId);
        fileInputRef.current?.click();
    };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !uploadingTopicId || !currentSyllabus) return;
        const file = e.target.files[0];
        const result = await dispatch(uploadTopicDocument({ topicId: uploadingTopicId, file }));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Document uploaded!', severity: 'success' });
            dispatch(fetchSyllabusById(currentSyllabus.id));
        }
        e.target.value = '';
        setUploadingTopicId(null);
    };
    const handleDeleteDoc = async (topicId: number) => {
        if (!currentSyllabus) return;
        const result = await dispatch(deleteTopicDocument(topicId));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Document removed', severity: 'success' });
            dispatch(fetchSyllabusById(currentSyllabus.id));
        }
    };

    // Progress bar color
    const getProgressColor = (p: number) => p >= 80 ? '#51CF66' : p >= 40 ? '#FCC419' : '#FF6B6B';

    // ═════════════════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════════════════

    return (
        <Box>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.png" />

            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                {viewMode === 'detail' && (
                    <Link color="inherit" href="#" onClick={(e: React.MouseEvent) => { e.preventDefault(); handleBackToList(); }}
                        sx={{ textDecoration: 'none', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>Syllabus</Link>
                )}
                <Typography color="text.primary" fontWeight={500}>{viewMode === 'list' ? 'Syllabus' : currentSyllabus?.title || 'Details'}</Typography>
            </Breadcrumbs>

            {/* ═══ LIST VIEW ════════════════════════════════════════════════ */}
            {viewMode === 'list' && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h4" fontWeight={700}>Syllabus</Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>Manage syllabi, topics, and track completion progress</Typography>
                        </Box>
                    </Box>

                    {/* Stats */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {[
                            { label: 'Total Syllabi', value: total, icon: <MenuBook />, color: '#3D5EE1' },
                            { label: 'Active', value: syllabi.filter(s => s.status === 'active').length, icon: <CheckCircle />, color: '#51CF66' },
                            { label: 'Draft', value: syllabi.filter(s => s.status === 'draft').length, icon: <Description />, color: '#FCC419' },
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
                        <TextField placeholder="Search syllabus..." size="small" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ minWidth: 200, flex: 1 }}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> } }} />
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="draft">Draft</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Subject</InputLabel>
                            <Select value={subjectFilter} label="Subject" onChange={e => setSubjectFilter(e.target.value as any)}>
                                <MenuItem value="">All</MenuItem>
                                {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Class</InputLabel>
                            <Select value={classFilter} label="Class" onChange={e => setClassFilter(e.target.value as any)}>
                                <MenuItem value="">All</MenuItem>
                                {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Tooltip title="Refresh"><IconButton onClick={loadSyllabi} color="primary"><Refresh /></IconButton></Tooltip>
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
                            Add Syllabus
                        </Button>
                    </Paper>

                    {/* Table */}
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Syllabus</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading && syllabi.length === 0 ? (
                                        Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                                    ) : syllabi.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                                <MenuBook sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                                <Typography variant="h6" color="text.secondary">No syllabi found</Typography>
                                                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ mt: 2 }}>Add Syllabus</Button>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        syllabi.map(s => (
                                            <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' }, cursor: 'pointer' }} onClick={() => handleViewDetail(s.id)}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'rgba(61,94,225,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <MenuBook sx={{ fontSize: 18, color: '#3D5EE1' }} />
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={600}>{s.title}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{s.total_topics} topics</Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell><Typography variant="body2">{s.subject_name || '—'}</Typography></TableCell>
                                                <TableCell><Typography variant="body2">{s.class_name || '—'}</Typography></TableCell>
                                                <TableCell><Chip label={s.academic_year} size="small" variant="outlined" /></TableCell>
                                                <TableCell>
                                                    <Chip label={s.status} size="small"
                                                        sx={{ bgcolor: `${STATUS_COLORS[s.status] || '#999'}18`, color: STATUS_COLORS[s.status] || '#999', fontWeight: 600, textTransform: 'capitalize' }} />
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 130 }}>
                                                        <LinearProgress variant="determinate" value={s.progress}
                                                            sx={{
                                                                flex: 1, height: 8, borderRadius: 4, bgcolor: '#f0f0f0',
                                                                '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: getProgressColor(s.progress) }
                                                            }} />
                                                        <Typography variant="caption" fontWeight={600} sx={{ minWidth: 38 }}>{s.progress}%</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="center" onClick={e => e.stopPropagation()}>
                                                    <Tooltip title="View"><IconButton size="small" sx={{ color: '#3D5EE1' }} onClick={() => handleViewDetail(s.id)}><Visibility fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEdit(s)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => { setSelectedId(s.id); setDeleteDialogOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
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

            {/* ═══ DETAIL VIEW ══════════════════════════════════════════════ */}
            {viewMode === 'detail' && (
                <>
                    {detailLoading ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}><LinearProgress /><Typography sx={{ mt: 2 }}>Loading syllabus…</Typography></Paper>
                    ) : currentSyllabus ? (
                        <>
                            {/* Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <IconButton onClick={handleBackToList}><ArrowBack /></IconButton>
                                    <Box>
                                        <Typography variant="h5" fontWeight={700}>{currentSyllabus.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">{currentSyllabus.subject_name} • {currentSyllabus.class_name} • {currentSyllabus.academic_year}</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip label={currentSyllabus.status} sx={{ bgcolor: `${STATUS_COLORS[currentSyllabus.status] || '#999'}18`, color: STATUS_COLORS[currentSyllabus.status], fontWeight: 600, textTransform: 'capitalize' }} />
                                    <Button variant="outlined" size="small" startIcon={<Edit />} onClick={() => handleOpenEdit(currentSyllabus)}>Edit</Button>
                                </Box>
                            </Box>

                            {/* Progress Card */}
                            <Card sx={{ mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                        <Typography variant="subtitle1" fontWeight={600}>Syllabus Progress</Typography>
                                        <Typography variant="h4" fontWeight={700} sx={{ color: getProgressColor(currentSyllabus.progress) }}>{currentSyllabus.progress}%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={currentSyllabus.progress}
                                        sx={{
                                            height: 12, borderRadius: 6, bgcolor: '#f0f0f0', mb: 1,
                                            '& .MuiLinearProgress-bar': { borderRadius: 6, bgcolor: getProgressColor(currentSyllabus.progress), transition: 'width 0.6s ease' }
                                        }} />
                                    <Typography variant="body2" color="text.secondary">{currentSyllabus.completed_topics} of {currentSyllabus.total_topics} topics completed</Typography>
                                    {currentSyllabus.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{currentSyllabus.description}</Typography>}
                                </CardContent>
                            </Card>

                            {/* Topics Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={600}>Topics ({currentSyllabus.topics?.length || 0})</Typography>
                                <Button variant="contained" size="small" startIcon={<Add />} onClick={handleOpenAddTopic}
                                    sx={{ background: 'linear-gradient(135deg, #51CF66, #40C057)', boxShadow: '0 4px 14px rgba(81,207,102,0.35)' }}>
                                    Add Topic
                                </Button>
                            </Box>

                            {/* Topics List */}
                            {(!currentSyllabus.topics || currentSyllabus.topics.length === 0) ? (
                                <Paper sx={{ p: 4, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                    <Description sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">No topics yet</Typography>
                                    <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddTopic} sx={{ mt: 2 }}>Add Topic</Button>
                                </Paper>
                            ) : (
                                <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    {currentSyllabus.topics.map((topic, idx) => (
                                        <Box key={topic.id}>
                                            {idx > 0 && <Divider />}
                                            <Box sx={{
                                                p: 2, display: 'flex', alignItems: 'flex-start', gap: 2,
                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                                                opacity: topic.is_completed ? 0.7 : 1
                                            }}>
                                                {/* Checkbox */}
                                                <Checkbox
                                                    checked={topic.is_completed}
                                                    onChange={() => handleToggleTopic(topic.id)}
                                                    icon={<RadioButtonUnchecked />}
                                                    checkedIcon={<CheckCircle sx={{ color: '#51CF66' }} />}
                                                    sx={{ mt: -0.5 }}
                                                />

                                                {/* Content */}
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip label={`#${topic.order}`} size="small" variant="outlined" sx={{ fontFamily: 'monospace', minWidth: 38 }} />
                                                        <Typography variant="body1" fontWeight={600}
                                                            sx={{ textDecoration: topic.is_completed ? 'line-through' : 'none' }}>{topic.title}</Typography>
                                                    </Box>
                                                    {topic.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{topic.description}</Typography>}

                                                    {/* Document attachment */}
                                                    {topic.document_name && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1, bgcolor: 'rgba(61,94,225,0.06)', borderRadius: 1 }}>
                                                            <AttachFile sx={{ fontSize: 16, color: '#3D5EE1' }} />
                                                            <Typography variant="caption" fontWeight={500} sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.document_name}</Typography>
                                                            <Tooltip title="Remove document">
                                                                <IconButton size="small" onClick={() => handleDeleteDoc(topic.id)}><Close sx={{ fontSize: 14 }} /></IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}

                                                    {topic.is_completed && topic.completed_date && (
                                                        <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>✓ Completed on {topic.completed_date}</Typography>
                                                    )}
                                                </Box>

                                                {/* Actions */}
                                                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                                    <Tooltip title="Upload document"><IconButton size="small" onClick={() => handleUploadClick(topic.id)}><CloudUpload sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                                                    <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEditTopic(topic)}><Edit sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                                                    <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => handleDeleteTopic(topic.id)}><Delete sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                                                </Box>
                                            </Box>
                                        </Box>
                                    ))}
                                </Paper>
                            )}
                        </>
                    ) : (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="error">Syllabus not found</Typography>
                            <Button onClick={handleBackToList} sx={{ mt: 2 }}>Back to List</Button>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ DIALOGS ═════════════════════════════════════════════════ */}

            {/* Add/Edit Syllabus */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? 'Edit Syllabus' : 'Create Syllabus'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={12}><TextField label="Title" fullWidth value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Subject</InputLabel>
                                <Select value={form.subject_id} label="Subject" onChange={e => setForm({ ...form, subject_id: Number(e.target.value) })}>
                                    {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Class</InputLabel>
                                <Select value={form.class_id} label="Class" onChange={e => setForm({ ...form, class_id: Number(e.target.value) })}>
                                    {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Academic Year" fullWidth value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} placeholder="2025-26" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select value={form.status} label="Status" onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <MenuItem value="draft">Draft</MenuItem>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}><TextField label="Description" fullWidth multiline rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Syllabus Confirm */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Syllabus</DialogTitle>
                <DialogContent><Typography>This will delete the syllabus and all its topics. Are you sure?</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Add/Edit Topic */}
            <Dialog open={topicFormOpen} onClose={() => setTopicFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingTopicId ? 'Edit Topic' : 'Add Topic'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={12}><TextField label="Topic Title" fullWidth value={topicForm.title} onChange={e => setTopicForm({ ...topicForm, title: e.target.value })} required /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="Order" type="number" fullWidth value={topicForm.order} onChange={e => setTopicForm({ ...topicForm, order: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 12, sm: 8 }}><TextField label="Description" fullWidth value={topicForm.description} onChange={e => setTopicForm({ ...topicForm, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTopicFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveTopic}
                        sx={{ background: 'linear-gradient(135deg, #51CF66, #40C057)' }}>{editingTopicId ? 'Update' : 'Add'}</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
