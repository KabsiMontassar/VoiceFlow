import { useState } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { 
  Menu, 
  X, 
  MessageSquare, 
  Settings, 
  LogOut,
  Home,
  Plus,
  Lock,
  Globe
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const { rooms } = useRoomStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col shadow-sm`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-serif font-bold text-slate-900">VoiceFlow</h1>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors group"
            >
              <Home className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
              {sidebarOpen && <span className="text-slate-700 group-hover:text-slate-900">Home</span>}
            </button>
          </div>

          {/* Rooms Section */}
          <div className="pt-6">
            {sidebarOpen && (
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Rooms</h3>
                <button
                  onClick={() => navigate({ to: '/dashboard' })}
                  className="p-1 rounded hover:bg-slate-100 transition-colors"
                >
                  <Plus className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}
            
            <div className="space-y-1">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => navigate({ to: `/room/${room.id}` })}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors group"
                >
                  {room.settings.isPublic ? (
                    <Globe className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500" />
                  )}
                  {sidebarOpen && (
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">
                        {room.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        #{room.code}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {user.username}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {user.email}
                  </div>
                </div>
              )}
              <div className="flex space-x-1">
                <button
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-serif font-semibold text-slate-900">
                VoiceFlow Chat
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-slate-600">Online</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}