import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface StudentProfile {
    id: number;
    student_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    enrollment_date: string;
    status: string;
    class_name?: string;
    section?: string;
    grade_level?: number;
}

export interface ScheduleItem {
    id: number;
    subject: string;
    teacher: string;
    start_time: string;
    end_time: string;
    room: string;
}

export interface ExamResult {
    id: number;
    subject: string;
    exam_type: string;
    marks_obtained: number;
    total_marks: number;
    grade: string;
    date: string;
}

export interface Assignment {
    id: number;
    title: string;
    subject: string;
    due_date: string;
    status: string;
    description?: string;
}

export interface AttendanceRecord {
    date: string;
    status: string;
}

interface StudentDashboardState {
    profile: StudentProfile | null;
    schedule: ScheduleItem[];
    results: ExamResult[];
    assignments: Assignment[];
    attendance: AttendanceRecord[];
    attendancePercentage: number;
    loading: boolean;
    error: string | null;
}

const initialState: StudentDashboardState = {
    profile: null,
    schedule: [],
    results: [],
    assignments: [],
    attendance: [],
    attendancePercentage: 0,
    loading: false,
    error: null,
};

export const fetchStudentProfile = createAsyncThunk(
    'studentDashboard/fetchProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/student-profile/me');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch profile');
        }
    }
);

export const fetchStudentSchedule = createAsyncThunk(
    'studentDashboard/fetchSchedule',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/student-profile/me/schedule');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch schedule');
        }
    }
);

export const fetchStudentResults = createAsyncThunk(
    'studentDashboard/fetchResults',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/student-profile/me/results');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch results');
        }
    }
);

export const fetchStudentAssignments = createAsyncThunk(
    'studentDashboard/fetchAssignments',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/student-profile/me/assignments');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch assignments');
        }
    }
);

export const fetchStudentAttendance = createAsyncThunk(
    'studentDashboard/fetchAttendance',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/student-profile/me/attendance');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch attendance');
        }
    }
);

const studentDashboardSlice = createSlice({
    name: 'studentDashboard',
    initialState,
    reducers: {
        clearStudentDashboard: (state) => {
            Object.assign(state, initialState);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchStudentProfile.pending, (state) => { state.loading = true; })
            .addCase(fetchStudentProfile.fulfilled, (state, action: PayloadAction<any>) => {
                state.loading = false;
                state.profile = action.payload;
            })
            .addCase(fetchStudentProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchStudentSchedule.fulfilled, (state, action) => {
                state.schedule = action.payload.schedule || action.payload || [];
            })
            .addCase(fetchStudentResults.fulfilled, (state, action) => {
                state.results = action.payload.results || action.payload || [];
            })
            .addCase(fetchStudentAssignments.fulfilled, (state, action) => {
                state.assignments = action.payload.assignments || action.payload || [];
            })
            .addCase(fetchStudentAttendance.fulfilled, (state, action) => {
                state.attendance = action.payload.records || action.payload.attendance || [];
                state.attendancePercentage = action.payload.percentage || 0;
            });
    },
});

export const { clearStudentDashboard } = studentDashboardSlice.actions;
export default studentDashboardSlice.reducer;
