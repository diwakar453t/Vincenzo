import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface GradeCategoryItem {
    id: number; tenant_id: string; name: string;
    min_percentage: number; max_percentage: number; grade_point: number;
    description?: string | null; is_passing: boolean; order: number;
    created_at: string; updated_at: string;
}

export interface GradeItem {
    id: number; tenant_id: string; student_id: number; exam_id: number;
    subject_id: number; class_id: number; academic_year: string;
    marks_obtained: number; max_marks: number; percentage?: number | null;
    grade_name?: string | null; grade_point?: number | null;
    remarks?: string | null;
    student_name?: string; exam_name?: string; subject_name?: string; class_name?: string;
    created_at: string; updated_at: string;
}

export interface SubjectGradeItem {
    subject_id: number; subject_name: string;
    marks_obtained: number; max_marks: number; percentage: number;
    grade_name?: string | null; grade_point?: number | null; remarks?: string | null;
}

export interface StudentGPAItem {
    student_id: number; student_name: string; exam_id: number; exam_name: string;
    class_name?: string; academic_year: string; subjects: SubjectGradeItem[];
    total_marks_obtained: number; total_max_marks: number;
    overall_percentage: number; gpa: number; grade?: string | null; result: string;
}

export interface ReportCardItem {
    student_id: number; student_name: string; admission_number?: string;
    class_name?: string; academic_year: string; exams: StudentGPAItem[];
    cumulative_gpa: number; cumulative_percentage: number; overall_result: string;
}

interface GradeState {
    categories: GradeCategoryItem[];
    grades: GradeItem[];
    total: number;
    studentGPA: StudentGPAItem | null;
    reportCard: ReportCardItem | null;
    loading: boolean;
    detailLoading: boolean;
    error: string | null;
}

const initialState: GradeState = {
    categories: [], grades: [], total: 0,
    studentGPA: null, reportCard: null,
    loading: false, detailLoading: false, error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Thunks ─────────────────────────────────────────────────────────────

// Categories
export const fetchCategories = createAsyncThunk('grades/fetchCategories',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/grades/categories`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to fetch categories'); }
    });

export const createCategory = createAsyncThunk('grades/createCategory',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/grades/categories`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateCategory = createAsyncThunk('grades/updateCategory',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/grades/categories/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteCategory = createAsyncThunk('grades/deleteCategory',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/grades/categories/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const seedCategories = createAsyncThunk('grades/seedCategories',
    async (_, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/grades/categories/seed`, {}, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// Grades
export const fetchGrades = createAsyncThunk('grades/fetchGrades',
    async (params: { exam_id?: number; class_id?: number; student_id?: number; subject_id?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/grades`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createGrade = createAsyncThunk('grades/createGrade',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/grades`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const bulkCreateGrades = createAsyncThunk('grades/bulkCreateGrades',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/grades/bulk`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateGrade = createAsyncThunk('grades/updateGrade',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/grades/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteGrade = createAsyncThunk('grades/deleteGrade',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/grades/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// GPA & Report Card
export const fetchStudentGPA = createAsyncThunk('grades/fetchStudentGPA',
    async ({ studentId, examId }: { studentId: number; examId: number }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/grades/gpa/${studentId}/${examId}`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchReportCard = createAsyncThunk('grades/fetchReportCard',
    async ({ studentId, academicYear }: { studentId: number; academicYear: string }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/grades/report-card/${studentId}`, { ...authHeader(), params: { academic_year: academicYear } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const gradeSlice = createSlice({
    name: 'grades',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearGPA: (state) => { state.studentGPA = null; },
        clearReportCard: (state) => { state.reportCard = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCategories.fulfilled, (state, action) => { state.categories = action.payload.categories || []; })
            .addCase(seedCategories.fulfilled, (state, action) => { state.categories = action.payload.categories || []; })
            .addCase(deleteCategory.fulfilled, (state, action) => { state.categories = state.categories.filter(c => c.id !== action.payload); })
            .addCase(fetchGrades.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchGrades.fulfilled, (state, action) => { state.loading = false; state.grades = action.payload.grades; state.total = action.payload.total; })
            .addCase(fetchGrades.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
            .addCase(deleteGrade.fulfilled, (state, action) => { state.grades = state.grades.filter(g => g.id !== action.payload); state.total -= 1; })
            .addCase(fetchStudentGPA.pending, (state) => { state.detailLoading = true; })
            .addCase(fetchStudentGPA.fulfilled, (state, action) => { state.detailLoading = false; state.studentGPA = action.payload; })
            .addCase(fetchStudentGPA.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload as string; })
            .addCase(fetchReportCard.pending, (state) => { state.detailLoading = true; })
            .addCase(fetchReportCard.fulfilled, (state, action) => { state.detailLoading = false; state.reportCard = action.payload; })
            .addCase(fetchReportCard.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload as string; })
            // Generic error handlers
            .addCase(createCategory.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateCategory.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(createGrade.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(bulkCreateGrades.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateGrade.rejected, (state, action) => { state.error = action.payload as string; });
    },
});

export const { clearError, clearGPA, clearReportCard } = gradeSlice.actions;
export default gradeSlice.reducer;
