import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export interface PluginInfo {
    name: string; version: string; description: string; author: string;
    category: string; icon: string; status: string; is_builtin: boolean;
    requires: string[]; hooks: string[];
    config_schema: Record<string, any>; config: Record<string, any>;
    error: string | null;
}

export interface PluginStats {
    total: number; active: number; disabled: number; errors: number; hooks_registered: number;
}

interface PluginsState {
    plugins: PluginInfo[]; stats: PluginStats | null;
    hooks: Array<{ name: string; key: string }>;
    loading: boolean; processing: boolean; error: string | null;
}

const initialState: PluginsState = {
    plugins: [], stats: null, hooks: [],
    loading: false, processing: false, error: null,
};

export const fetchPlugins = createAsyncThunk('plugins/fetchAll',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/plugins/`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchPluginStats = createAsyncThunk('plugins/stats',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/plugins/stats`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchHooks = createAsyncThunk('plugins/hooks',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/plugins/hooks`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const activatePlugin = createAsyncThunk('plugins/activate',
    async (name: string, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/plugins/${name}/activate`, {}, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deactivatePlugin = createAsyncThunk('plugins/deactivate',
    async (name: string, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/plugins/${name}/deactivate`, {}, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updatePluginConfig = createAsyncThunk('plugins/updateConfig',
    async ({ name, config }: { name: string; config: Record<string, any> }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/plugins/${name}/config`, config, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const uninstallPlugin = createAsyncThunk('plugins/uninstall',
    async (name: string, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/plugins/${name}`, authHeader()); return name; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

const pluginsSlice = createSlice({
    name: 'plugins',
    initialState,
    reducers: {
        clearPluginsError: (s) => { s.error = null; },
    },
    extraReducers: (b) => {
        b
            .addCase(fetchPlugins.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(fetchPlugins.fulfilled, (s, a) => { s.loading = false; s.plugins = a.payload; })
            .addCase(fetchPlugins.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
            .addCase(fetchPluginStats.fulfilled, (s, a) => { s.stats = a.payload; })
            .addCase(fetchHooks.fulfilled, (s, a) => { s.hooks = a.payload; })
            .addCase(activatePlugin.pending, (s) => { s.processing = true; })
            .addCase(activatePlugin.fulfilled, (s, a) => { s.processing = false; const i = s.plugins.findIndex(p => p.name === a.payload.name); if (i >= 0) s.plugins[i] = a.payload; })
            .addCase(activatePlugin.rejected, (s, a) => { s.processing = false; s.error = a.payload as string; })
            .addCase(deactivatePlugin.fulfilled, (s, a) => { s.processing = false; const i = s.plugins.findIndex(p => p.name === a.payload.name); if (i >= 0) s.plugins[i] = a.payload; })
            .addCase(updatePluginConfig.fulfilled, (s, a) => { s.processing = false; const i = s.plugins.findIndex(p => p.name === a.payload.name); if (i >= 0) s.plugins[i] = a.payload; })
            .addCase(uninstallPlugin.fulfilled, (s, a) => { s.plugins = s.plugins.filter(p => p.name !== a.payload); });
    },
});

export const { clearPluginsError } = pluginsSlice.actions;
export default pluginsSlice.reducer;
