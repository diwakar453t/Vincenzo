import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface PeriodItem {
    id: number;
    timetable_id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject_id?: number | null;
    teacher_id?: number | null;
    room_id?: number | null;
    period_type: string;
    subject_name?: string | null;
    teacher_name?: string | null;
    room_name?: string | null;
    created_at: string;
    updated_at: string;
}

export interface TimetableDetail {
    id: number;
    class_id: number;
    class_name?: string;
    academic_year: string;
    name?: string;
    status: string;
    periods: PeriodItem[];
    total_periods: number;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface TimetableListItem {
    id: number;
    class_id: number;
    class_name?: string;
    academic_year: string;
    name?: string;
    status: string;
    total_periods: number;
}

export interface ConflictItem {
    type: string;
    message: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    conflicting_class?: string;
}

interface TimetableState {
    timetables: TimetableListItem[];
    currentTimetable: TimetableDetail | null;
    conflicts: ConflictItem[];
    total: number;
    loading: boolean;
    detailLoading: boolean;
    error: string | null;
}

const initialState: TimetableState = {
    timetables: [],
    currentTimetable: null,
    conflicts: [],
    total: 0,
    loading: false,
    detailLoading: false,
    error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Thunks ─────────────────────────────────────────────────────────────

export const fetchTimetables = createAsyncThunk(
    'timetable/fetchTimetables',
    async (params: { class_id?: number; status?: string } = {}, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/timetable`, { ...authHeader(), params });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch timetables');
        }
    }
);

export const fetchTimetableById = createAsyncThunk(
    'timetable/fetchTimetableById',
    async (id: number, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/timetable/${id}`, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch timetable');
        }
    }
);

export const createTimetable = createAsyncThunk(
    'timetable/createTimetable',
    async (data: any, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/timetable`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to create timetable');
        }
    }
);

export const updateTimetable = createAsyncThunk(
    'timetable/updateTimetable',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${API_URL}/timetable/${id}`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update timetable');
        }
    }
);

export const deleteTimetable = createAsyncThunk(
    'timetable/deleteTimetable',
    async (id: number, { rejectWithValue }) => {
        try {
            await axios.delete(`${API_URL}/timetable/${id}`, authHeader());
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete timetable');
        }
    }
);

// Period thunks
export const addPeriod = createAsyncThunk(
    'timetable/addPeriod',
    async ({ timetableId, data }: { timetableId: number; data: any }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/timetable/${timetableId}/periods`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to add period');
        }
    }
);

export const updatePeriod = createAsyncThunk(
    'timetable/updatePeriod',
    async ({ periodId, data }: { periodId: number; data: any }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${API_URL}/timetable/periods/${periodId}`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update period');
        }
    }
);

export const deletePeriod = createAsyncThunk(
    'timetable/deletePeriod',
    async (periodId: number, { rejectWithValue }) => {
        try {
            await axios.delete(`${API_URL}/timetable/periods/${periodId}`, authHeader());
            return periodId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete period');
        }
    }
);

export const checkConflicts = createAsyncThunk(
    'timetable/checkConflicts',
    async (timetableId: number, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/timetable/${timetableId}/conflicts`, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to check conflicts');
        }
    }
);

// ─── Slice ──────────────────────────────────────────────────────────────

const timetableSlice = createSlice({
    name: 'timetable',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearCurrentTimetable: (state) => { state.currentTimetable = null; state.conflicts = []; },
        clearConflicts: (state) => { state.conflicts = []; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTimetables.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchTimetables.fulfilled, (state, action) => {
                state.loading = false;
                state.timetables = action.payload.timetables;
                state.total = action.payload.total;
            })
            .addCase(fetchTimetables.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
            .addCase(fetchTimetableById.pending, (state) => { state.detailLoading = true; })
            .addCase(fetchTimetableById.fulfilled, (state, action) => { state.detailLoading = false; state.currentTimetable = action.payload; })
            .addCase(fetchTimetableById.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload as string; })
            .addCase(deleteTimetable.fulfilled, (state, action) => {
                state.timetables = state.timetables.filter(t => t.id !== action.payload);
                state.total -= 1;
            })
            .addCase(checkConflicts.fulfilled, (state, action) => { state.conflicts = action.payload.conflicts || []; })
            // Error handlers
            .addCase(createTimetable.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateTimetable.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(deleteTimetable.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(addPeriod.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updatePeriod.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(deletePeriod.rejected, (state, action) => { state.error = action.payload as string; });
    },
});

export const { clearError, clearCurrentTimetable, clearConflicts } = timetableSlice.actions;
export default timetableSlice.reducer;
