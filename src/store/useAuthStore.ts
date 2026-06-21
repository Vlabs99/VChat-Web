import { create } from 'zustand';
import type { AuthState, User } from '../types/auth';

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isLoading: true, // Defaults to true to handle initial auth state observation
  isAuthenticated: false,
  authError: null,

  setUser: (user: User | null) =>
    set({
      currentUser: user,
      isAuthenticated: !!user,
      isLoading: false,
      authError: null,
    }),

  clearUser: () =>
    set({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) =>
    set({
      authError: error,
      isLoading: false,
    }),
}));
