import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType,
    fetchApplications, applyLeave, actionLeave, cancelLeave, deleteApplication,
    fetchBalance, fetchCalendar, clearError, clearBalance,
} from '../../store/slices/leaveSlice';
import type { LeaveTypeItem, LeaveApplicationItem, LeaveBalanceItem, CalendarEvent } from '../../store/slices/leaveSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import {
    Box, Typography, Button, Paper, TextField, InputAdornment,
    Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Card, CardContent, Snackbar, Alert, LinearProgress, Breadcrumbs, Link,
    Skeleton, MenuItem, Select, FormControl, InputLabel, Tabs, Tab, Table,
    TableBody, TableCell, TableHead, TableRow, TableContainer, ToggleButton,
    ToggleButtonGroup, Switch, FormControlLabel,
} from '@mui/material';
import {
    Search, Add, Refresh, CheckCircle, Cancel, Schedule, EventBusy,
    CalendarMonth, Assessment, People, PersonOutline, EventNote,
    ThumbUp, ThumbDown, Edit, Delete,
} from '@mui/icons-material';

const STATUS_COLORS: Record<string, string> = {
    pending: '#FCC419', approved: '#51CF66', rejected: '#DC3545', cancelled: '#999',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function LeavePage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { leaveTypes, applications, appTotal, balance, calendarEvents,
        loading, detailLoading, error } = useSelector((s: RootState) => s.leaves);
    const { students } = useSelector((s: RootState) => s.students);
    const { teachers } = useSelector((s: RootState) => s.teachers);

    // ── Tabs: 0=Applications, 1=Apply, 2=Approval, 3=Calendar, 4=Balance, 5=Types ──
    const [tabIndex, setTabIndex] = useState(0);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // ── Filters ──
    const [filterType, setFilterType] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // ── Apply form ──
    const [applyForm, setApplyForm] = useState({ applicant_type: 'teacher' as string, teacher_id: '' as any, student_id: '' as any, leave_type_id: '' as any, start_date: '', end_date: '', reason: '' });

    // ── Type dialog ──
    const [typeDialog, setTypeDialog] = useState(false);
    const [editType, setEditType] = useState<LeaveTypeItem | null>(null);
    const [typeForm, setTypeForm] = useState({ name: '', code: '', description: '', max_days_per_year: 12, is_paid: true, applies_to: 'teacher' as string, color: '#3D5EE1' });

    // ── Action dialog ──
    const [actionDialog, setActionDialog] = useState<LeaveApplicationItem | null>(null);
    const [actionRemarks, setActionRemarks] = useState('');

    // ── Balance ──
    const [balApplicant, setBalApplicant] = useState<string>('teacher');
    const [balId, setBalId] = useState<number | ''>('');

    // ── Load data ──
    useEffect(() => { dispatch(fetchLeaveTypes({})); dispatch(fetchStudents({})); dispatch(fetchTeachers({})); }, [dispatch]);
    useEffect(() => { if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); } }, [error, dispatch]);

    const loadApplications = useCallback(() => {
        const params: any = {};
        if (filterType) params.applicant_type = filterType;
        if (filterStatus) params.status_filter = filterStatus;
        dispatch(fetchApplications(params));
    }, [dispatch, filterType, filterStatus]);

    useEffect(() => { if (tabIndex === 0 || tabIndex === 2) loadApplications(); }, [tabIndex, loadApplications]);
    useEffect(() => { if (tabIndex === 3) dispatch(fetchCalendar({ month: selectedMonth, year: selectedYear })); }, [tabIndex, selectedMonth, selectedYear, dispatch]);

    // ── Handlers ──
    const handleApply = async () => {
        const data: any = { ...applyForm, leave_type_id: Number(applyForm.leave_type_id) };
        if (data.applicant_type === 'teacher') { data.teacher_id = Number(data.teacher_id); delete data.student_id; }
        else { data.student_id = Number(data.student_id); delete data.teacher_id; }
        const result = await dispatch(applyLeave(data));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: 'Leave application submitted!', severity: 'success' });
            setApplyForm({ applicant_type: 'teacher', teacher_id: '', student_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });
            setTabIndex(0);
        }
    };

    const handleAction = async (status: string) => {
        if (!actionDialog) return;
        const result = await dispatch(actionLeave({ id: actionDialog.id, data: { status, admin_remarks: actionRemarks } }));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: `Leave ${status}!`, severity: 'success' });
            setActionDialog(null);
            setActionRemarks('');
        }
    };

    const handleSaveType = async () => {
        if (editType) {
            await dispatch(updateLeaveType({ id: editType.id, data: typeForm }));
            setSnackbar({ open: true, message: 'Leave type updated!', severity: 'success' });
        } else {
            await dispatch(createLeaveType(typeForm));
            setSnackbar({ open: true, message: 'Leave type created!', severity: 'success' });
        }
        setTypeDialog(false);
        setEditType(null);
        dispatch(fetchLeaveTypes({}));
    };

    const openEditType = (t: LeaveTypeItem) => {
        setEditType(t);
        setTypeForm({ name: t.name, code: t.code || '', description: t.description || '', max_days_per_year: t.max_days_per_year, is_paid: t.is_paid, applies_to: t.applies_to, color: t.color });
        setTypeDialog(true);
    };

    const handleLoadBalance = () => {
        if (balId) dispatch(fetchBalance({ applicantType: balApplicant, applicantId: balId as number }));
    };

    // ═══════════════════════════════════════════════════════════════════
    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Leave Management</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Leave Management</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Apply, approve, and track leave applications</Typography>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Applications', value: appTotal, icon: <EventNote />, color: '#3D5EE1' },
                    { label: 'Leave Types', value: leaveTypes.length, icon: <CalendarMonth />, color: '#FCC419' },
                    { label: 'Pending', value: applications.filter(a => a.status === 'pending').length, icon: <Schedule />, color: '#FF6B35' },
                    { label: 'Approved', value: applications.filter(a => a.status === 'approved').length, icon: <CheckCircle />, color: '#51CF66' },
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
                    <Tab label="Applications" icon={<EventNote sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Apply Leave" icon={<Add sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Approval" icon={<ThumbUp sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Calendar" icon={<CalendarMonth sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Balance" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Leave Types" icon={<Schedule sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Applications List ═══════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Type</InputLabel>
                            <Select value={filterType} label="Type" onChange={e => setFilterType(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="teacher">Teacher</MenuItem>
                                <MenuItem value="student">Student</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                        </FormControl>
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Refresh"><IconButton onClick={loadApplications} color="primary"><Refresh /></IconButton></Tooltip>
                    </Paper>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Applicant</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Leave Type</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Dates</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Days</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {applications.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                            <EventNote sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No leave applications</Typography>
                                        </TableCell></TableRow>
                                    ) : applications.map(a => (
                                        <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{a.applicant_name || '—'}</Typography>
                                            </TableCell>
                                            <TableCell><Chip label={a.applicant_type} size="small" variant="outlined" /></TableCell>
                                            <TableCell>
                                                <Chip label={a.leave_type_name} size="small"
                                                    sx={{ bgcolor: `${a.leave_type_color || '#999'}18`, color: a.leave_type_color || '#999', fontWeight: 700 }} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{a.start_date} → {a.end_date}</Typography>
                                            </TableCell>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{a.days}</Typography></TableCell>
                                            <TableCell>
                                                <Chip label={a.status} size="small"
                                                    sx={{ bgcolor: `${STATUS_COLORS[a.status] || '#999'}18`, color: STATUS_COLORS[a.status] || '#999', fontWeight: 700, textTransform: 'capitalize' }} />
                                            </TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</Typography></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 1: Apply Leave ════════════════════════════════════ */}
            {tabIndex === 1 && (
                <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <Typography variant="h6" fontWeight={700} mb={3}>New Leave Application</Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Applicant Type</InputLabel>
                                <Select value={applyForm.applicant_type} label="Applicant Type" onChange={e => setApplyForm({ ...applyForm, applicant_type: e.target.value, teacher_id: '', student_id: '' })}>
                                    <MenuItem value="teacher">Teacher</MenuItem>
                                    <MenuItem value="student">Student</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            {applyForm.applicant_type === 'teacher' ? (
                                <FormControl fullWidth>
                                    <InputLabel>Teacher</InputLabel>
                                    <Select value={applyForm.teacher_id} label="Teacher" onChange={e => setApplyForm({ ...applyForm, teacher_id: e.target.value })}>
                                        {teachers.map(t => <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            ) : (
                                <FormControl fullWidth>
                                    <InputLabel>Student</InputLabel>
                                    <Select value={applyForm.student_id} label="Student" onChange={e => setApplyForm({ ...applyForm, student_id: e.target.value })}>
                                        {students.map(s => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            )}
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Leave Type</InputLabel>
                                <Select value={applyForm.leave_type_id} label="Leave Type" onChange={e => setApplyForm({ ...applyForm, leave_type_id: e.target.value })}>
                                    {leaveTypes.filter(lt => lt.applies_to === applyForm.applicant_type && lt.is_active).map(lt => (
                                        <MenuItem key={lt.id} value={lt.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: lt.color }} />
                                                {lt.name} ({lt.max_days_per_year}d)
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField fullWidth label="Start Date" type="date" value={applyForm.start_date}
                                onChange={e => setApplyForm({ ...applyForm, start_date: e.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField fullWidth label="End Date" type="date" value={applyForm.end_date}
                                onChange={e => setApplyForm({ ...applyForm, end_date: e.target.value })}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField fullWidth multiline rows={3} label="Reason" value={applyForm.reason}
                                onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Button variant="contained" size="large" onClick={handleApply}
                                disabled={!applyForm.leave_type_id || !applyForm.start_date || !applyForm.end_date || !applyForm.reason}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', px: 4 }}>
                                Submit Application
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* ═══ Tab 2: Approval ═══════════════════════════════════════ */}
            {tabIndex === 2 && (
                <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    {loading && <LinearProgress />}
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Applicant</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Leave Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Dates</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Days</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {applications.filter(a => a.status === 'pending').length === 0 ? (
                                    <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                        <ThumbUp sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">No pending requests</Typography>
                                    </TableCell></TableRow>
                                ) : applications.filter(a => a.status === 'pending').map(a => (
                                    <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                        <TableCell><Typography variant="body2" fontWeight={600}>{a.applicant_name || '—'}</Typography></TableCell>
                                        <TableCell><Chip label={a.leave_type_name} size="small" sx={{ bgcolor: `${a.leave_type_color}18`, color: a.leave_type_color, fontWeight: 700 }} /></TableCell>
                                        <TableCell><Typography variant="body2">{a.start_date} → {a.end_date}</Typography></TableCell>
                                        <TableCell><Typography variant="body2" fontWeight={600}>{a.days}</Typography></TableCell>
                                        <TableCell><Typography variant="body2" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</Typography></TableCell>
                                        <TableCell><Chip label="Pending" size="small" sx={{ bgcolor: '#FCC41918', color: '#FCC419', fontWeight: 700 }} /></TableCell>
                                        <TableCell>
                                            <Tooltip title="Approve"><IconButton color="success" onClick={() => { setActionDialog(a); }}><ThumbUp fontSize="small" /></IconButton></Tooltip>
                                            <Tooltip title="Reject"><IconButton color="error" onClick={() => { setActionDialog(a); }}><ThumbDown fontSize="small" /></IconButton></Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ═══ Tab 3: Calendar ═══════════════════════════════════════ */}
            {tabIndex === 3 && (
                <>
                    <Paper sx={{ p: 3, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                                <InputLabel>Month</InputLabel>
                                <Select value={selectedMonth} label="Month" onChange={e => setSelectedMonth(Number(e.target.value))}>
                                    {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField label="Year" type="number" size="small" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} sx={{ width: 100 }} />
                        </Box>
                    </Paper>

                    {detailLoading && <LinearProgress sx={{ mb: 2 }} />}

                    <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="h6" fontWeight={700} mb={2}>{MONTHS[selectedMonth - 1]} {selectedYear} — Leave Calendar</Typography>

                        {/* Calendar grid */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <Box key={d} sx={{ textAlign: 'center', py: 0.5 }}><Typography variant="caption" fontWeight={600} color="text.secondary">{d}</Typography></Box>
                            ))}
                            {Array.from({ length: new Date(selectedYear, selectedMonth - 1, 1).getDay() }).map((_, i) => <Box key={`pad-${i}`} />)}
                            {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }).map((_, i) => {
                                const day = i + 1;
                                const dayDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const eventsOnDay = calendarEvents.filter(e => dayDate >= e.start_date && dayDate <= e.end_date);
                                return (
                                    <Tooltip key={day} title={eventsOnDay.length ? eventsOnDay.map(e => `${e.applicant_name}: ${e.leave_type_name}`).join('\n') : 'No leaves'}>
                                        <Box sx={{
                                            textAlign: 'center', py: 1, borderRadius: 1, cursor: 'default', minHeight: 48,
                                            bgcolor: eventsOnDay.length ? `${eventsOnDay[0].color}12` : '#f8f9fa',
                                            border: `1px solid ${eventsOnDay.length ? eventsOnDay[0].color : 'transparent'}`,
                                            transition: 'all 0.2s', '&:hover': { transform: 'scale(1.05)' },
                                        }}>
                                            <Typography variant="body2" fontWeight={600} sx={{ color: eventsOnDay.length ? eventsOnDay[0].color : '#666' }}>{day}</Typography>
                                            {eventsOnDay.length > 0 && <Typography variant="caption" sx={{ color: eventsOnDay[0].color }}>{eventsOnDay.length}</Typography>}
                                        </Box>
                                    </Tooltip>
                                );
                            })}
                        </Box>

                        {/* Events list */}
                        {calendarEvents.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" fontWeight={600} mb={1}>Leave Events</Typography>
                                {calendarEvents.map(e => (
                                    <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, px: 1, borderRadius: 1, mb: 0.5, bgcolor: `${e.color}08`, border: `1px solid ${e.color}20` }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: e.color }} />
                                        <Typography variant="body2" fontWeight={600}>{e.applicant_name}</Typography>
                                        <Chip label={e.leave_type_name} size="small" sx={{ bgcolor: `${e.color}18`, color: e.color, fontWeight: 600 }} />
                                        <Typography variant="caption" color="text.secondary">{e.start_date} → {e.end_date} ({e.days}d)</Typography>
                                        <Chip label={e.status} size="small" sx={{ ml: 'auto', bgcolor: `${STATUS_COLORS[e.status]}18`, color: STATUS_COLORS[e.status], textTransform: 'capitalize' }} />
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Paper>
                </>
            )}

            {/* ═══ Tab 4: Balance ════════════════════════════════════════ */}
            {tabIndex === 4 && (
                <>
                    <Paper sx={{ p: 3, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={2}>Leave Balance</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <ToggleButtonGroup value={balApplicant} exclusive onChange={(_, v) => { if (v) { setBalApplicant(v); setBalId(''); } }} size="small">
                                <ToggleButton value="teacher"><PersonOutline sx={{ mr: 0.5, fontSize: 18 }} /> Teacher</ToggleButton>
                                <ToggleButton value="student"><People sx={{ mr: 0.5, fontSize: 18 }} /> Student</ToggleButton>
                            </ToggleButtonGroup>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>{balApplicant === 'teacher' ? 'Teacher' : 'Student'}</InputLabel>
                                <Select value={balId} label={balApplicant === 'teacher' ? 'Teacher' : 'Student'} onChange={e => setBalId(e.target.value as number)}>
                                    {(balApplicant === 'teacher' ? teachers : students).map((p: any) => (
                                        <MenuItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button variant="contained" onClick={handleLoadBalance} disabled={!balId}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>View Balance</Button>
                        </Box>
                    </Paper>

                    {detailLoading && <LinearProgress sx={{ mb: 2 }} />}

                    {balance && (
                        <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>{balance.applicant_name} — {balance.academic_year}</Typography>
                            <Grid container spacing={2}>
                                {balance.balances.map(b => (
                                    <Grid key={b.leave_type_id} size={{ xs: 12, sm: 6, md: 4 }}>
                                        <Card sx={{ border: `1px solid ${b.color}30`, overflow: 'hidden' }}>
                                            <Box sx={{ height: 4, bgcolor: b.color }} />
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: b.color }} />
                                                    <Typography variant="subtitle1" fontWeight={700}>{b.leave_type_name}</Typography>
                                                </Box>
                                                <Grid container spacing={1}>
                                                    <Grid size={{ xs: 3 }}>
                                                        <Typography variant="caption" color="text.secondary">Total</Typography>
                                                        <Typography variant="h6" fontWeight={700}>{b.max_days}</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 3 }}>
                                                        <Typography variant="caption" color="text.secondary">Used</Typography>
                                                        <Typography variant="h6" fontWeight={700} color="error.main">{b.used_days}</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 3 }}>
                                                        <Typography variant="caption" color="text.secondary">Left</Typography>
                                                        <Typography variant="h6" fontWeight={700} color="success.main">{b.remaining_days}</Typography>
                                                    </Grid>
                                                    <Grid size={{ xs: 3 }}>
                                                        <Typography variant="caption" color="text.secondary">Pending</Typography>
                                                        <Typography variant="h6" fontWeight={700} sx={{ color: '#FCC419' }}>{b.pending_days}</Typography>
                                                    </Grid>
                                                </Grid>
                                                {/* Progress bar */}
                                                <Box sx={{ mt: 1.5 }}>
                                                    <LinearProgress variant="determinate" value={Math.min((b.used_days / b.max_days) * 100, 100)}
                                                        sx={{ height: 8, borderRadius: 4, bgcolor: `${b.color}18`, '& .MuiLinearProgress-bar': { bgcolor: b.color, borderRadius: 4 } }} />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ Tab 5: Leave Types ════════════════════════════════════ */}
            {tabIndex === 5 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditType(null); setTypeForm({ name: '', code: '', description: '', max_days_per_year: 12, is_paid: true, applies_to: 'teacher', color: '#3D5EE1' }); setTypeDialog(true); }}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Leave Type</Button>
                    </Box>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Max Days</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Paid</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Applies To</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {leaveTypes.map(t => (
                                        <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: t.color }} />
                                                    <Typography variant="body2" fontWeight={600}>{t.name}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell><Typography variant="body2">{t.code || '—'}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{t.max_days_per_year}</Typography></TableCell>
                                            <TableCell><Chip label={t.is_paid ? 'Paid' : 'Unpaid'} size="small" sx={{ bgcolor: t.is_paid ? '#51CF6618' : '#DC354518', color: t.is_paid ? '#51CF66' : '#DC3545', fontWeight: 700 }} /></TableCell>
                                            <TableCell><Chip label={t.applies_to} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell><Chip label={t.is_active ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: t.is_active ? '#51CF6618' : '#99918', color: t.is_active ? '#51CF66' : '#999' }} /></TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditType(t)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => dispatch(deleteLeaveType(t.id))}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Type Dialog ═══════════════════════════════════════════ */}
            <Dialog open={typeDialog} onClose={() => setTypeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editType ? 'Edit Leave Type' : 'New Leave Type'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 8 }}><TextField fullWidth label="Name" value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Code" value={typeForm.code} onChange={e => setTypeForm({ ...typeForm, code: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Description" value={typeForm.description} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Max Days/Year" type="number" value={typeForm.max_days_per_year} onChange={e => setTypeForm({ ...typeForm, max_days_per_year: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Applies To</InputLabel>
                                <Select value={typeForm.applies_to} label="Applies To" onChange={e => setTypeForm({ ...typeForm, applies_to: e.target.value })}>
                                    <MenuItem value="teacher">Teacher</MenuItem>
                                    <MenuItem value="student">Student</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                            <TextField fullWidth label="Color" type="color" value={typeForm.color} onChange={e => setTypeForm({ ...typeForm, color: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControlLabel control={<Switch checked={typeForm.is_paid} onChange={e => setTypeForm({ ...typeForm, is_paid: e.target.checked })} />} label="Paid Leave" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTypeDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveType} disabled={!typeForm.name}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editType ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Action Dialog ═════════════════════════════════════════ */}
            <Dialog open={!!actionDialog} onClose={() => setActionDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Leave Action — {actionDialog?.applicant_name}</DialogTitle>
                <DialogContent>
                    {actionDialog && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" mb={1}><strong>Type:</strong> {actionDialog.leave_type_name}</Typography>
                            <Typography variant="body2" mb={1}><strong>Dates:</strong> {actionDialog.start_date} → {actionDialog.end_date} ({actionDialog.days} days)</Typography>
                            <Typography variant="body2" mb={2}><strong>Reason:</strong> {actionDialog.reason}</Typography>
                            <TextField fullWidth multiline rows={2} label="Admin Remarks" value={actionRemarks}
                                onChange={e => setActionRemarks(e.target.value)} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionDialog(null)}>Cancel</Button>
                    <Button variant="contained" color="error" startIcon={<ThumbDown />} onClick={() => handleAction('rejected')}>Reject</Button>
                    <Button variant="contained" color="success" startIcon={<ThumbUp />} onClick={() => handleAction('approved')}>Approve</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
