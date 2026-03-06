import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

// Types
export interface Teacher {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone?: string;
    specialization?: string;
    status: string;
    hire_date: string;
    user_id: number;
}

export interface TeacherListItem {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone?: string;
    specialization?: string;
    status: string;
    hire_date: string;
}

interface TeachersState {
    teachers: TeacherListItem[];
    currentTeacher: Teacher | null;
    total: number;
    skip: number;
    limit: number;
    loading: boolean;
    error: string | null;
    searchQuery: string;
    statusFilter: string;
}

const initialState: TeachersState = {
    teachers: [],
    currentTeacher: null,
    total: 0,
    skip: 0,
    limit: 50,
    loading: false,
    error: null,
    searchQuery: '',
    statusFilter: '',
};

// Async thunks
export const fetchTeachers = createAsyncThunk(
    'teachers/fetchTeachers',
    async (params: { skip?: number; limit?: number; search?: string; status?: string; specialization?: string }, { rejectWithValue }) => {
        try {
            const response = await api.get('/teachers/', { params });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch teachers');
        }
    }
);

export const fetchTeacherById = createAsyncThunk(
    'teachers/fetchTeacherById',
    async (id: number, { rejectWithValue }) => {
        try {
            const response = await api.get(`/teachers/${id}`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch teacher');
        }
    }
);

export const createTeacher = createAsyncThunk(
    'teachers/createTeacher',
    async (teacherData: Partial<Teacher>, { rejectWithValue }) => {
        try {
            const response = await api.post('/teachers/', teacherData);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to create teacher');
        }
    }
);

export const updateTeacher = createAsyncThunk(
    'teachers/updateTeacher',
    async ({ id, data }: { id: number; data: Partial<Teacher> }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/teachers/${id}`, data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update teacher');
        }
    }
);

export const deleteTeacher = createAsyncThunk(
    'teachers/deleteTeacher',
    async (id: number, { rejectWithValue }) => {
        try {
            await api.delete(`/teachers/${id}`);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete teacher');
        }
    }
);

// Slice
const teachersSlice = createSlice({
    name: 'teachers',
    initialState,
    reducers: {
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
            state.skip = 0;
        },
        setStatusFilter: (state, action: PayloadAction<string>) => {
            state.statusFilter = action.payload;
            state.skip = 0;
        },
        setPage: (state, action: PayloadAction<number>) => {
            state.skip = action.payload * state.limit;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearCurrentTeacher: (state) => {
            state.currentTeacher = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTeachers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTeachers.fulfilled, (state, action) => {
                state.loading = false;
                state.teachers = action.payload.teachers;
                state.total = action.payload.total;
            })
            .addCase(fetchTeachers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchTeacherById.fulfilled, (state, action) => {
                state.currentTeacher = action.payload;
            })
            .addCase(createTeacher.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateTeacher.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(deleteTeacher.fulfilled, (state, action) => {
                state.teachers = state.teachers.filter(t => t.id !== action.payload);
                state.total -= 1;
            });
    },
});

export const { setSearchQuery, setStatusFilter, setPage, clearError, clearCurrentTeacher } = teachersSlice.actions;
export default teachersSlice.reducer;
