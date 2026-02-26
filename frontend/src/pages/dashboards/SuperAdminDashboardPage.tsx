import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import {
    fetchInstitutions, fetchPlatformStats, fetchAuditLogs,
    fetchFeatureFlags, toggleFeatureFlag, suspendInstitution,
} from '../../store/slices/superAdminSlice';
import {
    Box, Typography, Grid, Card, CardContent, Chip, Tab, Tabs, Button,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    Paper, Avatar, LinearProgress, List, ListItem, ListItemText,
    ListItemIcon, Switch, Divider, Badge, IconButton, Alert,
    CircularProgress, Skeleton,
} from '@mui/material';
import {
    Business, Security, Storage, Flag, People, Assessment,
    Shield, Key, Backup, CloudSync, MonitorHeart, Code,
    Warning, CheckCircle, TrendingUp, AttachMoney, Notifications,
    BarChart, Settings, Delete, Edit, Add, Visibility,
    Language, LockPerson, ManageAccounts, DataUsage, CreditScore, Refresh,
} from '@mui/icons-material';

const COLORS = {
    blue: { bg: 'rgba(61,94,225,0.1)', fg: '#3D5EE1' },
    green: { bg: 'rgba(40,167,69,0.1)', fg: '#28A745' },
    amber: { bg: 'rgba(255,193,7,0.1)', fg: '#FFC107' },
    purple: { bg: 'rgba(132,94,247,0.1)', fg: '#845EF7' },
    red: { bg: 'rgba(220,53,69,0.1)', fg: '#DC3545' },
};

const mockPlans = [
    { id: 1, name: 'Basic', price: 999, features: 'Core modules only' },
    { id: 2, name: 'Standard', price: 2499, features: '+ Analytics, Library, Transport' },
    { id: 3, name: 'Premium', price: 4999, features: '+ AI Features, Multi-campus' },
    { id: 4, name: 'Enterprise', price: 'Custom', features: 'Unlimited + SLA' },
];
const mockServerHealth = [
    { service: 'API Gateway', status: 'healthy', uptime: 99.98, latency: '12ms' },
    { service: 'Database (SQLite/PG)', status: 'healthy', uptime: 99.95, latency: '4ms' },
    { service: 'Redis Cache', status: 'healthy', uptime: 100, latency: '1ms' },
    { service: 'AI Model Server', status: 'degraded', uptime: 96.2, latency: '280ms' },
    { service: 'File Storage', status: 'healthy', uptime: 99.99, latency: '45ms' },
];

