import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Zustand store for authentication state
 */
export const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        setUser: (user) => set({ user }),
        setToken: (token) => set({ token }),
        setRefreshToken: (refreshToken) => set({ refreshToken }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),

        login: (token, refreshToken, user) => set({
          token,
          refreshToken,
          user,
          isAuthenticated: true,
          error: null,
        }),

        logout: () => set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user,
        }),
      }
    )
  )
);

/**
 * Zustand store for products
 */
export const useProductStore = create(
  devtools((set, get) => ({
    products: [],
    filteredProducts: [],
    selectedProduct: null,
    loading: false,
    error: null,
    filters: {
      search: '',
      category: 'all',
      minPrice: 0,
      maxPrice: 10000,
      sortBy: 'name',
    },

    setProducts: (products) => set({ products }),
    setFilteredProducts: (filteredProducts) => set({ filteredProducts }),
    setSelectedProduct: (product) => set({ selectedProduct: product }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    setFilters: (filters) => set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

    applyFilters: () => {
      const { products, filters } = get();
      let filtered = products;

      if (filters.search) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            p.description.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.category !== 'all') {
        filtered = filtered.filter((p) => p.category === filters.category);
      }

      filtered = filtered.filter(
        (p) => p.price >= filters.minPrice && p.price <= filters.maxPrice
      );

      if (filters.sortBy === 'price') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (filters.sortBy === 'rating') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }

      set({ filteredProducts: filtered });
    },

    clearError: () => set({ error: null }),
  }))
);

/**
 * Zustand store for shopping cart
 */
export const useCartStore = create(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        appliedCoupon: null,
        subtotal: 0,
        discount: 0,
        total: 0,

        addToCart: (product, quantity = 1) =>
          set((state) => {
            const existingItem = state.items.find((item) => item.id === product.id);
            if (existingItem) {
              return {
                items: state.items.map((item) =>
                  item.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                ),
              };
            }
            return { items: [...state.items, { ...product, quantity }] };
          }),

        removeFromCart: (productId) =>
          set((state) => ({
            items: state.items.filter((item) => item.id !== productId),
          })),

        updateCartItem: (productId, quantity) =>
          set((state) => ({
            items: state.items.map((item) =>
              item.id === productId ? { ...item, quantity } : item
            ),
          })),

        clearCart: () => set({ items: [], appliedCoupon: null, discount: 0 }),

        applyCoupon: (coupon) =>
          set((state) => ({
            appliedCoupon: coupon,
            discount: coupon.discountAmount || 0,
          })),

        calculateTotals: () => {
          set((state) => {
            const subtotal = state.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
            return {
              subtotal,
              total: Math.max(0, subtotal - state.discount),
            };
          });
        },
      }),
      {
        name: 'cart-storage',
      }
    )
  )
);

/**
 * Zustand store for user orders
 */
export const useOrderStore = create(
  devtools((set) => ({
    orders: [],
    selectedOrder: null,
    loading: false,
    error: null,

    setOrders: (orders) => set({ orders }),
    setSelectedOrder: (order) => set({ selectedOrder: order }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    addOrder: (order) =>
      set((state) => ({
        orders: [order, ...state.orders],
      })),

    updateOrder: (orderId, updates) =>
      set((state) => ({
        orders: state.orders.map((order) =>
          order.id === orderId ? { ...order, ...updates } : order
        ),
      })),

    clearError: () => set({ error: null }),
  }))
);

/**
 * Zustand store for messaging
 */
export const useMessageStore = create(
  devtools((set) => ({
    threads: [],
    activeThread: null,
    messages: [],
    loading: false,
    error: null,

    setThreads: (threads) => set({ threads }),
    setActiveThread: (thread) => set({ activeThread: thread }),
    setMessages: (messages) => set({ messages }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    addMessage: (message) =>
      set((state) => ({
        messages: [...state.messages, message],
      })),

    clearError: () => set({ error: null }),
  }))
);

/**
 * Zustand store for seller dashboard
 */
export const useSellerStore = create(
  devtools((set) => ({
    listings: [],
    sellerOrders: [],
    stats: null,
    storeProfile: null,
    loading: false,
    error: null,

    setListings: (listings) => set({ listings }),
    setSellerOrders: (orders) => set({ sellerOrders: orders }),
    setStats: (stats) => set({ stats }),
    setStoreProfile: (profile) => set({ storeProfile: profile }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    addListing: (product) =>
      set((state) => ({
        listings: [product, ...state.listings],
      })),

    updateListing: (productId, updates) =>
      set((state) => ({
        listings: state.listings.map((p) =>
          p.id === productId ? { ...p, ...updates } : p
        ),
      })),

    clearError: () => set({ error: null }),
  }))
);

/**
 * Zustand store for UI state
 */
export const useUIStore = create(
  devtools(
    persist(
      (set) => ({
        theme: 'light',
        sidebarOpen: true,
        notifications: [],
        showNotifications: false,

        setTheme: (theme) => set({ theme }),
        setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
        setShowNotifications: (show) => set({ showNotifications: show }),

        addNotification: (notification) =>
          set((state) => ({
            notifications: [...state.notifications, notification],
          })),

        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    )
  )
);

/**
 * Zustand store for wishlist
 */
export const useWishlistStore = create(
  devtools(
    persist(
      (set) => ({
        items: [],

        addToWishlist: (product) =>
          set((state) => {
            if (!state.items.find((item) => item.id === product.id)) {
              return { items: [...state.items, product] };
            }
            return state;
          }),

        removeFromWishlist: (productId) =>
          set((state) => ({
            items: state.items.filter((item) => item.id !== productId),
          })),

        isInWishlist: (productId) => (state) =>
          state.items.some((item) => item.id === productId),
      }),
      {
        name: 'wishlist-storage',
      }
    )
  )
);

/**
 * Zustand store for recently viewed products
 */
export const useRecentlyViewedStore = create(
  devtools(
    persist(
      (set) => ({
        items: [],
        maxItems: 10,

        addRecentlyViewed: (product) =>
          set((state) => {
            const filtered = state.items.filter((item) => item.id !== product.id);
            const newItems = [product, ...filtered].slice(0, state.maxItems);
            return { items: newItems };
          }),
      }),
      {
        name: 'recently-viewed-storage',
      }
    )
  )
);
