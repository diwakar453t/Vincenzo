import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface StudentAttendanceItem {
    id: number; tenant_id: string; student_id: number; student_name?: string | null;
    admission_number?: string | null; class_id: number; class_name?: string | null;
    date: string; status: string; remarks?: string | null; academic_year: string;
    created_at: string; updated_at: string;
}

export interface StaffAttendanceItem {
    id: number; tenant_id: string; teacher_id: number; teacher_name?: string | null;
    date: string; status: string; check_in?: string | null; check_out?: string | null;
    remarks?: string | null; created_at: string; updated_at: string;
}

export interface AttendanceStatsData {
    total_days: number; present: number; absent: number; late: number;
    half_day: number; excused: number; percentage: number;
}

export interface MonthlyDay { date: string; status?: string | null; }

export interface MonthlyViewData {
    student_id?: number; teacher_id?: number; name: string;
    month: number; year: number; days: MonthlyDay[]; stats: AttendanceStatsData;
}

export interface ClassReportData {
    class_id: number; class_name: string; date: string; total_students: number;
    present: number; absent: number; late: number; half_day: number;
    excused: number; percentage: number;
}

interface AttendanceState {
    studentRecords: StudentAttendanceItem[]; studentTotal: number;
    staffRecords: StaffAttendanceItem[]; staffTotal: number;
    monthlyView: MonthlyViewData | null;
    classReport: ClassReportData | null;
    stats: AttendanceStatsData | null;
    classFullReport: any[];
    loading: boolean; detailLoading: boolean; error: string | null;
}

const initialState: AttendanceState = {
    studentRecords: [], studentTotal: 0,
    staffRecords: [], staffTotal: 0,
    monthlyView: null, classReport: null, stats: null, classFullReport: [],
    loading: false, detailLoading: false, error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Student Thunks ─────────────────────────────────────────────────────

export const fetchStudentAttendance = createAsyncThunk('attendance/fetchStudentAtt',
    async (params: { class_id?: number; student_id?: number; date?: string; month?: number; year?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/attendance/students`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const markStudentAttendance = createAsyncThunk('attendance/markStudent',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/attendance/students`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const bulkMarkStudentAttendance = createAsyncThunk('attendance/bulkMarkStudent',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/attendance/students/bulk`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteStudentAttendance = createAsyncThunk('attendance/deleteStudentAtt',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/attendance/students/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Staff Thunks ───────────────────────────────────────────────────────

export const fetchStaffAttendance = createAsyncThunk('attendance/fetchStaffAtt',
    async (params: { teacher_id?: number; date?: string; month?: number; year?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/attendance/staff`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const markStaffAttendance = createAsyncThunk('attendance/markStaff',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/attendance/staff`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const bulkMarkStaffAttendance = createAsyncThunk('attendance/bulkMarkStaff',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/attendance/staff/bulk`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteStaffAttendance = createAsyncThunk('attendance/deleteStaffAtt',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/attendance/staff/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Stats / Reports ────────────────────────────────────────────────────

export const fetchStudentStats = createAsyncThunk('attendance/studentStats',
    async ({ studentId, academicYear }: { studentId: number; academicYear?: string }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/attendance/students/stats/${studentId}`, { ...authHeader(), params: { academic_year: academicYear } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchStaffStats = createAsyncThunk('attendance/staffStats',
    async ({ teacherId, month, year }: { teacherId: number; month?: number; year?: number }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/attendance/staff/stats/${teacherId}`, { ...authHeader(), params: { month, year } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchClassReport = createAsyncThunk('attendance/classReport',
    async ({ classId, date }: { classId: number; date: string }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/attendance/class-report/${classId}`, { ...authHeader(), params: { date } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchStudentMonthly = createAsyncThunk('attendance/studentMonthly',
    async ({ studentId, month, year }: { studentId: number; month: number; year: number }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/attendance/students/monthly/${studentId}`, { ...authHeader(), params: { month, year } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchStaffMonthly = createAsyncThunk('attendance/staffMonthly',
    async ({ teacherId, month, year }: { teacherId: number; month: number; year: number }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/attendance/staff/monthly/${teacherId}`, { ...authHeader(), params: { month, year } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchClassFullReport = createAsyncThunk('attendance/classFullReport',
    async ({ classId, academicYear }: { classId: number; academicYear?: string }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/attendance/class-report/${classId}/full`, { ...authHeader(), params: { academic_year: academicYear } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const attendanceSlice = createSlice({
    name: 'attendance',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearMonthly: (state) => { state.monthlyView = null; },
        clearClassReport: (state) => { state.classReport = null; },
        clearStats: (state) => { state.stats = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchStudentAttendance.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchStudentAttendance.fulfilled, (state, action) => { state.loading = false; state.studentRecords = action.payload.records; state.studentTotal = action.payload.total; })
            .addCase(fetchStudentAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

            .addCase(fetchStaffAttendance.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchStaffAttendance.fulfilled, (state, action) => { state.loading = false; state.staffRecords = action.payload.records; state.staffTotal = action.payload.total; })
            .addCase(fetchStaffAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

            .addCase(deleteStudentAttendance.fulfilled, (state, action) => { state.studentRecords = state.studentRecords.filter(r => r.id !== action.payload); state.studentTotal -= 1; })
            .addCase(deleteStaffAttendance.fulfilled, (state, action) => { state.staffRecords = state.staffRecords.filter(r => r.id !== action.payload); state.staffTotal -= 1; })

            .addCase(fetchStudentStats.pending, (state) => { state.detailLoading = true; })
            .addCase(fetchStudentStats.fulfilled, (state, action) => { state.detailLoading = false; state.stats = action.payload; })
            .addCase(fetchStaffStats.fulfilled, (state, action) => { state.detailLoading = false; state.stats = action.payload; })

            .addCase(fetchClassReport.pending, (state) => { state.detailLoading = true; })
            .addCase(fetchClassReport.fulfilled, (state, action) => { state.detailLoading = false; state.classReport = action.payload; })

            .addCase(fetchStudentMonthly.pending, (state) => { state.detailLoading = true; })
            .addCase(fetchStudentMonthly.fulfilled, (state, action) => { state.detailLoading = false; state.monthlyView = action.payload; })
            .addCase(fetchStaffMonthly.fulfilled, (state, action) => { state.detailLoading = false; state.monthlyView = action.payload; })

            .addCase(fetchClassFullReport.pending, (state) => { state.detailLoading = true; })
            .addCase(fetchClassFullReport.fulfilled, (state, action) => { state.detailLoading = false; state.classFullReport = action.payload; })

            // error handlers
            .addCase(markStudentAttendance.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(bulkMarkStudentAttendance.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(markStaffAttendance.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(bulkMarkStaffAttendance.rejected, (state, action) => { state.error = action.payload as string; });
    },
});

export const { clearError, clearMonthly, clearClassReport, clearStats } = attendanceSlice.actions;
export default attendanceSlice.reducer;
