import { create } from 'zustand';
import { Message } from '@voiceflow/shared';

interface MessageState {
  messages: Message[];
  currentRoomMessages: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setMessages: (messages: Message[]) => void;
  setRoomMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  removeMessage: (messageId: string, roomId: string) => void;
  updateMessage: (messageId: string, roomId: string, message: Message) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearRoomMessages: (roomId: string) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  currentRoomMessages: {},
  isLoading: false,
  error: null,

  setMessages: (messages: Message[]) => set({ messages }),

  setRoomMessages: (roomId: string, messages: Message[]) =>
    set((state) => ({
      currentRoomMessages: {
        ...state.currentRoomMessages,
        [roomId]: messages,
      },
    })),

  addMessage: (roomId: string, message: Message) =>
    set((state) => ({
      currentRoomMessages: {
        ...state.currentRoomMessages,
        [roomId]: [...(state.currentRoomMessages[roomId] || []), message],
      },
    })),

  removeMessage: (messageId: string, roomId: string) =>
    set((state) => ({
      currentRoomMessages: {
        ...state.currentRoomMessages,
        [roomId]: (state.currentRoomMessages[roomId] || []).filter(
          (m) => m.id !== messageId
        ),
      },
    })),

  updateMessage: (messageId: string, roomId: string, message: Message) =>
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
}));

export default useMessageStore;
