import axios from 'axios';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// VITE_API_URL may be configured as either the backend origin
// (https://knustlibrary.onrender.com) or the full API base
// (https://knustlibrary.onrender.com/api/v1). Normalize both forms.
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.endsWith('/api/v1')
    ? configuredApiUrl
    : `${configuredApiUrl}/api/v1`
  : 'http://localhost:5000/api/v1';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('knust_lib_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle systemic 401 Unauthorized errors across the frontend
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized. Redirecting to login.');
      localStorage.removeItem('knust_lib_token');
      localStorage.removeItem('knust_lib_user');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
