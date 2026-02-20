import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchDepartments, createDepartment, updateDepartment, deleteDepartment,
    fetchDesignations, createDesignation, updateDesignation, deleteDesignation,
    fetchDepartmentTree, clearError,
} from '../../store/slices/departmentSlice';
import type { DepartmentItem, DesignationItem, DepartmentTreeNode } from '../../store/slices/departmentSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import {
    Box, Typography, Button, Paper, TextField, InputAdornment, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton,
    MenuItem, Select, FormControl, InputLabel, Tabs, Tab, Table,
    TableBody, TableCell, TableHead, TableRow, TableContainer, Divider, Collapse,
} from '@mui/material';
import {
    Search, Add, Edit, Delete, Refresh, Business, Badge, AccountTree,
    ExpandMore, ExpandLess, Circle, FolderOpen,
} from '@mui/icons-material';

// ═════════════════════════════════════════════════════════════════════════
export default function DepartmentsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { departments, totalDepartments, designations, totalDesignations, tree, loading, error } = useSelector((s: RootState) => s.departments);
    const { teachers } = useSelector((s: RootState) => s.teachers);

    // ── Tabs ────────────────────────────────────────────────────────────
    const [tabIndex, setTabIndex] = useState(0);
    const [search, setSearch] = useState('');

    // ── Department dialog ───────────────────────────────────────────────
    const [deptFormOpen, setDeptFormOpen] = useState(false);
    const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
    const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', head_teacher_id: '' as number | '', parent_id: '' as number | '', is_active: true, order: 0 });

    // ── Designation dialog ──────────────────────────────────────────────
    const [desigFormOpen, setDesigFormOpen] = useState(false);
    const [editingDesigId, setEditingDesigId] = useState<number | null>(null);
    const [desigForm, setDesigForm] = useState({ name: '', code: '', description: '', department_id: '' as number | '', level: 1, is_active: true, order: 0 });

    // ── Snackbar ────────────────────────────────────────────────────────
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // ── Load ────────────────────────────────────────────────────────────
    useEffect(() => { dispatch(fetchDepartments()); dispatch(fetchDesignations()); dispatch(fetchTeachers({})); }, [dispatch]);
    useEffect(() => { if (tabIndex === 2) dispatch(fetchDepartmentTree()); }, [tabIndex, dispatch]);
    useEffect(() => { if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); } }, [error, dispatch]);

    // ── Department handlers ─────────────────────────────────────────────
    const handleOpenAddDept = () => { setEditingDeptId(null); setDeptForm({ name: '', code: '', description: '', head_teacher_id: '', parent_id: '', is_active: true, order: 0 }); setDeptFormOpen(true); };
    const handleOpenEditDept = (d: DepartmentItem) => {
        setEditingDeptId(d.id);
        setDeptForm({ name: d.name, code: d.code || '', description: d.description || '', head_teacher_id: d.head_teacher_id || '', parent_id: d.parent_id || '', is_active: d.is_active, order: d.order });
        setDeptFormOpen(true);
    };
    const handleSaveDept = async () => {
        const payload = { ...deptForm, head_teacher_id: deptForm.head_teacher_id || null, parent_id: deptForm.parent_id || null };
        const result = editingDeptId
            ? await dispatch(updateDepartment({ id: editingDeptId, data: payload }))
            : await dispatch(createDepartment(payload));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingDeptId ? 'Department updated!' : 'Department created!', severity: 'success' });
            setDeptFormOpen(false); dispatch(fetchDepartments());
        }
    };
    const handleDeleteDept = async (id: number) => {
        const result = await dispatch(deleteDepartment(id));
        if (!result.type.endsWith('/rejected')) setSnackbar({ open: true, message: 'Department deleted', severity: 'success' });
    };

    // ── Designation handlers ────────────────────────────────────────────
    const handleOpenAddDesig = () => { setEditingDesigId(null); setDesigForm({ name: '', code: '', description: '', department_id: '', level: 1, is_active: true, order: 0 }); setDesigFormOpen(true); };
    const handleOpenEditDesig = (d: DesignationItem) => {
        setEditingDesigId(d.id);
        setDesigForm({ name: d.name, code: d.code || '', description: d.description || '', department_id: d.department_id || '', level: d.level, is_active: d.is_active, order: d.order });
        setDesigFormOpen(true);
    };
    const handleSaveDesig = async () => {
        const payload = { ...desigForm, department_id: desigForm.department_id || null };
        const result = editingDesigId
            ? await dispatch(updateDesignation({ id: editingDesigId, data: payload }))
            : await dispatch(createDesignation(payload));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingDesigId ? 'Designation updated!' : 'Designation created!', severity: 'success' });
            setDesigFormOpen(false); dispatch(fetchDesignations());
        }
    };
    const handleDeleteDesig = async (id: number) => {
        const result = await dispatch(deleteDesignation(id));
        if (!result.type.endsWith('/rejected')) setSnackbar({ open: true, message: 'Designation deleted', severity: 'success' });
    };

    // ── Filter ──────────────────────────────────────────────────────────
    const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
    const filteredDesigs = designations.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

    // ═══════════════════════════════════════════════════════════════════
    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Departments &amp; Designations</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Departments &amp; Designations</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage organizational structure and job titles</Typography>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Departments', value: totalDepartments, icon: <Business />, color: '#3D5EE1' },
                    { label: 'Designations', value: totalDesignations, icon: <Badge />, color: '#FCC419' },
                    { label: 'Active Depts', value: departments.filter(d => d.is_active).length, icon: <Circle sx={{ fontSize: 14 }} />, color: '#51CF66' },
                ].map((stat, i) => (
                    <Grid key={i} size={{ xs: 6, md: 4 }}>
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
                <Tabs value={tabIndex} onChange={(_, v) => { setTabIndex(v); setSearch(''); }} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
                    <Tab label="Departments" icon={<Business sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Designations" icon={<Badge sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Hierarchy" icon={<AccountTree sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Departments ═══════════════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <TextField size="small" placeholder="Search departments…" value={search} onChange={e => setSearch(e.target.value)}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> } }}
                            sx={{ minWidth: 200, flex: 1, maxWidth: 300 }} />
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Refresh"><IconButton onClick={() => dispatch(fetchDepartments())} color="primary"><Refresh /></IconButton></Tooltip>
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddDept}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Department</Button>
                    </Paper>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Head</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Parent</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Designations</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading && filteredDepts.length === 0 ? (
                                        Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                                    ) : filteredDepts.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}><Business sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} /><Typography variant="h6" color="text.secondary">No departments found</Typography></TableCell></TableRow>
                                    ) : filteredDepts.map(d => (
                                        <TableRow key={d.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#3D5EE118', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Business sx={{ fontSize: 18, color: '#3D5EE1' }} /></Box>
                                                <Box><Typography variant="body2" fontWeight={600}>{d.name}</Typography>{d.description && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</Typography>}</Box>
                                            </Box></TableCell>
                                            <TableCell><Chip label={d.code || '—'} size="small" variant="outlined" /></TableCell>
                                            <TableCell><Typography variant="body2">{d.head_teacher_name || '—'}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{d.parent_name || '—'}</Typography></TableCell>
                                            <TableCell><Chip label={d.designation_count} size="small" color="primary" variant="outlined" /></TableCell>
                                            <TableCell>{d.is_active ? <Chip label="Active" size="small" sx={{ bgcolor: '#51CF6618', color: '#51CF66', fontWeight: 600 }} /> : <Chip label="Inactive" size="small" sx={{ bgcolor: '#DC354518', color: '#DC3545', fontWeight: 600 }} />}</TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEditDept(d)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => handleDeleteDept(d.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 1: Designations ═══════════════════════════════════ */}
            {tabIndex === 1 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <TextField size="small" placeholder="Search designations…" value={search} onChange={e => setSearch(e.target.value)}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> } }}
                            sx={{ minWidth: 200, flex: 1, maxWidth: 300 }} />
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Refresh"><IconButton onClick={() => dispatch(fetchDesignations())} color="primary"><Refresh /></IconButton></Tooltip>
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddDesig}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Designation</Button>
                    </Paper>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Level</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading && filteredDesigs.length === 0 ? (
                                        Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                                    ) : filteredDesigs.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}><Badge sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} /><Typography variant="h6" color="text.secondary">No designations found</Typography></TableCell></TableRow>
                                    ) : filteredDesigs.map(d => (
                                        <TableRow key={d.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#FCC41918', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Badge sx={{ fontSize: 18, color: '#FCC419' }} /></Box>
                                                <Box><Typography variant="body2" fontWeight={600}>{d.name}</Typography>{d.description && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</Typography>}</Box>
                                            </Box></TableCell>
                                            <TableCell><Chip label={d.code || '—'} size="small" variant="outlined" /></TableCell>
                                            <TableCell><Typography variant="body2">{d.department_name || '— General —'}</Typography></TableCell>
                                            <TableCell><Chip label={`Level ${d.level}`} size="small" sx={{ bgcolor: '#3D5EE118', color: '#3D5EE1', fontWeight: 600 }} /></TableCell>
                                            <TableCell>{d.is_active ? <Chip label="Active" size="small" sx={{ bgcolor: '#51CF6618', color: '#51CF66', fontWeight: 600 }} /> : <Chip label="Inactive" size="small" sx={{ bgcolor: '#DC354518', color: '#DC3545', fontWeight: 600 }} />}</TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEditDesig(d)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => handleDeleteDesig(d.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 2: Hierarchy ════════════════════════════════════════ */}
            {tabIndex === 2 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'flex-end', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Tooltip title="Refresh"><IconButton onClick={() => dispatch(fetchDepartmentTree())} color="primary"><Refresh /></IconButton></Tooltip>
                    </Paper>

                    <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        {tree.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <AccountTree sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="h6" color="text.secondary">No hierarchy to display</Typography>
                                <Typography variant="body2" color="text.secondary">Add departments with parent relationships to visualize hierarchy</Typography>
                            </Box>
                        ) : (
                            <Box>
                                <Typography variant="subtitle1" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AccountTree sx={{ color: '#3D5EE1' }} /> Organization Hierarchy</Typography>
                                <Divider sx={{ mb: 2 }} />
                                {tree.map(node => <TreeNode key={node.id} node={node} depth={0} />)}
                            </Box>
                        )}
                    </Paper>
                </>
            )}

            {/* ═══ DIALOGS ═════════════════════════════════════════════════ */}

            {/* Department Dialog */}
            <Dialog open={deptFormOpen} onClose={() => setDeptFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingDeptId ? 'Edit Department' : 'Add Department'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 8 }}><TextField label="Department Name" fullWidth required value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="Code" fullWidth value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="e.g. SCI" /></Grid>
                        <Grid size={12}><TextField label="Description" fullWidth multiline rows={2} value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Head Teacher</InputLabel>
                                <Select value={deptForm.head_teacher_id} label="Head Teacher" onChange={e => setDeptForm({ ...deptForm, head_teacher_id: e.target.value as any })}>
                                    <MenuItem value="">None</MenuItem>
                                    {teachers.map(t => <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Parent Department</InputLabel>
                                <Select value={deptForm.parent_id} label="Parent Department" onChange={e => setDeptForm({ ...deptForm, parent_id: e.target.value as any })}>
                                    <MenuItem value="">None (top-level)</MenuItem>
                                    {departments.filter(d => d.id !== editingDeptId).map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}><TextField label="Order" type="number" fullWidth value={deptForm.order} onChange={e => setDeptForm({ ...deptForm, order: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select value={deptForm.is_active ? 'active' : 'inactive'} label="Status" onChange={e => setDeptForm({ ...deptForm, is_active: e.target.value === 'active' })}>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeptFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveDept}>{editingDeptId ? 'Update' : 'Add'}</Button>
                </DialogActions>
            </Dialog>

            {/* Designation Dialog */}
            <Dialog open={desigFormOpen} onClose={() => setDesigFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingDesigId ? 'Edit Designation' : 'Add Designation'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 8 }}><TextField label="Designation Title" fullWidth required value={desigForm.name} onChange={e => setDesigForm({ ...desigForm, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="Code" fullWidth value={desigForm.code} onChange={e => setDesigForm({ ...desigForm, code: e.target.value })} placeholder="e.g. HOD" /></Grid>
                        <Grid size={12}><TextField label="Description" fullWidth multiline rows={2} value={desigForm.description} onChange={e => setDesigForm({ ...desigForm, description: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Department</InputLabel>
                                <Select value={desigForm.department_id} label="Department" onChange={e => setDesigForm({ ...desigForm, department_id: e.target.value as any })}>
                                    <MenuItem value="">General</MenuItem>
                                    {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}><TextField label="Level" type="number" fullWidth value={desigForm.level} onChange={e => setDesigForm({ ...desigForm, level: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 6, sm: 3 }}><TextField label="Order" type="number" fullWidth value={desigForm.order} onChange={e => setDesigForm({ ...desigForm, order: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select value={desigForm.is_active ? 'active' : 'inactive'} label="Status" onChange={e => setDesigForm({ ...desigForm, is_active: e.target.value === 'active' })}>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDesigFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveDesig}>{editingDesigId ? 'Update' : 'Add'}</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Tree Node Component (hierarchy visualization)
// ═══════════════════════════════════════════════════════════════════════

function TreeNode({ node, depth }: { node: DepartmentTreeNode; depth: number }) {
    const [open, setOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    const colors = ['#3D5EE1', '#6B82F0', '#9AABF5', '#C2CDF9'];
    const color = colors[Math.min(depth, colors.length - 1)];

    return (
        <Box sx={{ ml: depth * 3 }}>
            <Box
                onClick={() => hasChildren && setOpen(!open)}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2,
                    borderLeft: `3px solid ${color}`, borderRadius: 1,
                    cursor: hasChildren ? 'pointer' : 'default',
                    mb: 1, transition: 'all 0.2s',
                    bgcolor: 'rgba(0,0,0,0.01)',
                    '&:hover': { bgcolor: 'rgba(61,94,225,0.06)', transform: 'translateX(4px)' },
                }}
            >
                {hasChildren ? (open ? <ExpandLess sx={{ color, fontSize: 20 }} /> : <ExpandMore sx={{ color, fontSize: 20 }} />) : <FolderOpen sx={{ color, fontSize: 20 }} />}
                <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Business sx={{ fontSize: 16, color }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{node.name}</Typography>
                    {node.head_teacher_name && <Typography variant="caption" color="text.secondary">Head: {node.head_teacher_name}</Typography>}
                </Box>
                {node.code && <Chip label={node.code} size="small" variant="outlined" sx={{ mr: 1 }} />}
                <Chip label={`${node.designation_count} roles`} size="small" sx={{ bgcolor: `${color}18`, color, fontWeight: 600 }} />
                {!node.is_active && <Chip label="Inactive" size="small" sx={{ bgcolor: '#DC354518', color: '#DC3545' }} />}
            </Box>

            {hasChildren && (
                <Collapse in={open}>
                    {node.children.map(child => <TreeNode key={child.id} node={child} depth={depth + 1} />)}
                </Collapse>
            )}
        </Box>
    );
}
