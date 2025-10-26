/**
 * Global rooms synchronization hook
 * Fetches and keeps user's rooms in sync across the app
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { apiClient } from '../services/api';
import { socketClient } from '../services/socket';
import type { Room } from '../../../shared/src';

export function useRoomsSync() {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const { setRooms } = useRoomStore();

  // Fetch rooms when authenticated
  const { data: roomsData, isLoading, error, refetch } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      console.log('[RoomsSync] Fetching user rooms...');
      try {
        const response = await apiClient.listUserRooms();
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to load rooms');
        }
        
        const data = response.data as any;
        const rooms = data.rooms || [];
        
        console.log('[RoomsSync] Fetched rooms:', rooms.length);
        return rooms;
      } catch (error) {
        console.error('[RoomsSync] Error fetching rooms:', error);
        throw error;
      }
    },
    enabled: isAuthenticated && isHydrated, // Only fetch when authenticated and hydrated
    retry: 1,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes (increased from 30s)
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent loops
    refetchInterval: false, // Disable automatic refetch interval
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });

  // Update Zustand store when rooms change
  useEffect(() => {
    if (roomsData && Array.isArray(roomsData)) {
      console.log('[RoomsSync] Updating Zustand store with rooms:', roomsData.length);
      setRooms(roomsData as Room[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomsData]);

  // Listen for socket events to keep rooms in sync
  useEffect(() => {
    if (!isAuthenticated || !socketClient.isConnected()) return;

    const handleRoomCreated = () => {
      console.log('[RoomsSync] Room created, refetching...');
      refetch();
    };

    const handleRoomDeleted = () => {
      console.log('[RoomsSync] Room deleted, refetching...');
      refetch();
    };

    const handleRoomUpdated = () => {
      console.log('[RoomsSync] Room updated, refetching...');
      refetch();
    };

    const handleUserJoinedRoom = () => {
      console.log('[RoomsSync] User joined room, refetching...');
      refetch();
    };

    const handleUserLeftRoom = () => {
      console.log('[RoomsSync] User left room, refetching...');
      refetch();
    };

    // Register event listeners
    socketClient.on('room_created', handleRoomCreated);
    socketClient.on('room_deleted', handleRoomDeleted);
    socketClient.on('room_updated', handleRoomUpdated);
    socketClient.on('user_joined_room', handleUserJoinedRoom);
    socketClient.on('user_left_room', handleUserLeftRoom);

    return () => {
      // Cleanup event listeners
      socketClient.off('room_created', handleRoomCreated);
      socketClient.off('room_deleted', handleRoomDeleted);
      socketClient.off('room_updated', handleRoomUpdated);
      socketClient.off('user_joined_room', handleUserJoinedRoom);
      socketClient.off('user_left_room', handleUserLeftRoom);
    };
  }, [isAuthenticated, refetch]);

  return {
    rooms: roomsData || [],
    isLoading,
    error,
    refetch,
  };
}
