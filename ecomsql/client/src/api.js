import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const API_BASE_URL = API_URL === '/api' ? '' : API_URL.replace('/api', '');

// Log API configuration for debugging
console.log('API_URL:', API_URL);
console.log('API_BASE_URL:', API_BASE_URL);

// Simple cache for GET requests
const responseCache = new Map();

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[API Interceptor] Auth token added to request:', {
      url: config.url,
      method: config.method,
      tokenPresent: !!token,
      tokenLength: token?.length
    });
  } else {
    console.warn('[API Interceptor] No auth token found in localStorage');
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for caching
apiClient.interceptors.response.use((response) => {
  if (response.config.method === 'get') {
    const cacheKey = `${response.config.method}:${response.config.url}`;
    responseCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
  }
  return response;
}, (error) => {
  console.error('[API] Response error:', error.message, error.response?.status);
  return Promise.reject(error);
});

// Categories
export const getCategories = () => apiClient.get('/categories');
export const getCategoryById = (id) => apiClient.get(`/categories/${id}`);
export const createCategory = (data) => apiClient.post('/categories', data);
export const updateCategory = (id, data) => apiClient.put(`/categories/${id}`, data);
export const deleteCategory = (id) => apiClient.delete(`/categories/${id}`);

// Authentication
export const registerUser = (email, password, name) => 
  apiClient.post('/auth/register', { email, password, name });

export const loginUser = (email, password) => 
  apiClient.post('/auth/login', { email, password });

export const getCurrentUser = () => 
  apiClient.get('/auth/me');

export const getUserRoles = () => 
  apiClient.get('/auth/roles');

export const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

// Admin - User & Role Management
export const getAllUsers = () => 
  apiClient.get('/auth/users');

export const getAdminUserById = (userId) => 
  apiClient.get(`/auth/users/${userId}`);

export const updateUserRole = (userId, roleId) => 
  apiClient.put(`/auth/users/${userId}/role`, { roleId });

export const getProducts = (params) => apiClient.get('/products', { params });
export const getProductById = (id) => apiClient.get(`/products/${id}`);
export const createProduct = (data) => apiClient.post('/products', data);
export const updateProduct = (id, data) => apiClient.put(`/products/${id}`, data);
export const deleteProduct = (id) => apiClient.delete(`/products/${id}`);

// Product Images
export const getProductImages = (productId) => apiClient.get(`/product-images/product/${productId}`);

export const getPrimaryImage = (productId) => apiClient.get(`/product-images/primary/${productId}`);

export const uploadProductImage = (productId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return apiClient.post(`/product-images/upload/${productId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const uploadProductImages = (productId, files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });
  return apiClient.post(`/product-images/bulk-upload/${productId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const deleteProductImage = (imageId) => apiClient.delete(`/product-images/${imageId}`);

export const setProductImagePrimary = (imageId) => apiClient.put(`/product-images/${imageId}/set-primary`);

export const reorderProductImages = (productId, imageOrder) => 
  apiClient.put(`/product-images/reorder/${productId}`, { imageOrder });


// Cart
export const getCartItems = (sessionId) => apiClient.get(`/cart/${sessionId}`);
export const addToCart = (data) => apiClient.post('/cart', data);
export const updateCartItem = (itemId, data) => apiClient.put(`/cart/${itemId}`, data);
export const removeFromCart = (itemId) => apiClient.delete(`/cart/${itemId}`);
export const clearCart = (sessionId) => apiClient.delete(`/cart/session/${sessionId}`);

// Orders
export const getOrders = () => apiClient.get('/orders');
export const getSellerOrders = () => apiClient.get('/orders/seller/orders');
export const getOrderById = (id) => apiClient.get(`/orders/${id}`);
export const createOrder = (data) => apiClient.post('/orders', data);
export const updateOrderStatus = (id, data) => apiClient.put(`/orders/${id}`, data);

export { API_BASE_URL };
