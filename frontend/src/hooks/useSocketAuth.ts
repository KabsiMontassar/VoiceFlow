import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { socketClient } from '../services/socket';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// Global flag to track if socket has ever been initialized
let socketInitialized = false;
let currentAuthState = false;

export const useSocketAuth = () => {
  const {
    isAuthenticated,
    isHydrated,
    accessToken,
    refreshToken,
    user,
    refreshAuth,
    logout,
  } = useAuthStore();

  const isConnectingRef = useRef(false);
  const eventHandlersRegisteredRef = useRef(false);

  useEffect(() => {
    // Only register event handlers once globally
    if (eventHandlersRegisteredRef.current) {
      return;
    }

    const handleTokenExpired = async () => {
      console.warn('[SocketAuth] Socket reported token expired');
      if (!refreshToken) {
        console.warn('[SocketAuth] No refresh token available');
        return;
      }

      try {
        const refreshed = await refreshAuth();
        if (refreshed && accessToken) {
          console.log('[SocketAuth] Updating socket authentication...');
          socketClient.updateAuth(accessToken);
        } else {
          console.warn('[SocketAuth] Token refresh failed, disconnecting socket');
          socketClient.disconnect();
          socketInitialized = false;
          currentAuthState = false;
        }
      } catch (error) {
        console.error('[SocketAuth] Token refresh failed:', error);
        socketClient.disconnect();
        socketInitialized = false;
        currentAuthState = false;
      }
    };

    const handleAuthError = (error: any) => {
      console.error('[SocketAuth] Socket authentication error:', error);
      // Don't logout immediately - let the auth store handle token refresh
      // Only logout if it's a critical auth error
      if (error?.message !== 'Connection rate limit exceeded') {
        logout();
        socketInitialized = false;
        currentAuthState = false;
      }
    };

    const handleSessionInvalidated = () => {
      console.warn('[SocketAuth] Session invalidated by server');
      logout();
      socketInitialized = false;
      currentAuthState = false;
    };

    const handleConcurrentLogin = (data: any) => {
      console.warn('[SocketAuth] Concurrent login detected:', data);
    };

    socketClient.on('token_expired', handleTokenExpired);
    socketClient.on('auth_error', handleAuthError);
    socketClient.on('session_invalidated', handleSessionInvalidated);
    socketClient.on('concurrent_login', handleConcurrentLogin);
    socketClient.on('internal_token_expired', handleTokenExpired);
    // Note: user_status_changed removed - status is now managed by auth service

    eventHandlersRegisteredRef.current = true;

    // Event handlers are registered globally and never cleaned up
    // This prevents re-registration on component re-mounts
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      console.log('[SocketAuth] Waiting for auth hydration...');
      return;
    }

    // Only manage connection based on auth state changes, not component mounts
    const authStateChanged = currentAuthState !== isAuthenticated;
    
    if (isAuthenticated && accessToken) {
      // Check if we need to connect (not already connected or connecting)
      if (socketInitialized && socketClient.isConnected()) {
        console.log('[SocketAuth] Socket already connected, skipping reconnection');
        return;
      }

      if (isConnectingRef.current) {
        console.log('[SocketAuth] Already connecting, skipping...');
        return;
      }

      isConnectingRef.current = true;
      socketInitialized = true;
      currentAuthState = true;

      console.log('[SocketAuth] Connecting socket with authentication...');
      
      socketClient
        .connect({
          url: SOCKET_URL,
          accessToken,
          refreshToken: refreshToken || undefined,
        })
        .then(() => {
          console.log('[SocketAuth] Socket connected successfully');
          // Note: User status is now managed by auth service (login/logout), not socket events
        })
        .catch((error) => {
          console.error('[SocketAuth] Failed to connect socket:', error);
          socketInitialized = false;
          currentAuthState = false;
        })
        .finally(() => {
          isConnectingRef.current = false;
        });
    } else if (!isAuthenticated && authStateChanged) {
      // Only disconnect if auth state actually changed from authenticated to not authenticated
      console.log('[SocketAuth] Authentication lost, disconnecting socket...');
      
      if (socketClient.isConnected()) {
        // Note: User status is now managed by auth service (login/logout), not socket events
        socketClient.disconnect();
      }
      
      socketInitialized = false;
      currentAuthState = false;
    }
    
    // No cleanup - socket persists across component re-mounts
  }, [isAuthenticated, isHydrated, accessToken, refreshToken, user]);

  // NO unmount cleanup - socket should persist across navigation
  // Only disconnect when user actually logs out (handled above)

  return {
    isSocketConnected: socketClient.isConnected(),
  };
};

export default useSocketAuth;
