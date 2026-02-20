import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export interface PaymentTransaction {
    id: number; tenant_id: string; order_id: string | null; payment_id: string | null;
    amount: number; currency: string; status: string; payment_method: string; purpose: string;
    description: string | null; upi_id: string | null;
    payer_user_id: number | null; student_id: number | null;
    payer_name: string | null; payer_email: string | null; payer_phone: string | null;
    fee_assignment_id: number | null;
    receipt_number: string | null; receipt_generated: boolean;
    refund_id: string | null; refund_amount: number | null; refund_reason: string | null;
    refund_status: string | null; refunded_at: string | null;
    error_code: string | null; error_description: string | null;
    paid_at: string | null; verified_at: string | null;
    created_at: string; updated_at: string;
}

export interface PaymentStats {
    total_collected: number; total_pending: number; total_refunded: number;
    total_transactions: number; completed_count: number; failed_count: number; refunded_count: number;
    by_method: Array<{ method: string; count: number; amount: number }>;
    by_purpose: Array<{ purpose: string; count: number; amount: number }>;
    recent_transactions: PaymentTransaction[];
}

export interface PaymentReceipt {
    receipt_number: string; transaction_id: number; order_id: string | null;
    payment_id: string | null; amount: number; currency: string; status: string;
    purpose: string; payer_name: string | null; student_id: number | null;
    paid_at: string | null; school_name: string;
}

interface PaymentsState {
    transactions: PaymentTransaction[]; total: number;
    stats: PaymentStats | null; currentReceipt: PaymentReceipt | null;
    initiatedPayment: any | null;
    loading: boolean; processing: boolean; error: string | null;
}

const initialState: PaymentsState = {
    transactions: [], total: 0, stats: null, currentReceipt: null, initiatedPayment: null,
    loading: false, processing: false, error: null,
};

export const fetchPayments = createAsyncThunk('payments/fetchAll',
    async (params: { status?: string; student_id?: number; purpose?: string; limit?: number; offset?: number } = {}, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/payments/`, { ...authHeader(), params })).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchPaymentStats = createAsyncThunk('payments/stats',
    async (_, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/payments/stats`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const initiatePayment = createAsyncThunk('payments/initiate',
    async (data: { amount: number; purpose?: string; description?: string; student_id?: number; fee_assignment_id?: number; payer_name?: string; payer_email?: string; payer_phone?: string; payment_method?: string }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/payments/initiate`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const verifyPayment = createAsyncThunk('payments/verify',
    async (data: { order_id: string; payment_id: string; signature: string }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/payments/verify`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const fetchReceipt = createAsyncThunk('payments/receipt',
    async (txnId: number, { rejectWithValue }) => {
        try { return (await axios.get(`${API_URL}/payments/${txnId}/receipt`, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

export const initiateRefund = createAsyncThunk('payments/refund',
    async (data: { transaction_id: number; amount?: number; reason?: string }, { rejectWithValue }) => {
        try { return (await axios.post(`${API_URL}/payments/refund`, data, authHeader())).data; }
        catch (e: any) { return rejectWithValue(e.response?.data?.detail || 'Failed'); }
    });

const paymentsSlice = createSlice({
    name: 'payments',
    initialState,
    reducers: {
        clearPaymentsError: (s) => { s.error = null; },
        clearInitiatedPayment: (s) => { s.initiatedPayment = null; },
        clearReceipt: (s) => { s.currentReceipt = null; },
    },
    extraReducers: (b) => {
        b
            .addCase(fetchPayments.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(fetchPayments.fulfilled, (s, a) => { s.loading = false; s.transactions = a.payload.transactions; s.total = a.payload.total; })
            .addCase(fetchPayments.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
            .addCase(fetchPaymentStats.fulfilled, (s, a) => { s.stats = a.payload; })
            .addCase(initiatePayment.pending, (s) => { s.processing = true; s.error = null; })
            .addCase(initiatePayment.fulfilled, (s, a) => { s.processing = false; s.initiatedPayment = a.payload; })
            .addCase(initiatePayment.rejected, (s, a) => { s.processing = false; s.error = a.payload as string; })
            .addCase(verifyPayment.fulfilled, (s, a) => { s.processing = false; const i = s.transactions.findIndex(t => t.order_id === a.payload.order_id); if (i >= 0) s.transactions[i] = a.payload; else s.transactions.unshift(a.payload); s.initiatedPayment = null; })
            .addCase(fetchReceipt.fulfilled, (s, a) => { s.currentReceipt = a.payload; })
            .addCase(initiateRefund.fulfilled, (s, a) => { s.processing = false; const i = s.transactions.findIndex(t => t.id === a.payload.id); if (i >= 0) s.transactions[i] = a.payload; });
    },
});

export const { clearPaymentsError, clearInitiatedPayment, clearReceipt } = paymentsSlice.actions;
export default paymentsSlice.reducer;
