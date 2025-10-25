import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  Send,
  Smile,
  Users,
  Phone,
  Hash,
  Clock,
  Mic,
  MicOff,
  PhoneOff
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { useMessageStore } from '../../stores/messageStore';
import { socketClient } from '../../services/socket';
import { apiClient } from '../../services/api';
import { MessageType } from '../../../../shared/src/types';
import EmojiPicker from '../ui/EmojiPicker';

interface TypingUser {
  userId: string;
  username: string;
}

export function ChatInterface() {
  const { roomId } = useParams({ from: '/room/$roomId' });
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { rooms, removeRoom } = useRoomStore();
  const { currentRoomMessages, addMessage, setRoomMessages, removeMessage } = useMessageStore();

  const [messageInput, setMessageInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMentionsList, setShowMentionsList] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);

  // Voice chat state (UI only for now)
  const [isInVoiceCall, setIsInVoiceCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState<string[]>([]); // Member IDs in voice call

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const room = rooms.find(r => r.id === roomId);
  const messages = Array.isArray(currentRoomMessages[roomId]) ? currentRoomMessages[roomId] : [];

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages and room data when entering room
  useEffect(() => {
    if (!roomId || !user) return;

    const loadRoomData = async () => {
      try {
        setIsLoadingMessages(true);

        // Skip API join - user is already a member if they can see this room in Dashboard
        // Socket will handle the real-time room joining for presence/messages
        console.log('[ChatInterface] Loading room data for:', roomId);

        // Load messages for this room
        const messagesResponse = await apiClient.getRoomMessages(roomId);

        if (messagesResponse.success && messagesResponse.data) {
          // Extract the messages array from the response data
          const responseData = messagesResponse.data as any;
          const messages = Array.isArray(responseData.data) ? responseData.data : responseData;
          setRoomMessages(roomId, messages);
        }

        // Load room members
        try {
          const membersResponse = await apiClient.getRoomMembers(roomId);
          if (membersResponse.success && membersResponse.data) {
            const membersData = membersResponse.data as any[];

            // Extract user data from the RoomUser structure
            const membersList = membersData.map(memberData => {
              // Handle different possible structures
              if (memberData.user) {
                return {
                  id: memberData.user.id,
                  username: memberData.user.username,
                  email: memberData.user.email,
                  joinedAt: memberData.joinedAt,
                  role: memberData.role
                };
              } else {
                // Fallback if structure is different
                return memberData;
              }
            });

            setMembers(membersList);

            // Initialize active users with ONLY the current user
            // Other users' active status will be determined by the room_presence event from server
            setActiveUsers(new Set([user.id]));
          }
        } catch (error) {
          console.warn('Failed to load room members:', error);
        }

      } catch (error) {
        console.error('Failed to load room data:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadRoomData();
  }, [roomId, user, setRoomMessages]);

  // Socket event handlers
  useEffect(() => {
    if (!roomId || !socketClient.isConnected()) return;

    // Join room via socket (this is separate from HTTP API join)
    // Socket join is for real-time events, HTTP join is for room membership
    socketClient.joinRoom(roomId);

    // Helper to ensure MessageWithAuthor shape
    const toMessageWithAuthor = (message: any) => {
      // First check if message already has author info from server
      if (message.author) {
        return {
          ...message,
          createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
          updatedAt: message.updatedAt ? new Date(message.updatedAt) : new Date(),
        };
      }

      // If message has user info from socket (socket.user)
      if (message.user) {
        return {
          ...message,
          author: {
            id: message.user.id || message.user.userId,
            username: message.user.username,
            email: message.user.email,
            avatarUrl: null,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
          updatedAt: message.updatedAt ? new Date(message.updatedAt) : new Date(),
        };
      }

      // Fallback: try to find from members list
      const findMember = members.find((m: any) => m.id === message.userId);
      const author = findMember
        ? {
          id: findMember.id,
          username: findMember.username,
          email: findMember.email,
          avatarUrl: findMember.avatarUrl || null,
          status: findMember.status || 'inactive',
          createdAt: findMember.createdAt ? new Date(findMember.createdAt) : new Date(),
          updatedAt: findMember.updatedAt ? new Date(findMember.updatedAt) : new Date(),
        }
        : {
          id: message.userId,
          username: message.userId, // Use userId as fallback instead of 'User'
          email: '',
          avatarUrl: null,
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

      return {
        ...message,
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
        updatedAt: message.updatedAt ? new Date(message.updatedAt) : new Date(),
        author,
      };
    };

    // Message handlers
    const handleNewMessage = (message: any) => {
      if (message.roomId === roomId) {
        const messageWithAuthor = toMessageWithAuthor(message);
        
        // If this is our own message, remove any temporary version first
        if (user && message.userId === user.id) {
          // Remove temp messages for this user (they start with "temp-")
          const currentMessages = currentRoomMessages[roomId] || [];
          const tempMessages = currentMessages.filter(m => m.id.startsWith('temp-') && m.userId === user.id);
          
          // Remove the most recent temp message if it has the same content
          if (tempMessages.length > 0) {
            const lastTemp = tempMessages[tempMessages.length - 1];
            if (lastTemp.content === message.content) {
              removeMessage(lastTemp.id, roomId);
            }
          }
        }
        
        addMessage(roomId, messageWithAuthor as any);
      }
    };

    const handleMessageSent = (response: any) => {
      // This event confirms message delivery and provides tempId mapping
      const messageData = response.message || response.data || response;
      const tempId = response.tempId;
      
      if (messageData && messageData.roomId === roomId) {
        // Remove the temporary message if tempId is provided
        if (tempId && tempId.startsWith('temp-')) {
          removeMessage(tempId, roomId);
        }
        
        // Add the real message (addMessage handles duplicates)
        const messageWithAuthor = toMessageWithAuthor(messageData);
        addMessage(roomId, messageWithAuthor as any);
      }
    };

    const handleTyping = (data: any) => {
      if (user && data.userId === user.id) return;

      if (data.isTyping) {
        setTypingUsers(prev => {
          const existing = prev.find(u => u.userId === data.userId);
          if (!existing && data.user) {
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
    };

    const handleUserJoinedRoom = (data: any) => {
      if (data.user) {
        setMembers(prev => {
          const existing = prev.find(m => m.id === data.user.id);
          if (!existing) {
            return [...prev, {
              id: data.user.id,
              username: data.user.username,
              email: data.user.email,
              role: 'member'
            }];
          }
          return prev;
        });
        // Add user to active users
        setActiveUsers(prev => new Set([...prev, data.user.id]));
      }
    };

    const handleUserLeftRoom = (data: any) => {
      // DON'T remove the user from members list - just mark them as inactive
      // Only remove from active users set
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      setActiveUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    const handlePresenceUpdate = (data: any) => {
      if (data.userId && data.status) {
        // Immediately update active users for real-time feedback
        setActiveUsers(prev => {
          const newSet = new Set(prev);
          if (data.status === 'active' || data.status === 'away') {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });

        // Also update member status if they're in the members list
        setMembers(prev => prev.map(member =>
          member.id === data.userId
            ? { ...member, status: data.status }
            : member
        ));
      }
    };

    const handleRoomPresenceUpdate = (data: any) => {
      if (data.users && Array.isArray(data.users)) {
        // Update active users based on room presence data
        const activeUserIds = data.users
          .filter((userPresence: any) =>
            userPresence.status === 'active' ||
            userPresence.status === 'away'
          )
          .map((userPresence: any) => userPresence.userId as string);

        // Always update active users - removed comparison check that was causing stale data
        setActiveUsers(new Set<string>(activeUserIds));

        // Also merge any new users into the members list
        const usersWithInfo = data.users.map((userPresence: any) => ({
          id: userPresence.userId,
          username: userPresence.username || userPresence.userId,
          email: userPresence.email || '',
          status: userPresence.status
        }));

        // Merge with existing members, prioritizing existing data
        setMembers(prev => {
          const existingMap = new Map(prev.map(m => [m.id, m]));
          let hasChanges = false;

          usersWithInfo.forEach((u: any) => {
            if (!existingMap.has(u.id)) {
              existingMap.set(u.id, u);
              hasChanges = true;
            }
          });

          // Only update if there are actual changes
          return hasChanges ? Array.from(existingMap.values()) : prev;
        });
      }
    };

    // Handle initial room presence when joining
    const handleRoomPresence = (data: any) => {
      if (data.users && Array.isArray(data.users)) {
        // Set active users based on initial room presence data
        const activeUserIds = data.users
          .filter((userPresence: any) =>
            userPresence.status === 'active' ||
            userPresence.status === 'away'
          )
          .map((userPresence: any) => userPresence.userId);

        setActiveUsers(new Set(activeUserIds));

        // Update members list with presence information
        const usersWithInfo = data.users.map((userPresence: any) => ({
          id: userPresence.userId,
          username: userPresence.username || userPresence.userId,
          email: userPresence.email || '',
          status: userPresence.status
        }));

        // Merge with existing members, prioritizing existing data
        setMembers(prev => {
          const existingMap = new Map(prev.map(m => [m.id, m]));
          usersWithInfo.forEach((u: any) => {
            if (!existingMap.has(u.id)) {
              existingMap.set(u.id, u);
            }
          });
          return Array.from(existingMap.values());
        });
      }
    };

    // Register event listeners
    socketClient.on('new_message', handleNewMessage);
    socketClient.on('message_sent', handleMessageSent);
    socketClient.on('user_typing', handleTyping);
    socketClient.on('user_joined_room', handleUserJoinedRoom);
    socketClient.on('user_left_room', handleUserLeftRoom);
    socketClient.on('presence_update', handlePresenceUpdate);
    socketClient.on('user_status_changed', handlePresenceUpdate); // Also listen to direct status changes
    socketClient.on('room_presence_update', handleRoomPresenceUpdate);
    socketClient.on('room_presence', handleRoomPresence); // Handle initial presence

    return () => {
      // Clean up event listeners
      socketClient.off('new_message', handleNewMessage);
      socketClient.off('message_sent', handleMessageSent);
      socketClient.off('user_typing', handleTyping);
      socketClient.off('user_joined_room', handleUserJoinedRoom);
      socketClient.off('user_left_room', handleUserLeftRoom);
      socketClient.off('presence_update', handlePresenceUpdate);
      socketClient.off('user_status_changed', handlePresenceUpdate); // Clean up status change handler
      socketClient.off('room_presence_update', handleRoomPresenceUpdate);
      socketClient.off('room_presence', handleRoomPresence); // Clean up initial presence handler

      // Leave room and stop typing
      socketClient.typingStop(roomId);
      socketClient.leaveRoom(roomId);
    };
  }, [roomId, user, addMessage, removeMessage, currentRoomMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() || !user || !roomId) return;

    const tempId = `temp-${Date.now()}`;
    const messageContent = messageInput.trim();
    
    const tempMessage = {
      id: tempId,
      content: messageContent,
      roomId,
      userId: user.id,
      author: user,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: MessageType.TEXT,
      fileId: null
    };

    // Add optimistic message immediately (with temp- prefix to avoid conflicts)
    addMessage(roomId, tempMessage);

    // Send via socket with tempId for mapping
    socketClient.sendMessage(roomId, messageContent, MessageType.TEXT, tempId);

    // Clear input and stop typing
    setMessageInput('');
    socketClient.typingStop(roomId);

    // Close emoji picker when sending message
    setShowEmojiPicker(false);

    // Focus input for better UX
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    // Check for @ mention
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1 && lastAtSymbol === cursorPos - 1) {
      // Just typed @
      setShowMentionsList(true);
      setMentionStartPos(lastAtSymbol);
      setMentionSearchQuery('');
    } else if (lastAtSymbol !== -1 && mentionStartPos !== null) {
      // Typing after @
      const query = textBeforeCursor.substring(lastAtSymbol + 1);
      if (query.includes(' ')) {
        // Space typed - close mentions
        setShowMentionsList(false);
        setMentionStartPos(null);
      } else {
        setMentionSearchQuery(query);
      }
    } else {
      setShowMentionsList(false);
      setMentionStartPos(null);
    }

    if (value.trim()) {
      socketClient.typingStart(roomId);
    } else {
      socketClient.typingStop(roomId);
    }
  };

  const handleMentionSelect = (username: string) => {
    if (mentionStartPos === null) return;

    const beforeMention = messageInput.substring(0, mentionStartPos);
    const afterMention = messageInput.substring(mentionStartPos + mentionSearchQuery.length + 1);
    const newValue = `${beforeMention}@${username} ${afterMention}`;

    setMessageInput(newValue);
    setShowMentionsList(false);
    setMentionStartPos(null);
    setMentionSearchQuery('');

    // Focus input
    inputRef.current?.focus();
  };

  // Filter members for mentions (exclude current user)
  const mentionableMembers = members.filter(m => m.id !== user?.id);
  const filteredMentions = mentionSearchQuery
    ? mentionableMembers.filter(m =>
      m.username?.toLowerCase().includes(mentionSearchQuery.toLowerCase())
    )
    : mentionableMembers;

  const handleInputBlur = () => {
    // Small delay to allow form submission to complete
    setTimeout(() => {
      socketClient.typingStop(roomId);
    }, 100);
  };

  const handleEmojiSelect = (emoji: string) => {
    const newValue = messageInput + emoji;
    setMessageInput(newValue);
    // Don't close picker - user can select multiple emojis

    // Focus input and trigger typing
    inputRef.current?.focus();
    if (newValue.trim()) {
      socketClient.typingStart(roomId);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    }).format(messageDate);
  };

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-zinc-50 via-neutral-50 to-stone-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Hash className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-black mb-3">Room not found</h3>
          <p className="text-neutral-600">The room you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-zinc-50 via-neutral-50 to-stone-50">
      {/* Chat Header - Sticky */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-neutral-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-black rounded-xl flex items-center justify-center shadow-md">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-black">{room.name}</h1>
            <div className="flex items-center space-x-3 text-sm text-neutral-500">
              <span className="font-medium">{members.length} members</span>
              {room.code && (
                <span className="inline-flex items-center px-2.5 py-1 bg-neutral-900 text-white rounded-md text-xs font-semibold tracking-wide shadow-sm">
                  #{room.code}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">

          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-2.5 rounded-xl transition-all ${showMembers
                ? 'bg-black text-white shadow-md'
                : 'hover:bg-neutral-100 text-neutral-700'
              }`}
            title="Members"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={async () => {
              if (!roomId || !user) return;

              try {
                // Leave the room via API
                await apiClient.leaveRoom(roomId);

                // Leave the room via socket
                socketClient.leaveRoom(roomId);

                // Remove the room from local store
                removeRoom(roomId);

                // Navigate to home page
                navigate({ to: '/' });
              } catch (error) {
                console.error('Failed to leave room:', error);
                // Still navigate away even if API call fails
                navigate({ to: '/' });
              }
            }}
            className="px-4 py-2 bg-black text-white rounded-xl hover:bg-neutral-800 transition-all text-sm font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20"
            title="Leave Room"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0 bg-white/50">
          {/* Messages Container - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Hash className="w-10 h-10 text-neutral-400" />
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">Welcome to #{room?.name || 'room'}</h3>
                  <p className="text-neutral-600">This is the beginning of your conversation.</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = user && message.userId === user.id;
                const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1].userId !== message.userId);
                const showDate = index === 0 || formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);
                
                // Check if current user is mentioned in the message
                const isMentioned = user && !isOwnMessage && (
                  message.content.includes(`@${user.username}`) || 
                  message.content.includes(`@${user.email}`) ||
                  message.content.includes('@everyone')
                );

                return (
                  <div key={message.id}>
                    {/* Date Divider */}
                    {showDate && (
                      <div className="flex items-center justify-center py-6">
                        <div className="bg-neutral-100 text-neutral-700 text-xs font-semibold px-4 py-2 rounded-full flex items-center space-x-2 shadow-sm border border-neutral-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(message.createdAt)}</span>
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1`}>
                      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-lg`}>
                        {/* Avatar */}
                        {!isOwnMessage && (
                          <div className={`w-9 h-9 flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="w-9 h-9 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-xl flex items-center justify-center shadow-sm">
                              <span className="text-sm font-bold text-white">
                                {message.author?.username?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`${isOwnMessage ? 'ml-2' : 'mr-2'}`}>
                          {/* Author name for other users */}
                          {!isOwnMessage && showAvatar && (
                            <div className="text-xs font-semibold text-neutral-700 mb-1.5 px-4">
                              {message.author?.username || 'Anonymous User'}
                            </div>
                          )}

                          <div
                            className={`px-5 py-3.5 rounded-2xl ${
                              isOwnMessage
                                ? 'bg-black text-white shadow-lg shadow-black/10'
                                : isMentioned
                                ? 'bg-green-50 border-2 border-green-300 text-neutral-900 shadow-lg shadow-green-500/30 ring-2 ring-green-400/20 animate-pulse-slow'
                                : 'bg-white border-2 border-neutral-200 text-neutral-900 shadow-sm'
                            }`}
                          >
                            <p className="text-[15px] leading-relaxed">{message.content}</p>
                            <div className={`text-[11px] mt-2 font-medium ${isOwnMessage ? 'text-neutral-400' : 'text-neutral-500'}`}>
                              {formatTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center space-x-3 max-w-lg">
                  <div className="w-9 h-9 bg-neutral-100 rounded-xl flex items-center justify-center border border-neutral-200">
                    <div className="w-2 h-2 bg-neutral-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="bg-white border-2 border-neutral-200 px-5 py-3.5 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-neutral-700 font-medium">
                        {typingUsers.length === 1
                          ? `${typingUsers[0].username} is typing`
                          : typingUsers.length === 2
                            ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing`
                            : `${typingUsers.slice(0, 2).map(u => u.username).join(', ')} and ${typingUsers.length - 2} more are typing`
                        }
                      </span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t-2 border-neutral-200 px-6 py-5 relative shadow-lg">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Message #${room?.name?.toLowerCase() || 'room'}`}
                  value={messageInput}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="w-full px-5 py-3.5 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-black placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all font-medium"
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-3 rounded-xl transition-all ${showEmojiPicker
                    ? 'bg-neutral-900 text-white shadow-lg'
                    : 'hover:bg-neutral-100 text-neutral-600'
                  }`}
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="p-3 rounded-xl bg-black text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20"
                title="Send Message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>

            {/* Mentions Dropdown */}
            {showMentionsList && (
              <div className="absolute bottom-24 left-6 bg-white border-2 border-neutral-200 rounded-2xl shadow-2xl max-h-72 overflow-y-auto w-72 z-50">
                {/* @everyone option */}
                <button
                  type="button"
                  onClick={() => handleMentionSelect('everyone')}
                  className="w-full px-4 py-3.5 flex items-center space-x-3 hover:bg-neutral-50 transition-all border-b border-neutral-100 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    @
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold text-black group-hover:text-neutral-700 transition-colors">everyone</div>
                    <div className="text-xs text-neutral-500">Mention all members</div>
                  </div>
                </button>

                {/* Filtered members */}
                {filteredMentions.length > 0 ? (
                  filteredMentions.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleMentionSelect(member.username || '')}
                      className="w-full px-4 py-3.5 flex items-center space-x-3 hover:bg-neutral-50 transition-all group"
                    >
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {member.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${member.isOnline ? 'bg-green-500' : 'bg-neutral-400'
                          }`}></div>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-black group-hover:text-neutral-700 transition-colors">{member.username}</div>
                        <div className="text-xs text-neutral-500 font-medium">
                          {member.isOnline ? 'Active' : 'Offline'}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center text-neutral-500 text-sm font-medium">
                    No members found
                  </div>
                )}
              </div>
            )}

            {/* Emoji Picker */}
            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onEmojiSelect={handleEmojiSelect}
              position={{ bottom: 70, right: 20 }}
            />

            {/* Loading indicator */}
            {isLoadingMessages && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                <div className="bg-neutral-100 text-neutral-600 text-xs px-3 py-1 rounded-full flex items-center space-x-2">
                  <div className="w-3 h-3 border border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading messages...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-80 bg-gradient-to-b from-white to-neutral-50 border-l-2 border-neutral-200 flex flex-col shadow-2xl">
            {/* Members List Section */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-5 border-b-2 border-neutral-200 bg-white">
                <h3 className="text-xl font-bold text-black mb-1">Members</h3>
                <p className="text-sm text-neutral-600 font-medium">{members.length} online</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                {members.map((member) => {
                  const isActive = activeUsers.has(member.id);
                  const inVoice = voiceParticipants.includes(member.id);
                  return (
                    <div key={member.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white transition-all group border border-transparent hover:border-neutral-200 hover:shadow-sm">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-sm font-bold text-white">
                            {member.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${isActive ? 'bg-green-500' : 'bg-neutral-400'
                          }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-semibold text-black truncate group-hover:text-neutral-700 transition-colors">
                            {member.username}
                          </div>
                          {inVoice && (
                            <div className="flex items-center bg-green-50 px-1.5 py-0.5 rounded-md">
                              <Phone className="w-3 h-3 text-green-700" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-neutral-400'
                            }`}></div>
                          <span className="text-xs text-neutral-500 font-medium">
                            {isActive ? 'Active' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voice Chat Section */}
            <div className="border-t-2 border-neutral-200 bg-white">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-black">Voice Chat</h4>
                  {isInVoiceCall && (
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      <span>Connected</span>
                    </div>
                  )}
                </div>

                {/* Voice Controls */}
                <div className="space-y-2.5">
                  {!isInVoiceCall ? (
                    <button
                      onClick={() => {
                        setIsInVoiceCall(true);
                        setVoiceParticipants([...voiceParticipants, user?.id || '']);
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-semibold text-sm shadow-lg shadow-green-600/20 hover:shadow-xl hover:shadow-green-600/30"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Join Voice Call</span>
                    </button>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Mute/Unmute and Leave buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold shadow-sm ${isMuted
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 border-2 border-red-200'
                              : 'bg-neutral-100 text-black hover:bg-neutral-200 border-2 border-neutral-200'
                            }`}
                        >
                          {isMuted ? (
                            <>
                              <MicOff className="w-4 h-4" />
                              <span>Unmute</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-4 h-4" />
                              <span>Mute</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsInVoiceCall(false);
                            setIsMuted(false);
                            setVoiceParticipants(voiceParticipants.filter(id => id !== user?.id));
                          }}
                          className="px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-lg shadow-red-600/20"
                          title="Leave Voice Call"
                        >
                          <PhoneOff className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Voice Participants */}
                      {voiceParticipants.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-bold text-black mb-2.5">
                            In Call ({voiceParticipants.length})
                          </div>
                          <div className="space-y-1.5 max-h-28 overflow-y-auto">
                            {members
                              .filter(m => voiceParticipants.includes(m.id))
                              .map((member) => (
                                <div key={member.id} className="flex items-center space-x-2.5 p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                                  <div className="w-7 h-7 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-lg flex items-center justify-center shadow-sm">
                                    <span className="text-xs font-bold text-white">
                                      {member.username?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                  <span className="text-xs text-black flex-1 truncate font-medium">
                                    {member.username}
                                    {member.id === user?.id && ' (You)'}
                                  </span>
                                  <div className="flex items-center">
                                    {member.id === user?.id && isMuted ? (
                                      <MicOff className="w-3 h-3 text-red-600" />
                                    ) : (
                                      <Mic className="w-3 h-3 text-green-600" />
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}