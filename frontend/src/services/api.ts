import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Problems API
export const problemsApi = {
  getAll: (params?: { page?: number; limit?: number; tags?: string; difficulty?: string }) =>
    api.get('/problems', { params }),

  getById: (id: string) => api.get(`/problems/${id}`),

  getTestCases: (id: string) => api.get(`/problems/${id}/testcases`),
};

// Submissions API
export const submissionsApi = {
  create: (data: { problemId: string; language: string; code: string }) =>
    api.post('/submissions', data),

  getById: (id: string) => api.get(`/submissions/${id}`),

  getUserSubmissions: () => api.get('/submissions'),
};

// Auth API
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/login', data),

  refresh: () => api.post('/refresh'),

  logout: () => api.post('/logout'),
};

export default api;