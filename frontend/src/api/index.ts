import axios from 'axios';

// In local dev, Vite proxies /api to localhost:5000 (see vite.config.ts).
// In production (e.g. Render static site), set VITE_API_URL to the deployed
// backend URL and we'll call it directly, with /api appended.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor — add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cf_token');
      localStorage.removeItem('cf_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/auth/register', { name, email, password }),
  getMe: () => api.get('/auth/me'),
  updatePassword: (currentPassword: string, newPassword: string) => api.put('/auth/password', { currentPassword, newPassword }),
};

// Clients
export const clientApi = {
  getAll: (params?: object) => api.get('/clients', { params }),
  getOne: (id: string) => api.get(`/clients/${id}`),
  create: (data: object) => api.post('/clients', data),
  update: (id: string, data: object) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
  getHistory: (id: string) => api.get(`/clients/${id}/history`),
};

// Invoices
export const invoiceApi = {
  getAll: (params?: object) => api.get('/invoices', { params }),
  getOne: (id: string) => api.get(`/invoices/${id}`),
  create: (data: object) => api.post('/invoices', data),
  update: (id: string, data: object) => api.put(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  markPaid: (id: string) => api.patch(`/invoices/${id}/mark-paid`),
  markPending: (id: string) => api.patch(`/invoices/${id}/mark-pending`),
  downloadPDF: (id: string) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  sendEmail: (id: string) => api.post(`/invoices/${id}/send-email`),
  sendWhatsApp: (id: string) => api.post(`/invoices/${id}/send-whatsapp`),
};

// Proposals (Propelbees template-based)
export const proposalApi = {
  getAll: (params?: object) => api.get('/proposals', { params }),
  getOne: (id: string) => api.get(`/proposals/${id}`),
  create: (data: object) => api.post('/proposals', data),
  update: (id: string, data: object) => api.put(`/proposals/${id}`, data),
  delete: (id: string) => api.delete(`/proposals/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/proposals/${id}/status`, { status }),
  duplicate: (id: string) => api.post(`/proposals/${id}/duplicate`),
  downloadPPTX: (id: string) => api.get(`/proposals/${id}/pptx`, { responseType: 'blob' }),
  downloadPDF: (id: string) => api.get(`/proposals/${id}/pdf`, { responseType: 'blob' }),
};

// Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (section: string, data: object) => api.put('/settings', { section, data }),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Dashboard
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// Proposal image uploads (for the slide editor)
export const proposalImageApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/proposal-images', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
