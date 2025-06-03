import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await axios.post('/api/auth/login', { email, password });
          const { user, token } = response.data;
          
          set({ user, token, isLoading: false });
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          toast.success('ログインしました');
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(error.response?.data?.error || 'ログインに失敗しました');
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          const response = await axios.post('/api/auth/register', { email, password, name });
          const { user, token } = response.data;
          
          set({ user, token, isLoading: false });
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          toast.success('アカウントを作成しました');
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(error.response?.data?.error || '登録に失敗しました');
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        delete axios.defaults.headers.common['Authorization'];
        toast.success('ログアウトしました');
      },

      checkAuth: () => {
        const token = get().token;
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      },

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);