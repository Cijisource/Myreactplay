import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const API_BASE_URL = API_URL === '/api' ? '' : API_URL.replace('/api', '');

// Log API configuration for debugging
console.log('API_URL:', API_URL);
console.log('API_BASE_URL:', API_BASE_URL);

// Simple cache for GET requests
const responseCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
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
});

// Categories
export const getCategories = () => apiClient.get('/categories');
export const getCategoryById = (id) => apiClient.get(`/categories/${id}`);
export const createCategory = (data) => apiClient.post('/categories', data);
export const updateCategory = (id, data) => apiClient.put(`/categories/${id}`, data);
export const deleteCategory = (id) => apiClient.delete(`/categories/${id}`);

// Products
export const getProducts = (params) => apiClient.get('/products', { params });
export const getProductById = (id) => apiClient.get(`/products/${id}`);
export const createProduct = (data) => apiClient.post('/products', data);
export const updateProduct = (id, data) => apiClient.put(`/products/${id}`, data);
export const deleteProduct = (id) => apiClient.delete(`/products/${id}`);

// Product Images
export const getProductImages = (productId) => apiClient.get(`/product-images/product/${productId}`);
export const uploadProductImage = (productId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return apiClient.post(`/product-images/upload/${productId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const deleteProductImage = (imageId) => apiClient.delete(`/product-images/${imageId}`);

// Cart
export const getCartItems = (sessionId) => apiClient.get(`/cart/${sessionId}`);
export const addToCart = (data) => apiClient.post('/cart', data);
export const updateCartItem = (itemId, data) => apiClient.put(`/cart/${itemId}`, data);
export const removeFromCart = (itemId) => apiClient.delete(`/cart/${itemId}`);
export const clearCart = (sessionId) => apiClient.delete(`/cart/session/${sessionId}`);

// Orders
export const getOrders = () => apiClient.get('/orders');
export const getOrderById = (id) => apiClient.get(`/orders/${id}`);
export const createOrder = (data) => apiClient.post('/orders', data);
export const updateOrderStatus = (id, data) => apiClient.put(`/orders/${id}`, data);

export { API_BASE_URL };
