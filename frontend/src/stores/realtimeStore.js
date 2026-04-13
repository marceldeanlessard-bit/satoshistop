import { create } from 'zustand';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3000';

export const useRealtimeStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  activeRooms: new Set(),

  connectSocket: () => {
    if (get().socket?.connected) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('Connected to real-time server');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from real-time server');
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      set({ isConnected: false });
    });

    // Handle real-time events
    socket.on('auctionUpdate', (data) => {
      // Update auction data in real-time
      console.log('Auction update:', data);
    });

    socket.on('newBid', (data) => {
      // Handle new bid notifications
      console.log('New bid:', data);
    });

    socket.on('priceChange', (data) => {
      // Handle price changes
      console.log('Price change:', data);
    });

    socket.on('stockUpdate', (data) => {
      // Handle stock updates
      console.log('Stock update:', data);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, activeRooms: new Set() });
    }
  },

  joinRoom: (roomId) => {
    const { socket, activeRooms } = get();
    if (socket && !activeRooms.has(roomId)) {
      socket.emit('joinRoom', roomId);
      set({ activeRooms: new Set([...activeRooms, roomId]) });
    }
  },

  leaveRoom: (roomId) => {
    const { socket, activeRooms } = get();
    if (socket && activeRooms.has(roomId)) {
      socket.emit('leaveRoom', roomId);
      const newRooms = new Set(activeRooms);
      newRooms.delete(roomId);
      set({ activeRooms: newRooms });
    }
  },

  emit: (event, data) => {
    const { socket } = get();
    if (socket) {
      socket.emit(event, data);
    }
  },

  on: (event, callback) => {
    const { socket } = get();
    if (socket) {
      socket.on(event, callback);
    }
  },

  off: (event, callback) => {
    const { socket } = get();
    if (socket) {
      socket.off(event, callback);
    }
  },
}));