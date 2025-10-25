import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../services/api';
import type { User, UserPresenceStatus } from '../../../shared/src';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  lastTokenRefresh: number | null;

  // Actions
  register: (email: string, username: string, password: string, confirmPassword: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clearError: () => void;
  initializeAuth: () => void;
  checkAuthStatus: () => Promise<boolean>;
  getSessions: () => Promise<any[]>;
  updateUserStatus: (status: UserPresenceStatus) => void;
}

// Token refresh interval (13 minutes - before 15 minute expiry)
const TOKEN_REFRESH_INTERVAL = 13 * 60 * 1000;

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
      lastTokenRefresh: null,

      initializeAuth: async () => {
        console.log('AuthStore: Initializing auth...');
        
        // Get current state (already rehydrated from Zustand persist)
        const state = get();
        
        console.log('AuthStore: Current state:', {
          hasAccessToken: !!state.accessToken,
          hasRefreshToken: !!state.refreshToken,
          hasUser: !!state.user,
          isAuthenticated: state.isAuthenticated
        });
        
        if (state.accessToken && state.refreshToken) {
          // Set tokens in apiClient so it can make authenticated requests
          apiClient.setTokensOnly(state.accessToken, state.refreshToken);
          
          // Verify token validity with backend
          const isValid = await get().checkAuthStatus();
          
          if (isValid) {
            console.log('AuthStore: Authentication validated');
            
            set({ isHydrated: true });
            
            // Setup automatic token refresh
            const setupTokenRefresh = () => {
              const currentState = get();
              if (currentState.isAuthenticated && currentState.refreshToken) {
                setTimeout(async () => {
                  const refreshed = await currentState.refreshAuth();
                  if (refreshed) {
                    setupTokenRefresh(); // Schedule next refresh
                  }
                }, TOKEN_REFRESH_INTERVAL);
              }
            };
            
            setupTokenRefresh();
          } else {
            console.log('AuthStore: Token validation failed, clearing auth');
            await get().logout();
          }
        } else {
          console.log('AuthStore: No stored tokens, setting hydrated to true');
          set({ isHydrated: true });
        }
      },

      checkAuthStatus: async () => {
        try {
          const response = await apiClient.getAuthStatus();
          
          if (response.success && response.data) {
            const { user, isAuthenticated } = response.data as any;
            
            set({
              user: user || null,
              isAuthenticated: !!isAuthenticated,
            });
            
            return !!isAuthenticated;
          }
          
          return false;
        } catch (error) {
          console.warn('AuthStore: Auth status check failed:', error);
          return false;
        }
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          console.log('AuthStore: No refresh token available');
          return false;
        }
        
        try {
          const response = await apiClient.refreshAccessToken(refreshToken);
          
          if (response.success && response.data) {
            const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response.data as any;
            
            // Set tokens in apiClient (without localStorage)
            apiClient.setTokensOnly(newAccessToken, newRefreshToken || refreshToken);
            
            // Update Zustand state (this will persist via Zustand middleware)
            set({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken || refreshToken,
              user: user || get().user,
              isAuthenticated: true,
              lastTokenRefresh: Date.now(),
            });
            
            console.log('AuthStore: Token refreshed successfully');
            return true;
          }
          
          return false;
        } catch (error) {
          console.warn('AuthStore: Token refresh failed:', error);
          await get().logout();
          return false;
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

          const { user: userData, accessToken, refreshToken } = response.data as any;

          // Set tokens in apiClient (without localStorage)
          apiClient.setTokensOnly(accessToken, refreshToken);

          // Update Zustand state (this will persist via Zustand middleware)
          set({
            user: { ...userData, status: 'active' as UserPresenceStatus },
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            isHydrated: true,
            lastTokenRefresh: Date.now(),
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

          const { user: userData, accessToken, refreshToken } = response.data as any;

          // Set tokens in apiClient (without localStorage)
          apiClient.setTokensOnly(accessToken, refreshToken);

          // Update Zustand state (this will persist via Zustand middleware)
          set({
            user: { ...userData, status: 'active' as UserPresenceStatus },
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            isHydrated: true,
            lastTokenRefresh: Date.now(),
          });
          
          // Setup automatic token refresh
          const setupTokenRefresh = () => {
            setTimeout(async () => {
              const state = get();
              if (state.isAuthenticated && state.refreshToken) {
                const refreshed = await state.refreshAuth();
                if (refreshed) {
                  setupTokenRefresh(); // Schedule next refresh
                }
              }
            }, TOKEN_REFRESH_INTERVAL);
          };
          
          setupTokenRefresh();
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiClient.logout();
        } catch (error) {
          console.warn('AuthStore: Logout API call failed:', error);
        }
        
        // Clear tokens from apiClient
        apiClient.clearTokensOnly();
        
        // Update Zustand state (this will clear persist storage)
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          lastTokenRefresh: null,
        });
      },

      logoutAll: async () => {
        try {
          await apiClient.logoutAll();
        } catch (error) {
          console.warn('AuthStore: Logout all API call failed:', error);
        }
        
        // Clear tokens from apiClient
        apiClient.clearTokensOnly();
        
        // Update Zustand state (this will clear persist storage)
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          lastTokenRefresh: null,
        });
      },

      getSessions: async () => {
        try {
          const response = await apiClient.getUserSessions();
          return response.success ? (response.data as any).sessions || [] : [];
        } catch (error) {
          console.warn('AuthStore: Failed to fetch sessions:', error);
          return [];
        }
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        // Set tokens in apiClient (without localStorage)
        apiClient.setTokensOnly(accessToken, refreshToken);
        
        // Update Zustand state (this will persist via Zustand middleware)
        set({ 
          accessToken, 
          refreshToken, 
          isAuthenticated: !!accessToken,
          isHydrated: true,
          lastTokenRefresh: Date.now(),
        });
      },

      setUser: (user: User) => {
        const currentState = get();
        set({ 
          user: user,
          isAuthenticated: !!(user && currentState.accessToken),
        });
      },

      updateUserStatus: () => {
        // Note: Status is managed through User type which comes from server
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
        lastTokenRefresh: state.lastTokenRefresh,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('AuthStore: Rehydrating from storage...');
        if (state) {
          console.log('AuthStore: State after rehydration:', {
            hasUser: !!state.user,
            hasAccessToken: !!state.accessToken,
            isAuthenticated: state.isAuthenticated
          });
          // Initialize auth after rehydration
          setTimeout(() => state.initializeAuth(), 100);
        }
      },
    }
  )
);

export default useAuthStore;
