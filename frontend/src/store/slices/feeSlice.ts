import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface FeeGroupItem {
    id: number; tenant_id: string; name: string; code?: string | null;
    description?: string | null; is_active: boolean;
    fee_types_count?: number; created_at: string; updated_at: string;
}

export interface FeeTypeItem {
    id: number; tenant_id: string; fee_group_id: number; fee_group_name?: string | null;
    name: string; code?: string | null; amount: number;
    due_date?: string | null; is_recurring: boolean; frequency?: string | null;
    academic_year: string; is_active: boolean; description?: string | null;
    class_id?: number | null; class_name?: string | null;
    created_at: string; updated_at: string;
}

export interface FeeAssignmentItem {
    id: number; tenant_id: string; student_id: number; student_name?: string | null;
    fee_type_id: number; fee_type_name?: string | null;
    amount: number; discount: number; net_amount: number;
    paid_amount: number; balance: number; status: string;
    due_date?: string | null; academic_year: string;
    created_at: string; updated_at: string;
}

export interface FeeCollectionItem {
    id: number; tenant_id: string; student_id: number; student_name?: string | null;
    fee_type_id: number; fee_type_name?: string | null;
    assignment_id?: number | null; receipt_number?: string | null;
    amount: number; payment_method: string; payment_date: string;
    transaction_id?: string | null; remarks?: string | null;
    academic_year: string; created_at: string; updated_at: string;
}

export interface DefaulterItem {
    student_id: number; student_name: string; class_name?: string | null;
    total_due: number; total_paid: number; balance: number;
}

export interface FinancialSummaryData {
    academic_year: string; total_fees_assigned: number; total_collected: number;
    total_outstanding: number; total_discount: number; collection_rate: number;
    payment_method_breakdown: Record<string, number>;
    monthly_collection: { month: string; amount: number }[];
}

interface FeeState {
    groups: FeeGroupItem[]; groupTotal: number;
    types: FeeTypeItem[]; typeTotal: number;
    assignments: FeeAssignmentItem[]; assignTotal: number;
    collections: FeeCollectionItem[]; collTotal: number;
    defaulters: DefaulterItem[]; defaulterTotal: number;
    summary: FinancialSummaryData | null;
    currentReceipt: FeeCollectionItem | null;
    loading: boolean; detailLoading: boolean; error: string | null;
}

