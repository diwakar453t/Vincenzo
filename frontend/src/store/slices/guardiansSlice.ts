import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface Guardian {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email?: string;
    phone: string;
    alt_phone?: string;
    address?: string;
    occupation?: string;
    annual_income?: string;
    relationship_type: string;
    status: string;
    student_count: number;
    linked_students?: {
        id: number;
        student_id: string;
        full_name: string;
        class_id?: number;
        status: string;
    }[];
}

interface GuardiansState {
    guardians: Guardian[];
    currentGuardian: Guardian | null;
    total: number;
    skip: number;
    limit: number;
    loading: boolean;
    error: string | null;
    searchQuery: string;
    statusFilter: string;
}

const initialState: GuardiansState = {
    guardians: [],
    currentGuardian: null,
    total: 0,
    skip: 0,
    limit: 50,
    loading: false,
    error: null,
    searchQuery: '',
    statusFilter: '',
};

export const fetchGuardians = createAsyncThunk(
    'guardians/fetchGuardians',
    async (params: { skip?: number; limit?: number; search?: string; status?: string; relationship_type?: string }, { rejectWithValue }) => {
        try {
            const response = await api.get('/guardians', { params });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch guardians');
        }
    }
);

export const fetchGuardianById = createAsyncThunk(
    'guardians/fetchGuardianById',
    async (id: number, { rejectWithValue }) => {
        try {
            const response = await api.get(`/guardians/${id}`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch guardian');
        }
    }
);

export const createGuardian = createAsyncThunk(
    'guardians/createGuardian',
    async (data: any, { rejectWithValue }) => {
        try {
            const response = await api.post('/guardians', data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to create guardian');
        }
    }
);

export const updateGuardian = createAsyncThunk(
    'guardians/updateGuardian',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/guardians/${id}`, data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update guardian');
        }
    }
);

export const deleteGuardian = createAsyncThunk(
    'guardians/deleteGuardian',
    async (id: number, { rejectWithValue }) => {
        try {
            await api.delete(`/guardians/${id}`);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete guardian');
        }
    }
);

export const linkStudent = createAsyncThunk(
    'guardians/linkStudent',
    async ({ guardianId, studentId }: { guardianId: number; studentId: number }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/guardians/${guardianId}/link/${studentId}`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to link student');
        }
    }
);

export const unlinkStudent = createAsyncThunk(
    'guardians/unlinkStudent',
    async ({ guardianId, studentId }: { guardianId: number; studentId: number }, { rejectWithValue }) => {
        try {
            await api.delete(`/guardians/${guardianId}/unlink/${studentId}`);
            return { guardianId, studentId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to unlink student');
        }
    }
);

const guardiansSlice = createSlice({
    name: 'guardians',
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
        clearError: (state) => { state.error = null; },
        clearCurrentGuardian: (state) => { state.currentGuardian = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchGuardians.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchGuardians.fulfilled, (state, action) => {
                state.loading = false;
                state.guardians = action.payload.guardians || [];
                state.total = action.payload.total || 0;
                state.skip = action.payload.skip || 0;
                state.limit = action.payload.limit || 50;
            })
            .addCase(fetchGuardians.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchGuardianById.pending, (state) => { state.loading = true; })
            .addCase(fetchGuardianById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentGuardian = action.payload;
            })
            .addCase(fetchGuardianById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createGuardian.pending, (state) => { state.loading = true; })
            .addCase(createGuardian.fulfilled, (state) => { state.loading = false; })
            .addCase(createGuardian.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(updateGuardian.pending, (state) => { state.loading = true; })
            .addCase(updateGuardian.fulfilled, (state) => { state.loading = false; })
            .addCase(updateGuardian.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(deleteGuardian.fulfilled, (state, action) => {
                state.guardians = state.guardians.filter(g => g.id !== action.payload);
                state.total = Math.max(0, state.total - 1);
            })
            .addCase(deleteGuardian.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const { setSearchQuery, setStatusFilter, setPage, clearError, clearCurrentGuardian } = guardiansSlice.actions;
export default guardiansSlice.reducer;
