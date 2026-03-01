import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// SECURITY NOTE: Access tokens are stored in localStorage for convenience.
// This exposes them to XSS if any injected script runs in the app context.
// For production hardening, migrate to httpOnly cookies served by the backend.
// As a mitigation, we validate the token format at startup to reject injected
// values that are not valid JWTs.
function readStoredToken(): string | null {
  const raw = localStorage.getItem('access_token');
  if (!raw) return null;
  // A JWT must have exactly 2 dots (header.payload.signature)
  const parts = raw.split('.');
  if (parts.length !== 3) {
    // Malformed — clear it and treat as unauthenticated
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    return null;
  }
  return raw;
}

const initialState: AuthState = {
  user: null,
  token: readStoredToken(),   // Issue 10: validated on read
  isAuthenticated: !!readStoredToken(),
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      // Issue 11: Clear both storage types to ensure complete logout
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { loginSuccess, logout, setUser, setLoading } = authSlice.actions;
export default authSlice.reducer;
