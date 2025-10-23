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
import { MessageType } from "../../../shared/src/types";

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
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{userId: string, username: string}>>([]);
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
          
          console.log('Token check:', {
            authToken: localStorage.getItem('authToken'),
            accessToken: localStorage.getItem('accessToken'),
            finalToken: token,
            user: user
          });
          
          if (token) {
            console.log('Connecting to socket with token:', {
              tokenPreview: token.substring(0, 20) + '...',
              url: import.meta.env.VITE_API_URL || 'http://localhost:3000'
            });
            await socketClient.connect({
              url: import.meta.env.VITE_API_URL || 'http://localhost:3000',
              token: token
            });
            console.log('Socket connected successfully');
          } else {
            console.error('No authentication token found in localStorage');
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

        // Setup optimized Socket.IO listeners
        if (socketClient.isConnected()) {
          console.log('Setting up optimized socket listeners...');
          
          // Remove any existing listeners first
          socketClient.off("new_message");
          socketClient.off("user_joined_room");
          socketClient.off("user_left_room");
          socketClient.off("room_joined");
          socketClient.off("room_messages");
          socketClient.off("message_sent");
          socketClient.off("user_typing");
          socketClient.off("presence_update");
          socketClient.off("offline_messages");

          // Enhanced message handling
          socketClient.on("new_message", (data: any) => {
            console.log('📨 New message received via optimized socket:', data);
            if (data.roomId === roomId) {
              console.log('✅ Adding message to current room');
              addMessage(roomId, data);
            }
          });

          // Message sent confirmation
          socketClient.on("message_sent", (data: any) => {
            console.log('✅ Message sent confirmation:', data);
            // Update UI to show message as sent
          });

          // Room events
          socketClient.on("room_joined", (data: any) => {
            console.log('🏠 Room joined successfully:', data);
            setToastMessage({
              type: "success",
              text: "Successfully joined room",
            });
          });

          socketClient.on("room_messages", (messages: any[]) => {
            console.log('📚 Room messages received:', messages.length);
            if (messages.length > 0) {
              setRoomMessages(roomId, messages);
            }
          });

          socketClient.on("user_joined_room", (data: any) => {
            console.log('👤 User joined room:', data);
            setMembers((prev) => {
              const exists = prev.some(member => member.id === data.userId);
              if (!exists) {
                return [...prev, { id: data.userId, username: data.user?.username, status: 'online' }];
              }
              return prev;
            });
            setToastMessage({
              type: "success",
              text: `${data.user?.username || 'A user'} joined the room`,
            });
          });

          socketClient.on("user_left_room", (data: any) => {
            console.log('👋 User left room:', data);
            setMembers((prev) => prev.filter(member => member.id !== data.userId));
            setToastMessage({
              type: "success",
              text: `${data.user?.username || 'A user'} left the room`,
            });
          });

          // Enhanced typing indicators
          socketClient.on("user_typing", (data: any) => {
            console.log('⌨️ User typing:', data);
            
            // Don't show typing indicator for current user
            if (user && data.userId === user.id) {
              return;
            }
            
            if (data.isTyping) {
              setTypingUsers(prev => {
                const existingUser = prev.find(u => u.userId === data.userId);
                if (!existingUser && data.user) {
                  return [...prev, {
                    userId: data.userId,
                    username: data.user.username || data.user.email || 'Anonymous'
                  }];
                }
                return prev;
              });
            } else {
              setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
            }
          });

          // Presence updates
          socketClient.on("presence_update", (data: any) => {
            console.log('👥 Presence update:', data);
            setMembers((prev) => prev.map(member => 
              member.id === data.userId 
                ? { ...member, status: data.status }
                : member
            ));
          });

          // Offline messages delivery
          socketClient.on("offline_messages", (messages: any[]) => {
            console.log('📮 Offline messages received:', messages.length);
            messages.forEach(msg => {
              if (msg.roomId === roomId) {
                addMessage(roomId, msg);
              }
            });
            if (messages.length > 0) {
              setToastMessage({
                type: "success",
                text: `Received ${messages.length} offline messages`,
              });
            }
          });

          // Join the room via optimized socket
          console.log('🏠 Joining room via optimized socket:', roomId);
          socketClient.joinRoom(roomId);
          
          // Verify socket is in room
          setTimeout(() => {
            console.log('🔍 Socket connection status:', {
              connected: socketClient.isConnected(),
              currentRoom: roomId
            });
          }, 1000);
        } else {
          console.error('❌ Socket not connected, cannot set up listeners');
        }
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

    return () => {
      console.log('Cleaning up optimized socket listeners...');
      socketClient.off("new_message");
      socketClient.off("user_joined_room");
      socketClient.off("user_left_room");
      socketClient.off("room_joined");
      socketClient.off("room_messages");
      socketClient.off("message_sent");
      socketClient.off("user_typing");
      socketClient.off("presence_update");
      socketClient.off("offline_messages");
      
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user) return;

    // Check if socket is connected
    if (!socketClient.isConnected()) {
      console.error('❌ Socket not connected');
      setToastMessage({
        type: "error",
        text: "Socket not connected. Message queued for delivery.",
      });
    }

    console.log('📤 Sending message via optimized socket...', {
      roomId,
      content: messageInput,
      user: user.username,
      socketConnected: socketClient.isConnected()
    });
    
    // Generate temporary ID for optimistic UI update
    const tempId = Date.now().toString();
    
    // Optimistic UI update
    const tempMessage = {
      id: tempId,
      content: messageInput,
      roomId,
      userId: user.id,
      author: user,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: MessageType.TEXT,
      fileId: null
    };
    
    // Add message immediately for better UX
    addMessage(roomId, tempMessage);
    
    // Send message via optimized socket (with offline queueing)
    socketClient.sendMessage(roomId, messageInput, MessageType.TEXT, tempId);
    
    // Clear input immediately
    setMessageInput("");
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

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="mb-3 text-sm text-neutral">
              {typingUsers.length === 1 ? (
                <span>{typingUsers[0].username} is typing...</span>
              ) : typingUsers.length === 2 ? (
                <span>{typingUsers[0].username} and {typingUsers[1].username} are typing...</span>
              ) : (
                <span>{typingUsers.slice(0, 2).map(u => u.username).join(', ')} and {typingUsers.length - 2} more are typing...</span>
              )}
              <span className="ml-2 inline-flex space-x-1">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </span>
            </div>
          )}

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Input
              type="text"
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                
                // Trigger typing indicator
                if (e.target.value.trim()) {
                  socketClient.typingStart(roomId);
                } else {
                  socketClient.typingStop(roomId);
                }
              }}
              onBlur={() => {
                // Stop typing when input loses focus
                socketClient.typingStop(roomId);
              }}
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
