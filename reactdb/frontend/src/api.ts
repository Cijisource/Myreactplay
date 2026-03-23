import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://mansion.gnanabi.info/api';

// Interface for upload response
interface UploadResponse {
  photoUrls?: string[];
  proofUrls?: string[];
  [key: string]: any;
}

interface ApiUploadResponse {
  data: UploadResponse;
}

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

// Get the base API URL for file serving
const getApiBaseUrl = (): string => {
  if (!API_URL) return window.location.origin;
  
  // If API_URL is absolute, extract the base
  if (API_URL.startsWith('http://') || API_URL.startsWith('https://')) {
    const base = API_URL.replace(/\/api\/?$/, ''); // Remove /api suffix
    // console.log('[File URL] Using absolute API base:', base);
    return base;
  }
  
  // If API_URL is relative, use the current origin
  // console.log('[File URL] Using relative API, origin:', window.location.origin);
  return window.location.origin;
};

// Helper function to construct file URLs
export const getFileUrl = (filePath: string): string => {
  if (!filePath) return '';
  
  // If it's already an absolute URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    // console.log('[File URL] Already absolute:', filePath);
    return filePath;
  }
  
  // If it's a path with /, use the API base URL
  if (filePath.startsWith('/')) {
    const baseUrl = getApiBaseUrl();
    const fullUrl = `${baseUrl}${filePath}`;
    // console.log('[File URL] Constructed URL from path:', { filePath, baseUrl, fullUrl });
    return fullUrl;
  }
  
  // Check if the path contains tenantphotos
  if (filePath.includes('tenantphotos')) {
    const baseUrl = getApiBaseUrl();
    const fullUrl = `${baseUrl}/api/${filePath}`;
    // console.log('[File URL] Constructed URL from tenantphotos path:', { filePath, baseUrl, fullUrl });
    return fullUrl;
  }
  
  // For plain filenames, prepend the API tenantphotos path
  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}/api/tenantphotos/${filePath}`;
  // console.log('[File URL] Constructed URL from filename:', { filePath, baseUrl, fullUrl });
  return fullUrl;
};

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
  checkPhoneNumber: (phone: string, excludeTenantId?: number) => {
    let url = `/tenants/check-phone/${encodeURIComponent(phone)}`;
    if (excludeTenantId) {
      url += `?excludeId=${excludeTenantId}`;
    }
    return api.get(url);
  },
  searchCities: (query: string) => 
    api.get(`/cities/search?query=${encodeURIComponent(query)}`),
  uploadTenantFiles: (formData: FormData, onProgress?: (progress: number) => void): Promise<ApiUploadResponse> => {
    const token = localStorage.getItem('authToken');

    console.log('[Tenant Upload] Starting multi-file upload');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            console.log('[Tenant Upload] Progress:', percentComplete + '%');
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log('[Tenant Upload] Response data:', data);
            resolve({ data });
          } catch (e) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed - network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });

      xhr.open('POST', `${API_URL}/tenants/upload`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  },
  
  // Rental Collection APIs
  getRentalSummary: () => api.get('/rental/summary'),
  getUnpaidTenants: () => api.get('/rental/unpaid-tenants'),
  getUnpaidDetails: (month: string) => api.get(`/rental/unpaid-details/${month}`),
  getPaymentsByMonth: (monthYear: string) => api.get(`/rental/payments/${monthYear}`),
  getRentalCollectionByOccupancy: (occupancyId: number) => api.get(`/rental/occupancy/${occupancyId}`),
  getRentalSummaryByOccupancy: (occupancyId: number) => api.get(`/rental/occupancy/${occupancyId}/summary`),
  getPaymentBalance: () => api.get('/rental/payment-balance'),
  updateRentalPayment: (occupancyId: number, data: { collectedAmount: number; month: string }) => 
    api.put(`/rental/payment/${occupancyId}`, data),
  updateRentalRecord: (recordId: number, data: any) => 
    api.put(`/rental/record/${recordId}`, data),
  uploadPaymentScreenshot: (formData: FormData, onProgress?: (progress: number) => void) => {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('authToken');
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            console.log(`[Payment Upload] Progress: ${percentComplete}%`);
            onProgress(percentComplete);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        console.log('[Payment Upload] Upload completed, status:', xhr.status);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('[Payment Upload] Response data:', response);
            resolve({ data: response });
          } catch (error) {
            console.error('[Payment Upload] Error parsing response:', error);
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        console.error('[Payment Upload] Network error during upload');
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        console.log('[Payment Upload] Upload aborted');
        reject(new Error('Upload was aborted'));
      });

      // Setup request
      xhr.open('POST', `${API_URL}/rental/upload-payment`, true);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      console.log('[Payment Upload] Starting payment screenshot upload');
      xhr.send(formData);
    });
  },
  
  // Room Occupancy APIs
  getRoomOccupancyData: () => api.get('/rooms/occupancy'),
  getOccupancyLinks: () => api.get('/occupancy/links'),  // Explicit room-tenant linking
  getVacantRooms: () => api.get('/rooms/vacant'),  // Get list of vacant rooms
  checkoutOccupancy: (occupancyId: number, checkOutDate: string, depositRefunded?: number, charges?: number) => 
    api.post(`/occupancy/${occupancyId}/checkout`, { checkOutDate, depositRefunded, charges }),
  checkInTenant: (tenantId: number, roomId: number, checkInDate: string, checkOutDate: string, rentFixed: number, depositReceived?: number) =>
    api.post('/occupancy/checkin', { tenantId, roomId, checkInDate, checkOutDate, rentFixed, depositReceived }),
  getRooms: () => api.get('/rooms'),
  
  // Complaints Management APIs
  getComplaints: () => api.get('/complaints'),
  getComplaintTypes: () => api.get('/complaints/types'),
  getComplaintStatuses: () => api.get('/complaints/statuses'),
  createComplaint: (data: any) => api.post('/complaints', data),
  updateComplaint: (complaintId: number, data: any) => api.put(`/complaints/${complaintId}`, data),
  deleteComplaint: (complaintId: number) => api.delete(`/complaints/${complaintId}`),
  uploadComplaintFiles: (formData: FormData) => {
    // Use fetch instead of axios for FormData to avoid header issues
    const token = localStorage.getItem('authToken');
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    // Remove Content-Type header - browser will set it with boundary for FormData
    console.log('[Upload] Starting file upload with FormData');
    
    return fetch(`${API_URL}/complaints/upload`, {
      method: 'POST',
      headers: headers,
      body: formData
    })
    .then(response => {
      console.log('[Upload] Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('[Upload] Response data:', data);
      return { data };
    })
    .catch(error => {
      console.error('[Upload] Error:', error);
      throw error;
    });
  },
  updateRoom: (roomId: number, data: { rent: number }) => api.put(`/rooms/${roomId}`, data),

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
  getDailyStatusMedia: (statusId: number) => api.get(`/daily-status/${statusId}/media`),
  getDailyStatusAllMedia: () => api.get('/all-media/'), // New endpoint to fetch all media files
  uploadDailyStatusMedia: (formData: FormData, onProgress?: (progress: number) => void) => {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('authToken');
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            console.log(`[Upload] Progress: ${percentComplete}%`);
            onProgress(percentComplete);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        console.log('[Upload] Upload completed, status:', xhr.status);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('[Upload] Response data:', response);
            resolve({ data: response });
          } catch (error) {
            console.error('[Upload] Error parsing response:', error);
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        console.error('[Upload] Network error during upload');
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        console.log('[Upload] Upload aborted');
        reject(new Error('Upload was aborted'));
      });

      // Setup request
      xhr.open('POST', `${API_URL}/daily-status/upload`, true);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      console.log('[Upload] Starting daily status media upload');
      xhr.send(formData);
    });
  },
  deleteDailyStatusMedia: (mediaId: number) => api.delete(`/daily-status/media/${mediaId}`),

  // Service Room Allocation APIs
  getServiceAllocations: () => api.get('/service-allocations'),
  getServiceAllocationById: (allocationId: number) => api.get(`/service-allocations/${allocationId}`),
  getServiceAllocationsWithPayments: () => api.get('/service-allocations-with-payments'),
  getServiceAllocationsForReading: () => api.get('/service-allocations-for-reading'),
  createServiceAllocation: (data: any) => api.post('/service-allocations', data),
  updateServiceAllocation: (allocationId: number, data: any) => api.put(`/service-allocations/${allocationId}`, data),
  deleteServiceAllocation: (allocationId: number) => api.delete(`/service-allocations/${allocationId}`),

  // Service Consumption APIs
  getServiceConsumption: (filters?: any) => {
    const params = new URLSearchParams();
    if (filters?.serviceAllocId) params.append('serviceAllocId', filters.serviceAllocId);
    if (filters?.roomId) params.append('roomId', filters.roomId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    return api.get(`/service-consumption${params.toString() ? '?' + params.toString() : ''}`);
  },
  getServiceConsumptionById: (consumptionId: number) => api.get(`/service-consumption/${consumptionId}`),
  getPreviousMonthEndingReading: (serviceAllocId: number, month: number, year: number) =>
    api.get(`/service-consumption/previous-month-reading/${serviceAllocId}/${month}/${year}`),
  createServiceConsumption: (data: any) => api.post('/service-consumption', data),
  deleteServiceConsumption: (consumptionId: number) => api.delete(`/service-consumption/${consumptionId}`),
  
  // Tenant Service Charges (Pro-Rata Electricity Distribution) APIs
  calculateProRataCharges: (serviceConsumptionId: number, chargePerUnit: number = 15) =>
    api.post(`/tenant-service-charges/calculate/${serviceConsumptionId}`, { chargePerUnit }),
  getTenantChargesForMonth: (billingYear: number, billingMonth: number, tenantId?: number, roomId?: number) => {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenantId', tenantId.toString());
    if (roomId) params.append('roomId', roomId.toString());
    return api.get(`/tenant-service-charges/${billingYear}/${billingMonth}${params.toString() ? '?' + params.toString() : ''}`);
  },
  getRoomBillingSummary: (billingYear: number, billingMonth: number, roomId?: number) => {
    const params = new URLSearchParams();
    if (roomId) params.append('roomId', roomId.toString());
    return api.get(`/room-billing-summary/${billingYear}/${billingMonth}${params.toString() ? '?' + params.toString() : ''}`);
  },
  getMonthlyBillingReport: (billingYear: number, billingMonth: number) =>
    api.get(`/monthly-billing-report/${billingYear}/${billingMonth}`),
  getTenantMonthlyBill: (tenantId: number) =>
    api.get(`/tenant-monthly-bill/${tenantId}`),
  recalculateMonthlyCharges: (billingYear: number, billingMonth: number, chargePerUnit: number = 15) =>
    api.post(`/tenant-service-charges/recalculate/${billingYear}/${billingMonth}`, { chargePerUnit }),
  getAllTenantServiceCharges: (filters?: any) => {
    const params = new URLSearchParams();
    if (filters?.billingYear) params.append('billingYear', filters.billingYear);
    if (filters?.billingMonth) params.append('billingMonth', filters.billingMonth);
    if (filters?.tenantId) params.append('tenantId', filters.tenantId);
    if (filters?.roomId) params.append('roomId', filters.roomId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page);
    if (filters?.limit) params.append('limit', filters.limit);
    return api.get(`/tenant-service-charges${params.toString() ? '?' + params.toString() : ''}`);
  },
  updateChargeStatus: (chargeId: number, status: string, notes?: string) =>
    api.put(`/tenant-service-charges/${chargeId}/status`, { status, notes }),
  
  // Diagnostic APIs
  getRentalSchema: () => api.get('/diagnostic/rental-schema'),
  getRentalSample: () => api.get('/diagnostic/rental-sample'),

  // Azure Blob Storage APIs
  getTenantMainPhotoFromAzure: (tenantId: number, format: 'url' | 'blob' = 'url') => 
    api.get(`/tenants/${tenantId}/main-photo/azure${format === 'url' ? '?format=url' : ''}`),
  getTenantMainPhotoUrl: (tenantId: number) => 
    api.get(`/tenants/${tenantId}/main-photo/azure?format=url`),
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
