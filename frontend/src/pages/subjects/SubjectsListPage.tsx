import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchSubjects, createSubject, updateSubject, deleteSubject,
    fetchSubjectGroups, createSubjectGroup, updateSubjectGroup, deleteSubjectGroup,
    fetchClassSubjects, assignSubjectToClass, unassignSubjectFromClass,
    clearError,
} from '../../store/slices/subjectsSlice';
import { fetchClasses } from '../../store/slices/classesSlice';
import {
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, InputAdornment, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton, Tabs, Tab,
    MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import {
    Search, Add, Edit, Delete, MenuBook, Refresh, Category, LinkOff,
    School, AddLink,
} from '@mui/icons-material';

// ─── Helpers ────────────────────────────────────────────────────────────

const SUBJECT_TYPES = ['theory', 'practical', 'elective', 'lab'];
const TYPE_COLORS: Record<string, string> = {
    theory: '#3D5EE1', practical: '#51CF66', elective: '#FCC419', lab: '#FF6B6B',
};

const getSubjectColor = (code: string) => {
    const colors = ['#3D5EE1', '#FF6B6B', '#51CF66', '#FCC419', '#845EF7', '#FF922B', '#22B8CF', '#E64980'];
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

// ─── Interfaces ─────────────────────────────────────────────────────────

interface SubjectFormData {
    name: string; code: string; description: string; credits: number;
    subject_type: string; group_id: number | null;
}
interface GroupFormData { name: string; description: string; }

const emptySubjectForm: SubjectFormData = { name: '', code: '', description: '', credits: 3, subject_type: 'theory', group_id: null };
const emptyGroupForm: GroupFormData = { name: '', description: '' };

// ═════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════

export default function SubjectsListPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { subjects, total, loading, error, groups, groupsLoading, classSubjects, classSubjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { classes } = useSelector((state: RootState) => state.classes);

    // ── Shared state ────────────────────────────────────────────────────
    const [tab, setTab] = useState(0);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // ── Subjects tab state ──────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [groupFilter, setGroupFilter] = useState<number | ''>('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<SubjectFormData>(emptySubjectForm);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // ── Group tab state ─────────────────────────────────────────────────
    const [groupFormOpen, setGroupFormOpen] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
    const [groupForm, setGroupForm] = useState<GroupFormData>(emptyGroupForm);
    const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

    // ── Assignment tab state ────────────────────────────────────────────
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignSubjectId, setAssignSubjectId] = useState<number | null>(null);

    // ── Data loading ────────────────────────────────────────────────────
    const loadSubjects = useCallback(() => {
        const params: any = {};
        if (searchQuery) params.search = searchQuery;
        if (typeFilter) params.subject_type = typeFilter;
        if (groupFilter) params.group_id = groupFilter;
        dispatch(fetchSubjects(params));
    }, [dispatch, searchQuery, typeFilter, groupFilter]);

    const loadGroups = useCallback(() => { dispatch(fetchSubjectGroups()); }, [dispatch]);

    useEffect(() => { loadSubjects(); }, [loadSubjects]);
    useEffect(() => { loadGroups(); }, [loadGroups]);
    useEffect(() => { dispatch(fetchClasses({})); }, [dispatch]);
    useEffect(() => {
        if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); }
    }, [error, dispatch]);

    // ── Subject handlers ────────────────────────────────────────────────
    const handleOpenAdd = () => { setEditingId(null); setForm(emptySubjectForm); setFormOpen(true); };
    const handleOpenEdit = (sub: any) => {
        setEditingId(sub.id);
        setForm({ name: sub.name, code: sub.code, description: sub.description || '', credits: sub.credits || 3, subject_type: sub.subject_type || 'theory', group_id: sub.group_id || null });
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.code.trim()) return;
        const payload = { ...form, group_id: form.group_id || undefined };
        const result = editingId
            ? await dispatch(updateSubject({ id: editingId, data: payload }))
            : await dispatch(createSubject(payload));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingId ? 'Subject updated!' : 'Subject created!', severity: 'success' });
            setFormOpen(false); loadSubjects(); loadGroups();
        }
    };

    const handleDelete = async () => {
        if (selectedId) {
            const result = await dispatch(deleteSubject(selectedId));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: 'Subject deleted', severity: 'success' });
                loadGroups();
            }
        }
        setDeleteDialogOpen(false);
    };

    // ── Group handlers ──────────────────────────────────────────────────
    const handleOpenAddGroup = () => { setEditingGroupId(null); setGroupForm(emptyGroupForm); setGroupFormOpen(true); };
    const handleOpenEditGroup = (g: any) => {
        setEditingGroupId(g.id); setGroupForm({ name: g.name, description: g.description || '' }); setGroupFormOpen(true);
    };
    const handleSaveGroup = async () => {
        if (!groupForm.name.trim()) return;
        const result = editingGroupId
            ? await dispatch(updateSubjectGroup({ id: editingGroupId, data: groupForm }))
            : await dispatch(createSubjectGroup(groupForm));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingGroupId ? 'Group updated!' : 'Group created!', severity: 'success' });
            setGroupFormOpen(false); loadGroups();
        }
    };
    const handleDeleteGroup = async () => {
        if (selectedGroupId) {
            const result = await dispatch(deleteSubjectGroup(selectedGroupId));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: 'Group deleted', severity: 'success' });
                loadSubjects();
            }
        }
        setDeleteGroupDialogOpen(false);
    };

    // ── Assignment handlers ─────────────────────────────────────────────
    const handleClassChange = (classId: number) => {
        setSelectedClassId(classId);
        dispatch(fetchClassSubjects(classId));
    };
    const handleAssign = async () => {
        if (!assignSubjectId || !selectedClassId) return;
        const result = await dispatch(assignSubjectToClass({ subjectId: assignSubjectId, classId: selectedClassId }));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Subject assigned!', severity: 'success' });
            setAssignDialogOpen(false);
            dispatch(fetchClassSubjects(selectedClassId));
        }
    };
    const handleUnassign = async (subjectId: number) => {
        if (!selectedClassId) return;
        const result = await dispatch(unassignSubjectFromClass({ subjectId, classId: selectedClassId }));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Subject unassigned', severity: 'success' });
            dispatch(fetchClassSubjects(selectedClassId));
        }
    };

    // Get subjects not yet assigned to selected class
    const availableSubjects = subjects.filter(s => !classSubjects.some(cs => cs.subject_id === s.id));

    // ═════════════════════════════════════════════════════════════════════
    // Render
    // ═════════════════════════════════════════════════════════════════════

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Subjects</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Subjects</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage curriculum subjects, groups, and class assignments</Typography>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(61,94,225,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3D5EE1' }}><MenuBook /></Box>
                            <Box>
                                <Typography variant="h5" fontWeight={700}>{total}</Typography>
                                <Typography variant="caption" color="text.secondary">Total Subjects</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(133,94,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#845EF7' }}><Category /></Box>
                            <Box>
                                <Typography variant="h5" fontWeight={700}>{groups.length}</Typography>
                                <Typography variant="caption" color="text.secondary">Subject Groups</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}
                    sx={{ px: 2, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 52 } }}>
                    <Tab icon={<MenuBook sx={{ fontSize: 18 }} />} iconPosition="start" label="Subjects" />
                    <Tab icon={<Category sx={{ fontSize: 18 }} />} iconPosition="start" label="Subject Groups" />
                    <Tab icon={<School sx={{ fontSize: 18 }} />} iconPosition="start" label="Class Assignment" />
                </Tabs>
            </Paper>

            {/* ─── TAB 0: Subjects ────────────────────────────────────────── */}
            {tab === 0 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <TextField placeholder="Search subjects..." size="small" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ minWidth: 220, flex: 1 }}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> } }} />
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Type</InputLabel>
                            <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
                                <MenuItem value="">All Types</MenuItem>
                                {SUBJECT_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Group</InputLabel>
                            <Select value={groupFilter} label="Group" onChange={e => setGroupFilter(e.target.value as any)}>
                                <MenuItem value="">All Groups</MenuItem>
                                {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Tooltip title="Refresh"><IconButton onClick={loadSubjects} color="primary"><Refresh /></IconButton></Tooltip>
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
                            Add Subject
                        </Button>
                    </Paper>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Group</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Credits</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading && subjects.length === 0 ? (
                                        Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                                    ) : subjects.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                                                <MenuBook sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                                <Typography variant="h6" color="text.secondary">No subjects found</Typography>
                                                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ mt: 2 }}>Add Subject</Button>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        subjects.map(sub => (
                                            <TableRow key={sub.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: `${getSubjectColor(sub.code)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <MenuBook sx={{ fontSize: 18, color: getSubjectColor(sub.code) }} />
                                                        </Box>
                                                        <Typography variant="body2" fontWeight={600}>{sub.name}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell><Chip label={sub.code} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} /></TableCell>
                                                <TableCell>
                                                    <Chip label={sub.subject_type || 'theory'} size="small"
                                                        sx={{ bgcolor: `${TYPE_COLORS[sub.subject_type || 'theory']}18`, color: TYPE_COLORS[sub.subject_type || 'theory'], fontWeight: 600, textTransform: 'capitalize' }} />
                                                </TableCell>
                                                <TableCell><Typography variant="body2" color="text.secondary">{sub.group_name || '—'}</Typography></TableCell>
                                                <TableCell><Typography variant="body2">{sub.credits || '—'}</Typography></TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEdit(sub)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => { setSelectedId(sub.id); setDeleteDialogOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
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

            {/* ─── TAB 1: Subject Groups ──────────────────────────────────── */}
            {tab === 1 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Tooltip title="Refresh"><IconButton onClick={loadGroups} color="primary"><Refresh /></IconButton></Tooltip>
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddGroup}
                            sx={{ background: 'linear-gradient(135deg, #845EF7, #A78BFA)', boxShadow: '0 4px 14px rgba(133,94,247,0.35)' }}>
                            Add Group
                        </Button>
                    </Paper>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {groupsLoading && <LinearProgress color="secondary" />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Group Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Subjects</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {groups.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ textAlign: 'center', py: 6 }}>
                                                <Category sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                                <Typography variant="h6" color="text.secondary">No subject groups yet</Typography>
                                                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddGroup} sx={{ mt: 2 }}>Add Group</Button>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        groups.map(g => (
                                            <TableRow key={g.id} sx={{ '&:hover': { bgcolor: 'rgba(133,94,247,0.04)' } }}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'rgba(133,94,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Category sx={{ fontSize: 18, color: '#845EF7' }} />
                                                        </Box>
                                                        <Typography variant="body2" fontWeight={600}>{g.name}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell><Typography variant="body2" color="text.secondary">{g.description || '—'}</Typography></TableCell>
                                                <TableCell><Chip label={`${g.subject_count || 0} subjects`} size="small" variant="outlined" /></TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEditGroup(g)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => { setSelectedGroupId(g.id); setDeleteGroupDialogOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
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

            {/* ─── TAB 2: Class Assignment ─────────────────────────────────── */}
            {tab === 2 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <FormControl size="small" sx={{ minWidth: 250 }}>
                            <InputLabel>Select Class</InputLabel>
                            <Select value={selectedClassId || ''} label="Select Class" onChange={e => handleClassChange(Number(e.target.value))}>
                                {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name} (Grade {c.grade_level}-{c.section})</MenuItem>)}
                            </Select>
                        </FormControl>
                        {selectedClassId && (
                            <Button variant="contained" startIcon={<AddLink />} onClick={() => { setAssignSubjectId(null); setAssignDialogOpen(true); }}
                                sx={{ ml: 'auto', background: 'linear-gradient(135deg, #51CF66, #40C057)', boxShadow: '0 4px 14px rgba(81,207,102,0.35)' }}>
                                Assign Subject
                            </Button>
                        )}
                    </Paper>

                    {!selectedClassId ? (
                        <Paper sx={{ p: 6, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <School sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="h6" color="text.secondary">Select a class to manage subject assignments</Typography>
                        </Paper>
                    ) : (
                        <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                            {classSubjectsLoading && <LinearProgress color="success" />}
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {classSubjects.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} sx={{ textAlign: 'center', py: 6 }}>
                                                    <MenuBook sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                                    <Typography variant="h6" color="text.secondary">No subjects assigned to this class</Typography>
                                                    <Button variant="contained" startIcon={<AddLink />} onClick={() => { setAssignSubjectId(null); setAssignDialogOpen(true); }} sx={{ mt: 2 }}>Assign Subject</Button>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            classSubjects.map(cs => (
                                                <TableRow key={cs.id} sx={{ '&:hover': { bgcolor: 'rgba(81,207,102,0.04)' } }}>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: `${getSubjectColor(cs.subject_code)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <MenuBook sx={{ fontSize: 18, color: getSubjectColor(cs.subject_code) }} />
                                                            </Box>
                                                            <Typography variant="body2" fontWeight={600}>{cs.subject_name}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell><Chip label={cs.subject_code} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} /></TableCell>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{cs.teacher_name || 'Not assigned'}</Typography></TableCell>
                                                    <TableCell align="center">
                                                        <Tooltip title="Unassign"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => handleUnassign(cs.subject_id)}><LinkOff fontSize="small" /></IconButton></Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ DIALOGS ═════════════════════════════════════════════════ */}

            {/* Add/Edit Subject Dialog */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Subject Name" fullWidth value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Subject Code" fullWidth value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required placeholder="e.g. MATH101" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Subject Type</InputLabel>
                                <Select value={form.subject_type} label="Subject Type" onChange={e => setForm({ ...form, subject_type: e.target.value })}>
                                    {SUBJECT_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Group</InputLabel>
                                <Select value={form.group_id || ''} label="Group" onChange={e => setForm({ ...form, group_id: e.target.value ? Number(e.target.value) : null })}>
                                    <MenuItem value="">None</MenuItem>
                                    {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Credits" type="number" fullWidth value={form.credits} onChange={e => setForm({ ...form, credits: Number(e.target.value) })} />
                        </Grid>
                        <Grid size={12}>
                            <TextField label="Description" fullWidth multiline rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Subject Confirm */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Subject</DialogTitle>
                <DialogContent><Typography>Are you sure? This cannot be undone.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Add/Edit Group Dialog */}
            <Dialog open={groupFormOpen} onClose={() => setGroupFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingGroupId ? 'Edit Subject Group' : 'Add Subject Group'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={12}>
                            <TextField label="Group Name" fullWidth value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} required placeholder="e.g. Science, Arts" />
                        </Grid>
                        <Grid size={12}>
                            <TextField label="Description" fullWidth multiline rows={2} value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGroupFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveGroup} sx={{ background: 'linear-gradient(135deg, #845EF7, #A78BFA)' }}>{editingGroupId ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Group Confirm */}
            <Dialog open={deleteGroupDialogOpen} onClose={() => setDeleteGroupDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Subject Group</DialogTitle>
                <DialogContent><Typography>Are you sure? Subjects in this group will be ungrouped.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteGroupDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteGroup}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Assign Subject to Class Dialog */}
            <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>Assign Subject to Class</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Select Subject</InputLabel>
                        <Select value={assignSubjectId || ''} label="Select Subject" onChange={e => setAssignSubjectId(Number(e.target.value))}>
                            {availableSubjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name} ({s.code})</MenuItem>)}
                        </Select>
                    </FormControl>
                    {availableSubjects.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                            All subjects are already assigned to this class.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAssign} disabled={!assignSubjectId}
                        sx={{ background: 'linear-gradient(135deg, #51CF66, #40C057)' }}>Assign</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
