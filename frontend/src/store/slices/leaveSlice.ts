import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface LeaveTypeItem {
    id: number; tenant_id: string; name: string; code?: string | null;
    description?: string | null; max_days_per_year: number; is_paid: boolean;
    is_active: boolean; applies_to: string; color: string;
    created_at: string; updated_at: string;
}

export interface LeaveApplicationItem {
    id: number; tenant_id: string; applicant_type: string;
    teacher_id?: number | null; student_id?: number | null;
    applicant_name?: string | null; leave_type_id: number;
    leave_type_name?: string | null; leave_type_color?: string | null;
    start_date: string; end_date: string; days: number;
    reason: string; status: string; admin_remarks?: string | null;
    approved_by?: number | null; approver_name?: string | null;
    academic_year: string; created_at: string; updated_at: string;
}

export interface LeaveBalanceItem {
    leave_type_id: number; leave_type_name: string; color: string;
    max_days: number; used_days: number; remaining_days: number; pending_days: number;
}

export interface LeaveBalanceData {
    applicant_type: string; applicant_id: number; applicant_name: string;
    academic_year: string; balances: LeaveBalanceItem[];
}

export interface CalendarEvent {
    id: number; applicant_name: string; leave_type_name: string;
    color: string; start_date: string; end_date: string; days: number; status: string;
}

interface LeaveState {
    leaveTypes: LeaveTypeItem[]; typeTotal: number;
    applications: LeaveApplicationItem[]; appTotal: number;
    balance: LeaveBalanceData | null;
    calendarEvents: CalendarEvent[];
    loading: boolean; detailLoading: boolean; error: string | null;
}

const initialState: LeaveState = {
    leaveTypes: [], typeTotal: 0,
    applications: [], appTotal: 0,
    balance: null, calendarEvents: [],
    loading: false, detailLoading: false, error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Leave Types ────────────────────────────────────────────────────────

export const fetchLeaveTypes = createAsyncThunk('leaves/fetchTypes',
    async (params: { applies_to?: string; is_active?: boolean } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/leaves/types`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createLeaveType = createAsyncThunk('leaves/createType',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/leaves/types`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateLeaveType = createAsyncThunk('leaves/updateType',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/leaves/types/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteLeaveType = createAsyncThunk('leaves/deleteType',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/leaves/types/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Applications ───────────────────────────────────────────────────────

export const fetchApplications = createAsyncThunk('leaves/fetchApps',
    async (params: { applicant_type?: string; teacher_id?: number; student_id?: number; status_filter?: string; month?: number; year?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/leaves/applications`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const applyLeave = createAsyncThunk('leaves/apply',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/leaves/applications`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const actionLeave = createAsyncThunk('leaves/action',
    async ({ id, data }: { id: number; data: { status: string; admin_remarks?: string } }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/leaves/applications/${id}/action`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const cancelLeave = createAsyncThunk('leaves/cancel',
    async (id: number, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/leaves/applications/${id}/cancel`, {}, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteApplication = createAsyncThunk('leaves/deleteApp',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/leaves/applications/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Balance & Calendar ─────────────────────────────────────────────────

export const fetchBalance = createAsyncThunk('leaves/balance',
    async ({ applicantType, applicantId, academicYear }: { applicantType: string; applicantId: number; academicYear?: string }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/leaves/balance/${applicantType}/${applicantId}`, { ...authHeader(), params: { academic_year: academicYear } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchCalendar = createAsyncThunk('leaves/calendar',
    async ({ month, year, applicantType }: { month: number; year: number; applicantType?: string }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/leaves/calendar`, { ...authHeader(), params: { month, year, applicant_type: applicantType } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const leaveSlice = createSlice({
    name: 'leaves',
    initialState,
    reducers: {
        clearError: s => { s.error = null; },
        clearBalance: s => { s.balance = null; },
    },
    extraReducers: b => {
        b.addCase(fetchLeaveTypes.pending, s => { s.loading = true; s.error = null; })
            .addCase(fetchLeaveTypes.fulfilled, (s, a) => { s.loading = false; s.leaveTypes = a.payload.leave_types; s.typeTotal = a.payload.total; })
            .addCase(fetchLeaveTypes.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(createLeaveType.fulfilled, (s, a) => { s.leaveTypes.push(a.payload); s.typeTotal += 1; })
            .addCase(updateLeaveType.fulfilled, (s, a) => { const i = s.leaveTypes.findIndex(t => t.id === a.payload.id); if (i >= 0) s.leaveTypes[i] = a.payload; })
            .addCase(deleteLeaveType.fulfilled, (s, a) => { s.leaveTypes = s.leaveTypes.filter(t => t.id !== a.payload); s.typeTotal -= 1; })

            .addCase(fetchApplications.pending, s => { s.loading = true; s.error = null; })
            .addCase(fetchApplications.fulfilled, (s, a) => { s.loading = false; s.applications = a.payload.applications; s.appTotal = a.payload.total; })
            .addCase(fetchApplications.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(applyLeave.fulfilled, (s, a) => { s.applications.unshift(a.payload); s.appTotal += 1; })
            .addCase(actionLeave.fulfilled, (s, a) => { const i = s.applications.findIndex(x => x.id === a.payload.id); if (i >= 0) s.applications[i] = a.payload; })
            .addCase(cancelLeave.fulfilled, (s, a) => { const i = s.applications.findIndex(x => x.id === a.payload.id); if (i >= 0) s.applications[i] = a.payload; })
            .addCase(deleteApplication.fulfilled, (s, a) => { s.applications = s.applications.filter(x => x.id !== a.payload); s.appTotal -= 1; })

            .addCase(fetchBalance.pending, s => { s.detailLoading = true; })
            .addCase(fetchBalance.fulfilled, (s, a) => { s.detailLoading = false; s.balance = a.payload; })

            .addCase(fetchCalendar.pending, s => { s.detailLoading = true; })
            .addCase(fetchCalendar.fulfilled, (s, a) => { s.detailLoading = false; s.calendarEvents = a.payload.events; })

            .addCase(applyLeave.rejected, (s, a) => { s.error = a.payload as string; })
            .addCase(actionLeave.rejected, (s, a) => { s.error = a.payload as string; });
    },
});

export const { clearError, clearBalance } = leaveSlice.actions;
export default leaveSlice.reducer;
