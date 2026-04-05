import axios from 'axios';
import { appParams } from '@/lib/app-params';

const apiClient = axios.create({
  baseURL: appParams.apiBaseUrl || (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8788/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = appParams.token || localStorage.getItem('ph_sports_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Handle unauthorized access (e.g., redirect to login)
      console.error('Unauthorized access - potential token expiration');
      // Only clear token and redirect if it was 401 (unauthenticated)
      if (error.response.status === 401) {
        localStorage.removeItem('ph_sports_access_token');
        // Force redirect to login page if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
