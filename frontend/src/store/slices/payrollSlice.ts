import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface PayrollComponentItem {
    id: number; tenant_id: string; name: string; code?: string | null;
    component_type: string; is_percentage: boolean; percentage_of?: string | null;
    default_amount: number; is_active: boolean; description?: string | null;
    sort_order: number; created_at: string; updated_at: string;
}

export interface SalaryStructureItemData {
    id: number; component_id: number; component_name?: string | null;
    component_type?: string | null; amount: number;
}

export interface SalaryStructureData {
    id: number; tenant_id: string; teacher_id: number; teacher_name?: string | null;
    gross_salary: number; net_salary: number; effective_from?: string | null;
    is_active: boolean; items: SalaryStructureItemData[];
    created_at: string; updated_at: string;
}

export interface PayrollItemData {
    id: number; component_id: number; component_name: string;
    component_type: string; amount: number;
}

export interface PayrollData {
    id: number; tenant_id: string; teacher_id: number; teacher_name?: string | null;
    month: number; year: number; working_days: number; present_days: number;
    gross_salary: number; total_earnings: number; total_deductions: number;
    net_salary: number; status: string; remarks?: string | null;
    paid_date?: string | null; items: PayrollItemData[];
    created_at: string; updated_at: string;
}

export interface PayrollSummaryData {
    month: number; year: number; total_teachers: number;
    total_gross: number; total_earnings: number; total_deductions: number;
    total_net: number; draft_count: number; processed_count: number; paid_count: number;
}

export interface SalaryHistoryData {
    teacher_id: number; teacher_name: string;
    history: { month: number; year: number; gross_salary: number; net_salary: number; status: string; paid_date?: string | null }[];
}

interface PayrollState {
    components: PayrollComponentItem[]; compTotal: number;
    structures: SalaryStructureData[]; structTotal: number;
    payrolls: PayrollData[]; payTotal: number;
    currentPayroll: PayrollData | null;
    summary: PayrollSummaryData | null;
    salaryHistory: SalaryHistoryData | null;
    loading: boolean; detailLoading: boolean; error: string | null;
}

const initialState: PayrollState = {
    components: [], compTotal: 0,
    structures: [], structTotal: 0,
    payrolls: [], payTotal: 0,
    currentPayroll: null, summary: null, salaryHistory: null,
    loading: false, detailLoading: false, error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Components ─────────────────────────────────────────────────────────

export const fetchComponents = createAsyncThunk('payroll/fetchComps',
    async (params: { component_type?: string; is_active?: boolean } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/payroll/components`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createComponent = createAsyncThunk('payroll/createComp',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/payroll/components`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateComponent = createAsyncThunk('payroll/updateComp',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/payroll/components/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteComponent = createAsyncThunk('payroll/deleteComp',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/payroll/components/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Structures ─────────────────────────────────────────────────────────

export const fetchStructures = createAsyncThunk('payroll/fetchStructs',
    async (params: { teacher_id?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/payroll/structures`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const saveStructure = createAsyncThunk('payroll/saveStruct',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/payroll/structures`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteStructure = createAsyncThunk('payroll/deleteStruct',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/payroll/structures/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Payrolls ───────────────────────────────────────────────────────────

export const processPayroll = createAsyncThunk('payroll/process',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/payroll/process`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchPayrolls = createAsyncThunk('payroll/fetchPayrolls',
    async (params: { month?: number; year?: number; teacher_id?: number; status_filter?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/payroll/payrolls`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchPayroll = createAsyncThunk('payroll/fetchOne',
    async (id: number, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/payroll/payrolls/${id}`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const actionPayroll = createAsyncThunk('payroll/action',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/payroll/payrolls/${id}/action`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deletePayroll = createAsyncThunk('payroll/delete',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/payroll/payrolls/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Reports ────────────────────────────────────────────────────────────

export const fetchSummary = createAsyncThunk('payroll/summary',
    async ({ month, year }: { month: number; year: number }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/payroll/summary`, { ...authHeader(), params: { month, year } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchSalaryHistory = createAsyncThunk('payroll/history',
    async (teacherId: number, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/payroll/history/${teacherId}`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const payrollSlice = createSlice({
    name: 'payroll',
    initialState,
    reducers: {
        clearError: s => { s.error = null; },
        clearCurrentPayroll: s => { s.currentPayroll = null; },
    },
    extraReducers: b => {
        b.addCase(fetchComponents.pending, s => { s.loading = true; s.error = null; })
            .addCase(fetchComponents.fulfilled, (s, a) => { s.loading = false; s.components = a.payload.components; s.compTotal = a.payload.total; })
            .addCase(fetchComponents.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(createComponent.fulfilled, (s, a) => { s.components.push(a.payload); s.compTotal += 1; })
            .addCase(updateComponent.fulfilled, (s, a) => { const i = s.components.findIndex(c => c.id === a.payload.id); if (i >= 0) s.components[i] = a.payload; })
            .addCase(deleteComponent.fulfilled, (s, a) => { s.components = s.components.filter(c => c.id !== a.payload); s.compTotal -= 1; })

            .addCase(fetchStructures.pending, s => { s.loading = true; })
            .addCase(fetchStructures.fulfilled, (s, a) => { s.loading = false; s.structures = a.payload.structures; s.structTotal = a.payload.total; })
            .addCase(saveStructure.fulfilled, (s, a) => {
                const i = s.structures.findIndex(st => st.teacher_id === a.payload.teacher_id);
                if (i >= 0) s.structures[i] = a.payload; else s.structures.push(a.payload);
            })
            .addCase(deleteStructure.fulfilled, (s, a) => { s.structures = s.structures.filter(st => st.id !== a.payload); s.structTotal -= 1; })

            .addCase(processPayroll.pending, s => { s.loading = true; })
            .addCase(processPayroll.fulfilled, (s, a) => { s.loading = false; s.payrolls = a.payload.payrolls; s.payTotal = a.payload.total; })

            .addCase(fetchPayrolls.pending, s => { s.loading = true; })
            .addCase(fetchPayrolls.fulfilled, (s, a) => { s.loading = false; s.payrolls = a.payload.payrolls; s.payTotal = a.payload.total; })
            .addCase(fetchPayrolls.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(fetchPayroll.pending, s => { s.detailLoading = true; })
            .addCase(fetchPayroll.fulfilled, (s, a) => { s.detailLoading = false; s.currentPayroll = a.payload; })

            .addCase(actionPayroll.fulfilled, (s, a) => { const i = s.payrolls.findIndex(p => p.id === a.payload.id); if (i >= 0) s.payrolls[i] = a.payload; })
            .addCase(deletePayroll.fulfilled, (s, a) => { s.payrolls = s.payrolls.filter(p => p.id !== a.payload); s.payTotal -= 1; })

            .addCase(fetchSummary.pending, s => { s.detailLoading = true; })
            .addCase(fetchSummary.fulfilled, (s, a) => { s.detailLoading = false; s.summary = a.payload; })

            .addCase(fetchSalaryHistory.pending, s => { s.detailLoading = true; })
            .addCase(fetchSalaryHistory.fulfilled, (s, a) => { s.detailLoading = false; s.salaryHistory = a.payload; })

            .addCase(processPayroll.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
            .addCase(saveStructure.rejected, (s, a) => { s.error = a.payload as string; });
    },
});

export const { clearError, clearCurrentPayroll } = payrollSlice.actions;
export default payrollSlice.reducer;
