// Shared API client. Every backend call goes through this instance:
//  - baseURL handles web (same-origin proxy) vs packaged mobile (VITE_API_BASE)
//  - the bearer token is attached from localStorage in one place
//  - an expired/invalid token anywhere surfaces as one 'byf:session-expired'
//    event (handled in useAuth) instead of each screen failing silently
import axios from 'axios';
import { API_BASE } from './config';

export const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    // Backend signals: 401 = no/bad credentials, 403 + "token" message =
    // invalid or expired JWT (middleware/auth.js). Only treat it as a dead
    // session when we actually sent a stored token — login failures are 401s
    // too, but happen before any token exists.
    const tokenError =
      status === 401 || (status === 403 && /token/i.test(err.response?.data?.error || ''));
    if (tokenError && localStorage.getItem('token')) {
      window.dispatchEvent(new CustomEvent('byf:session-expired'));
    }
    return Promise.reject(err);
  }
);
