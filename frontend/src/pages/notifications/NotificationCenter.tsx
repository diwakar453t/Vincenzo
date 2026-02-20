import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchNotifications, fetchNotificationStats, markAsRead, markAllRead,
    deleteNotification, clearAllNotifications, sendNotification,
    broadcastNotification, fetchPreferences, updatePreferences,
    clearNotificationsError,
} from '../../store/slices/notificationsSlice';
import {
    Box, Typography, Button, Paper, TextField, Chip, IconButton,
    Grid, Card, CardContent, Snackbar, Alert, LinearProgress, Breadcrumbs,
    Link, Tabs, Tab,
    Switch, Dialog, DialogTitle,
    DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel,
    List, ListItem, ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import {
    Notifications, DoneAll, Delete, Send, Campaign, Settings,
    Info, Warning, Error as ErrorIcon, CheckCircle, Schedule, PriorityHigh,
    Email, Sms, PhoneAndroid, NotificationsActive, ClearAll,
} from '@mui/icons-material';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    info: <Info sx={{ color: '#3D5EE1' }} />,
    success: <CheckCircle sx={{ color: '#51CF66' }} />,
    warning: <Warning sx={{ color: '#FCC419' }} />,
    error: <ErrorIcon sx={{ color: '#DC3545' }} />,
    announcement: <Campaign sx={{ color: '#9B59B6' }} />,
    reminder: <Schedule sx={{ color: '#FF6B35' }} />,
    alert: <PriorityHigh sx={{ color: '#DC3545' }} />,
};
const TYPE_COLORS: Record<string, string> = {
    info: '#3D5EE1', success: '#51CF66', warning: '#FCC419', error: '#DC3545',
    announcement: '#9B59B6', reminder: '#FF6B35', alert: '#DC3545',
};
const PRIORITY_COLORS: Record<string, string> = { low: '#888', medium: '#3D5EE1', high: '#FCC419', urgent: '#DC3545' };

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationCenter() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { notifications, total, unreadCount, stats, preferences, loading, error } = useSelector((s: RootState) => s.notifications);
    const [tabIndex, setTabIndex] = useState(0);
    const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined);
    const [filterType, setFilterType] = useState<string>('');
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });
    const [sendDialog, setSendDialog] = useState(false);
    const [broadcastDialog, setBroadcastDialog] = useState(false);
    const [sendForm, setSendForm] = useState({ user_id: '', title: '', message: '', notification_type: 'info', priority: 'medium', channel: 'in_app' });
    const [bcForm, setBcForm] = useState({ title: '', message: '', notification_type: 'announcement', priority: 'medium' });

    useEffect(() => { dispatch(fetchNotifications({})); dispatch(fetchNotificationStats()); dispatch(fetchPreferences()); }, [dispatch]);
    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearNotificationsError()); } }, [error, dispatch]);

    const loadNotifications = () => {
        const params: any = {};
        if (filterRead !== undefined) params.is_read = filterRead;
        if (filterType) params.notification_type = filterType;
        dispatch(fetchNotifications(params));
    };

    useEffect(() => { loadNotifications(); }, [filterRead, filterType]);

    const handleSend = async () => {
        if (!sendForm.user_id || !sendForm.title || !sendForm.message) return;
        const result = await dispatch(sendNotification({ ...sendForm, user_id: Number(sendForm.user_id) }));
        if (!result.type.endsWith('/rejected')) { setSendDialog(false); setSnack({ open: true, msg: 'Notification sent!', sev: 'success' }); setSendForm({ user_id: '', title: '', message: '', notification_type: 'info', priority: 'medium', channel: 'in_app' }); loadNotifications(); dispatch(fetchNotificationStats()); }
    };

    const handleBroadcast = async () => {
        if (!bcForm.title || !bcForm.message) return;
        const result = await dispatch(broadcastNotification(bcForm));
        if (!result.type.endsWith('/rejected')) { setBroadcastDialog(false); setSnack({ open: true, msg: `Broadcast sent!`, sev: 'success' }); setBcForm({ title: '', message: '', notification_type: 'announcement', priority: 'medium' }); loadNotifications(); dispatch(fetchNotificationStats()); }
    };

    const handlePrefChange = (key: string, value: boolean) => {
        dispatch(updatePreferences({ [key]: value }));
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Notifications</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>🔔 Notification Center</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage notifications and preferences</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" startIcon={<Send />} onClick={() => setSendDialog(true)} size="small">Send</Button>
                    <Button variant="contained" startIcon={<Campaign />} onClick={() => setBroadcastDialog(true)} size="small"
                        sx={{ background: 'linear-gradient(135deg, #9B59B6, #8E44AD)' }}>Broadcast</Button>
                </Box>
            </Box>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total', value: stats?.total ?? total, icon: <Notifications />, color: '#3D5EE1' },
                    { label: 'Unread', value: stats?.unread ?? unreadCount, icon: <NotificationsActive />, color: '#DC3545' },
                    { label: 'Read', value: stats?.read ?? (total - unreadCount), icon: <DoneAll />, color: '#51CF66' },
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
                    <Tab label="All Notifications" icon={<Notifications sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Preferences" icon={<Settings sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: All Notifications ═════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    {/* Filters & actions */}
                    <Paper sx={{ p: 2, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip label="All" variant={filterRead === undefined ? 'filled' : 'outlined'} onClick={() => setFilterRead(undefined)}
                                    sx={{ fontWeight: 700, bgcolor: filterRead === undefined ? '#3D5EE1' : undefined, color: filterRead === undefined ? '#fff' : undefined }} />
                                <Chip label="Unread" variant={filterRead === false ? 'filled' : 'outlined'} onClick={() => setFilterRead(false)}
                                    sx={{ fontWeight: 700, bgcolor: filterRead === false ? '#DC3545' : undefined, color: filterRead === false ? '#fff' : undefined }} />
                                <Chip label="Read" variant={filterRead === true ? 'filled' : 'outlined'} onClick={() => setFilterRead(true)}
                                    sx={{ fontWeight: 700, bgcolor: filterRead === true ? '#51CF66' : undefined, color: filterRead === true ? '#fff' : undefined }} />
                            </Box>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Type</InputLabel>
                                <Select value={filterType} label="Type" onChange={e => setFilterType(e.target.value)}>
                                    <MenuItem value="">All</MenuItem>
                                    {['info', 'success', 'warning', 'error', 'announcement', 'reminder', 'alert'].map(t => (
                                        <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                                {unreadCount > 0 && <Button size="small" startIcon={<DoneAll />} onClick={() => dispatch(markAllRead()).then(() => { loadNotifications(); dispatch(fetchNotificationStats()); })}>Mark All Read</Button>}
                                <Button size="small" color="error" startIcon={<ClearAll />} onClick={() => dispatch(clearAllNotifications()).then(() => { dispatch(fetchNotificationStats()); })}>Clear All</Button>
                            </Box>
                        </Box>
                    </Paper>

                    {/* Notification list */}
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        {notifications.length === 0 ? (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                                <Notifications sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="h6" color="text.secondary">No notifications</Typography>
                                <Typography variant="body2" color="text.secondary">You're all caught up!</Typography>
                            </Box>
                        ) : (
                            <List sx={{ py: 0 }}>
                                {notifications.map((n, i) => (
                                    <Box key={n.id}>
                                        <ListItem
                                            sx={{
                                                py: 2, px: 3,
                                                bgcolor: n.is_read ? 'transparent' : 'rgba(61,94,225,0.03)',
                                                borderLeft: n.is_read ? 'none' : `4px solid ${PRIORITY_COLORS[n.priority] || '#3D5EE1'}`,
                                                '&:hover': { bgcolor: 'rgba(61,94,225,0.06)' }, cursor: 'pointer',
                                            }}
                                            onClick={() => { if (!n.is_read) dispatch(markAsRead(n.id)); }}
                                            secondaryAction={
                                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                    <Chip label={n.priority} size="small" sx={{ fontWeight: 700, bgcolor: `${PRIORITY_COLORS[n.priority]}18`, color: PRIORITY_COLORS[n.priority], textTransform: 'capitalize' }} />
                                                    <Typography variant="caption" color="text.disabled" sx={{ mx: 1 }}>{timeAgo(n.created_at)}</Typography>
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); dispatch(deleteNotification(n.id)).then(() => dispatch(fetchNotificationStats())); }}>
                                                        <Delete fontSize="small" sx={{ color: 'text.disabled', '&:hover': { color: '#DC3545' } }} />
                                                    </IconButton>
                                                </Box>
                                            }
                                        >
                                            <ListItemIcon sx={{ minWidth: 40 }}>
                                                {TYPE_ICONS[n.notification_type] || <Info />}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography fontWeight={n.is_read ? 500 : 700}>{n.title}</Typography>
                                                    <Chip label={n.notification_type} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: `${TYPE_COLORS[n.notification_type] || '#888'}18`, color: TYPE_COLORS[n.notification_type] || '#888' }} />
                                                    {!n.is_read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3D5EE1' }} />}
                                                </Box>}
                                                secondary={<Typography variant="body2" color="text.secondary">{n.message}</Typography>}
                                            />
                                        </ListItem>
                                        {i < notifications.length - 1 && <Divider />}
                                    </Box>
                                ))}
                            </List>
                        )}
                    </Paper>
                </>
            )}

            {/* ═══ Tab 1: Preferences ═══════════════════════════════════ */}
            {tabIndex === 1 && preferences && (
                <Grid container spacing={3}>
                    {/* Channel preferences */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Typography fontWeight={700} mb={2}>📡 Notification Channels</Typography>
                            {[
                                { key: 'in_app_enabled', label: 'In-App Notifications', icon: <Notifications />, desc: 'Show notifications inside the app' },
                                { key: 'email_enabled', label: 'Email Notifications', icon: <Email />, desc: 'Receive notifications via email' },
                                { key: 'push_enabled', label: 'Push Notifications', icon: <PhoneAndroid />, desc: 'Browser/mobile push notifications' },
                                { key: 'sms_enabled', label: 'SMS Notifications', icon: <Sms />, desc: 'Receive SMS text messages' },
                            ].map(ch => (
                                <Box key={ch.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ color: '#3D5EE1' }}>{ch.icon}</Box>
                                        <Box>
                                            <Typography fontWeight={600}>{ch.label}</Typography>
                                            <Typography variant="caption" color="text.secondary">{ch.desc}</Typography>
                                        </Box>
                                    </Box>
                                    <Switch checked={(preferences as any)[ch.key]} onChange={(e) => handlePrefChange(ch.key, e.target.checked)} color="primary" />
                                </Box>
                            ))}
                        </Paper>
                    </Grid>

                    {/* Category preferences */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Typography fontWeight={700} mb={2}>📋 Notification Categories</Typography>
                            {[
                                { key: 'attendance_alerts', label: 'Attendance Alerts', desc: 'Low attendance warnings' },
                                { key: 'fee_reminders', label: 'Fee Reminders', desc: 'Payment due reminders' },
                                { key: 'exam_notifications', label: 'Exam Notifications', desc: 'Upcoming exams and results' },
                                { key: 'announcement_notifications', label: 'Announcements', desc: 'School-wide announcements' },
                                { key: 'leave_notifications', label: 'Leave Notifications', desc: 'Leave request updates' },
                                { key: 'report_notifications', label: 'Report Notifications', desc: 'Report generation alerts' },
                            ].map(cat => (
                                <Box key={cat.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <Box>
                                        <Typography fontWeight={600}>{cat.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{cat.desc}</Typography>
                                    </Box>
                                    <Switch checked={(preferences as any)[cat.key]} onChange={(e) => handlePrefChange(cat.key, e.target.checked)} color="primary" />
                                </Box>
                            ))}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ═══ Send Dialog ═══════════════════════════════════════════ */}
            <Dialog open={sendDialog} onClose={() => setSendDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>📨 Send Notification</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={12}>
                            <TextField fullWidth label="User ID *" type="number" value={sendForm.user_id} onChange={e => setSendForm({ ...sendForm, user_id: e.target.value })} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth label="Title *" value={sendForm.title} onChange={e => setSendForm({ ...sendForm, title: e.target.value })} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth label="Message *" multiline rows={3} value={sendForm.message} onChange={e => setSendForm({ ...sendForm, message: e.target.value })} />
                        </Grid>
                        <Grid size={6}>
                            <FormControl fullWidth><InputLabel>Type</InputLabel>
                                <Select value={sendForm.notification_type} label="Type" onChange={e => setSendForm({ ...sendForm, notification_type: e.target.value })}>
                                    {['info', 'success', 'warning', 'error', 'reminder', 'alert'].map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
                                </Select></FormControl>
                        </Grid>
                        <Grid size={6}>
                            <FormControl fullWidth><InputLabel>Priority</InputLabel>
                                <Select value={sendForm.priority} label="Priority" onChange={e => setSendForm({ ...sendForm, priority: e.target.value })}>
                                    {['low', 'medium', 'high', 'urgent'].map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
                                </Select></FormControl>
                        </Grid>
                        <Grid size={12}>
                            <FormControl fullWidth><InputLabel>Channel</InputLabel>
                                <Select value={sendForm.channel} label="Channel" onChange={e => setSendForm({ ...sendForm, channel: e.target.value })}>
                                    {['in_app', 'email', 'push', 'sms'].map(c => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c.replace('_', ' ')}</MenuItem>)}
                                </Select></FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setSendDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSend} disabled={loading} startIcon={<Send />}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Send</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Broadcast Dialog ═════════════════════════════════════ */}
            <Dialog open={broadcastDialog} onClose={() => setBroadcastDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>📢 Broadcast to All Users</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={12}>
                            <TextField fullWidth label="Title *" value={bcForm.title} onChange={e => setBcForm({ ...bcForm, title: e.target.value })} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth label="Message *" multiline rows={3} value={bcForm.message} onChange={e => setBcForm({ ...bcForm, message: e.target.value })} />
                        </Grid>
                        <Grid size={6}>
                            <FormControl fullWidth><InputLabel>Type</InputLabel>
                                <Select value={bcForm.notification_type} label="Type" onChange={e => setBcForm({ ...bcForm, notification_type: e.target.value })}>
                                    {['announcement', 'info', 'warning', 'alert'].map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
                                </Select></FormControl>
                        </Grid>
                        <Grid size={6}>
                            <FormControl fullWidth><InputLabel>Priority</InputLabel>
                                <Select value={bcForm.priority} label="Priority" onChange={e => setBcForm({ ...bcForm, priority: e.target.value })}>
                                    {['low', 'medium', 'high', 'urgent'].map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
                                </Select></FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setBroadcastDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleBroadcast} disabled={loading} startIcon={<Campaign />}
                        sx={{ background: 'linear-gradient(135deg, #9B59B6, #8E44AD)' }}>Broadcast</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