function StatCard({ icon, label, value, color, loading = false }: {
    icon: React.ReactNode; label: string; value: string | number; color: keyof typeof COLORS; loading?: boolean;
}) {
    const c = COLORS[color];
    return (
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)', transition: 'transform .2s', '&:hover': { transform: 'translateY(-3px)' } }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.fg }}>{icon}</Box>
                <Box>
                    {loading ? <Skeleton width={60} height={32} /> : <Typography variant="h5" fontWeight={700}>{value}</Typography>}
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function SuperAdminDashboardPage() {
    const [tab, setTab] = useState(0);
    const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.auth.user);
    const { institutions, platformStats, auditLogs, featureFlags, loading } =
        useSelector((state: RootState) => state.superAdmin);

    useEffect(() => {
        dispatch(fetchPlatformStats());
        dispatch(fetchInstitutions());
        dispatch(fetchAuditLogs({ limit: 20 }));
        dispatch(fetchFeatureFlags());
    }, [dispatch]);

    const handleToggleFlag = (name: string, current: boolean) => {
        dispatch(toggleFeatureFlag({ name, enabled: !current }));
    };

    const handleToggleInstitution = (id: string) => {
        dispatch(suspendInstitution(id));
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 60, height: 60, background: 'linear-gradient(135deg,#8B5CF6,#D946EF)', fontSize: '1.5rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(139,92,246,0.4)' }}>
                        👑
                    </Avatar>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="h4" fontWeight={700}>Super Admin Dashboard</Typography>
                            <Chip label="Platform Owner" size="small" sx={{ bgcolor: 'rgba(139,92,246,0.15)', color: '#8B5CF6', fontWeight: 700 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Welcome, {user?.full_name || 'Super Admin'} · Full platform control
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={() => { dispatch(fetchPlatformStats()); dispatch(fetchInstitutions()); }} title="Refresh">
                        <Refresh />
                    </IconButton>
                    <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2, background: 'linear-gradient(135deg,#8B5CF6,#D946EF)' }}>
                        Add Institution
                    </Button>
                </Box>
            </Box>

            {/* Security Alert */}
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                <strong>Security Notice:</strong> Monitor audit logs for suspicious cross-tenant activity.
            </Alert>

            {/* Platform Stats */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { icon: <Business />, label: 'Institutions', value: platformStats?.total_institutions ?? '–', color: 'purple' as const },
                    { icon: <People />, label: 'Total Students', value: platformStats?.total_students ?? '–', color: 'blue' as const },
                    { icon: <AttachMoney />, label: 'Total Teachers', value: platformStats?.total_teachers ?? '–', color: 'green' as const },
                    { icon: <MonitorHeart />, label: 'Server Uptime', value: platformStats ? `${platformStats.server_uptime_pct}%` : '–', color: 'green' as const },
                    { icon: <Flag />, label: 'Active Flags', value: featureFlags.filter(f => f.enabled).length, color: 'amber' as const },
                    { icon: <Shield />, label: 'Total Users', value: platformStats?.total_users ?? '–', color: 'blue' as const },
                ].map(s => (
                    <Grid size={{ xs: 6, sm: 4, md: 2 }} key={s.label}>
                        <StatCard {...s} loading={loading && !platformStats} />
                    </Grid>
                ))}
            </Grid>

            {/* Tabs */}
            <Paper sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', mb: 3, overflow: 'hidden' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
                    sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)', '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 52 } }}>
                    <Tab icon={<Business />} iconPosition="start" label="Institutions" />
                    <Tab icon={<Security />} iconPosition="start" label="Security & Audit" />
                    <Tab icon={<CreditScore />} iconPosition="start" label="Billing & Plans" />
                    <Tab icon={<MonitorHeart />} iconPosition="start" label="DevOps" />
                    <Tab icon={<Flag />} iconPosition="start" label="Feature Flags" />
                    <Tab icon={<ManageAccounts />} iconPosition="start" label="Global Settings" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {/* Tab 0: Institutions */}
                    {tab === 0 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>🏢 Institution Management</Typography>
                                <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2 }}>Add Institution</Button>
                            </Box>
                            {loading && institutions.length === 0 ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                            ) : (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>
                                                {['Institution', 'Domain', 'Users', 'Students', 'Teachers', 'Status', 'Actions'].map(h =>
                                                    <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {institutions.length === 0 ? (
                                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No institutions found. Run the seeder to add demo data.</TableCell></TableRow>
                                            ) : institutions.map(inst => (
                                                <TableRow key={inst.id} sx={{ '&:hover': { bgcolor: 'rgba(139,92,246,0.03)' } }}>
                                                    <TableCell><Typography fontWeight={700}>{inst.name}</Typography></TableCell>
                                                    <TableCell><Typography variant="body2" color="text.secondary">{inst.domain}</Typography></TableCell>
                                                    <TableCell>{inst.total_users}</TableCell>
                                                    <TableCell>{inst.total_students}</TableCell>
                                                    <TableCell>{inst.total_teachers}</TableCell>
                                                    <TableCell>
                                                        <Chip label={inst.is_active ? 'Active' : 'Suspended'} size="small"
                                                            color={inst.is_active ? 'success' : 'error'} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                            <IconButton size="small" title="View"><Visibility fontSize="small" /></IconButton>
                                                            <IconButton size="small" title={inst.is_active ? 'Suspend' : 'Reactivate'}
                                                                onClick={() => handleToggleInstitution(inst.id)}
                                                                sx={{ color: inst.is_active ? '#DC3545' : '#28A745' }}>
                                                                <LockPerson fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}

                    {/* Tab 1: Security & Audit */}
                    {tab === 1 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>🔒 Security & Audit Logs</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {[
                                    { icon: <Shield />, label: 'RLS Policies Active', value: 42, color: '#3D5EE1', action: 'Manage Policies' },
                                    { icon: <Key />, label: 'API Keys Issued', value: 8, color: '#845EF7', action: 'Manage Keys' },
                                    { icon: <LockPerson />, label: 'Locked Accounts', value: 2, color: '#DC3545', action: 'Review' },
                                ].map(item => (
                                    <Grid size={{ xs: 12, sm: 4 }} key={item.label}>
                                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                                    <Box sx={{ bgcolor: `${item.color}20`, borderRadius: 2, p: 1, color: item.color }}>{item.icon}</Box>
                                                    <Typography fontWeight={700}>{item.label}</Typography>
                                                </Box>
                                                <Typography variant="h4" fontWeight={700}>{item.value}</Typography>
                                                <Button size="small" sx={{ mt: 1.5, borderRadius: 2 }} variant="outlined">{item.action}</Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            <Typography variant="subtitle2" fontWeight={700} mb={1}>📋 Recent Audit Logs (Live)</Typography>
                            {loading && auditLogs.length === 0 ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                            ) : (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'rgba(220,53,69,0.05)' }}>
                                                {['ID', 'Action', 'Entity', 'User ID', 'Time'].map(h =>
                                                    <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {auditLogs.length === 0 ? (
                                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No audit logs yet. Activity will appear here automatically.</TableCell></TableRow>
                                            ) : auditLogs.map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell><Typography variant="caption" fontFamily="monospace">#{log.id}</Typography></TableCell>
                                                    <TableCell>{log.action}</TableCell>
                                                    <TableCell><Typography variant="caption">{log.entity_type || '–'} {log.entity_id ? `#${log.entity_id}` : ''}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{log.user_id || '–'}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{log.created_at ? new Date(log.created_at).toLocaleString() : '–'}</Typography></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}

                    {/* Tab 2: Billing & Plans */}
                    {tab === 2 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>💰 Subscription Plans & Revenue</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {[
                                    { label: 'Total Institutions', value: platformStats?.total_institutions ?? '–', color: '#845EF7', icon: <Business /> },
                                    { label: 'Active Institutions', value: platformStats?.active_institutions ?? '–', color: '#28A745', icon: <CheckCircle /> },
                                    { label: 'Total Admins', value: platformStats?.total_admins ?? '–', color: '#3D5EE1', icon: <ManageAccounts /> },
                                    { label: 'Storage Used', value: platformStats ? `${platformStats.storage_used_mb} MB` : '–', color: '#FFC107', icon: <Storage /> },
                                ].map(s => (
                                    <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
                                        <Card sx={{ borderRadius: 2, bgcolor: `${s.color}12`, border: `1px solid ${s.color}30` }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: s.color }}>{s.icon}</Box>
                                                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                                                <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            <Typography variant="subtitle2" fontWeight={700} mb={1}>📦 Subscription Plans</Typography>
                            <Grid container spacing={2}>
                                {mockPlans.map(plan => (
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={plan.id}>
                                        <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: '#8B5CF6' }, transition: 'border-color .2s' }}>
                                            <CardContent>
                                                <Typography variant="h6" fontWeight={700}>{plan.name}</Typography>
                                                <Typography variant="h4" fontWeight={700} color="#8B5CF6" mb={1}>
                                                    {typeof plan.price === 'number' ? `₹${plan.price}/mo` : plan.price}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">{plan.features}</Typography>
                                                <Divider sx={{ my: 1.5 }} />
                                                <Button fullWidth variant="outlined" size="small" sx={{ borderRadius: 2 }}>Edit Plan</Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* Tab 3: DevOps */}
                    {tab === 3 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>🚀 Infrastructure & DevOps</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {mockServerHealth.map(srv => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={srv.service}>
                                        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: srv.status === 'degraded' ? '#FFC107' : undefined }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Typography fontWeight={700}>{srv.service}</Typography>
                                                    <Chip label={srv.status} size="small" color={srv.status === 'healthy' ? 'success' : 'warning'} />
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 3, mb: 1.5 }}>
                                                    <Box><Typography variant="caption" color="text.secondary">Uptime</Typography><Typography variant="body2" fontWeight={700}>{srv.uptime}%</Typography></Box>
                                                    <Box><Typography variant="caption" color="text.secondary">Latency</Typography><Typography variant="body2" fontWeight={700}>{srv.latency}</Typography></Box>
                                                </Box>
                                                <LinearProgress variant="determinate" value={srv.uptime}
                                                    sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: srv.status === 'healthy' ? '#28A745' : '#FFC107', borderRadius: 3 } }} />
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                            <Grid container spacing={2}>
                                {[
                                    { icon: <Backup />, label: 'Backup & Restore', color: '#3D5EE1' },
                                    { icon: <CloudSync />, label: 'Sync Data', color: '#28A745' },
                                    { icon: <Code />, label: 'AI Model Mgmt', color: '#845EF7' },
                                    { icon: <Storage />, label: 'Data Warehouse', color: '#17A2B8' },
                                ].map(a => (
                                    <Grid size={{ xs: 6, sm: 3 }} key={a.label}>
                                        <Card sx={{ borderRadius: 2, cursor: 'pointer', textAlign: 'center', transition: 'transform .2s', '&:hover': { transform: 'translateY(-3px)' } }}>
                                            <CardContent>
                                                <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: `${a.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, mx: 'auto', mb: 1.5 }}>{a.icon}</Box>
                                                <Typography variant="body2" fontWeight={600}>{a.label}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* Tab 4: Feature Flags */}
                    {tab === 4 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>🧩 Feature Flags & Module Control (Live)</Typography>
                                <Button variant="outlined" startIcon={<Refresh />} onClick={() => dispatch(fetchFeatureFlags())} sx={{ borderRadius: 2 }}>Refresh</Button>
                            </Box>
                            {loading && featureFlags.length === 0 ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                            ) : (
                                <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                                    <List disablePadding>
                                        {featureFlags.map((flag, i) => (
                                            <Box key={flag.name}>
                                                <ListItem sx={{ py: 2, px: 2.5 }}>
                                                    <ListItemIcon>
                                                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: flag.enabled ? 'rgba(40,167,69,0.1)' : 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: flag.enabled ? '#28A745' : 'text.disabled' }}>
                                                            {flag.enabled ? <CheckCircle /> : <Warning />}
                                                        </Box>
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography fontWeight={700}>{flag.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Typography>
                                                            <Chip label={flag.scope} size="small" variant="outlined" sx={{ height: 20 }} />
                                                        </Box>}
                                                        secondary={flag.description} />
                                                    <Switch
                                                        checked={flag.enabled}
                                                        onChange={() => handleToggleFlag(flag.name, flag.enabled)}
                                                        color="success" />
                                                </ListItem>
                                                {i < featureFlags.length - 1 && <Divider />}
                                            </Box>
                                        ))}
                                    </List>
                                </Paper>
                            )}
                        </Box>
                    )}

                    {/* Tab 5: Global Settings */}
                    {tab === 5 && (
                        <Box>
                            <Typography variant="h6" fontWeight={700} mb={2}>⚙️ Global Platform Settings</Typography>
                            <Grid container spacing={2}>
                                {[
                                    { icon: <Key />, title: 'API Key Management', desc: 'Manage partner and integration API keys', action: 'Manage Keys' },
                                    { icon: <Shield />, title: 'RLS Policy Control', desc: 'Row-level security policies', action: 'Configure' },
                                    { icon: <Notifications />, title: 'Notification Gateway', desc: 'WhatsApp, SMS, Email delivery config', action: 'Configure' },
                                    { icon: <Settings />, title: 'System Configuration', desc: 'Global platform settings and env vars', action: 'Edit Config' },
                                    { icon: <DataUsage />, title: 'Data Retention Policy', desc: 'GDPR & data lifecycle management', action: 'View Policy' },
                                    { icon: <Assessment />, title: 'Cross-Institution Analytics', desc: `${platformStats?.total_institutions ?? '–'} institutions · ${platformStats?.total_students ?? '–'} total students`, action: 'View Dashboard' },
                                ].map(item => (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.title}>
                                        <Card variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: '#8B5CF6' }, transition: 'border-color .2s', cursor: 'pointer' }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                                    <Box sx={{ bgcolor: 'rgba(139,92,246,0.12)', borderRadius: 2, p: 1, color: '#8B5CF6' }}>{item.icon}</Box>
                                                    <Typography fontWeight={700}>{item.title}</Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" display="block" mb={2}>{item.desc}</Typography>
                                                <Button fullWidth variant="outlined" size="small" sx={{ borderRadius: 2, borderColor: '#8B5CF6', color: '#8B5CF6' }}>{item.action}</Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Box>
    );
}
