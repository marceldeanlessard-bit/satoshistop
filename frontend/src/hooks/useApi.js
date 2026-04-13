import { useCallback } from 'react';
import { useAuthStore } from '../store/store';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Custom hook for making authenticated API calls
 */
export const useApi = () => {
  const { token, logout, setToken, refreshToken } = useAuthStore();

  const authFetch = useCallback(
    async (endpoint, options = {}) => {
      let headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle token refresh on 401
      if (response.status === 401 && refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const { token: newToken, refreshToken: newRefreshToken } = await refreshResponse.json();
            setToken(newToken);
            // Retry original request with new token
            headers.Authorization = `Bearer ${newToken}`;
            response = await fetch(`${API_BASE}${endpoint}`, {
              ...options,
              headers,
            });
          } else {
            logout();
            throw new Error('Session expired');
          }
        } catch (error) {
          logout();
          throw error;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    [token, refreshToken, logout, setToken]
  );

  return { authFetch };
};

/**
 * Hook for fetching products
 */
export const useProducts = () => {
  const { authFetch } = useApi();

  return {
    fetchProducts: useCallback(
      (filters = {}) =>
        authFetch('/products', {
          method: 'GET',
          ...(filters && { query: new URLSearchParams(filters).toString() }),
        }),
      [authFetch]
    ),

    fetchProductById: useCallback(
      (id) => authFetch(`/products/${id}`),
      [authFetch]
    ),

    createProduct: useCallback(
      (data) =>
        authFetch('/products', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      [authFetch]
    ),

    updateProduct: useCallback(
      (id, data) =>
        authFetch(`/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      [authFetch]
    ),

    deleteProduct: useCallback(
      (id) =>
        authFetch(`/products/${id}`, {
          method: 'DELETE',
        }),
      [authFetch]
    ),
  };
};

/**
 * Hook for managing orders
 */
export const useOrders = () => {
  const { authFetch } = useApi();

  return {
    fetchOrders: useCallback(
      () => authFetch('/orders'),
      [authFetch]
    ),

    fetchOrderById: useCallback(
      (id) => authFetch(`/orders/${id}`),
      [authFetch]
    ),

    createOrder: useCallback(
      (data) =>
        authFetch('/orders', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      [authFetch]
    ),

    updateOrderStatus: useCallback(
      (id, status) =>
        authFetch(`/orders/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),
      [authFetch]
    ),
  };
};

/**
 * Hook for user authentication
 */
export const useAuth = () => {
  const { authFetch } = useApi();

  return {
    register: useCallback(
      (data) =>
        fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then((res) => res.json()),
      []
    ),

    login: useCallback(
      (data) =>
        fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then((res) => res.json()),
      []
    ),

    walletConnect: useCallback(
      (walletAddress) =>
        fetch(`${API_BASE}/auth/wallet-challenge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        }).then((res) => res.json()),
      []
    ),
  };
};

/**
 * Hook for user profile
 */
export const useProfile = () => {
  const { authFetch } = useApi();

  return {
    fetchProfile: useCallback(
      () => authFetch('/profile'),
      [authFetch]
    ),

    updateProfile: useCallback(
      (data) =>
        authFetch('/profile', {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      [authFetch]
    ),

    fetchStoreProfile: useCallback(
      (sellerId) => authFetch(`/profile/store/${sellerId}`),
      [authFetch]
    ),
  };
};

/**
 * Hook for messaging
 */
export const useMessages = () => {
  const { authFetch } = useApi();

  return {
    fetchThreads: useCallback(
      () => authFetch('/messages/threads'),
      [authFetch]
    ),

    fetchMessages: useCallback(
      (threadId) => authFetch(`/messages/thread/${threadId}`),
      [authFetch]
    ),

    sendMessage: useCallback(
      (data) =>
        authFetch('/messages', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      [authFetch]
    ),
  };
};

/**
 * Hook for checkout
 */
export const useCheckout = () => {
  const { authFetch } = useApi();

  return {
    createCheckoutSession: useCallback(
      (data) =>
        authFetch('/checkout/session', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      [authFetch]
    ),

    processPayment: useCallback(
      (sessionId, paymentData) =>
        authFetch(`/checkout/session/${sessionId}/pay`, {
          method: 'POST',
          body: JSON.stringify(paymentData),
        }),
      [authFetch]
    ),
  };
};
