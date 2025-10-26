import { useState } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { 
  Menu, 
  X, 
  Hash, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Plus,
  Bell,
  Search,
  Home
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { useFriendStore } from '../../stores/friendStore';
import Avatar from '../ui/Avatar';
import { FriendRequestsModal } from '../FriendRequestsModal';

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuthStore();
  const { rooms } = useRoomStore();
  const { pendingRequests } = useFriendStore();
  const navigate = useNavigate();

  // Socket connection is handled globally by useSocketAuth hook in App.tsx
  // No need to initialize here
  
  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  const handleCopyFriendCode = async () => {
    if (user?.friendCode) {
      await navigator.clipboard.writeText(user.friendCode);
      setShowCopied(true);
      setTimeout(() => {
        setShowCopied(false);
      }, 2000);
    }
  };

  const handleRoomClick = async (roomId: string) => {
    navigate({ to: `/room/${roomId}` });
  };

  const handleCreateRoom = () => {
    navigate({ to: '/dashboard' });
  };

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-background-primary flex overflow-hidden">
      {/* Professional Sidebar */}
      <div className={`
        ${isCollapsed ? 'w-16' : 'w-80'} 
        bg-background-secondary
        flex flex-col 
        transition-all duration-300 ease-in-out
        border-r border-default
      `}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-subtle">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/80 to-secondary rounded-lg flex items-center justify-center shadow-sm">
                <MessageSquare className="w-5 h-5 text-black" />
              </div>
              <span className="text-primary-text font-primary font-bold text-lg">VoiceFlow</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-background-tertiary text-secondary-text hover:text-primary-text transition-colors"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isCollapsed && (
            <>
              {/* Search */}
              <div className="p-4 border-b border-subtle">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-text" />
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background-tertiary border border-default rounded-lg text-primary-text placeholder-muted-text focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,255,0,0.1)] transition-all font-primary text-sm"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-b border-subtle">
                <div className="space-y-2">
                  <button
                    onClick={() => navigate({ to: '/dashboard' })}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-background-tertiary text-secondary-text hover:text-primary-text transition-colors font-primary"
                  >
                    <Home className="w-5 h-5" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors font-primary font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Room</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Rooms List */}
          <div className="flex-1 overflow-y-auto">
            {!isCollapsed && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-secondary-text text-sm font-primary font-medium uppercase tracking-wide">
                    Rooms ({filteredRooms.length})
                  </span>
                </div>
              </div>
            )}
            
            <div className="space-y-1 px-2">
              {(isCollapsed ? rooms.slice(0, 6) : filteredRooms).map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(room.id)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors group
                    text-secondary-text hover:bg-background-tertiary hover:text-primary-text
                  `}
                  title={isCollapsed ? room.name : undefined}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-background-tertiary text-muted-text group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Hash className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-primary font-medium truncate">{room.name}</div>
                      <div 
                        className="text-xs text-muted-text truncate font-primary cursor-pointer hover:text-primary transition-colors"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(room.code);
                            setCopiedRoomId(room.id);
                            setTimeout(() => setCopiedRoomId(null), 1500);
                          } catch (error) {
                            console.error('Failed to copy room code:', error);
                          }
                        }}
                        title="Click to copy room code"
                      >
                        {copiedRoomId === room.id ? 'Copied!' : `#${room.code}`}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {isCollapsed && rooms.length > 6 && (
              <div className="px-2 mt-2">
                <div className="text-center text-muted-text text-xs font-primary">
                  +{rooms.length - 6} more
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="border-t border-subtle p-4">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            {!isCollapsed && (
              <>
                <Avatar 
                  avatarId={user?.avatarUrl}
                  initials={user?.username?.charAt(0).toUpperCase()}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  {/* Username with tooltip */}
                  <div className="relative">
                    <div 
                      className="text-primary-text font-primary font-medium truncate cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={handleCopyFriendCode}
                      data-tooltip-id="friend-code-tooltip"
                      data-tooltip-content={showCopied ? 'Copied!' : user?.friendCode || ''}
                    >
                      {user?.username}
                    </div>
                    {user?.friendCode && (
                      <Tooltip 
                        id="friend-code-tooltip" 
                        place="top"
                        style={{
                          backgroundColor: 'rgb(30, 30, 30)',
                          color: 'rgb(204, 255, 0)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          zIndex: 99999,
                          fontFamily: 'monospace',
                        }}
                      />
                    )}
                  </div>
                  <div className="text-secondary-text text-sm truncate font-primary">{user?.email}</div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-lg hover:bg-background-tertiary text-secondary-text hover:text-primary transition-colors relative"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {pendingRequests.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse" />
                    )}
                  </button>
                  <button
                    onClick={() => navigate({ to: '/settings' })}
                    className="p-2 rounded-lg hover:bg-background-tertiary text-secondary-text hover:text-primary transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-background-tertiary text-secondary-text hover:text-error transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
            {isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-background-tertiary text-secondary-text hover:text-error transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-background-primary overflow-hidden">
        <Outlet />
      </div>

      {/* Friend Requests Modal */}
      <FriendRequestsModal 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </div>
  );
}