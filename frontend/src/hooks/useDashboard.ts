import { useState, useEffect } from "react";
import { useRoomStore } from "../stores/roomStore";
import { useAuthStore } from "../stores/authStore";
import { apiClient } from "../services/api";

export function useDashboard() {
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const { rooms, setRooms, addRoom } = useRoomStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Redirect to login if not authenticated (but only after hydration is complete)
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      console.log('Dashboard: Redirecting to login - not authenticated');
      window.location.href = "/login";
    }
  }, [isAuthenticated, isHydrated]);

  // Fetch rooms on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms();
    }
  }, [isAuthenticated]);

  const fetchRooms = async () => {
    try {
      console.log('Fetching user rooms...');
      const response = await apiClient.listUserRooms();
      console.log('Rooms API response:', response);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to load rooms');
      }
      
      // The backend returns { success: true, data: { rooms: [], total: 0 } }
      const data = response.data as any;
      console.log('Rooms data structure:', data);
      console.log('Rooms array:', data.rooms);
      
      setRooms(data.rooms || []);
    } catch (error: any) {
      console.error('Error fetching rooms:', error);
      setToastMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to load rooms",
      });
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setToastMessage({ type: "error", text: "Room name is required" });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Creating room:', roomName);
      const response = await apiClient.createRoom({ name: roomName });
      console.log('Create room response:', response);
      
      // Check if the response was successful
      if (!response.success) {
        throw new Error(response.message || 'Failed to create room');
      }
      
      addRoom(response.data as any);
      setToastMessage({ type: "success", text: "Room created successfully!" });
      setRoomName("");
      setIsModalOpen(false);
      
      // Refresh rooms list
      await fetchRooms();
    } catch (error: any) {
      console.error('Error creating room:', error);
      setToastMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to create room",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    window.location.href = `/room/${roomId}`;
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setToastMessage({ type: "error", text: "Room code is required" });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Joining room by code:', roomCode);
      
      // First get the room by code
      const roomResponse = await apiClient.getRoomByCode(roomCode);
      console.log('Room by code response:', roomResponse);
      
      if (!roomResponse.success) {
        throw new Error(roomResponse.message || 'Room not found');
      }
      
      const room = roomResponse.data as any;
      if (!room) throw new Error('Room not found');
      
      // Then join the room
      const joinResponse = await apiClient.joinRoom(room.id);
      
      if (!joinResponse.success) {
        throw new Error(joinResponse.message || 'Failed to join room');
      }
      
      setToastMessage({ type: "success", text: "Joined room successfully!" });
      setRoomCode("");
      setIsJoinModalOpen(false);
      
      // Refresh rooms list
      await fetchRooms();
    } catch (error: any) {
      console.error('Error joining room:', error);
      setToastMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to join room",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyRoomCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setToastMessage({ type: "success", text: "Room code copied to clipboard!" });
    } catch (error) {
      console.error('Failed to copy room code:', error);
      setToastMessage({ type: "error", text: "Failed to copy room code" });
    }
  };

  const roomsArray = rooms as any[];
  const totalMessages = roomsArray.reduce((sum, room) => sum + (room.messageCount || 0), 0);
  const totalMembers = roomsArray.reduce((sum, room) => sum + (room.memberCount || 0), 0);

  return {
    user,
    isAuthenticated,
    isHydrated,
    rooms: roomsArray,
    totalMessages,
    totalMembers,
    isModalOpen,
    setIsModalOpen,
    isJoinModalOpen,
    setIsJoinModalOpen,
    roomName,
    setRoomName,
    roomCode,
    setRoomCode,
    isLoading,
    toastMessage,
    setToastMessage,
    handleCreateRoom,
    handleJoinRoom,
    handleJoinByCode,
    copyRoomCode,
    fetchRooms
  };
}