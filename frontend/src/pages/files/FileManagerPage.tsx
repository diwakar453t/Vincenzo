import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchFiles, uploadFile, deleteFile, fetchFileStats, fetchSharedFiles,
    shareFile, downloadFile, clearFilesError,
} from '../../store/slices/filesSlice';
import {
    Box, Typography, Button, Paper, Grid, Card, CardContent, Snackbar, Alert,
    LinearProgress, Breadcrumbs, Link, Tabs, Tab, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select,
    MenuItem, FormControl, InputLabel, List, ListItem, ListItemIcon,
    ListItemText, Divider,
} from '@mui/material';
import {
    CloudUpload, Delete, Download, Share, Folder, InsertDriveFile,
    PictureAsPdf, Image, VideoLibrary, AudioFile, Archive, TableChart,
    Slideshow, Description, Storage, FolderShared, Assessment,
} from '@mui/icons-material';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    document: <Description sx={{ color: '#3D5EE1' }} />,
    image: <Image sx={{ color: '#51CF66' }} />,
    pdf: <PictureAsPdf sx={{ color: '#DC3545' }} />,
    spreadsheet: <TableChart sx={{ color: '#51CF66' }} />,
    presentation: <Slideshow sx={{ color: '#FCC419' }} />,
    video: <VideoLibrary sx={{ color: '#9B59B6' }} />,
    audio: <AudioFile sx={{ color: '#FF6B35' }} />,
    archive: <Archive sx={{ color: '#888' }} />,
    other: <InsertDriveFile sx={{ color: '#888' }} />,
};
const CATEGORY_COLORS: Record<string, string> = {
    document: '#3D5EE1', image: '#51CF66', pdf: '#DC3545', spreadsheet: '#51CF66',
    presentation: '#FCC419', video: '#9B59B6', audio: '#FF6B35', archive: '#888', other: '#888',
};

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function FileManagerPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { files, total, stats, sharedFiles, loading, uploading, error } = useSelector((s: RootState) => s.files);
    const [tabIndex, setTabIndex] = useState(0);
    const [filterCategory, setFilterCategory] = useState('');
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });
    const [uploadDialog, setUploadDialog] = useState(false);
    const [shareDialog, setShareDialog] = useState(false);
    const [shareFileId, setShareFileId] = useState<number>(0);
    const [shareUserId, setShareUserId] = useState('');
    const [uploadDesc, setUploadDesc] = useState('');
    const [uploadVisibility, setUploadVisibility] = useState('private');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { dispatch(fetchFiles({})); dispatch(fetchFileStats()); dispatch(fetchSharedFiles()); }, [dispatch]);
    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearFilesError()); } }, [error, dispatch]);
    useEffect(() => { dispatch(fetchFiles(filterCategory ? { category: filterCategory } : {})); }, [filterCategory, dispatch]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        const result = await dispatch(uploadFile({ file, description: uploadDesc, visibility: uploadVisibility }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: `"${file.name}" uploaded!`, sev: 'success' });
            setUploadDialog(false); setUploadDesc(''); setUploadVisibility('private');
            dispatch(fetchFileStats());
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleShare = async () => {
        if (!shareFileId || !shareUserId) return;
        const result = await dispatch(shareFile({ file_id: shareFileId, shared_with_user_id: Number(shareUserId) }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'File shared!', sev: 'success' });
            setShareDialog(false); setShareUserId('');
        }
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>File Manager</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>📁 File Manager</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Upload, manage, and share files</Typography>
                </Box>
                <Button variant="contained" startIcon={<CloudUpload />} onClick={() => setUploadDialog(true)}
                    sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', fontWeight: 700 }}>Upload File</Button>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Files', value: stats?.total_files ?? 0, icon: <Folder />, color: '#3D5EE1' },
                    { label: 'Storage Used', value: stats ? `${stats.total_size_mb} MB` : '0 MB', icon: <Storage />, color: '#51CF66' },
                    { label: 'Shared Files', value: sharedFiles.length, icon: <FolderShared />, color: '#9B59B6' },
                    { label: 'Categories', value: stats?.by_category?.length ?? 0, icon: <Assessment />, color: '#FCC419' },
                ].map((s, i) => (
                    <Grid key={i} size={{ xs: 6, md: 3 }}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
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

            {/* Category breakdown */}
            {stats && stats.by_category.length > 0 && (
                <Paper sx={{ p: 2, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <Typography fontWeight={700} mb={1.5}>Category Breakdown</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {stats.by_category.map((cat) => (
                            <Chip key={cat.category} label={`${cat.category} (${cat.count})`}
                                icon={CATEGORY_ICONS[cat.category] as React.ReactElement || undefined}
                                onClick={() => setFilterCategory(cat.category === filterCategory ? '' : cat.category)}
                                variant={filterCategory === cat.category ? 'filled' : 'outlined'}
                                sx={{ fontWeight: 700, bgcolor: filterCategory === cat.category ? `${CATEGORY_COLORS[cat.category]}` : undefined, color: filterCategory === cat.category ? '#fff' : undefined, textTransform: 'capitalize' }} />
                        ))}
                        {filterCategory && <Chip label="Clear" variant="outlined" color="error" size="small" onClick={() => setFilterCategory('')} />}
                    </Box>
                </Paper>
            )}

            {/* Tabs */}
            <Paper sx={{ mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
                    <Tab label={`My Files (${total})`} icon={<Folder sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label={`Shared (${sharedFiles.length})`} icon={<FolderShared sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* File list */}
            <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {loading && <LinearProgress />}
                {(() => {
                    const displayFiles = tabIndex === 0 ? files : sharedFiles;
                    if (displayFiles.length === 0) return (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <InsertDriveFile sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="h6" color="text.secondary">{tabIndex === 0 ? 'No files uploaded' : 'No shared files'}</Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>
                                {tabIndex === 0 ? 'Upload your first file to get started' : 'Files shared with you will appear here'}
                            </Typography>
                        </Box>
                    );
                    return (
                        <List sx={{ py: 0 }}>
                            {displayFiles.map((f, i) => (
                                <Box key={f.id}>
                                    <ListItem sx={{ py: 2, px: 3, '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}
                                        secondaryAction={
                                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                <Typography variant="caption" color="text.disabled" sx={{ mr: 1 }}>{formatFileSize(f.file_size)}</Typography>
                                                <Chip label={f.category} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: `${CATEGORY_COLORS[f.category] || '#888'}18`, color: CATEGORY_COLORS[f.category] || '#888', textTransform: 'capitalize' }} />
                                                <Chip label={f.visibility} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, ml: 0.5 }} />
                                                <Typography variant="caption" color="text.disabled" sx={{ mx: 1 }}>{timeAgo(f.created_at)}</Typography>
                                                <IconButton size="small" onClick={() => dispatch(downloadFile(f.id))}><Download fontSize="small" sx={{ color: '#3D5EE1' }} /></IconButton>
                                                <IconButton size="small" onClick={() => { setShareFileId(f.id); setShareDialog(true); }}><Share fontSize="small" sx={{ color: '#9B59B6' }} /></IconButton>
                                                <IconButton size="small" onClick={() => dispatch(deleteFile(f.id)).then(() => dispatch(fetchFileStats()))}><Delete fontSize="small" sx={{ color: 'text.disabled', '&:hover': { color: '#DC3545' } }} /></IconButton>
                                            </Box>
                                        }>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            {CATEGORY_ICONS[f.category] || <InsertDriveFile />}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={<Typography fontWeight={600}>{f.original_name}</Typography>}
                                            secondary={f.description || f.mime_type}
                                        />
                                    </ListItem>
                                    {i < displayFiles.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </List>
                    );
                })()}
            </Paper>

            {/* Upload Dialog */}
            <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>📤 Upload File</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={12}>
                            <TextField fullWidth label="Description (optional)" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} />
                        </Grid>
                        <Grid size={12}>
                            <FormControl fullWidth><InputLabel>Visibility</InputLabel>
                                <Select value={uploadVisibility} label="Visibility" onChange={e => setUploadVisibility(e.target.value)}>
                                    <MenuItem value="private">Private</MenuItem>
                                    <MenuItem value="shared">Shared</MenuItem>
                                    <MenuItem value="public">Public</MenuItem>
                                </Select></FormControl>
                        </Grid>
                        <Grid size={12}>
                            <Typography variant="caption" color="text.secondary" mb={1} display="block">
                                Max 50 MB • Allowed: PDF, DOC, XLS, PPT, CSV, TXT, JPG, PNG, GIF, SVG, MP4, MP3, ZIP
                            </Typography>
                            <Button variant="outlined" component="label" startIcon={<CloudUpload />} disabled={uploading} fullWidth
                                sx={{ py: 3, border: '2px dashed rgba(61,94,225,0.3)', '&:hover': { border: '2px dashed #3D5EE1' } }}>
                                {uploading ? 'Uploading…' : 'Choose File'}
                                <input ref={fileInputRef} type="file" hidden onChange={handleUpload} />
                            </Button>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Share Dialog */}
            <Dialog open={shareDialog} onClose={() => setShareDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>🔗 Share File</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="User ID to share with" type="number" sx={{ mt: 2 }}
                        value={shareUserId} onChange={e => setShareUserId(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setShareDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleShare} startIcon={<Share />}
                        sx={{ background: 'linear-gradient(135deg, #9B59B6, #8E44AD)' }}>Share</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
