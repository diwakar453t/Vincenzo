import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// ─── Types ──────────────────────────────────────────────────────────────

export interface SportItem {
    id: number; tenant_id: string; name: string; code: string | null;
    category: string; description: string | null;
    coach_name: string | null; coach_phone: string | null;
    venue: string | null; practice_schedule: string | null;
    max_participants: number; current_participants: number; available_slots: number;
    season: string | null; registration_fee: number; equipment_provided: boolean;
    status: string; is_active: boolean; achievements_count: number;
    created_at: string; updated_at: string;
}

export interface ParticipationItem {
    id: number; tenant_id: string;
    sport_id: number; sport_name: string | null;
    student_id: number; student_name: string | null;
    registration_date: string; end_date: string | null;
    position: string | null; jersey_number: string | null;
    fee_paid: boolean; status: string; remarks: string | null;
    created_at: string; updated_at: string;
}

export interface AchievementItem {
    id: number; tenant_id: string;
    sport_id: number; sport_name: string | null;
    student_id: number | null; student_name: string | null;
    title: string; achievement_type: string; level: string;
    event_name: string | null; event_date: string | null;
    event_venue: string | null; description: string | null;
    created_at: string; updated_at: string;
}

export interface SportsStats {
    total_sports: number; active_sports: number;
    total_participants: number; total_achievements: number;
    category_breakdown: Array<{ category: string; count: number; participants: number }>;
    achievement_breakdown: Array<{ level: string; count: number }>;
}

interface SportsState {
    sports: SportItem[];
    participations: ParticipationItem[];
    achievements: AchievementItem[];
    stats: SportsStats | null;
    loading: boolean;
    error: string | null;
}

const initialState: SportsState = {
    sports: [], participations: [], achievements: [],
    stats: null, loading: false, error: null,
};

// ─── Thunks ─────────────────────────────────────────────────────────────

export const fetchSports = createAsyncThunk('sports/fetchSports',
    async (params: { category?: string; status?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/sports/`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createSport = createAsyncThunk('sports/createSport',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/sports/`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateSport = createAsyncThunk('sports/updateSport',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/sports/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteSport = createAsyncThunk('sports/deleteSport',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/sports/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const registerStudent = createAsyncThunk('sports/register',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/sports/register`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchParticipations = createAsyncThunk('sports/fetchParticipations',
    async (params: { sport_id?: number; student_id?: number; status?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/sports/participations`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateParticipation = createAsyncThunk('sports/updateParticipation',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/sports/participations/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteParticipation = createAsyncThunk('sports/deleteParticipation',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/sports/participations/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createAchievement = createAsyncThunk('sports/createAchievement',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/sports/achievements`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchAchievements = createAsyncThunk('sports/fetchAchievements',
    async (params: { sport_id?: number; student_id?: number; level?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/sports/achievements`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateAchievement = createAsyncThunk('sports/updateAchievement',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/sports/achievements/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteAchievement = createAsyncThunk('sports/deleteAchievement',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/sports/achievements/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchSportsStats = createAsyncThunk('sports/fetchStats',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/sports/stats`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const sportsSlice = createSlice({
    name: 'sports',
    initialState,
    reducers: {
        clearSportsError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        const loading = (state: SportsState) => { state.loading = true; state.error = null; };
        const failed = (state: SportsState, action: any) => { state.loading = false; state.error = action.payload as string; };

        builder
            .addCase(fetchSports.pending, loading)
            .addCase(fetchSports.fulfilled, (s, a) => { s.loading = false; s.sports = a.payload.sports; })
            .addCase(fetchSports.rejected, failed)

            .addCase(createSport.pending, loading).addCase(createSport.fulfilled, (s) => { s.loading = false; }).addCase(createSport.rejected, failed)
            .addCase(updateSport.pending, loading).addCase(updateSport.fulfilled, (s) => { s.loading = false; }).addCase(updateSport.rejected, failed)
            .addCase(deleteSport.pending, loading)
            .addCase(deleteSport.fulfilled, (s, a) => { s.loading = false; s.sports = s.sports.filter(sp => sp.id !== a.payload); })
            .addCase(deleteSport.rejected, failed)

            .addCase(registerStudent.pending, loading).addCase(registerStudent.fulfilled, (s) => { s.loading = false; }).addCase(registerStudent.rejected, failed)

            .addCase(fetchParticipations.pending, loading)
            .addCase(fetchParticipations.fulfilled, (s, a) => { s.loading = false; s.participations = a.payload.participations; })
            .addCase(fetchParticipations.rejected, failed)

            .addCase(updateParticipation.pending, loading).addCase(updateParticipation.fulfilled, (s) => { s.loading = false; }).addCase(updateParticipation.rejected, failed)
            .addCase(deleteParticipation.pending, loading)
            .addCase(deleteParticipation.fulfilled, (s, a) => { s.loading = false; s.participations = s.participations.filter(p => p.id !== a.payload); })
            .addCase(deleteParticipation.rejected, failed)

            .addCase(createAchievement.pending, loading).addCase(createAchievement.fulfilled, (s) => { s.loading = false; }).addCase(createAchievement.rejected, failed)
            .addCase(fetchAchievements.pending, loading)
            .addCase(fetchAchievements.fulfilled, (s, a) => { s.loading = false; s.achievements = a.payload.achievements; })
            .addCase(fetchAchievements.rejected, failed)

            .addCase(updateAchievement.pending, loading).addCase(updateAchievement.fulfilled, (s) => { s.loading = false; }).addCase(updateAchievement.rejected, failed)
            .addCase(deleteAchievement.pending, loading)
            .addCase(deleteAchievement.fulfilled, (s, a) => { s.loading = false; s.achievements = s.achievements.filter(a2 => a2.id !== a.payload); })
            .addCase(deleteAchievement.rejected, failed)

            .addCase(fetchSportsStats.pending, loading)
            .addCase(fetchSportsStats.fulfilled, (s, a) => { s.loading = false; s.stats = a.payload; })
            .addCase(fetchSportsStats.rejected, failed);
    },
});

export const { clearSportsError } = sportsSlice.actions;
export default sportsSlice.reducer;
