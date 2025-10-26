import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Room, RoomUser } from '../../../shared/src';

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  roomMembers: RoomUser[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  setRoomMembers: (members: RoomUser[]) => void;
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      rooms: [],
      currentRoom: null,
      roomMembers: [],
      isLoading: false,
      error: null,

      setRooms: (rooms: Room[]) => set({ rooms }),
      setCurrentRoom: (room: Room | null) => set({ currentRoom: room }),
      setRoomMembers: (members: RoomUser[]) => set({ roomMembers: members }),
      addRoom: (room: Room) =>
        set((state) => ({ rooms: [...state.rooms, room] })),
      updateRoom: (room: Room) =>
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === room.id ? room : r)),
          currentRoom: state.currentRoom?.id === room.id ? room : state.currentRoom,
        })),
      removeRoom: (roomId: string) =>
        set((state) => ({
          rooms: state.rooms.filter((r) => r.id !== roomId),
          currentRoom: state.currentRoom?.id === roomId ? null : state.currentRoom,
        })),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
    }),
    {
      name: 'room-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        rooms: state.rooms // Only persist rooms list
      }),
    }
  )
);

export default useRoomStore;
