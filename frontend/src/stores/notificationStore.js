import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const newNotification = {
          id: Date.now().toString(),
          timestamp: new Date(),
          read: false,
          ...notification,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep last 100
          unreadCount: state.unreadCount + 1,
        }));

        // Show toast notification
        const toastType = notification.type === 'error' ? 'error' :
                          notification.type === 'success' ? 'success' : 'default';

        if (toastType === 'error') {
          toast.error(notification.message);
        } else if (toastType === 'success') {
          toast.success(notification.message);
        } else {
          toast(notification.message, {
            icon: getNotificationIcon(notification.type),
          });
        }
      },

      markAsRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (notificationId) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId);
          const newUnreadCount = notification && !notification.read
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount;

          return {
            notifications: state.notifications.filter(n => n.id !== notificationId),
            unreadCount: newUnreadCount,
          };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      getNotificationsByType: (type) => {
        return get().notifications.filter(n => n.type === type);
      },

      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.read);
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Only persist last 50
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// Helper function to get notification icons
function getNotificationIcon(type) {
  switch (type) {
    case 'bid':
      return '💰';
    case 'auction':
      return '🏆';
    case 'order':
      return '📦';
    case 'message':
      return '💬';
    case 'drop':
      return '🚀';
    case 'follow':
      return '👥';
    case 'like':
      return '❤️';
    default:
      return '🔔';
  }
}