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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    return null;
  }
  return raw;
}

/**
 * Restore the persisted user object from localStorage.
 * This ensures user.role is available on page refresh so
 * role-based routing and sidebar menus work correctly.
 */
function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem('auth_user');
    return null;
  }
}

const storedToken = readStoredToken();

const initialState: AuthState = {
  // Restore user from localStorage so role survives page refresh.
  // Only restore if we also have a valid token (prevents stale user data).
  user: storedToken ? readStoredUser() : null,
  token: storedToken,
  isAuthenticated: !!storedToken,
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
      // Persist user so role survives page refresh
      localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
      // Persist tenant_id so X-Tenant-ID header works after page refresh
      if (action.payload.user.tenant_id) {
        localStorage.setItem('tenant_id', action.payload.user.tenant_id);
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('tenant_id');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('auth_user', JSON.stringify(action.payload));
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { loginSuccess, logout, setUser, setLoading } = authSlice.actions;
export default authSlice.reducer;
