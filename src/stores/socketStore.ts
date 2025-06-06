import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';
import { config } from '@/lib/config';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  
  connect: () => void;
  disconnect: () => void;
  joinBoard: (boardId: number) => void;
  leaveBoard: (boardId: number) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const socket = io(config.socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket.io connected');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected');
      set({ isConnected: false });
    });

    socket.on('error', (error) => {
      console.error('Socket.io error:', error);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  joinBoard: (boardId: number) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('join-board', boardId);
    }
  },

  leaveBoard: (boardId: number) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('leave-board', boardId);
    }
  },
}));

// 自動接続の設定
if (typeof window !== 'undefined') {
  const token = useAuthStore.getState().token;
  if (token) {
    useSocketStore.getState().connect();
  }

  // 認証状態の変更を監視
  useAuthStore.subscribe(
    (state) => {
      const token = state.token;
      if (token) {
        useSocketStore.getState().connect();
      } else {
        useSocketStore.getState().disconnect();
      }
    }
  );
}