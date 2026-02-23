import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/apisdd';

// Log API configuration
console.log('[API Config]', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  resolved_API_URL: API_URL,
  env_mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
});

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  getHealth: () => api.get('/health'),
  getDatabaseStatus: () => api.get('/database/status'),
  getTables: () => api.get('/tables'),
  
  // Rental Collection APIs
  getRentalSummary: () => api.get('/rental/summary'),
  getUnpaidTenants: () => api.get('/rental/unpaid-tenants'),
  getUnpaidDetails: (month: string) => api.get(`/rental/unpaid-details/${month}`),
  
  // Diagnostic APIs
  getRentalSchema: () => api.get('/diagnostic/rental-schema'),
  getRentalSample: () => api.get('/diagnostic/rental-sample'),
};

export default api;
