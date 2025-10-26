import { create } from 'zustand';
import type { DirectMessage, DMConversation } from '@voiceflow/shared';

interface DMStore {
  // State
  conversations: DMConversation[];
  activeConversation: string | null;
  messages: Record<string, DirectMessage[]>; // friendId -> messages
  unreadCounts: Record<string, number>; // friendId -> unread count
  isLoading: boolean;

  // Actions
  setActiveConversation: (friendId: string | null) => void;
  addMessage: (friendId: string, message: DirectMessage) => void;
  sendMessage: (friendId: string, content: string) => Promise<void>;
  markAsRead: (friendId: string, messageIds: string[]) => void;
  incrementUnreadCount: (friendId: string) => void;
  resetUnreadCount: (friendId: string) => void;
  loadMessages: (friendId: string, messages: DirectMessage[]) => void;
  updateConversations: (conversations: DMConversation[]) => void;
  reset: () => void;
}

export const useDMStore = create<DMStore>((set, get) => ({
  // Initial state
  conversations: [],
  activeConversation: null,
  messages: {},
  unreadCounts: {},
  isLoading: false,

  // Set active conversation
  setActiveConversation: (friendId) => {
    set({ activeConversation: friendId });
    if (friendId) {
      // Reset unread count when opening conversation
      get().resetUnreadCount(friendId);
    }
  },

  // Add new message to conversation
  addMessage: (friendId, message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [friendId]: [...(state.messages[friendId] || []), message]
      }
    }));
  },

  // Send new message
  sendMessage: async (friendId, content) => {
    const newMessage: DirectMessage = {
      id: `temp-${Date.now()}`,
      senderId: 'me', // Will be replaced by actual user ID from auth
      receiverId: friendId,
      content,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    get().addMessage(friendId, newMessage);
  },

  // Mark messages as read
  markAsRead: (friendId, messageIds) => {
    set(state => ({
      messages: {
        ...state.messages,
        [friendId]: state.messages[friendId]?.map(msg =>
          messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
        ) || []
      }
    }));
  },

  // Increment unread count
  incrementUnreadCount: (friendId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [friendId]: (state.unreadCounts[friendId] || 0) + 1
      }
    }));
  },

  // Reset unread count
  resetUnreadCount: (friendId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [friendId]: 0
      }
    }));
  },

  // Load messages for a friend
  loadMessages: (friendId, messages) => {
    set(state => ({
      messages: {
        ...state.messages,
        [friendId]: messages
      }
    }));
  },

  // Update conversations list
  updateConversations: (conversations) => {
    set({ conversations });
  },

  // Reset store
  reset: () => {
    set({
      conversations: [],
      activeConversation: null,
      messages: {},
      unreadCounts: {},
      isLoading: false
    });
  }
}));
