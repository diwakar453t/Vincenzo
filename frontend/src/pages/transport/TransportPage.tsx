import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchRoutes, createRoute, updateRoute, deleteRoute,
    fetchVehicles, createVehicle, updateVehicle, deleteVehicle,
    assignStudent, cancelAssignment, fetchAssignments, fetchTransportStats, clearTransportError,
} from '../../store/slices/transportSlice';
import type { RouteItem, VehicleItem, AssignmentItem } from '../../store/slices/transportSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import {
    Box, Typography, Button, Paper, TextField, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, MenuItem, Select,
    FormControl, InputLabel, Tabs, Tab, Table, TableBody, TableCell, TableHead,
    TableRow, TableContainer, Switch, FormControlLabel,
} from '@mui/material';
import {
    Add, Edit, Delete, DirectionsBus, Route, People,
    AirportShuttle, Cancel, Person,
} from '@mui/icons-material';

const STATUS_COLORS: Record<string, string> = {
    active: '#51CF66', maintenance: '#FCC419', retired: '#999',
    reserved: '#3D5EE1', inactive: '#DC3545', suspended: '#FF6B35',
    cancelled: '#DC3545', transferred: '#3D5EE1', completed: '#999',
};

const VEHICLE_TYPE_ICONS: Record<string, string> = {
    bus: '🚌', mini_bus: '🚐', van: '🚎', car: '🚗', auto: '🛺',
};

