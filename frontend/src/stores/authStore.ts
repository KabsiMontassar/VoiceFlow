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
  isHydrated: boolean;

  // Actions
  register: (email: string, username: string, password: string, confirmPassword: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clearError: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      isHydrated: false,

      initializeAuth: () => {
        console.log('AuthStore: Initializing auth...');
        // Check if we have stored tokens and user data
        const storedToken = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        
        console.log('AuthStore: Stored token exists:', !!storedToken);
        
        if (storedToken) {
          apiClient.setAccessToken(storedToken);
          if (storedRefreshToken) {
            apiClient.setRefreshToken(storedRefreshToken);
          }
          
          // If we have a token, consider the user authenticated
          // The user data should be restored by the persist middleware
          const currentState = get();
          console.log('AuthStore: Current user exists:', !!currentState.user);
          
          set({
            accessToken: storedToken,
            refreshToken: storedRefreshToken,
            isAuthenticated: true, // If we have a token, we're authenticated
            isHydrated: true,
          });
          
          console.log('AuthStore: Set isAuthenticated to true');
          
          // If we don't have user data but have a token, try to fetch current user
          if (!currentState.user) {
            console.log('AuthStore: Fetching current user...');
            apiClient.getCurrentUser()
              .then((response) => {
                if (response.success && response.data) {
                  console.log('AuthStore: User fetched successfully');
                  set({ user: response.data as User });
                }
              })
              .catch((error) => {
                console.log('AuthStore: Failed to fetch user:', error);
                // If fetching user fails, clear tokens and set as not authenticated
                set({
                  user: null,
                  accessToken: null,
                  refreshToken: null,
                  isAuthenticated: false,
                });
                apiClient.clearTokens();
              });
          }
        } else {
          console.log('AuthStore: No stored token, setting hydrated to true');
          set({ isHydrated: true });
        }
      },

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
        set({ 
          accessToken, 
          refreshToken, 
          isAuthenticated: !!accessToken,
          isHydrated: true 
        });
      },

      setUser: (user: User) => {
        const currentState = get();
        set({ 
          user,
          isAuthenticated: !!(user && currentState.accessToken),
        });
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
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('AuthStore: Rehydrating from storage...');
        // After rehydration, initialize auth state
        if (state) {
          console.log('AuthStore: State after rehydration:', {
            hasUser: !!state.user,
            hasAccessToken: !!state.accessToken,
            isAuthenticated: state.isAuthenticated
          });
          state.initializeAuth();
        }
      },
    }
  )
);

export default useAuthStore;
