import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface ChildInfo {
    id: number;
    student_id: string;
    full_name: string;
    class_name: string;
    section: string;
    attendance_percentage: number;
    gpa: number;
    status: string;
}

export interface FeeStatus {
    total_fees: number;
    paid: number;
    pending: number;
    due_date?: string;
    payment_history: { date: string; amount: number; receipt_no: string }[];
}

interface ParentDashboardState {
    children: ChildInfo[];
    feeStatus: FeeStatus | null;
    loading: boolean;
    error: string | null;
}

const initialState: ParentDashboardState = {
    children: [],
    feeStatus: null,
    loading: false,
    error: null,
};

export const fetchParentChildren = createAsyncThunk(
    'parentDashboard/fetchChildren',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/parent-profile/me/children');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch children');
        }
    }
);

export const fetchParentFeeStatus = createAsyncThunk(
    'parentDashboard/fetchFeeStatus',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/parent-profile/me/fees');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch fee status');
        }
    }
);

const parentDashboardSlice = createSlice({
    name: 'parentDashboard',
    initialState,
    reducers: {
        clearParentDashboard: (state) => { Object.assign(state, initialState); },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchParentChildren.pending, (state) => { state.loading = true; })
            .addCase(fetchParentChildren.fulfilled, (state, action: PayloadAction<any>) => {
                state.loading = false;
                state.children = action.payload.children || action.payload || [];
            })
            .addCase(fetchParentChildren.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchParentFeeStatus.fulfilled, (state, action) => {
                state.feeStatus = action.payload;
            });
    },
});

export const { clearParentDashboard } = parentDashboardSlice.actions;
export default parentDashboardSlice.reducer;
