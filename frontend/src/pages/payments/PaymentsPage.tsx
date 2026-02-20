import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchPayments, fetchPaymentStats, initiatePayment, verifyPayment,
    fetchReceipt, initiateRefund, clearPaymentsError, clearReceipt,
} from '../../store/slices/paymentsSlice';
import {
    Box, Typography, Button, Paper, Grid, Card, CardContent, Tabs, Tab,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Divider,
    List, ListItem, ListItemText, ListItemIcon, Table, TableHead,
    TableBody, TableRow, TableCell, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
    Payment, Receipt, Refresh, TrendingUp, AccountBalanceWallet,
    CheckCircle, Cancel, CurrencyRupee, QrCode2, Print,
} from '@mui/icons-material';

const STATUS_CHIPS: Record<string, { color: any; label: string }> = {
    initiated: { color: 'info', label: 'Initiated' },
    pending: { color: 'warning', label: 'Pending' },
    completed: { color: 'success', label: 'Completed' },
    captured: { color: 'success', label: 'Captured' },
    failed: { color: 'error', label: 'Failed' },
    refunded: { color: 'secondary', label: 'Refunded' },
    partially_refunded: { color: 'secondary', label: 'Partial Refund' },
    cancelled: { color: 'default', label: 'Cancelled' },
};

const PURPOSE_LABELS: Record<string, string> = {
    tuition_fee: '🎓 Tuition Fee', exam_fee: '📝 Exam Fee', transport_fee: '🚌 Transport',
    hostel_fee: '🏠 Hostel', library_fine: '📚 Library Fine', admission_fee: '📋 Admission',
    sports_fee: '⚽ Sports', lab_fee: '🔬 Lab Fee', other: '💰 Other',
};

function formatCurrency(amount: number) { return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`; }
function timeAgo(d: string) {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'just now'; if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`; return `${Math.floor(diff / 86400)}d ago`;
}

