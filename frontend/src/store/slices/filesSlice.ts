import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export interface FileItem {
    id: number; tenant_id: string; filename: string; original_name: string;
    file_path: string; mime_type: string | null; file_size: number;
    category: string; visibility: string; description: string | null;
    uploaded_by: number | null; entity_type: string | null; entity_id: number | null;
    is_active: boolean; created_at: string; updated_at: string;
}

export interface FileStats {
    total_files: number; total_size_bytes: number; total_size_mb: number;
    by_category: Array<{ category: string; count: number; size_bytes: number }>;
    recent_uploads: FileItem[];
}

interface FilesState {
    files: FileItem[]; total: number; stats: FileStats | null;
    sharedFiles: FileItem[];
    loading: boolean; uploading: boolean; error: string | null;
}

const initialState: FilesState = {
    files: [], total: 0, stats: null, sharedFiles: [],
    loading: false, uploading: false, error: null,
};

export const fetchFiles = createAsyncThunk('files/fetchAll',
    async (params: { category?: string; entity_type?: string; entity_id?: number; limit?: number; offset?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/files/`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const uploadFile = createAsyncThunk('files/upload',
    async (data: { file: File; description?: string; entity_type?: string; entity_id?: number; visibility?: string }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', data.file);
            if (data.description) formData.append('description', data.description);
            if (data.entity_type) formData.append('entity_type', data.entity_type);
            if (data.entity_id) formData.append('entity_id', String(data.entity_id));
            formData.append('visibility', data.visibility || 'private');
            return (await axios.post(`${API_URL}/files/upload`, formData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' },
            })).data;
        } catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Upload failed'); }
    });

export const deleteFile = createAsyncThunk('files/delete',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/files/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchFileStats = createAsyncThunk('files/stats',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/files/stats`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchSharedFiles = createAsyncThunk('files/shared',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/files/shared`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const shareFile = createAsyncThunk('files/share',
    async (data: { file_id: number; shared_with_user_id: number; can_edit?: boolean }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/files/share`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const downloadFile = createAsyncThunk('files/download',
    async (id: number, { rejectWithValue }) => {
        try {
            const resp = await axios.get(`${API_URL}/files/${id}/download`, { ...authHeader(), responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([resp.data]));
            const link = document.createElement('a');
            const disposition = resp.headers['content-disposition'];
            const filename = disposition ? disposition.split('filename=')[1]?.replace(/"/g, '') : 'download';
            link.href = url; link.setAttribute('download', filename); document.body.appendChild(link);
            link.click(); link.remove(); window.URL.revokeObjectURL(url);
            return id;
        } catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Download failed'); }
    });

const filesSlice = createSlice({
    name: 'files',
    initialState,
    reducers: {
        clearFilesError: (s) => { s.error = null; },
    },
    extraReducers: (b) => {
        const loading = (s: FilesState) => { s.loading = true; s.error = null; };
        const failed = (s: FilesState, a: any) => { s.loading = false; s.error = a.payload as string; };
        b
            .addCase(fetchFiles.pending, loading)
            .addCase(fetchFiles.fulfilled, (s, a) => { s.loading = false; s.files = a.payload.files; s.total = a.payload.total; })
            .addCase(fetchFiles.rejected, failed)
            .addCase(uploadFile.pending, (s) => { s.uploading = true; s.error = null; })
            .addCase(uploadFile.fulfilled, (s, a) => { s.uploading = false; s.files.unshift(a.payload); s.total += 1; })
            .addCase(uploadFile.rejected, (s, a) => { s.uploading = false; s.error = a.payload as string; })
            .addCase(deleteFile.fulfilled, (s, a) => { s.files = s.files.filter(f => f.id !== a.payload); s.total -= 1; })
            .addCase(fetchFileStats.fulfilled, (s, a) => { s.stats = a.payload; })
            .addCase(fetchSharedFiles.fulfilled, (s, a) => { s.sharedFiles = a.payload.files; })
            .addCase(shareFile.fulfilled, (s) => { s.loading = false; });
    },
});

export const { clearFilesError } = filesSlice.actions;
export default filesSlice.reducer;
