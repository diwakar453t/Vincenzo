import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchBooks, createBook, updateBook, deleteBook,
    fetchMembers, createMember, updateMember, deleteMember,
    issueBook, returnBook, fetchIssues,
    fetchOverdue, payFine, clearLibraryError,
} from '../../store/slices/librarySlice';
import type { BookItem, MemberItem, IssueReturnItem } from '../../store/slices/librarySlice';
import {
    Box, Typography, Button, Paper, TextField, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, MenuItem, Select,
    FormControl, InputLabel, Tabs, Tab, Table, TableBody, TableCell, TableHead,
    TableRow, TableContainer, InputAdornment,
} from '@mui/material';
import {
    Add, Edit, Delete, Refresh, Search, MenuBook, People, SwapHoriz,
    Warning, LocalLibrary, Assignment, AssignmentReturn,
    CheckCircle,
} from '@mui/icons-material';

const STATUS_COLORS: Record<string, string> = {
    available: '#51CF66', issued: '#3D5EE1', reserved: '#FCC419',
    lost: '#DC3545', damaged: '#FF6B35', withdrawn: '#999',
    returned: '#51CF66', overdue: '#DC3545', active: '#51CF66',
    suspended: '#FF6B35', expired: '#999',
};

const MEMBER_TYPE_ICONS: Record<string, string> = { student: '🎓', teacher: '👨‍🏫', staff: '👤' };

const CATEGORIES = ['Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Literature', 'Technology', 'Arts', 'Reference', 'Journals', 'Other'];

