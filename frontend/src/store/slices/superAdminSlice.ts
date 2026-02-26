import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Institution {
    id: string;
    name: string;
    domain: string;
    is_active: boolean;
    total_users: number;
    total_students: number;
    total_teachers: number;
}

export interface PlatformStats {
    total_institutions: number;
    active_institutions: number;
    total_users: number;
    total_students: number;
    total_teachers: number;
    total_admins: number;
    storage_used_mb: number;
    server_uptime_pct: number;
}

export interface AuditLogEntry {
    id: number;
    action: string;
    entity_type?: string;
    entity_id?: number;
    user_id?: number;
    ip_address?: string;
    created_at: string;
}

export interface FeatureFlag {
    name: string;
    enabled: boolean;
    scope: string;
    description: string;
}

interface SuperAdminState {
    institutions: Institution[];
    platformStats: PlatformStats | null;
    auditLogs: AuditLogEntry[];
    auditTotal: number;
    featureFlags: FeatureFlag[];
    loading: boolean;
    error: string | null;
}

const initialState: SuperAdminState = {
    institutions: [],
    platformStats: null,
    auditLogs: [],
    auditTotal: 0,
    featureFlags: [],
    loading: false,
    error: null,
};

// ─── Thunks ──────────────────────────────────────────────────────────────────
export const fetchInstitutions = createAsyncThunk(
    'superAdmin/fetchInstitutions',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/super-admin/institutions');
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch institutions');
        }
    }
);

export const createInstitution = createAsyncThunk(
    'superAdmin/createInstitution',
    async (data: { id: string; name: string; domain: string }, { rejectWithValue }) => {
        try {
            const res = await api.post('/super-admin/institutions', data);
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to create institution');
        }
    }
);

export const suspendInstitution = createAsyncThunk(
    'superAdmin/suspendInstitution',
    async (id: string, { rejectWithValue }) => {
        try {
            const res = await api.patch(`/super-admin/institutions/${id}/suspend`);
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to update institution');
        }
    }
);

export const fetchPlatformStats = createAsyncThunk(
    'superAdmin/fetchPlatformStats',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/super-admin/platform-stats');
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch platform stats');
        }
    }
);

export const fetchAuditLogs = createAsyncThunk(
    'superAdmin/fetchAuditLogs',
    async (params: { skip?: number; limit?: number } = {}, { rejectWithValue }) => {
        try {
            const res = await api.get('/super-admin/audit-logs', { params });
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch audit logs');
        }
    }
);

export const fetchFeatureFlags = createAsyncThunk(
    'superAdmin/fetchFeatureFlags',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/feature-flags');
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch feature flags');
        }
    }
);

export const toggleFeatureFlag = createAsyncThunk(
    'superAdmin/toggleFeatureFlag',
    async ({ name, enabled }: { name: string; enabled: boolean }, { rejectWithValue }) => {
        try {
            const res = await api.patch(`/feature-flags/${name}`, { enabled });
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.detail || 'Failed to toggle feature flag');
        }
    }
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const superAdminSlice = createSlice({
    name: 'superAdmin',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        const setLoading = (state: SuperAdminState) => { state.loading = true; state.error = null; };
        const setError = (state: SuperAdminState, action: any) => { state.loading = false; state.error = action.payload as string; };

        builder
            // institutions
            .addCase(fetchInstitutions.pending, setLoading)
            .addCase(fetchInstitutions.fulfilled, (state, action) => { state.loading = false; state.institutions = action.payload; })
            .addCase(fetchInstitutions.rejected, setError)
            // create
            .addCase(createInstitution.pending, setLoading)
            .addCase(createInstitution.fulfilled, (state, action) => { state.loading = false; state.institutions.push(action.payload); })
            .addCase(createInstitution.rejected, setError)
            // suspend
            .addCase(suspendInstitution.pending, setLoading)
            .addCase(suspendInstitution.fulfilled, (state, action) => {
                state.loading = false;
                const idx = state.institutions.findIndex(i => i.id === action.payload.id);
                if (idx >= 0) state.institutions[idx].is_active = action.payload.is_active;
            })
            .addCase(suspendInstitution.rejected, setError)
            // platform stats
            .addCase(fetchPlatformStats.pending, setLoading)
            .addCase(fetchPlatformStats.fulfilled, (state, action) => { state.loading = false; state.platformStats = action.payload; })
            .addCase(fetchPlatformStats.rejected, setError)
            // audit logs
            .addCase(fetchAuditLogs.pending, setLoading)
            .addCase(fetchAuditLogs.fulfilled, (state, action) => {
                state.loading = false;
                state.auditLogs = action.payload.logs;
                state.auditTotal = action.payload.total;
            })
            .addCase(fetchAuditLogs.rejected, setError)
            // feature flags
            .addCase(fetchFeatureFlags.pending, setLoading)
            .addCase(fetchFeatureFlags.fulfilled, (state, action) => { state.loading = false; state.featureFlags = action.payload; })
            .addCase(fetchFeatureFlags.rejected, setError)
            // toggle flag
            .addCase(toggleFeatureFlag.fulfilled, (state, action) => {
                const idx = state.featureFlags.findIndex(f => f.name === action.payload.name);
                if (idx >= 0) state.featureFlags[idx] = action.payload;
            });
    },
});

export const { clearError } = superAdminSlice.actions;
export default superAdminSlice.reducer;
