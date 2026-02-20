import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export interface SearchResult {
    id: number; type: string; title: string; subtitle: string; link: string; icon: string;
}
export interface SearchSuggestion {
    text: string; type: string; id: number;
}

interface SearchState {
    results: SearchResult[];
    suggestions: SearchSuggestion[];
    facets: Record<string, number>;
    total: number;
    query: string;
    loading: boolean;
    error: string | null;
}

const initialState: SearchState = {
    results: [], suggestions: [], facets: {}, total: 0, query: '', loading: false, error: null,
};

export const globalSearch = createAsyncThunk('search/global',
    async (params: { q: string; modules?: string; limit?: number; offset?: number }, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/search/`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Search failed'); }
    });

export const autocomplete = createAsyncThunk('search/autocomplete',
    async (q: string, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/search/autocomplete`, { ...authHeader(), params: { q } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const facetedSearch = createAsyncThunk('search/facets',
    async (q: string, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/search/facets`, { ...authHeader(), params: { q } })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

const searchSlice = createSlice({
    name: 'search',
    initialState,
    reducers: {
        clearSearchResults: (s) => { s.results = []; s.suggestions = []; s.facets = {}; s.total = 0; s.query = ''; },
    },
    extraReducers: (b) => {
        b.addCase(globalSearch.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(globalSearch.fulfilled, (s, a) => { s.loading = false; s.results = a.payload.results; s.total = a.payload.total; s.facets = a.payload.facets; s.query = a.payload.query; })
            .addCase(globalSearch.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
            .addCase(autocomplete.fulfilled, (s, a) => { s.suggestions = a.payload.suggestions; })
            .addCase(facetedSearch.fulfilled, (s, a) => { s.facets = a.payload.facets; });
    },
});

export const { clearSearchResults } = searchSlice.actions;
export default searchSlice.reducer;
