import { useAuthStore } from '../stores/authStore.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Get auth token from store
 */
const getAuthToken = () => {
  const { token } = useAuthStore.getState();
  return token;
};

/**
 * Make authenticated fetch call
 */
export const authFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  let headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

/**
 * Cart-specific API functions
 */
export const cartApi = {
  fetchCart: () => authFetch('/checkout/cart'),
  updateQuantity: (itemId, quantity) => 
    authFetch(`/checkout/cart/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity })
    }),
  removeItem: (itemId) => 
    authFetch(`/checkout/cart/${itemId}`, { method: 'DELETE' }),
  addItem: (productId, quantity = 1) => 
    authFetch('/checkout/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    }),
};

