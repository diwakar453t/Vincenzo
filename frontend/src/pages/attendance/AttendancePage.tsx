import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchStudentAttendance, markStudentAttendance, bulkMarkStudentAttendance, deleteStudentAttendance,
    fetchStaffAttendance, markStaffAttendance, bulkMarkStaffAttendance, deleteStaffAttendance,
    fetchStudentMonthly, fetchStaffMonthly, fetchClassReport, fetchClassFullReport,
    clearError, clearMonthly, clearClassReport,
} from '../../store/slices/attendanceSlice';
import type { StudentAttendanceItem, StaffAttendanceItem } from '../../store/slices/attendanceSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchClasses } from '../../store/slices/classesSlice';
import {
    Box, Typography, Button, Paper, TextField, InputAdornment, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton,
    MenuItem, Select, FormControl, InputLabel, Tabs, Tab, Table,
    TableBody, TableCell, TableHead, TableRow, TableContainer, Divider, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
    Search, Add, Refresh, CheckCircle, Cancel, Schedule, EventBusy,
    CalendarMonth, Assessment, People, PersonOutline, HowToReg,
} from '@mui/icons-material';

const STATUS_COLORS: Record<string, string> = {
    present: '#51CF66', absent: '#DC3545', late: '#FCC419', half_day: '#3D5EE1', excused: '#9775FA',
};
const STATUS_LABELS: Record<string, string> = {
    present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half Day', excused: 'Excused',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayStr() { return new Date().toISOString().split('T')[0]; }

export default function AttendancePage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const location = useLocation();
    const isStaffRoute = location.pathname.includes('/staff');

    const { studentRecords, studentTotal, staffRecords, staffTotal,
        monthlyView, classReport, classFullReport,
        loading, detailLoading, error } = useSelector((s: RootState) => s.attendance);
    const { students } = useSelector((s: RootState) => s.students);
    const { teachers } = useSelector((s: RootState) => s.teachers);
    const { classes } = useSelector((s: RootState) => s.classes);

    // ── Tabs: 0=Daily, 1=Monthly, 2=Stats, 3=Quick Mark, 4=Reports ────
    const [tabIndex, setTabIndex] = useState(isStaffRoute ? 0 : 0);
    const [mode, setMode] = useState<'student' | 'staff'>(isStaffRoute ? 'staff' : 'student');

    // ── Filters ─────────────────────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState(todayStr());
    const [selectedClass, setSelectedClass] = useState<number | ''>('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | ''>('');

    // ── Quick mark state ────────────────────────────────────────────────
    const [quickStatuses, setQuickStatuses] = useState<Record<number, string>>({});

    // ── Snackbar ────────────────────────────────────────────────────────
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // ── Load references ─────────────────────────────────────────────────
    useEffect(() => { dispatch(fetchStudents({})); dispatch(fetchTeachers({})); dispatch(fetchClasses({})); }, [dispatch]);
    useEffect(() => { if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); } }, [error, dispatch]);

    // ── Load daily attendance ───────────────────────────────────────────
    const loadDaily = useCallback(() => {
        if (mode === 'student') {
            const params: any = { date: selectedDate };
            if (selectedClass) params.class_id = selectedClass;
            dispatch(fetchStudentAttendance(params));
        } else {
            dispatch(fetchStaffAttendance({ date: selectedDate }));
        }
    }, [dispatch, mode, selectedDate, selectedClass]);

    useEffect(() => { if (tabIndex === 0) loadDaily(); }, [tabIndex, loadDaily]);

    // ── Quick mark: load students for class on tab 3 ────────────────────
    useEffect(() => {
        if (tabIndex === 3 && mode === 'student' && selectedClass) {
            dispatch(fetchStudentAttendance({ date: selectedDate, class_id: selectedClass as number }));
        }
        if (tabIndex === 3 && mode === 'staff') {
            dispatch(fetchStaffAttendance({ date: selectedDate }));
        }
    }, [tabIndex, mode, selectedDate, selectedClass, dispatch]);

    // ── Quick mark handlers ─────────────────────────────────────────────
    const handleQuickToggle = (id: number, status: string) => {
        setQuickStatuses(prev => ({ ...prev, [id]: prev[id] === status ? 'present' : status }));
    };

    const handleQuickSave = async () => {
        if (mode === 'student') {
            if (!selectedClass) return;
            const entries = Object.entries(quickStatuses).map(([sid, status]) => ({ student_id: Number(sid), status }));
            // Also add all students not in quickStatuses as 'present'
            const classStudents = students.filter(s => s.class_id === selectedClass);
            for (const s of classStudents) {
                if (!quickStatuses[s.id]) entries.push({ student_id: s.id, status: 'present' });
            }
            const result = await dispatch(bulkMarkStudentAttendance({ class_id: selectedClass, date: selectedDate, academic_year: '2025-26', entries }));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: `Attendance saved for ${entries.length} students!`, severity: 'success' });
                setQuickStatuses({});
            }
        } else {
            const entries = Object.entries(quickStatuses).map(([tid, status]) => ({ teacher_id: Number(tid), status }));
            for (const t of teachers) {
                if (!quickStatuses[t.id]) entries.push({ teacher_id: t.id, status: 'present' });
            }
            const result = await dispatch(bulkMarkStaffAttendance({ date: selectedDate, entries }));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: `Attendance saved for ${entries.length} staff!`, severity: 'success' });
                setQuickStatuses({});
            }
        }
    };

    // ── Monthly view ────────────────────────────────────────────────────
    const handleLoadMonthly = () => {
        if (mode === 'student' && selectedStudentId) {
            dispatch(fetchStudentMonthly({ studentId: selectedStudentId as number, month: selectedMonth, year: selectedYear }));
        } else if (mode === 'staff' && selectedTeacherId) {
            dispatch(fetchStaffMonthly({ teacherId: selectedTeacherId as number, month: selectedMonth, year: selectedYear }));
        }
    };

    // ── Reports ─────────────────────────────────────────────────────────
    const handleLoadReport = () => {
        if (selectedClass) dispatch(fetchClassFullReport({ classId: selectedClass as number }));
    };
    const handleLoadClassDaily = () => {
        if (selectedClass) dispatch(fetchClassReport({ classId: selectedClass as number, date: selectedDate }));
    };

    // ═══════════════════════════════════════════════════════════════════
    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Attendance</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Attendance</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Track daily attendance, view monthly reports, and quick-mark</Typography>
                </Box>
                <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => { if (v) setMode(v); }} size="small" sx={{ bgcolor: 'white' }}>
                    <ToggleButton value="student" sx={{ px: 2 }}><People sx={{ mr: 0.5, fontSize: 18 }} /> Students</ToggleButton>
                    <ToggleButton value="staff" sx={{ px: 2 }}><PersonOutline sx={{ mr: 0.5, fontSize: 18 }} /> Staff</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: mode === 'student' ? 'Student Records' : 'Staff Records', value: mode === 'student' ? studentTotal : staffTotal, icon: <HowToReg />, color: '#3D5EE1' },
                    { label: 'Today', value: selectedDate, icon: <CalendarMonth />, color: '#FCC419' },
                    { label: mode === 'student' ? 'Students' : 'Teachers', value: mode === 'student' ? students.length : teachers.length, icon: <People />, color: '#51CF66' },
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
                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
                    <Tab label="Daily View" icon={<CalendarMonth sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Monthly View" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Statistics" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Quick Mark" icon={<HowToReg sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Reports" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Daily View ════════════════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <TextField label="Date" type="date" size="small" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
                        {mode === 'student' && (
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Class</InputLabel>
                                <Select value={selectedClass} label="Class" onChange={e => setSelectedClass(e.target.value as any)}><MenuItem value="">All</MenuItem>{classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select>
                            </FormControl>
                        )}
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Refresh"><IconButton onClick={loadDaily} color="primary"><Refresh /></IconButton></Tooltip>
                    </Paper>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>{mode === 'student' ? 'Student' : 'Teacher'}</TableCell>
                                        {mode === 'student' && <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>}
                                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        {mode === 'staff' && <><TableCell sx={{ fontWeight: 600 }}>Check In</TableCell><TableCell sx={{ fontWeight: 600 }}>Check Out</TableCell></>}
                                        <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading && (mode === 'student' ? studentRecords : staffRecords).length === 0 ? (
                                        Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: mode === 'student' ? 5 : 6 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                                    ) : (mode === 'student' ? studentRecords : staffRecords).length === 0 ? (
                                        <TableRow><TableCell colSpan={mode === 'student' ? 5 : 6} sx={{ textAlign: 'center', py: 6 }}><CalendarMonth sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} /><Typography variant="h6" color="text.secondary">No records for this date</Typography></TableCell></TableRow>
                                    ) : mode === 'student' ? studentRecords.map(r => (
                                        <TableRow key={r.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{r.student_name || `#${r.student_id}`}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{r.class_name}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{r.date}</Typography></TableCell>
                                            <TableCell><Chip label={STATUS_LABELS[r.status] || r.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[r.status] || '#999'}18`, color: STATUS_COLORS[r.status] || '#999', fontWeight: 700 }} /></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary">{r.remarks || '—'}</Typography></TableCell>
                                        </TableRow>
                                    )) : staffRecords.map(r => (
                                        <TableRow key={r.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{r.teacher_name || `#${r.teacher_id}`}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{r.date}</Typography></TableCell>
                                            <TableCell><Chip label={STATUS_LABELS[r.status] || r.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[r.status] || '#999'}18`, color: STATUS_COLORS[r.status] || '#999', fontWeight: 700 }} /></TableCell>
                                            <TableCell><Typography variant="body2">{r.check_in || '—'}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{r.check_out || '—'}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary">{r.remarks || '—'}</Typography></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 1: Monthly View ══════════════════════════════════════ */}
            {tabIndex === 1 && (
                <>
                    <Paper sx={{ p: 3, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={2}>Monthly Attendance Calendar</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            {mode === 'student' ? (
                                <FormControl size="small" sx={{ minWidth: 200 }}>
                                    <InputLabel>Student</InputLabel>
                                    <Select value={selectedStudentId} label="Student" onChange={e => setSelectedStudentId(e.target.value as any)}>
                                        {students.map(s => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            ) : (
                                <FormControl size="small" sx={{ minWidth: 200 }}>
                                    <InputLabel>Teacher</InputLabel>
                                    <Select value={selectedTeacherId} label="Teacher" onChange={e => setSelectedTeacherId(e.target.value as any)}>
                                        {teachers.map(t => <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            )}
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                                <InputLabel>Month</InputLabel>
                                <Select value={selectedMonth} label="Month" onChange={e => setSelectedMonth(Number(e.target.value))}>
                                    {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField label="Year" type="number" size="small" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} sx={{ width: 100 }} />
                            <Button variant="contained" onClick={handleLoadMonthly} disabled={mode === 'student' ? !selectedStudentId : !selectedTeacherId}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>View</Button>
                        </Box>
                    </Paper>

                    {detailLoading && <LinearProgress sx={{ mb: 2 }} />}

                    {monthlyView && (
                        <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>{monthlyView.name} — {MONTHS[monthlyView.month - 1]} {monthlyView.year}</Typography>
                                <Chip label={`${monthlyView.stats.percentage}%`} sx={{ fontWeight: 700, bgcolor: `${monthlyView.stats.percentage >= 75 ? '#51CF66' : monthlyView.stats.percentage >= 50 ? '#FCC419' : '#DC3545'}18`, color: monthlyView.stats.percentage >= 75 ? '#51CF66' : monthlyView.stats.percentage >= 50 ? '#FCC419' : '#DC3545' }} />
                            </Box>

                            {/* Calendar grid */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 3 }}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <Box key={d} sx={{ textAlign: 'center', py: 0.5 }}><Typography variant="caption" fontWeight={600} color="text.secondary">{d}</Typography></Box>
                                ))}
                                {/* Pad start */}
                                {Array.from({ length: new Date(monthlyView.year, monthlyView.month - 1, 1).getDay() }).map((_, i) => <Box key={`pad-${i}`} />)}
                                {monthlyView.days.map(day => {
                                    const color = day.status ? STATUS_COLORS[day.status] || '#999' : '#eee';
                                    const d = new Date(day.date).getDate();
                                    return (
                                        <Tooltip key={day.date} title={day.status ? STATUS_LABELS[day.status] || day.status : 'No record'}>
                                            <Box sx={{
                                                textAlign: 'center', py: 1.5, borderRadius: 1, cursor: 'default',
                                                bgcolor: day.status ? `${color}18` : '#f8f9fa',
                                                border: `2px solid ${day.status ? color : 'transparent'}`,
                                                transition: 'all 0.2s', '&:hover': { transform: 'scale(1.05)' },
                                            }}>
                                                <Typography variant="body2" fontWeight={600} sx={{ color: day.status ? color : '#999' }}>{d}</Typography>
                                            </Box>
                                        </Tooltip>
                                    );
                                })}
                            </Box>

                            {/* Stats bar */}
                            <Grid container spacing={2}>
                                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                    <Grid key={key} size={{ xs: 4, sm: 2.4 }}>
                                        <Card sx={{ textAlign: 'center', py: 1, border: `1px solid ${STATUS_COLORS[key]}30`, bgcolor: `${STATUS_COLORS[key]}08` }}>
                                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                                            <Typography variant="h6" fontWeight={700} sx={{ color: STATUS_COLORS[key] }}>
                                                {(monthlyView.stats as any)[key] ?? 0}
                                            </Typography>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ Tab 2: Statistics ════════════════════════════════════════ */}
            {tabIndex === 2 && (
                <>
                    <Paper sx={{ p: 3, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={2}>Class Daily Statistics</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Class</InputLabel>
                                <Select value={selectedClass} label="Class" onChange={e => setSelectedClass(e.target.value as any)}>
                                    {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField label="Date" type="date" size="small" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
                            <Button variant="contained" onClick={handleLoadClassDaily} disabled={!selectedClass}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>View Stats</Button>
                        </Box>
                    </Paper>

                    {detailLoading && <LinearProgress sx={{ mb: 2 }} />}

                    {classReport && (
                        <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Typography variant="h6" fontWeight={700} mb={2}>{classReport.class_name} — {classReport.date}</Typography>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Total Students', value: classReport.total_students, color: '#3D5EE1' },
                                    { label: 'Present', value: classReport.present, color: '#51CF66' },
                                    { label: 'Absent', value: classReport.absent, color: '#DC3545' },
                                    { label: 'Late', value: classReport.late, color: '#FCC419' },
                                    { label: 'Half Day', value: classReport.half_day, color: '#3D5EE1' },
                                    { label: 'Excused', value: classReport.excused, color: '#9775FA' },
                                ].map((s, i) => (
                                    <Grid key={i} size={{ xs: 6, sm: 2 }}>
                                        <Card sx={{ textAlign: 'center', py: 2, border: `1px solid ${s.color}30`, bgcolor: `${s.color}08` }}>
                                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                                            <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                            <Box sx={{ mt: 2, textAlign: 'center' }}>
                                <Typography variant="h3" fontWeight={700} sx={{ color: classReport.percentage >= 75 ? '#51CF66' : classReport.percentage >= 50 ? '#FCC419' : '#DC3545' }}>
                                    {classReport.percentage}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Attendance Rate</Typography>
                            </Box>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ Tab 3: Quick Mark ═══════════════════════════════════════ */}
            {tabIndex === 3 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <TextField label="Date" type="date" size="small" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
                        {mode === 'student' && (
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Class</InputLabel>
                                <Select value={selectedClass} label="Class" onChange={e => setSelectedClass(e.target.value as any)}>
                                    {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        )}
                        <Box sx={{ flex: 1 }} />
                        <Button variant="contained" onClick={handleQuickSave} disabled={mode === 'student' && !selectedClass}
                            startIcon={<CheckCircle />}
                            sx={{ background: 'linear-gradient(135deg, #51CF66, #6fe087)', boxShadow: '0 4px 14px rgba(81,207,102,0.35)' }}>Save All</Button>
                    </Paper>

                    <Paper sx={{ p: 2, mb: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: STATUS_COLORS[key] }} />
                                    <Typography variant="caption">{label}</Typography>
                                </Box>
                            ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary">Click a status to toggle. Unmarked entries default to Present.</Typography>
                    </Paper>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {mode === 'student' ? (
                                        !selectedClass ? (
                                            <TableRow><TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">Select a class to begin</Typography></TableCell></TableRow>
                                        ) : students.filter(s => s.class_id === selectedClass).map((s, idx) => (
                                            <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                                <TableCell>{idx + 1}</TableCell>
                                                <TableCell><Typography variant="body2" fontWeight={600}>{s.first_name} {s.last_name}</Typography></TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                                            <Chip key={key} label={label} size="small" clickable
                                                                sx={{
                                                                    bgcolor: quickStatuses[s.id] === key ? `${STATUS_COLORS[key]}30` : 'transparent',
                                                                    color: quickStatuses[s.id] === key ? STATUS_COLORS[key] : '#999',
                                                                    border: `1px solid ${quickStatuses[s.id] === key ? STATUS_COLORS[key] : '#ddd'}`,
                                                                    fontWeight: quickStatuses[s.id] === key ? 700 : 400,
                                                                    transition: 'all 0.15s',
                                                                }}
                                                                onClick={() => handleQuickToggle(s.id, key)}
                                                            />
                                                        ))}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : teachers.map((t, idx) => (
                                        <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell>{idx + 1}</TableCell>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{t.first_name} {t.last_name}</Typography></TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                                        <Chip key={key} label={label} size="small" clickable
                                                            sx={{
                                                                bgcolor: quickStatuses[t.id] === key ? `${STATUS_COLORS[key]}30` : 'transparent',
                                                                color: quickStatuses[t.id] === key ? STATUS_COLORS[key] : '#999',
                                                                border: `1px solid ${quickStatuses[t.id] === key ? STATUS_COLORS[key] : '#ddd'}`,
                                                                fontWeight: quickStatuses[t.id] === key ? 700 : 400,
                                                                transition: 'all 0.15s',
                                                            }}
                                                            onClick={() => handleQuickToggle(t.id, key)}
                                                        />
                                                    ))}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 4: Reports ══════════════════════════════════════════ */}
            {tabIndex === 4 && (
                <>
                    <Paper sx={{ p: 3, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={2}>Class Attendance Report</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Class</InputLabel>
                                <Select value={selectedClass} label="Class" onChange={e => setSelectedClass(e.target.value as any)}>
                                    {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <Button variant="contained" onClick={handleLoadReport} disabled={!selectedClass}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Generate Report</Button>
                        </Box>
                    </Paper>

                    {detailLoading && <LinearProgress sx={{ mb: 2 }} />}

                    {classFullReport.length > 0 && (
                        <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Adm. No</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Days</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Present</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Absent</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Late</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>%</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {classFullReport.map((r: any, i: number) => (
                                            <TableRow key={r.student_id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                                <TableCell>{i + 1}</TableCell>
                                                <TableCell><Typography variant="body2" fontWeight={600}>{r.student_name}</Typography></TableCell>
                                                <TableCell>{r.admission_number || '—'}</TableCell>
                                                <TableCell>{r.stats.total_days}</TableCell>
                                                <TableCell><Chip label={r.stats.present} size="small" sx={{ bgcolor: '#51CF6618', color: '#51CF66', fontWeight: 700 }} /></TableCell>
                                                <TableCell><Chip label={r.stats.absent} size="small" sx={{ bgcolor: '#DC354518', color: '#DC3545', fontWeight: 700 }} /></TableCell>
                                                <TableCell><Chip label={r.stats.late} size="small" sx={{ bgcolor: '#FCC41918', color: '#FCC419', fontWeight: 700 }} /></TableCell>
                                                <TableCell>
                                                    <Chip label={`${r.stats.percentage}%`} size="small"
                                                        sx={{ fontWeight: 700, bgcolor: `${r.stats.percentage >= 75 ? '#51CF66' : r.stats.percentage >= 50 ? '#FCC419' : '#DC3545'}18`, color: r.stats.percentage >= 75 ? '#51CF66' : r.stats.percentage >= 50 ? '#FCC419' : '#DC3545' }} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                </>
            )}

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
