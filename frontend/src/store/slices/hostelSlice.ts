import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// ─── Types ──────────────────────────────────────────────────────────────

export interface HostelItem {
    id: number; tenant_id: string; name: string; code: string | null;
    hostel_type: string; address: string | null;
    warden_name: string | null; warden_phone: string | null; warden_email: string | null;
    total_rooms: number; total_beds: number; occupied_beds: number; available_beds: number;
    monthly_fee: number; description: string | null; is_active: boolean;
    created_at: string; updated_at: string;
}

export interface HostelRoomItem {
    id: number; tenant_id: string; hostel_id: number; hostel_name: string | null;
    room_number: string; floor: number | null; room_type: string;
    capacity: number; occupied: number; available: number; status: string;
    has_attached_bathroom: boolean; has_ac: boolean; has_wifi: boolean;
    monthly_rent: number | null; description: string | null; is_active: boolean;
    created_at: string; updated_at: string;
}

export interface AllocationItem {
    id: number; tenant_id: string;
    hostel_id: number; hostel_name: string | null;
    room_id: number; room_number: string | null;
    student_id: number; student_name: string | null;
    bed_number: string | null; allocation_date: string;
    vacating_date: string | null; expected_vacating_date: string | null;
    status: string; monthly_fee: number;
    fee_paid_till: string | null; remarks: string | null;
    created_at: string; updated_at: string;
}

export interface HostelStats {
    total_hostels: number; total_rooms: number; total_beds: number;
    occupied_beds: number; available_beds: number; total_residents: number;
    occupancy_rate: number; total_monthly_revenue: number;
    hostel_breakdown: Array<{
        hostel_id: number; name: string; type: string;
        total_rooms: number; total_beds: number;
        occupied_beds: number; available_beds: number; occupancy_rate: number;
    }>;
}

interface HostelState {
    hostels: HostelItem[];
    rooms: HostelRoomItem[];
    allocations: AllocationItem[];
    residents: AllocationItem[];
    availableRooms: HostelRoomItem[];
    stats: HostelStats | null;
    loading: boolean;
    error: string | null;
}

const initialState: HostelState = {
    hostels: [], rooms: [], allocations: [], residents: [],
    availableRooms: [], stats: null, loading: false, error: null,
};

// ─── Thunks ─────────────────────────────────────────────────────────────

export const fetchHostels = createAsyncThunk('hostel/fetchHostels',
    async (params: { hostel_type?: string; is_active?: boolean } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/hostel/`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createHostel = createAsyncThunk('hostel/createHostel',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/hostel/`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateHostel = createAsyncThunk('hostel/updateHostel',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/hostel/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteHostel = createAsyncThunk('hostel/deleteHostel',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/hostel/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchRooms = createAsyncThunk('hostel/fetchRooms',
    async (params: { hostel_id?: number; status?: string; room_type?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/hostel/rooms`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createRoom = createAsyncThunk('hostel/createRoom',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/hostel/rooms`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateRoom = createAsyncThunk('hostel/updateRoom',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/hostel/rooms/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteRoom = createAsyncThunk('hostel/deleteRoom',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/hostel/rooms/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const allocateRoom = createAsyncThunk('hostel/allocateRoom',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/hostel/allocate`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const vacateRoom = createAsyncThunk('hostel/vacateRoom',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/hostel/vacate/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchAllocations = createAsyncThunk('hostel/fetchAllocations',
    async (params: { hostel_id?: number; room_id?: number; student_id?: number; status?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/hostel/allocations`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchResidents = createAsyncThunk('hostel/fetchResidents',
    async (params: { hostel_id?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/hostel/residents`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchAvailability = createAsyncThunk('hostel/fetchAvailability',
    async (params: { hostel_id?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/hostel/availability`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchHostelStats = createAsyncThunk('hostel/fetchStats',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/hostel/stats`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const hostelSlice = createSlice({
    name: 'hostel',
    initialState,
    reducers: {
        clearHostelError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        const loading = (state: HostelState) => { state.loading = true; state.error = null; };
        const failed = (state: HostelState, action: any) => { state.loading = false; state.error = action.payload as string; };

        builder
            .addCase(fetchHostels.pending, loading)
            .addCase(fetchHostels.fulfilled, (s, a) => { s.loading = false; s.hostels = a.payload.hostels; })
            .addCase(fetchHostels.rejected, failed)

            .addCase(createHostel.pending, loading).addCase(createHostel.fulfilled, (s) => { s.loading = false; }).addCase(createHostel.rejected, failed)
            .addCase(updateHostel.pending, loading).addCase(updateHostel.fulfilled, (s) => { s.loading = false; }).addCase(updateHostel.rejected, failed)
            .addCase(deleteHostel.pending, loading)
            .addCase(deleteHostel.fulfilled, (s, a) => { s.loading = false; s.hostels = s.hostels.filter(h => h.id !== a.payload); })
            .addCase(deleteHostel.rejected, failed)

            .addCase(fetchRooms.pending, loading)
            .addCase(fetchRooms.fulfilled, (s, a) => { s.loading = false; s.rooms = a.payload.rooms; })
            .addCase(fetchRooms.rejected, failed)

            .addCase(createRoom.pending, loading).addCase(createRoom.fulfilled, (s) => { s.loading = false; }).addCase(createRoom.rejected, failed)
            .addCase(updateRoom.pending, loading).addCase(updateRoom.fulfilled, (s) => { s.loading = false; }).addCase(updateRoom.rejected, failed)
            .addCase(deleteRoom.pending, loading)
            .addCase(deleteRoom.fulfilled, (s, a) => { s.loading = false; s.rooms = s.rooms.filter(r => r.id !== a.payload); })
            .addCase(deleteRoom.rejected, failed)

            .addCase(allocateRoom.pending, loading).addCase(allocateRoom.fulfilled, (s) => { s.loading = false; }).addCase(allocateRoom.rejected, failed)
            .addCase(vacateRoom.pending, loading).addCase(vacateRoom.fulfilled, (s) => { s.loading = false; }).addCase(vacateRoom.rejected, failed)

            .addCase(fetchAllocations.pending, loading)
            .addCase(fetchAllocations.fulfilled, (s, a) => { s.loading = false; s.allocations = a.payload.allocations; })
            .addCase(fetchAllocations.rejected, failed)

            .addCase(fetchResidents.pending, loading)
            .addCase(fetchResidents.fulfilled, (s, a) => { s.loading = false; s.residents = a.payload.allocations; })
            .addCase(fetchResidents.rejected, failed)

            .addCase(fetchAvailability.pending, loading)
            .addCase(fetchAvailability.fulfilled, (s, a) => { s.loading = false; s.availableRooms = a.payload.rooms; })
            .addCase(fetchAvailability.rejected, failed)

            .addCase(fetchHostelStats.pending, loading)
            .addCase(fetchHostelStats.fulfilled, (s, a) => { s.loading = false; s.stats = a.payload; })
            .addCase(fetchHostelStats.rejected, failed);
    },
});

export const { clearHostelError } = hostelSlice.actions;
export default hostelSlice.reducer;
