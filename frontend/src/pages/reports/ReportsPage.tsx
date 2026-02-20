import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchReportDashboard, generateReport, fetchSavedReports,
    saveReport, deleteSavedReport, exportReportCSV,
    clearReportsError,
} from '../../store/slices/reportsSlice';
import {
    Box, Typography, Button, Paper, TextField, Chip, IconButton, Tooltip,
    Grid, Card, CardContent, Snackbar, Alert, LinearProgress, Breadcrumbs,
    Link, Tabs, Tab, Table,
    TableBody, TableCell, TableHead, TableRow, TableContainer, CardActionArea,
} from '@mui/material';
import {
    Assessment, Download, Save, Delete, Refresh, ArrowBack,
    Description, TrendingUp, People, AccountBalance,
} from '@mui/icons-material';

const REPORT_ICONS: Record<string, React.ReactNode> = {
    student_attendance: <People sx={{ color: '#3D5EE1' }} />,
    staff_attendance: <People sx={{ color: '#51CF66' }} />,
    academic_performance: <TrendingUp sx={{ color: '#FCC419' }} />,
    financial_summary: <AccountBalance sx={{ color: '#DC3545' }} />,
    fee_collection: <Description sx={{ color: '#9B59B6' }} />,
};

const REPORT_COLORS: Record<string, string> = {
    student_attendance: '#3D5EE1', staff_attendance: '#51CF66',
    academic_performance: '#FCC419', financial_summary: '#DC3545',
    fee_collection: '#9B59B6',
};

