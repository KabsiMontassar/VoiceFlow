import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { socketClient } from '../services/socket';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const useSocketAuth = () => {
  const {
    isAuthenticated,
    accessToken,
    refreshToken,
    user,
    refreshAuth,
    logout,
    updateUserStatus,
  } = useAuthStore();

  const connectSocket = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      console.log('[SocketAuth] Not authenticated, skipping socket connection');
      return;
    }

    if (socketClient.isConnected()) {
      console.log('[SocketAuth] Socket already connected');
      return;
    }

    try {
      console.log('[SocketAuth] Connecting socket with authentication...');
      await socketClient.connect({
        url: SOCKET_URL,
        accessToken,
        refreshToken: refreshToken || undefined,
      });

      // Set user as active when socket connects
      if (user) {
        updateUserStatus('active' as any);
        socketClient.setUserStatus('active' as any);
      }

      console.log('[SocketAuth] Socket connected successfully');
    } catch (error) {
      console.error('[SocketAuth] Failed to connect socket:', error);
    }
  }, [isAuthenticated, accessToken, refreshToken, user, updateUserStatus]);

  const disconnectSocket = useCallback(() => {
    if (socketClient.isConnected()) {
      console.log('[SocketAuth] Disconnecting socket...');
      
      // Set user as inactive when disconnecting
      if (user) {
        socketClient.setUserStatus('inactive' as any);
        updateUserStatus('inactive' as any);
      }
      
      socketClient.disconnect();
    }
  }, [user, updateUserStatus]);

  const handleTokenRefresh = useCallback(async () => {
    if (!refreshToken) {
      console.warn('[SocketAuth] No refresh token available for socket update');
      return;
    }

    try {
      const refreshed = await refreshAuth();
      
      if (refreshed && accessToken) {
        console.log('[SocketAuth] Updating socket authentication...');
        socketClient.updateAuth(accessToken);
      } else {
        console.warn('[SocketAuth] Token refresh failed, disconnecting socket');
        disconnectSocket();
      }
    } catch (error) {
      console.error('[SocketAuth] Token refresh failed:', error);
      disconnectSocket();
    }
  }, [refreshToken, refreshAuth, accessToken, disconnectSocket]);

  // Setup socket event handlers
  useEffect(() => {
    if (!socketClient.isConnected()) {
      return;
    }

    // Handle token expiry
    const handleTokenExpired = () => {
      console.warn('[SocketAuth] Socket reported token expired');
      handleTokenRefresh();
    };

    // Handle authentication errors
    const handleAuthError = (error: any) => {
      console.error('[SocketAuth] Socket authentication error:', error);
      logout();
    };

    // Handle session invalidation
    const handleSessionInvalidated = () => {
      console.warn('[SocketAuth] Session invalidated by server');
      logout();
    };

    // Handle concurrent login
    const handleConcurrentLogin = (data: any) => {
      console.warn('[SocketAuth] Concurrent login detected:', data);
      // Could show a notification to user
    };

    socketClient.on('token_expired', handleTokenExpired);
    socketClient.on('auth_error', handleAuthError);
    socketClient.on('session_invalidated', handleSessionInvalidated);
    socketClient.on('concurrent_login', handleConcurrentLogin);
    socketClient.on('internal_token_expired', handleTokenRefresh);

    return () => {
      socketClient.off('token_expired', handleTokenExpired);
      socketClient.off('auth_error', handleAuthError);
      socketClient.off('session_invalidated', handleSessionInvalidated);
      socketClient.off('concurrent_login', handleConcurrentLogin);
      socketClient.off('internal_token_expired', handleTokenRefresh);
    };
  }, [handleTokenRefresh, logout]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      // Cleanup on unmount
      disconnectSocket();
    };
  }, [isAuthenticated, accessToken, connectSocket, disconnectSocket]);

  // Handle user status updates
  useEffect(() => {
    if (!socketClient.isConnected() || !user) {
      return;
    }

    // Setup presence event handlers
    const handleUserStatusChanged = (data: { userId: string; status: string }) => {
      if (data.userId === user.id) {
        updateUserStatus(data.status as any);
      }
    };

    socketClient.onUserStatusChanged(handleUserStatusChanged);

    return () => {
      socketClient.off('user_status_changed', handleUserStatusChanged);
    };
  }, [user, updateUserStatus]);

  return {
    isSocketConnected: socketClient.isConnected(),
    connectSocket,
    disconnectSocket,
    refreshSocketAuth: handleTokenRefresh,
  };
};

export default useSocketAuth;