import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export interface SchoolSettingsData {
    id: number; tenant_id: string; school_name: string; school_code: string | null;
    school_logo: string | null; tagline: string | null; address: string | null;
    city: string | null; state: string | null; country: string | null; pincode: string | null;
    phone: string | null; email: string | null; website: string | null;
    established_year: number | null; principal_name: string | null;
    board_affiliation: string | null; school_type: string | null;
    created_at: string; updated_at: string;
}

export interface AcademicYearData {
    id: number; tenant_id: string; name: string; start_date: string;
    end_date: string; is_current: boolean; is_active: boolean;
    created_at: string; updated_at: string;
}

export interface PreferenceData {
    id: number; tenant_id: string; key: string; value: string | null;
    category: string; description: string | null; value_type: string;
    is_active: boolean; created_at: string; updated_at: string;
}

interface SettingsState {
    school: SchoolSettingsData | null;
    academicYears: AcademicYearData[];
    currentYear: AcademicYearData | null;
    preferences: PreferenceData[];
    loading: boolean; saving: boolean; error: string | null;
}

const initialState: SettingsState = {
    school: null, academicYears: [], currentYear: null, preferences: [],
    loading: false, saving: false, error: null,
};

export const fetchSchoolSettings = createAsyncThunk('settings/fetchSchool',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/settings/school`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateSchoolSettings = createAsyncThunk('settings/updateSchool',
    async (data: Partial<SchoolSettingsData>, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/settings/school`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchAcademicYears = createAsyncThunk('settings/fetchYears',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/settings/academic-years`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchCurrentYear = createAsyncThunk('settings/fetchCurrentYear',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/settings/academic-years/current`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createAcademicYear = createAsyncThunk('settings/createYear',
    async (data: { name: string; start_date: string; end_date: string; is_current?: boolean }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/settings/academic-years`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateAcademicYear = createAsyncThunk('settings/updateYear',
    async ({ id, ...data }: { id: number; name?: string; start_date?: string; end_date?: string; is_current?: boolean }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/settings/academic-years/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteAcademicYear = createAsyncThunk('settings/deleteYear',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/settings/academic-years/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchPreferences = createAsyncThunk('settings/fetchPrefs',
    async (category?: string, { rejectWithValue }: any = {}) => {
        try {
            const params = category ? { category } : {};
            return (await axios.get(`${API_URL}/settings/preferences`, { ...authHeader(), params })).data;
        } catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const upsertPreference = createAsyncThunk('settings/upsertPref',
    async (data: { key: string; value: string; category?: string; description?: string; value_type?: string }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/settings/preferences`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const bulkUpdatePreferences = createAsyncThunk('settings/bulkPrefs',
    async (preferences: Array<{ key: string; value: string; category?: string }>, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/settings/preferences/bulk`, { preferences }, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        clearSettingsError: (s) => { s.error = null; },
    },
    extraReducers: (b) => {
        const loading = (s: SettingsState) => { s.loading = true; s.error = null; };
        const failed = (s: SettingsState, a: any) => { s.loading = false; s.saving = false; s.error = a.payload as string; };
        b
            .addCase(fetchSchoolSettings.pending, loading)
            .addCase(fetchSchoolSettings.fulfilled, (s, a) => { s.loading = false; s.school = a.payload; })
            .addCase(fetchSchoolSettings.rejected, failed)
            .addCase(updateSchoolSettings.pending, (s) => { s.saving = true; s.error = null; })
            .addCase(updateSchoolSettings.fulfilled, (s, a) => { s.saving = false; s.school = a.payload; })
            .addCase(updateSchoolSettings.rejected, failed)
            .addCase(fetchAcademicYears.fulfilled, (s, a) => { s.loading = false; s.academicYears = a.payload; })
            .addCase(fetchCurrentYear.fulfilled, (s, a) => { s.currentYear = a.payload?.id ? a.payload : null; })
            .addCase(createAcademicYear.fulfilled, (s, a) => { s.saving = false; s.academicYears.unshift(a.payload); })
            .addCase(updateAcademicYear.fulfilled, (s, a) => { s.saving = false; const i = s.academicYears.findIndex(y => y.id === a.payload.id); if (i >= 0) s.academicYears[i] = a.payload; })
            .addCase(deleteAcademicYear.fulfilled, (s, a) => { s.academicYears = s.academicYears.filter(y => y.id !== a.payload); })
            .addCase(fetchPreferences.pending, loading)
            .addCase(fetchPreferences.fulfilled, (s, a) => { s.loading = false; s.preferences = a.payload; })
            .addCase(fetchPreferences.rejected, failed)
            .addCase(upsertPreference.fulfilled, (s, a) => { s.saving = false; const i = s.preferences.findIndex(p => p.key === a.payload.key); if (i >= 0) s.preferences[i] = a.payload; else s.preferences.push(a.payload); })
            .addCase(bulkUpdatePreferences.fulfilled, (s, a) => { s.saving = false; for (const p of a.payload) { const i = s.preferences.findIndex(x => x.key === p.key); if (i >= 0) s.preferences[i] = p; else s.preferences.push(p); } });
    },
});

export const { clearSettingsError } = settingsSlice.actions;
export default settingsSlice.reducer;