export default function LibraryPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const { books, members, issues, overdueItems,
        loading, error } = useSelector((s: RootState) => s.library);

    const [tabIndex, setTabIndex] = useState(0);
    const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });
    const [searchQuery, setSearchQuery] = useState('');

    // Book dialog
    const [bookDialog, setBookDialog] = useState(false);
    const [editBookItem, setEditBookItem] = useState<BookItem | null>(null);
    const [bookForm, setBookForm] = useState({
        title: '', isbn: '', author: '', publisher: '', edition: '',
        category: '', subject: '', language: 'English', pages: '' as number | '',
        price: '' as number | '', rack_number: '', total_copies: 1,
        description: '', publication_year: '' as number | '',
    });

    // Member dialog
    const [memberDialog, setMemberDialog] = useState(false);
    const [editMemberItem, setEditMemberItem] = useState<MemberItem | null>(null);
    const [memberForm, setMemberForm] = useState({
        member_type: 'student', name: '', email: '', phone: '',
        max_books_allowed: 3,
    });

    // Issue dialog
    const [issueDialog, setIssueDialog] = useState(false);
    const [issueForm, setIssueForm] = useState({
        book_id: '' as number | '', member_id: '' as number | '',
        due_date: '', remarks: '',
    });

    // Return dialog
    const [returnDialog, setReturnDialog] = useState(false);
    const [returnIssue, setReturnIssue] = useState<IssueReturnItem | null>(null);
    const [returnForm, setReturnForm] = useState({ return_date: new Date().toISOString().split('T')[0], remarks: '' });

    useEffect(() => {
        dispatch(fetchBooks({}));
        dispatch(fetchMembers({}));
    }, [dispatch]);

    useEffect(() => {
        if (tabIndex === 2) dispatch(fetchIssues({}));
        if (tabIndex === 3) dispatch(fetchIssues({}));
        if (tabIndex === 4) dispatch(fetchOverdue());
    }, [tabIndex, dispatch]);

    useEffect(() => { if (error) { setSnack({ open: true, msg: error, sev: 'error' }); dispatch(clearLibraryError()); } }, [error, dispatch]);

    // Book search
    const handleSearch = () => {
        dispatch(fetchBooks({ search: searchQuery || undefined }));
    };

    useEffect(() => {
        if (tabIndex === 1) {
            const t = setTimeout(() => { dispatch(fetchBooks({ search: searchQuery || undefined })); }, 300);
            return () => clearTimeout(t);
        }
    }, [searchQuery, tabIndex, dispatch]);

    // ─── Book handlers ──────────────────────────────────────────────────
    const handleSaveBook = async () => {
        const payload = { ...bookForm, pages: bookForm.pages || undefined, price: bookForm.price || undefined, publication_year: bookForm.publication_year || undefined };
        if (editBookItem) await dispatch(updateBook({ id: editBookItem.id, data: payload }));
        else await dispatch(createBook(payload));
        setSnack({ open: true, msg: editBookItem ? 'Book updated!' : 'Book added!', sev: 'success' });
        setBookDialog(false); setEditBookItem(null); dispatch(fetchBooks({}));
    };

    const openEditBook = (b: BookItem) => {
        setEditBookItem(b);
        setBookForm({
            title: b.title, isbn: b.isbn || '', author: b.author,
            publisher: b.publisher || '', edition: b.edition || '',
            category: b.category || '', subject: b.subject || '',
            language: b.language || 'English', pages: b.pages || '',
            price: b.price || '', rack_number: b.rack_number || '',
            total_copies: b.total_copies, description: b.description || '',
            publication_year: b.publication_year || '',
        });
        setBookDialog(true);
    };

    const openNewBook = () => {
        setEditBookItem(null);
        setBookForm({ title: '', isbn: '', author: '', publisher: '', edition: '', category: '', subject: '', language: 'English', pages: '', price: '', rack_number: '', total_copies: 1, description: '', publication_year: '' });
        setBookDialog(true);
    };

    // ─── Member handlers ────────────────────────────────────────────────
    const handleSaveMember = async () => {
        if (editMemberItem) await dispatch(updateMember({ id: editMemberItem.id, data: memberForm }));
        else await dispatch(createMember(memberForm));
        setSnack({ open: true, msg: editMemberItem ? 'Member updated!' : 'Member added!', sev: 'success' });
        setMemberDialog(false); setEditMemberItem(null); dispatch(fetchMembers({}));
    };

    const openEditMember = (m: MemberItem) => {
        setEditMemberItem(m);
        setMemberForm({ member_type: m.member_type, name: m.name, email: m.email || '', phone: m.phone || '', max_books_allowed: m.max_books_allowed });
        setMemberDialog(true);
    };

    // ─── Issue handler ──────────────────────────────────────────────────
    const handleIssue = async () => {
        if (!issueForm.book_id || !issueForm.member_id) return;
        const result = await dispatch(issueBook({ ...issueForm, due_date: issueForm.due_date || undefined, remarks: issueForm.remarks || undefined }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Book issued successfully!', sev: 'success' });
            setIssueDialog(false); dispatch(fetchBooks({})); dispatch(fetchMembers({}));
        }
    };

    // ─── Return handler ─────────────────────────────────────────────────
    const handleReturn = async () => {
        if (!returnIssue) return;
        const result = await dispatch(returnBook({ id: returnIssue.id, data: returnForm }));
        if (!result.type.endsWith('/rejected')) {
            setSnack({ open: true, msg: 'Book returned successfully!', sev: 'success' });
            setReturnDialog(false); setReturnIssue(null); dispatch(fetchBooks({})); dispatch(fetchMembers({})); dispatch(fetchIssues({}));
        }
    };

    const openReturn = (issue: IssueReturnItem) => {
        setReturnIssue(issue);
        setReturnForm({ return_date: new Date().toISOString().split('T')[0], remarks: '' });
        setReturnDialog(true);
    };

    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Library Management</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>📚 Library Management</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Manage books, members, issue & return, track overdue</Typography>
                </Box>
            </Box>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Books', value: books.length, icon: <MenuBook />, color: '#3D5EE1' },
                    { label: 'Members', value: members.length, icon: <People />, color: '#51CF66' },
                    { label: 'Issued', value: issues.filter(i => i.status === 'issued').length, icon: <SwapHoriz />, color: '#FCC419' },
                    { label: 'Overdue', value: overdueItems.length, icon: <Warning />, color: '#DC3545' },
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
                    <Tab label="Book Inventory" icon={<MenuBook sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Search Books" icon={<Search sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Issue / Return" icon={<SwapHoriz sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Borrowing History" icon={<Assignment sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Overdue & Fines" icon={<Warning sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Book Inventory ════════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="outlined" startIcon={<People />} onClick={() => { setEditMemberItem(null); setMemberForm({ member_type: 'student', name: '', email: '', phone: '', max_books_allowed: 3 }); setMemberDialog(true); }}>Add Member</Button>
                        </Box>
                        <Button variant="contained" startIcon={<Add />} onClick={openNewBook}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Add Book</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Author</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>ISBN</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Rack</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Copies</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {books.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                            <LocalLibrary sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No books in inventory</Typography>
                                        </TableCell></TableRow>
                                    ) : books.map(b => (
                                        <TableRow key={b.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{b.title}</Typography>
                                                {b.publisher && <Typography variant="caption" color="text.secondary">{b.publisher}</Typography>}
                                            </TableCell>
                                            <TableCell>{b.author}</TableCell>
                                            <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{b.isbn || '—'}</Typography></TableCell>
                                            <TableCell>{b.category ? <Chip label={b.category} size="small" variant="outlined" /> : '—'}</TableCell>
                                            <TableCell>{b.rack_number || '—'}</TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" fontWeight={700} sx={{ color: b.available_copies > 0 ? '#51CF66' : '#DC3545' }}>
                                                    {b.available_copies}/{b.total_copies}
                                                </Typography>
                                            </TableCell>
                                            <TableCell><Chip label={b.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[b.status] || '#999'}18`, color: STATUS_COLORS[b.status] || '#999', fontWeight: 700, textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditBook(b)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { dispatch(deleteBook(b.id)); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* Members section */}
                    <Typography variant="h6" fontWeight={700} mt={4} mb={2}>📋 Library Members</Typography>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Books Issued</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {members.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                                            <Typography color="text.secondary">No members registered</Typography>
                                        </TableCell></TableRow>
                                    ) : members.map(m => (
                                        <TableRow key={m.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600} sx={{ color: '#3D5EE1', fontFamily: 'monospace' }}>{m.member_code}</Typography></TableCell>
                                            <TableCell>{m.name}</TableCell>
                                            <TableCell><Chip label={`${MEMBER_TYPE_ICONS[m.member_type] || ''} ${m.member_type}`} size="small" variant="outlined" /></TableCell>
                                            <TableCell><Typography variant="body2">{m.email || m.phone || '—'}</Typography></TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight={700} sx={{ color: m.books_issued >= m.max_books_allowed ? '#DC3545' : '#51CF66' }}>
                                                    {m.books_issued}/{m.max_books_allowed}
                                                </Typography>
                                            </TableCell>
                                            <TableCell><Chip label={m.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[m.status] || '#999'}18`, color: STATUS_COLORS[m.status] || '#999', textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditMember(m)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { dispatch(deleteMember(m.id)); }}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 1: Search Books ══════════════════════════════════ */}
            {tabIndex === 1 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <TextField fullWidth placeholder="Search by title, author, ISBN, publisher, or subject..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                                endAdornment: <Button onClick={handleSearch} variant="contained" size="small"
                                    sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Search</Button>
                            }}
                        />
                    </Paper>
                    <Grid container spacing={2}>
                        {books.map(b => (
                            <Grid key={b.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card sx={{ height: '100%', border: '1px solid rgba(0,0,0,0.06)', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }, transition: 'all 0.2s' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Chip label={b.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[b.status] || '#999'}18`, color: STATUS_COLORS[b.status] || '#999', textTransform: 'capitalize' }} />
                                            {b.category && <Chip label={b.category} size="small" variant="outlined" />}
                                        </Box>
                                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ lineHeight: 1.3 }}>{b.title}</Typography>
                                        <Typography variant="body2" color="text.secondary" mb={1}>by {b.author}</Typography>
                                        {b.isbn && <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#666' }}>ISBN: {b.isbn}</Typography>}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
                                            <Typography variant="body2" sx={{ color: b.available_copies > 0 ? '#51CF66' : '#DC3545' }}>
                                                <strong>{b.available_copies}</strong>/{b.total_copies} available
                                            </Typography>
                                            {b.rack_number && <Chip label={`Rack ${b.rack_number}`} size="small" sx={{ bgcolor: '#3D5EE118', color: '#3D5EE1' }} />}
                                        </Box>
                                        {b.price !== null && b.price !== undefined && b.price > 0 && (
                                            <Typography variant="body2" color="text.secondary" mt={1}>Price: ₹{b.price.toLocaleString()}</Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                        {books.length === 0 && !loading && (
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 6, textAlign: 'center' }}>
                                    <Search sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">{searchQuery ? 'No books found' : 'Search for books above'}</Typography>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </>
            )}

            {/* ═══ Tab 2: Issue / Return ════════════════════════════════ */}
            {tabIndex === 2 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
                        <Button variant="contained" startIcon={<Assignment />} onClick={() => {
                            setIssueForm({ book_id: '', member_id: '', due_date: '', remarks: '' });
                            setIssueDialog(true);
                        }} sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Issue Book</Button>
                    </Box>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Book</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Member</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Issue Date</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Return Date</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Fine</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {issues.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                                            <SwapHoriz sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No issue/return records</Typography>
                                        </TableCell></TableRow>
                                    ) : issues.map(i => (
                                        <TableRow key={i.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' }, bgcolor: i.status === 'overdue' ? 'rgba(220,53,69,0.04)' : undefined }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{i.book_title}</Typography>
                                                {i.book_isbn && <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{i.book_isbn}</Typography>}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{i.member_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{i.member_code}</Typography>
                                            </TableCell>
                                            <TableCell>{i.issue_date}</TableCell>
                                            <TableCell>{i.due_date}</TableCell>
                                            <TableCell>{i.return_date || '—'}</TableCell>
                                            <TableCell><Chip label={i.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[i.status] || '#999'}18`, color: STATUS_COLORS[i.status] || '#999', fontWeight: 700, textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell align="right">
                                                {i.fine_amount > 0 ? (
                                                    <Typography fontWeight={700} sx={{ color: i.fine_paid ? '#51CF66' : '#DC3545' }}>
                                                        ₹{i.fine_amount.toFixed(0)} {i.fine_paid ? '✓' : ''}
                                                    </Typography>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {(i.status === 'issued' || i.status === 'overdue') && (
                                                    <Tooltip title="Return Book"><IconButton size="small" color="primary" onClick={() => openReturn(i)}><AssignmentReturn fontSize="small" /></IconButton></Tooltip>
                                                )}
                                                {i.fine_amount > 0 && !i.fine_paid && (
                                                    <Tooltip title="Mark Fine Paid"><IconButton size="small" sx={{ color: '#51CF66' }} onClick={() => { dispatch(payFine(i.id)); setSnack({ open: true, msg: 'Fine marked as paid', sev: 'success' }); }}><CheckCircle fontSize="small" /></IconButton></Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 3: Borrowing History ═════════════════════════════ */}
            {tabIndex === 3 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Filter by Member</InputLabel>
                            <Select value="" label="Filter by Member" onChange={e => dispatch(fetchIssues(e.target.value ? { member_id: Number(e.target.value) } : {}))}>
                                <MenuItem value="">All Members</MenuItem>
                                {members.map(m => <MenuItem key={m.id} value={m.id}>{m.name} ({m.member_code})</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value="" label="Status" onChange={e => dispatch(fetchIssues(e.target.value ? { status: e.target.value } : {}))}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="issued">Issued</MenuItem>
                                <MenuItem value="returned">Returned</MenuItem>
                                <MenuItem value="overdue">Overdue</MenuItem>
                            </Select>
                        </FormControl>
                        <Tooltip title="Refresh"><IconButton color="primary" onClick={() => dispatch(fetchIssues({}))}><Refresh /></IconButton></Tooltip>
                    </Paper>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Book</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Member</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Issued</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Due</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Returned</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Fine</TableCell>
                                </TableRow></TableHead>
                                <TableBody>
                                    {issues.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                            <Assignment sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="h6" color="text.secondary">No borrowing history</Typography>
                                        </TableCell></TableRow>
                                    ) : issues.map(i => (
                                        <TableRow key={i.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{i.book_title}</Typography></TableCell>
                                            <TableCell>{i.member_name}</TableCell>
                                            <TableCell>{i.issue_date}</TableCell>
                                            <TableCell>{i.due_date}</TableCell>
                                            <TableCell>{i.return_date || '—'}</TableCell>
                                            <TableCell><Chip label={i.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[i.status] || '#999'}18`, color: STATUS_COLORS[i.status] || '#999', textTransform: 'capitalize' }} /></TableCell>
                                            <TableCell align="right">{i.fine_amount > 0 ? `₹${i.fine_amount.toFixed(0)}` : '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 4: Overdue & Fines ═══════════════════════════════ */}
            {tabIndex === 4 && (
                <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    {loading && <LinearProgress />}
                    <TableContainer>
                        <Table>
                            <TableHead><TableRow sx={{ bgcolor: '#FFF3CD' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Book</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Member</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Issue Date</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="center">Days Overdue</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Fine</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {overdueItems.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                                        <CheckCircle sx={{ fontSize: 64, color: '#51CF66', mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary">No overdue books! 🎉</Typography>
                                    </TableCell></TableRow>
                                ) : overdueItems.map((o, i) => (
                                    <TableRow key={i} sx={{ '&:hover': { bgcolor: 'rgba(220,53,69,0.04)' } }}>
                                        <TableCell><Typography variant="body2" fontWeight={600}>{o.book_title}</Typography></TableCell>
                                        <TableCell>{o.member_name}</TableCell>
                                        <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#3D5EE1' }}>{o.member_code}</Typography></TableCell>
                                        <TableCell>{o.issue_date}</TableCell>
                                        <TableCell>{o.due_date}</TableCell>
                                        <TableCell align="center"><Chip label={`${o.days_overdue} days`} size="small" sx={{ bgcolor: '#DC354518', color: '#DC3545', fontWeight: 700 }} /></TableCell>
                                        <TableCell align="right"><Typography fontWeight={700} sx={{ color: '#DC3545' }}>₹{o.fine_amount.toFixed(0)}</Typography></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ═══ Book Dialog ════════════════════════════════════════ */}
            <Dialog open={bookDialog} onClose={() => setBookDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editBookItem ? 'Edit Book' : 'Add New Book'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 8 }}><TextField fullWidth label="Title *" value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="ISBN" value={bookForm.isbn} onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Author *" value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Publisher" value={bookForm.publisher} onChange={e => setBookForm({ ...bookForm, publisher: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}>
                            <FormControl fullWidth><InputLabel>Category</InputLabel>
                                <Select value={bookForm.category} label="Category" onChange={e => setBookForm({ ...bookForm, category: e.target.value })}>
                                    <MenuItem value="">None</MenuItem>
                                    {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Subject" value={bookForm.subject} onChange={e => setBookForm({ ...bookForm, subject: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Edition" value={bookForm.edition} onChange={e => setBookForm({ ...bookForm, edition: e.target.value })} /></Grid>
                        <Grid size={{ xs: 3 }}><TextField fullWidth label="Language" value={bookForm.language} onChange={e => setBookForm({ ...bookForm, language: e.target.value })} /></Grid>
                        <Grid size={{ xs: 3 }}><TextField fullWidth label="Pages" type="number" value={bookForm.pages} onChange={e => setBookForm({ ...bookForm, pages: Number(e.target.value) || '' })} /></Grid>
                        <Grid size={{ xs: 3 }}><TextField fullWidth label="Price (₹)" type="number" value={bookForm.price} onChange={e => setBookForm({ ...bookForm, price: Number(e.target.value) || '' })} /></Grid>
                        <Grid size={{ xs: 3 }}><TextField fullWidth label="Year" type="number" value={bookForm.publication_year} onChange={e => setBookForm({ ...bookForm, publication_year: Number(e.target.value) || '' })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Rack Number" value={bookForm.rack_number} onChange={e => setBookForm({ ...bookForm, rack_number: e.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Total Copies" type="number" value={bookForm.total_copies} onChange={e => setBookForm({ ...bookForm, total_copies: Number(e.target.value) || 1 })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Description" value={bookForm.description} onChange={e => setBookForm({ ...bookForm, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBookDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveBook} disabled={!bookForm.title || !bookForm.author}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editBookItem ? 'Update' : 'Add Book'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Member Dialog ══════════════════════════════════════ */}
            <Dialog open={memberDialog} onClose={() => setMemberDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editMemberItem ? 'Edit Member' : 'Add Library Member'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth><InputLabel>Type</InputLabel>
                                <Select value={memberForm.member_type} label="Type" onChange={e => setMemberForm({ ...memberForm, member_type: e.target.value })}>
                                    <MenuItem value="student">🎓 Student</MenuItem>
                                    <MenuItem value="teacher">👨‍🏫 Teacher</MenuItem>
                                    <MenuItem value="staff">👤 Staff</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Max Books" type="number" value={memberForm.max_books_allowed} onChange={e => setMemberForm({ ...memberForm, max_books_allowed: Number(e.target.value) || 3 })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Name *" value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Email" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth label="Phone" value={memberForm.phone} onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMemberDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveMember} disabled={!memberForm.name}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>{editMemberItem ? 'Update' : 'Add Member'}</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Issue Dialog ═══════════════════════════════════════ */}
            <Dialog open={issueDialog} onClose={() => setIssueDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Issue Book</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Book</InputLabel>
                                <Select value={issueForm.book_id} label="Book" onChange={e => setIssueForm({ ...issueForm, book_id: e.target.value as number })}>
                                    {books.filter(b => b.available_copies > 0).map(b => (
                                        <MenuItem key={b.id} value={b.id}>{b.title} — {b.author} ({b.available_copies} avail)</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth><InputLabel>Member</InputLabel>
                                <Select value={issueForm.member_id} label="Member" onChange={e => setIssueForm({ ...issueForm, member_id: e.target.value as number })}>
                                    {members.filter(m => m.status === 'active' && m.books_issued < m.max_books_allowed).map(m => (
                                        <MenuItem key={m.id} value={m.id}>{m.name} ({m.member_code}) — {m.books_issued}/{m.max_books_allowed}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Due Date" type="date" value={issueForm.due_date} InputLabelProps={{ shrink: true }} onChange={e => setIssueForm({ ...issueForm, due_date: e.target.value })} helperText="Default: 14 days from today" /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Remarks" value={issueForm.remarks} onChange={e => setIssueForm({ ...issueForm, remarks: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIssueDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleIssue} disabled={!issueForm.book_id || !issueForm.member_id}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Issue Book</Button>
                </DialogActions>
            </Dialog>

            {/* ═══ Return Dialog ══════════════════════════════════════ */}
            <Dialog open={returnDialog} onClose={() => setReturnDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Return Book</DialogTitle>
                <DialogContent>
                    {returnIssue && (
                        <Box sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, mt: 1 }}>
                            <Typography variant="body2"><strong>Book:</strong> {returnIssue.book_title}</Typography>
                            <Typography variant="body2"><strong>Member:</strong> {returnIssue.member_name} ({returnIssue.member_code})</Typography>
                            <Typography variant="body2"><strong>Issued:</strong> {returnIssue.issue_date} | <strong>Due:</strong> {returnIssue.due_date}</Typography>
                        </Box>
                    )}
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}><TextField fullWidth label="Return Date" type="date" value={returnForm.return_date} InputLabelProps={{ shrink: true }} onChange={e => setReturnForm({ ...returnForm, return_date: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Remarks" value={returnForm.remarks} onChange={e => setReturnForm({ ...returnForm, remarks: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReturnDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleReturn}
                        sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Return Book</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
