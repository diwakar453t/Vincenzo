import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ExamScheduleItem {
    id: number; exam_id: number; subject_id: number; exam_date: string;
    start_time: string; end_time: string; room_id?: number | null;
    max_marks: number; passing_marks: number; instructions?: string | null;
    subject_name?: string | null; room_name?: string | null;
    created_at: string; updated_at: string;
}

export interface ExamDetail {
    id: number; name: string; description?: string; exam_type: string;
    academic_year: string; status: string; class_id: number; class_name?: string;
    start_date?: string | null; end_date?: string | null;
    total_marks: number; passing_marks: number;
    schedules: ExamScheduleItem[]; schedule_count: number;
    tenant_id: string; created_at: string; updated_at: string;
}

export interface ExamListItem {
    id: number; name: string; exam_type: string; academic_year: string;
    status: string; class_id: number; class_name?: string;
    start_date?: string | null; end_date?: string | null;
    total_marks: number; passing_marks: number; schedule_count: number;
}

export interface CalendarEvent {
    id: number; exam_id: number; exam_name: string; subject_name: string;
    class_name?: string; exam_date: string; start_time: string; end_time: string;
    room_name?: string; exam_type: string; status: string;
}

interface ExamState {
    exams: ExamListItem[];
    currentExam: ExamDetail | null;
    calendarEvents: CalendarEvent[];
    total: number;
    loading: boolean;
    detailLoading: boolean;
    error: string | null;
}

const initialState: ExamState = {
    exams: [], currentExam: null, calendarEvents: [],
    total: 0, loading: false, detailLoading: false, error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Thunks ─────────────────────────────────────────────────────────────

export const fetchExams = createAsyncThunk('exams/fetchExams',
    async (params: { class_id?: number; status_filter?: string; exam_type?: string; search?: string } = {}, { rejectWithValue }) => {
        try { const r = await axios.get(`${API_URL}/exams`, { ...authHeader(), params }); return r.data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to fetch exams'); }
    });

export const fetchExamById = createAsyncThunk('exams/fetchExamById',
    async (id: number, { rejectWithValue }) => {
        try { const r = await axios.get(`${API_URL}/exams/${id}`, authHeader()); return r.data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to fetch exam'); }
    });

export const createExam = createAsyncThunk('exams/createExam',
    async (data: any, { rejectWithValue }) => {
        try { const r = await axios.post(`${API_URL}/exams`, data, authHeader()); return r.data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to create exam'); }
    });

export const updateExam = createAsyncThunk('exams/updateExam',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { const r = await axios.put(`${API_URL}/exams/${id}`, data, authHeader()); return r.data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to update exam'); }
    });

export const deleteExam = createAsyncThunk('exams/deleteExam',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/exams/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to delete exam'); }
    });

// Schedule thunks
export const addSchedule = createAsyncThunk('exams/addSchedule',
    async ({ examId, data }: { examId: number; data: any }, { rejectWithValue }) => {
        try { const r = await axios.post(`${API_URL}/exams/${examId}/schedules`, data, authHeader()); return r.data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to add schedule'); }
    });

export const updateSchedule = createAsyncThunk('exams/updateSchedule',
    async ({ scheduleId, data }: { scheduleId: number; data: any }, { rejectWithValue }) => {
        try { const r = await axios.put(`${API_URL}/exams/schedules/${scheduleId}`, data, authHeader()); return r.data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to update schedule'); }
    });

export const deleteSchedule = createAsyncThunk('exams/deleteSchedule',
    async (scheduleId: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/exams/schedules/${scheduleId}`, authHeader()); return scheduleId; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to delete schedule'); }
    });

export const fetchCalendar = createAsyncThunk('exams/fetchCalendar',
    async (params: { month?: number; year?: number; class_id?: number } = {}, { rejectWithValue }) => {
        try { const r = await axios.get(`${API_URL}/exams/calendar`, { ...authHeader(), params }); return r.data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed to fetch calendar'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const examSlice = createSlice({
    name: 'exams',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearCurrentExam: (state) => { state.currentExam = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchExams.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchExams.fulfilled, (state, action) => { state.loading = false; state.exams = action.payload.exams; state.total = action.payload.total; })
            .addCase(fetchExams.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
            .addCase(fetchExamById.pending, (state) => { state.detailLoading = true; })
            .addCase(fetchExamById.fulfilled, (state, action) => { state.detailLoading = false; state.currentExam = action.payload; })
            .addCase(fetchExamById.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload as string; })
            .addCase(deleteExam.fulfilled, (state, action) => { state.exams = state.exams.filter(e => e.id !== action.payload); state.total -= 1; })
            .addCase(fetchCalendar.fulfilled, (state, action) => { state.calendarEvents = action.payload.events || []; })
            // Error handlers
            .addCase(createExam.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateExam.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(deleteExam.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(addSchedule.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateSchedule.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(deleteSchedule.rejected, (state, action) => { state.error = action.payload as string; });
    },
});

export const { clearError, clearCurrentExam } = examSlice.actions;
export default examSlice.reducer;
