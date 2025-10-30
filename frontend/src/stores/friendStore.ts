import { create } from 'zustand';
import type { FriendRequest, FriendWithStatus } from '@valero/shared';
import apiClient from '../services/api';

interface FriendStore {
  // State
  friends: FriendWithStatus[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFriends: () => Promise<void>;
  loadPendingRequests: () => Promise<void>;
  loadSentRequests: () => Promise<void>;
  sendFriendRequest: (friendCode: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  updateFriendStatus: (userId: string, isOnline: boolean) => void;
  addFriend: (friend: FriendWithStatus) => void;
  reset: () => void;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
  // Initial state
  friends: [],
  pendingRequests: [],
  sentRequests: [],
  isLoading: false,
  error: null,

  // Load friends list
  loadFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getFriends();
      if (response.success && response.data) {
        set({ friends: response.data as FriendWithStatus[], isLoading: false });
      } else {
        set({ error: 'Failed to load friends', isLoading: false });
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      set({ error: 'Failed to load friends', isLoading: false });
    }
  },

  // Load pending friend requests (received)
  loadPendingRequests: async () => {
    try {
      const response = await apiClient.getPendingFriendRequests();
      if (response.success && response.data) {
        set({ pendingRequests: response.data as FriendRequest[] });
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  },

  // Load sent friend requests
  loadSentRequests: async () => {
    try {
      const response = await apiClient.getSentFriendRequests();
      if (response.success && response.data) {
        set({ sentRequests: response.data as FriendRequest[] });
      }
    } catch (error) {
      console.error('Error loading sent requests:', error);
    }
  },

  // Send friend request by friend code
  sendFriendRequest: async (friendCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.sendFriendRequest(friendCode);
      if (response.success) {
        // Reload sent requests
        await get().loadSentRequests();
        set({ isLoading: false });
      } else {
        set({ error: response.message || 'Failed to send friend request', isLoading: false });
      }
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to send friend request', 
        isLoading: false 
      });
    }
  },

  // Accept friend request
  acceptFriendRequest: async (requestId: string) => {
    try {
      const response = await apiClient.acceptFriendRequest(requestId);
      if (response.success) {
        // Remove from pending requests
        set(state => ({
          pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
        }));
        // Reload friends list
        await get().loadFriends();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  },

  // Reject friend request
  rejectFriendRequest: async (requestId: string) => {
    try {
      const response = await apiClient.rejectFriendRequest(requestId);
      if (response.success) {
        // Remove from pending requests
        set(state => ({
          pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
        }));
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  },

  // Cancel sent friend request
  cancelFriendRequest: async (requestId: string) => {
    try {
      const response = await apiClient.cancelFriendRequest(requestId);
      if (response.success) {
        // Remove from sent requests
        set(state => ({
          sentRequests: state.sentRequests.filter(r => r.id !== requestId)
        }));
      }
    } catch (error) {
      console.error('Error cancelling friend request:', error);
    }
  },

  // Remove friend
  removeFriend: async (friendId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.removeFriend(friendId);
      if (response.success) {
        // Remove from friends list
        set(state => ({
          friends: state.friends.filter(f => f.id !== friendId),
          isLoading: false
        }));
      } else {
        set({ error: 'Failed to remove friend', isLoading: false });
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      set({ error: 'Failed to remove friend', isLoading: false });
    }
  },

  // Update friend online status (called from socket events)
  updateFriendStatus: (userId: string, isOnline: boolean) => {
    set(state => ({
      friends: state.friends.map(friend =>
        friend.id === userId ? { ...friend, isOnline } : friend
      )
    }));
  },

  // Add new friend (called when friend request is accepted)
  addFriend: (friend: FriendWithStatus) => {
    set(state => ({
      friends: [...state.friends, friend]
    }));
  },

  // Reset store
  reset: () => {
    set({
      friends: [],
      pendingRequests: [],
      sentRequests: [],
      isLoading: false,
      error: null
    });
  }
}));
