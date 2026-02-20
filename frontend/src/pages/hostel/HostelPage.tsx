import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchHostels, createHostel, updateHostel, deleteHostel,
    fetchRooms, createRoom, updateRoom, deleteRoom,
    allocateRoom, vacateRoom, fetchAllocations,
    fetchResidents, fetchAvailability, fetchHostelStats, clearHostelError,
} from '../../store/slices/hostelSlice';
import type { HostelItem, HostelRoomItem, AllocationItem } from '../../store/slices/hostelSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import {
    Box, Typography, Button, Paper, TextField, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, MenuItem, Select,
    FormControl, InputLabel, Tabs, Tab, Table, TableBody, TableCell, TableHead,
    TableRow, TableContainer, Switch, FormControlLabel,
} from '@mui/material';
import {
    Add, Edit, Delete, Apartment, KingBed, People,
    MeetingRoom, CheckCircle, Warning, Person,
} from '@mui/icons-material';

const STATUS_COLORS: Record<string, string> = {
    available: '#51CF66', occupied: '#DC3545', partially_occupied: '#FCC419',
    maintenance: '#FF6B35', reserved: '#3D5EE1',
    active: '#51CF66', vacated: '#999', transferred: '#3D5EE1', expired: '#DC3545',
    boys: '#3D5EE1', girls: '#E91E8C', mixed: '#FCC419', staff: '#51CF66',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
    single: '🛏️ Single', double: '🛏️🛏️ Double', triple: '🛏️🛏️🛏️ Triple', dormitory: '🏠 Dormitory',
};

