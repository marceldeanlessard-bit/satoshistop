import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartApi } from '../api/cartApi.js';
import { useAuthStore } from './authStore.js';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      summary: { subtotal: 0, shipping: 0, tax: 0, total: 0 },
      isLoading: false,
      error: null,

      fetchCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartApi.fetchCart();
          set({ 
            items: cart.items || [],
            summary: cart.summary || { subtotal: 0, shipping: 0, tax: 0, total: 0 }
          });
        } catch (err) {
          set({ error: err.message });
          console.error('Failed to fetch cart:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (itemId, quantity) => {
        if (quantity < 1) return; // Prevent invalid quantity

        // Optimistic update
        set((state) => {
          const items = state.items.map(i => 
            i.id === itemId ? { ...i, quantity } : i
          );
          return { 
            items,
            summary: calculateSummary(items)
          };
        });

        try {
          await cartApi.updateQuantity(itemId, quantity);
          await get().fetchCart(); // Re-fetch for server state
        } catch (err) {
          // Rollback on error
          await get().fetchCart();
          console.error('Failed to update quantity:', err);
        }
      },

      removeItem: async (itemId) => {
        // Optimistic update
        set((state) => {
          const items = state.items.filter(i => i.id !== itemId);
          return { 
            items,
            summary: calculateSummary(items)
          };
        });

        try {
          await cartApi.removeItem(itemId);
          await get().fetchCart();
        } catch (err) {
          await get().fetchCart();
          console.error('Failed to remove item:', err);
        }
      },

      addItem: async (productId, quantity = 1) => {
        set({ isLoading: true });
        try {
          await cartApi.addItem(productId, quantity);
          await get().fetchCart();
        } catch (err) {
          console.error('Add to cart failed:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: async () => {
        const itemIds = get().items.map(item => item.id);
        for (const itemId of itemIds) {
          await get().removeItem(itemId);
        }
      }
    }),
    {
      name: 'satoshi-stop-cart',
      partialize: (state) => ({ items: state.items, summary: state.summary }),
    }
  )
);

// Helper to calculate summary client-side
const calculateSummary = (items) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return {
    subtotal: Math.round(subtotal * 10000) / 10000,
    shipping: 0,
    tax: 0,
    total: subtotal
  };
};

