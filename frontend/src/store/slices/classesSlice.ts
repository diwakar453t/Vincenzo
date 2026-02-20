import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Types
export interface Class {
    id: number;
    name: string;
    grade_level: number;
    section: string;
    academic_year: string;
    room_number?: string;
    capacity?: number;
    class_teacher_id?: number;
    student_count?: number;
}

export interface ClassListItem {
    id: number;
    name: string;
    grade_level: number;
    section: string;
    academic_year: string;
    room_number?: string;
    capacity?: number;
    class_teacher_id?: number;
    student_count: number;
}

interface ClassesState {
    classes: ClassListItem[];
    currentClass: Class | null;
    total: number;
    skip: number;
    limit: number;
    loading: boolean;
    error: string | null;
}

const initialState: ClassesState = {
    classes: [],
    currentClass: null,
    total: 0,
    skip: 0,
    limit: 50,
    loading: false,
    error: null,
};

// Async thunks
export const fetchClasses = createAsyncThunk(
    'classes/fetchClasses',
    async (params: { skip?: number; limit?: number; academic_year?: string; grade_level?: number }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_URL}/classes`, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch classes');
        }
    }
);

export const fetchClassById = createAsyncThunk(
    'classes/fetchClassById',
    async (id: number, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_URL}/classes/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch class');
        }
    }
);

export const createClass = createAsyncThunk(
    'classes/createClass',
    async (classData: Partial<Class>, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.post(`${API_URL}/classes`, classData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to create class');
        }
    }
);

export const updateClass = createAsyncThunk(
    'classes/updateClass',
    async ({ id, data }: { id: number; data: Partial<Class> }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.put(`${API_URL}/classes/${id}`, data, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update class');
        }
    }
);

export const deleteClass = createAsyncThunk(
    'classes/deleteClass',
    async (id: number, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(`${API_URL}/classes/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete class');
        }
    }
);

// Slice
const classesSlice = createSlice({
    name: 'classes',
    initialState,
    reducers: {
        setPage: (state, action: PayloadAction<number>) => {
            state.skip = action.payload * state.limit;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearCurrentClass: (state) => {
            state.currentClass = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchClasses.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchClasses.fulfilled, (state, action) => {
                state.loading = false;
                state.classes = action.payload.classes;
                state.total = action.payload.total;
            })
            .addCase(fetchClasses.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchClassById.fulfilled, (state, action) => {
                state.currentClass = action.payload;
            })
            .addCase(createClass.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateClass.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(deleteClass.fulfilled, (state, action) => {
                state.classes = state.classes.filter(c => c.id !== action.payload);
                state.total -= 1;
            });
    },
});

export const { setPage, clearError, clearCurrentClass } = classesSlice.actions;
export default classesSlice.reducer;
