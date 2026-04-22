import axios from 'axios';

export const TOKEN_KEY = 'ai-social-ops-admin-token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function get<T>(url: string, params?: Record<string, unknown>) {
  const response = await api.get<T>(url, { params });
  return response.data;
}

export async function post<T>(url: string, data?: unknown) {
  const response = await api.post<T>(url, data);
  return response.data;
}

export async function patch<T>(url: string, data?: unknown) {
  const response = await api.patch<T>(url, data);
  return response.data;
}
