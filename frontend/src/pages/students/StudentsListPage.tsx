import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchStudents,
    deleteStudent,
    setSearchQuery,
    setStatusFilter,
    setPage,
    clearError,
} from '../../store/slices/studentsSlice';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    InputAdornment,
    Chip,
    IconButton,
    Avatar,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Grid,
    Card,
    CardContent,
    Snackbar,
    Alert,
    LinearProgress,
} from '@mui/material';
import {
    Search,
    Add,
    Edit,
    Delete,
    Visibility,
    FileDownload,
    Upload,
    People,
    PersonAdd,
    School,
    CheckCircle,
    Cancel,
    Refresh,
} from '@mui/icons-material';
import PageWrapper from '../../components/ui/PageWrapper';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import SkeletonTable from '../../components/ui/SkeletonTable';

export default function StudentsListPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { students, total, skip, limit, loading, error, searchQuery, statusFilter } = useSelector(
        (state: RootState) => state.students
    );

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewStudent, setViewStudent] = useState<any>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    });

    const loadStudents = useCallback(() => {
        dispatch(fetchStudents({
            skip,
            limit,
            search: searchQuery || undefined,
            status: statusFilter || undefined,
        }));
    }, [dispatch, skip, limit, searchQuery, statusFilter]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    useEffect(() => {
        if (error) {
            setSnackbar({ open: true, message: error, severity: 'error' });
            dispatch(clearError());
        }
    }, [error, dispatch]);

    const handlePageChange = (_: unknown, newPage: number) => {
        dispatch(setPage(newPage));
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setSearchQuery(e.target.value));
    };

    const handleStatusFilter = (e: any) => {
        dispatch(setStatusFilter(e.target.value));
    };

    const handleDeleteClick = (id: number) => {
        setSelectedStudentId(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (selectedStudentId) {
            const result = await dispatch(deleteStudent(selectedStudentId));
            if (!result.type.endsWith('/rejected')) {
                setSnackbar({ open: true, message: 'Student deleted successfully', severity: 'success' });
                loadStudents();
            }
        }
        setDeleteDialogOpen(false);
    };

    const handleViewStudent = (student: any) => {
        setViewStudent(student);
        setViewDialogOpen(true);
    };

    const getStatusChip = (status: string) => {
        const statusMap: Record<string, { color: 'success' | 'error' | 'warning' | 'default'; icon: React.ReactElement }> = {
            active: { color: 'success', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
            inactive: { color: 'error', icon: <Cancel sx={{ fontSize: 14 }} /> },
            graduated: { color: 'default', icon: <School sx={{ fontSize: 14 }} /> },
            suspended: { color: 'warning', icon: <Cancel sx={{ fontSize: 14 }} /> },
        };
        const config = statusMap[status] || statusMap.active;
        return (
            <Chip
                label={status.charAt(0).toUpperCase() + status.slice(1)}
                color={config.color}
                size="small"
                icon={config.icon}
                sx={{ fontWeight: 500, fontSize: '0.75rem' }}
            />
        );
    };

    const getAvatarColor = (name: string) => {
        const colors = ['#3D5EE1', '#FF6B6B', '#51CF66', '#FCC419', '#845EF7', '#FF922B', '#22B8CF', '#E64980'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const currentPage = Math.floor(skip / limit);
    const activeCount = students.filter(s => s.status === 'active').length;
    const inactiveCount = students.filter(s => s.status === 'inactive').length;

    return (
        <PageWrapper>
            {/* Page Header */}
            <PageHeader
                title="Students"
                subtitle="Manage and monitor student records"
                breadcrumbs={[
                    { label: 'Dashboard', path: '/dashboard' },
                    { label: 'Students' },
                ]}
                actions={
                    <>
                        <Button variant="outlined" startIcon={<Upload />} sx={{ borderColor: 'divider', color: 'text.secondary' }}>Import</Button>
                        <Button variant="outlined" startIcon={<FileDownload />} sx={{ borderColor: 'divider', color: 'text.secondary' }}>Export</Button>
                        <Button
                            variant="contained" startIcon={<Add />}
                            onClick={() => navigate('/students/add')}
                            sx={{
                                background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)',
                                boxShadow: '0 4px 14px rgba(61, 94, 225, 0.35)',
                                '&:hover': { background: 'linear-gradient(135deg, #2A44B8, #3D5EE1)' },
                            }}
                        >
                            Add Student
                        </Button>
                    </>
                }
            />

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Students', value: total, icon: <People />, color: '#3D5EE1', bg: 'rgba(61,94,225,0.1)' },
                    { label: 'Active Students', value: activeCount, icon: <CheckCircle />, color: '#28A745', bg: 'rgba(40,167,69,0.1)' },
                    { label: 'Inactive', value: inactiveCount, icon: <Cancel />, color: '#DC3545', bg: 'rgba(220,53,69,0.1)' },
                    { label: 'New This Month', value: 0, icon: <PersonAdd />, color: '#FFC107', bg: 'rgba(255,193,7,0.1)' },
                ].map((stat) => (
                    <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
                        <Card sx={{
                            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
                        }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                                    {stat.icon}
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Filters & Search */}
            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <TextField
                    placeholder="Search students..."
                    size="small"
                    value={searchQuery}
                    onChange={handleSearch}
                    sx={{ minWidth: 260, flex: 1 }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={handleStatusFilter}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="graduated">Graduated</MenuItem>
                        <MenuItem value="suspended">Suspended</MenuItem>
                    </Select>
                </FormControl>
                <Tooltip title="Refresh">
                    <IconButton onClick={loadStudents} color="primary"><Refresh /></IconButton>
                </Tooltip>
            </Paper>

            {/* Data Table */}
            <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {loading && <LinearProgress />}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                <TableCell sx={{ fontWeight: 600, color: '#495057' }}>Student</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#495057' }}>Student ID</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#495057' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#495057' }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#495057' }}>Enrollment Date</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#495057' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#495057' }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && students.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <TableCell key={j}><Skeleton variant="text" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ p: 0, border: 'none' }}>
                                        <EmptyState
                                            icon={<People />}
                                            title="No students found"
                                            description={
                                                searchQuery
                                                    ? 'Try adjusting your search or filters'
                                                    : 'Add your first student to get started'
                                            }
                                            action={{ label: 'Add Student', onClick: () => navigate('/students/add') }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student) => (
                                    <TableRow key={student.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' }, transition: 'background-color 0.15s' }}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: getAvatarColor(student.full_name), fontSize: '0.875rem', fontWeight: 600 }}>
                                                    {student.first_name[0]}{student.last_name[0]}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight={600}>{student.full_name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={student.student_id} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
                                        </TableCell>
                                        <TableCell><Typography variant="body2" color="text.secondary">{student.email || '—'}</Typography></TableCell>
                                        <TableCell><Typography variant="body2" color="text.secondary">{student.phone || '—'}</Typography></TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {new Date(student.enrollment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{getStatusChip(student.status)}</TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                                <Tooltip title="View Details">
                                                    <IconButton size="small" aria-label="View student details" sx={{ color: '#3D5EE1', '&:hover': { bgcolor: 'rgba(61,94,225,0.1)' } }} onClick={() => handleViewStudent(student)}>
                                                        <Visibility fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Edit">
                                                    <IconButton size="small" aria-label="Edit student" sx={{ color: '#FFC107', '&:hover': { bgcolor: 'rgba(255,193,7,0.1)' } }} onClick={() => navigate(`/students/edit/${student.id}`)}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton size="small" aria-label="Delete student" sx={{ color: '#DC3545', '&:hover': { bgcolor: 'rgba(220,53,69,0.1)' } }} onClick={() => handleDeleteClick(student.id)}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div" count={total} page={currentPage} onPageChange={handlePageChange}
                    rowsPerPage={limit} rowsPerPageOptions={[10, 25, 50, 100]} onRowsPerPageChange={() => { }}
                    sx={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}
                />
            </Paper>

            {/* View Dialog */}
            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>Student Details</DialogTitle>
                <DialogContent dividers>
                    {viewStudent && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Avatar sx={{ width: 56, height: 56, bgcolor: getAvatarColor(viewStudent.full_name), fontSize: '1.25rem', fontWeight: 700 }}>
                                    {viewStudent.first_name[0]}{viewStudent.last_name[0]}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>{viewStudent.full_name}</Typography>
                                    <Typography variant="body2" color="text.secondary">ID: {viewStudent.student_id}</Typography>
                                </Box>
                            </Box>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Email', value: viewStudent.email || '—' },
                                    { label: 'Phone', value: viewStudent.phone || '—' },
                                    { label: 'Status', value: viewStudent.status },
                                    { label: 'Enrollment Date', value: new Date(viewStudent.enrollment_date).toLocaleDateString() },
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
                    <Button variant="contained" onClick={() => { setViewDialogOpen(false); navigate(`/students/edit/${viewStudent?.id}`); }}>Edit</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Student</DialogTitle>
                <DialogContent><Typography>Are you sure you want to delete this student? This action cannot be undone.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </PageWrapper>
    );
}
