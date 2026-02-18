import { create } from 'zustand';
import type { UserSession } from '@/types/dashboard';

interface AuthState {
  user: UserSession | null;
  loading: boolean;
  setUser: (user: UserSession | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null }),
}));
