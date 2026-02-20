import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchRooms, createRoom, updateRoom, deleteRoom, clearError } from '../../store/slices/roomsSlice';
import {
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, InputAdornment, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton, MenuItem,
    Switch, FormControlLabel, FormGroup,
} from '@mui/material';
import {
    Search, Add, Edit, Delete, MeetingRoom, Refresh, Tv, AcUnit,
    DeveloperBoard, CheckCircle, Warning, Build, EventBusy, People,
} from '@mui/icons-material';

interface RoomFormData {
    room_number: string; name: string; building: string; floor: number | '';
    room_type: string; capacity: number; status: string;
    has_projector: boolean; has_ac: boolean; has_whiteboard: boolean; has_smartboard: boolean;
    description: string;
}

const emptyForm: RoomFormData = {
    room_number: '', name: '', building: '', floor: '',
    room_type: 'classroom', capacity: 40, status: 'available',
    has_projector: false, has_ac: false, has_whiteboard: true, has_smartboard: false,
    description: '',
};

const ROOM_TYPES = [
    { value: 'classroom', label: 'Classroom' },
    { value: 'laboratory', label: 'Laboratory' },
    { value: 'computer_lab', label: 'Computer Lab' },
    { value: 'library', label: 'Library' },
    { value: 'auditorium', label: 'Auditorium' },
    { value: 'sports_hall', label: 'Sports Hall' },
    { value: 'staff_room', label: 'Staff Room' },
    { value: 'other', label: 'Other' },
];

const ROOM_STATUSES = [
    { value: 'available', label: 'Available', color: '#28A745', icon: <CheckCircle fontSize="small" /> },
    { value: 'occupied', label: 'Occupied', color: '#3D5EE1', icon: <People fontSize="small" /> },
    { value: 'maintenance', label: 'Maintenance', color: '#FFC107', icon: <Build fontSize="small" /> },
    { value: 'reserved', label: 'Reserved', color: '#DC3545', icon: <EventBusy fontSize="small" /> },
];

function getStatusChip(status: string) {
    const s = ROOM_STATUSES.find(rs => rs.value === status);
    return s ? (
        <Chip label={s.label} size="small" icon={s.icon}
            sx={{ bgcolor: `${s.color}15`, color: s.color, fontWeight: 600, border: `1px solid ${s.color}30` }} />
    ) : <Chip label={status} size="small" />;
}

function getTypeLabel(type: string) {
    return ROOM_TYPES.find(t => t.value === type)?.label || type;
}

function getOccupancyColor(occupancy: number, capacity: number): string {
    if (capacity === 0) return '#9E9E9E';
    const pct = (occupancy / capacity) * 100;
    if (pct >= 90) return '#DC3545';
    if (pct >= 70) return '#FFC107';
    return '#28A745';
}

