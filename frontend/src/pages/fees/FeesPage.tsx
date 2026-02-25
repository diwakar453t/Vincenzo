import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchFeeGroups, createFeeGroup, updateFeeGroup, deleteFeeGroup,
    fetchFeeTypes, createFeeType, updateFeeType, deleteFeeType,
    assignFees, fetchAssignments, collectFee, fetchCollections, deleteCollection,
    fetchReceipt, fetchDefaulters, fetchFinancialSummary,
    clearFeeError, clearReceipt,
} from '../../store/slices/feeSlice';
import type { FeeGroupItem, FeeTypeItem, FeeCollectionItem } from '../../store/slices/feeSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchClasses } from '../../store/slices/classesSlice';
import {
    Box, Typography, Button, Paper, TextField, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, MenuItem, Select,
    FormControl, InputLabel, Tabs, Tab, Table, TableBody, TableCell, TableHead,
    TableRow, TableContainer, Divider, Checkbox, ListItemText, OutlinedInput,
} from '@mui/material';
import {
    Add, Edit, Delete, Refresh, Receipt, Assessment, AttachMoney,
    Print, Warning, TrendingUp, AccountBalanceWallet, Groups,
    LocalAtm, CreditCard, CurrencyRupee,
} from '@mui/icons-material';

const STATUS_COLORS: Record<string, string> = {
    paid: '#51CF66', partial: '#FCC419', unpaid: '#DC3545', overdue: '#FF6B35',
};
const METHOD_LABELS: Record<string, string> = {
    cash: '💵 Cash', cheque: '📄 Cheque', online: '🌐 Online', upi: '📱 UPI',
    bank_transfer: '🏦 Bank Transfer', card: '💳 Card',
};

