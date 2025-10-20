import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Toast from "../components/ui/Toast";
import { useRoomStore } from "../stores/roomStore";
import { useAuthStore } from "../stores/authStore";
import { apiClient } from "../services/api";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
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

  // Show loading while auth is hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <p className="text-lg text-neutral">Loading...</p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-primary-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-neutral text-lg">Manage your collaboration rooms</p>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-serif font-bold text-foreground">Your Rooms</h2>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsJoinModalOpen(true)}
            >
              Join Room
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              + Create Room
            </Button>
          </div>
        </div>

        {/* Rooms Grid */}
        {(rooms as any[])?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(rooms as any[]).map((room: any) => (
              <Card key={room.id} variant="elevated" className="hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="text-xl font-serif font-bold text-foreground">{room.name}</h3>
                  {room.description && (
                    <p className="text-neutral text-sm mt-2">{room.description}</p>
                  )}
                  {room.code && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-neutral">Room Code:</span>
                      <span className="inline-block px-2 py-1 bg-primary-100 text-primary-900 rounded text-xs font-mono font-bold">
                        {room.code}
                      </span>
                      <button
                        onClick={() => copyRoomCode(room.code)}
                        className="text-primary-600 hover:text-primary-900 transition-colors"
                        title="Copy room code"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mb-4 flex items-center gap-4 text-sm text-neutral">
                  <span>👥 {room.memberCount || 0} members</span>
                  <span>💬 {room.messageCount || 0} messages</span>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleJoinRoom(room.id)}
                >
                  Enter Room
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="outlined" className="text-center py-12">
            <p className="text-neutral text-lg mb-4">No rooms yet. Create one to get started!</p>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              Create Your First Room
            </Button>
          </Card>
        )}
      </div>

      {/* Create Room Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Room"
        size="md"
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <Input
            type="text"
            placeholder="Room name"
            label="Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            disabled={isLoading}
          />
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
            >
              Create Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Join Room"
        size="md"
      >
        <form onSubmit={handleJoinByCode} className="space-y-4">
          <Input
            type="text"
            placeholder="Enter room code"
            label="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            disabled={isLoading}
            maxLength={20}
          />
          
          <p className="text-sm text-neutral">
            Ask the room creator for the room code to join
          </p>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsJoinModalOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              disabled={!roomCode.trim()}
            >
              Join Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toast Notifications */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
