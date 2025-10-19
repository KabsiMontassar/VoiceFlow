import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Avatar from "../components/ui/Avatar";
import Toast from "../components/ui/Toast";
import { useMessageStore } from "../stores/messageStore";
import { useAuthStore } from "../stores/authStore";
import { apiClient } from "../services/api";
import { socketClient } from "../services/socket";

export const Route = createFileRoute("/room/$roomId")({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = useParams({ from: "/room/$roomId" });
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { messages, addMessage } = useMessageStore();
  
  const [messageInput, setMessageInput] = useState("");
  const [roomData, setRoomData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
    }
  }, [user]);

  // Fetch room data and messages
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const [roomResponse, messagesResponse, membersResponse] = await Promise.all([
          apiClient.get(`/rooms/${roomId}`),
          apiClient.get(`/rooms/${roomId}/messages`),
          apiClient.get(`/rooms/${roomId}/members`),
        ]);

        setRoomData(roomResponse.data);
        setMembers((membersResponse.data as any) || []);
        
        // Load messages into store
        const messagesList = (messagesResponse.data || []) as any[];
        messagesList.forEach((msg: any) => {
          addMessage(roomId, msg);
        });
      } catch (error: any) {
        setToastMessage({
          type: "error",
          text: error.response?.data?.message || "Failed to load room",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();

    // Setup Socket.IO listeners
    socketClient.on("message:new", (data: any) => {
      if (data.roomId === roomId) {
        addMessage(roomId, data);
      }
    });

    socketClient.on("user:joined", (data: any) => {
      if (data.roomId === roomId) {
        setMembers((prev) => [...prev, data.user]);
        setToastMessage({
          type: "success",
          text: `${data.user.username} joined the room`,
        });
      }
    });

    return () => {
      socketClient.off("message:new");
      socketClient.off("user:joined");
    };
  }, [roomId, addMessage, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user) return;

    try {
      const response = await apiClient.post(`/rooms/${roomId}/messages`, {
        content: messageInput,
      });

      // Response data is already in correct Message format
      const newMessage = response.data as any;

      addMessage(roomId, newMessage);
      setMessageInput("");

      // Emit via Socket.IO for real-time updates
      socketClient.emit("message:send", newMessage);
    } catch (error: any) {
      setToastMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to send message",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <p className="text-lg text-neutral">Loading room...</p>
      </div>
    );
  }

  const roomMessages = (messages as any).filter((m: any) => m.roomId === roomId) || [];

  return (
    <div className="min-h-screen bg-primary-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-primary-200 px-6 py-4 shadow-sm">
        <div className="max-w-full mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">{roomData?.name}</h1>
            <p className="text-sm text-neutral">{members.length} members online</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            ← Back to Rooms
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col p-6">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {roomMessages.length > 0 ? (
              roomMessages.map((message: any, index: number) => (
                <div key={message.id || index} className="flex gap-3 animate-fade-in">
                  <Avatar
                    initials={message.author?.username?.charAt(0).toUpperCase() || "?"}
                    status="online"
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-semibold text-foreground">
                        {message.author?.username || "Anonymous"}
                      </span>
                      <span className="text-xs text-neutral">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-foreground mt-1">{message.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral text-center">
                  No messages yet. Start the conversation!
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Input
              type="text"
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!messageInput.trim()}
            >
              Send
            </Button>
          </form>
        </div>

        {/* Members Sidebar */}
        <div className="w-64 bg-white border-l border-primary-200 p-6 overflow-y-auto">
          <h2 className="text-lg font-serif font-bold text-foreground mb-4">Members</h2>
          <div className="space-y-3">
            {members.map((member: any) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-50 transition">
                <Avatar
                  initials={member.username?.charAt(0).toUpperCase() || "?"}
                  status="online"
                />
                <div>
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {member.username}
                  </p>
                  <p className="text-xs text-primary-600">{member.status || "Active"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
