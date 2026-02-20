import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Subject {
    id: number;
    name: string;
    code: string;
    description?: string;
    credits?: number;
    subject_type?: string;
    group_id?: number | null;
    group_name?: string | null;
}

export interface SubjectListItem {
    id: number;
    name: string;
    code: string;
    credits?: number;
    subject_type?: string;
    group_id?: number | null;
    group_name?: string | null;
}

export interface SubjectGroup {
    id: number;
    name: string;
    description?: string;
    subject_count?: number;
}

export interface ClassSubjectInfo {
    id: number;
    subject_id: number;
    subject_name: string;
    subject_code: string;
    teacher_id?: number | null;
    teacher_name?: string | null;
}

interface SubjectsState {
    subjects: SubjectListItem[];
    currentSubject: Subject | null;
    total: number;
    skip: number;
    limit: number;
    loading: boolean;
    error: string | null;
    // Groups
    groups: SubjectGroup[];
    groupsLoading: boolean;
    // Class subjects
    classSubjects: ClassSubjectInfo[];
    classSubjectsLoading: boolean;
}

const initialState: SubjectsState = {
    subjects: [],
    currentSubject: null,
    total: 0,
    skip: 0,
    limit: 100,
    loading: false,
    error: null,
    groups: [],
    groupsLoading: false,
    classSubjects: [],
    classSubjectsLoading: false,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Subject Thunks ─────────────────────────────────────────────────────

export const fetchSubjects = createAsyncThunk(
    'subjects/fetchSubjects',
    async (params: { skip?: number; limit?: number; search?: string; subject_type?: string; group_id?: number } = {}, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/subjects`, { ...authHeader(), params });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch subjects');
        }
    }
);

export const fetchSubjectById = createAsyncThunk(
    'subjects/fetchSubjectById',
    async (id: number, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/subjects/${id}`, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch subject');
        }
    }
);

export const createSubject = createAsyncThunk(
    'subjects/createSubject',
    async (subjectData: Partial<Subject>, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/subjects`, subjectData, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to create subject');
        }
    }
);

export const updateSubject = createAsyncThunk(
    'subjects/updateSubject',
    async ({ id, data }: { id: number; data: Partial<Subject> }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${API_URL}/subjects/${id}`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update subject');
        }
    }
);

export const deleteSubject = createAsyncThunk(
    'subjects/deleteSubject',
    async (id: number, { rejectWithValue }) => {
        try {
            await axios.delete(`${API_URL}/subjects/${id}`, authHeader());
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete subject');
        }
    }
);

// ─── Group Thunks ───────────────────────────────────────────────────────

export const fetchSubjectGroups = createAsyncThunk(
    'subjects/fetchSubjectGroups',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/subjects/groups/list`, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch subject groups');
        }
    }
);

export const createSubjectGroup = createAsyncThunk(
    'subjects/createSubjectGroup',
    async (data: { name: string; description?: string }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/subjects/groups`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to create subject group');
        }
    }
);

export const updateSubjectGroup = createAsyncThunk(
    'subjects/updateSubjectGroup',
    async ({ id, data }: { id: number; data: { name?: string; description?: string } }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${API_URL}/subjects/groups/${id}`, data, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update subject group');
        }
    }
);

export const deleteSubjectGroup = createAsyncThunk(
    'subjects/deleteSubjectGroup',
    async (id: number, { rejectWithValue }) => {
        try {
            await axios.delete(`${API_URL}/subjects/groups/${id}`, authHeader());
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete subject group');
        }
    }
);

// ─── Class-Subject Thunks ───────────────────────────────────────────────

export const fetchClassSubjects = createAsyncThunk(
    'subjects/fetchClassSubjects',
    async (classId: number, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_URL}/subjects/class/${classId}/subjects`, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch class subjects');
        }
    }
);

export const assignSubjectToClass = createAsyncThunk(
    'subjects/assignSubjectToClass',
    async ({ subjectId, classId, teacherId }: { subjectId: number; classId: number; teacherId?: number }, { rejectWithValue }) => {
        try {
            const response = await axios.post(
                `${API_URL}/subjects/${subjectId}/assign/${classId}`,
                { teacher_id: teacherId || null },
                authHeader()
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to assign subject to class');
        }
    }
);

export const unassignSubjectFromClass = createAsyncThunk(
    'subjects/unassignSubjectFromClass',
    async ({ subjectId, classId }: { subjectId: number; classId: number }, { rejectWithValue }) => {
        try {
            const response = await axios.delete(`${API_URL}/subjects/${subjectId}/unassign/${classId}`, authHeader());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to unassign subject');
        }
    }
);

// ─── Slice ──────────────────────────────────────────────────────────────

const subjectsSlice = createSlice({
    name: 'subjects',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearCurrentSubject: (state) => { state.currentSubject = null; },
        clearClassSubjects: (state) => { state.classSubjects = []; },
    },
    extraReducers: (builder) => {
        builder
            // Subjects
            .addCase(fetchSubjects.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchSubjects.fulfilled, (state, action) => {
                state.loading = false;
                state.subjects = action.payload.subjects;
                state.total = action.payload.total;
            })
            .addCase(fetchSubjects.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
            .addCase(fetchSubjectById.fulfilled, (state, action) => { state.currentSubject = action.payload; })
            .addCase(createSubject.fulfilled, (state) => { state.loading = false; })
            .addCase(createSubject.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
            .addCase(updateSubject.fulfilled, (state) => { state.loading = false; })
            .addCase(updateSubject.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
            .addCase(deleteSubject.fulfilled, (state, action) => {
                state.subjects = state.subjects.filter(s => s.id !== action.payload);
                state.total -= 1;
            })
            .addCase(deleteSubject.rejected, (state, action) => { state.error = action.payload as string; })
            // Groups
            .addCase(fetchSubjectGroups.pending, (state) => { state.groupsLoading = true; })
            .addCase(fetchSubjectGroups.fulfilled, (state, action) => {
                state.groupsLoading = false;
                state.groups = action.payload.groups;
            })
            .addCase(fetchSubjectGroups.rejected, (state, action) => { state.groupsLoading = false; state.error = action.payload as string; })
            .addCase(createSubjectGroup.fulfilled, (state) => { state.groupsLoading = false; })
            .addCase(createSubjectGroup.rejected, (state, action) => { state.error = action.payload as string; })
            .addCase(updateSubjectGroup.fulfilled, (state) => { state.groupsLoading = false; })
            .addCase(deleteSubjectGroup.fulfilled, (state, action) => {
                state.groups = state.groups.filter(g => g.id !== action.payload);
            })
            // Class subjects
            .addCase(fetchClassSubjects.pending, (state) => { state.classSubjectsLoading = true; })
            .addCase(fetchClassSubjects.fulfilled, (state, action) => {
                state.classSubjectsLoading = false;
                state.classSubjects = action.payload.subjects;
            })
            .addCase(fetchClassSubjects.rejected, (state, action) => { state.classSubjectsLoading = false; state.error = action.payload as string; });
    },
});

export const { clearError, clearCurrentSubject, clearClassSubjects } = subjectsSlice.actions;
export default subjectsSlice.reducer;
