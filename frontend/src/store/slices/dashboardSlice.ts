import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

// Types for dashboard data
export interface QuickStatItem {
    title: string;
    value: string;
    icon: string;
    color: string;
    trend?: string;
}

export interface ActivityItem {
    id: number;
    type: string;
    title: string;
    description: string;
    user_name: string;
    timestamp: string;
    icon: string;
}

export interface UpcomingEventItem {
    id: number;
    title: string;
    event_type: string;
    date: string;
    description?: string;
}

export interface AttendanceSummaryData {
    total_students: number;
    present: number;
    absent: number;
    leave: number;
    present_percentage: number;
    period: string;
}

export interface DashboardStatistics {
    quick_stats: QuickStatItem[];
    recent_activities: ActivityItem[];
    upcoming_events: UpcomingEventItem[];
    attendance_summary?: AttendanceSummaryData;
    role: string;
    user_name: string;
}

interface DashboardState {
    statistics: DashboardStatistics | null;
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
}

const initialState: DashboardState = {
    statistics: null,
    loading: false,
    error: null,
    lastFetched: null,
};

// Async thunks
export const fetchDashboardStatistics = createAsyncThunk(
    'dashboard/fetchStatistics',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<DashboardStatistics>('/dashboard/statistics');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch dashboard statistics');
        }
    }
);

export const refreshDashboard = createAsyncThunk(
    'dashboard/refresh',
    async (_, { dispatch }) => {
        return dispatch(fetchDashboardStatistics());
    }
);

// Slice
const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        clearDashboard: (state) => {
            state.statistics = null;
            state.error = null;
            state.lastFetched = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch dashboard statistics
            .addCase(fetchDashboardStatistics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboardStatistics.fulfilled, (state, action: PayloadAction<DashboardStatistics>) => {
                state.loading = false;
                state.statistics = action.payload;
                state.lastFetched = Date.now();
            })
            .addCase(fetchDashboardStatistics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearDashboard, clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
