import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  MessageCircle, 
  Settings as SettingsIcon,
  Plus,
  Search,
  Circle,
  Mail
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';
import { useFriendStore } from '../stores/friendStore';
import { useToastStore } from '../stores/toastStore';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import CreateRoomModal from '../components/dashboard/CreateRoomModal';
import JoinRoomModal from '../components/dashboard/JoinRoomModal';
import FriendRequestModal from '../components/dashboard/FriendRequestModal';
import PrivateChatModal from '../components/dashboard/PrivateChatModal';
import { FriendCardSkeleton } from '../components/ui/LoadingSkeleton';
import { apiClient } from '../services/api';
import type { FriendWithStatus } from '@voiceflow/shared';

type DashboardView = 'friends' | 'profile' | 'requests';

export default function NewDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<DashboardView>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toast notifications
  const { success, error: showError } = useToastStore();
  
  // Get friends from store
  const { 
    friends, 
    pendingRequests,
    // sentRequests,
    isLoading: friendsLoading,
    loadFriends,
    loadPendingRequests,
    loadSentRequests,
    sendFriendRequest: sendRequest,
    // acceptFriendRequest,
    // rejectFriendRequest,
    // removeFriend
  } = useFriendStore();
  
  // Load friends on mount
  useEffect(() => {
    loadFriends();
    loadPendingRequests();
    loadSentRequests();
  }, [loadFriends, loadPendingRequests, loadSentRequests]);
  
  // Room modals state
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  
  // Friend request state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  
  // Private chat state
  const [showPrivateChat, setShowPrivateChat] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendWithStatus | null>(null);

  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    age: '',
    country: '',
    gender: '' as 'male' | 'female' | ''
  });

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineFriends = filteredFriends.filter(f => f.isOnline);
  const offlineFriends = filteredFriends.filter(f => !f.isOnline);

  const handleSendFriendRequest = async () => {
    if (!friendCode.trim()) return;
    
    try {
      setIsAddingFriend(true);
      await sendRequest(friendCode);
      success('Friend request sent!');
      setFriendCode('');
      setShowAddFriend(false);
    } catch (error) {
      console.error('Failed to send friend request:', error);
      showError('Failed to send friend request. Please check the friend code and try again.');
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    try {
      setIsCreatingRoom(true);
      const response = await apiClient.createRoom({
        name: roomName,
        description: '',
        maxUsers: 50
      });
      
      if (response.success && response.data) {
        const room = response.data as { id: string };
        success(`Room "${roomName}" created successfully!`);
        setShowCreateRoom(false);
        setRoomName('');
        navigate({ to: `/room/${room.id}` });
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      showError('Failed to create room. Please try again.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    try {
      setIsJoiningRoom(true);
      const response = await apiClient.joinRoomByCode(roomCode);
      
      if (response.success && response.data) {
        const room = response.data as { id: string };
        success('Successfully joined room!');
        setShowJoinRoom(false);
        setRoomCode('');
        navigate({ to: `/room/${room.id}` });
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      showError('Failed to join room. Please check the code and try again.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleUpdateProfile = () => {
    // TODO: Implement API call
    console.log('Updating profile:', profileData);
  };

  const handleStartPrivateChat = (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (friend) {
      setSelectedFriend(friend);
      setShowPrivateChat(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background-primary">
      {/* Header */}
      <div className="bg-background-secondary border-b border-default px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary-text font-primary">
              {currentView === 'friends' && 'Friends'}
              {currentView === 'profile' && 'Profile Settings'}
              {currentView === 'requests' && 'Friend Requests'}
            </h1>
            <p className="text-secondary-text text-sm font-primary mt-1">
              {currentView === 'friends' && `${onlineFriends.length} online • ${offlineFriends.length} offline`}
              {currentView === 'profile' && 'Manage your account settings and preferences'}
              {currentView === 'requests' && 'Pending friend requests'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentView === 'friends' && pendingRequests.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFriendRequests(true)}
                className="flex items-center gap-2 relative"
              >
                <Mail className="w-4 h-4" />
                Requests
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-black rounded-full text-xs font-bold flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateRoom(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowJoinRoom(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Join Room
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentView('friends')}
            className={`px-4 py-2 rounded-lg font-primary font-medium transition-colors ${
              currentView === 'friends'
                ? 'bg-primary text-black'
                : 'text-secondary-text hover:text-primary-text hover:bg-background-tertiary'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Friends
          </button>
          <button
            onClick={() => setCurrentView('profile')}
            className={`px-4 py-2 rounded-lg font-primary font-medium transition-colors ${
              currentView === 'profile'
                ? 'bg-primary text-black'
                : 'text-secondary-text hover:text-primary-text hover:bg-background-tertiary'
            }`}
          >
            <SettingsIcon className="w-4 h-4 inline mr-2" />
            Profile
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Friends View */}
        {currentView === 'friends' && (
          <div className="max-w-6xl mx-auto">
            {/* Search and Add Friend */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-text" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-base w-full pl-10 font-primary"
                />
              </div>
              <Button
                variant="primary"
                onClick={() => setShowAddFriend(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Friend
              </Button>
            </div>

            {/* Online Friends */}
            {friendsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FriendCardSkeleton />
                <FriendCardSkeleton />
                <FriendCardSkeleton />
              </div>
            ) : onlineFriends.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-primary-text font-primary mb-4 flex items-center gap-2">
                  <Circle className="w-3 h-3 fill-success text-success" />
                  Online — {onlineFriends.length}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onlineFriends.map((friend) => (
                    <FriendCard
                      key={friend.id}
                      friend={friend}
                      onStartChat={handleStartPrivateChat}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Offline Friends */}
            {!friendsLoading && offlineFriends.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-primary-text font-primary mb-4 flex items-center gap-2">
                  <Circle className="w-3 h-3 fill-muted-text text-muted-text" />
                  Offline — {offlineFriends.length}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offlineFriends.map((friend) => (
                    <FriendCard
                      key={friend.id}
                      friend={friend}
                      onStartChat={handleStartPrivateChat}
                    />
                  ))}
                </div>
              </div>
            )}

            {!friendsLoading && filteredFriends.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-muted-text mx-auto mb-4" />
                <h3 className="text-xl font-bold text-primary-text mb-2 font-primary">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </h3>
                <p className="text-secondary-text mb-6 font-primary">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Start by adding some friends to your network'}
                </p>
                {!searchQuery && (
                  <Button variant="primary" onClick={() => setShowAddFriend(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Your First Friend
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profile Settings View */}
        {currentView === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-6 space-y-6">
              {/* Account Information */}
              <div>
                <h3 className="text-lg font-bold text-primary-text font-primary mb-4">
                  Account Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                      Username
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="input-base w-full font-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="input-base w-full font-primary"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div className="pt-6 border-t border-subtle">
                <h3 className="text-lg font-bold text-primary-text font-primary mb-4">
                  Change Password
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                      className="input-base w-full font-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                      className="input-base w-full font-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                      className="input-base w-full font-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="pt-6 border-t border-subtle">
                <h3 className="text-lg font-bold text-primary-text font-primary mb-4">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                      Age
                    </label>
                    <input
                      type="number"
                      value={profileData.age}
                      onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                      className="input-base w-full font-primary"
                      placeholder="Enter your age"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                      Country
                    </label>
                    <input
                      type="text"
                      value={profileData.country}
                      onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                      className="input-base w-full font-primary"
                      placeholder="Enter your country"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
                      Gender
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={profileData.gender === 'male'}
                          onChange={(e) => setProfileData({ ...profileData, gender: e.target.value as 'male' })}
                          className="w-4 h-4 text-primary bg-background-tertiary border-default focus:ring-primary"
                        />
                        <span className="text-primary-text font-primary">Male</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={profileData.gender === 'female'}
                          onChange={(e) => setProfileData({ ...profileData, gender: e.target.value as 'female' })}
                          className="w-4 h-4 text-primary bg-background-tertiary border-default focus:ring-primary"
                        />
                        <span className="text-primary-text font-primary">Female</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-6 border-t border-subtle">
                <Button variant="primary" onClick={handleUpdateProfile}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        roomName={roomName}
        setRoomName={setRoomName}
        onSubmit={handleCreateRoom}
        isLoading={isCreatingRoom}
      />
      <JoinRoomModal
        isOpen={showJoinRoom}
        onClose={() => setShowJoinRoom(false)}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        onSubmit={handleJoinRoom}
        isLoading={isJoiningRoom}
      />
      <FriendRequestModal
        isOpen={showFriendRequests}
        onClose={() => setShowFriendRequests(false)}
      />
      <PrivateChatModal
        isOpen={showPrivateChat}
        onClose={() => {
          setShowPrivateChat(false);
          setSelectedFriend(null);
        }}
        friend={selectedFriend}
      />

      {/* Add Friend Modal */}
      <Modal
        isOpen={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        title="Add Friend"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-text mb-2 font-primary">
              Friend Code
            </label>
            <input
              type="text"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              className="input-base w-full font-primary uppercase"
              placeholder="ABC-DEF-GHI-J"
              maxLength={13}
              autoFocus
            />
            <p className="text-xs text-secondary-text/70 mt-1">
              Enter your friend's 12-character code
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowAddFriend(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSendFriendRequest} disabled={!friendCode || isAddingFriend}>
              {isAddingFriend ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Friend Card Component - moved to top
interface FriendCardPropsSecond {
  friend: FriendWithStatus;
  onStartChat: (friendId: string) => void;
}

function FriendCard({ friend, onStartChat }: FriendCardPropsSecond) {
  return (
    <div className="card p-4 hover:shadow-lg hover:shadow-primary/10 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/80 to-secondary rounded-full flex items-center justify-center shadow-sm">
              <span className="text-black font-bold text-lg font-primary">
                {friend.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background-tertiary ${
                friend.isOnline ? 'bg-success' : 'bg-muted-text'
              }`}
            />
          </div>
          <div>
            <h3 className="font-bold text-primary-text font-primary group-hover:text-primary transition-colors">
              {friend.username}
            </h3>
            <p className="text-xs text-secondary-text font-primary">{friend.email}</p>
          </div>
        </div>
      </div>

      {/* Friend Info */}
      <div className="flex items-center gap-4 text-xs text-secondary-text mb-3 font-primary">
        {friend.age && <span>{friend.age} years</span>}
        {friend.country && <span>• {friend.country}</span>}
        {friend.gender && <span>• {friend.gender === 'male' ? '♂' : '♀'}</span>}
      </div>

      {/* Status */}
      <div className="text-xs text-secondary-text mb-3 font-primary">
        {friend.isOnline ? (
          <span className="text-success">● Online</span>
        ) : (
          <span>
            Last seen{' '}
            {friend.lastSeen ? new Date(friend.lastSeen).toLocaleDateString() : 'recently'}
          </span>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={() => onStartChat(friend.id)}
        className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
      >
        <MessageCircle className="w-4 h-4" />
        Message
      </button>
    </div>
  );
}
