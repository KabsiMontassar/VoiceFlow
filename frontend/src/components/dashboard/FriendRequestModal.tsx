import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { UserPlus, UserMinus, Clock, CheckCircle } from 'lucide-react';
import { useFriendStore } from '../../stores/friendStore';
import { useToastStore } from '../../stores/toastStore';
import type { FriendRequest } from '@valero/shared';

interface FriendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendRequestModal({ isOpen, onClose }: FriendRequestModalProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [loadingRequest, setLoadingRequest] = useState<string | null>(null);
  
  const {
    pendingRequests,
    sentRequests,
    loadPendingRequests,
    loadSentRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
  } = useFriendStore();
  
  const { success, error: showError } = useToastStore();

  // Load requests when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPendingRequests();
      loadSentRequests();
    }
  }, [isOpen, loadPendingRequests, loadSentRequests]);

  const handleAccept = async (requestId: string) => {
    setLoadingRequest(requestId);
    try {
      await acceptFriendRequest(requestId);
      success('Friend request accepted!');
      loadPendingRequests();
    } catch (err) {
      showError('Failed to accept friend request');
      console.error(err);
    } finally {
      setLoadingRequest(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setLoadingRequest(requestId);
    try {
      await rejectFriendRequest(requestId);
      success('Friend request rejected');
      loadPendingRequests();
    } catch (err) {
      showError('Failed to reject friend request');
      console.error(err);
    } finally {
      setLoadingRequest(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setLoadingRequest(requestId);
    try {
      await cancelFriendRequest(requestId);
      success('Friend request cancelled');
      loadSentRequests();
    } catch (err) {
      showError('Failed to cancel friend request');
      console.error(err);
    } finally {
      setLoadingRequest(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Friend Requests">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-subtle">
          <button
            onClick={() => setActiveTab('received')}
            className={`
              px-4 py-2 font-primary font-medium transition-colors relative
              ${
                activeTab === 'received'
                  ? 'text-primary'
                  : 'text-secondary-text hover:text-primary-text'
              }
            `}
          >
            Received
            {pendingRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-black rounded-full">
                {pendingRequests.length}
              </span>
            )}
            {activeTab === 'received' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`
              px-4 py-2 font-primary font-medium transition-colors relative
              ${
                activeTab === 'sent'
                  ? 'text-primary'
                  : 'text-secondary-text hover:text-primary-text'
              }
            `}
          >
            Sent
            {sentRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-secondary/20 text-secondary-text rounded-full">
                {sentRequests.length}
              </span>
            )}
            {activeTab === 'sent' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Received Requests */}
        {activeTab === 'received' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-muted-text mx-auto mb-3" />
                <p className="text-secondary-text font-primary">
                  No pending friend requests
                </p>
              </div>
            ) : (
              pendingRequests.map((request: FriendRequest) => (
                <div
                  key={request.id}
                  className="card p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/80 to-secondary rounded-full flex items-center justify-center">
                      <span className="text-black font-bold font-primary">
                        {request.sender?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-primary-text font-primary">
                        {request.sender?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-secondary-text font-primary">
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAccept(request.id)}
                      disabled={loadingRequest === request.id}
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReject(request.id)}
                      disabled={loadingRequest === request.id}
                      className="flex items-center gap-1"
                    >
                      <UserMinus className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sent Requests */}
        {activeTab === 'sent' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sentRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-text mx-auto mb-3" />
                <p className="text-secondary-text font-primary">
                  No pending sent requests
                </p>
              </div>
            ) : (
              sentRequests.map((request: FriendRequest) => (
                <div
                  key={request.id}
                  className="card p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/80 to-secondary rounded-full flex items-center justify-center">
                      <span className="text-black font-bold font-primary">
                        {request.receiver?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-primary-text font-primary">
                        {request.receiver?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-secondary-text font-primary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending • {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(request.id)}
                    disabled={loadingRequest === request.id}
                    className="flex items-center gap-1"
                  >
                    <UserMinus className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
