import axios from 'axios';
import { appParams } from '@/lib/app-params';

// Mock API responses for static mode
const mockApi = {
  get: (url) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (url === '/auth/me') {
          const token = localStorage.getItem('ph_sports_access_token');
          if (token) {
            resolve({
              data: {
                id: 1,
                email: 'demo@sportsync.edu',
                name: 'Demo User',
                role: 'admin',
                profile_complete: true,
                teacher_status: 'approved'
              }
            });
          } else {
            resolve({ data: null });
          }
        } else {
          resolve({ data: [] });
        }
      }, 500);
    });
  },
  post: (url, data) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (url === '/auth/login') {
          resolve({
            data: {
              token: 'mock-token-' + Date.now(),
              user: {
                id: 1,
                email: data.email,
                name: 'Demo User',
                role: 'admin',
                profile_complete: true
              }
            }
          });
        } else if (url === '/auth/register') {
          resolve({
            data: {
              success: true,
              message: 'Registration successful'
            }
          });
        } else {
          resolve({ data: { success: true } });
        }
      }, 500);
    });
  },
  patch: (url, data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: { ...data, success: true } });
      }, 500);
    });
  },
  delete: (url) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: { success: true } });
      }, 500);
    });
  }
};

const apiClient = import.meta.env.MODE === 'production' ? mockApi : axios.create({
  baseURL: appParams.apiBaseUrl || 'http://localhost:8788/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token (only for non-mock API)
if (import.meta.env.MODE !== 'production') {
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
}

// Response interceptor for handling common errors (only for non-mock API)
if (import.meta.env.MODE !== 'production') {
  apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        // Handle unauthorized access (e.g., redirect to login)
        console.error('Unauthorized access - potential token expiration');
      }
      return Promise.reject(error);
    }
  );
}

export default apiClient;
