import { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Send, Loader2 } from 'lucide-react';
import { useDMStore } from '../../stores/dmStore';
import { useToastStore } from '../../stores/toastStore';
import type { FriendWithStatus, DirectMessage } from '@voiceflow/shared';
import socketClient from '../../services/socket';

interface PrivateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: FriendWithStatus | null;
}

export default function PrivateChatModal({ isOpen, onClose, friend }: PrivateChatModalProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, loadMessages, sendMessage, markAsRead } = useDMStore();
  const { error: showError } = useToastStore();

  const friendId = friend?.id || '';
  const conversationMessages = messages[friendId] || [];

  // Load messages when modal opens
  useEffect(() => {
    if (isOpen && friendId) {
      loadMessages(friendId, []);
      // Mark existing messages as read
      const existingMessages = conversationMessages;
      if (existingMessages.length > 0) {
        const messageIds = existingMessages.map(m => m.id);
        markAsRead(friendId, messageIds);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, friendId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !friendId || isSending) return;

    const messageContent = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      // Send via socket
      socketClient.emit('dm_sent', {
        receiverId: friendId,
        content: messageContent,
      });

      // Add to local store
      await sendMessage(friendId, messageContent);
    } catch (err) {
      showError('Failed to send message');
      console.error(err);
      setMessage(messageContent); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!friend) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/80 to-secondary rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm font-primary">
                {friend.username.charAt(0).toUpperCase()}
              </span>
            </div>
            {friend.isOnline && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-background-secondary" />
            )}
          </div>
          <div>
            <p className="font-bold text-primary-text font-primary">{friend.username}</p>
            <p className="text-xs text-secondary-text font-primary">
              {friend.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-[500px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background-primary rounded-lg">
          {conversationMessages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary-text font-primary">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            conversationMessages.map((msg: DirectMessage) => {
              const isMe = msg.senderId !== friendId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[70%] px-4 py-2 rounded-2xl font-primary
                      ${
                        isMe
                          ? 'bg-primary text-black rounded-br-sm'
                          : 'bg-background-tertiary text-primary-text rounded-bl-sm'
                      }
                    `}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isMe ? 'text-black/70' : 'text-secondary-text'
                      }`}
                    >
                      {formatMessageTime(msg.createdAt)}
                      {isMe && msg.isRead && ' • Read'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-base flex-1 font-primary"
            disabled={isSending}
            autoFocus
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!message.trim() || isSending}
            className="flex items-center gap-2"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </Button>
        </form>
      </div>
    </Modal>
  );
}
