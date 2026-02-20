import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// ─── Types ──────────────────────────────────────────────────────────────

export interface RouteItem {
    id: number; tenant_id: string; route_name: string; route_code: string | null;
    start_point: string; end_point: string; stops: string | null;
    distance_km: number | null; estimated_time_min: number | null;
    morning_departure: string | null; evening_departure: string | null;
    monthly_fee: number; max_capacity: number; current_students: number;
    available_seats: number; vehicle_id: number | null; vehicle_number: string | null;
    status: string; description: string | null; is_active: boolean;
    created_at: string; updated_at: string;
}

export interface VehicleItem {
    id: number; tenant_id: string; vehicle_number: string; vehicle_type: string;
    make: string | null; model: string | null; year: number | null;
    capacity: number; driver_name: string | null; driver_phone: string | null;
    driver_license: string | null; conductor_name: string | null; conductor_phone: string | null;
    insurance_expiry: string | null; fitness_expiry: string | null;
    fuel_type: string | null; gps_enabled: boolean;
    status: string; description: string | null; is_active: boolean;
    assigned_routes: number; created_at: string; updated_at: string;
}

export interface AssignmentItem {
    id: number; tenant_id: string;
    student_id: number; student_name: string | null;
    route_id: number; route_name: string | null; route_code: string | null;
    pickup_stop: string | null; drop_stop: string | null;
    assignment_date: string; end_date: string | null;
    monthly_fee: number; fee_paid_till: string | null;
    status: string; remarks: string | null;
    created_at: string; updated_at: string;
}

export interface TransportStats {
    total_routes: number; total_vehicles: number;
    total_students: number; active_assignments: number;
    total_monthly_revenue: number; avg_occupancy_rate: number;
    route_breakdown: Array<{
        route_id: number; route_name: string; route_code: string | null;
        start_point: string; end_point: string; vehicle_number: string | null;
        max_capacity: number; current_students: number; available_seats: number;
        monthly_fee: number; occupancy_rate: number;
    }>;
}

interface TransportState {
    routes: RouteItem[];
    vehicles: VehicleItem[];
    assignments: AssignmentItem[];
    stats: TransportStats | null;
    loading: boolean;
    error: string | null;
}

const initialState: TransportState = {
    routes: [], vehicles: [], assignments: [],
    stats: null, loading: false, error: null,
};

// ─── Thunks ─────────────────────────────────────────────────────────────

export const fetchRoutes = createAsyncThunk('transport/fetchRoutes',
    async (params: { status?: string; is_active?: boolean } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/transport/routes`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createRoute = createAsyncThunk('transport/createRoute',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/transport/routes`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateRoute = createAsyncThunk('transport/updateRoute',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/transport/routes/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteRoute = createAsyncThunk('transport/deleteRoute',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/transport/routes/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchVehicles = createAsyncThunk('transport/fetchVehicles',
    async (params: { vehicle_type?: string; status?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/transport/vehicles`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createVehicle = createAsyncThunk('transport/createVehicle',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/transport/vehicles`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateVehicle = createAsyncThunk('transport/updateVehicle',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/transport/vehicles/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteVehicle = createAsyncThunk('transport/deleteVehicle',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/transport/vehicles/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const assignStudent = createAsyncThunk('transport/assign',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/transport/assign`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const cancelAssignment = createAsyncThunk('transport/cancel',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/transport/cancel/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchAssignments = createAsyncThunk('transport/fetchAssignments',
    async (params: { route_id?: number; student_id?: number; status?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/transport/assignments`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchTransportStats = createAsyncThunk('transport/fetchStats',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/transport/stats`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const transportSlice = createSlice({
    name: 'transport',
    initialState,
    reducers: {
        clearTransportError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        const loading = (state: TransportState) => { state.loading = true; state.error = null; };
        const failed = (state: TransportState, action: any) => { state.loading = false; state.error = action.payload as string; };

        builder
            .addCase(fetchRoutes.pending, loading)
            .addCase(fetchRoutes.fulfilled, (s, a) => { s.loading = false; s.routes = a.payload.routes; })
            .addCase(fetchRoutes.rejected, failed)

            .addCase(createRoute.pending, loading).addCase(createRoute.fulfilled, (s) => { s.loading = false; }).addCase(createRoute.rejected, failed)
            .addCase(updateRoute.pending, loading).addCase(updateRoute.fulfilled, (s) => { s.loading = false; }).addCase(updateRoute.rejected, failed)
            .addCase(deleteRoute.pending, loading)
            .addCase(deleteRoute.fulfilled, (s, a) => { s.loading = false; s.routes = s.routes.filter(r => r.id !== a.payload); })
            .addCase(deleteRoute.rejected, failed)

            .addCase(fetchVehicles.pending, loading)
            .addCase(fetchVehicles.fulfilled, (s, a) => { s.loading = false; s.vehicles = a.payload.vehicles; })
            .addCase(fetchVehicles.rejected, failed)

            .addCase(createVehicle.pending, loading).addCase(createVehicle.fulfilled, (s) => { s.loading = false; }).addCase(createVehicle.rejected, failed)
            .addCase(updateVehicle.pending, loading).addCase(updateVehicle.fulfilled, (s) => { s.loading = false; }).addCase(updateVehicle.rejected, failed)
            .addCase(deleteVehicle.pending, loading)
            .addCase(deleteVehicle.fulfilled, (s, a) => { s.loading = false; s.vehicles = s.vehicles.filter(v => v.id !== a.payload); })
            .addCase(deleteVehicle.rejected, failed)

            .addCase(assignStudent.pending, loading).addCase(assignStudent.fulfilled, (s) => { s.loading = false; }).addCase(assignStudent.rejected, failed)
            .addCase(cancelAssignment.pending, loading).addCase(cancelAssignment.fulfilled, (s) => { s.loading = false; }).addCase(cancelAssignment.rejected, failed)

            .addCase(fetchAssignments.pending, loading)
            .addCase(fetchAssignments.fulfilled, (s, a) => { s.loading = false; s.assignments = a.payload.assignments; })
            .addCase(fetchAssignments.rejected, failed)

            .addCase(fetchTransportStats.pending, loading)
            .addCase(fetchTransportStats.fulfilled, (s, a) => { s.loading = false; s.stats = a.payload; })
            .addCase(fetchTransportStats.rejected, failed);
    },
});

export const { clearTransportError } = transportSlice.actions;
export default transportSlice.reducer;
