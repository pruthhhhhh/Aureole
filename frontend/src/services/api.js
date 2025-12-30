/**
 * API Service
 * Handles all API calls to the backend
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
  maxContentLength: 10000000,
  maxBodyLength: 10000000,
});

// Request interceptor (for adding auth tokens)
api.interceptors.request.use(
  (config) => {
    // Only add token if it exists and is not too large
    const token = localStorage.getItem('token');
    if (token && token.length < 1000) { // Prevent huge tokens
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Remove any unnecessary headers that might be too large
    delete config.headers['X-Requested-With'];
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (for error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Order API
 */
export const orderAPI = {
  // Create order
  createOrder: async (amount, sprays = 1, perfumeId, perfumeName = '', email = '', contact = '') => {
    const response = await api.post('/create-order', {
      amount,
      sprays,
      perfumeId,
      perfumeName,
      email,
      contact,
    });
    return response.data;
  },

  // Cash payment (testing only)
  cashPayment: async (amount, sprays = 1, perfumeId, perfumeName = '') => {
    // Ensure we send clean numeric values
    const payload = {
      amount: Number(amount),
      sprays: Number(sprays) || 1,
      perfumeId: Number(perfumeId),
      perfumeName: perfumeName || '',
    };
    console.log('Cash payment API call - payload:', payload);
    const response = await api.post('/cash-payment', payload);
    return response.data;
  },

  // Verify payment
  verifyPayment: async (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    const response = await api.post('/verify-payment', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    return response.data;
  },

  // Get order status
  getStatus: async (orderId) => {
    const response = await api.get(`/get-status/${orderId}`);
    return response.data;
  },

  // Trigger dispense
  triggerDispense: async (orderId = null) => {
    try {
      const payload = orderId ? { orderId } : {};
      console.log('API: Triggering dispense with payload:', payload);

      const response = await api.post('/trigger-dispense', payload);
      console.log('API: Trigger dispense response:', response.data);

      if (response.data && response.data.success === false) {
        throw new Error(response.data.message || 'Failed to trigger dispense');
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error triggering dispense:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        throw new Error(error.response.data?.message || error.response.data?.error || 'Failed to trigger dispense');
      }
      throw error;
    }
  },

  // Confirm dispense
  confirmDispense: async (orderId, status = 'success', message = 'Dispense completed') => {
    try {
      const response = await api.post('/confirm-dispense', {
        orderId,
        status,
        message,
      });
      console.log('✅ Confirm dispense response:', response.data);
      return response.data;
    } catch (err) {
      console.error('❌ Confirm dispense error:', err.response?.data || err.message);
      throw err;
    }
  },
};

/**
 * System API
 */
export const systemAPI = {
  // Get system status
  getStatus: async () => {
    const response = await api.get('/system/status');
    return response.data;
  },

  // Update system status
  updateStatus: async (machineStatus, perfumeLevel, perfumeLevels = null) => {
    const payload = { machineStatus, perfumeLevel };
    if (perfumeLevels) {
      payload.perfumeLevels = perfumeLevels;
    }
    const response = await api.put('/system/status', payload);
    return response.data;
  },

  // Update individual perfume level (only updates the specified perfume)
  updatePerfumeLevel: async (perfumeId, level) => {
    try {
      // Ensure perfumeId is a string for consistency
      const perfumeIdStr = perfumeId.toString();
      const levelNum = Number(level);

      if (isNaN(levelNum) || levelNum < 0 || levelNum > 100) {
        throw new Error(`Invalid level: ${level}. Must be between 0 and 100.`);
      }

      console.log(`API: Updating ONLY perfume ${perfumeIdStr} to ${levelNum}%`);

      // Only send the specific perfume ID and level - no other perfumes
      const payload = {
        perfumeLevels: { [perfumeIdStr]: levelNum },
      };

      console.log(`API: Payload being sent:`, JSON.stringify(payload));

      const response = await api.put('/system/status', payload);

      console.log(`API: Response received for perfume ${perfumeIdStr}:`, response.data);

      if (response.data && response.data.success === false) {
        throw new Error(response.data.message || 'Failed to update perfume level');
      }

      return response.data;
    } catch (error) {
      console.error(`❌ Error updating perfume ${perfumeId} level:`, error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        throw new Error(error.response.data?.message || error.response.data?.error || 'Failed to update perfume level');
      }
      throw error;
    }
  },

  // Get statistics
  getStatistics: async () => {
    const response = await api.get('/system/statistics');
    return response.data;
  },

  // Get recent orders
  getRecentOrders: async (limit = 50) => {
    const response = await api.get(`/system/orders?limit=${limit}`);
    return response.data;
  },

  // Clear all orders
  clearAllOrders: async () => {
    const response = await api.delete('/system/clear-orders');
    return response.data;
  },
};

/**
 * Auth API
 */
export const authAPI = {
  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Verify token
  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

export default api;

