import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface SyllabusTopic {
    id: number;
    syllabus_id: number;
    title: string;
    description?: string;
    order: number;
    is_completed: boolean;
    completed_date?: string | null;
    document_path?: string | null;
    document_name?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Syllabus {
    id: number;
    title: string;
    description?: string;
    academic_year: string;
    status: string;
    subject_id: number;
    class_id: number;
    subject_name?: string;
    class_name?: string;
    topics: SyllabusTopic[];
    total_topics: number;
    completed_topics: number;
    progress: number;
    tenant_id: string;
    created_at: string;
    updated_at: string;
}

export interface SyllabusListItem {
    id: number;
    title: string;
    academic_year: string;
    status: string;
    subject_id: number;
    subject_name?: string;
    class_id: number;
    class_name?: string;
    total_topics: number;
    completed_topics: number;
    progress: number;
}

interface SyllabusState {
    syllabi: SyllabusListItem[];
    currentSyllabus: Syllabus | null;
    total: number;
    loading: boolean;
    detailLoading: boolean;
    error: string | null;
}

const initialState: SyllabusState = {
    syllabi: [],
    currentSyllabus: null,
    total: 0,
    loading: false,
    detailLoading: false,
    error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Syllabus Thunks ────────────────────────────────────────────────────

export const fetchSyllabi = createAsyncThunk(
    'syllabus/fetchSyllabi',
    async (params: { subject_id?: number; class_id?: number; status?: string; search?: string } = {}, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/syllabus`, { ...authHeader(), params });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch syllabi');
        }
    }
);

export const fetchSyllabusById = createAsyncThunk(
    'syllabus/fetchSyllabusById',
    async (id: number, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/syllabus/${id}`, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch syllabus');
        }
    }
);

export const createSyllabus = createAsyncThunk(
    'syllabus/createSyllabus',
    async (data: any, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/syllabus`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to create syllabus');
        }
    }
);

export const updateSyllabus = createAsyncThunk(
    'syllabus/updateSyllabus',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${API_URL}/syllabus/${id}`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update syllabus');
        }
    }
);

export const deleteSyllabus = createAsyncThunk(
    'syllabus/deleteSyllabus',
    async (id: number, { rejectWithValue }) => {
        try {
            await axios.delete(`${API_URL}/syllabus/${id}`, authHeader());
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete syllabus');
        }
    }
);

// ─── Topic Thunks ───────────────────────────────────────────────────────

export const addTopic = createAsyncThunk(
    'syllabus/addTopic',
    async ({ syllabusId, data }: { syllabusId: number; data: any }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/syllabus/${syllabusId}/topics`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to add topic');
        }
    }
);

export const updateTopic = createAsyncThunk(
    'syllabus/updateTopic',
    async ({ topicId, data }: { topicId: number; data: any }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${API_URL}/syllabus/topics/${topicId}`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update topic');
        }
    }
);

export const deleteTopic = createAsyncThunk(
    'syllabus/deleteTopic',
    async (topicId: number, { rejectWithValue }) => {
        try {
            await axios.delete(`${API_URL}/syllabus/topics/${topicId}`, authHeader());
            return topicId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete topic');
        }
    }
);

export const toggleTopicCompletion = createAsyncThunk(
    'syllabus/toggleTopicCompletion',
    async (topicId: number, { rejectWithValue }) => {
        try {
            const response = await axios.patch(`${API_URL}/syllabus/topics/${topicId}/toggle`, {}, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to toggle topic');
        }
    }
);

export const uploadTopicDocument = createAsyncThunk(
    'syllabus/uploadTopicDocument',
    async ({ topicId, file }: { topicId: number; file: File }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`${API_URL}/syllabus/topics/${topicId}/upload`, formData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to upload document');
        }
    }
);

export const deleteTopicDocument = createAsyncThunk(
    'syllabus/deleteTopicDocument',
    async (topicId: number, { rejectWithValue }) => {
        try {
            await axios.delete(`${API_URL}/syllabus/topics/${topicId}/document`, authHeader());
            return topicId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete document');
        }
    }
);

// ─── Slice ──────────────────────────────────────────────────────────────

const syllabusSlice = createSlice({
    name: 'syllabus',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearCurrentSyllabus: (state) => { state.currentSyllabus = null; },
    },
    extraReducers: (builder) => {
        builder
            // List
            .addCase(fetchSyllabi.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchSyllabi.fulfilled, (state, action) => {
                state.loading = false;
                state.syllabi = action.payload.syllabi;
                state.total = action.payload.total;
            })
            .addCase(fetchSyllabi.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
            // Detail
            .addCase(fetchSyllabusById.pending, (state) => { state.detailLoading = true; })
            .addCase(fetchSyllabusById.fulfilled, (state, action) => { state.detailLoading = false; state.currentSyllabus = action.payload; })
            .addCase(fetchSyllabusById.rejected, (state, action) => { state.detailLoading = false; state.error = action.payload as string; })
            // Create / Update / Delete syllabus
            .addCase(createSyllabus.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateSyllabus.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(deleteSyllabus.fulfilled, (state, action) => {
                state.syllabi = state.syllabi.filter(s => s.id !== action.payload);
                state.total -= 1;
            })
            .addCase(deleteSyllabus.rejected, (state, action) => { state.error = action.payload as string; })
            // Topics: update current syllabus topics on toggle
            .addCase(toggleTopicCompletion.fulfilled, (state, action) => {
                if (state.currentSyllabus) {
                    const idx = state.currentSyllabus.topics.findIndex(t => t.id === action.payload.id);
                    if (idx >= 0) {
                        state.currentSyllabus.topics[idx] = action.payload;
                        const completed = state.currentSyllabus.topics.filter(t => t.is_completed).length;
                        const total = state.currentSyllabus.topics.length;
                        state.currentSyllabus.completed_topics = completed;
                        state.currentSyllabus.progress = total > 0 ? Math.round(completed / total * 1000) / 10 : 0;
                    }
                }
            })
            .addCase(addTopic.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateTopic.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(deleteTopic.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(uploadTopicDocument.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(deleteTopicDocument.rejected, (state, action) => { state.error = action.payload as string; });
    },
});

export const { clearError, clearCurrentSyllabus } = syllabusSlice.actions;
export default syllabusSlice.reducer;