export default function PaymentsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { transactions, total, stats, currentReceipt, loading, processing, error } = useSelector((s: RootState) => s.payments);
    const [tab, setTab] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPurpose, setFilterPurpose] = useState('');

    // Pay dialog
    const [payDialog, setPayDialog] = useState(false);
    const [payForm, setPayForm] = useState({ amount: '', purpose: 'tuition_fee', description: '', student_id: '', payer_name: '', payer_email: '', payer_phone: '', payment_method: 'upi' });

    // Receipt dialog
    const [receiptDialog, setReceiptDialog] = useState(false);

    // Refund dialog
    const [refundDialog, setRefundDialog] = useState(false);
    const [refundTxnId, setRefundTxnId] = useState(0);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');

    useEffect(() => { dispatch(fetchPayments({})); dispatch(fetchPaymentStats()); }, [dispatch]);
    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearPaymentsError()); } }, [error, dispatch]);
    useEffect(() => {
        const params: any = {};
        if (filterStatus) params.status = filterStatus;
        if (filterPurpose) params.purpose = filterPurpose;
        dispatch(fetchPayments(params));
    }, [filterStatus, filterPurpose, dispatch]);

    // Handle payment initiation
    const handlePay = async () => {
        if (!payForm.amount || parseFloat(payForm.amount) <= 0) return;
        const data: any = { amount: parseFloat(payForm.amount), purpose: payForm.purpose, payment_method: payForm.payment_method };
        if (payForm.description) data.description = payForm.description;
        if (payForm.student_id) data.student_id = parseInt(payForm.student_id);
        if (payForm.payer_name) data.payer_name = payForm.payer_name;
        if (payForm.payer_email) data.payer_email = payForm.payer_email;
        if (payForm.payer_phone) data.payer_phone = payForm.payer_phone;

        const result = await dispatch(initiatePayment(data));
        if (!result.type.endsWith('/rejected')) {
            setPayDialog(false);
            setPayForm({ amount: '', purpose: 'tuition_fee', description: '', student_id: '', payer_name: '', payer_email: '', payer_phone: '', payment_method: 'upi' });

            const payload = result.payload as any;
            if (payload.gateway_mode === 'demo') {
                // In demo mode, auto-verify
                const demoPaymentId = `pay_demo_${Date.now()}`;
                await dispatch(verifyPayment({ order_id: payload.razorpay_order_id, payment_id: demoPaymentId, signature: `demo_sig_${demoPaymentId}` }));
                setSnack({ open: true, msg: `Demo payment of ${formatCurrency(payload.amount)} completed!`, sev: 'success' });
                dispatch(fetchPaymentStats());
            } else {
                setSnack({ open: true, msg: `Payment order created — complete via UPI`, sev: 'success' });
            }
            dispatch(fetchPayments({}));
        }
    };

    const handleViewReceipt = async (txnId: number) => {
        await dispatch(fetchReceipt(txnId));
        setReceiptDialog(true);
    };

    const handleRefund = async () => {
        if (!refundTxnId) return;
        const data: any = { transaction_id: refundTxnId, reason: refundReason || 'Admin refund' };
        if (refundAmount) data.amount = parseFloat(refundAmount);
        const result = await dispatch(initiateRefund(data));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Refund processed!', sev: 'success' });
            setRefundDialog(false); setRefundTxnId(0); setRefundAmount(''); setRefundReason('');
            dispatch(fetchPaymentStats());
        }
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Payments</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>💳 UPI Payments</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage payments, receipts, and refunds</Typography>
                </Box>
                <Button variant="contained" startIcon={<Payment />} onClick={() => setPayDialog(true)}
                    sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', fontWeight: 700 }}>New Payment</Button>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Collected', value: formatCurrency(stats?.total_collected ?? 0), icon: <TrendingUp />, color: '#51CF66' },
                    { label: 'Pending', value: formatCurrency(stats?.total_pending ?? 0), icon: <AccountBalanceWallet />, color: '#FCC419' },
                    { label: 'Refunded', value: formatCurrency(stats?.total_refunded ?? 0), icon: <Refresh />, color: '#DC3545' },
                    { label: 'Transactions', value: stats?.total_transactions ?? 0, icon: <CurrencyRupee />, color: '#3D5EE1' },
                ].map((s, i) => (
                    <Grid key={i} size={{ xs: 6, md: 3 }}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</Box>
                                <Box><Typography variant="h5" fontWeight={700}>{s.value}</Typography><Typography variant="caption" color="text.secondary">{s.label}</Typography></Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
                    <Tab label={`All Transactions (${total})`} icon={<Payment sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Analytics" icon={<TrendingUp sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Tab 0: Transaction List */}
            {tab === 0 && (
                <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}><InputLabel>Status</InputLabel>
                            <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                {Object.entries(STATUS_CHIPS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                            </Select></FormControl>
                        <FormControl size="small" sx={{ minWidth: 140 }}><InputLabel>Purpose</InputLabel>
                            <Select value={filterPurpose} label="Purpose" onChange={e => setFilterPurpose(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                {Object.entries(PURPOSE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                            </Select></FormControl>
                    </Box>
                    {loading && <LinearProgress />}
                    {transactions.length === 0 ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Payment sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="h6" color="text.secondary">No transactions yet</Typography>
                            <Typography variant="body2" color="text.secondary">Click "New Payment" to start</Typography>
                        </Box>
                    ) : (
                        <Table>
                            <TableHead><TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Receipt</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Purpose</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {transactions.map(t => (
                                    <TableRow key={t.id} hover>
                                        <TableCell><Typography variant="body2" fontWeight={600} fontFamily="monospace">{t.receipt_number}</Typography></TableCell>
                                        <TableCell><Typography variant="body2">{PURPOSE_LABELS[t.purpose] || t.purpose}</Typography></TableCell>
                                        <TableCell><Typography fontWeight={700}>{formatCurrency(t.amount)}</Typography></TableCell>
                                        <TableCell><Chip label={t.payment_method.toUpperCase()} size="small" sx={{ fontWeight: 700, fontSize: 10, height: 20 }} icon={t.payment_method === 'upi' ? <QrCode2 sx={{ fontSize: '14px !important' }} /> : undefined} /></TableCell>
                                        <TableCell><Chip label={STATUS_CHIPS[t.status]?.label || t.status} color={STATUS_CHIPS[t.status]?.color || 'default'} size="small" sx={{ fontWeight: 700, height: 22 }} /></TableCell>
                                        <TableCell><Typography variant="caption" color="text.secondary">{timeAgo(t.created_at)}</Typography></TableCell>
                                        <TableCell>
                                            {(t.status === 'completed' || t.status === 'captured') && (
                                                <>
                                                    <IconButton size="small" title="View Receipt" onClick={() => handleViewReceipt(t.id)}><Receipt fontSize="small" sx={{ color: '#3D5EE1' }} /></IconButton>
                                                    <IconButton size="small" title="Refund" onClick={() => { setRefundTxnId(t.id); setRefundAmount(String(t.amount)); setRefundDialog(true); }}>
                                                        <Refresh fontSize="small" sx={{ color: '#DC3545' }} /></IconButton>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Paper>
            )}

            {/* Tab 1: Analytics */}
            {tab === 1 && stats && (
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Typography fontWeight={700} mb={2}>📊 By Payment Method</Typography>
                            {stats.by_method.length === 0 ? (
                                <Typography color="text.secondary" variant="body2">No data yet</Typography>
                            ) : (
                                <List>{stats.by_method.map(m => (
                                    <ListItem key={m.method}>
                                        <ListItemIcon><QrCode2 sx={{ color: '#3D5EE1' }} /></ListItemIcon>
                                        <ListItemText primary={m.method.toUpperCase()} secondary={`${m.count} transactions`} />
                                        <Typography fontWeight={700}>{formatCurrency(m.amount)}</Typography>
                                    </ListItem>
                                ))}</List>
                            )}
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Typography fontWeight={700} mb={2}>📋 By Purpose</Typography>
                            {stats.by_purpose.length === 0 ? (
                                <Typography color="text.secondary" variant="body2">No data yet</Typography>
                            ) : (
                                <List>{stats.by_purpose.map(p => (
                                    <ListItem key={p.purpose}>
                                        <ListItemText primary={PURPOSE_LABELS[p.purpose] || p.purpose} secondary={`${p.count} payments`} />
                                        <Typography fontWeight={700}>{formatCurrency(p.amount)}</Typography>
                                    </ListItem>
                                ))}</List>
                            )}
                        </Paper>
                    </Grid>
                    <Grid size={12}>
                        <Paper sx={{ p: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Typography fontWeight={700} mb={2}>📈 Summary</Typography>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Completed', count: stats.completed_count, icon: <CheckCircle />, color: '#51CF66' },
                                    { label: 'Failed', count: stats.failed_count, icon: <Cancel />, color: '#DC3545' },
                                    { label: 'Refunded', count: stats.refunded_count, icon: <Refresh />, color: '#9B59B6' },
                                ].map((s, i) => (
                                    <Grid key={i} size={{ xs: 4 }}>
                                        <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: `${s.color}08` }}>
                                            <Box sx={{ color: s.color, mb: 1 }}>{s.icon}</Box>
                                            <Typography variant="h4" fontWeight={700}>{s.count}</Typography>
                                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Pay Dialog */}
            <Dialog open={payDialog} onClose={() => setPayDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>💳 New Payment</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={6}><TextField fullWidth label="Amount (₹)" type="number" required value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} /></Grid>
                        <Grid size={6}><FormControl fullWidth><InputLabel>Purpose</InputLabel><Select value={payForm.purpose} label="Purpose" onChange={e => setPayForm({ ...payForm, purpose: e.target.value })}>
                            {Object.entries(PURPOSE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                        </Select></FormControl></Grid>
                        <Grid size={6}><FormControl fullWidth><InputLabel>Method</InputLabel><Select value={payForm.payment_method} label="Method" onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                            <MenuItem value="upi">UPI</MenuItem><MenuItem value="card">Card</MenuItem>
                            <MenuItem value="netbanking">Netbanking</MenuItem><MenuItem value="wallet">Wallet</MenuItem>
                            <MenuItem value="cash">Cash</MenuItem><MenuItem value="cheque">Cheque</MenuItem>
                        </Select></FormControl></Grid>
                        <Grid size={6}><TextField fullWidth label="Student ID" type="number" value={payForm.student_id} onChange={e => setPayForm({ ...payForm, student_id: e.target.value })} /></Grid>
                        <Grid size={12}><TextField fullWidth label="Description" value={payForm.description} onChange={e => setPayForm({ ...payForm, description: e.target.value })} /></Grid>
                        <Grid size={4}><TextField fullWidth label="Payer Name" value={payForm.payer_name} onChange={e => setPayForm({ ...payForm, payer_name: e.target.value })} /></Grid>
                        <Grid size={4}><TextField fullWidth label="Email" value={payForm.payer_email} onChange={e => setPayForm({ ...payForm, payer_email: e.target.value })} /></Grid>
                        <Grid size={4}><TextField fullWidth label="Phone" value={payForm.payer_phone} onChange={e => setPayForm({ ...payForm, payer_phone: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setPayDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handlePay} disabled={processing} startIcon={<Payment />}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', fontWeight: 700 }}>
                        {processing ? 'Processing…' : 'Pay Now'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Receipt Dialog */}
            <Dialog open={receiptDialog} onClose={() => { setReceiptDialog(false); dispatch(clearReceipt()); }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Receipt sx={{ color: '#3D5EE1' }} /> Payment Receipt
                </DialogTitle>
                {currentReceipt && (
                    <DialogContent>
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <Typography variant="h5" fontWeight={700}>{currentReceipt.school_name}</Typography>
                            <Typography variant="caption" color="text.secondary">PAYMENT RECEIPT</Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={1.5}>
                            {[
                                ['Receipt No.', currentReceipt.receipt_number],
                                ['Amount', formatCurrency(currentReceipt.amount)],
                                ['Purpose', PURPOSE_LABELS[currentReceipt.purpose] || currentReceipt.purpose],
                                ['Status', currentReceipt.status.toUpperCase()],
                                ['Payment ID', currentReceipt.payment_id || '—'],
                                ['Payer', currentReceipt.payer_name || '—'],
                                ['Date', currentReceipt.paid_at ? new Date(currentReceipt.paid_at).toLocaleString() : '—'],
                            ].map(([label, value], i) => (
                                <Grid key={i} size={6}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={600}>{value}</Typography></Grid>
                            ))}
                        </Grid>
                    </DialogContent>
                )}
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => { setReceiptDialog(false); dispatch(clearReceipt()); }}>Close</Button>
                    <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>Print</Button>
                </DialogActions>
            </Dialog>

            {/* Refund Dialog */}
            <Dialog open={refundDialog} onClose={() => setRefundDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: '#DC3545' }}>💸 Process Refund</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Refund Amount (₹)" type="number" sx={{ mt: 2, mb: 2 }} value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
                    <TextField fullWidth label="Reason" value={refundReason} onChange={e => setRefundReason(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setRefundDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleRefund} disabled={processing}>Process Refund</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