export default function HostelPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { hostels, rooms, allocations, residents, availableRooms, stats,
        loading, error } = useSelector((s: RootState) => s.hostel);
    const { students } = useSelector((s: RootState) => s.students);

    const [tabIndex, setTabIndex] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });
    const [filterHostelId, setFilterHostelId] = useState<number | ''>('');

    // Hostel dialog
    const [hostelDialog, setHostelDialog] = useState(false);
    const [editHostelItem, setEditHostelItem] = useState<HostelItem | null>(null);
    const [hostelForm, setHostelForm] = useState({
        name: '', code: '', hostel_type: 'boys', address: '',
        warden_name: '', warden_phone: '', warden_email: '',
        monthly_fee: 0, description: '',
    });

    // Room dialog
    const [roomDialog, setRoomDialog] = useState(false);
    const [editRoomItem, setEditRoomItem] = useState<HostelRoomItem | null>(null);
    const [roomForm, setRoomForm] = useState({
        hostel_id: '' as number | '', room_number: '', floor: 0,
        room_type: 'double', capacity: 2,
        has_attached_bathroom: false, has_ac: false, has_wifi: false,
        monthly_rent: 0, description: '',
    });

    // Allocation dialog
    const [allocDialog, setAllocDialog] = useState(false);
    const [allocForm, setAllocForm] = useState({
        hostel_id: '' as number | '', room_id: '' as number | '',
        student_id: '' as number | '', bed_number: '',
        expected_vacating_date: '', monthly_fee: 0, remarks: '',
    });

    // Vacate dialog
    const [vacateDialog, setVacateDialog] = useState(false);
    const [vacateAlloc, setVacateAlloc] = useState<AllocationItem | null>(null);
    const [vacateForm, setVacateForm] = useState({ vacating_date: new Date().toISOString().split('T')[0], remarks: '' });

    useEffect(() => {
        dispatch(fetchHostels({}));
        dispatch(fetchRooms({}));
        dispatch(fetchStudents({}));
    }, [dispatch]);

    useEffect(() => {
        if (tabIndex === 0) dispatch(fetchHostelStats());
        if (tabIndex === 1) { dispatch(fetchRooms(filterHostelId ? { hostel_id: filterHostelId } : {})); dispatch(fetchAllocations({})); }
        if (tabIndex === 2) dispatch(fetchAvailability(filterHostelId ? { hostel_id: filterHostelId } : {}));
        if (tabIndex === 3) dispatch(fetchResidents(filterHostelId ? { hostel_id: filterHostelId } : {}));
    }, [tabIndex, filterHostelId, dispatch]);

    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearHostelError()); } }, [error, dispatch]);

    // ─── Hostel handlers ────────────────────────────────────────────────
    const handleSaveHostel = async () => {
        if (editHostelItem) await dispatch(updateHostel({ id: editHostelItem.id, data: hostelForm }));
        else await dispatch(createHostel(hostelForm));
        setSnack({ open: true, msg: editHostelItem ? 'Hostel updated!' : 'Hostel added!', sev: 'success' });
        setHostelDialog(false); setEditHostelItem(null); dispatch(fetchHostels({})); dispatch(fetchHostelStats());
    };
    const openEditHostel = (h: HostelItem) => {
        setEditHostelItem(h);
        setHostelForm({ name: h.name, code: h.code || '', hostel_type: h.hostel_type, address: h.address || '', warden_name: h.warden_name || '', warden_phone: h.warden_phone || '', warden_email: h.warden_email || '', monthly_fee: h.monthly_fee, description: h.description || '' });
        setHostelDialog(true);
    };
    const openNewHostel = () => {
        setEditHostelItem(null);
        setHostelForm({ name: '', code: '', hostel_type: 'boys', address: '', warden_name: '', warden_phone: '', warden_email: '', monthly_fee: 0, description: '' });
        setHostelDialog(true);
    };

    // ─── Room handlers ──────────────────────────────────────────────────
    const handleSaveRoom = async () => {
        if (editRoomItem) await dispatch(updateRoom({ id: editRoomItem.id, data: roomForm }));
        else await dispatch(createRoom(roomForm));
        setSnack({ open: true, msg: editRoomItem ? 'Room updated!' : 'Room added!', sev: 'success' });
        setRoomDialog(false); setEditRoomItem(null); dispatch(fetchRooms({})); dispatch(fetchHostels({}));
    };
    const openEditRoom = (r: HostelRoomItem) => {
        setEditRoomItem(r);
        setRoomForm({ hostel_id: r.hostel_id, room_number: r.room_number, floor: r.floor || 0, room_type: r.room_type, capacity: r.capacity, has_attached_bathroom: r.has_attached_bathroom, has_ac: r.has_ac, has_wifi: r.has_wifi, monthly_rent: r.monthly_rent || 0, description: r.description || '' });
        setRoomDialog(true);
    };
    const openNewRoom = () => {
        setEditRoomItem(null);
        setRoomForm({ hostel_id: hostels.length > 0 ? hostels[0].id : '', room_number: '', floor: 0, room_type: 'double', capacity: 2, has_attached_bathroom: false, has_ac: false, has_wifi: false, monthly_rent: 0, description: '' });
        setRoomDialog(true);
    };

    // ─── Allocation handlers ────────────────────────────────────────────
    const handleAllocate = async () => {
        if (!allocForm.hostel_id || !allocForm.room_id || !allocForm.student_id) return;
        const result = await dispatch(allocateRoom(allocForm));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Room allocated!', sev: 'success' });
            setAllocDialog(false); dispatch(fetchRooms({})); dispatch(fetchHostels({})); dispatch(fetchHostelStats());
        }
    };
    const openAllocate = () => {
        setAllocForm({ hostel_id: hostels.length > 0 ? hostels[0].id : '', room_id: '', student_id: '', bed_number: '', expected_vacating_date: '', monthly_fee: 0, remarks: '' });
        setAllocDialog(true);
    };

    // ─── Vacate handlers ────────────────────────────────────────────────
    const handleVacate = async () => {
        if (!vacateAlloc) return;
        const result = await dispatch(vacateRoom({ id: vacateAlloc.id, data: vacateForm }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Room vacated!', sev: 'success' });
            setVacateDialog(false); setVacateAlloc(null);
            dispatch(fetchRooms({})); dispatch(fetchHostels({})); dispatch(fetchResidents({})); dispatch(fetchHostelStats());
        }
    };
    const openVacate = (a: AllocationItem) => {
        setVacateAlloc(a);
        setVacateForm({ vacating_date: new Date().toISOString().split('T')[0], remarks: '' });
        setVacateDialog(true);
    };

    const filteredRoomsForAlloc = rooms.filter(r => r.hostel_id === allocForm.hostel_id && r.available > 0);

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Hostel Management</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>🏠 Hostel Management</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage hostels, rooms, allocations, and residents</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Filter Hostel</InputLabel>
                        <Select value={filterHostelId} label="Filter Hostel" onChange={e => setFilterHostelId(e.target.value as number | '')}>
                            <MenuItem value="">All Hostels</MenuItem>
                            {hostels.map(h => <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Hostels', value: stats?.total_hostels ?? hostels.length, icon: <Apartment />, color: '#3D5EE1' },
                    { label: 'Total Beds', value: stats?.total_beds ?? 0, icon: <KingBed />, color: '#51CF66' },
                    { label: 'Occupied', value: stats?.occupied_beds ?? 0, icon: <People />, color: '#FCC419' },
                    { label: 'Available', value: stats?.available_beds ?? 0, icon: <MeetingRoom />, color: '#DC3545' },
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
                    <Tab label="Dashboard" icon={<Apartment sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Room Allocation" icon={<KingBed sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Availability" icon={<MeetingRoom sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Residents" icon={<People sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Dashboard ═══════════════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>Hostels</Typography>
                        <Button variant="contained" startIcon={<Add />} onClick={openNewHostel}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Hostel</Button>
                    </Box>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {hostels.length === 0 ? (
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 6, textAlign: 'center' }}>
                                    <Apartment sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">No hostels configured</Typography>
                                </Paper>
                            </Grid>
                        ) : hostels.map(h => (
                            <Grid key={h.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card sx={{ height: '100%', border: '1px solid rgba(0,0,0,0.06)', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }, transition: 'all 0.2s' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Chip label={h.hostel_type} size="small" sx={{ bgcolor: `${STATUS_COLORS[h.hostel_type] || '#999'}18`, color: STATUS_COLORS[h.hostel_type] || '#999', textTransform: 'capitalize', fontWeight: 700 }} />
                                            <Box>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditHostel(h)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { dispatch(deleteHostel(h.id)); dispatch(fetchHostelStats()); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </Box>
                                        </Box>
                                        <Typography variant="h6" fontWeight={700} gutterBottom>{h.name}</Typography>
                                        {h.code && <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#3D5EE1' }}>{h.code}</Typography>}
                                        <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Rooms</Typography>
                                                <Typography fontWeight={700}>{h.total_rooms}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Beds</Typography>
                                                <Typography fontWeight={700}>{h.total_beds}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Occupied</Typography>
                                                <Typography fontWeight={700} sx={{ color: h.occupied_beds > 0 ? '#FCC419' : '#51CF66' }}>{h.occupied_beds}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Available</Typography>
                                                <Typography fontWeight={700} sx={{ color: '#51CF66' }}>{h.available_beds}</Typography>
                                            </Box>
                                        </Box>
                                        {h.warden_name && (
                                            <Typography variant="body2" color="text.secondary" mt={1.5}>
                                                Warden: <strong>{h.warden_name}</strong> {h.warden_phone && `| ${h.warden_phone}`}
                                            </Typography>
                                        )}
                                        <Typography variant="body2" mt={1} sx={{ color: '#3D5EE1', fontWeight: 700 }}>₹{h.monthly_fee.toLocaleString()}/mo</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Occupancy breakdown */}
                    {stats && stats.hostel_breakdown.length > 0 && (
                        <>
                            <Typography variant="h6" fontWeight={700} mt={2} mb={2}>📊 Occupancy Overview</Typography>
                            <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                <TableContainer>
                                    <Table>
                                        <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Hostel</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Rooms</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Total Beds</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Occupied</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Available</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Occupancy %</TableCell>
                                        </TableRow></TableHead>
                                        <TableBody>
                                            {stats.hostel_breakdown.map((b, i) => (
                                                <TableRow key={i} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                                    <TableCell><Typography fontWeight={600}>{b.name}</Typography></TableCell>
                                                    <TableCell><Chip label={b.type} size="small" sx={{ bgcolor: `${STATUS_COLORS[b.type] || '#999'}18`, color: STATUS_COLORS[b.type] || '#999', textTransform: 'capitalize' }} /></TableCell>
                                                    <TableCell align="center">{b.total_rooms}</TableCell>
                                                    <TableCell align="center">{b.total_beds}</TableCell>
                                                    <TableCell align="center"><Typography fontWeight={700} sx={{ color: '#FCC419' }}>{b.occupied_beds}</Typography></TableCell>
                                                    <TableCell align="center"><Typography fontWeight={700} sx={{ color: '#51CF66' }}>{b.available_beds}</Typography></TableCell>
                                                    <TableCell align="right">
                                                        <Chip label={`${b.occupancy_rate}%`} size="small"
                                                            sx={{
                                                                bgcolor: b.occupancy_rate > 90 ? '#DC354518' : b.occupancy_rate > 70 ? '#FCC41918' : '#51CF6618',
                                                                color: b.occupancy_rate > 90 ? '#DC3545' : b.occupancy_rate > 70 ? '#FCC419' : '#51CF66', fontWeight: 700
                                                            }} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                            {stats.total_monthly_revenue > 0 && (
                                <Typography variant="body1" mt={2} fontWeight={700} sx={{ color: '#3D5EE1' }}>
                                    💰 Total Monthly Revenue: ₹{stats.total_monthly_revenue.toLocaleString()} | Overall Occupancy: {stats.occupancy_rate}%
                                </Typography>
                            )}
                        </>
                    )}

                    {/* Room list with Add Room button */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>🚪 Rooms</Typography>
                        <Button variant="outlined" startIcon={<Add />} onClick={openNewRoom}>Add Room</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Room#</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Hostel</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Floor</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Capacity</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Amenities</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {rooms.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 5 }}>
                                            <MeetingRoom sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                            <Typography color="text.secondary">No rooms configured</Typography>
                                        </TableCell></TableRow>
                                    ) : rooms.map(r => (
                                        <TableRow key={r.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography fontWeight={600}>{r.room_number}</Typography></TableCell>
                                            <TableCell>{r.hostel_name}</TableCell>
                                            <TableCell>{r.floor ?? '—'}</TableCell>
                                            <TableCell><Chip label={ROOM_TYPE_LABELS[r.room_type] || r.room_type} size="small" variant="outlined" /></TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight={700} sx={{ color: r.available > 0 ? '#51CF66' : '#DC3545' }}>
                                                    {r.occupied}/{r.capacity}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    {r.has_attached_bathroom && <Chip label="🚿" size="small" sx={{ minWidth: 28 }} />}
                                                    {r.has_ac && <Chip label="❄️" size="small" sx={{ minWidth: 28 }} />}
                                                    {r.has_wifi && <Chip label="📶" size="small" sx={{ minWidth: 28 }} />}
                                                </Box>
                                            </TableCell>
                                            <TableCell><Chip label={r.status.replace('_', ' ')} size="small" sx={{ bgcolor: `${STATUS_COLORS[r.status] || '#999'}18`, color: STATUS_COLORS[r.status] || '#999', textTransform: 'capitalize', fontWeight: 700 }} /></TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditRoom(r)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { dispatch(deleteRoom(r.id)); dispatch(fetchHostels({})); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 1: Room Allocation ═════════════════════════════════ */}
            {tabIndex === 1 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<KingBed />} onClick={openAllocate}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Allocate Room</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Hostel</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Bed</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Allocated</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Fee/mo</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {allocations.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                            <KingBed sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No allocations found</Typography>
                                        </TableCell></TableRow>
                                    ) : allocations.map(a => (
                                        <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography fontWeight={600}>{a.student_name || `Student #${a.student_id}`}</Typography></TableCell>
                                            <TableCell>{a.hostel_name}</TableCell>
                                            <TableCell><Chip label={a.room_number} size="small" sx={{ bgcolor: '#3D5EE118', color: '#3D5EE1', fontWeight: 700 }} /></TableCell>
                                            <TableCell>{a.bed_number || '—'}</TableCell>
                                            <TableCell>{a.allocation_date}</TableCell>
                                            <TableCell><Chip label={a.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[a.status] || '#999'}18`, color: STATUS_COLORS[a.status] || '#999', textTransform: 'capitalize', fontWeight: 700 }} /></TableCell>
                                            <TableCell align="right"><Typography fontWeight={700} sx={{ color: '#3D5EE1' }}>₹{a.monthly_fee.toLocaleString()}</Typography></TableCell>
                                            <TableCell>
                                                {a.status === 'active' && (
                                                    <Tooltip title="Vacate"><IconButton size="small" color="warning" onClick={() => openVacate(a)}><Warning fontSize="small" /></IconButton></Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 2: Availability ════════════════════════════════════ */}
            {tabIndex === 2 && (
                <Grid container spacing={2}>
                    {availableRooms.length === 0 && !loading ? (
                        <Grid size={{ xs: 12 }}>
                            <Paper sx={{ p: 6, textAlign: 'center' }}>
                                <CheckCircle sx={{ fontSize: 64, color: '#DC3545', mb: 1 }} />
                                <Typography variant="h6" color="text.secondary">No rooms available — all occupied!</Typography>
                            </Paper>
                        </Grid>
                    ) : availableRooms.map(r => (
                        <Grid key={r.id} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card sx={{ border: '1px solid rgba(0,0,0,0.06)', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }, transition: 'all 0.2s' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Chip label={r.hostel_name} size="small" variant="outlined" />
                                        <Chip label={ROOM_TYPE_LABELS[r.room_type] || r.room_type} size="small" sx={{ bgcolor: '#3D5EE118', color: '#3D5EE1' }} />
                                    </Box>
                                    <Typography variant="h6" fontWeight={700}>Room {r.room_number}</Typography>
                                    <Typography variant="body2" color="text.secondary">Floor {r.floor ?? '—'}</Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                        <Typography variant="body2" sx={{ color: '#51CF66', fontWeight: 700 }}>
                                            {r.available} bed{r.available !== 1 ? 's' : ''} available
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">{r.occupied}/{r.capacity} occupied</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                        {r.has_attached_bathroom && <Chip label="🚿 Bathroom" size="small" variant="outlined" />}
                                        {r.has_ac && <Chip label="❄️ AC" size="small" variant="outlined" />}
                                        {r.has_wifi && <Chip label="📶 WiFi" size="small" variant="outlined" />}
                                    </Box>
                                    {r.monthly_rent !== null && r.monthly_rent > 0 && (
                                        <Typography variant="body2" mt={1.5} sx={{ color: '#3D5EE1', fontWeight: 700 }}>₹{r.monthly_rent.toLocaleString()}/mo</Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* ═══ Tab 3: Residents ═══════════════════════════════════════ */}
            {tabIndex === 3 && (
                <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    {loading && <LinearProgress />}
                    <TableContainer>
                        <Table>
                            <TableHead><TableRow sx={{ bgcolor: '#E8F5E9' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Hostel</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Bed</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Since</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Fee/mo</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Fee Paid Till</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {residents.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                        <Person sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">No residents currently</Typography>
                                    </TableCell></TableRow>
                                ) : residents.map(a => (
                                    <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(81,207,102,0.04)' } }}>
                                        <TableCell><Typography fontWeight={600}>{a.student_name || `Student #${a.student_id}`}</Typography></TableCell>
                                        <TableCell>{a.hostel_name}</TableCell>
                                        <TableCell><Chip label={a.room_number} size="small" sx={{ bgcolor: '#3D5EE118', color: '#3D5EE1', fontWeight: 700 }} /></TableCell>
                                        <TableCell>{a.bed_number || '—'}</TableCell>
                                        <TableCell>{a.allocation_date}</TableCell>
                                        <TableCell align="right"><Typography fontWeight={700} sx={{ color: '#3D5EE1' }}>₹{a.monthly_fee.toLocaleString()}</Typography></TableCell>
                                        <TableCell>{a.fee_paid_till || '—'}</TableCell>
                                        <TableCell>
                                            <Tooltip title="Vacate"><IconButton size="small" color="warning" onClick={() => openVacate(a)}><Warning fontSize="small" /></IconButton></Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ═══ Hostel Dialog ═══════════════════════════════════════════ */}
            <Dialog open={hostelDialog} onClose={() => setHostelDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editHostelItem ? 'Edit Hostel' : 'Add New Hostel'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 8 }}><TextField fullWidth label="Name *" value={hostelForm.name} onChange={e => setHostelForm({ ...hostelForm, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Code" value={hostelForm.code} onChange={e => setHostelForm({ ...hostelForm, code: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Type</InputLabel>
                                <Select value={hostelForm.hostel_type} label="Type" onChange={e => setHostelForm({ ...hostelForm, hostel_type: e.target.value })}>
                                    <MenuItem value="boys">🧑 Boys</MenuItem>
                                    <MenuItem value="girls">👩 Girls</MenuItem>
                                    <MenuItem value="mixed">🧑‍🤝‍🧑 Mixed</MenuItem>
                                    <MenuItem value="staff">👤 Staff</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Monthly Fee (₹)" type="number" value={hostelForm.monthly_fee} onChange={e => setHostelForm({ ...hostelForm, monthly_fee: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Address" value={hostelForm.address} onChange={e => setHostelForm({ ...hostelForm, address: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Warden Name" value={hostelForm.warden_name} onChange={e => setHostelForm({ ...hostelForm, warden_name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Warden Phone" value={hostelForm.warden_phone} onChange={e => setHostelForm({ ...hostelForm, warden_phone: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Warden Email" value={hostelForm.warden_email} onChange={e => setHostelForm({ ...hostelForm, warden_email: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Description" value={hostelForm.description} onChange={e => setHostelForm({ ...hostelForm, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHostelDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveHostel} disabled={!hostelForm.name}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editHostelItem ? 'Update' : 'Add Hostel'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Room Dialog ═════════════════════════════════════════════ */}
            <Dialog open={roomDialog} onClose={() => setRoomDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editRoomItem ? 'Edit Room' : 'Add Room'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Hostel</InputLabel>
                                <Select value={roomForm.hostel_id} label="Hostel" onChange={e => setRoomForm({ ...roomForm, hostel_id: e.target.value as number })}>
                                    {hostels.map(h => <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Room Number *" value={roomForm.room_number} onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Floor" type="number" value={roomForm.floor} onChange={e => setRoomForm({ ...roomForm, floor: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 4 }}>
                            <FormControl fullWidth><InputLabel>Type</InputLabel>
                                <Select value={roomForm.room_type} label="Type" onChange={e => setRoomForm({ ...roomForm, room_type: e.target.value })}>
                                    <MenuItem value="single">Single</MenuItem>
                                    <MenuItem value="double">Double</MenuItem>
                                    <MenuItem value="triple">Triple</MenuItem>
                                    <MenuItem value="dormitory">Dormitory</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Capacity" type="number" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: Number(e.target.value) || 1 })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Rent/mo (₹)" type="number" value={roomForm.monthly_rent} onChange={e => setRoomForm({ ...roomForm, monthly_rent: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 8 }}>
                            <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                                <FormControlLabel control={<Switch checked={roomForm.has_attached_bathroom} onChange={e => setRoomForm({ ...roomForm, has_attached_bathroom: e.target.checked })} />} label="🚿 Bathroom" />
                                <FormControlLabel control={<Switch checked={roomForm.has_ac} onChange={e => setRoomForm({ ...roomForm, has_ac: e.target.checked })} />} label="❄️ AC" />
                                <FormControlLabel control={<Switch checked={roomForm.has_wifi} onChange={e => setRoomForm({ ...roomForm, has_wifi: e.target.checked })} />} label="📶 WiFi" />
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRoomDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveRoom} disabled={!roomForm.hostel_id || !roomForm.room_number}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editRoomItem ? 'Update' : 'Add Room'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Allocation Dialog ═══════════════════════════════════════ */}
            <Dialog open={allocDialog} onClose={() => setAllocDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Allocate Room</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Hostel</InputLabel>
                                <Select value={allocForm.hostel_id} label="Hostel" onChange={e => setAllocForm({ ...allocForm, hostel_id: e.target.value as number, room_id: '' })}>
                                    {hostels.map(h => <MenuItem key={h.id} value={h.id}>{h.name} ({h.available_beds} beds avail)</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 8 }}>
                            <FormControl fullWidth><InputLabel>Room</InputLabel>
                                <Select value={allocForm.room_id} label="Room" onChange={e => setAllocForm({ ...allocForm, room_id: e.target.value as number })}>
                                    {filteredRoomsForAlloc.map(r => (
                                        <MenuItem key={r.id} value={r.id}>Room {r.room_number} — {r.available} bed{r.available !== 1 ? 's' : ''} avail</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Bed #" value={allocForm.bed_number} onChange={e => setAllocForm({ ...allocForm, bed_number: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Student</InputLabel>
                                <Select value={allocForm.student_id} label="Student" onChange={e => setAllocForm({ ...allocForm, student_id: e.target.value as number })}>
                                    {students.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Monthly Fee (₹)" type="number" value={allocForm.monthly_fee} onChange={e => setAllocForm({ ...allocForm, monthly_fee: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Expected Vacating" type="date" value={allocForm.expected_vacating_date} InputLabelProps={{ shrink: true }} onChange={e => setAllocForm({ ...allocForm, expected_vacating_date: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Remarks" value={allocForm.remarks} onChange={e => setAllocForm({ ...allocForm, remarks: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAllocDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAllocate} disabled={!allocForm.hostel_id || !allocForm.room_id || !allocForm.student_id}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Allocate</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Vacate Dialog ═══════════════════════════════════════════ */}
            <Dialog open={vacateDialog} onClose={() => setVacateDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Vacate Room</DialogTitle>
                <DialogContent>
                    {vacateAlloc && (
                        <Box sx={{ mb: 2, p: 2, bgcolor: '#FFF3CD', borderRadius: 1, mt: 1 }}>
                            <Typography variant="body2"><strong>Student:</strong> {vacateAlloc.student_name}</Typography>
                            <Typography variant="body2"><strong>Room:</strong> {vacateAlloc.room_number} @ {vacateAlloc.hostel_name}</Typography>
                            <Typography variant="body2"><strong>Since:</strong> {vacateAlloc.allocation_date}</Typography>
                        </Box>
                    )}
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Vacating Date" type="date" value={vacateForm.vacating_date} InputLabelProps={{ shrink: true }} onChange={e => setVacateForm({ ...vacateForm, vacating_date: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Remarks" value={vacateForm.remarks} onChange={e => setVacateForm({ ...vacateForm, remarks: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVacateDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="warning" onClick={handleVacate}>Confirm Vacate</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