const initialState: FeeState = {
    groups: [], groupTotal: 0,
    types: [], typeTotal: 0,
    assignments: [], assignTotal: 0,
    collections: [], collTotal: 0,
    defaulters: [], defaulterTotal: 0,
    summary: null, currentReceipt: null,
    loading: false, detailLoading: false, error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Fee Groups ─────────────────────────────────────────────────────────

export const fetchFeeGroups = createAsyncThunk('fees/fetchGroups',
    async (params: { is_active?: boolean } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/fees/groups`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createFeeGroup = createAsyncThunk('fees/createGroup',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/fees/groups`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateFeeGroup = createAsyncThunk('fees/updateGroup',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/fees/groups/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteFeeGroup = createAsyncThunk('fees/deleteGroup',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/fees/groups/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Fee Types ──────────────────────────────────────────────────────────

export const fetchFeeTypes = createAsyncThunk('fees/fetchTypes',
    async (params: { fee_group_id?: number; class_id?: number; is_active?: boolean } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/fees/types`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createFeeType = createAsyncThunk('fees/createType',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/fees/types`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateFeeType = createAsyncThunk('fees/updateType',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/fees/types/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteFeeType = createAsyncThunk('fees/deleteType',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/fees/types/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Fee Assignments ────────────────────────────────────────────────────

export const assignFees = createAsyncThunk('fees/assign',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/fees/assignments`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchAssignments = createAsyncThunk('fees/fetchAssignments',
    async (params: { student_id?: number; fee_type_id?: number; status_filter?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/fees/assignments`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Fee Collections ────────────────────────────────────────────────────

export const collectFee = createAsyncThunk('fees/collect',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/fees/collections`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchCollections = createAsyncThunk('fees/fetchCollections',
    async (params: { student_id?: number; fee_type_id?: number; from_date?: string; to_date?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/fees/collections`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteCollection = createAsyncThunk('fees/deleteCollection',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/fees/collections/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Receipt ────────────────────────────────────────────────────────────

export const fetchReceipt = createAsyncThunk('fees/fetchReceipt',
    async (id: number, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/fees/receipts/${id}`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Reports ────────────────────────────────────────────────────────────

export const fetchDefaulters = createAsyncThunk('fees/fetchDefaulters',
    async (params: { class_id?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/fees/defaulters`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchFinancialSummary = createAsyncThunk('fees/fetchSummary',
    async (params: { academic_year?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/fees/summary`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const feeSlice = createSlice({
    name: 'fees',
    initialState,
    reducers: {
        clearFeeError: s => { s.error = null; },
        clearReceipt: s => { s.currentReceipt = null; },
    },
    extraReducers: b => {
        b.addCase(fetchFeeGroups.pending, s => { s.loading = true; s.error = null; })
            .addCase(fetchFeeGroups.fulfilled, (s, a) => { s.loading = false; s.groups = a.payload.fee_groups; s.groupTotal = a.payload.total; })
            .addCase(fetchFeeGroups.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(createFeeGroup.fulfilled, (s, a) => { s.groups.push(a.payload); s.groupTotal += 1; })
            .addCase(updateFeeGroup.fulfilled, (s, a) => { const i = s.groups.findIndex(g => g.id === a.payload.id); if (i >= 0) s.groups[i] = a.payload; })
            .addCase(deleteFeeGroup.fulfilled, (s, a) => { s.groups = s.groups.filter(g => g.id !== a.payload); s.groupTotal -= 1; })

            .addCase(fetchFeeTypes.pending, s => { s.loading = true; })
            .addCase(fetchFeeTypes.fulfilled, (s, a) => { s.loading = false; s.types = a.payload.fee_types; s.typeTotal = a.payload.total; })
            .addCase(fetchFeeTypes.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(createFeeType.fulfilled, (s, a) => { s.types.push(a.payload); s.typeTotal += 1; })
            .addCase(updateFeeType.fulfilled, (s, a) => { const i = s.types.findIndex(t => t.id === a.payload.id); if (i >= 0) s.types[i] = a.payload; })
            .addCase(deleteFeeType.fulfilled, (s, a) => { s.types = s.types.filter(t => t.id !== a.payload); s.typeTotal -= 1; })

            .addCase(assignFees.pending, s => { s.loading = true; })
            .addCase(assignFees.fulfilled, (s, a) => { s.loading = false; s.assignments = a.payload.assignments; s.assignTotal = a.payload.total; })
            .addCase(assignFees.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(fetchAssignments.pending, s => { s.loading = true; })
            .addCase(fetchAssignments.fulfilled, (s, a) => { s.loading = false; s.assignments = a.payload.assignments; s.assignTotal = a.payload.total; })
            .addCase(fetchAssignments.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(collectFee.fulfilled, (s, a) => { s.collections.push(a.payload); s.collTotal += 1; })
            .addCase(collectFee.rejected, (s, a) => { s.error = a.payload as string; })

            .addCase(fetchCollections.pending, s => { s.loading = true; })
            .addCase(fetchCollections.fulfilled, (s, a) => { s.loading = false; s.collections = a.payload.collections; s.collTotal = a.payload.total; })
            .addCase(fetchCollections.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(deleteCollection.fulfilled, (s, a) => { s.collections = s.collections.filter(c => c.id !== a.payload); s.collTotal -= 1; })

            .addCase(fetchReceipt.pending, s => { s.detailLoading = true; })
            .addCase(fetchReceipt.fulfilled, (s, a) => { s.detailLoading = false; s.currentReceipt = a.payload; })

            .addCase(fetchDefaulters.pending, s => { s.loading = true; })
            .addCase(fetchDefaulters.fulfilled, (s, a) => { s.loading = false; s.defaulters = a.payload.defaulters; s.defaulterTotal = a.payload.total; })
            .addCase(fetchDefaulters.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(fetchFinancialSummary.pending, s => { s.detailLoading = true; })
            .addCase(fetchFinancialSummary.fulfilled, (s, a) => { s.detailLoading = false; s.summary = a.payload; })
            .addCase(fetchFinancialSummary.rejected, (s, a) => { s.detailLoading = false; s.error = a.payload as string; });
    },
});

export const { clearFeeError, clearReceipt } = feeSlice.actions;
export default feeSlice.reducer;
