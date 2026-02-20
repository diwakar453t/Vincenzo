import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// ---------- Types ----------
interface Room {
    id: number;
    room_number: string;
    name: string | null;
    building: string | null;
    floor: number | null;
    room_type: string;
    capacity: number;
    status: string;
    has_projector: boolean;
    has_ac: boolean;
    has_whiteboard: boolean;
    has_smartboard: boolean;
    assigned_class_count: number;
    current_occupancy: number;
}

interface RoomDetail extends Room {
    tenant_id: string;
    created_at: string;
    updated_at: string;
    display_name: string;
    description: string | null;
    assigned_classes: { id: number; name: string; grade_level: number; section: string; student_count: number }[];
}

interface RoomsState {
    rooms: Room[];
    currentRoom: RoomDetail | null;
    total: number;
    loading: boolean;
    error: string | null;
    filters: { search: string; room_type: string; status: string; building: string };
}

const initialState: RoomsState = {
    rooms: [],
    currentRoom: null,
    total: 0,
    loading: false,
    error: null,
    filters: { search: '', room_type: '', status: '', building: '' },
};

// ---------- Thunks ----------
export const fetchRooms = createAsyncThunk(
    'rooms/fetchAll',
    async (params: { skip?: number; limit?: number; search?: string; room_type?: string; status_filter?: string; building?: string } = {}, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/rooms', { params });
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch rooms');
        }
    }
);

export const fetchRoom = createAsyncThunk(
    'rooms/fetchOne',
    async (id: number, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/rooms/${id}`);
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch room');
        }
    }
);

export const createRoom = createAsyncThunk(
    'rooms/create',
    async (roomData: any, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/rooms', roomData);
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to create room');
        }
    }
);

export const updateRoom = createAsyncThunk(
    'rooms/update',
    async ({ id, data: roomData }: { id: number; data: any }, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`/rooms/${id}`, roomData);
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to update room');
        }
    }
);

export const deleteRoom = createAsyncThunk(
    'rooms/delete',
    async (id: number, { rejectWithValue }) => {
        try {
            await api.delete(`/rooms/${id}`);
            return id;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to delete room');
        }
    }
);

export const assignRoomToClass = createAsyncThunk(
    'rooms/assignClass',
    async ({ roomId, classId }: { roomId: number; classId: number }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/rooms/${roomId}/assign/${classId}`);
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to assign room');
        }
    }
);

export const unassignRoomFromClass = createAsyncThunk(
    'rooms/unassignClass',
    async ({ roomId, classId }: { roomId: number; classId: number }, { rejectWithValue }) => {
        try {
            const { data } = await api.delete(`/rooms/${roomId}/unassign/${classId}`);
            return data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to unassign room');
        }
    }
);

// ---------- Slice ----------
const roomsSlice = createSlice({
    name: 'rooms',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload }; },
        clearCurrentRoom: (state) => { state.currentRoom = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchRooms.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchRooms.fulfilled, (state, action) => { state.loading = false; state.rooms = action.payload.rooms; state.total = action.payload.total; })
            .addCase(fetchRooms.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

            .addCase(fetchRoom.pending, (state) => { state.loading = true; })
            .addCase(fetchRoom.fulfilled, (state, action) => { state.loading = false; state.currentRoom = action.payload; })
            .addCase(fetchRoom.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

            .addCase(createRoom.pending, (state) => { state.loading = true; })
            .addCase(createRoom.fulfilled, (state) => { state.loading = false; })
            .addCase(createRoom.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

            .addCase(updateRoom.pending, (state) => { state.loading = true; })
            .addCase(updateRoom.fulfilled, (state) => { state.loading = false; })
            .addCase(updateRoom.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

            .addCase(deleteRoom.fulfilled, (state, action) => { state.rooms = state.rooms.filter(r => r.id !== action.payload); state.total -= 1; })
            .addCase(deleteRoom.rejected, (state, action) => { state.error = action.payload as string; });
    },
});

export const { clearError, setFilters, clearCurrentRoom } = roomsSlice.actions;
export default roomsSlice.reducer;
