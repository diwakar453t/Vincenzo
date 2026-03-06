import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App.tsx';

// ── Global Axios Interceptor ─────────────────────────────────────────────────
// Injects Authorization and X-Tenant-ID headers on ALL axios requests,
// including those made with raw `axios` (not the `api` instance).
// This ensures all 23+ Redux slices that use raw axios get proper headers.
axios.interceptors.request.use((config) => {
  // Add Authorization header
  const token = localStorage.getItem('access_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add X-Tenant-ID header from user profile stored in localStorage
  if (!config.headers['X-Tenant-ID']) {
    try {
      const userStr = localStorage.getItem('auth_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.tenant_id) {
          config.headers['X-Tenant-ID'] = user.tenant_id;
        }
      }
    } catch {
      // JSON parse error — skip
    }
  }

  return config;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
