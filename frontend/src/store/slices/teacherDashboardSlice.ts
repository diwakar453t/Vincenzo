import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface TeacherProfile {
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

export interface TeacherClassInfo {
    id: number;
    name: string;
    section: string;
    grade_level: number;
    student_count: number;
    subject: string;
}

export interface TeacherStudentInfo {
    id: number;
    student_id: string;
    full_name: string;
    class_name: string;
    grade: string;
    attendance_percentage: number;
}

interface TeacherDashboardState {
    profile: TeacherProfile | null;
    classes: TeacherClassInfo[];
    students: TeacherStudentInfo[];
    loading: boolean;
    error: string | null;
}

const initialState: TeacherDashboardState = {
    profile: null,
    classes: [],
    students: [],
    loading: false,
    error: null,
};

export const fetchTeacherProfile = createAsyncThunk(
    'teacherDashboard/fetchProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/teacher-profile/me');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch teacher profile');
        }
    }
);

export const fetchTeacherClasses = createAsyncThunk(
    'teacherDashboard/fetchClasses',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/teacher-profile/me/classes');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch classes');
        }
    }
);

export const fetchTeacherStudents = createAsyncThunk(
    'teacherDashboard/fetchStudents',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/teacher-profile/me/students');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch students');
        }
    }
);

const teacherDashboardSlice = createSlice({
    name: 'teacherDashboard',
    initialState,
    reducers: {
        clearTeacherDashboard: (state) => { Object.assign(state, initialState); },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTeacherProfile.pending, (state) => { state.loading = true; })
            .addCase(fetchTeacherProfile.fulfilled, (state, action: PayloadAction<any>) => {
                state.loading = false;
                state.profile = action.payload;
            })
            .addCase(fetchTeacherProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchTeacherClasses.fulfilled, (state, action) => {
                state.classes = action.payload.classes || action.payload || [];
            })
            .addCase(fetchTeacherStudents.fulfilled, (state, action) => {
                state.students = action.payload.students || action.payload || [];
            });
    },
});

export const { clearTeacherDashboard } = teacherDashboardSlice.actions;
export default teacherDashboardSlice.reducer;
