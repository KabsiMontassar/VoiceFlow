import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { socketClient } from '../services/socket';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const useSocketAuth = () => {
  const {
    isAuthenticated,
    isHydrated,
    accessToken,
    refreshToken,
    user,
    refreshAuth,
    logout,
    updateUserStatus,
  } = useAuthStore();

  const isConnectingRef = useRef(false);
  const connectionAttemptedRef = useRef(false);

  useEffect(() => {
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
        }
      } catch (error) {
        console.error('[SocketAuth] Token refresh failed:', error);
        socketClient.disconnect();
      }
    };

    const handleAuthError = (error: any) => {
      console.error('[SocketAuth] Socket authentication error:', error);
      logout();
    };

    const handleSessionInvalidated = () => {
      console.warn('[SocketAuth] Session invalidated by server');
      logout();
    };

    const handleConcurrentLogin = (data: any) => {
      console.warn('[SocketAuth] Concurrent login detected:', data);
    };

    const handleUserStatusChanged = (data: { userId: string; status: string }) => {
      if (user && data.userId === user.id) {
        updateUserStatus(data.status as any);
      }
    };

    socketClient.on('token_expired', handleTokenExpired);
    socketClient.on('auth_error', handleAuthError);
    socketClient.on('session_invalidated', handleSessionInvalidated);
    socketClient.on('concurrent_login', handleConcurrentLogin);
    socketClient.on('internal_token_expired', handleTokenExpired);
    socketClient.on('user_status_changed', handleUserStatusChanged);

    return () => {
      socketClient.off('token_expired', handleTokenExpired);
      socketClient.off('auth_error', handleAuthError);
      socketClient.off('session_invalidated', handleSessionInvalidated);
      socketClient.off('concurrent_login', handleConcurrentLogin);
      socketClient.off('internal_token_expired', handleTokenExpired);
      socketClient.off('user_status_changed', handleUserStatusChanged);
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      console.log('[SocketAuth] Waiting for auth hydration...');
      return;
    }

    if (isAuthenticated && accessToken) {
      if (isConnectingRef.current || socketClient.isConnected()) {
        console.log('[SocketAuth] Already connected or connecting, skipping...');
        return;
      }

      isConnectingRef.current = true;
      connectionAttemptedRef.current = true;

      console.log('[SocketAuth] Connecting socket with authentication...');
      
      socketClient
        .connect({
          url: SOCKET_URL,
          accessToken,
          refreshToken: refreshToken || undefined,
        })
        .then(() => {
          console.log('[SocketAuth] Socket connected successfully');
          if (user) {
            socketClient.setUserStatus('active' as any);
          }
        })
        .catch((error) => {
          console.error('[SocketAuth] Failed to connect socket:', error);
        })
        .finally(() => {
          isConnectingRef.current = false;
        });
    } else if (!isAuthenticated && connectionAttemptedRef.current) {
      console.log('[SocketAuth] Not authenticated, disconnecting socket...');
      
      if (socketClient.isConnected()) {
        if (user) {
          socketClient.setUserStatus('inactive' as any);
        }
        socketClient.disconnect();
      }
      
      connectionAttemptedRef.current = false;
    }

    return () => {
      if (socketClient.isConnected()) {
        console.log('[SocketAuth] Component unmounting, disconnecting socket...');
        socketClient.disconnect();
      }
    };
  }, [isAuthenticated, isHydrated, accessToken, refreshToken, user]);

  return {
    isSocketConnected: socketClient.isConnected(),
  };
};

export default useSocketAuth;
