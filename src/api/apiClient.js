import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'X-PH-Sports-Request': '1',
  },
});

apiClient.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
      window.dispatchEvent(new Event('ph-sports:session-expired'));
    }
    return Promise.reject(error);
  },
);

export default apiClient;
