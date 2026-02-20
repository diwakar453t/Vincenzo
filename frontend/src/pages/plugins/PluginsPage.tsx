import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchPlugins, fetchPluginStats, fetchHooks,
    activatePlugin, deactivatePlugin, updatePluginConfig, uninstallPlugin, clearPluginsError,
} from '../../store/slices/pluginsSlice';
import type { PluginInfo } from '../../store/slices/pluginsSlice';
import {
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
    Divider, FormControlLabel, Tabs, Tab, List, ListItem, ListItemText,
} from '@mui/material';
import {
    Extension, Pause, Delete, Settings, Info,
    CheckCircle, Error as ErrorIcon, PowerSettingsNew,
} from '@mui/icons-material';

const STATUS_STYLES: Record<string, { color: any; icon: any }> = {
    active: { color: 'success', icon: <CheckCircle sx={{ fontSize: 16 }} /> },
    installed: { color: 'info', icon: <PowerSettingsNew sx={{ fontSize: 16 }} /> },
    disabled: { color: 'default', icon: <Pause sx={{ fontSize: 16 }} /> },
    error: { color: 'error', icon: <ErrorIcon sx={{ fontSize: 16 }} /> },
};

const CAT_COLORS: Record<string, string> = {
    notifications: '#3D5EE1', academic: '#51CF66', general: '#868E96',
};

