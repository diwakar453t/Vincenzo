import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// ─── Types ──────────────────────────────────────────────────────────────

export interface NotificationItem {
    id: number; tenant_id: string; user_id: number;
    title: string; message: string;
    notification_type: string; priority: string; channel: string;
    is_read: boolean; read_at: string | null;
    link: string | null; metadata_json: Record<string, any> | null;
    sender_id: number | null; is_active: boolean;
    created_at: string; updated_at: string;
}

export interface NotificationPrefs {
    id: number; user_id: number;
    email_enabled: boolean; sms_enabled: boolean;
    push_enabled: boolean; in_app_enabled: boolean;
    attendance_alerts: boolean; fee_reminders: boolean;
    exam_notifications: boolean; announcement_notifications: boolean;
    leave_notifications: boolean; report_notifications: boolean;
}

export interface NotificationStats {
    total: number; unread: number; read: number;
    by_type: Array<{ type: string; count: number }>;
    by_priority: Array<{ priority: string; count: number }>;
}

interface NotificationsState {
    notifications: NotificationItem[];
    total: number;
    unreadCount: number;
    stats: NotificationStats | null;
    preferences: NotificationPrefs | null;
    loading: boolean;
    error: string | null;
}

const initialState: NotificationsState = {
    notifications: [], total: 0, unreadCount: 0,
    stats: null, preferences: null,
    loading: false, error: null,
};

// ─── Thunks ─────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk('notifications/fetchAll',
    async (params: { is_read?: boolean; notification_type?: string; limit?: number; offset?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/notifications/`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchUnreadCount = createAsyncThunk('notifications/unreadCount',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/notifications/unread-count`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchNotificationStats = createAsyncThunk('notifications/stats',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/notifications/stats`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const sendNotification = createAsyncThunk('notifications/send',
    async (data: { user_id: number; title: string; message: string; notification_type?: string; priority?: string; channel?: string; link?: string }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/notifications/send`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const broadcastNotification = createAsyncThunk('notifications/broadcast',
    async (data: { title: string; message: string; notification_type?: string; priority?: string }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/notifications/broadcast`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const markAsRead = createAsyncThunk('notifications/markRead',
    async (id: number, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/notifications/${id}/read`, {}, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const markAllRead = createAsyncThunk('notifications/markAllRead',
    async (_, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/notifications/read-all`, {}, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const deleteNotification = createAsyncThunk('notifications/delete',
    async (id: number, { rejectWithValue }) => {
        try { await axios.delete(`${API_URL}/notifications/${id}`, authHeader()); return id; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const clearAllNotifications = createAsyncThunk('notifications/clearAll',
    async (_, { rejectWithValue }) => {
        try { return (await axios.delete(`${API_URL}/notifications/clear-all`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchPreferences = createAsyncThunk('notifications/fetchPrefs',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/notifications/preferences`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const updatePreferences = createAsyncThunk('notifications/updatePrefs',
    async (data: Partial<NotificationPrefs>, { rejectWithValue }) => {
        try { return (await axios.put(`${API_URL}/notifications/preferences`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

// ─── Slice ──────────────────────────────────────────────────────────────

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        clearNotificationsError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        const loading = (state: NotificationsState) => { state.loading = true; state.error = null; };
        const failed = (state: NotificationsState, action: any) => { state.loading = false; state.error = action.payload as string; };

        builder
            .addCase(fetchNotifications.pending, loading)
            .addCase(fetchNotifications.fulfilled, (s, a) => {
                s.loading = false; s.notifications = a.payload.notifications;
                s.total = a.payload.total; s.unreadCount = a.payload.unread_count;
            })
            .addCase(fetchNotifications.rejected, failed)

            .addCase(fetchUnreadCount.fulfilled, (s, a) => { s.unreadCount = a.payload.unread_count; })

            .addCase(fetchNotificationStats.fulfilled, (s, a) => { s.stats = a.payload; })

            .addCase(sendNotification.pending, loading).addCase(sendNotification.fulfilled, (s) => { s.loading = false; }).addCase(sendNotification.rejected, failed)
            .addCase(broadcastNotification.pending, loading).addCase(broadcastNotification.fulfilled, (s) => { s.loading = false; }).addCase(broadcastNotification.rejected, failed)

            .addCase(markAsRead.fulfilled, (s, a) => {
                const idx = s.notifications.findIndex(n => n.id === a.payload.id);
                if (idx >= 0) s.notifications[idx] = a.payload;
                s.unreadCount = Math.max(0, s.unreadCount - 1);
            })

            .addCase(markAllRead.fulfilled, (s) => {
                s.notifications = s.notifications.map(n => ({ ...n, is_read: true }));
                s.unreadCount = 0;
            })

            .addCase(deleteNotification.fulfilled, (s, a) => {
                const removed = s.notifications.find(n => n.id === a.payload);
                s.notifications = s.notifications.filter(n => n.id !== a.payload);
                if (removed && !removed.is_read) s.unreadCount = Math.max(0, s.unreadCount - 1);
                s.total = Math.max(0, s.total - 1);
            })

            .addCase(clearAllNotifications.fulfilled, (s) => {
                s.notifications = []; s.total = 0; s.unreadCount = 0;
            })

            .addCase(fetchPreferences.fulfilled, (s, a) => { s.preferences = a.payload; })
            .addCase(updatePreferences.fulfilled, (s, a) => { s.preferences = a.payload; });
    },
});

export const { clearNotificationsError } = notificationsSlice.actions;
export default notificationsSlice.reducer;
