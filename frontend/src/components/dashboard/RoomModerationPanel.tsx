import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Shield, UserMinus, Ban, Unlock, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';
import type { RoomBan } from '@voiceflow/shared';

interface RoomModerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  isAdmin: boolean;
}

export default function RoomModerationPanel({
  isOpen,
  onClose,
  roomId,
  isAdmin,
}: RoomModerationPanelProps) {
  const [activeTab, setActiveTab] = useState<'kick' | 'ban' | 'bans'>('kick');
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bans, setBans] = useState<RoomBan[]>([]);
  const [loadingBans, setLoadingBans] = useState(false);
  
  const { success, error: showError } = useToastStore();

  // Load bans when modal opens on bans tab
  useEffect(() => {
    if (isOpen && activeTab === 'bans') {
      loadBans();
    }
  }, [isOpen, activeTab]);

  const loadBans = async () => {
    if (!isAdmin) return;
    
    setLoadingBans(true);
    try {
      const response = await apiClient.getRoomBans(roomId);
      if (response.success && response.data) {
        setBans(response.data as RoomBan[]);
      }
    } catch (err) {
      showError('Failed to load bans');
      console.error(err);
    } finally {
      setLoadingBans(false);
    }
  };

  const handleKick = async () => {
    if (!userId.trim() || !isAdmin) return;

    setIsLoading(true);
    try {
      const response = await apiClient.kickUserFromRoom(roomId, userId, reason);
      if (response.success) {
        success(`User kicked successfully`);
        setUserId('');
        setReason('');
      } else {
        showError('Failed to kick user');
      }
    } catch (err) {
      showError('Failed to kick user');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBan = async () => {
    if (!userId.trim() || !isAdmin) return;

    setIsLoading(true);
    try {
      const response = await apiClient.banUserFromRoom(roomId, userId, reason);
      if (response.success) {
        success(`User banned successfully`);
        setUserId('');
        setReason('');
        loadBans(); // Refresh ban list
      } else {
        showError('Failed to ban user');
      }
    } catch (err) {
      showError('Failed to ban user');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnban = async (bannedUserId: string) => {
    if (!isAdmin) return;

    try {
      const response = await apiClient.unbanUserFromRoom(roomId, bannedUserId);
      if (response.success) {
        success('User unbanned successfully');
        loadBans(); // Refresh ban list
      } else {
        showError('Failed to unban user');
      }
    } catch (err) {
      showError('Failed to unban user');
      console.error(err);
    }
  };

  if (!isAdmin) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Room Moderation">
        <div className="text-center py-8">
          <Shield className="w-16 h-16 text-muted-text mx-auto mb-4" />
          <p className="text-secondary-text font-primary">
            You must be a room admin to access moderation tools
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Room Moderation">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-subtle">
          <button
            onClick={() => setActiveTab('kick')}
            className={`
              px-4 py-2 font-primary font-medium transition-colors relative
              ${
                activeTab === 'kick'
                  ? 'text-primary'
                  : 'text-secondary-text hover:text-primary-text'
              }
            `}
          >
            <UserMinus className="w-4 h-4 inline mr-2" />
            Kick User
            {activeTab === 'kick' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('ban')}
            className={`
              px-4 py-2 font-primary font-medium transition-colors relative
              ${
                activeTab === 'ban'
                  ? 'text-primary'
                  : 'text-secondary-text hover:text-primary-text'
              }
            `}
          >
            <Ban className="w-4 h-4 inline mr-2" />
            Ban User
            {activeTab === 'ban' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bans')}
            className={`
              px-4 py-2 font-primary font-medium transition-colors relative
              ${
                activeTab === 'bans'
                  ? 'text-primary'
                  : 'text-secondary-text hover:text-primary-text'
              }
            `}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Ban List
            {bans.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-error/20 text-error rounded-full">
                {bans.length}
              </span>
            )}
            {activeTab === 'bans' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Kick Tab */}
        {activeTab === 'kick' && (
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-sm text-secondary-text font-primary">
                Kicking removes a user temporarily. They can rejoin unless banned.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input-base w-full font-primary"
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-base w-full font-primary resize-none"
                rows={3}
                placeholder="Enter reason for kicking..."
              />
            </div>
            <Button
              variant="primary"
              onClick={handleKick}
              disabled={!userId.trim() || isLoading}
              className="w-full flex items-center justify-center gap-2"
            >
              <UserMinus className="w-4 h-4" />
              {isLoading ? 'Kicking...' : 'Kick User'}
            </Button>
          </div>
        )}

        {/* Ban Tab */}
        {activeTab === 'ban' && (
          <div className="space-y-4">
            <div className="bg-error/10 border border-error/30 rounded-lg p-3 flex items-start gap-2">
              <Ban className="w-5 h-5 text-error mt-0.5 flex-shrink-0" />
              <p className="text-sm text-secondary-text font-primary">
                Banning permanently prevents a user from rejoining this room.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input-base w-full font-primary"
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                Reason (Recommended)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-base w-full font-primary resize-none"
                rows={3}
                placeholder="Enter reason for ban..."
              />
            </div>
            <Button
              variant="primary"
              onClick={handleBan}
              disabled={!userId.trim() || isLoading}
              className="w-full flex items-center justify-center gap-2 bg-error hover:bg-error/90"
            >
              <Ban className="w-4 h-4" />
              {isLoading ? 'Banning...' : 'Ban User'}
            </Button>
          </div>
        )}

        {/* Bans List Tab */}
        {activeTab === 'bans' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loadingBans ? (
              <div className="text-center py-8">
                <p className="text-secondary-text font-primary">Loading bans...</p>
              </div>
            ) : bans.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-muted-text mx-auto mb-3" />
                <p className="text-secondary-text font-primary">
                  No banned users
                </p>
              </div>
            ) : (
              bans.map((ban: RoomBan) => (
                <div
                  key={ban.id}
                  className="card p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-error/80 to-error/60 rounded-full flex items-center justify-center">
                        <Ban className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-primary-text font-primary">
                          User ID: {ban.userId}
                        </p>
                        <p className="text-xs text-secondary-text font-primary">
                          Banned by: {ban.bannedBy}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnban(ban.userId)}
                      className="flex items-center gap-1"
                    >
                      <Unlock className="w-4 h-4" />
                      Unban
                    </Button>
                  </div>
                  {ban.reason && (
                    <p className="text-sm text-secondary-text font-primary pl-13">
                      Reason: {ban.reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-text font-primary pl-13">
                    {new Date(ban.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
