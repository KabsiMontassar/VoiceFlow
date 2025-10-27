import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  Send,
  Smile,
  Users,
  Hash,
  Clock,
  Phone,
  Mic,
  MicOff,
  PhoneOff,
  Headphones,
  Volume2,
  ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { useMessageStore } from '../../stores/messageStore';
import { useWebRTCStore } from '../../stores/webrtcStore';
import { socketClient } from '../../services/socket';
import { apiClient } from '../../services/api';
import { MessageType } from '../../../../shared/src/types';
import EmojiPicker from '../ui/EmojiPicker';
import Avatar from '../ui/Avatar';

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
  
  // WebRTC Store for voice chat
  const { 
    currentRoomId,
    isMuted,
    isDeafened,
    voiceParticipants,
    audioInputDevices,
    audioOutputDevices,
    selectedInputDevice,
    selectedOutputDevice,
    localAudioLevel,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    toggleDeafen,
    selectInputDevice,
    selectOutputDevice,
    testMicrophone,
  } = useWebRTCStore();
  
  // Check if user is in voice chat for this room
  const isInVoiceCall = currentRoomId === roomId;

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const room = rooms.find(r => r.id === roomId);
  const messages = Array.isArray(currentRoomMessages[roomId]) ? currentRoomMessages[roomId] : [];

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Debug: Log active users changes
  useEffect(() => {
    console.log('[ChatInterface] Active users changed:', Array.from(activeUsers));
  }, [activeUsers]);

  // Scroll when typing indicator appears
  useEffect(() => {
    if (typingUsers.length > 0) {
      scrollToBottom();
    }
  }, [typingUsers]);

  // Load messages and room data when entering room
  useEffect(() => {
    if (!roomId || !user) return;

    const loadRoomData = async () => {
      try {
        // Check if we already have messages cached
        const cachedMessages = currentRoomMessages[roomId];
        const hasCachedMessages = cachedMessages && cachedMessages.length > 0;

        if (hasCachedMessages) {
          console.log('[ChatInterface] Using cached messages for:', roomId);
          setIsLoadingMessages(false);
          // Don't skip - still need to load members!
        } else {
          setIsLoadingMessages(true);
          console.log('[ChatInterface] Loading room data for:', roomId);
        }

        // Always load members, but only load messages if not cached
        const requests = [apiClient.getRoomMembers(roomId)];
        if (!hasCachedMessages) {
          requests.unshift(apiClient.getRoomMessages(roomId));
        }

        const responses = await Promise.all(requests);
        
        // Process responses based on what we requested
        let messagesResponse, membersResponse;
        if (hasCachedMessages) {
          membersResponse = responses[0];
        } else {
          messagesResponse = responses[0];
          membersResponse = responses[1];
        }

        // Process messages (only if not using cache)
        if (messagesResponse && messagesResponse.success && messagesResponse.data) {
          const responseData = messagesResponse.data as any;
          const messages = Array.isArray(responseData.data) ? responseData.data : responseData;
          setRoomMessages(roomId, messages);
        }

        // Process members (always)
        if (membersResponse && membersResponse.success && membersResponse.data) {
          const membersData = membersResponse.data as any[];

          // Extract user data from the RoomUser structure
          const membersList = membersData.map(memberData => {
            // Handle different possible structures
            if (memberData.user) {
              return {
                id: memberData.user.id,
                username: memberData.user.username,
                email: memberData.user.email,
                avatarUrl: memberData.user.avatarUrl,
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
        console.error('Failed to load room data:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadRoomData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

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
            avatarUrl: message.user.avatarUrl || null,
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
          username: 'Unknown User', // Better fallback than userId
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
        
        // OPTIMIZED: Since server now excludes sender from broadcast,
        // this handler only receives messages from OTHER users
        addMessage(roomId, messageWithAuthor as any);
      }
    };

    const handleMessageSent = (response: any) => {
      // This event confirms OUR OWN message was sent successfully
      const messageData = response.message || response.data || response;
      const tempId = response.tempId;
      
      if (messageData && messageData.roomId === roomId) {
        // Remove the temporary optimistic message
        if (tempId && tempId.startsWith('temp-')) {
          removeMessage(tempId, roomId);
        }
        
        // Add the confirmed message from server
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
              avatarUrl: data.user.avatarUrl,
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
      console.log('[ChatInterface] Received room_presence_update event:', data);
      if (data.users && Array.isArray(data.users)) {
        // Update active users based on room presence data
        const activeUserIds = data.users
          .filter((userPresence: any) =>
            userPresence.status === 'active' ||
            userPresence.status === 'away'
          )
          .map((userPresence: any) => userPresence.userId as string);

        console.log('[ChatInterface] Updating active users to:', activeUserIds);
        // CRITICAL FIX: Always update active users without comparison
        // This ensures real-time presence updates are reflected immediately
        setActiveUsers(new Set<string>(activeUserIds));

        // Also merge any new users into the members list
        const usersWithInfo = data.users.map((userPresence: any) => ({
          id: userPresence.userId,
          username: userPresence.username || userPresence.userId,
          email: userPresence.email || '',
          avatarUrl: userPresence.avatarUrl || null,
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
      console.log('[ChatInterface] Received room_presence event:', data);
      if (data.users && Array.isArray(data.users)) {
        // Set active users based on initial room presence data
        const activeUserIds = data.users
          .filter((userPresence: any) =>
            userPresence.status === 'active' ||
            userPresence.status === 'away'
          )
          .map((userPresence: any) => userPresence.userId);

        console.log('[ChatInterface] Setting active users:', activeUserIds);
        setActiveUsers(new Set(activeUserIds));

        // Update members list with presence information
        const usersWithInfo = data.users.map((userPresence: any) => ({
          id: userPresence.userId,
          username: userPresence.username || userPresence.userId,
          email: userPresence.email || '',
          avatarUrl: userPresence.avatarUrl || null,
          status: userPresence.status
        }));
        console.log('[ChatInterface] Users with info:', usersWithInfo);

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
    // Note: user_status_changed removed - status is now managed by auth service
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
      // Note: user_status_changed removed - status is now managed by auth service
      socketClient.off('room_presence_update', handleRoomPresenceUpdate);
      socketClient.off('room_presence', handleRoomPresence); // Clean up initial presence handler

      // Leave room and stop typing
      socketClient.typingStop(roomId);
      socketClient.leaveRoom(roomId);
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() || !user || !roomId) return;

    // Use consistent tempId based on user ID for easy removal
    const tempId = `temp-${user.id}`;
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
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

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

    // Debounced typing indicator - only send after 300ms of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      socketClient.typingStart(roomId);
      
      // Auto-stop typing after 3 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        socketClient.typingStop(roomId);
      }, 3000);
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
      <div className="flex-1 flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <div className="w-20 h-20 bg-background-tertiary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-default">
            <Hash className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-primary-text mb-3">Room not found</h3>
          <p className="text-secondary-text">The room you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background-primary">
      {/* Chat Header - Sticky */}
      <div className="sticky top-0 z-10 bg-background-secondary/80 backdrop-blur-xl border-b border-default px-6 py-4 flex items-center justify-between shadow-lg shadow-black/5">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-gradient-to-br from-primary/80 to-secondary rounded-xl flex items-center justify-center shadow-md">
            <Hash className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-text">{room.name}</h1>
            <div className="flex items-center space-x-3 text-sm text-secondary-text">
              <span className="font-primary font-medium">{members.length} members</span>
              {room.code && (
                <button
                  onClick={async (e) => {
                    try {
                      await navigator.clipboard.writeText(room.code!);
                      // Show a visual indicator that it was copied
                      const button = e.currentTarget;
                      const codeSpan = button.querySelector('span');
                      if (codeSpan) {
                        const originalText = codeSpan.textContent;
                        codeSpan.textContent = 'Copied!';
                        setTimeout(() => {
                          codeSpan.textContent = originalText || '';
                        }, 2000);
                      }
                    } catch (error) {
                      console.error('Failed to copy room code:', error);
                    }
                  }}
                  className="inline-flex items-center px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-primary font-semibold tracking-wide hover:bg-primary/20 hover:border-primary/30 transition-all cursor-pointer active:scale-95"
                  title="Click to copy room code"
                >
                  <span>#{room.code}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-2.5 rounded-xl transition-all ${showMembers
                ? 'bg-primary text-black shadow-md'
                : 'hover:bg-background-tertiary text-secondary-text'
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
            className="btn-primary text-sm shadow-lg shadow-primary/10"
            title="Leave Room"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0 bg-background-secondary/30">
          {/* Messages Container - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="w-20 h-20 bg-background-tertiary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-default">
                    <Hash className="w-10 h-10 text-muted-text" />
                  </div>
                  <h3 className="text-xl font-bold text-primary-text mb-3">Welcome to #{room?.name || 'room'}</h3>
                  <p className="text-secondary-text">This is the beginning of your conversation.</p>
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
                        <div className="bg-background-tertiary text-secondary-text text-xs font-primary font-semibold px-4 py-2 rounded-full flex items-center space-x-2 shadow-sm border border-default">
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
                            <Avatar
                              avatarId={message.author?.avatarUrl}
                              initials={message.author?.username?.charAt(0).toUpperCase() || 'U'}
                              size="sm"
                            />
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`${isOwnMessage ? 'ml-2' : 'mr-2'}`}>
                          {/* Author name for other users */}
                          {!isOwnMessage && showAvatar && (
                            <div className="text-xs font-primary font-semibold text-secondary-text mb-1.5 px-4">
                              {message.author?.username || 'Anonymous User'}
                            </div>
                          )}

                          <div
                            className={`px-5 py-3.5 rounded-2xl ${
                              isOwnMessage
                                ? 'bg-primary text-black shadow-lg shadow-primary/10'
                                : isMentioned
                                ? 'bg-secondary/20 border-2 border-secondary text-primary-text shadow-lg shadow-secondary/30 ring-2 ring-secondary/20 animate-pulse-slow'
                                : 'bg-background-tertiary border border-subtle text-primary-text shadow-sm'
                            }`}
                          >
                            <p className="text-[15px] leading-relaxed font-primary">{message.content}</p>
                            <div className={`text-[11px] mt-2 font-primary font-medium ${isOwnMessage ? 'text-black/60' : 'text-secondary-text'}`}>
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
                  <div className="w-9 h-9 bg-background-tertiary rounded-xl flex items-center justify-center border border-default">
                    <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                  </div>
                  <div className="bg-background-tertiary border border-subtle px-5 py-3.5 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-secondary-text font-primary font-medium">
                        {typingUsers.length === 1
                          ? `${typingUsers[0].username} is typing`
                          : typingUsers.length === 2
                            ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing`
                            : `${typingUsers.slice(0, 2).map(u => u.username).join(', ')} and ${typingUsers.length - 2} more are typing`
                        }
                      </span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
          <div className="bg-background-secondary border-t border-default px-6 py-5 relative shadow-lg shadow-black/5">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Message #${room?.name?.toLowerCase() || 'room'}`}
                  value={messageInput}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="input-base w-full font-primary"
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-3 rounded-xl transition-all ${showEmojiPicker
                    ? 'bg-primary text-black shadow-lg'
                    : 'hover:bg-background-tertiary text-secondary-text'
                  }`}
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="p-3 rounded-xl bg-primary text-black hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20"
                title="Send Message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>

            {/* Mentions Dropdown */}
            {showMentionsList && (
              <div className="absolute bottom-24 left-6 bg-background-tertiary border border-default rounded-2xl shadow-2xl max-h-72 overflow-y-auto w-72 z-50">
                {/* @everyone option */}
                <button
                  type="button"
                  onClick={() => handleMentionSelect('everyone')}
                  className="w-full px-4 py-3.5 flex items-center space-x-3 hover:bg-background-secondary transition-all border-b border-subtle group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary/60 to-primary/80 flex items-center justify-center text-black font-bold text-sm shadow-md">
                    @
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-primary font-bold text-primary-text group-hover:text-primary transition-colors">everyone</div>
                    <div className="text-xs font-primary text-secondary-text">Mention all members</div>
                  </div>
                </button>

                {/* Filtered members */}
                {filteredMentions.length > 0 ? (
                  filteredMentions.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleMentionSelect(member.username || '')}
                      className="w-full px-4 py-3.5 flex items-center space-x-3 hover:bg-background-secondary transition-all group"
                    >
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary/60 to-primary/80 flex items-center justify-center text-black font-bold text-sm shadow-sm">
                          {member.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background-tertiary shadow-sm ${member.isOnline ? 'bg-success' : 'bg-muted-text'
                          }`}></div>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-primary font-semibold text-primary-text group-hover:text-primary transition-colors">{member.username}</div>
                        <div className="text-xs font-primary text-secondary-text font-medium">
                          {member.isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center text-secondary-text text-sm font-primary font-medium">
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
                <div className="bg-background-tertiary text-secondary-text text-xs px-3 py-1 rounded-full flex items-center space-x-2 border border-default">
                  <div className="w-3 h-3 border border-secondary border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-primary">Loading messages...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Members Sidebar with smooth transition */}
        <div className={`bg-background-secondary border-l border-default flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${
          showMembers ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
        }`}>
          {showMembers && (
            <>
            {/* Members List Section */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-5 border-b border-default bg-background-tertiary/50">
                <h3 className="text-xl font-bold text-primary-text mb-1">Members</h3>
                <p className="text-sm text-secondary-text font-primary font-medium">{members.length} online</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                {members.map((member) => {
                  const isActive = activeUsers.has(member.id);
                  const voiceParticipant = voiceParticipants.find(p => p.userId === member.id);
                  const inVoice = !!voiceParticipant;
                  const isSpeaking = voiceParticipant?.isSpeaking || false;
                  const isMemberMuted = voiceParticipant?.isMuted || false;
                  const isMemberDeafened = voiceParticipant?.isDeafened || false;
                  
                  return (
                    <div key={member.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-background-tertiary transition-all group border border-transparent hover:border-subtle hover:shadow-sm">
                      <div className="relative">
                        {/* Speaking indicator ring */}
                        {isSpeaking && (
                          <div className="absolute inset-0 rounded-full border-2 border-success animate-pulse"></div>
                        )}
                        <Avatar
                          avatarId={member.avatarUrl || undefined}
                          initials={member.username?.charAt(0).toUpperCase() || 'U'}
                          size="md"
                          status={isActive ? 'active' : 'inactive'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-primary font-semibold text-primary-text truncate group-hover:text-primary transition-colors">
                            {member.username}
                          </div>
                          {inVoice && (
                            <div className="flex items-center space-x-1">
                              {/* Voice status badge */}
                              <div className={`flex items-center px-1.5 py-0.5 rounded-md border ${
                                isSpeaking 
                                  ? 'bg-success/20 border-success/40' 
                                  : 'bg-success/10 border-success/20'
                              }`}>
                                {isMemberMuted ? (
                                  <MicOff className="w-3 h-3 text-muted-text" />
                                ) : isSpeaking ? (
                                  <Mic className="w-3 h-3 text-success animate-pulse" />
                                ) : (
                                  <Phone className="w-3 h-3 text-success" />
                                )}
                              </div>
                              {isMemberDeafened && (
                                <Headphones className="w-3 h-3 text-muted-text" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success' : 'bg-muted-text'
                            }`}></div>
                          <span className="text-xs font-primary text-secondary-text font-medium">
                            {isActive ? 'Online' : 'Offline'}
                          </span>
                          {isSpeaking && (
                            <span className="text-xs font-primary font-semibold text-success">
                              • Speaking
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voice Chat Section */}
            <div className="border-t border-default bg-background-tertiary/50">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-primary font-bold text-primary-text">Voice Chat</h4>
                  {isInVoiceCall && (
                    <div className="flex items-center space-x-1.5 text-xs font-primary font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                      <span>Connected</span>
                    </div>
                  )}
                </div>

                {/* Voice Controls */}
                <div className="space-y-2.5">
                  {!isInVoiceCall ? (
                    <>
                      {/* Device Selection Before Join */}
                      <div className="space-y-2">
                        {/* Input Device Selector */}
                        <div className="relative">
                          <label className="text-xs font-primary font-semibold text-secondary-text mb-1.5 flex items-center space-x-1.5">
                            <Mic className="w-3 h-3" />
                            <span>Microphone</span>
                          </label>
                          <select
                            value={selectedInputDevice || ''}
                            onChange={(e) => selectInputDevice(e.target.value)}
                            className="w-full px-3 py-2 bg-background-secondary border border-subtle rounded-lg text-sm font-primary text-primary-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer"
                          >
                            {audioInputDevices.length > 0 ? (
                              audioInputDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                </option>
                              ))
                            ) : (
                              <option value="">No microphones found</option>
                            )}
                          </select>
                          <ChevronDown className="absolute right-3 top-8 w-4 h-4 text-secondary-text pointer-events-none" />
                        </div>

                        {/* Output Device Selector */}
                        <div className="relative">
                          <label className="text-xs font-primary font-semibold text-secondary-text mb-1.5 flex items-center space-x-1.5">
                            <Volume2 className="w-3 h-3" />
                            <span>Output</span>
                          </label>
                          <select
                            value={selectedOutputDevice || ''}
                            onChange={(e) => selectOutputDevice(e.target.value)}
                            className="w-full px-3 py-2 bg-background-secondary border border-subtle rounded-lg text-sm font-primary text-primary-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer"
                          >
                            {audioOutputDevices.length > 0 ? (
                              audioOutputDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                                </option>
                              ))
                            ) : (
                              <option value="">Default output</option>
                            )}
                          </select>
                          <ChevronDown className="absolute right-3 top-8 w-4 h-4 text-secondary-text pointer-events-none" />
                        </div>
                      </div>

                      {/* Test Microphone Button */}
                      <button
                        onClick={testMicrophone}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-background-tertiary hover:bg-background-secondary text-secondary-text hover:text-primary-text rounded-lg transition-all font-primary font-medium text-xs border border-default"
                      >
                        <Mic className="w-3 h-3" />
                        <span>Test Microphone</span>
                      </button>

                      {/* Join Button */}
                      <button
                        onClick={() => joinVoiceRoom(roomId)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary hover:bg-primary/80 text-black rounded-xl transition-all font-primary font-semibold text-sm shadow-lg shadow-success/20 hover:shadow-xl hover:shadow-success/30"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Join Voice Chat</span>
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Mute, Deafen, and Leave buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Mute Button */}
                        <button
                          onClick={toggleMute}
                          className={`flex flex-col items-center justify-center px-3 py-2.5 rounded-xl transition-all text-xs font-primary font-semibold shadow-sm ${
                            isMuted
                              ? 'bg-error/10 text-error hover:bg-error/20 border border-error/20'
                              : 'bg-background-tertiary text-primary-text hover:bg-background-secondary border border-default'
                          }`}
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? <MicOff className="w-4 h-4 mb-1" /> : <Mic className="w-4 h-4 mb-1" />}
                          <span className="text-[10px]">{isMuted ? 'Muted' : 'Mute'}</span>
                        </button>

                        {/* Deafen Button */}
                        <button
                          onClick={toggleDeafen}
                          className={`flex flex-col items-center justify-center px-3 py-2.5 rounded-xl transition-all text-xs font-primary font-semibold shadow-sm ${
                            isDeafened
                              ? 'bg-error/10 text-error hover:bg-error/20 border border-error/20'
                              : 'bg-background-tertiary text-primary-text hover:bg-background-secondary border border-default'
                          }`}
                          title={isDeafened ? 'Undeafen' : 'Deafen'}
                        >
                          <Headphones className="w-4 h-4 mb-1" />
                          <span className="text-[10px]">{isDeafened ? 'Deaf' : 'Deafen'}</span>
                        </button>

                        {/* Leave Button */}
                        <button
                          onClick={leaveVoiceRoom}
                          className="flex flex-col items-center justify-center px-3 py-2.5 bg-error hover:bg-error/80 text-white rounded-xl transition-all shadow-lg shadow-error/20"
                          title="Leave Voice Chat"
                        >
                          <PhoneOff className="w-4 h-4 mb-1" />
                          <span className="text-[10px]">Leave</span>
                        </button>
                      </div>

                      {/* Microphone Input Level Indicator */}
                      <div className="mt-3 px-3 py-2.5 bg-background-tertiary rounded-xl border border-default">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-primary font-semibold text-secondary-text">
                            {isMuted ? 'Microphone Muted' : 'Microphone Input'}
                          </span>
                          {!isMuted && localAudioLevel > 0.1 && (
                            <span className="text-xs font-primary font-semibold text-success animate-pulse">
                              Speaking
                            </span>
                          )}
                        </div>
                        {/* Audio Level Bar */}
                        <div className="relative w-full h-2 bg-background-secondary rounded-full overflow-hidden">
                          <div 
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-100 ${
                              isMuted 
                                ? 'bg-muted-text/30' 
                                : localAudioLevel > 0.1 
                                  ? 'bg-success' 
                                  : 'bg-primary/50'
                            }`}
                            style={{ 
                              width: `${isMuted ? 0 : Math.min(localAudioLevel * 100, 100)}%` 
                            }}
                          />
                        </div>
                        {/* Debug info */}
                        {!isMuted && (
                          <div className="mt-1 text-[10px] text-muted-text font-mono">
                            Level: {(localAudioLevel * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>

                      {/* Voice Participants */}
                      {voiceParticipants.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-primary font-bold text-primary-text mb-2.5">
                            In Call ({voiceParticipants.length})
                          </div>
                          <div className="space-y-1.5 max-h-28 overflow-y-auto">
                            {voiceParticipants.map((participant) => (
                              <div key={participant.userId} className="flex items-center space-x-2.5 p-2 rounded-lg bg-background-tertiary border border-default">
                                <div className="w-7 h-7 bg-gradient-to-br from-secondary/60 to-primary/80 rounded-lg flex items-center justify-center shadow-sm">
                                  <span className="text-xs font-bold text-black">
                                    {participant.username?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <span className="text-xs font-primary text-primary-text flex-1 truncate font-medium">
                                  {participant.username}
                                  {participant.userId === user?.id && ' (You)'}
                                </span>
                                <div className="flex items-center space-x-1">
                                  {participant.isDeafened && (
                                    <Headphones className="w-3 h-3 text-error" />
                                  )}
                                  {participant.isMuted ? (
                                    <MicOff className="w-3 h-3 text-error" />
                                  ) : (
                                    <Mic className="w-3 h-3 text-success" />
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
            </>
          )}
          </div>
      </div>
    </div>
  );
}