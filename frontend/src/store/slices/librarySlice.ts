import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────

export interface BookItem {
    id: number; tenant_id: string; title: string; isbn?: string | null;
    author: string; publisher?: string | null; edition?: string | null;
    category?: string | null; subject?: string | null; language?: string | null;
    pages?: number | null; price?: number | null; rack_number?: string | null;
    total_copies: number; available_copies: number;
    description?: string | null; cover_image?: string | null;
    publication_year?: number | null; status: string; is_active: boolean;
    created_at: string; updated_at: string;
}

export interface MemberItem {
    id: number; tenant_id: string; member_code?: string | null;
    member_type: string; student_id?: number | null; teacher_id?: number | null;
    name: string; email?: string | null; phone?: string | null;
    max_books_allowed: number; membership_start?: string | null;
    membership_end?: string | null; status: string; books_issued: number;
    created_at: string; updated_at: string;
}

export interface IssueReturnItem {
    id: number; tenant_id: string; book_id: number; book_title?: string | null;
    book_isbn?: string | null; member_id: number; member_name?: string | null;
    member_code?: string | null; issue_date: string; due_date: string;
    return_date?: string | null; status: string; fine_amount: number;
    fine_paid: boolean; fine_per_day: number; remarks?: string | null;
    created_at: string; updated_at: string;
}

export interface OverdueItem {
    issue_id: number; book_title: string; member_name: string;
    member_code?: string | null; issue_date: string; due_date: string;
    days_overdue: number; fine_amount: number;
}

export interface LibraryStats {
    total_books: number; total_copies: number; available_copies: number;
    issued_copies: number; total_members: number; active_members: number;
    total_issued: number; total_returned: number; total_overdue: number;
    total_fines: number; fines_collected: number; fines_pending: number;
    category_breakdown: Record<string, number>;
}

interface LibraryState {
    books: BookItem[]; bookTotal: number;
    members: MemberItem[]; memberTotal: number;
    issues: IssueReturnItem[]; issueTotal: number;
    overdueItems: OverdueItem[]; overdueTotal: number;
    stats: LibraryStats | null;
    loading: boolean; detailLoading: boolean; error: string | null;
}

const initialState: LibraryState = {
    books: [], bookTotal: 0,
    members: [], memberTotal: 0,
    issues: [], issueTotal: 0,
    overdueItems: [], overdueTotal: 0,
    stats: null,
    loading: false, detailLoading: false, error: null,
};

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
});

// ─── Books ──────────────────────────────────────────────────────────────

export const fetchBooks = createAsyncThunk('library/fetchBooks',
    async (params: { category?: string; search?: string; status?: string; is_active?: boolean } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/library/books`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createBook = createAsyncThunk('library/createBook',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/library/books`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateBook = createAsyncThunk('library/updateBook',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/library/books/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteBook = createAsyncThunk('library/deleteBook',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/library/books/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Members ────────────────────────────────────────────────────────────

export const fetchMembers = createAsyncThunk('library/fetchMembers',
    async (params: { member_type?: string; status?: string; search?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/library/members`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const createMember = createAsyncThunk('library/createMember',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/library/members`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updateMember = createAsyncThunk('library/updateMember',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/library/members/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteMember = createAsyncThunk('library/deleteMember',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/library/members/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Issue / Return ─────────────────────────────────────────────────────

export const issueBook = createAsyncThunk('library/issueBook',
    async (data: any, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/library/issue`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const returnBook = createAsyncThunk('library/returnBook',
    async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/library/return/${id}`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchIssues = createAsyncThunk('library/fetchIssues',
    async (params: { member_id?: number; book_id?: number; status?: string } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/library/issues`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Overdue & Fines ────────────────────────────────────────────────────

export const fetchOverdue = createAsyncThunk('library/fetchOverdue',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/library/overdue`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const calculateFine = createAsyncThunk('library/calculateFine',
    async (issueId: number, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/library/fine/${issueId}`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const payFine = createAsyncThunk('library/payFine',
    async (issueId: number, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/library/fine/${issueId}/pay`, {}, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Stats ──────────────────────────────────────────────────────────────

export const fetchLibraryStats = createAsyncThunk('library/fetchStats',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/library/stats`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const librarySlice = createSlice({
    name: 'library',
    initialState,
    reducers: {
        clearLibraryError: s => { s.error = null; },
    },
    extraReducers: b => {
        b.addCase(fetchBooks.pending, s => { s.loading = true; s.error = null; })
            .addCase(fetchBooks.fulfilled, (s, a) => { s.loading = false; s.books = a.payload.books; s.bookTotal = a.payload.total; })
            .addCase(fetchBooks.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(createBook.fulfilled, (s, a) => { s.books.push(a.payload); s.bookTotal += 1; })
            .addCase(updateBook.fulfilled, (s, a) => { const i = s.books.findIndex(b => b.id === a.payload.id); if (i >= 0) s.books[i] = a.payload; })
            .addCase(deleteBook.fulfilled, (s, a) => { s.books = s.books.filter(b => b.id !== a.payload); s.bookTotal -= 1; })

            .addCase(fetchMembers.pending, s => { s.loading = true; })
            .addCase(fetchMembers.fulfilled, (s, a) => { s.loading = false; s.members = a.payload.members; s.memberTotal = a.payload.total; })
            .addCase(fetchMembers.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(createMember.fulfilled, (s, a) => { s.members.push(a.payload); s.memberTotal += 1; })
            .addCase(updateMember.fulfilled, (s, a) => { const i = s.members.findIndex(m => m.id === a.payload.id); if (i >= 0) s.members[i] = a.payload; })
            .addCase(deleteMember.fulfilled, (s, a) => { s.members = s.members.filter(m => m.id !== a.payload); s.memberTotal -= 1; })

            .addCase(issueBook.fulfilled, (s, a) => { s.issues.unshift(a.payload); s.issueTotal += 1; })
            .addCase(issueBook.rejected, (s, a) => { s.error = a.payload as string; })

            .addCase(returnBook.fulfilled, (s, a) => { const i = s.issues.findIndex(x => x.id === a.payload.id); if (i >= 0) s.issues[i] = a.payload; })
            .addCase(returnBook.rejected, (s, a) => { s.error = a.payload as string; })

            .addCase(fetchIssues.pending, s => { s.loading = true; })
            .addCase(fetchIssues.fulfilled, (s, a) => { s.loading = false; s.issues = a.payload.issues; s.issueTotal = a.payload.total; })
            .addCase(fetchIssues.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(fetchOverdue.pending, s => { s.loading = true; })
            .addCase(fetchOverdue.fulfilled, (s, a) => { s.loading = false; s.overdueItems = a.payload.overdue_items; s.overdueTotal = a.payload.total; })
            .addCase(fetchOverdue.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })

            .addCase(payFine.fulfilled, (s, a) => { const i = s.issues.findIndex(x => x.id === a.payload.id); if (i >= 0) s.issues[i] = a.payload; })

            .addCase(fetchLibraryStats.pending, s => { s.detailLoading = true; })
            .addCase(fetchLibraryStats.fulfilled, (s, a) => { s.detailLoading = false; s.stats = a.payload; })
            .addCase(fetchLibraryStats.rejected, (s, a) => { s.detailLoading = false; s.error = a.payload as string; });
    },
});

export const { clearLibraryError } = librarySlice.actions;
export default librarySlice.reducer;
