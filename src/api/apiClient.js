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
    // Always get the freshest token from localStorage
    const token = localStorage.getItem('ph_sports_access_token');
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
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        console.error('Unauthorized: Session might have expired or been cleared.');
        localStorage.removeItem('ph_sports_access_token');
      } else if (status === 403) {
        console.error('Forbidden: You do not have permission for this action.');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
