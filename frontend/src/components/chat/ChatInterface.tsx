import { useState, useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Users,
  Phone,
  Video,
  Info,
  Hash,
  Clock
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { useMessageStore } from '../../stores/messageStore';
import { socketClient } from '../../services/socket';
import { MessageType } from '../../../../shared/src/types';

interface TypingUser {
  userId: string;
  username: string;
}

export function ChatInterface() {
  const { roomId } = useParams({ from: '/room/$roomId' });
  const { user } = useAuthStore();
  const { rooms } = useRoomStore();
  const { currentRoomMessages, addMessage } = useMessageStore();
  
  const [messageInput, setMessageInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [members] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const room = rooms.find(r => r.id === roomId);
  const messages = currentRoomMessages[roomId] || [];

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event handlers
  useEffect(() => {
    if (!roomId || !socketClient.isConnected()) return;

    // Join room
    socketClient.joinRoom(roomId);

    // Message handlers
    const handleNewMessage = (message: any) => {
      if (message.roomId === roomId) {
        addMessage(roomId, message);
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

    socketClient.on('new_message', handleNewMessage);
    socketClient.on('message_sent', handleNewMessage);
    socketClient.on('user_typing', handleTyping);

    return () => {
      socketClient.off('new_message', handleNewMessage);
      socketClient.off('message_sent', handleNewMessage);
      socketClient.off('user_typing', handleTyping);
      socketClient.leaveRoom(roomId);
    };
  }, [roomId, user, addMessage]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !user) return;

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

    addMessage(roomId, tempMessage);
    socketClient.sendMessage(roomId, messageInput.trim(), MessageType.TEXT, tempId);
    setMessageInput('');
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
    socketClient.typingStop(roomId);
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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Room not found</h3>
          <p className="text-slate-600">The room you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Hash className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{room.name}</h1>
            <div className="flex items-center space-x-4 text-sm text-slate-500">
              <span>{members.length} members</span>
              {room.code && (
                <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">
                  #{room.code}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Voice Call"
          >
            <Phone className="w-5 h-5 text-slate-600" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Video Call"
          >
            <Video className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Members"
          >
            <Users className="w-5 h-5 text-slate-600" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Room Info"
          >
            <Info className="w-5 h-5 text-slate-600" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="More Options"
          >
            <MoreVertical className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Hash className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Welcome to #{room.name}</h3>
                  <p className="text-slate-600">This is the beginning of your conversation.</p>
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
                        <div className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full flex items-center space-x-1">
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
                            <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center">
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
                            <div className="text-xs text-slate-600 mb-1 px-3">
                              User {message.userId.slice(0, 8)}
                            </div>
                          )}
                          
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isOwnMessage
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                : 'bg-white border border-slate-200 text-slate-900'
                            } shadow-sm`}
                          >
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-slate-500'}`}>
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
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-600">
                        {typingUsers.length === 1 
                          ? `${typingUsers[0].username} is typing`
                          : typingUsers.length === 2
                          ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing`
                          : `${typingUsers.slice(0, 2).map(u => u.username).join(', ')} and ${typingUsers.length - 2} more are typing`
                        }
                      </span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-slate-200 px-6 py-4">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="Attach File"
              >
                <Paperclip className="w-5 h-5 text-slate-500" />
              </button>
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={`Message #${room.name.toLowerCase()}`}
                  value={messageInput}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="Emoji"
              >
                <Smile className="w-5 h-5 text-slate-500" />
              </button>
              
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Send Message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 bg-white border-l border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Members</h3>
              <p className="text-sm text-slate-500">{members.length} members</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {member.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {member.username}
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-slate-500">Online</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}