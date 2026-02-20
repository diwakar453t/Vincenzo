import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchComponents, createComponent, updateComponent, deleteComponent,
    fetchStructures, saveStructure, deleteStructure,
    processPayroll, fetchPayrolls, fetchPayroll, actionPayroll, deletePayroll,
    fetchSummary, fetchSalaryHistory, clearError, clearCurrentPayroll,
} from '../../store/slices/payrollSlice';
import type { PayrollComponentItem, SalaryStructureData, PayrollData } from '../../store/slices/payrollSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import {
    Box, Typography, Button, Paper, TextField, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, MenuItem, Select,
    FormControl, InputLabel, Tabs, Tab, Table, TableBody, TableCell, TableHead,
    TableRow, TableContainer, Switch, FormControlLabel, Divider,
} from '@mui/material';
import {
    Add, Refresh, Edit, Delete, CheckCircle, Schedule, AttachMoney,
    Receipt, Assessment, PlayArrow, Print, AccountBalance, TrendingUp,
    TrendingDown, Paid, Person,
} from '@mui/icons-material';

const STATUS_COLORS: Record<string, string> = {
    draft: '#999', processed: '#FCC419', approved: '#3D5EE1', paid: '#51CF66',
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PayrollPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { components, structures, payrolls, payTotal, currentPayroll,
        summary, salaryHistory, loading, detailLoading, error } = useSelector((s: RootState) => s.payroll);
    const { teachers } = useSelector((s: RootState) => s.teachers);

    // Tabs: 0=Salary Structure, 1=Process Payroll, 2=Payslips, 3=Reports, 4=Components
    const [tabIndex, setTabIndex] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

    // Process form
    const [procMonth, setProcMonth] = useState(new Date().getMonth() + 1);
    const [procYear, setProcYear] = useState(new Date().getFullYear());
    const [procWorking, setProcWorking] = useState(30);

    // View filters
    const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
    const [viewYear, setViewYear] = useState(new Date().getFullYear());

    // Component dialog
    const [compDialog, setCompDialog] = useState(false);
    const [editComp, setEditComp] = useState<PayrollComponentItem | null>(null);
    const [compForm, setCompForm] = useState({ name: '', code: '', component_type: 'earning' as string, is_percentage: false, percentage_of: '', default_amount: 0, description: '', sort_order: 0 });

    // Structure dialog
    const [structDialog, setStructDialog] = useState(false);
    const [structTeacher, setStructTeacher] = useState<number | ''>('');
    const [structItems, setStructItems] = useState<{ component_id: number; amount: number }[]>([]);

    // Payslip dialog
    const [slipDialog, setSlipDialog] = useState(false);

    // History
    const [histTeacher, setHistTeacher] = useState<number | ''>('');
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => { dispatch(fetchComponents({})); dispatch(fetchTeachers({})); }, [dispatch]);
    useEffect(() => { if (tabIndex === 0) dispatch(fetchStructures({})); }, [tabIndex, dispatch]);
    useEffect(() => { if (tabIndex === 1 || tabIndex === 2) dispatch(fetchPayrolls({ month: viewMonth, year: viewYear })); }, [tabIndex, viewMonth, viewYear, dispatch]);
    useEffect(() => { if (tabIndex === 3) dispatch(fetchSummary({ month: viewMonth, year: viewYear })); }, [tabIndex, viewMonth, viewYear, dispatch]);
    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearError()); } }, [error, dispatch]);

    const handleProcess = async () => {
        const result = await dispatch(processPayroll({ month: procMonth, year: procYear, working_days: procWorking }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: `Payroll processed for ${MONTHS[procMonth - 1]} ${procYear}!`, sev: 'success' });
            setTabIndex(2);
        }
    };

    const handleSaveComponent = async () => {
        if (editComp) await dispatch(updateComponent({ id: editComp.id, data: compForm }));
        else await dispatch(createComponent(compForm));
        setSnack({ open: true, msg: editComp ? 'Component updated!' : 'Component created!', sev: 'success' });
        setCompDialog(false); setEditComp(null); dispatch(fetchComponents({}));
    };

    const openEditComp = (c: PayrollComponentItem) => {
        setEditComp(c);
        setCompForm({ name: c.name, code: c.code || '', component_type: c.component_type, is_percentage: c.is_percentage, percentage_of: c.percentage_of || '', default_amount: c.default_amount, description: c.description || '', sort_order: c.sort_order });
        setCompDialog(true);
    };

    const openStructDialog = (s?: SalaryStructureData) => {
        if (s) {
            setStructTeacher(s.teacher_id);
            setStructItems(s.items.map(i => ({ component_id: i.component_id, amount: i.amount })));
        } else {
            setStructTeacher('');
            setStructItems(components.filter(c => c.is_active).map(c => ({ component_id: c.id, amount: c.default_amount })));
        }
        setStructDialog(true);
    };

    const handleSaveStructure = async () => {
        if (!structTeacher) return;
        const result = await dispatch(saveStructure({ teacher_id: structTeacher, items: structItems }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Salary structure saved!', sev: 'success' });
            setStructDialog(false); dispatch(fetchStructures({}));
        }
    };

    const handleViewPayslip = (p: PayrollData) => {
        dispatch(fetchPayroll(p.id));
        setSlipDialog(true);
    };

    const handlePrint = () => {
        if (printRef.current) {
            const w = window.open('', '_blank');
            if (w) {
                w.document.write('<html><head><title>Payslip</title><style>body{font-family:Arial,sans-serif;margin:40px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f8f9fa}.header{text-align:center;margin-bottom:20px}.totals{font-weight:bold;background:#f0f0f0}</style></head><body>');
                w.document.write(printRef.current.innerHTML);
                w.document.write('</body></html>');
                w.document.close(); w.print();
            }
        }
    };

    const handleLoadHistory = () => {
        if (histTeacher) dispatch(fetchSalaryHistory(histTeacher as number));
    };

    const earningTotal = structItems.reduce((acc, i) => {
        const comp = components.find(c => c.id === i.component_id);
        return acc + (comp?.component_type === 'earning' ? i.amount : 0);
    }, 0);
    const deductionTotal = structItems.reduce((acc, i) => {
        const comp = components.find(c => c.id === i.component_id);
        return acc + (comp?.component_type === 'deduction' ? i.amount : 0);
    }, 0);

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Payroll</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Payroll Management</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Configure salaries, process payroll, generate payslips</Typography>
                </Box>
            </Box>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Salary Structures', value: structures.length, icon: <AccountBalance />, color: '#3D5EE1' },
                    { label: 'Components', value: components.length, icon: <Receipt />, color: '#FCC419' },
                    { label: 'Payrolls', value: payTotal, icon: <AttachMoney />, color: '#51CF66' },
                    { label: 'Total Net Pay', value: `₹${(payrolls.reduce((s, p) => s + p.net_salary, 0) / 1000).toFixed(0)}K`, icon: <Paid />, color: '#FF6B35' },
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
                    <Tab label="Salary Structure" icon={<AccountBalance sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Process Payroll" icon={<PlayArrow sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Payslips" icon={<Receipt sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Reports" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Components" icon={<Schedule sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Salary Structure ════════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<Add />} onClick={() => openStructDialog()}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
                            Assign Salary</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Gross Salary</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Net Salary</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Components</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {structures.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                                            <AccountBalance sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No salary structures configured</Typography>
                                        </TableCell></TableRow>
                                    ) : structures.map(s => (
                                        <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{s.teacher_name || '—'}</Typography></TableCell>
                                            <TableCell align="right"><Typography variant="body2" fontWeight={700} sx={{ color: '#3D5EE1' }}>₹{s.gross_salary.toLocaleString()}</Typography></TableCell>
                                            <TableCell align="right"><Typography variant="body2" fontWeight={700} sx={{ color: '#51CF66' }}>₹{s.net_salary.toLocaleString()}</Typography></TableCell>
                                            <TableCell><Chip label={`${s.items.length} items`} size="small" variant="outlined" /></TableCell>
                                            <TableCell><Chip label={s.is_active ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: s.is_active ? '#51CF6618' : '#99918', color: s.is_active ? '#51CF66' : '#999' }} /></TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openStructDialog(s)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { dispatch(deleteStructure(s.id)); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 1: Process Payroll ═════════════════════════════════ */}
            {tabIndex === 1 && (
                <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <Typography variant="h6" fontWeight={700} mb={3}>Process Monthly Payroll</Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Month</InputLabel>
                                <Select value={procMonth} label="Month" onChange={e => setProcMonth(Number(e.target.value))}>
                                    {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField fullWidth label="Year" type="number" value={procYear} onChange={e => setProcYear(Number(e.target.value))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField fullWidth label="Working Days" type="number" value={procWorking} onChange={e => setProcWorking(Number(e.target.value))} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                This will generate payroll for <strong>all teachers</strong> with active salary structures for <strong>{MONTHS[procMonth - 1]} {procYear}</strong>. Existing payrolls will not be overwritten.
                            </Alert>
                            <Button variant="contained" size="large" startIcon={<PlayArrow />} onClick={handleProcess} disabled={loading}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', px: 4 }}>
                                {loading ? 'Processing...' : 'Process Payroll'}
                            </Button>
                        </Grid>
                    </Grid>

                    {/* Month filter & payroll list */}
                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight={600}>Payrolls:</Typography>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Month</InputLabel>
                            <Select value={viewMonth} label="Month" onChange={e => setViewMonth(Number(e.target.value))}>
                                {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Year" type="number" value={viewYear} onChange={e => setViewYear(Number(e.target.value))} sx={{ width: 100 }} />
                    </Box>
                    {loading && <LinearProgress />}
                    <Grid container spacing={2}>
                        {payrolls.map(p => (
                            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card sx={{ border: '1px solid rgba(0,0,0,0.06)', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }, transition: 'all 0.2s' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="subtitle1" fontWeight={700}>{p.teacher_name || '—'}</Typography>
                                            <Chip label={p.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[p.status]}18`, color: STATUS_COLORS[p.status], fontWeight: 700, textTransform: 'capitalize' }} />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" mb={1}>{MONTHS[p.month - 1]} {p.year}</Typography>
                                        <Grid container spacing={1}>
                                            <Grid size={{ xs: 4 }}><Typography variant="caption" color="text.secondary">Gross</Typography><Typography variant="body2" fontWeight={600}>₹{p.gross_salary.toLocaleString()}</Typography></Grid>
                                            <Grid size={{ xs: 4 }}><Typography variant="caption" color="text.secondary">Deductions</Typography><Typography variant="body2" fontWeight={600} color="error.main">₹{p.total_deductions.toLocaleString()}</Typography></Grid>
                                            <Grid size={{ xs: 4 }}><Typography variant="caption" color="text.secondary">Net</Typography><Typography variant="body2" fontWeight={700} sx={{ color: '#51CF66' }}>₹{p.net_salary.toLocaleString()}</Typography></Grid>
                                        </Grid>
                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, flexWrap: 'wrap' }}>
                                            {p.status === 'processed' && (
                                                <Button size="small" variant="outlined" color="primary" onClick={() => dispatch(actionPayroll({ id: p.id, data: { status: 'approved' } }))}>Approve</Button>
                                            )}
                                            {p.status === 'approved' && (
                                                <Button size="small" variant="outlined" color="success" onClick={() => dispatch(actionPayroll({ id: p.id, data: { status: 'paid', paid_date: new Date().toISOString().split('T')[0] } }))}>Mark Paid</Button>
                                            )}
                                            <Button size="small" variant="outlined" onClick={() => handleViewPayslip(p)}>Payslip</Button>
                                            <IconButton size="small" color="error" onClick={() => dispatch(deletePayroll(p.id))}><Delete fontSize="small" /></IconButton>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* ═══ Tab 2: Payslips ═══════════════════════════════════════ */}
            {tabIndex === 2 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Month</InputLabel>
                            <Select value={viewMonth} label="Month" onChange={e => setViewMonth(Number(e.target.value))}>
                                {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Year" type="number" value={viewYear} onChange={e => setViewYear(Number(e.target.value))} sx={{ width: 100 }} />
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Refresh"><IconButton color="primary" onClick={() => dispatch(fetchPayrolls({ month: viewMonth, year: viewYear }))}><Refresh /></IconButton></Tooltip>
                    </Paper>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Gross</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Deductions</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Net Pay</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {payrolls.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                                            <Receipt sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No payslips for this period</Typography>
                                        </TableCell></TableRow>
                                    ) : payrolls.map(p => (
                                        <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{p.teacher_name || '—'}</Typography></TableCell>
                                            <TableCell align="right"><Typography variant="body2">₹{p.gross_salary.toLocaleString()}</Typography></TableCell>
                                            <TableCell align="right"><Typography variant="body2" color="error.main">₹{p.total_deductions.toLocaleString()}</Typography></TableCell>
                                            <TableCell align="right"><Typography variant="body2" fontWeight={700} sx={{ color: '#51CF66' }}>₹{p.net_salary.toLocaleString()}</Typography></TableCell>
                                            <TableCell><Chip label={p.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[p.status]}18`, color: STATUS_COLORS[p.status], fontWeight: 700, textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell>
                                                <Tooltip title="View Payslip"><IconButton size="small" onClick={() => handleViewPayslip(p)}><Receipt fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Print"><IconButton size="small" onClick={() => { handleViewPayslip(p); setTimeout(handlePrint, 500); }}><Print fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 3: Reports ════════════════════════════════════════ */}
            {tabIndex === 3 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <FormControl size="small" sx={{ minWidth: 130 }}><InputLabel>Month</InputLabel>
                            <Select value={viewMonth} label="Month" onChange={e => setViewMonth(Number(e.target.value))}>
                                {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Year" type="number" value={viewYear} onChange={e => setViewYear(Number(e.target.value))} sx={{ width: 100 }} />
                    </Paper>

                    {detailLoading && <LinearProgress sx={{ mb: 2 }} />}

                    {summary && (
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            {[
                                { label: 'Teachers', value: summary.total_teachers, icon: <Person />, color: '#3D5EE1' },
                                { label: 'Total Earnings', value: `₹${(summary.total_earnings / 1000).toFixed(0)}K`, icon: <TrendingUp />, color: '#51CF66' },
                                { label: 'Total Deductions', value: `₹${(summary.total_deductions / 1000).toFixed(0)}K`, icon: <TrendingDown />, color: '#DC3545' },
                                { label: 'Net Payable', value: `₹${(summary.total_net / 1000).toFixed(0)}K`, icon: <Paid />, color: '#FF6B35' },
                            ].map((s, i) => (
                                <Grid key={i} size={{ xs: 6, md: 3 }}>
                                    <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${s.color}30` }}>
                                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                                            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</Box>
                                            <Box>
                                                <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                                                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Salary History */}
                    <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="h6" fontWeight={700} mb={2}>Salary History</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Teacher</InputLabel>
                                <Select value={histTeacher} label="Teacher" onChange={e => setHistTeacher(e.target.value as number)}>
                                    {teachers.map(t => <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <Button variant="contained" onClick={handleLoadHistory} disabled={!histTeacher}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>View History</Button>
                        </Box>
                        {salaryHistory && (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Gross</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Net</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Paid Date</TableCell>
                                    </TableRow></TableHead>
                                    <TableBody>
                                        {salaryHistory.history.map((h, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{MONTHS[h.month - 1]} {h.year}</TableCell>
                                                <TableCell align="right">₹{h.gross_salary.toLocaleString()}</TableCell>
                                                <TableCell align="right"><Typography fontWeight={700} sx={{ color: '#51CF66' }}>₹{h.net_salary.toLocaleString()}</Typography></TableCell>
                                                <TableCell><Chip label={h.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[h.status]}18`, color: STATUS_COLORS[h.status], fontWeight: 700, textTransform: 'capitalize' }} /></TableCell>
                                                <TableCell>{h.paid_date || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>
                </>
            )}

            {/* ═══ Tab 4: Components ═════════════════════════════════════ */}
            {tabIndex === 4 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditComp(null); setCompForm({ name: '', code: '', component_type: 'earning', is_percentage: false, percentage_of: '', default_amount: 0, description: '', sort_order: 0 }); setCompDialog(true); }}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Component</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Default Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {components.map(c => (
                                        <TableRow key={c.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{c.name}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{c.code || '—'}</Typography></TableCell>
                                            <TableCell>
                                                <Chip label={c.component_type} size="small" sx={{ bgcolor: c.component_type === 'earning' ? '#51CF6618' : '#DC354518', color: c.component_type === 'earning' ? '#51CF66' : '#DC3545', fontWeight: 700, textTransform: 'capitalize' }} />
                                            </TableCell>
                                            <TableCell align="right"><Typography variant="body2">₹{c.default_amount.toLocaleString()}</Typography></TableCell>
                                            <TableCell><Chip label={c.is_active ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: c.is_active ? '#51CF6618' : '#99918', color: c.is_active ? '#51CF66' : '#999' }} /></TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditComp(c)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => dispatch(deleteComponent(c.id))}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Component Dialog ═══════════════════════════════════════ */}
            <Dialog open={compDialog} onClose={() => setCompDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editComp ? 'Edit Component' : 'New Component'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 8 }}><TextField fullWidth label="Name" value={compForm.name} onChange={e => setCompForm({ ...compForm, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Code" value={compForm.code} onChange={e => setCompForm({ ...compForm, code: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Type</InputLabel>
                                <Select value={compForm.component_type} label="Type" onChange={e => setCompForm({ ...compForm, component_type: e.target.value })}>
                                    <MenuItem value="earning">Earning</MenuItem>
                                    <MenuItem value="deduction">Deduction</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Default Amount" type="number" value={compForm.default_amount} onChange={e => setCompForm({ ...compForm, default_amount: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Sort Order" type="number" value={compForm.sort_order} onChange={e => setCompForm({ ...compForm, sort_order: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 8 }}><TextField fullWidth multiline rows={2} label="Description" value={compForm.description} onChange={e => setCompForm({ ...compForm, description: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControlLabel control={<Switch checked={compForm.is_percentage} onChange={e => setCompForm({ ...compForm, is_percentage: e.target.checked })} />} label="Percentage Based" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveComponent} disabled={!compForm.name}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editComp ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Structure Dialog ═══════════════════════════════════════ */}
            <Dialog open={structDialog} onClose={() => setStructDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Salary Structure</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth>
                                <InputLabel>Teacher</InputLabel>
                                <Select value={structTeacher} label="Teacher" onChange={e => setStructTeacher(e.target.value as number)}>
                                    {teachers.map(t => <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle2" fontWeight={600} mb={1}>Components</Typography>
                            {structItems.map((item, idx) => {
                                const comp = components.find(c => c.id === item.component_id);
                                return (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                        <Chip label={comp?.component_type === 'earning' ? '↑' : '↓'} size="small"
                                            sx={{ bgcolor: comp?.component_type === 'earning' ? '#51CF6618' : '#DC354518', color: comp?.component_type === 'earning' ? '#51CF66' : '#DC3545', fontWeight: 700 }} />
                                        <Typography variant="body2" sx={{ minWidth: 150 }}>{comp?.name || 'Unknown'}</Typography>
                                        <TextField size="small" label="Amount" type="number" value={item.amount}
                                            onChange={e => { const n = [...structItems]; n[idx].amount = Number(e.target.value); setStructItems(n); }}
                                            sx={{ width: 150 }} />
                                        <IconButton size="small" color="error" onClick={() => setStructItems(structItems.filter((_, i) => i !== idx))}><Delete fontSize="small" /></IconButton>
                                    </Box>
                                );
                            })}
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="success.main"><strong>Total Earnings:</strong> ₹{earningTotal.toLocaleString()}</Typography>
                                <Typography variant="body2" color="error.main"><strong>Total Deductions:</strong> ₹{deductionTotal.toLocaleString()}</Typography>
                                <Typography variant="body2" fontWeight={700}><strong>Net Salary:</strong> ₹{(earningTotal - deductionTotal).toLocaleString()}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStructDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveStructure} disabled={!structTeacher || structItems.length === 0}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Save Structure</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Payslip Dialog (Printable) ════════════════════════════ */}
            <Dialog open={slipDialog} onClose={() => { setSlipDialog(false); dispatch(clearCurrentPayroll()); }} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Payslip
                    <Button startIcon={<Print />} onClick={handlePrint} variant="outlined" size="small">Print</Button>
                </DialogTitle>
                <DialogContent>
                    {detailLoading ? <LinearProgress /> : currentPayroll && (
                        <Box ref={printRef}>
                            <div className="header">
                                <h2 style={{ margin: 0 }}>PAYSLIP</h2>
                                <p style={{ margin: '4px 0', color: '#666' }}>{MONTHS[(currentPayroll.month || 1) - 1]} {currentPayroll.year}</p>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                                <tbody>
                                    <tr><td style={{ border: '1px solid #ddd', padding: 8 }}><strong>Employee:</strong></td><td style={{ border: '1px solid #ddd', padding: 8 }}>{currentPayroll.teacher_name}</td>
                                        <td style={{ border: '1px solid #ddd', padding: 8 }}><strong>Working Days:</strong></td><td style={{ border: '1px solid #ddd', padding: 8 }}>{currentPayroll.working_days}</td></tr>
                                    <tr><td style={{ border: '1px solid #ddd', padding: 8 }}><strong>Status:</strong></td><td style={{ border: '1px solid #ddd', padding: 8 }}>{currentPayroll.status}</td>
                                        <td style={{ border: '1px solid #ddd', padding: 8 }}><strong>Present Days:</strong></td><td style={{ border: '1px solid #ddd', padding: 8 }}>{currentPayroll.present_days}</td></tr>
                                </tbody>
                            </table>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ bgcolor: '#51CF6618', p: 1, borderRadius: 1 }}>Earnings</Typography>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            {currentPayroll.items.filter(i => i.component_type === 'earning').map(i => (
                                                <tr key={i.id}><td style={{ border: '1px solid #ddd', padding: 8 }}>{i.component_name}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>₹{i.amount.toLocaleString()}</td></tr>
                                            ))}
                                            <tr className="totals"><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 700, background: '#f0f0f0' }}>Total Earnings</td>
                                                <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right', fontWeight: 700, background: '#f0f0f0' }}>₹{currentPayroll.total_earnings.toLocaleString()}</td></tr>
                                        </tbody>
                                    </table>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ bgcolor: '#DC354518', p: 1, borderRadius: 1 }}>Deductions</Typography>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            {currentPayroll.items.filter(i => i.component_type === 'deduction').map(i => (
                                                <tr key={i.id}><td style={{ border: '1px solid #ddd', padding: 8 }}>{i.component_name}</td>
                                                    <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>₹{i.amount.toLocaleString()}</td></tr>
                                            ))}
                                            <tr className="totals"><td style={{ border: '1px solid #ddd', padding: 8, fontWeight: 700, background: '#f0f0f0' }}>Total Deductions</td>
                                                <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right', fontWeight: 700, background: '#f0f0f0' }}>₹{currentPayroll.total_deductions.toLocaleString()}</td></tr>
                                        </tbody>
                                    </table>
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 2, p: 2, bgcolor: '#3D5EE108', border: '2px solid #3D5EE1', borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight={700} sx={{ color: '#3D5EE1' }}>Net Salary: ₹{currentPayroll.net_salary.toLocaleString()}</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setSlipDialog(false)}>Close</Button></DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
