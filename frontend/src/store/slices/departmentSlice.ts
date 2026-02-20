import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface DepartmentItem {
    id: number; tenant_id: string; name: string; code?: string | null;
    description?: string | null; head_teacher_id?: number | null;
    head_teacher_name?: string | null; parent_id?: number | null;
    parent_name?: string | null; is_active: boolean; order: number;
    designation_count: number; children_count: number;
    created_at: string; updated_at: string;
}

export interface DepartmentTreeNode {
    id: number; name: string; code?: string | null;
    head_teacher_name?: string | null; designation_count: number;
    is_active: boolean; children: DepartmentTreeNode[];
}

export interface DesignationItem {
    id: number; tenant_id: string; name: string; code?: string | null;
    description?: string | null; department_id?: number | null;
    department_name?: string | null; level: number; is_active: boolean;
    order: number; created_at: string; updated_at: string;
}

interface DeptState {
    departments: DepartmentItem[];
    totalDepartments: number;
    tree: DepartmentTreeNode[];
    designations: DesignationItem[];
    totalDesignations: number;
    loading: boolean;
    error: string | null;
}

const initialState: DeptState = {
    departments: [], totalDepartments: 0, tree: [],
    designations: [], totalDesignations: 0,
    loading: false, error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Department Thunks ──────────────────────────────────────────────────

export const fetchDepartments = createAsyncThunk('departments/fetchDepartments',
    async (params: { search?: string; is_active?: boolean } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/departments`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchDepartmentTree = createAsyncThunk('departments/fetchTree',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/departments/tree`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createDepartment = createAsyncThunk('departments/createDepartment',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/departments`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateDepartment = createAsyncThunk('departments/updateDepartment',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/departments/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteDepartment = createAsyncThunk('departments/deleteDepartment',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/departments/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Designation Thunks ─────────────────────────────────────────────────

export const fetchDesignations = createAsyncThunk('departments/fetchDesignations',
    async (params: { department_id?: number; search?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/departments/designations/all`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createDesignation = createAsyncThunk('departments/createDesignation',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/departments/designations`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateDesignation = createAsyncThunk('departments/updateDesignation',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/departments/designations/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteDesignation = createAsyncThunk('departments/deleteDesignation',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/departments/designations/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const departmentSlice = createSlice({
    name: 'departments',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDepartments.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchDepartments.fulfilled, (state, action) => { state.loading = false; state.departments = action.payload.departments; state.totalDepartments = action.payload.total; })
            .addCase(fetchDepartments.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
            .addCase(fetchDepartmentTree.fulfilled, (state, action) => { state.tree = action.payload.tree || []; })
            .addCase(deleteDepartment.fulfilled, (state, action) => { state.departments = state.departments.filter(d => d.id !== action.payload); state.totalDepartments -= 1; })
            .addCase(fetchDesignations.pending, (state) => { state.loading = true; })
            .addCase(fetchDesignations.fulfilled, (state, action) => { state.loading = false; state.designations = action.payload.designations; state.totalDesignations = action.payload.total; })
            .addCase(fetchDesignations.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
            .addCase(deleteDesignation.fulfilled, (state, action) => { state.designations = state.designations.filter(d => d.id !== action.payload); state.totalDesignations -= 1; })
            // error handlers
            .addCase(createDepartment.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateDepartment.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(createDesignation.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateDesignation.rejected, (state, action) => { state.error = action.payload as string; });
    },
});

export const { clearError } = departmentSlice.actions;
export default departmentSlice.reducer;
