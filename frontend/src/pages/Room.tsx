import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mic, MicOff } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import { apiClient } from '../services/api';
import { socketClient } from '../services/socket';
import { useAuthStore } from '../stores/authStore';
import { useMessageStore } from '../stores/messageStore';
import type { FunctionComponent } from '../common/types';

export default function Room(): FunctionComponent {
  const roomId = 'default-room'; // Mock roomId
  const user = useAuthStore((state) => state.user);
  const { messages, addMessage } = useMessageStore();
  const [messageInput, setMessageInput] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Room data
  const { data: roomData = {} } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      try {
        const response = await apiClient.getRoomById(roomId);
        return response.data;
      } catch {
        return { name: 'Sample Room', description: 'Welcome to the chat room' };
      }
    },
  });

  // Room members
  const { data: membersData = [] } = useQuery({
    queryKey: ['roomMembers', roomId],
    queryFn: async () => {
      try {
        const response = await apiClient.getRoomMembers(roomId);
        return response.data;
      } catch {
        return [];
      }
    },
  });

  // Initial messages
  useQuery({
    queryKey: ['roomMessages', roomId],
    queryFn: async () => {
      try {
        const response = await apiClient.getRoomMessages(roomId, 1, 50);
        return response.data;
      } catch {
        return [];
      }
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!messageInput.trim()) return;
      const response = await apiClient.sendMessage({
        roomId,
        content: messageInput,
        type: 'text',
      });
      return response.data;
    },
    onSuccess: () => {
      setMessageInput('');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socketClient.typingStop(roomId);
    },
  });

  // Socket listeners
  useEffect(() => {
    if (!roomId) return;

    // Listen for new messages
    socketClient.onMessageReceive((message) => {
      if (message.roomId === roomId) {
        // Ensure message has an author (MessageWithAuthor) before adding to store
        const findMember = (membersData as any[]).find((m: any) => m.id === message.userId);

        const author = findMember
          ? {
              id: findMember.id,
              username: findMember.username || 'User',
              email: findMember.email || '',
              avatarUrl: findMember.avatarUrl || null,
              status: findMember.status || 'inactive',
              createdAt: findMember.createdAt ? new Date(findMember.createdAt) : new Date(),
              updatedAt: findMember.updatedAt ? new Date(findMember.updatedAt) : new Date(),
            }
          : {
              id: message.userId,
              username: 'User',
              email: '',
              avatarUrl: null,
              status: 'inactive',
              createdAt: new Date(),
              updatedAt: new Date(),
            };

        const messageWithAuthor = {
          ...message,
          createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
          updatedAt: message.updatedAt ? new Date(message.updatedAt) : new Date(),
          author,
        };

        addMessage(roomId, messageWithAuthor as any);
      }
    });

    // Listen for typing
    socketClient.onUserTyping(({ userId }) => {
      if (userId !== user?.id) {
        setTypingUsers((prev) => new Set([...prev, userId]));
      }
    });

    socketClient.onUserStoppedTyping(({ userId }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    // Join voice room
    socketClient.joinVoiceRoom(roomId);

    return () => {
      socketClient.leaveVoiceRoom(roomId);
    };
  }, [roomId, user?.id, addMessage]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessageMutation.mutate();
    }
  };

  const handleTyping = (value: string) => {
    setMessageInput(value);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    socketClient.typingStart(roomId);

    typingTimeoutRef.current = setTimeout(() => {
      socketClient.typingStop(roomId);
    }, 3000);
  };

  const typingUsersArray = Array.from(typingUsers);

  return (
    <div className="h-screen flex flex-col bg-primary-50">
      {/* Header */}
      <header className="bg-white border-b border-primary-100 flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-primary-950 font-serif">
              {(roomData as any)?.name || 'Room'}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-primary-600 font-mono">
                {(membersData as any)?.length || 0} members active
              </p>
              {(roomData as any)?.code && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary-600 font-mono">Room Code:</span>
                  <span className="inline-block px-2 py-1 bg-primary-100 text-primary-900 rounded text-xs font-mono font-bold">
                    {(roomData as any).code}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText((roomData as any).code)}
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

          <div className="flex items-center gap-4">
            <Button
              variant={isVoiceActive ? 'danger' : 'primary'}
              size="sm"
              onClick={() => setIsVoiceActive(!isVoiceActive)}
            >
              {isVoiceActive ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Mute
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Unmute
                </>
              )}
            </Button>

            <button className="text-primary-600 hover:text-primary-950">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.5 1.5H3a2 2 0 00-2 2v15a2 2 0 002 2h10.5m.75-21v21m0-21h6.75a2 2 0 012 2v15a2 2 0 01-2 2h-6.75"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-primary-600 font-mono">No messages yet. Start a conversation!</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <Avatar
                    initials="U"
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-bold text-primary-950">
                        User
                      </p>
                      <time className="text-xs font-mono text-primary-600">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </time>
                    </div>
                    <p className="text-sm text-primary-950 mt-1">{message.content}</p>
                  </div>
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {typingUsersArray.length > 0 && (
              <div className="flex gap-3 text-primary-600 font-mono text-sm">
                <span>{typingUsersArray.join(', ')} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-primary-100 bg-white p-4 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => handleTyping(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="primary" isLoading={sendMessageMutation.isPending}>
                Send
              </Button>
            </form>
          </div>
        </div>

        {/* Members Sidebar */}
        <div className="hidden lg:flex flex-col w-64 bg-white border-l border-primary-100 overflow-y-auto">
          <div className="p-4 border-b border-primary-100">
            <h3 className="text-sm font-bold text-primary-950 font-mono">Members</h3>
          </div>
          <div className="p-4 space-y-3">
            {(membersData as any)?.map((member: any) => (
              <div key={member.id} className="flex items-center gap-2">
                <Avatar
                  initials={member.username?.substring(0, 2).toUpperCase()}
                  size="sm"
                  status={member.status || 'inactive'}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-bold text-primary-950 truncate">
                    {member.username}
                  </p>
                  <p className="text-xs font-mono text-primary-600">{member.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
