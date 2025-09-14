import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  resetPassword: (email) => api.post('/auth/reset-password', { email }),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// User endpoints
export const users = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getDoctors: (params) => api.get('/users/doctors', { params }),
  getPatients: (params) => api.get('/users/patients', { params }),
  searchDoctors: (query) => api.get(`/users/search-doctors?query=${query}`),
};

// Consultation endpoints
export const consultations = {
  create: (data) => api.post('/consultations', data),
  getAll: (params) => api.get('/consultations', { params }),
  getById: (id) => api.get(`/consultations/${id}`),
  update: (id, data) => api.put(`/consultations/${id}`, data),
  respond: (id, response) => api.post(`/consultations/${id}/respond`, response),
  close: (id) => api.put(`/consultations/${id}/close`),
};

// Prescription endpoints
export const prescriptions = {
  create: (data) => api.post('/prescriptions', data),
  getAll: (params) => api.get('/prescriptions', { params }),
  getById: (id) => api.get(`/prescriptions/${id}`),
  update: (id, data) => api.put(`/prescriptions/${id}`, data),
  getByConsultation: (consultationId) => api.get(`/prescriptions/consultation/${consultationId}`),
};

// Notification endpoints
export const notifications = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Health metrics endpoints
export const healthMetrics = {
  create: (data) => api.post('/health-metrics', data),
  getAll: (params) => api.get('/health-metrics', { params }),
  getLatest: () => api.get('/health-metrics/latest'),
  update: (id, data) => api.put(`/health-metrics/${id}`, data),
};

// Reviews endpoints
export const reviews = {
  create: (data) => api.post('/reviews', data),
  getByDoctor: (doctorId, params) => api.get(`/reviews/doctor/${doctorId}`, { params }),
  getByPatient: (params) => api.get('/reviews/patient', { params }),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  respond: (id, response) => api.post(`/reviews/${id}/respond`, response),
};

// File upload endpoints
export const files = {
  upload: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (filename) => api.delete(`/files/${filename}`),
};

// Admin endpoints
export const admin = {
  getAnalytics: () => api.get('/admin/analytics'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

export default api;