export default function RoomsManagementPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { rooms, total, loading, error } = useSelector((state: RootState) => state.rooms);

    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<RoomFormData>(emptyForm);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const loadRooms = useCallback(() => {
        dispatch(fetchRooms({}));
    }, [dispatch]);

    useEffect(() => { loadRooms(); }, [loadRooms]);
    useEffect(() => { if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); } }, [error, dispatch]);

    const handleOpenAdd = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
    const handleOpenEdit = (room: any) => {
        setEditingId(room.id);
        setForm({
            room_number: room.room_number, name: room.name || '', building: room.building || '',
            floor: room.floor ?? '', room_type: room.room_type, capacity: room.capacity,
            status: room.status, has_projector: room.has_projector, has_ac: room.has_ac,
            has_whiteboard: room.has_whiteboard, has_smartboard: room.has_smartboard, description: '',
        });
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (!form.room_number.trim()) return;
        const payload = { ...form, floor: form.floor === '' ? null : form.floor };
        let result;
        if (editingId) {
            result = await dispatch(updateRoom({ id: editingId, data: payload }));
        } else {
            result = await dispatch(createRoom(payload));
        }
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingId ? 'Room updated!' : 'Room created!', severity: 'success' });
            setFormOpen(false);
            loadRooms();
        }
    };

    const handleDelete = async () => {
        if (selectedId) {
            const result = await dispatch(deleteRoom(selectedId));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: 'Room deleted', severity: 'success' });
            }
        }
        setDeleteDialogOpen(false);
    };

    const filtered = rooms.filter(r => {
        const matchesSearch = r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.building || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !typeFilter || r.room_type === typeFilter;
        const matchesStatus = !statusFilter || r.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
    const totalOccupancy = rooms.reduce((acc, r) => acc + r.current_occupancy, 0);
    const availableCount = rooms.filter(r => r.status === 'available').length;

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Rooms</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Room Management</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage physical rooms and spaces</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}
                    sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
                    Add Room
                </Button>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Rooms', value: total, icon: <MeetingRoom />, color: '#3D5EE1', bg: 'rgba(61,94,225,0.1)' },
                    { label: 'Available', value: availableCount, icon: <CheckCircle />, color: '#28A745', bg: 'rgba(40,167,69,0.1)' },
                    { label: 'Total Capacity', value: totalCapacity, icon: <People />, color: '#6f42c1', bg: 'rgba(111,66,193,0.1)' },
                    { label: 'Currently Occupied', value: totalOccupancy, icon: <People />, color: '#FFC107', bg: 'rgba(255,193,7,0.1)' },
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

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <TextField placeholder="Search rooms..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ minWidth: 220, flex: 1 }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> } }} />
                <TextField select size="small" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 140 }}>
                    <MenuItem value="">All Types</MenuItem>
                    {ROOM_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 140 }}>
                    <MenuItem value="">All Status</MenuItem>
                    {ROOM_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </TextField>
                <Tooltip title="Refresh"><IconButton onClick={loadRooms} color="primary"><Refresh /></IconButton></Tooltip>
            </Paper>

            {/* Table */}
            <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {loading && <LinearProgress />}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Room No.</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Building</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Capacity</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Occupancy</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Amenities</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && rooms.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                                        <MeetingRoom sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">No rooms found</Typography>
                                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd} sx={{ mt: 2 }}>Add Room</Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((room) => {
                                    const occPct = room.capacity > 0 ? Math.round((room.current_occupancy / room.capacity) * 100) : 0;
                                    const occColor = getOccupancyColor(room.current_occupancy, room.capacity);
                                    return (
                                        <TableRow key={room.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{room.room_number}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary">{room.name || '—'}</Typography></TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {room.building || '—'}{room.floor != null ? `, Floor ${room.floor}` : ''}
                                                </Typography>
                                            </TableCell>
                                            <TableCell><Chip label={getTypeLabel(room.room_type)} size="small" variant="outlined" /></TableCell>
                                            <TableCell><Typography variant="body2">{room.capacity}</Typography></TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
                                                    <Box sx={{ flex: 1, bgcolor: '#e0e0e0', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                                        <Box sx={{ width: `${Math.min(occPct, 100)}%`, height: '100%', bgcolor: occColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                                    </Box>
                                                    <Typography variant="caption" fontWeight={600} sx={{ color: occColor, minWidth: 36 }}>
                                                        {occPct}%
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{getStatusChip(room.status)}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    {room.has_projector && <Tooltip title="Projector"><Tv sx={{ fontSize: 18, color: '#6f42c1' }} /></Tooltip>}
                                                    {room.has_ac && <Tooltip title="Air Conditioning"><AcUnit sx={{ fontSize: 18, color: '#17a2b8' }} /></Tooltip>}
                                                    {room.has_smartboard && <Tooltip title="Smart Board"><DeveloperBoard sx={{ fontSize: 18, color: '#28A745' }} /></Tooltip>}
                                                    {room.has_whiteboard && <Tooltip title="Whiteboard"><DeveloperBoard sx={{ fontSize: 18, color: '#9E9E9E' }} /></Tooltip>}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEdit(room)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => { setSelectedId(room.id); setDeleteDialogOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Add/Edit Dialog */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', color: '#fff' }}>
                    {editingId ? 'Edit Room' : 'Add New Room'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Room Number" fullWidth required value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Room Name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Building" fullWidth value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Floor" type="number" fullWidth value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value === '' ? '' : Number(e.target.value) })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Room Type" select fullWidth value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })}>
                                {ROOM_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Capacity" type="number" fullWidth value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField label="Status" select fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                {ROOM_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Amenities</Typography>
                            <FormGroup row>
                                <FormControlLabel control={<Switch checked={form.has_projector} onChange={(e) => setForm({ ...form, has_projector: e.target.checked })} />} label="Projector" />
                                <FormControlLabel control={<Switch checked={form.has_ac} onChange={(e) => setForm({ ...form, has_ac: e.target.checked })} />} label="AC" />
                                <FormControlLabel control={<Switch checked={form.has_whiteboard} onChange={(e) => setForm({ ...form, has_whiteboard: e.target.checked })} />} label="Whiteboard" />
                                <FormControlLabel control={<Switch checked={form.has_smartboard} onChange={(e) => setForm({ ...form, has_smartboard: e.target.checked })} />} label="Smart Board" />
                            </FormGroup>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField label="Description" fullWidth multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                    <Warning sx={{ color: '#DC3545' }} /> Delete Room
                </DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete this room? Classes using this room will be unassigned.</Typography>
                </DialogContent>
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