export default function ReportsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { dashboard, currentReport, savedReports, loading, error } = useSelector((s: RootState) => s.reports);
    const [tabIndex, setTabIndex] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

    // Filter state
    const [reportType, setReportType] = useState('student_attendance');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [classId, setClassId] = useState<number | ''>('');
    const [studentId, setStudentId] = useState<number | ''>('');
    const [teacherId, setTeacherId] = useState<number | ''>('');

    useEffect(() => {
        dispatch(fetchReportDashboard());
    }, [dispatch]);

    useEffect(() => {
        if (tabIndex === 0) dispatch(fetchReportDashboard());
        if (tabIndex === 2) dispatch(fetchSavedReports({}));
    }, [tabIndex, dispatch]);

    useEffect(() => {
        if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearReportsError()); }
    }, [error, dispatch]);

    const handleGenerate = async () => {
        const params: any = { report_type: reportType };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (classId) params.class_id = classId;
        if (studentId) params.student_id = studentId;
        if (teacherId) params.teacher_id = teacherId;

        const result = await dispatch(generateReport(params));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Report generated!', sev: 'success' });
            setTabIndex(1);
        }
    };

    const handleSave = async () => {
        if (!currentReport) return;
        const params: any = { report_type: currentReport.report_type };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (classId) params.class_id = classId;
        if (studentId) params.student_id = studentId;
        const result = await dispatch(saveReport(params));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Report saved!', sev: 'success' });
            dispatch(fetchSavedReports({})); dispatch(fetchReportDashboard());
        }
    };

    const handleExport = () => {
        const params: any = { report_type: currentReport?.report_type || reportType };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (classId) params.class_id = classId;
        if (studentId) params.student_id = studentId;
        if (teacherId) params.teacher_id = teacherId;
        dispatch(exportReportCSV(params));
        setSnack({ open: true, msg: 'Downloading CSV...', sev: 'success' });
    };

    const quickGenerate = (type: string) => {
        setReportType(type);
        dispatch(generateReport({ report_type: type, start_date: startDate, end_date: endDate })).then((r) => {
            if (!r.type.endsWith('/rejected')) setTabIndex(1);
        });
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Reports</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>📊 Reports & Analytics</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Generate, preview, and export reports</Typography>
                </Box>
            </Box>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Reports', value: dashboard?.total_reports ?? 0, icon: <Assessment />, color: '#3D5EE1' },
                    { label: 'Report Types', value: dashboard?.available_report_types?.length ?? 5, icon: <Description />, color: '#51CF66' },
                    { label: 'Recent', value: dashboard?.recent_reports?.length ?? 0, icon: <TrendingUp />, color: '#FCC419' },
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
                    <Tab label="Generate" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Preview" icon={<Description sx={{ fontSize: 18 }} />} iconPosition="start" disabled={!currentReport} />
                    <Tab label="Saved Reports" icon={<Save sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Generate ═══════════════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    {/* Quick report type cards */}
                    <Typography variant="h6" fontWeight={700} mb={2}>📋 Choose Report Type</Typography>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        {(dashboard?.available_report_types || [
                            { type: 'student_attendance', label: 'Student Attendance', icon: '📋', description: 'Attendance with percentages' },
                            { type: 'staff_attendance', label: 'Staff Attendance', icon: '👨‍🏫', description: 'Staff attendance tracking' },
                            { type: 'academic_performance', label: 'Academic Performance', icon: '📊', description: 'Grades and exam results' },
                            { type: 'financial_summary', label: 'Financial Summary', icon: '💰', description: 'Revenue and dues overview' },
                            { type: 'fee_collection', label: 'Fee Collection', icon: '🧾', description: 'Collection records' },
                        ]).map((rt) => (
                            <Grid key={rt.type} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card sx={{
                                    border: reportType === rt.type ? `2px solid ${REPORT_COLORS[rt.type] || '#3D5EE1'}` : '1px solid rgba(0,0,0,0.06)',
                                    boxShadow: reportType === rt.type ? `0 4px 20px ${REPORT_COLORS[rt.type] || '#3D5EE1'}30` : '0 2px 8px rgba(0,0,0,0.04)',
                                    transition: 'all 0.2s',
                                    '&:hover': { boxShadow: `0 4px 20px ${REPORT_COLORS[rt.type] || '#3D5EE1'}20` },
                                }}>
                                    <CardActionArea onClick={() => setReportType(rt.type)} sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: `${REPORT_COLORS[rt.type] || '#3D5EE1'}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                                                {rt.icon}
                                            </Box>
                                            <Box>
                                                <Typography fontWeight={700}>{rt.label}</Typography>
                                                <Typography variant="caption" color="text.secondary">{rt.description}</Typography>
                                            </Box>
                                        </Box>
                                    </CardActionArea>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Filters */}
                    <Typography variant="h6" fontWeight={700} mb={2}>🔧 Report Filters</Typography>
                    <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <TextField fullWidth label="Start Date" type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <TextField fullWidth label="End Date" type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </Grid>
                            {(reportType === 'student_attendance' || reportType === 'academic_performance' || reportType === 'fee_collection') && (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <TextField fullWidth label="Class ID (optional)" type="number"
                                        value={classId} onChange={e => setClassId(e.target.value ? Number(e.target.value) : '')} />
                                </Grid>
                            )}
                            {(reportType === 'student_attendance' || reportType === 'academic_performance') && (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <TextField fullWidth label="Student ID (optional)" type="number"
                                        value={studentId} onChange={e => setStudentId(e.target.value ? Number(e.target.value) : '')} />
                                </Grid>
                            )}
                            {reportType === 'staff_attendance' && (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <TextField fullWidth label="Teacher ID (optional)" type="number"
                                        value={teacherId} onChange={e => setTeacherId(e.target.value ? Number(e.target.value) : '')} />
                                </Grid>
                            )}
                        </Grid>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                            <Button variant="contained" onClick={handleGenerate} disabled={loading}
                                startIcon={<Assessment />}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)', px: 4, py: 1.2 }}>
                                {loading ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </Box>
                    </Paper>

                    {/* Quick generate buttons */}
                    <Typography variant="subtitle2" color="text.secondary" mb={1}>⚡ Quick Generate</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {['student_attendance', 'staff_attendance', 'academic_performance', 'financial_summary', 'fee_collection'].map(type => (
                            <Chip key={type} label={type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                onClick={() => quickGenerate(type)} clickable variant="outlined"
                                sx={{
                                    fontWeight: 600, borderColor: REPORT_COLORS[type], color: REPORT_COLORS[type],
                                    '&:hover': { bgcolor: `${REPORT_COLORS[type]}12` }
                                }} />
                        ))}
                    </Box>
                </>
            )}

            {/* ═══ Tab 1: Preview ════════════════════════════════════════ */}
            {tabIndex === 1 && currentReport && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setTabIndex(0)} size="small">Back</Button>
                            <Typography variant="h6" fontWeight={700}>{currentReport.title}</Typography>
                            <Chip label={currentReport.report_type.replace(/_/g, ' ')}
                                sx={{ bgcolor: `${REPORT_COLORS[currentReport.report_type] || '#3D5EE1'}18`, color: REPORT_COLORS[currentReport.report_type] || '#3D5EE1', fontWeight: 700, textTransform: 'capitalize' }} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Save Report"><Button variant="outlined" startIcon={<Save />} onClick={handleSave} size="small">Save</Button></Tooltip>
                            <Tooltip title="Export CSV"><Button variant="contained" startIcon={<Download />} onClick={handleExport} size="small"
                                sx={{ background: 'linear-gradient(135deg, #51CF66, #40C057)' }}>Export CSV</Button></Tooltip>
                            <Tooltip title="Regenerate"><IconButton onClick={handleGenerate} size="small"><Refresh /></IconButton></Tooltip>
                        </Box>
                    </Box>

                    {/* Summary cards */}
                    {currentReport.summary && (
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            {Object.entries(currentReport.summary).filter(([_k, v]) => typeof v !== 'object').map(([key, value]) => (
                                <Grid key={key} size={{ xs: 6, sm: 4, md: 3 }}>
                                    <Card sx={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                                        <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</Typography>
                                            <Typography variant="h6" fontWeight={700}>{typeof value === 'number' ? value.toLocaleString() : String(value)}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Data meta */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">📅 Generated: {new Date(currentReport.generated_at).toLocaleString()}</Typography>
                        <Chip label={`${currentReport.record_count} records`} size="small" sx={{ fontWeight: 700 }} />
                    </Box>

                    {/* Data table */}
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer sx={{ maxHeight: 500 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        {currentReport.columns.map(col => (
                                            <TableCell key={col} sx={{ fontWeight: 700, textTransform: 'capitalize', bgcolor: '#f8f9fa', whiteSpace: 'nowrap' }}>
                                                {col.replace(/_/g, ' ')}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {currentReport.data.length === 0 ? (
                                        <TableRow><TableCell colSpan={currentReport.columns.length} sx={{ textAlign: 'center', py: 6 }}>
                                            <Assessment sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No data for selected filters</Typography>
                                        </TableCell></TableRow>
                                    ) : currentReport.data.map((row, i) => (
                                        <TableRow key={i} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            {currentReport.columns.map(col => (
                                                <TableCell key={col} sx={{ whiteSpace: 'nowrap' }}>
                                                    {col === 'attendance_pct' ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 60, height: 6, bgcolor: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                                                                <Box sx={{ width: `${row[col]}%`, height: '100%', bgcolor: Number(row[col]) >= 75 ? '#51CF66' : Number(row[col]) >= 50 ? '#FCC419' : '#DC3545', borderRadius: 3 }} />
                                                            </Box>
                                                            <Typography variant="body2" fontWeight={700} sx={{ color: Number(row[col]) >= 75 ? '#51CF66' : Number(row[col]) >= 50 ? '#FCC419' : '#DC3545' }}>{row[col]}%</Typography>
                                                        </Box>
                                                    ) : col === 'amount_paid' || col === 'collected' || col === 'total_amount' ? (
                                                        <Typography fontWeight={700} sx={{ color: '#3D5EE1' }}>₹{Number(row[col]).toLocaleString()}</Typography>
                                                    ) : col === 'avg_marks' || col === 'highest' || col === 'lowest' ? (
                                                        <Typography fontWeight={600}>{row[col]}</Typography>
                                                    ) : (
                                                        <Typography variant="body2">{row[col] ?? '—'}</Typography>
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 2: Saved Reports ══════════════════════════════════ */}
            {tabIndex === 2 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>💾 Saved Reports</Typography>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={() => dispatch(fetchSavedReports({}))} size="small">Refresh</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Format</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Records</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Generated</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {savedReports.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                                            <Save sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No saved reports</Typography>
                                            <Typography variant="body2" color="text.secondary">Generate and save a report to see it here</Typography>
                                        </TableCell></TableRow>
                                    ) : savedReports.map(r => (
                                        <TableRow key={r.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {REPORT_ICONS[r.report_type] || <Assessment />}
                                                    <Typography fontWeight={600}>{r.title}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={r.report_type.replace(/_/g, ' ')}
                                                    size="small" sx={{
                                                        textTransform: 'capitalize', fontWeight: 700,
                                                        bgcolor: `${REPORT_COLORS[r.report_type] || '#999'}18`,
                                                        color: REPORT_COLORS[r.report_type] || '#999'
                                                    }} />
                                            </TableCell>
                                            <TableCell><Chip label={r.format.toUpperCase()} size="small" variant="outlined" /></TableCell>
                                            <TableCell align="center"><Typography fontWeight={700}>{r.record_count}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{new Date(r.created_at).toLocaleDateString()}</Typography></TableCell>
                                            <TableCell>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={async () => {
                                                    await dispatch(deleteSavedReport(r.id));
                                                    dispatch(fetchReportDashboard());
                                                    setSnack({ open: true, msg: 'Report deleted', sev: 'success' });
                                                }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
