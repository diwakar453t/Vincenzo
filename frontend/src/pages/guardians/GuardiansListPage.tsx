import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchGuardians, deleteGuardian, setSearchQuery, setStatusFilter, setPage, clearError,
} from '../../store/slices/guardiansSlice';
import {
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, TextField, InputAdornment, Chip,
    IconButton, Avatar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
    MenuItem, Select, FormControl, InputLabel, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton,
} from '@mui/material';
import {
    Search, Add, Edit, Delete, Visibility, People, CheckCircle, Cancel, Refresh,
    FamilyRestroom,
} from '@mui/icons-material';

export default function GuardiansListPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { guardians, total, skip, limit, loading, error, searchQuery, statusFilter } = useSelector(
        (state: RootState) => state.guardians
    );

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewGuardian, setViewGuardian] = useState<any>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });

    const loadGuardians = useCallback(() => {
        dispatch(fetchGuardians({
            skip, limit,
            search: searchQuery || undefined,
            status: statusFilter || undefined,
        }));
    }, [dispatch, skip, limit, searchQuery, statusFilter]);

    useEffect(() => { loadGuardians(); }, [loadGuardians]);
    useEffect(() => {
        if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); }
    }, [error, dispatch]);

    const handlePageChange = (_: unknown, newPage: number) => dispatch(setPage(newPage));
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setSearchQuery(e.target.value));
    const handleStatusFilter = (e: any) => dispatch(setStatusFilter(e.target.value));

    const handleDeleteConfirm = async () => {
        if (selectedId) {
            const result = await dispatch(deleteGuardian(selectedId));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: 'Guardian deleted successfully', severity: 'success' });
                loadGuardians();
            }
        }
        setDeleteDialogOpen(false);
    };

    const getAvatarColor = (name: string) => {
        const colors = ['#3D5EE1', '#FF6B6B', '#51CF66', '#FCC419', '#845EF7', '#FF922B', '#22B8CF', '#E64980'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const getRelationChip = (type: string) => {
        const colorMap: Record<string, string> = {
            father: '#3D5EE1', mother: '#E64980', guardian: '#845EF7',
            uncle: '#FF922B', aunt: '#22B8CF', grandparent: '#FCC419', other: '#666',
        };
        return <Chip label={type.charAt(0).toUpperCase() + type.slice(1)} size="small"
            sx={{ bgcolor: `${colorMap[type] || '#666'}15`, color: colorMap[type] || '#666', fontWeight: 600, fontSize: '0.75rem' }} />;
    };

    const activeCount = guardians.filter(g => g.status === 'active').length;
    const currentPage = Math.floor(skip / limit);

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Guardians</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Guardians</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage parents and guardians</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/guardians/add')}
                    sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>
                    Add Guardian
                </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Guardians', value: total, icon: <FamilyRestroom />, color: '#3D5EE1', bg: 'rgba(61,94,225,0.1)' },
                    { label: 'Active', value: activeCount, icon: <CheckCircle />, color: '#28A745', bg: 'rgba(40,167,69,0.1)' },
                    { label: 'Inactive', value: total - activeCount, icon: <Cancel />, color: '#DC3545', bg: 'rgba(220,53,69,0.1)' },
                ].map((stat) => (
                    <Grid size={{ xs: 6, md: 4 }} key={stat.label}>
                        <Card sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>{stat.icon}</Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <TextField placeholder="Search guardians..." size="small" value={searchQuery} onChange={handleSearch} sx={{ minWidth: 260, flex: 1 }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> } }} />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={handleStatusFilter}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                </FormControl>
                <Tooltip title="Refresh"><IconButton onClick={loadGuardians} color="primary"><Refresh /></IconButton></Tooltip>
            </Paper>

            <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {loading && <LinearProgress />}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Guardian</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Relationship</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && guardians.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                            ) : guardians.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                        <FamilyRestroom sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">No guardians found</Typography>
                                        <Typography variant="body2" color="text.disabled" mb={2}>Add your first guardian to get started</Typography>
                                        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/guardians/add')}>Add Guardian</Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                guardians.map((guardian) => (
                                    <TableRow key={guardian.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: getAvatarColor(guardian.full_name), fontSize: '0.875rem', fontWeight: 600 }}>
                                                    {guardian.first_name[0]}{guardian.last_name[0]}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight={600}>{guardian.full_name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{getRelationChip(guardian.relationship_type)}</TableCell>
                                        <TableCell><Typography variant="body2" color="text.secondary">{guardian.phone}</Typography></TableCell>
                                        <TableCell><Typography variant="body2" color="text.secondary">{guardian.email || '—'}</Typography></TableCell>
                                        <TableCell>
                                            <Chip label={guardian.student_count} size="small" color={guardian.student_count > 0 ? 'primary' : 'default'}
                                                icon={<People sx={{ fontSize: 14 }} />} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={guardian.status === 'active' ? 'Active' : 'Inactive'} size="small"
                                                color={guardian.status === 'active' ? 'success' : 'error'}
                                                icon={guardian.status === 'active' ? <CheckCircle sx={{ fontSize: 14 }} /> : <Cancel sx={{ fontSize: 14 }} />} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                                <Tooltip title="View"><IconButton size="small" sx={{ color: '#3D5EE1' }}
                                                    onClick={() => { setViewGuardian(guardian); setViewDialogOpen(true); }}><Visibility fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }}
                                                    onClick={() => navigate(`/guardians/edit/${guardian.id}`)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }}
                                                    onClick={() => { setSelectedId(guardian.id); setDeleteDialogOpen(true); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination component="div" count={total} page={currentPage} onPageChange={handlePageChange}
                    rowsPerPage={limit} rowsPerPageOptions={[10, 25, 50]} onRowsPerPageChange={() => { }} />
            </Paper>

            {/* View Dialog */}
            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>Guardian Details</DialogTitle>
                <DialogContent dividers>
                    {viewGuardian && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Avatar sx={{ width: 56, height: 56, bgcolor: getAvatarColor(viewGuardian.full_name), fontSize: '1.25rem', fontWeight: 700 }}>
                                    {viewGuardian.first_name[0]}{viewGuardian.last_name[0]}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>{viewGuardian.full_name}</Typography>
                                    {getRelationChip(viewGuardian.relationship_type)}
                                </Box>
                            </Box>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Phone', value: viewGuardian.phone },
                                    { label: 'Email', value: viewGuardian.email || '—' },
                                    { label: 'Occupation', value: viewGuardian.occupation || '—' },
                                    { label: 'Status', value: viewGuardian.status },
                                    { label: 'Linked Students', value: viewGuardian.student_count },
                                ].map((item) => (
                                    <Grid size={{ xs: 6 }} key={item.label}>
                                        <Typography variant="caption" color="text.secondary" display="block">{item.label}</Typography>
                                        <Typography variant="body2" fontWeight={500}>{item.value}</Typography>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                    <Button variant="contained" onClick={() => { setViewDialogOpen(false); navigate(`/guardians/edit/${viewGuardian?.id}`); }}>Edit</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Guardian</DialogTitle>
                <DialogContent><Typography>Are you sure? This cannot be undone.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Delete</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
