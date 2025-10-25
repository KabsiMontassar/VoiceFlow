import { useState } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { 
  Menu, 
  X, 
  Hash, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Plus,
  User,
  Bell,
  Search,
  Home
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuthStore();
  const { rooms } = useRoomStore();
  const navigate = useNavigate();

  // Socket connection is handled globally by useSocketAuth hook in App.tsx
  // No need to initialize here

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
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
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Professional Sidebar */}
      <div className={`
        ${isCollapsed ? 'w-16' : 'w-80'} 
        bg-neutral-950 
        flex flex-col 
        transition-all duration-300 ease-in-out
        border-r border-neutral-800
      `}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-neutral-950" />
              </div>
              <span className="text-white font-medium text-lg">VoiceFlow</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isCollapsed && (
            <>
              {/* Search */}
              <div className="p-4 border-b border-neutral-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-b border-neutral-800">
                <div className="space-y-2">
                  <button
                    onClick={() => navigate({ to: '/dashboard' })}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                  >
                    <Home className="w-5 h-5" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
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
                  <span className="text-neutral-400 text-sm font-medium uppercase tracking-wide">
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
                    text-neutral-400 hover:bg-neutral-800 hover:text-white
                  `}
                  title={isCollapsed ? room.name : undefined}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-neutral-700 text-neutral-300 group-hover:bg-neutral-600">
                    <Hash className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{room.name}</div>
                      <div className="text-xs text-neutral-500 truncate">
                        #{room.code}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {isCollapsed && rooms.length > 6 && (
              <div className="px-2 mt-2">
                <div className="text-center text-neutral-500 text-xs">
                  +{rooms.length - 6} more
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="border-t border-neutral-800 p-4">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            {!isCollapsed && (
              <>
                <div className="w-10 h-10 bg-neutral-700 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-neutral-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{user?.username}</div>
                  <div className="text-neutral-400 text-sm truncate">{user?.email}</div>
                </div>
                <div className="flex space-x-1">
                  <button
                    className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
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
                className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-neutral-50 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}