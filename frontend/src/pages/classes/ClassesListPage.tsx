import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchClasses, createClass, updateClass, deleteClass, clearError } from '../../store/slices/classesSlice';
import { fetchRooms, assignRoomToClass } from '../../store/slices/roomsSlice';
import {
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, InputAdornment, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton, MenuItem,
} from '@mui/material';
import {
    Search, Add, Edit, Delete, School, People, MeetingRoom, Refresh, Warning,
} from '@mui/icons-material';

interface ClassFormData {
    name: string; grade_level: number; section: string;
    academic_year: string; room_number: string; room_id: number | ''; capacity: number;
}

const emptyForm: ClassFormData = {
    name: '', grade_level: 1, section: 'A',
    academic_year: '2025-2026', room_number: '', room_id: '', capacity: 40,
};

function getOccupancyColor(students: number, capacity: number): string {
    if (capacity === 0) return '#9E9E9E';
    const pct = (students / capacity) * 100;
    if (pct >= 90) return '#DC3545';
    if (pct >= 70) return '#FFC107';
    return '#28A745';
}

function getOccupancyLabel(students: number, capacity: number): string {
    if (capacity === 0) return '0%';
    return `${Math.round((students / capacity) * 100)}%`;
}

export default function ClassesListPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { classes: classList, total, loading, error } = useSelector((state: RootState) => state.classes);
    const { rooms } = useSelector((state: RootState) => state.rooms);

    const [searchQuery, setSearchQuery] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<ClassFormData>(emptyForm);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const loadClasses = useCallback(() => {
        dispatch(fetchClasses({}));
    }, [dispatch]);

    useEffect(() => { loadClasses(); dispatch(fetchRooms({})); }, [loadClasses, dispatch]);

    useEffect(() => {
        if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); }
    }, [error, dispatch]);

    const handleOpenAdd = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
    const handleOpenEdit = (cls: any) => {
        setEditingId(cls.id);
        setForm({
            name: cls.name, grade_level: cls.grade_level, section: cls.section,
            academic_year: cls.academic_year, room_number: cls.room_number || '',
            room_id: cls.room_id || '', capacity: cls.capacity || 40,
        });
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        const payload = { ...form, room_id: form.room_id === '' ? null : form.room_id };
        let result;
        if (editingId) {
            result = await dispatch(updateClass({ id: editingId, data: payload }));
        } else {
            result = await dispatch(createClass(payload));
        }
        if (!result.type.endsWith('/rejected')) {
            // If room was selected and this is a new class, also do room assignment
            if (form.room_id && !editingId && result.payload?.id) {
                await dispatch(assignRoomToClass({ roomId: form.room_id as number, classId: result.payload.id }));
            }
            setSnackbar({ open: true, message: editingId ? 'Class updated!' : 'Class created!', severity: 'success' });
            setFormOpen(false);
            loadClasses();
        }
    };

    const handleDelete = async () => {
        if (selectedId) {
            const result = await dispatch(deleteClass(selectedId));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: 'Class deleted', severity: 'success' });
            }
        }
        setDeleteDialogOpen(false);
    };

    const filtered = classList.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.section.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalStudents = classList.reduce((acc, c) => acc + (c.student_count || 0), 0);
    const totalCapacity = classList.reduce((acc, c) => acc + (c.capacity || 0), 0);
    const avgOccupancy = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Classes</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Classes</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage class sections, rooms, and capacity</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}
                    sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
                    Add Class
                </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Classes', value: total, icon: <School />, color: '#3D5EE1', bg: 'rgba(61,94,225,0.1)' },
                    { label: 'Total Students', value: totalStudents, icon: <People />, color: '#28A745', bg: 'rgba(40,167,69,0.1)' },
                    { label: 'Total Capacity', value: totalCapacity, icon: <MeetingRoom />, color: '#6f42c1', bg: 'rgba(111,66,193,0.1)' },
                    { label: 'Avg Occupancy', value: `${avgOccupancy}%`, icon: <People />, color: avgOccupancy >= 90 ? '#DC3545' : avgOccupancy >= 70 ? '#FFC107' : '#28A745', bg: avgOccupancy >= 90 ? 'rgba(220,53,69,0.1)' : avgOccupancy >= 70 ? 'rgba(255,193,7,0.1)' : 'rgba(40,167,69,0.1)' },
                ].map((stat) => (
                    <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>{stat.icon}</Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <TextField placeholder="Search classes..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ minWidth: 260, flex: 1 }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> } }} />
                <Tooltip title="Refresh"><IconButton onClick={loadClasses} color="primary"><Refresh /></IconButton></Tooltip>
            </Paper>

            <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {loading && <LinearProgress />}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Class Name</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Section</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Academic Year</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Capacity</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Occupancy</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && classList.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                        <School sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">No classes found</Typography>
                                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ mt: 2 }}>Add Class</Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((cls) => {
                                    const students = cls.student_count || 0;
                                    const cap = cls.capacity || 40;
                                    const pct = Math.round((students / cap) * 100);
                                    const color = getOccupancyColor(students, cap);
                                    return (
                                        <TableRow key={cls.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{cls.name}</Typography></TableCell>
                                            <TableCell><Chip label={`Grade ${cls.grade_level}`} size="small" variant="outlined" /></TableCell>
                                            <TableCell><Chip label={cls.section} size="small" color="primary" sx={{ fontWeight: 600 }} /></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary">{cls.academic_year}</Typography></TableCell>
                                            <TableCell>
                                                {cls.room_number ? (
                                                    <Chip icon={<MeetingRoom sx={{ fontSize: 14 }} />} label={cls.room_number} size="small" variant="outlined" sx={{ borderColor: '#6f42c1', color: '#6f42c1' }} />
                                                ) : (
                                                    <Typography variant="body2" color="text.disabled">No room</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {students} / {cap}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                                                    <Box sx={{ flex: 1, bgcolor: '#e0e0e0', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                                        <Box sx={{
                                                            width: `${Math.min(pct, 100)}%`, height: '100%',
                                                            bgcolor: color, borderRadius: 4,
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </Box>
                                                    <Typography variant="caption" fontWeight={600} sx={{ color, minWidth: 36, textAlign: 'right' }}>
                                                        {getOccupancyLabel(students, cap)}
                                                    </Typography>
                                                    {pct >= 90 && (
                                                        <Tooltip title="Near or over capacity">
                                                            <Warning sx={{ fontSize: 16, color: '#DC3545' }} />
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEdit(cls)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => { setSelectedId(cls.id); setDeleteDialogOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Add/Edit Dialog — now with Room Assignment */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', color: '#fff' }}>
                    {editingId ? 'Edit Class' : 'Add New Class'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Class Name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Grade Level" type="number" fullWidth value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: Number(e.target.value) })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Section" select fullWidth value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
                                {['A', 'B', 'C', 'D', 'E'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Academic Year" fullWidth value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Assign Room" select fullWidth value={form.room_id}
                                onChange={(e) => {
                                    const roomId = e.target.value === '' ? '' : Number(e.target.value);
                                    const selectedRoom = rooms.find(r => r.id === roomId);
                                    setForm({
                                        ...form,
                                        room_id: roomId,
                                        room_number: selectedRoom?.room_number || '',
                                        capacity: selectedRoom?.capacity || form.capacity,
                                    });
                                }}>
                                <MenuItem value="">No Room</MenuItem>
                                {rooms.filter(r => r.status === 'available' || r.status === 'occupied').map(r => (
                                    <MenuItem key={r.id} value={r.id}>
                                        {r.room_number}{r.name ? ` - ${r.name}` : ''} (Cap: {r.capacity})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Capacity" type="number" fullWidth value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>
                        {editingId ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning sx={{ color: '#DC3545' }} /> Delete Class
                </DialogTitle>
                <DialogContent><Typography>Are you sure? This cannot be undone.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
