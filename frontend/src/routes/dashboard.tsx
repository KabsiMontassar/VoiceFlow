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
  const { user } = useAuthStore();
  const { rooms, setRooms, addRoom } = useRoomStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
    }
  }, [user]);

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await apiClient.get("/rooms");
      setRooms((response.data as any[]) || []);
    } catch (error: any) {
      setToastMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to load rooms",
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
      const response = await apiClient.post("/rooms", { name: roomName });
      
      addRoom(response.data as any);
      setToastMessage({ type: "success", text: "Room created successfully!" });
      setRoomName("");
      setIsModalOpen(false);
      
      // Refresh rooms list
      await fetchRooms();
    } catch (error: any) {
      setToastMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to create room",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    window.location.href = `/room/${roomId}`;
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
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
          >
            + Create Room
          </Button>
        </div>

        {/* Rooms Grid */}
        {(rooms as any[])?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(rooms as any[]).map((room: any) => (
              <Card key={room.id} variant="elevated" className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="mb-4">
                  <h3 className="text-xl font-serif font-bold text-foreground">{room.name}</h3>
                  {room.description && (
                    <p className="text-neutral text-sm mt-2">{room.description}</p>
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
