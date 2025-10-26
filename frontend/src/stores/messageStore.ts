import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MessageWithAuthor } from '../../../shared/src';

interface MessageState {
  messages: MessageWithAuthor[];
  currentRoomMessages: Record<string, MessageWithAuthor[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setMessages: (messages: MessageWithAuthor[]) => void;
  setRoomMessages: (roomId: string, messages: MessageWithAuthor[]) => void;
  addMessage: (roomId: string, message: MessageWithAuthor) => void;
  removeMessage: (messageId: string, roomId: string) => void;
  updateMessage: (messageId: string, roomId: string, message: MessageWithAuthor) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearRoomMessages: (roomId: string) => void;
}

export const useMessageStore = create<MessageState>()(
  persist(
    (set) => ({
      messages: [],
      currentRoomMessages: {},
      isLoading: false,
      error: null,

      setMessages: (messages: MessageWithAuthor[]) => set({ messages }),

      setRoomMessages: (roomId: string, messages: MessageWithAuthor[]) =>
        set((state) => ({
          currentRoomMessages: {
            ...state.currentRoomMessages,
            [roomId]: messages,
          },
        })),

      addMessage: (roomId: string, message: MessageWithAuthor) =>
        set((state) => {
          const currentMessages = state.currentRoomMessages[roomId] || [];
          
          // Check if message already exists (by id)
          const existingIndex = currentMessages.findIndex(m => m.id === message.id);
          
          if (existingIndex >= 0) {
            // Message exists - update it instead of duplicating
            const updatedMessages = [...currentMessages];
            updatedMessages[existingIndex] = message;
            return {
              currentRoomMessages: {
                ...state.currentRoomMessages,
                [roomId]: updatedMessages,
              },
            };
          } else {
            // New message - add it
            return {
              currentRoomMessages: {
                ...state.currentRoomMessages,
                [roomId]: [...currentMessages, message],
              },
            };
          }
        }),

      removeMessage: (messageId: string, roomId: string) =>
        set((state) => ({
          currentRoomMessages: {
            ...state.currentRoomMessages,
            [roomId]: (state.currentRoomMessages[roomId] || []).filter(
              (m) => m.id !== messageId
            ),
          },
        })),

      updateMessage: (messageId: string, roomId: string, message: MessageWithAuthor) =>
        set((state) => ({
          currentRoomMessages: {
            ...state.currentRoomMessages,
            [roomId]: (state.currentRoomMessages[roomId] || []).map((m) =>
              m.id === messageId ? message : m
            ),
          },
        })),

      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),

      clearRoomMessages: (roomId: string) =>
        set((state) => {
          const { [roomId]: _, ...remaining } = state.currentRoomMessages;
          return { currentRoomMessages: remaining };
        }),
    }),
    {
      name: 'message-storage',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for faster access
      partialize: (state) => ({ 
        currentRoomMessages: state.currentRoomMessages // Only persist messages
      }),
    }
  )
);

export default useMessageStore;
