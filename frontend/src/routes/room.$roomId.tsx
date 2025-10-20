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
  const { currentRoomMessages, addMessage, setRoomMessages } = useMessageStore();

  const [messageInput, setMessageInput] = useState("");
  const [roomData, setRoomData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
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
    const connectSocketAndFetchData = async () => {
      try {
        // Connect socket if not connected
        if (!socketClient.isConnected() && user) {
          const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
          if (token) {
            console.log('Connecting to socket with token...');
            await socketClient.connect({
              url: import.meta.env.VITE_API_URL || 'http://localhost:3000',
              token: token
            });
            setSocketConnected(true);
            console.log('Socket connected successfully');
          }
        }

        const [roomResponse, messagesResponse, membersResponse] = await Promise.all([
          apiClient.getRoomById(roomId),
          apiClient.getRoomMessages(roomId),
          apiClient.getRoomMembers(roomId),
        ]);

        setRoomData(roomResponse.data);
        setMembers((membersResponse.data as any) || []);
        
        // Load messages into store
        const messagesList = (messagesResponse.data as any)?.data || [];
        console.log('Messages response structure:', {
          fullResponse: messagesResponse,
          extractedMessages: messagesList
        });
        setRoomMessages(roomId, messagesList);
        
        console.log('Room data loaded:', {
          room: roomResponse.data,
          messages: messagesList.length,
          members: membersResponse.data
        });
      } catch (error: any) {
        console.error('Error loading room data:', error);
        setToastMessage({
          type: "error",
          text: error.response?.data?.message || "Failed to load room",
        });
      } finally {
        setIsLoading(false);
      }
    };

    connectSocketAndFetchData();

    // Setup Socket.IO listeners
    socketClient.on("message:received", (data: any) => {
      console.log('Message received via socket:', data);
      if (data.roomId === roomId) {
        addMessage(roomId, data);
      }
    });

    socketClient.on("room:user_joined", (data: any) => {
      console.log('User joined room:', data);
      if (data.roomId === roomId) {
        setMembers((prev) => [...prev, data.user]);
        setToastMessage({
          type: "success",
          text: `${data.user?.username || 'A user'} joined the room`,
        });
      }
    });

    // Join the room via socket
    if (socketClient.isConnected()) {
      console.log('Joining room via socket:', roomId);
      socketClient.joinRoom(roomId);
    }

    return () => {
      console.log('Cleaning up socket listeners...');
      socketClient.off("message:received");
      socketClient.off("room:user_joined");
      
      // Leave room when component unmounts
      if (socketClient.isConnected()) {
        socketClient.leaveRoom(roomId);
      }
    };
  }, [roomId, addMessage, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentRoomMessages[roomId]]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user) return;

    try {
      const response = await apiClient.sendMessage({
        roomId,
        content: messageInput,
      });

      console.log('Message sent successfully:', response);

      if (response.success && response.data) {
        // Message will be added via socket event when others receive it
        // Add locally for immediate feedback
        addMessage(roomId, response.data as any);
        setMessageInput("");
        
        setToastMessage({
          type: "success",
          text: "Message sent successfully",
        });
      } else {
        setToastMessage({
          type: "error",
          text: response.message || "Failed to send message",
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
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

  const roomMessages = currentRoomMessages[roomId] || [];

  return (
    <div className="min-h-screen bg-primary-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-primary-200 px-6 py-4 shadow-sm">
        <div className="max-w-full mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">{roomData?.name}</h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-neutral">{members.length} members online</p>
              {roomData?.code && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral">Room Code:</span>
                  <span className="inline-block px-2 py-1 bg-primary-100 text-primary-900 rounded text-xs font-mono font-bold">
                    {roomData.code}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(roomData.code)}
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
                        {new Date(message.createdAt).toLocaleTimeString()}
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
