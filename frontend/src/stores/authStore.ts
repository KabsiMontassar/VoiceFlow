import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../services/api';
import type { User } from '../../../shared/src';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  register: (email: string, username: string, password: string, confirmPassword: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      register: async (email: string, username: string, password: string, confirmPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.register({
            email,
            username,
            password,
            confirmPassword,
          });

          if (!response.success) {
            throw new Error(response.message || 'Registration failed');
          }

          const userData = (response.data as any)?.user;
          const tokens = {
            accessToken: (response.data as any)?.accessToken,
            refreshToken: (response.data as any)?.refreshToken,
          };

          apiClient.setTokens(tokens.accessToken, tokens.refreshToken);

          set({
            user: userData,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Registration failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.login({ email, password });

          if (!response.success) {
            throw new Error(response.message || 'Login failed');
          }

          const userData = (response.data as any)?.user;
          const tokens = {
            accessToken: (response.data as any)?.accessToken,
            refreshToken: (response.data as any)?.refreshToken,
          };

          apiClient.setTokens(tokens.accessToken, tokens.refreshToken);

          set({
            user: userData,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        apiClient.logout();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        apiClient.setTokens(accessToken, refreshToken);
        set({ accessToken, refreshToken, isAuthenticated: !!accessToken });
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
