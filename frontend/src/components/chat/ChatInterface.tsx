import { useState, useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { 
  Send, 
  Smile, 
  Users,
  Phone,
  Video,
  Hash,
  Clock
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
  const { user } = useAuthStore();
  const { rooms } = useRoomStore();
  const { currentRoomMessages, addMessage, setRoomMessages, setLoading } = useMessageStore();
  
  const [messageInput, setMessageInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const room = rooms.find(r => r.id === roomId);
  const messages = Array.isArray(currentRoomMessages[roomId]) ? currentRoomMessages[roomId] : [];
  
  // Debug logging
  console.log('Current room messages for', roomId, ':', currentRoomMessages[roomId]);
  console.log('Messages array:', messages);
  console.log('Messages length:', messages.length);

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
        
        // Load messages for this room
        console.log('Loading messages for room:', roomId);
        const messagesResponse = await apiClient.getRoomMessages(roomId);
        
        if (messagesResponse.success && messagesResponse.data) {
          console.log('Messages loaded:', messagesResponse.data);
          // Extract the messages array from the response data
          const responseData = messagesResponse.data as any;
          const messages = Array.isArray(responseData.data) ? responseData.data : responseData;
          setRoomMessages(roomId, messages);
        }

        // Load room members
        try {
          const membersResponse = await apiClient.getRoomMembers(roomId);
          if (membersResponse.success && membersResponse.data) {
            setMembers(membersResponse.data as any[]);
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

    console.log('Setting up socket handlers for room:', roomId);

    // Join room
    socketClient.joinRoom(roomId);

    // Message handlers
    const handleNewMessage = (message: any) => {
      console.log('Received new message:', message);
      if (message.roomId === roomId) {
        addMessage(roomId, message);
      }
    };

    const handleMessageSent = (response: any) => {
      console.log('Message sent confirmation:', response);
      if (response.success && response.data && response.data.roomId === roomId) {
        // Update the temporary message with the real one from server
        addMessage(roomId, response.data);
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
      console.log('User joined room:', data);
      if (data.user) {
        setMembers(prev => {
          const existing = prev.find(m => m.id === data.user.id);
          if (!existing) {
            return [...prev, data.user];
          }
          return prev;
        });
      }
    };

    const handleUserLeftRoom = (data: any) => {
      console.log('User left room:', data);
      setMembers(prev => prev.filter(m => m.id !== data.userId));
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    };

    // Register event listeners
    socketClient.on('new_message', handleNewMessage);
    socketClient.on('message_sent', handleMessageSent);
    socketClient.on('user_typing', handleTyping);
    socketClient.on('user_joined_room', handleUserJoinedRoom);
    socketClient.on('user_left_room', handleUserLeftRoom);

    return () => {
      // Clean up event listeners
      socketClient.off('new_message', handleNewMessage);
      socketClient.off('message_sent', handleMessageSent);
      socketClient.off('user_typing', handleTyping);
      socketClient.off('user_joined_room', handleUserJoinedRoom);
      socketClient.off('user_left_room', handleUserLeftRoom);
      
      // Leave room and stop typing
      socketClient.typingStop(roomId);
      socketClient.leaveRoom(roomId);
    };
  }, [roomId, user, addMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !user || !roomId) {
      console.log('Cannot send message: missing data', {
        hasInput: !!messageInput.trim(),
        hasUser: !!user,
        hasRoomId: !!roomId
      });
      return;
    }

    console.log('Sending message:', messageInput.trim());

    const tempId = Date.now().toString();
    const tempMessage = {
      id: tempId,
      content: messageInput.trim(),
      roomId,
      userId: user.id,
      author: user,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: MessageType.TEXT,
      fileId: null
    };

    // Add optimistic message immediately
    addMessage(roomId, tempMessage);
    
    // Send via socket
    socketClient.sendMessage(roomId, messageInput.trim(), MessageType.TEXT, tempId);
    
    // Clear input and stop typing
    setMessageInput('');
    socketClient.typingStop(roomId);
    
    // Focus input for better UX
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (e.target.value.trim()) {
      socketClient.typingStart(roomId);
    } else {
      socketClient.typingStop(roomId);
    }
  };

  const handleInputBlur = () => {
    // Small delay to allow form submission to complete
    setTimeout(() => {
      socketClient.typingStop(roomId);
    }, 100);
  };

  const handleEmojiSelect = (emoji: string) => {
    const newValue = messageInput + emoji;
    setMessageInput(newValue);
    setShowEmojiPicker(false);
    
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
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Room not found</h3>
          <p className="text-neutral-600">The room you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center">
            <Hash className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{room.name}</h1>
            <div className="flex items-center space-x-4 text-sm text-neutral-500">
              <span>{members.length} members</span>
              {room.code && (
                <span className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs font-mono">
                  #{room.code}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            title="Voice Call"
          >
            <Phone className="w-5 h-5 text-neutral-600" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            title="Video Call"
          >
            <Video className="w-5 h-5 text-neutral-600" />
          </button>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            title="Members"
          >
            <Users className="w-5 h-5 text-neutral-600" />
          </button>
          <button
            onClick={() => {
              // Navigate back to dashboard
              window.history.back();
            }}
            className="px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
            title="Leave Room"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
            <div className="flex flex-col space-y-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Hash className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">Welcome to #{room?.name || 'room'}</h3>
                    <p className="text-neutral-600">This is the beginning of your conversation.</p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => {
                const isOwnMessage = user && message.userId === user.id;
                const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1].userId !== message.userId);
                const showDate = index === 0 || formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);
                
                return (
                  <div key={message.id}>
                    {/* Date Divider */}
                    {showDate && (
                      <div className="flex items-center justify-center py-4">
                        <div className="bg-neutral-100 text-neutral-600 text-xs px-3 py-1 rounded-full flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(message.createdAt)}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Message */}
                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
                      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-lg`}>
                        {/* Avatar */}
                        {!isOwnMessage && (
                          <div className={`w-8 h-8 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="w-8 h-8 bg-neutral-600 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-white">
                                {message.userId?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Message Bubble */}
                        <div className={`${isOwnMessage ? 'ml-2' : 'mr-2'}`}>
                          {/* Author name for other users */}
                          {!isOwnMessage && showAvatar && (
                            <div className="text-xs text-neutral-600 mb-1 px-3">
                              User {message.userId.slice(0, 8)}
                            </div>
                          )}
                          
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isOwnMessage
                                ? 'bg-neutral-900 text-white'
                                : 'bg-white border border-neutral-200 text-neutral-900'
                            } shadow-sm`}
                          >
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            <div className={`text-xs mt-1 ${isOwnMessage ? 'text-neutral-300' : 'text-neutral-500'}`}>
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
                <div className="flex items-center space-x-2 max-w-lg">
                  <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="bg-white border border-neutral-200 px-4 py-3 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-neutral-600">
                        {typingUsers.length === 1 
                          ? `${typingUsers[0].username} is typing`
                          : typingUsers.length === 2
                          ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing`
                          : `${typingUsers.slice(0, 2).map(u => u.username).join(', ')} and ${typingUsers.length - 2} more are typing`
                        }
                      </span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

          {/* Message Input */}
          <div className="bg-white border-t border-neutral-200 px-6 py-4 relative">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Message #${room?.name?.toLowerCase() || 'room'}`}
                  value={messageInput}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent transition-all"
                  autoComplete="off"
                />
              </div>
              
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-lg transition-colors ${
                  showEmojiPicker ? 'bg-neutral-100 text-neutral-700' : 'hover:bg-neutral-100'
                }`}
                title="Emoji"
              >
                <Smile className="w-5 h-5 text-neutral-500" />
              </button>
              
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="p-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Send Message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>

            {/* Emoji Picker */}
            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onEmojiSelect={handleEmojiSelect}
              position={{ bottom: 80, right: 60 }}
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
          <div className="w-64 bg-white border-l border-neutral-200 flex flex-col">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900">Members</h3>
              <p className="text-sm text-neutral-500">{members.length} members</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-neutral-50">
                  <div className="w-8 h-8 bg-neutral-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {member.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-900 truncate">
                      {member.username}
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-neutral-500">Online</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    
  );
}