export default function TransportPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { routes, vehicles, assignments, stats, loading, error } = useSelector((s: RootState) => s.transport);
    const { students } = useSelector((s: RootState) => s.students);

    const [tabIndex, setTabIndex] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

    // Route dialog
    const [routeDialog, setRouteDialog] = useState(false);
    const [editRouteItem, setEditRouteItem] = useState<RouteItem | null>(null);
    const [routeForm, setRouteForm] = useState({
        route_name: '', route_code: '', start_point: '', end_point: '',
        stops: '', distance_km: 0, estimated_time_min: 0,
        morning_departure: '', evening_departure: '',
        monthly_fee: 0, max_capacity: 40, vehicle_id: '' as number | '', description: '',
    });

    // Vehicle dialog
    const [vehicleDialog, setVehicleDialog] = useState(false);
    const [editVehicleItem, setEditVehicleItem] = useState<VehicleItem | null>(null);
    const [vehicleForm, setVehicleForm] = useState({
        vehicle_number: '', vehicle_type: 'bus', make: '', model: '',
        year: new Date().getFullYear(), capacity: 40,
        driver_name: '', driver_phone: '', driver_license: '',
        conductor_name: '', conductor_phone: '',
        insurance_expiry: '', fitness_expiry: '',
        fuel_type: 'diesel', gps_enabled: false, description: '',
    });

    // Assignment dialog
    const [assignDialog, setAssignDialog] = useState(false);
    const [assignForm, setAssignForm] = useState({
        student_id: '' as number | '', route_id: '' as number | '',
        pickup_stop: '', drop_stop: '', monthly_fee: 0, remarks: '',
    });

    // Cancel dialog
    const [cancelDialog, setCancelDialog] = useState(false);
    const [cancelItem, setCancelItem] = useState<AssignmentItem | null>(null);
    const [cancelForm, setCancelForm] = useState({ end_date: new Date().toISOString().split('T')[0], remarks: '' });

    useEffect(() => {
        dispatch(fetchRoutes({})); dispatch(fetchVehicles({})); dispatch(fetchStudents({}));
    }, [dispatch]);

    useEffect(() => {
        if (tabIndex === 0) { dispatch(fetchTransportStats()); dispatch(fetchRoutes({})); }
        if (tabIndex === 1) dispatch(fetchRoutes({}));
        if (tabIndex === 2) dispatch(fetchVehicles({}));
        if (tabIndex === 3) dispatch(fetchAssignments({}));
    }, [tabIndex, dispatch]);

    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearTransportError()); } }, [error, dispatch]);

    // ─── Route handlers ─────────────────────────────────────────────────
    const handleSaveRoute = async () => {
        const payload = { ...routeForm, vehicle_id: routeForm.vehicle_id || null };
        if (editRouteItem) await dispatch(updateRoute({ id: editRouteItem.id, data: payload }));
        else await dispatch(createRoute(payload));
        setSnack({ open: true, msg: editRouteItem ? 'Route updated!' : 'Route added!', sev: 'success' });
        setRouteDialog(false); setEditRouteItem(null); dispatch(fetchRoutes({})); dispatch(fetchTransportStats());
    };
    const openEditRoute = (r: RouteItem) => {
        setEditRouteItem(r);
        setRouteForm({ route_name: r.route_name, route_code: r.route_code || '', start_point: r.start_point, end_point: r.end_point, stops: r.stops || '', distance_km: r.distance_km || 0, estimated_time_min: r.estimated_time_min || 0, morning_departure: r.morning_departure || '', evening_departure: r.evening_departure || '', monthly_fee: r.monthly_fee, max_capacity: r.max_capacity, vehicle_id: r.vehicle_id || '', description: r.description || '' });
        setRouteDialog(true);
    };
    const openNewRoute = () => {
        setEditRouteItem(null);
        setRouteForm({ route_name: '', route_code: '', start_point: '', end_point: '', stops: '', distance_km: 0, estimated_time_min: 0, morning_departure: '', evening_departure: '', monthly_fee: 0, max_capacity: 40, vehicle_id: '', description: '' });
        setRouteDialog(true);
    };

    // ─── Vehicle handlers ───────────────────────────────────────────────
    const handleSaveVehicle = async () => {
        if (editVehicleItem) await dispatch(updateVehicle({ id: editVehicleItem.id, data: vehicleForm }));
        else await dispatch(createVehicle(vehicleForm));
        setSnack({ open: true, msg: editVehicleItem ? 'Vehicle updated!' : 'Vehicle added!', sev: 'success' });
        setVehicleDialog(false); setEditVehicleItem(null); dispatch(fetchVehicles({}));
    };
    const openEditVehicle = (v: VehicleItem) => {
        setEditVehicleItem(v);
        setVehicleForm({ vehicle_number: v.vehicle_number, vehicle_type: v.vehicle_type, make: v.make || '', model: v.model || '', year: v.year || new Date().getFullYear(), capacity: v.capacity, driver_name: v.driver_name || '', driver_phone: v.driver_phone || '', driver_license: v.driver_license || '', conductor_name: v.conductor_name || '', conductor_phone: v.conductor_phone || '', insurance_expiry: v.insurance_expiry || '', fitness_expiry: v.fitness_expiry || '', fuel_type: v.fuel_type || 'diesel', gps_enabled: v.gps_enabled, description: v.description || '' });
        setVehicleDialog(true);
    };
    const openNewVehicle = () => {
        setEditVehicleItem(null);
        setVehicleForm({ vehicle_number: '', vehicle_type: 'bus', make: '', model: '', year: new Date().getFullYear(), capacity: 40, driver_name: '', driver_phone: '', driver_license: '', conductor_name: '', conductor_phone: '', insurance_expiry: '', fitness_expiry: '', fuel_type: 'diesel', gps_enabled: false, description: '' });
        setVehicleDialog(true);
    };

    // ─── Assignment handlers ────────────────────────────────────────────
    const handleAssign = async () => {
        if (!assignForm.student_id || !assignForm.route_id) return;
        const result = await dispatch(assignStudent(assignForm));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Student assigned!', sev: 'success' });
            setAssignDialog(false); dispatch(fetchRoutes({})); dispatch(fetchAssignments({})); dispatch(fetchTransportStats());
        }
    };
    const openAssign = () => {
        setAssignForm({ student_id: '', route_id: routes.length > 0 ? routes[0].id : '', pickup_stop: '', drop_stop: '', monthly_fee: 0, remarks: '' });
        setAssignDialog(true);
    };

    // ─── Cancel handlers ────────────────────────────────────────────────
    const handleCancel = async () => {
        if (!cancelItem) return;
        const result = await dispatch(cancelAssignment({ id: cancelItem.id, data: cancelForm }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Assignment cancelled!', sev: 'success' });
            setCancelDialog(false); setCancelItem(null);
            dispatch(fetchRoutes({})); dispatch(fetchAssignments({})); dispatch(fetchTransportStats());
        }
    };
    const openCancel = (a: AssignmentItem) => {
        setCancelItem(a);
        setCancelForm({ end_date: new Date().toISOString().split('T')[0], remarks: '' });
        setCancelDialog(true);
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Transport Management</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>🚌 Transport Management</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage routes, vehicles, and student assignments</Typography>
                </Box>
            </Box>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Routes', value: stats?.total_routes ?? routes.length, icon: <Route />, color: '#3D5EE1' },
                    { label: 'Vehicles', value: stats?.total_vehicles ?? vehicles.length, icon: <DirectionsBus />, color: '#51CF66' },
                    { label: 'Students', value: stats?.total_students ?? 0, icon: <People />, color: '#FCC419' },
                    { label: 'Avg Occupancy', value: `${stats?.avg_occupancy_rate ?? 0}%`, icon: <AirportShuttle />, color: '#DC3545' },
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
                    <Tab label="Dashboard" icon={<Route sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Routes" icon={<Route sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Vehicles" icon={<DirectionsBus sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Assignments" icon={<People sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Dashboard ═══════════════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    {stats && stats.route_breakdown.length > 0 && (
                        <>
                            <Typography variant="h6" fontWeight={700} mb={2}>📊 Route Occupancy</Typography>
                            <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', mb: 3 }}>
                                <TableContainer>
                                    <Table>
                                        <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Route</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>From → To</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Students</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Capacity</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Available</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Fee/mo</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Occupancy</TableCell>
                                        </TableRow></TableHead>
                                        <TableBody>
                                            {stats.route_breakdown.map((b, i) => (
                                                <TableRow key={i} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                                    <TableCell>
                                                        <Typography fontWeight={600}>{b.route_name}</Typography>
                                                        {b.route_code && <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#3D5EE1' }}>{b.route_code}</Typography>}
                                                    </TableCell>
                                                    <TableCell>{b.start_point} → {b.end_point}</TableCell>
                                                    <TableCell>{b.vehicle_number || <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                                                    <TableCell align="center"><Typography fontWeight={700}>{b.current_students}</Typography></TableCell>
                                                    <TableCell align="center">{b.max_capacity}</TableCell>
                                                    <TableCell align="center"><Typography fontWeight={700} sx={{ color: b.available_seats > 0 ? '#51CF66' : '#DC3545' }}>{b.available_seats}</Typography></TableCell>
                                                    <TableCell align="right"><Typography fontWeight={700} sx={{ color: '#3D5EE1' }}>₹{b.monthly_fee.toLocaleString()}</Typography></TableCell>
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
                                <Typography variant="body1" fontWeight={700} sx={{ color: '#3D5EE1' }}>
                                    💰 Total Monthly Revenue: ₹{stats.total_monthly_revenue.toLocaleString()} | {stats.active_assignments} active assignments
                                </Typography>
                            )}
                        </>
                    )}
                    {(!stats || stats.route_breakdown.length === 0) && !loading && (
                        <Paper sx={{ p: 6, textAlign: 'center' }}>
                            <Route sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="h6" color="text.secondary">No routes configured yet. Add routes & vehicles to get started!</Typography>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ Tab 1: Routes ══════════════════════════════════════════ */}
            {tabIndex === 1 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<Add />} onClick={openNewRoute}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Route</Button>
                    </Box>
                    <Grid container spacing={2}>
                        {routes.length === 0 ? (
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 6, textAlign: 'center' }}>
                                    <Route sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">No routes configured</Typography>
                                </Paper>
                            </Grid>
                        ) : routes.map(r => (
                            <Grid key={r.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card sx={{ height: '100%', border: '1px solid rgba(0,0,0,0.06)', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }, transition: 'all 0.2s' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Chip label={r.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[r.status] || '#999'}18`, color: STATUS_COLORS[r.status] || '#999', textTransform: 'capitalize', fontWeight: 700 }} />
                                            <Box>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditRoute(r)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { dispatch(deleteRoute(r.id)); dispatch(fetchTransportStats()); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </Box>
                                        </Box>
                                        <Typography variant="h6" fontWeight={700} gutterBottom>{r.route_name}</Typography>
                                        {r.route_code && <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#3D5EE1' }}>{r.route_code}</Typography>}
                                        <Typography variant="body2" color="text.secondary" mt={0.5}>📍 {r.start_point} → {r.end_point}</Typography>
                                        {r.stops && <Typography variant="caption" color="text.secondary">Stops: {r.stops}</Typography>}
                                        <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Students</Typography>
                                                <Typography fontWeight={700}>{r.current_students}/{r.max_capacity}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Available</Typography>
                                                <Typography fontWeight={700} sx={{ color: r.available_seats > 0 ? '#51CF66' : '#DC3545' }}>{r.available_seats}</Typography>
                                            </Box>
                                            {r.distance_km && r.distance_km > 0 && (
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Distance</Typography>
                                                    <Typography fontWeight={700}>{r.distance_km} km</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                        {r.vehicle_number && (
                                            <Typography variant="body2" mt={1} color="text.secondary">🚌 {r.vehicle_number}</Typography>
                                        )}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                                            <Typography variant="body2" sx={{ color: '#3D5EE1', fontWeight: 700 }}>₹{r.monthly_fee.toLocaleString()}/mo</Typography>
                                            {r.morning_departure && <Typography variant="caption" color="text.secondary">🌅 {r.morning_departure} | 🌆 {r.evening_departure}</Typography>}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {/* ═══ Tab 2: Vehicles ════════════════════════════════════════ */}
            {tabIndex === 2 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<Add />} onClick={openNewVehicle}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Vehicle</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Make/Model</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Capacity</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Driver</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Features</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {vehicles.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                            <DirectionsBus sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No vehicles registered</Typography>
                                        </TableCell></TableRow>
                                    ) : vehicles.map(v => (
                                        <TableRow key={v.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography fontWeight={700}>{v.vehicle_number}</Typography></TableCell>
                                            <TableCell>
                                                <Chip label={`${VEHICLE_TYPE_ICONS[v.vehicle_type] || '🚗'} ${v.vehicle_type.replace('_', ' ')}`}
                                                    size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                                            </TableCell>
                                            <TableCell>{v.make} {v.model} {v.year ? `(${v.year})` : ''}</TableCell>
                                            <TableCell align="center"><Typography fontWeight={700}>{v.capacity}</Typography></TableCell>
                                            <TableCell>
                                                {v.driver_name ? (
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600}>{v.driver_name}</Typography>
                                                        {v.driver_phone && <Typography variant="caption" color="text.secondary">{v.driver_phone}</Typography>}
                                                    </Box>
                                                ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    {v.gps_enabled && <Chip label="📡 GPS" size="small" sx={{ bgcolor: '#51CF6618', color: '#51CF66' }} />}
                                                    {v.fuel_type && <Chip label={`⛽ ${v.fuel_type}`} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />}
                                                    {v.assigned_routes > 0 && <Chip label={`${v.assigned_routes} route${v.assigned_routes > 1 ? 's' : ''}`} size="small" sx={{ bgcolor: '#3D5EE118', color: '#3D5EE1' }} />}
                                                </Box>
                                            </TableCell>
                                            <TableCell><Chip label={v.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[v.status] || '#999'}18`, color: STATUS_COLORS[v.status] || '#999', textTransform: 'capitalize', fontWeight: 700 }} /></TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditVehicle(v)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => dispatch(deleteVehicle(v.id))}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 3: Assignments ═════════════════════════════════════ */}
            {tabIndex === 3 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<People />} onClick={openAssign}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Assign Student</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#E8F5E9' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Route</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Pickup</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Drop</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Since</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Fee/mo</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {assignments.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                            <Person sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No assignments found</Typography>
                                        </TableCell></TableRow>
                                    ) : assignments.map(a => (
                                        <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(81,207,102,0.04)' } }}>
                                            <TableCell><Typography fontWeight={600}>{a.student_name || `Student #${a.student_id}`}</Typography></TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>{a.route_name}</Typography>
                                                    {a.route_code && <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#3D5EE1' }}>{a.route_code}</Typography>}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{a.pickup_stop || '—'}</TableCell>
                                            <TableCell>{a.drop_stop || '—'}</TableCell>
                                            <TableCell>{a.assignment_date}</TableCell>
                                            <TableCell><Chip label={a.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[a.status] || '#999'}18`, color: STATUS_COLORS[a.status] || '#999', textTransform: 'capitalize', fontWeight: 700 }} /></TableCell>
                                            <TableCell align="right"><Typography fontWeight={700} sx={{ color: '#3D5EE1' }}>₹{a.monthly_fee.toLocaleString()}</Typography></TableCell>
                                            <TableCell>
                                                {a.status === 'active' && (
                                                    <Tooltip title="Cancel Assignment"><IconButton size="small" color="error" onClick={() => openCancel(a)}><Cancel fontSize="small" /></IconButton></Tooltip>
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

            {/* ═══ Route Dialog ════════════════════════════════════════════ */}
            <Dialog open={routeDialog} onClose={() => setRouteDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editRouteItem ? 'Edit Route' : 'Add New Route'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 8 }}><TextField fullWidth label="Route Name *" value={routeForm.route_name} onChange={e => setRouteForm({ ...routeForm, route_name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Code" value={routeForm.route_code} onChange={e => setRouteForm({ ...routeForm, route_code: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Start Point *" value={routeForm.start_point} onChange={e => setRouteForm({ ...routeForm, start_point: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="End Point *" value={routeForm.end_point} onChange={e => setRouteForm({ ...routeForm, end_point: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Stops (comma separated)" value={routeForm.stops} onChange={e => setRouteForm({ ...routeForm, stops: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Distance (km)" type="number" value={routeForm.distance_km} onChange={e => setRouteForm({ ...routeForm, distance_km: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Time (min)" type="number" value={routeForm.estimated_time_min} onChange={e => setRouteForm({ ...routeForm, estimated_time_min: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Capacity" type="number" value={routeForm.max_capacity} onChange={e => setRouteForm({ ...routeForm, max_capacity: Number(e.target.value) || 40 })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Morning Departure" placeholder="07:30" value={routeForm.morning_departure} onChange={e => setRouteForm({ ...routeForm, morning_departure: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Evening Departure" placeholder="15:30" value={routeForm.evening_departure} onChange={e => setRouteForm({ ...routeForm, evening_departure: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Monthly Fee (₹)" type="number" value={routeForm.monthly_fee} onChange={e => setRouteForm({ ...routeForm, monthly_fee: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Vehicle (optional)</InputLabel>
                                <Select value={routeForm.vehicle_id} label="Vehicle (optional)" onChange={e => setRouteForm({ ...routeForm, vehicle_id: e.target.value as number })}>
                                    <MenuItem value="">None</MenuItem>
                                    {vehicles.map(v => <MenuItem key={v.id} value={v.id}>{VEHICLE_TYPE_ICONS[v.vehicle_type] || '🚗'} {v.vehicle_number} ({v.capacity} seats)</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth multiline rows={2} label="Description" value={routeForm.description} onChange={e => setRouteForm({ ...routeForm, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRouteDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveRoute} disabled={!routeForm.route_name || !routeForm.start_point || !routeForm.end_point}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editRouteItem ? 'Update' : 'Add Route'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Vehicle Dialog ══════════════════════════════════════════ */}
            <Dialog open={vehicleDialog} onClose={() => setVehicleDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editVehicleItem ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Vehicle Number *" value={vehicleForm.vehicle_number} onChange={e => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Type</InputLabel>
                                <Select value={vehicleForm.vehicle_type} label="Type" onChange={e => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}>
                                    <MenuItem value="bus">🚌 Bus</MenuItem>
                                    <MenuItem value="mini_bus">🚐 Mini Bus</MenuItem>
                                    <MenuItem value="van">🚎 Van</MenuItem>
                                    <MenuItem value="car">🚗 Car</MenuItem>
                                    <MenuItem value="auto">🛺 Auto</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Make" value={vehicleForm.make} onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Model" value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} /></Grid>
                        <Grid size={{ xs: 2 }}><TextField fullWidth label="Year" type="number" value={vehicleForm.year} onChange={e => setVehicleForm({ ...vehicleForm, year: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 2 }}><TextField fullWidth label="Seats" type="number" value={vehicleForm.capacity} onChange={e => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) || 40 })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Driver Name" value={vehicleForm.driver_name} onChange={e => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Driver Phone" value={vehicleForm.driver_phone} onChange={e => setVehicleForm({ ...vehicleForm, driver_phone: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Driver License" value={vehicleForm.driver_license} onChange={e => setVehicleForm({ ...vehicleForm, driver_license: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Conductor Name" value={vehicleForm.conductor_name} onChange={e => setVehicleForm({ ...vehicleForm, conductor_name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Conductor Phone" value={vehicleForm.conductor_phone} onChange={e => setVehicleForm({ ...vehicleForm, conductor_phone: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Insurance Expiry" type="date" InputLabelProps={{ shrink: true }} value={vehicleForm.insurance_expiry} onChange={e => setVehicleForm({ ...vehicleForm, insurance_expiry: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Fitness Expiry" type="date" InputLabelProps={{ shrink: true }} value={vehicleForm.fitness_expiry} onChange={e => setVehicleForm({ ...vehicleForm, fitness_expiry: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}>
                            <FormControl fullWidth><InputLabel>Fuel</InputLabel>
                                <Select value={vehicleForm.fuel_type} label="Fuel" onChange={e => setVehicleForm({ ...vehicleForm, fuel_type: e.target.value })}>
                                    <MenuItem value="diesel">Diesel</MenuItem>
                                    <MenuItem value="petrol">Petrol</MenuItem>
                                    <MenuItem value="cng">CNG</MenuItem>
                                    <MenuItem value="electric">Electric</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControlLabel control={<Switch checked={vehicleForm.gps_enabled} onChange={e => setVehicleForm({ ...vehicleForm, gps_enabled: e.target.checked })} />} label="📡 GPS Enabled" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVehicleDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveVehicle} disabled={!vehicleForm.vehicle_number}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editVehicleItem ? 'Update' : 'Add Vehicle'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Assignment Dialog ═══════════════════════════════════════ */}
            <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Assign Student to Route</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Route</InputLabel>
                                <Select value={assignForm.route_id} label="Route" onChange={e => {
                                    const rid = e.target.value as number;
                                    const route = routes.find(r => r.id === rid);
                                    setAssignForm({ ...assignForm, route_id: rid, monthly_fee: route?.monthly_fee || 0 });
                                }}>
                                    {routes.filter(r => r.available_seats > 0).map(r => (
                                        <MenuItem key={r.id} value={r.id}>{r.route_name} — {r.start_point}→{r.end_point} ({r.available_seats} seats)</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Student</InputLabel>
                                <Select value={assignForm.student_id} label="Student" onChange={e => setAssignForm({ ...assignForm, student_id: e.target.value as number })}>
                                    {students.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Pickup Stop" value={assignForm.pickup_stop} onChange={e => setAssignForm({ ...assignForm, pickup_stop: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Drop Stop" value={assignForm.drop_stop} onChange={e => setAssignForm({ ...assignForm, drop_stop: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Monthly Fee (₹)" type="number" value={assignForm.monthly_fee} onChange={e => setAssignForm({ ...assignForm, monthly_fee: Number(e.target.value) || 0 })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth multiline label="Remarks" value={assignForm.remarks} onChange={e => setAssignForm({ ...assignForm, remarks: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAssign} disabled={!assignForm.student_id || !assignForm.route_id}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Assign</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Cancel Dialog ═══════════════════════════════════════════ */}
            <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Cancel Assignment</DialogTitle>
                <DialogContent>
                    {cancelItem && (
                        <Box sx={{ mb: 2, p: 2, bgcolor: '#FFF3CD', borderRadius: 1, mt: 1 }}>
                            <Typography variant="body2"><strong>Student:</strong> {cancelItem.student_name}</Typography>
                            <Typography variant="body2"><strong>Route:</strong> {cancelItem.route_name}</Typography>
                            <Typography variant="body2"><strong>Since:</strong> {cancelItem.assignment_date}</Typography>
                        </Box>
                    )}
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="End Date" type="date" value={cancelForm.end_date} InputLabelProps={{ shrink: true }} onChange={e => setCancelForm({ ...cancelForm, end_date: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Remarks" value={cancelForm.remarks} onChange={e => setCancelForm({ ...cancelForm, remarks: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelDialog(false)}>Close</Button>
                    <Button variant="contained" color="error" onClick={handleCancel}>Confirm Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
