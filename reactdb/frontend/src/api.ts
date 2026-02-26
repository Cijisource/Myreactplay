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

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  getHealth: () => api.get('/health'),
  getDatabaseStatus: () => api.get('/database/status'),
  getTables: () => api.get('/tables'),
  
  // Authentication APIs
  login: (username: string, password: string) => 
    api.post('/auth/login', { username, password }),
  
  // Tenant Management APIs
  getAllTenantsWithOccupancy: () => api.get('/tenants/with-occupancy'),
  getTenantById: (tenantId: number) => api.get(`/tenants/${tenantId}`),
  createTenant: (data: any) => api.post('/tenants', data),
  updateTenant: (tenantId: number, data: any) => api.put(`/tenants/${tenantId}`, data),
  deleteTenant: (tenantId: number) => api.delete(`/tenants/${tenantId}`),
  searchTenants: (field: string, query: string) => 
    api.get(`/tenants/search?field=${field}&query=${query}`),
  
  // Rental Collection APIs
  getRentalSummary: () => api.get('/rental/summary'),
  getUnpaidTenants: () => api.get('/rental/unpaid-tenants'),
  getUnpaidDetails: (month: string) => api.get(`/rental/unpaid-details/${month}`),
  getPaymentsByMonth: (monthYear: string) => api.get(`/rental/payments/${monthYear}`),
  
  // Room Occupancy APIs
  getRoomOccupancyData: () => api.get('/rooms/occupancy'),
  getOccupancyLinks: () => api.get('/occupancy/links'),  // Explicit room-tenant linking
  
  // Complaints Management APIs
  getComplaints: () => api.get('/complaints'),
  getComplaintTypes: () => api.get('/complaints/types'),
  getComplaintStatuses: () => api.get('/complaints/statuses'),
  createComplaint: (data: any) => api.post('/complaints', data),
  updateComplaint: (complaintId: number, data: any) => api.put(`/complaints/${complaintId}`, data),
  deleteComplaint: (complaintId: number) => api.delete(`/complaints/${complaintId}`),
  getRooms: () => api.get('/rooms'),

  // Service Details APIs
  getServiceDetails: () => api.get('/services/details'),
  getServiceDetailById: (serviceId: number) => api.get(`/services/details/${serviceId}`),
  createServiceDetail: (data: any) => api.post('/services/details', data),
  updateServiceDetail: (serviceId: number, data: any) => api.put(`/services/details/${serviceId}`, data),
  deleteServiceDetail: (serviceId: number) => api.delete(`/services/details/${serviceId}`),
  searchServiceDetails: (field: string, query: string) => 
    api.get(`/services/details/search?field=${field}&query=${query}`),

  // EB Service Payments APIs
  getEBServicePayments: () => api.get('/services/payments'),
  getEBServicePaymentById: (paymentId: number) => api.get(`/services/payments/${paymentId}`),
  createEBServicePayment: (data: any) => api.post('/services/payments', data),
  updateEBServicePayment: (paymentId: number, data: any) => api.put(`/services/payments/${paymentId}`, data),
  deleteEBServicePayment: (paymentId: number) => api.delete(`/services/payments/${paymentId}`),
  searchEBServicePayments: (field: string, query: string) => 
    api.get(`/services/payments/search?field=${field}&query=${query}`),
  
  // User Management APIs
  getUsers: () => api.get('/users'),
  getUserById: (userId: number) => api.get(`/users/${userId}`),
  createUser: (data: any) => api.post('/users', data),
  updateUser: (userId: number, data: any) => api.put(`/users/${userId}`, data),
  deleteUser: (userId: number) => api.delete(`/users/${userId}`),
  
  // User Role APIs
  getUserRoles: () => api.get('/user-roles'),
  createUserRole: (data: any) => api.post('/user-roles', data),
  deleteUserRole: (userRoleId: number) => api.delete(`/user-roles/${userRoleId}`),
  
  // Role Detail APIs
  getRoleDetails: () => api.get('/roles'),
  getRoleDetailById: (roleId: number) => api.get(`/roles/${roleId}`),
  createRoleDetail: (data: any) => api.post('/roles', data),
  updateRoleDetail: (roleId: number, data: any) => api.put(`/roles/${roleId}`, data),
  deleteRoleDetail: (roleId: number) => api.delete(`/roles/${roleId}`),

  // Transaction APIs
  getTransactions: () => api.get('/transactions'),
  getTransactionById: (transactionId: number) => api.get(`/transactions/${transactionId}`),
  createTransaction: (data: any) => api.post('/transactions', data),
  updateTransaction: (transactionId: number, data: any) => api.put(`/transactions/${transactionId}`, data),
  deleteTransaction: (transactionId: number) => api.delete(`/transactions/${transactionId}`),
  getTransactionTypes: () => api.get('/transaction-types'),

  // Stock Management APIs
  getStockDetails: () => api.get('/stock'),
  getStockById: (stockId: number) => api.get(`/stock/${stockId}`),
  createStock: (data: any) => api.post('/stock', data),
  updateStock: (stockId: number, data: any) => api.put(`/stock/${stockId}`, data),
  deleteStock: (stockId: number) => api.delete(`/stock/${stockId}`),

  // Daily Room Status APIs
  getDailyStatuses: () => api.get('/daily-status'),
  getDailyStatusById: (statusId: number) => api.get(`/daily-status/${statusId}`),
  createDailyStatus: (data: any) => api.post('/daily-status', data),
  updateDailyStatus: (statusId: number, data: any) => api.put(`/daily-status/${statusId}`, data),
  deleteDailyStatus: (statusId: number) => api.delete(`/daily-status/${statusId}`),

  // Service Room Allocation APIs
  getServiceAllocations: () => api.get('/service-allocations'),
  getServiceAllocationById: (allocationId: number) => api.get(`/service-allocations/${allocationId}`),
  createServiceAllocation: (data: any) => api.post('/service-allocations', data),
  updateServiceAllocation: (allocationId: number, data: any) => api.put(`/service-allocations/${allocationId}`, data),
  deleteServiceAllocation: (allocationId: number) => api.delete(`/service-allocations/${allocationId}`),
  
  // Diagnostic APIs
  getRentalSchema: () => api.get('/diagnostic/rental-schema'),
  getRentalSample: () => api.get('/diagnostic/rental-sample'),
};

// Helper functions
export const login = async (username: string, password: string) => {
  const response = await apiService.login(username, password);
  return response.data;
};

export const getRoomOccupancyData = async () => {
  const response = await apiService.getRoomOccupancyData();
  return response.data;
};

export const getOccupancyLinks = async () => {
  const response = await apiService.getOccupancyLinks();
  return response.data;
};

export const getComplaints = async () => {
  const response = await apiService.getComplaints();
  return response.data;
};

export const getComplaintTypes = async () => {
  const response = await apiService.getComplaintTypes();
  return response.data;
};

export const getComplaintStatuses = async () => {
  const response = await apiService.getComplaintStatuses();
  return response.data;
};

export const getRooms = async () => {
  const response = await apiService.getRooms();
  return response.data;
};

export default api;
