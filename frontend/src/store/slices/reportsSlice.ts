import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// ─── Types ──────────────────────────────────────────────────────────────

export interface ReportData {
    title: string; report_type: string; generated_at: string;
    parameters: Record<string, any>; summary: Record<string, any>;
    columns: string[]; data: Array<Record<string, any>>; record_count: number;
}

export interface SavedReport {
    id: number; tenant_id: string; title: string; report_type: string;
    format: string; status: string; parameters: Record<string, any> | null;
    summary: string | null; record_count: number;
    generated_by: number | null; is_active: boolean;
    created_at: string; updated_at: string;
}

export interface DashboardStats {
    total_reports: number;
    recent_reports: SavedReport[];
    available_report_types: Array<{ type: string; label: string; icon: string; description: string }>;
}

interface ReportsState {
    dashboard: DashboardStats | null;
    currentReport: ReportData | null;
    savedReports: SavedReport[];
    loading: boolean;
    error: string | null;
}

const initialState: ReportsState = {
    dashboard: null, currentReport: null, savedReports: [],
    loading: false, error: null,
};

// ─── Thunks ─────────────────────────────────────────────────────────────

export const fetchReportDashboard = createAsyncThunk('reports/fetchDashboard',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/reports/dashboard`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const generateReport = createAsyncThunk('reports/generate',
    async (params: { report_type: string; start_date?: string; end_date?: string; class_id?: number; student_id?: number; teacher_id?: number }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/reports/generate`, params, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchSavedReports = createAsyncThunk('reports/fetchSaved',
    async (params: { report_type?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/reports/saved`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const saveReport = createAsyncThunk('reports/save',
    async (params: { report_type: string; start_date?: string; end_date?: string; class_id?: number; student_id?: number; format?: string }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/reports/save`, params, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteSavedReport = createAsyncThunk('reports/deleteSaved',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/reports/saved/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const exportReportCSV = createAsyncThunk('reports/exportCSV',
    async (params: { report_type: string; start_date?: string; end_date?: string; class_id?: number; student_id?: number; teacher_id?: number }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/reports/export/csv`, params, {
                ...authHeader(), responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${params.report_type}_report.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            return true;
        } catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Export failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const reportsSlice = createSlice({
    name: 'reports',
    initialState,
    reducers: {
        clearReportsError: (state) => { state.error = null; },
        clearCurrentReport: (state) => { state.currentReport = null; },
    },
    extraReducers: (builder) => {
        const loading = (state: ReportsState) => { state.loading = true; state.error = null; };
        const failed = (state: ReportsState, action: any) => { state.loading = false; state.error = action.payload as string; };

        builder
            .addCase(fetchReportDashboard.pending, loading)
            .addCase(fetchReportDashboard.fulfilled, (s, a) => { s.loading = false; s.dashboard = a.payload; })
            .addCase(fetchReportDashboard.rejected, failed)

            .addCase(generateReport.pending, loading)
            .addCase(generateReport.fulfilled, (s, a) => { s.loading = false; s.currentReport = a.payload; })
            .addCase(generateReport.rejected, failed)

            .addCase(fetchSavedReports.pending, loading)
            .addCase(fetchSavedReports.fulfilled, (s, a) => { s.loading = false; s.savedReports = a.payload.reports; })
            .addCase(fetchSavedReports.rejected, failed)

            .addCase(saveReport.pending, loading).addCase(saveReport.fulfilled, (s) => { s.loading = false; }).addCase(saveReport.rejected, failed)

            .addCase(deleteSavedReport.pending, loading)
            .addCase(deleteSavedReport.fulfilled, (s, a) => { s.loading = false; s.savedReports = s.savedReports.filter(r => r.id !== a.payload); })
            .addCase(deleteSavedReport.rejected, failed)

            .addCase(exportReportCSV.pending, loading)
            .addCase(exportReportCSV.fulfilled, (s) => { s.loading = false; })
            .addCase(exportReportCSV.rejected, failed);
    },
});

export const { clearReportsError, clearCurrentReport } = reportsSlice.actions;
export default reportsSlice.reducer;