export default function PluginsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { plugins, stats, hooks, loading, processing, error } = useSelector((s: RootState) => s.plugins);
    const [tab, setTab] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

    // Config dialog
    const [configDialog, setConfigDialog] = useState(false);
    const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null);
    const [configForm, setConfigForm] = useState<Record<string, any>>({});

    // Detail dialog
    const [detailDialog, setDetailDialog] = useState(false);

    useEffect(() => { dispatch(fetchPlugins()); dispatch(fetchPluginStats()); dispatch(fetchHooks()); }, [dispatch]);
    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearPluginsError()); } }, [error, dispatch]);

    const handleToggle = async (plugin: PluginInfo) => {
        const result = plugin.status === 'active'
            ? await dispatch(deactivatePlugin(plugin.name))
            : await dispatch(activatePlugin(plugin.name));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: `${plugin.icon} ${plugin.name} ${plugin.status === 'active' ? 'deactivated' : 'activated'}!`, sev: 'success' });
            dispatch(fetchPluginStats());
        }
    };

    const handleOpenConfig = (plugin: PluginInfo) => {
        setSelectedPlugin(plugin);
        setConfigForm({ ...plugin.config });
        setConfigDialog(true);
    };

    const handleSaveConfig = async () => {
        if (!selectedPlugin) return;
        const result = await dispatch(updatePluginConfig({ name: selectedPlugin.name, config: configForm }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: `${selectedPlugin.icon} Config saved!`, sev: 'success' });
            setConfigDialog(false);
        }
    };

    const handleUninstall = async (plugin: PluginInfo) => {
        const result = await dispatch(uninstallPlugin(plugin.name));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: `${plugin.name} uninstalled`, sev: 'success' });
            dispatch(fetchPluginStats());
        }
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Plugins</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>🔌 Plugin Manager</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage extensions and customize your ERP</Typography>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Plugins', value: stats?.total ?? 0, color: '#3D5EE1' },
                    { label: 'Active', value: stats?.active ?? 0, color: '#51CF66' },
                    { label: 'Disabled', value: stats?.disabled ?? 0, color: '#868E96' },
                    { label: 'Hooks', value: stats?.hooks_registered ?? 0, color: '#FCC419' },
                ].map((s, i) => (
                    <Grid key={i} size={{ xs: 6, md: 3 }}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Extension sx={{ color: s.color }} />
                                </Box>
                                <Box><Typography variant="h5" fontWeight={700}>{s.value}</Typography><Typography variant="caption" color="text.secondary">{s.label}</Typography></Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{ mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
                    <Tab label={`Installed (${plugins.length})`} icon={<Extension sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Available Hooks" icon={<Settings sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* Tab 0: Installed Plugins */}
            {tab === 0 && (
                <Grid container spacing={2}>
                    {plugins.length === 0 ? (
                        <Grid size={12}>
                            <Paper sx={{ py: 8, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                <Extension sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="h6" color="text.secondary">No plugins installed</Typography>
                            </Paper>
                        </Grid>
                    ) : plugins.map(plugin => (
                        <Grid key={plugin.name} size={{ xs: 12, md: 6, lg: 4 }}>
                            <Card sx={{
                                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                border: plugin.status === 'active' ? '2px solid #51CF66' : '1px solid rgba(0,0,0,0.06)',
                                transition: 'all 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
                            }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Typography variant="h5">{plugin.icon}</Typography>
                                            <Box>
                                                <Typography fontWeight={700}>{plugin.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Typography>
                                                <Typography variant="caption" color="text.secondary">v{plugin.version} · by {plugin.author}</Typography>
                                            </Box>
                                        </Box>
                                        <Chip label={plugin.status} size="small" color={STATUS_STYLES[plugin.status]?.color || 'default'}
                                            icon={STATUS_STYLES[plugin.status]?.icon} sx={{ fontWeight: 700, height: 22 }} />
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" sx={{ my: 1.5, minHeight: 40 }}>{plugin.description}</Typography>

                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                                        <Chip label={plugin.category} size="small" sx={{ bgcolor: `${CAT_COLORS[plugin.category] || '#868E96'}18`, color: CAT_COLORS[plugin.category] || '#868E96', fontWeight: 600, fontSize: 11, height: 20 }} />
                                        {plugin.is_builtin && <Chip label="Built-in" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: 11, height: 20 }} />}
                                        {plugin.hooks.map(h => <Chip key={h} label={h} size="small" sx={{ fontWeight: 500, fontSize: 10, height: 18, bgcolor: 'rgba(0,0,0,0.04)' }} />)}
                                    </Box>

                                    {plugin.error && <Alert severity="error" sx={{ mb: 1, py: 0 }}>{plugin.error}</Alert>}

                                    <Divider sx={{ mb: 1 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <FormControlLabel
                                            control={<Switch checked={plugin.status === 'active'} size="small" onChange={() => handleToggle(plugin)} disabled={processing} />}
                                            label={<Typography variant="caption" fontWeight={600}>{plugin.status === 'active' ? 'Active' : 'Inactive'}</Typography>}
                                        />
                                        <Box>
                                            <IconButton size="small" title="Configure" onClick={() => handleOpenConfig(plugin)}>
                                                <Settings fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" title="Details" onClick={() => { setSelectedPlugin(plugin); setDetailDialog(true); }}>
                                                <Info fontSize="small" />
                                            </IconButton>
                                            {!plugin.is_builtin && (
                                                <IconButton size="small" title="Uninstall" onClick={() => handleUninstall(plugin)}>
                                                    <Delete fontSize="small" sx={{ color: '#DC3545' }} />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Tab 1: Available Hooks */}
            {tab === 1 && (
                <Paper sx={{ p: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <Typography variant="h6" fontWeight={700} mb={2}>⚡ Available Hook Points ({hooks.length})</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>Plugins can register callbacks for any of these hook points</Typography>
                    <Grid container spacing={1}>
                        {hooks.map((h) => (
                            <Grid key={h.key} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Box sx={{ p: 1.5, borderRadius: 1, border: '1px solid rgba(0,0,0,0.06)', '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                    <Typography fontWeight={600} fontSize={13}>{h.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{h.key}</Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* Config Dialog */}
            <Dialog open={configDialog} onClose={() => setConfigDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{selectedPlugin?.icon} Configure: {selectedPlugin?.name}</DialogTitle>
                <DialogContent>
                    {selectedPlugin?.config_schema && Object.entries(selectedPlugin.config_schema).map(([key, schema]: [string, any]) => (
                        <Box key={key} sx={{ my: 2 }}>
                            {schema.type === 'boolean' ? (
                                <FormControlLabel
                                    control={<Switch checked={configForm[key] === true || configForm[key] === 'true'} onChange={e => setConfigForm({ ...configForm, [key]: e.target.checked })} />}
                                    label={<Box><Typography fontWeight={600}>{key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</Typography>
                                        <Typography variant="caption" color="text.secondary">{schema.description}</Typography></Box>}
                                />
                            ) : (
                                <TextField fullWidth label={key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    helperText={schema.description} type={schema.type === 'number' ? 'number' : 'text'}
                                    value={configForm[key] ?? schema.default ?? ''} onChange={e => setConfigForm({ ...configForm, [key]: e.target.value })} />
                            )}
                        </Box>
                    ))}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfigDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveConfig} sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', fontWeight: 700 }}>Save Config</Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{selectedPlugin?.icon} {selectedPlugin?.name}</DialogTitle>
                {selectedPlugin && (
                    <DialogContent>
                        <List dense>
                            {[
                                ['Version', selectedPlugin.version],
                                ['Author', selectedPlugin.author],
                                ['Category', selectedPlugin.category],
                                ['Status', selectedPlugin.status],
                                ['Built-in', selectedPlugin.is_builtin ? 'Yes' : 'No'],
                                ['Hooks', selectedPlugin.hooks.join(', ') || 'None'],
                                ['Dependencies', selectedPlugin.requires.join(', ') || 'None'],
                            ].map(([label, value], i) => (
                                <ListItem key={i}><ListItemText primary={label} secondary={value} /></ListItem>
                            ))}
                        </List>
                        <Divider sx={{ my: 1 }} />
                        <Typography fontWeight={600} mb={1}>Configuration</Typography>
                        {Object.entries(selectedPlugin.config).map(([k, v]) => (
                            <Chip key={k} label={`${k}: ${String(v)}`} size="small" sx={{ m: 0.5, fontWeight: 500 }} variant="outlined" />
                        ))}
                    </DialogContent>
                )}
                <DialogActions><Button onClick={() => setDetailDialog(false)}>Close</Button></DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
