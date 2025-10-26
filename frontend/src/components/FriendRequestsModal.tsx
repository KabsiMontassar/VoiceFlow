import { Check, X, Bell } from 'lucide-react';
import { useFriendStore } from '../stores/friendStore';
import Avatar from './ui/Avatar';
import { useEffect } from 'react';
// import type { FriendRequest } from '../../../shared/src/types';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FriendRequestsModal({ isOpen, onClose }: FriendRequestsModalProps) {
  const { pendingRequests, loadPendingRequests, acceptFriendRequest, rejectFriendRequest } = useFriendStore();

  useEffect(() => {
    if (isOpen) {
      loadPendingRequests();
    }
  }, [isOpen, loadPendingRequests]);

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      await loadPendingRequests(); // Refresh the list
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      await loadPendingRequests(); // Refresh the list
    } catch (error) {
      console.error('Failed to decline friend request:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fadeIn flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="w-full max-w-md mx-4 bg-background-secondary border border-default rounded-2xl shadow-2xl shadow-black/50 z-[9999] animate-scaleIn overflow-hidden max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-subtle flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary-text font-primary">Friend Requests</h3>
                <p className="text-xs text-secondary-text font-primary">
                  {pendingRequests.length} {pendingRequests.length === 1 ? 'request' : 'requests'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-background-tertiary text-secondary-text hover:text-primary-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
          {pendingRequests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-muted-text" />
              </div>
              <p className="text-secondary-text font-primary">No pending friend requests</p>
            </div>
          ) : (
            <div className="divide-y divide-subtle">
              {pendingRequests.map((request) => (
                <div 
                  key={request.id}
                  className="p-4 hover:bg-background-tertiary/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Avatar
                      avatarId={request.sender?.avatarUrl}
                      initials={request.sender?.username?.charAt(0).toUpperCase()}
                      size="md"
                      status={request.sender?.status === 'active' ? 'active' : 'inactive'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-primary-text font-primary font-semibold truncate">
                        {request.sender?.username || 'Unknown User'}
                      </div>
                      <div className="text-xs text-secondary-text font-primary truncate">
                        {request.sender?.email || ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-success/10 hover:bg-success/20 text-success border border-success/20 rounded-lg transition-all font-primary font-medium"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleDecline(request.id)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-error/10 hover:bg-error/20 text-error border border-error/20 rounded-lg transition-all font-primary font-medium"
                    >
                      <X className="w-4 h-4" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
}
