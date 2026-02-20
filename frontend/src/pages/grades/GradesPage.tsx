import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchCategories, createCategory, updateCategory, deleteCategory, seedCategories,
    fetchGrades, createGrade, bulkCreateGrades, updateGrade, deleteGrade,
    fetchStudentGPA, fetchReportCard,
    clearError, clearGPA, clearReportCard,
} from '../../store/slices/gradeSlice';
import type { GradeCategoryItem, GradeItem, StudentGPAItem, ReportCardItem } from '../../store/slices/gradeSlice';
import { fetchExams } from '../../store/slices/examSlice';
import { fetchSubjects } from '../../store/slices/subjectsSlice';
import { fetchClasses } from '../../store/slices/classesSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import {
    Box, Typography, Button, Paper, TextField, InputAdornment, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    Snackbar, Alert, LinearProgress, Breadcrumbs, Link, Skeleton,
    MenuItem, Select, FormControl, InputLabel, Tabs, Tab, Table,
    TableBody, TableCell, TableHead, TableRow, TableContainer, Divider,
} from '@mui/material';
import {
    Search, Add, Edit, Delete, Grade, Refresh, Visibility,
    Print, Settings, School, EmojiEvents, Assessment, TrendingUp,
} from '@mui/icons-material';

// ═════════════════════════════════════════════════════════════════════════
export default function GradesPage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);

    const { categories, grades, total, loading, studentGPA, reportCard, detailLoading, error } = useSelector((s: RootState) => s.grades);
    const { exams } = useSelector((s: RootState) => s.exams);
    const { subjects } = useSelector((s: RootState) => s.subjects);
    const { classes } = useSelector((s: RootState) => s.classes);
    const { students } = useSelector((s: RootState) => s.students);

    // ── Tabs ────────────────────────────────────────────────────────────
    const [tabIndex, setTabIndex] = useState(0);

    // ── Grade entry filters ─────────────────────────────────────────────
    const [examFilter, setExamFilter] = useState<number | ''>('');
    const [classFilter, setClassFilter] = useState<number | ''>('');
    const [subjectFilter, setSubjectFilter] = useState<number | ''>('');
    const [studentFilter, setStudentFilter] = useState<number | ''>('');

    // ── Grade Category dialog ───────────────────────────────────────────
    const [catFormOpen, setCatFormOpen] = useState(false);
    const [editingCatId, setEditingCatId] = useState<number | null>(null);
    const [catForm, setCatForm] = useState({ name: '', min_percentage: 0, max_percentage: 100, grade_point: 4, description: '', is_passing: true, order: 0 });

    // ── Grade entry dialog ──────────────────────────────────────────────
    const [gradeFormOpen, setGradeFormOpen] = useState(false);
    const [editingGradeId, setEditingGradeId] = useState<number | null>(null);
    const [gradeForm, setGradeForm] = useState({ student_id: '' as number | '', exam_id: '' as number | '', subject_id: '' as number | '', class_id: '' as number | '', academic_year: '2025-26', marks_obtained: 0, max_marks: 100, remarks: '' });

    // ── Report card ─────────────────────────────────────────────────────
    const [rcStudentId, setRcStudentId] = useState<number | ''>('');
    const [rcAcademicYear, setRcAcademicYear] = useState('2025-26');

    // ── GPA lookup ──────────────────────────────────────────────────────
    const [gpaStudentId, setGpaStudentId] = useState<number | ''>('');
    const [gpaExamId, setGpaExamId] = useState<number | ''>('');

    // ── Snackbar ────────────────────────────────────────────────────────
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // ── Load ────────────────────────────────────────────────────────────
    const loadGrades = useCallback(() => {
        const params: any = {};
        if (examFilter) params.exam_id = examFilter;
        if (classFilter) params.class_id = classFilter;
        if (subjectFilter) params.subject_id = subjectFilter;
        if (studentFilter) params.student_id = studentFilter;
        dispatch(fetchGrades(params));
    }, [dispatch, examFilter, classFilter, subjectFilter, studentFilter]);

    useEffect(() => { dispatch(fetchCategories()); dispatch(fetchExams({})); dispatch(fetchSubjects({})); dispatch(fetchClasses({})); dispatch(fetchStudents({})); }, [dispatch]);
    useEffect(() => { if (tabIndex === 0) loadGrades(); }, [tabIndex, loadGrades]);
    useEffect(() => { if (error) { setSnackbar({ open: true, message: error, severity: 'error' }); dispatch(clearError()); } }, [error, dispatch]);

    // ── Category handlers ───────────────────────────────────────────────
    const handleOpenAddCat = () => { setEditingCatId(null); setCatForm({ name: '', min_percentage: 0, max_percentage: 100, grade_point: 4, description: '', is_passing: true, order: 0 }); setCatFormOpen(true); };
    const handleOpenEditCat = (c: GradeCategoryItem) => {
        setEditingCatId(c.id);
        setCatForm({ name: c.name, min_percentage: c.min_percentage, max_percentage: c.max_percentage, grade_point: c.grade_point, description: c.description || '', is_passing: c.is_passing, order: c.order });
        setCatFormOpen(true);
    };
    const handleSaveCat = async () => {
        const result = editingCatId
            ? await dispatch(updateCategory({ id: editingCatId, data: catForm }))
            : await dispatch(createCategory(catForm));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingCatId ? 'Updated!' : 'Created!', severity: 'success' });
            setCatFormOpen(false); dispatch(fetchCategories());
        }
    };
    const handleDeleteCat = async (id: number) => {
        const result = await dispatch(deleteCategory(id));
        if (!result.type.endsWith('/rejected')) setSnackbar({ open: true, message: 'Deleted', severity: 'success' });
    };
    const handleSeedDefaults = async () => {
        const result = await dispatch(seedCategories());
        if (!result.type.endsWith('/rejected')) setSnackbar({ open: true, message: 'Default grading scale seeded!', severity: 'success' });
    };

    // ── Grade handlers ──────────────────────────────────────────────────
    const handleOpenAddGrade = () => { setEditingGradeId(null); setGradeForm({ student_id: '', exam_id: '', subject_id: '', class_id: '', academic_year: '2025-26', marks_obtained: 0, max_marks: 100, remarks: '' }); setGradeFormOpen(true); };
    const handleOpenEditGrade = (g: GradeItem) => {
        setEditingGradeId(g.id);
        setGradeForm({ student_id: g.student_id, exam_id: g.exam_id, subject_id: g.subject_id, class_id: g.class_id, academic_year: g.academic_year, marks_obtained: g.marks_obtained, max_marks: g.max_marks, remarks: g.remarks || '' });
        setGradeFormOpen(true);
    };
    const handleSaveGrade = async () => {
        if (!gradeForm.student_id || !gradeForm.exam_id || !gradeForm.subject_id || !gradeForm.class_id) return;
        const result = editingGradeId
            ? await dispatch(updateGrade({ id: editingGradeId, data: { marks_obtained: gradeForm.marks_obtained, max_marks: gradeForm.max_marks, remarks: gradeForm.remarks } }))
            : await dispatch(createGrade(gradeForm));
        if (!result.type.endsWith('/rejected')) {
            setSnackbar({ open: true, message: editingGradeId ? 'Grade updated!' : 'Grade recorded!', severity: 'success' });
            setGradeFormOpen(false); loadGrades();
        }
    };
    const handleDeleteGrade = async (id: number) => {
        const result = await dispatch(deleteGrade(id));
        if (!result.type.endsWith('/rejected')) setSnackbar({ open: true, message: 'Grade deleted', severity: 'success' });
    };

    // ── GPA & Report Card ───────────────────────────────────────────────
    const handleLookupGPA = () => { if (gpaStudentId && gpaExamId) dispatch(fetchStudentGPA({ studentId: gpaStudentId as number, examId: gpaExamId as number })); };
    const handleGenerateReportCard = () => { if (rcStudentId) dispatch(fetchReportCard({ studentId: rcStudentId as number, academicYear: rcAcademicYear })); };

    // ── Print ───────────────────────────────────────────────────────────
    const handlePrint = () => {
        const el = printRef.current;
        if (!el) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<html><head><title>Report Card</title>
            <style>body{font-family:Arial,sans-serif;margin:20px}table{border-collapse:collapse;width:100%}
            th,td{border:1px solid #ddd;padding:8px;text-align:center;font-size:12px}
            th{background:#3D5EE1;color:#fff}h2,h3{color:#333}.pass{color:#51CF66}.fail{color:#DC3545}
            .header{text-align:center;margin-bottom:20px}</style>
            </head><body>${el.innerHTML}</body></html>`);
        win.document.close();
        win.print();
    };

    const gradeColor = (pct: number | null | undefined) => {
        if (pct == null) return '#999';
        if (pct >= 80) return '#51CF66';
        if (pct >= 60) return '#3D5EE1';
        if (pct >= 40) return '#FCC419';
        return '#DC3545';
    };

    // ═══════════════════════════════════════════════════════════════════
    return (
        <Box>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link color="inherit" href="/dashboard" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); }}
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Dashboard</Link>
                <Typography color="text.primary" fontWeight={500}>Grades</Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Grades</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>Record grades, configure scale, view GPA &amp; generate report cards</Typography>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Total Grades', value: total, icon: <Grade />, color: '#3D5EE1' },
                    { label: 'Scale Levels', value: categories.length, icon: <Settings />, color: '#FCC419' },
                    { label: 'Avg %', value: grades.length > 0 ? (grades.reduce((s, g) => s + (g.percentage || 0), 0) / grades.length).toFixed(1) : '—', icon: <TrendingUp />, color: '#51CF66' },
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
                    <Tab label="Grade Entry" icon={<Edit sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Grading Scale" icon={<Settings sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Student Grades" icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab label="Report Cards" icon={<Print sx={{ fontSize: 18 }} />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* ═══ Tab 0: Grade Entry ══════════════════════════════════════ */}
            {tabIndex === 0 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Exam</InputLabel>
                            <Select value={examFilter} label="Exam" onChange={e => setExamFilter(e.target.value as any)}><MenuItem value="">All</MenuItem>{exams.map(x => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}</Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Class</InputLabel>
                            <Select value={classFilter} label="Class" onChange={e => setClassFilter(e.target.value as any)}><MenuItem value="">All</MenuItem>{classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Subject</InputLabel>
                            <Select value={subjectFilter} label="Subject" onChange={e => setSubjectFilter(e.target.value as any)}><MenuItem value="">All</MenuItem>{subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select>
                        </FormControl>
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Refresh"><IconButton onClick={loadGrades} color="primary"><Refresh /></IconButton></Tooltip>
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddGrade}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)', boxShadow: '0 4px 14px rgba(61,94,225,0.35)' }}>Record Grade</Button>
                    </Paper>

                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {loading && <LinearProgress />}
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Exam</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Marks</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>%</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading && grades.length === 0 ? (
                                        Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>)
                                    ) : grades.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}><Assessment sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} /><Typography variant="h6" color="text.secondary">No grades recorded</Typography></TableCell></TableRow>
                                    ) : grades.map(g => (
                                        <TableRow key={g.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{g.student_name || `#${g.student_id}`}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{g.exam_name || `#${g.exam_id}`}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{g.subject_name || `#${g.subject_id}`}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{g.marks_obtained} / {g.max_marks}</Typography></TableCell>
                                            <TableCell><Chip label={`${g.percentage?.toFixed(1)}%`} size="small" sx={{ bgcolor: `${gradeColor(g.percentage)}18`, color: gradeColor(g.percentage), fontWeight: 700 }} /></TableCell>
                                            <TableCell><Chip label={g.grade_name || '—'} size="small" variant="outlined" /></TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEditGrade(g)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => handleDeleteGrade(g.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 1: Grading Scale ═════════════════════════════════════ */}
            {tabIndex === 1 && (
                <>
                    <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Button variant="outlined" onClick={handleSeedDefaults} startIcon={<Settings />}>Seed Defaults</Button>
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddCat}
                            sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Add Grade</Button>
                    </Paper>
                    <Paper sx={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Range (%)</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Grade Point</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Pass</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {categories.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No scale defined. Click "Seed Defaults" to create A+…F.</Typography></TableCell></TableRow>
                                    ) : categories.map(c => (
                                        <TableRow key={c.id} sx={{ '&:hover': { bgcolor: 'rgba(61,94,225,0.04)' } }}>
                                            <TableCell><Chip label={c.name} size="small" sx={{ fontWeight: 700, bgcolor: c.is_passing ? '#51CF6618' : '#DC354518', color: c.is_passing ? '#51CF66' : '#DC3545' }} /></TableCell>
                                            <TableCell><Typography variant="body2">{c.min_percentage}% – {c.max_percentage}%</Typography></TableCell>
                                            <TableCell><Typography variant="body2" fontWeight={600}>{c.grade_point}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" color="text.secondary">{c.description || '—'}</Typography></TableCell>
                                            <TableCell>{c.is_passing ? <Chip label="Pass" size="small" color="success" variant="outlined" /> : <Chip label="Fail" size="small" color="error" variant="outlined" />}</TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Edit"><IconButton size="small" sx={{ color: '#FFC107' }} onClick={() => handleOpenEditCat(c)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#DC3545' }} onClick={() => handleDeleteCat(c.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}

            {/* ═══ Tab 2: Student Grades (GPA lookup) ══════════════════════ */}
            {tabIndex === 2 && (
                <>
                    <Paper sx={{ p: 3, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={2}>Look Up Student GPA</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Student</InputLabel>
                                <Select value={gpaStudentId} label="Student" onChange={e => setGpaStudentId(e.target.value as any)}>
                                    {students.map(s => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Exam</InputLabel>
                                <Select value={gpaExamId} label="Exam" onChange={e => setGpaExamId(e.target.value as any)}>
                                    {exams.map(x => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <Button variant="contained" onClick={handleLookupGPA} disabled={!gpaStudentId || !gpaExamId}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Lookup</Button>
                        </Box>
                    </Paper>

                    {detailLoading && <LinearProgress sx={{ mb: 2 }} />}

                    {studentGPA && (
                        <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>{studentGPA.student_name}</Typography>
                                    <Typography variant="body2" color="text.secondary">{studentGPA.exam_name} • {studentGPA.class_name} • {studentGPA.academic_year}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Card sx={{ bgcolor: '#3D5EE108', px: 2, py: 1, textAlign: 'center', border: '1px solid #3D5EE130' }}>
                                        <Typography variant="caption" color="text.secondary">GPA</Typography>
                                        <Typography variant="h5" fontWeight={700} color="primary">{studentGPA.gpa}</Typography>
                                    </Card>
                                    <Card sx={{ bgcolor: `${gradeColor(studentGPA.overall_percentage)}08`, px: 2, py: 1, textAlign: 'center', border: `1px solid ${gradeColor(studentGPA.overall_percentage)}30` }}>
                                        <Typography variant="caption" color="text.secondary">Percentage</Typography>
                                        <Typography variant="h5" fontWeight={700} sx={{ color: gradeColor(studentGPA.overall_percentage) }}>{studentGPA.overall_percentage}%</Typography>
                                    </Card>
                                    <Chip label={studentGPA.result} size="medium" sx={{ alignSelf: 'center', fontWeight: 700, bgcolor: studentGPA.result === 'Pass' ? '#51CF6618' : '#DC354518', color: studentGPA.result === 'Pass' ? '#51CF66' : '#DC3545' }} />
                                </Box>
                            </Box>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Marks</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>%</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>GPA</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {studentGPA.subjects.map(sg => (
                                            <TableRow key={sg.subject_id}>
                                                <TableCell><Typography variant="body2" fontWeight={600}>{sg.subject_name}</Typography></TableCell>
                                                <TableCell>{sg.marks_obtained} / {sg.max_marks}</TableCell>
                                                <TableCell><Chip label={`${sg.percentage.toFixed(1)}%`} size="small" sx={{ bgcolor: `${gradeColor(sg.percentage)}18`, color: gradeColor(sg.percentage), fontWeight: 700 }} /></TableCell>
                                                <TableCell><Chip label={sg.grade_name || '—'} size="small" variant="outlined" /></TableCell>
                                                <TableCell>{sg.grade_point}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>{studentGPA.total_marks_obtained} / {studentGPA.total_max_marks}</TableCell>
                                            <TableCell><Chip label={`${studentGPA.overall_percentage}%`} size="small" color="primary" /></TableCell>
                                            <TableCell><Chip label={studentGPA.grade || '—'} size="small" color="primary" variant="outlined" /></TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>{studentGPA.gpa}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                </>
            )}

            {/* ═══ Tab 3: Report Cards ═════════════════════════════════════ */}
            {tabIndex === 3 && (
                <>
                    <Paper sx={{ p: 3, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={2}>Generate Report Card</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Student</InputLabel>
                                <Select value={rcStudentId} label="Student" onChange={e => setRcStudentId(e.target.value as any)}>
                                    {students.map(s => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField label="Academic Year" size="small" value={rcAcademicYear} onChange={e => setRcAcademicYear(e.target.value)} sx={{ width: 120 }} />
                            <Button variant="contained" onClick={handleGenerateReportCard} disabled={!rcStudentId}
                                sx={{ background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)' }}>Generate</Button>
                            {reportCard && <Button variant="outlined" startIcon={<Print />} onClick={handlePrint}>Print</Button>}
                        </Box>
                    </Paper>

                    {detailLoading && <LinearProgress sx={{ mb: 2 }} />}

                    {reportCard && (
                        <Box ref={printRef}>
                            <Paper sx={{ p: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                {/* Header */}
                                <Box sx={{ textAlign: 'center', mb: 3 }}>
                                    <Typography variant="h5" fontWeight={700}>Report Card</Typography>
                                    <Divider sx={{ my: 1 }} />
                                    <Grid container spacing={2} sx={{ mt: 1, textAlign: 'left' }}>
                                        <Grid size={{ xs: 6 }}><Typography variant="body2"><strong>Student:</strong> {reportCard.student_name}</Typography></Grid>
                                        <Grid size={{ xs: 6 }}><Typography variant="body2"><strong>Admission No:</strong> {reportCard.admission_number || '—'}</Typography></Grid>
                                        <Grid size={{ xs: 6 }}><Typography variant="body2"><strong>Class:</strong> {reportCard.class_name || '—'}</Typography></Grid>
                                        <Grid size={{ xs: 6 }}><Typography variant="body2"><strong>Academic Year:</strong> {reportCard.academic_year}</Typography></Grid>
                                    </Grid>
                                </Box>

                                {/* Per-exam tables */}
                                {reportCard.exams.map((exam, idx) => (
                                    <Box key={idx} sx={{ mb: 3 }}>
                                        <Typography variant="subtitle1" fontWeight={700} sx={{ bgcolor: '#f8f9fa', p: 1, borderRadius: 1, mb: 1 }}>
                                            {exam.exam_name}
                                            <Chip label={exam.result} size="small" sx={{ ml: 1, fontWeight: 700, bgcolor: exam.result === 'Pass' ? '#51CF6618' : '#DC354518', color: exam.result === 'Pass' ? '#51CF66' : '#DC3545' }} />
                                        </Typography>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>Marks</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>%</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>GP</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {exam.subjects.map(sg => (
                                                        <TableRow key={sg.subject_id}>
                                                            <TableCell>{sg.subject_name}</TableCell>
                                                            <TableCell>{sg.marks_obtained}/{sg.max_marks}</TableCell>
                                                            <TableCell><Chip label={`${sg.percentage.toFixed(1)}%`} size="small" sx={{ bgcolor: `${gradeColor(sg.percentage)}18`, color: gradeColor(sg.percentage) }} /></TableCell>
                                                            <TableCell>{sg.grade_name || '—'}</TableCell>
                                                            <TableCell>{sg.grade_point}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow sx={{ bgcolor: '#f0f2f5' }}>
                                                        <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>{exam.total_marks_obtained}/{exam.total_max_marks}</TableCell>
                                                        <TableCell><strong>{exam.overall_percentage}%</strong></TableCell>
                                                        <TableCell><strong>{exam.grade || '—'}</strong></TableCell>
                                                        <TableCell><strong>{exam.gpa}</strong></TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                ))}

                                {/* Cumulative */}
                                <Divider sx={{ my: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 4 }}>
                                        <Card sx={{ textAlign: 'center', py: 2, border: '1px solid #3D5EE130', bgcolor: '#3D5EE108' }}>
                                            <Typography variant="caption" color="text.secondary">Cumulative GPA</Typography>
                                            <Typography variant="h4" fontWeight={700} color="primary">{reportCard.cumulative_gpa}</Typography>
                                        </Card>
                                    </Grid>
                                    <Grid size={{ xs: 4 }}>
                                        <Card sx={{ textAlign: 'center', py: 2, border: `1px solid ${gradeColor(reportCard.cumulative_percentage)}30`, bgcolor: `${gradeColor(reportCard.cumulative_percentage)}08` }}>
                                            <Typography variant="caption" color="text.secondary">Overall %</Typography>
                                            <Typography variant="h4" fontWeight={700} sx={{ color: gradeColor(reportCard.cumulative_percentage) }}>{reportCard.cumulative_percentage}%</Typography>
                                        </Card>
                                    </Grid>
                                    <Grid size={{ xs: 4 }}>
                                        <Card sx={{ textAlign: 'center', py: 2, border: `1px solid ${reportCard.overall_result === 'Pass' ? '#51CF66' : '#DC3545'}30`, bgcolor: reportCard.overall_result === 'Pass' ? '#51CF6608' : '#DC354508' }}>
                                            <Typography variant="caption" color="text.secondary">Result</Typography>
                                            <Typography variant="h4" fontWeight={700} sx={{ color: reportCard.overall_result === 'Pass' ? '#51CF66' : '#DC3545' }}>{reportCard.overall_result}</Typography>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Box>
                    )}
                </>
            )}

            {/* ═══ DIALOGS ═════════════════════════════════════════════════ */}

            {/* Grade Category Dialog */}
            <Dialog open={catFormOpen} onClose={() => setCatFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingCatId ? 'Edit Grade' : 'Add Grade Category'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="Name" fullWidth required value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. A+" /></Grid>
                        <Grid size={{ xs: 6, sm: 4 }}><TextField label="Min %" type="number" fullWidth value={catForm.min_percentage} onChange={e => setCatForm({ ...catForm, min_percentage: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 6, sm: 4 }}><TextField label="Max %" type="number" fullWidth value={catForm.max_percentage} onChange={e => setCatForm({ ...catForm, max_percentage: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 6, sm: 4 }}><TextField label="Grade Point" type="number" fullWidth value={catForm.grade_point} onChange={e => setCatForm({ ...catForm, grade_point: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 6, sm: 4 }}><TextField label="Order" type="number" fullWidth value={catForm.order} onChange={e => setCatForm({ ...catForm, order: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>Passing?</InputLabel>
                                <Select value={catForm.is_passing ? 'yes' : 'no'} label="Passing?" onChange={e => setCatForm({ ...catForm, is_passing: e.target.value === 'yes' })}>
                                    <MenuItem value="yes">Yes</MenuItem>
                                    <MenuItem value="no">No</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={12}><TextField label="Description" fullWidth value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCatFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveCat}>{editingCatId ? 'Update' : 'Add'}</Button>
                </DialogActions>
            </Dialog>

            {/* Record / Edit Grade Dialog */}
            <Dialog open={gradeFormOpen} onClose={() => setGradeFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>{editingGradeId ? 'Edit Grade' : 'Record Grade'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required disabled={!!editingGradeId}>
                                <InputLabel>Student</InputLabel>
                                <Select value={gradeForm.student_id} label="Student" onChange={e => setGradeForm({ ...gradeForm, student_id: Number(e.target.value) })}>
                                    {students.map(s => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required disabled={!!editingGradeId}>
                                <InputLabel>Exam</InputLabel>
                                <Select value={gradeForm.exam_id} label="Exam" onChange={e => setGradeForm({ ...gradeForm, exam_id: Number(e.target.value) })}>
                                    {exams.map(x => <MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required disabled={!!editingGradeId}>
                                <InputLabel>Subject</InputLabel>
                                <Select value={gradeForm.subject_id} label="Subject" onChange={e => setGradeForm({ ...gradeForm, subject_id: Number(e.target.value) })}>
                                    {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required disabled={!!editingGradeId}>
                                <InputLabel>Class</InputLabel>
                                <Select value={gradeForm.class_id} label="Class" onChange={e => setGradeForm({ ...gradeForm, class_id: Number(e.target.value) })}>
                                    {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="Academic Year" fullWidth value={gradeForm.academic_year} onChange={e => setGradeForm({ ...gradeForm, academic_year: e.target.value })} disabled={!!editingGradeId} /></Grid>
                        <Grid size={{ xs: 6, sm: 4 }}><TextField label="Marks" type="number" fullWidth value={gradeForm.marks_obtained} onChange={e => setGradeForm({ ...gradeForm, marks_obtained: Number(e.target.value) })} /></Grid>
                        <Grid size={{ xs: 6, sm: 4 }}><TextField label="Max Marks" type="number" fullWidth value={gradeForm.max_marks} onChange={e => setGradeForm({ ...gradeForm, max_marks: Number(e.target.value) })} /></Grid>
                        <Grid size={12}><TextField label="Remarks" fullWidth multiline rows={2} value={gradeForm.remarks} onChange={e => setGradeForm({ ...gradeForm, remarks: e.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGradeFormOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveGrade}>{editingGradeId ? 'Update' : 'Record'}</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
