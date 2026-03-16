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

export interface NotificationItem {
    id: number;
    title: string;
    message: string;
    category: string;
    date: string;
    is_read: boolean;
}

interface ParentDashboardState {
    children: ChildInfo[];
    feeStatus: FeeStatus | null;
    notifications: NotificationItem[];
    loading: boolean;
    error: string | null;
}

const initialState: ParentDashboardState = {
    children: [],
    feeStatus: null,
    notifications: [],
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

export const fetchParentNotifications = createAsyncThunk(
    'parentDashboard/fetchNotifications',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/parent-profile/me/notifications');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch notifications');
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
                const data = action.payload;
                // Map from backend schema (total_fee/paid_amount/pending_amount) to our FeeStatus shape
                state.feeStatus = {
                    total_fees: data.total_fee ?? data.total_fees ?? 0,
                    paid: data.paid_amount ?? data.paid ?? 0,
                    pending: data.pending_amount ?? data.pending ?? 0,
                    due_date: data.due_date,
                    payment_history: data.payment_items?.map((i: any) => ({
                        date: i.paid_date || i.due_date,
                        amount: i.amount,
                        receipt_no: i.receipt_number || '',
                    })) || data.payment_history || [],
                };
            })
            .addCase(fetchParentNotifications.fulfilled, (state, action) => {
                state.notifications = action.payload.notifications || action.payload || [];
            });
    },
});

export const { clearParentDashboard } = parentDashboardSlice.actions;
export default parentDashboardSlice.reducer;
