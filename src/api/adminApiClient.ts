import axios from 'axios';
import { adminAuthStorage } from './adminAuthStorage';

const adminApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  headers: { 'Content-Type': 'application/json' },
});

adminApiClient.interceptors.request.use((config) => {
  const token = adminAuthStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      adminAuthStorage.clearSession();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default adminApiClient;