export default function FeesPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { groups, types, assignments, collections, defaulters, summary,
        currentReceipt, loading, detailLoading, error } = useSelector((s: RootState) => s.fees);
    const { students } = useSelector((s: RootState) => s.students);
    const { classes: classList } = useSelector((s: RootState) => s.classes);

    const [tabIndex, setTabIndex] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

    // Group dialog
    const [groupDialog, setGroupDialog] = useState(false);
    const [editGroup, setEditGroup] = useState<FeeGroupItem | null>(null);
    const [groupForm, setGroupForm] = useState({ name: '', code: '', description: '' });

    // Type dialog
    const [typeDialog, setTypeDialog] = useState(false);
    const [editType, setEditType] = useState<FeeTypeItem | null>(null);
    const [typeForm, setTypeForm] = useState({
        fee_group_id: '' as number | '', name: '', code: '', amount: 0,
        due_date: '', is_recurring: false, frequency: '', description: '',
        class_id: '' as number | '',
    });

    // Assign dialog
    const [assignDialog, setAssignDialog] = useState(false);
    const [assignForm, setAssignForm] = useState({
        student_ids: [] as number[], fee_type_id: '' as number | '',
        amount: '' as number | '', discount: 0, due_date: '',
    });

    // Collect dialog
    const [collectDialog, setCollectDialog] = useState(false);
    const [collectForm, setCollectForm] = useState({
        student_id: '' as number | '', fee_type_id: '' as number | '',
        assignment_id: '' as number | '', amount: 0,
        payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0],
        transaction_id: '', remarks: '',
    });

    // Receipt dialog
    const [receiptDialog, setReceiptDialog] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    // Filters
    const [filterStudent, setFilterStudent] = useState<number | ''>('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        dispatch(fetchFeeGroups({}));
        dispatch(fetchFeeTypes({}));
        dispatch(fetchStudents({}));
        dispatch(fetchClasses({}));
    }, [dispatch]);

    useEffect(() => {
        if (tabIndex === 2) dispatch(fetchAssignments(
            filterStudent ? { student_id: filterStudent as number, status_filter: filterStatus || undefined } : { status_filter: filterStatus || undefined }));
        if (tabIndex === 3) dispatch(fetchCollections({}));
        if (tabIndex === 4) dispatch(fetchDefaulters({}));
        if (tabIndex === 5) dispatch(fetchFinancialSummary({}));
    }, [tabIndex, filterStudent, filterStatus, dispatch]);

    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearFeeError()); } }, [error, dispatch]);

    // ─── Group handlers ─────────────────────────────────────────────────
    const handleSaveGroup = async () => {
        if (editGroup) await dispatch(updateFeeGroup({ id: editGroup.id, data: groupForm }));
        else await dispatch(createFeeGroup(groupForm));
        setSnack({ open: true, msg: editGroup ? 'Updated!' : 'Created!', sev: 'success' });
        setGroupDialog(false); setEditGroup(null); dispatch(fetchFeeGroups({}));
    };

    const openEditGroup = (g: FeeGroupItem) => {
        setEditGroup(g); setGroupForm({ name: g.name, code: g.code || '', description: g.description || '' }); setGroupDialog(true);
    };

    // ─── Type handlers ──────────────────────────────────────────────────
    const handleSaveType = async () => {
        const payload = { ...typeForm, fee_group_id: typeForm.fee_group_id || undefined, class_id: typeForm.class_id || undefined };
        if (editType) await dispatch(updateFeeType({ id: editType.id, data: payload }));
        else await dispatch(createFeeType(payload));
        setSnack({ open: true, msg: editType ? 'Updated!' : 'Created!', sev: 'success' });
        setTypeDialog(false); setEditType(null); dispatch(fetchFeeTypes({}));
    };

    const openEditType = (t: FeeTypeItem) => {
        setEditType(t);
        setTypeForm({
            fee_group_id: t.fee_group_id, name: t.name, code: t.code || '', amount: t.amount,
            due_date: t.due_date || '', is_recurring: t.is_recurring, frequency: t.frequency || '',
            description: t.description || '', class_id: t.class_id || '',
        });
        setTypeDialog(true);
    };

    // ─── Assign handler ─────────────────────────────────────────────────
    const handleAssign = async () => {
        if (!assignForm.fee_type_id || assignForm.student_ids.length === 0) return;
        const result = await dispatch(assignFees({
            student_ids: assignForm.student_ids, fee_type_id: assignForm.fee_type_id,
            amount: assignForm.amount || undefined, discount: assignForm.discount,
            due_date: assignForm.due_date || undefined,
        }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: `Fees assigned to ${assignForm.student_ids.length} student(s)!`, sev: 'success' });
            setAssignDialog(false); setTabIndex(2);
        }
    };

    // ─── Collect handler ────────────────────────────────────────────────
    const handleCollect = async () => {
        if (!collectForm.student_id || !collectForm.fee_type_id) return;
        const result = await dispatch(collectFee(collectForm));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Payment collected!', sev: 'success' });
            setCollectDialog(false); dispatch(fetchAssignments({}));
        }
    };

    // ─── Receipt handler ────────────────────────────────────────────────
    const handleViewReceipt = (c: FeeCollectionItem) => {
        dispatch(fetchReceipt(c.id));
        setReceiptDialog(true);
    };

    const handlePrint = () => {
        if (printRef.current) {
            const w = window.open('', '_blank');
            if (w) {
                w.document.write('<html><head><title>Fee Receipt</title><style>body{font-family:Arial,sans-serif;margin:40px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #ddd;padding:10px;text-align:left}th{background:#f8f9fa}.header{text-align:center;margin-bottom:24px}h2{margin:0;color:#3D5EE1}.receipt-no{color:#666;font-size:14px}.amount{font-size:24px;font-weight:bold;color:#3D5EE1;text-align:center;padding:20px;border:2px solid #3D5EE1;border-radius:8px;margin-top:16px}</style></head><body>');
                w.document.write(printRef.current.innerHTML);
                w.document.write('</body></html>');
                w.document.close(); w.print();
            }
        }
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Fees Management</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Fees Management</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Define fee structures, collect payments, track dues</Typography>
                </Box>
            </Box>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Fee Groups', value: groups.length, icon: <Groups />, color: '#3D5EE1' },
                    { label: 'Fee Types', value: types.length, icon: <Receipt />, color: '#FCC419' },
                    { label: 'Assignments', value: assignments.length, icon: <AttachMoney />, color: '#51CF66' },
                    { label: 'Collections', value: collections.length, icon: <LocalAtm />, color: '#FF6B35' },
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
                    <Tab label="Fee Structure" icon={<AccountBalanceWallet sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Fee Types" icon={<Receipt sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Fee Collection" icon={<CurrencyRupee sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Payment History" icon={<CreditCard sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Dues & Defaulters" icon={<Warning sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Reports" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Fee Structure (Groups) ════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
                        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditGroup(null); setGroupForm({ name: '', code: '', description: '' }); setGroupDialog(true); }}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Group</Button>
                    </Box>
                    <Grid container spacing={2}>
                        {groups.map(g => (
                            <Grid key={g.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card sx={{ border: '1px solid rgba(0,0,0,0.06)', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }, transition: 'all 0.2s' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="h6" fontWeight={700}>{g.name}</Typography>
                                            <Box>
                                                <IconButton size="small" onClick={() => openEditGroup(g)}><Edit fontSize="small" /></IconButton>
                                                <IconButton size="small" color="error" onClick={() => dispatch(deleteFeeGroup(g.id))}><Delete fontSize="small" /></IconButton>
                                            </Box>
                                        </Box>
                                        {g.code && <Chip label={g.code} size="small" variant="outlined" sx={{ mb: 1 }} />}
                                        {g.description && <Typography variant="body2" color="text.secondary" mb={1}>{g.description}</Typography>}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                            <Chip label={`${g.fee_types_count || 0} types`} size="small" sx={{ bgcolor: '#3D5EE118', color: '#3D5EE1' }} />
                                            <Chip label={g.is_active ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: g.is_active ? '#51CF6618' : '#99918', color: g.is_active ? '#51CF66' : '#999' }} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                        {groups.length === 0 && !loading && (
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 6, textAlign: 'center' }}>
                                    <AccountBalanceWallet sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">No fee groups yet</Typography>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </>
            )}

            {/* ═══ Tab 1: Fee Types ════════════════════════════════════ */}
            {tabIndex === 1 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" startIcon={<Add />} onClick={() => {
                            setEditType(null);
                            setTypeForm({ fee_group_id: '', name: '', code: '', amount: 0, due_date: '', is_recurring: false, frequency: '', description: '', class_id: '' });
                            setTypeDialog(true);
                        }} sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Fee Type</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Group</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Recurring</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {types.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                            <Receipt sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No fee types defined</Typography>
                                        </TableCell></TableRow>
                                    ) : types.map(t => (
                                        <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{t.name}</Typography></TableCell>
                                            <TableCell><Chip label={t.fee_group_name} size="small" variant="outlined" /></TableCell>
                                            <TableCell>{t.class_name || 'All'}</TableCell>
                                            <TableCell align="right"><Typography variant="body2" fontWeight={700} sx={{ color: '#3D5EE1' }}>₹{t.amount.toLocaleString()}</Typography></TableCell>
                                            <TableCell>{t.due_date || '—'}</TableCell>
                                            <TableCell>{t.is_recurring ? <Chip label={t.frequency || 'Yes'} size="small" color="info" /> : '—'}</TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditType(t)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => dispatch(deleteFeeType(t.id))}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 2: Fee Collection ════════════════════════════════ */}
            {tabIndex === 2 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
                        <Button variant="outlined" startIcon={<Add />} onClick={() => {
                            setAssignForm({ student_ids: [], fee_type_id: '', amount: '', discount: 0, due_date: '' });
                            setAssignDialog(true);
                        }}>Assign Fees</Button>
                        <Button variant="contained" startIcon={<AttachMoney />} onClick={() => {
                            setCollectForm({ student_id: '', fee_type_id: '', assignment_id: '', amount: 0, payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0], transaction_id: '', remarks: '' });
                            setCollectDialog(true);
                        }} sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Collect Payment</Button>
                    </Box>

                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Student</InputLabel>
                            <Select value={filterStudent} label="Student" onChange={e => setFilterStudent(e.target.value as number)}>
                                <MenuItem value="">All Students</MenuItem>
                                {students.map(s => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="paid">Paid</MenuItem>
                                <MenuItem value="partial">Partial</MenuItem>
                                <MenuItem value="unpaid">Unpaid</MenuItem>
                                <MenuItem value="overdue">Overdue</MenuItem>
                            </Select>
                        </FormControl>
                    </Paper>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Fee Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Discount</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Paid</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Balance</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {assignments.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                            <AttachMoney sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No fee assignments</Typography>
                                        </TableCell></TableRow>
                                    ) : assignments.map(a => (
                                        <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{a.student_name || '—'}</Typography></TableCell>
                                            <TableCell>{a.fee_type_name || '—'}</TableCell>
                                            <TableCell align="right">₹{a.net_amount.toLocaleString()}</TableCell>
                                            <TableCell align="right">{a.discount > 0 ? `₹${a.discount.toLocaleString()}` : '—'}</TableCell>
                                            <TableCell align="right"><Typography sx={{ color: '#51CF66' }}>₹{a.paid_amount.toLocaleString()}</Typography></TableCell>
                                            <TableCell align="right"><Typography fontWeight={700} sx={{ color: a.balance > 0 ? '#DC3545' : '#51CF66' }}>₹{a.balance.toLocaleString()}</Typography></TableCell>
                                            <TableCell><Chip label={a.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[a.status] || '#999'}18`, color: STATUS_COLORS[a.status] || '#999', fontWeight: 700, textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell>{a.due_date || '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 3: Payment History ═══════════════════════════════ */}
            {tabIndex === 3 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Tooltip title="Refresh"><IconButton color="primary" onClick={() => dispatch(fetchCollections({}))}><Refresh /></IconButton></Tooltip>
                    </Paper>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Receipt #</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Fee Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {collections.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                            <CreditCard sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No payments recorded</Typography>
                                        </TableCell></TableRow>
                                    ) : collections.map(c => (
                                        <TableRow key={c.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600} sx={{ color: '#3D5EE1' }}>{c.receipt_number}</Typography></TableCell>
                                            <TableCell>{c.student_name || '—'}</TableCell>
                                            <TableCell>{c.fee_type_name || '—'}</TableCell>
                                            <TableCell align="right"><Typography fontWeight={700} sx={{ color: '#51CF66' }}>₹{c.amount.toLocaleString()}</Typography></TableCell>
                                            <TableCell>{METHOD_LABELS[c.payment_method] || c.payment_method}</TableCell>
                                            <TableCell>{c.payment_date}</TableCell>
                                            <TableCell>
                                                <Tooltip title="View Receipt"><IconButton size="small" onClick={() => handleViewReceipt(c)}><Receipt fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Print"><IconButton size="small" onClick={() => { handleViewReceipt(c); setTimeout(handlePrint, 500); }}><Print fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { dispatch(deleteCollection(c.id)); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 4: Dues & Defaulters ═════════════════════════════ */}
            {tabIndex === 4 && (
                <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    {loading && <LinearProgress />}
                    <TableContainer>
                        <Table>
                            <TableHead><TableRow sx={{ bgcolor: '#FFF3CD' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Total Due</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Total Paid</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Balance</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {defaulters.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                                        <Warning sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">No defaulters — all fees paid! 🎉</Typography>
                                    </TableCell></TableRow>
                                ) : defaulters.map((d, i) => (
                                    <TableRow key={i} sx={{ '&:hover': { bgcolor: 'rgba(220,53,69,0.04)' } }}>
                                        <TableCell><Typography variant="body2" fontWeight={600}>{d.student_name}</Typography></TableCell>
                                        <TableCell>{d.class_name || '—'}</TableCell>
                                        <TableCell align="right">₹{d.total_due.toLocaleString()}</TableCell>
                                        <TableCell align="right"><Typography sx={{ color: '#51CF66' }}>₹{d.total_paid.toLocaleString()}</Typography></TableCell>
                                        <TableCell align="right"><Typography fontWeight={700} sx={{ color: '#DC3545' }}>₹{d.balance.toLocaleString()}</Typography></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ═══ Tab 5: Financial Reports ═════════════════════════════ */}
            {tabIndex === 5 && (
                <>
                    {detailLoading && <LinearProgress sx={{ mb: 2 }} />}
                    {summary && (
                        <>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {[
                                    { label: 'Total Assigned', value: `₹${(summary.total_fees_assigned / 1000).toFixed(0)}K`, color: '#3D5EE1' },
                                    { label: 'Total Collected', value: `₹${(summary.total_collected / 1000).toFixed(0)}K`, color: '#51CF66' },
                                    { label: 'Outstanding', value: `₹${(summary.total_outstanding / 1000).toFixed(0)}K`, color: '#DC3545' },
                                    { label: 'Collection Rate', value: `${summary.collection_rate}%`, color: '#FF6B35' },
                                ].map((s, i) => (
                                    <Grid key={i} size={{ xs: 6, md: 3 }}>
                                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${s.color}30` }}>
                                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                                <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                                                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Payment method breakdown */}
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        <Typography variant="h6" fontWeight={700} mb={2}>Payment Methods</Typography>
                                        {Object.entries(summary.payment_method_breakdown).map(([method, amount]) => (
                                            <Box key={method} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                                <Typography variant="body2">{METHOD_LABELS[method] || method}</Typography>
                                                <Typography variant="body2" fontWeight={700}>₹{(amount as number).toLocaleString()}</Typography>
                                            </Box>
                                        ))}
                                        {Object.keys(summary.payment_method_breakdown).length === 0 && (
                                            <Typography color="text.secondary" variant="body2">No payments recorded yet</Typography>
                                        )}
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        <Typography variant="h6" fontWeight={700} mb={2}>Monthly Collections</Typography>
                                        {summary.monthly_collection.map((m, i) => (
                                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                                <Typography variant="body2">{m.month}</Typography>
                                                <Typography variant="body2" fontWeight={700} sx={{ color: '#51CF66' }}>₹{m.amount.toLocaleString()}</Typography>
                                            </Box>
                                        ))}
                                        {summary.monthly_collection.length === 0 && (
                                            <Typography color="text.secondary" variant="body2">No collections data yet</Typography>
                                        )}
                                    </Paper>
                                </Grid>
                            </Grid>

                            <Paper sx={{ p: 3, mt: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Total Discounts Given:</strong> ₹{summary.total_discount.toLocaleString()} |
                                    <strong> Academic Year:</strong> {summary.academic_year}
                                </Typography>
                            </Paper>
                        </>
                    )}
                </>
            )}

            {/* ═══ Group Dialog ═══════════════════════════════════════ */}
            <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editGroup ? 'Edit Fee Group' : 'New Fee Group'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 8 }}><TextField fullWidth label="Name" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Code" value={groupForm.code} onChange={e => setGroupForm({ ...groupForm, code: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Description" value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGroupDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveGroup} disabled={!groupForm.name}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editGroup ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Type Dialog ════════════════════════════════════════ */}
            <Dialog open={typeDialog} onClose={() => setTypeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editType ? 'Edit Fee Type' : 'New Fee Type'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Fee Group</InputLabel>
                                <Select value={typeForm.fee_group_id} label="Fee Group" onChange={e => setTypeForm({ ...typeForm, fee_group_id: e.target.value as number })}>
                                    {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 8 }}><TextField fullWidth label="Name" value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Code" value={typeForm.code} onChange={e => setTypeForm({ ...typeForm, code: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Amount" type="number" value={typeForm.amount} onChange={e => setTypeForm({ ...typeForm, amount: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Due Date" type="date" value={typeForm.due_date} InputLabelProps={{ shrink: true }} onChange={e => setTypeForm({ ...typeForm, due_date: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Class (Optional)</InputLabel>
                                <Select value={typeForm.class_id} label="Class (Optional)" onChange={e => setTypeForm({ ...typeForm, class_id: e.target.value as number })}>
                                    <MenuItem value="">All Classes</MenuItem>
                                    {classList.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Frequency</InputLabel>
                                <Select value={typeForm.frequency} label="Frequency" onChange={e => setTypeForm({ ...typeForm, frequency: e.target.value, is_recurring: !!e.target.value })}>
                                    <MenuItem value="">One-time</MenuItem>
                                    <MenuItem value="monthly">Monthly</MenuItem>
                                    <MenuItem value="quarterly">Quarterly</MenuItem>
                                    <MenuItem value="yearly">Yearly</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Description" value={typeForm.description} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTypeDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveType} disabled={!typeForm.name || !typeForm.fee_group_id}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editType ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Assign Dialog ══════════════════════════════════════ */}
            <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Assign Fees to Students</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth>
                                <InputLabel>Students</InputLabel>
                                <Select multiple value={assignForm.student_ids} label="Students" input={<OutlinedInput label="Students" />}
                                    onChange={e => setAssignForm({ ...assignForm, student_ids: e.target.value as number[] })}
                                    renderValue={sel => (sel as number[]).map(id => { const s = students.find(st => st.id === id); return s ? `${s.first_name} ${s.last_name}` : ''; }).join(', ')}>
                                    {students.map(s => (
                                        <MenuItem key={s.id} value={s.id}>
                                            <Checkbox checked={assignForm.student_ids.includes(s.id)} />
                                            <ListItemText primary={`${s.first_name} ${s.last_name}`} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Fee Type</InputLabel>
                                <Select value={assignForm.fee_type_id} label="Fee Type" onChange={e => setAssignForm({ ...assignForm, fee_type_id: e.target.value as number })}>
                                    {types.filter(t => t.is_active).map(t => <MenuItem key={t.id} value={t.id}>{t.name} (₹{t.amount})</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Amount Override" type="number" value={assignForm.amount} onChange={e => setAssignForm({ ...assignForm, amount: Number(e.target.value) || '' })} helperText="Leave empty to use fee type amount" /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Discount" type="number" value={assignForm.discount} onChange={e => setAssignForm({ ...assignForm, discount: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Due Date" type="date" value={assignForm.due_date} InputLabelProps={{ shrink: true }} onChange={e => setAssignForm({ ...assignForm, due_date: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAssign} disabled={assignForm.student_ids.length === 0 || !assignForm.fee_type_id}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Assign ({assignForm.student_ids.length})</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Collect Dialog ═════════════════════════════════════ */}
            <Dialog open={collectDialog} onClose={() => setCollectDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Collect Fee Payment</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Student</InputLabel>
                                <Select value={collectForm.student_id} label="Student" onChange={e => setCollectForm({ ...collectForm, student_id: e.target.value as number })}>
                                    {students.map(s => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Fee Type</InputLabel>
                                <Select value={collectForm.fee_type_id} label="Fee Type" onChange={e => setCollectForm({ ...collectForm, fee_type_id: e.target.value as number })}>
                                    {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Amount" type="number" value={collectForm.amount} onChange={e => setCollectForm({ ...collectForm, amount: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Payment Method</InputLabel>
                                <Select value={collectForm.payment_method} label="Payment Method" onChange={e => setCollectForm({ ...collectForm, payment_method: e.target.value })}>
                                    {Object.entries(METHOD_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Payment Date" type="date" value={collectForm.payment_date} InputLabelProps={{ shrink: true }} onChange={e => setCollectForm({ ...collectForm, payment_date: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Transaction ID" value={collectForm.transaction_id} onChange={e => setCollectForm({ ...collectForm, transaction_id: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Remarks" value={collectForm.remarks} onChange={e => setCollectForm({ ...collectForm, remarks: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCollectDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCollect} disabled={!collectForm.student_id || !collectForm.fee_type_id || !collectForm.amount}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Collect Payment</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Receipt Dialog ═════════════════════════════════════ */}
            <Dialog open={receiptDialog} onClose={() => { setReceiptDialog(false); dispatch(clearReceipt()); }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Fee Receipt
                    <Button startIcon={<Print />} onClick={handlePrint} variant="outlined" size="small">Print</Button>
                </DialogTitle>
                <DialogContent>
                    {detailLoading ? <LinearProgress /> : currentReceipt && (
                        <Box ref={printRef}>
                            <div className="header">
                                <h2 style={{ margin: 0, color: '#3D5EE1' }}>FEE RECEIPT</h2>
                                <p className="receipt-no" style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>Receipt No: {currentReceipt.receipt_number}</p>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
                                <tbody>
                                    <tr><td style={{ border: '1px solid #ddd', padding: 10 }}><strong>Student:</strong></td><td style={{ border: '1px solid #ddd', padding: 10 }}>{currentReceipt.student_name}</td></tr>
                                    <tr><td style={{ border: '1px solid #ddd', padding: 10 }}><strong>Fee Type:</strong></td><td style={{ border: '1px solid #ddd', padding: 10 }}>{currentReceipt.fee_type_name}</td></tr>
                                    <tr><td style={{ border: '1px solid #ddd', padding: 10 }}><strong>Payment Method:</strong></td><td style={{ border: '1px solid #ddd', padding: 10 }}>{METHOD_LABELS[currentReceipt.payment_method] || currentReceipt.payment_method}</td></tr>
                                    <tr><td style={{ border: '1px solid #ddd', padding: 10 }}><strong>Payment Date:</strong></td><td style={{ border: '1px solid #ddd', padding: 10 }}>{currentReceipt.payment_date}</td></tr>
                                    {currentReceipt.transaction_id && <tr><td style={{ border: '1px solid #ddd', padding: 10 }}><strong>Transaction ID:</strong></td><td style={{ border: '1px solid #ddd', padding: 10 }}>{currentReceipt.transaction_id}</td></tr>}
                                    {currentReceipt.remarks && <tr><td style={{ border: '1px solid #ddd', padding: 10 }}><strong>Remarks:</strong></td><td style={{ border: '1px solid #ddd', padding: 10 }}>{currentReceipt.remarks}</td></tr>}
                                </tbody>
                            </table>
                            <div className="amount" style={{ fontSize: 24, fontWeight: 'bold', color: '#3D5EE1', textAlign: 'center', padding: 20, border: '2px solid #3D5EE1', borderRadius: 8, marginTop: 16 }}>
                                Amount Paid: ₹{currentReceipt.amount.toLocaleString()}
                            </div>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setReceiptDialog(false)}>Close</Button></DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
