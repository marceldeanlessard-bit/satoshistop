import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      refreshToken: null,

      initializeAuth: async () => {
        const token = localStorage.getItem('satoshi_token');
        const refreshToken = localStorage.getItem('satoshi_refresh_token');

        if (token && refreshToken) {
          try {
            // Verify token and load user profile
            const response = await fetch(`${API_BASE}/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const userData = await response.json();
              set({
                user: userData,
                isAuthenticated: true,
                token,
                refreshToken,
              });
            } else {
              // Token invalid, try refresh
              await get().refreshToken();
            }
          } catch (error) {
            console.error('Auth initialization failed:', error);
            get().logout();
          }
        }
      },

      login: async (credentials) => {
        try {
          const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          if (response.ok) {
            const { user, token, refreshToken } = await response.json();

            localStorage.setItem('satoshi_token', token);
            localStorage.setItem('satoshi_refresh_token', refreshToken);

            set({
              user,
              isAuthenticated: true,
              token,
              refreshToken,
            });

            return { success: true };
          } else {
            const error = await response.json();
            return { success: false, error: error.message };
          }
        } catch (error) {
          return { success: false, error: 'Network error' };
        }
      },

      register: async (userData) => {
        try {
          const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          if (response.ok) {
            const { user, token, refreshToken } = await response.json();

            localStorage.setItem('satoshi_token', token);
            localStorage.setItem('satoshi_refresh_token', refreshToken);

            set({
              user,
              isAuthenticated: true,
              token,
              refreshToken,
            });

            return { success: true };
          } else {
            const error = await response.json();
            return { success: false, error: error.message };
          }
        } catch (error) {
          return { success: false, error: 'Network error' };
        }
      },

      logout: () => {
        localStorage.removeItem('satoshi_token');
        localStorage.removeItem('satoshi_refresh_token');

        set({
          user: null,
          isAuthenticated: false,
          token: null,
          refreshToken: null,
        });
      },

      refreshToken: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) return false;

        try {
          const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            const { token: newToken, refreshToken: newRefreshToken } = await response.json();

            localStorage.setItem('satoshi_token', newToken);
            localStorage.setItem('satoshi_refresh_token', newRefreshToken);

            set({
              token: newToken,
              refreshToken: newRefreshToken,
            });

            return true;
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }

        get().logout();
        return false;
      },

      updateProfile: (updates) => {
        set((state) => ({
          user: { ...state.user, ...updates },
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);