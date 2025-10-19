import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import Button from './ui/Button';
import Avatar from './ui/Avatar';
import { useAuthStore } from '../stores/authStore';
import type { FunctionComponent } from '../common/types';

const Navigation = (): FunctionComponent => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: '/' });
  };

  return (
    <nav className="bg-white border-b border-primary-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary-900 font-serif">
              ♪ VoiceFlow
            </div>
          </div>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#"
              className="text-primary-600 hover:text-primary-950 font-mono text-sm transition-colors"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="text-primary-600 hover:text-primary-950 font-mono text-sm transition-colors"
            >
              Rooms
            </a>
            <a
              href="#"
              className="text-primary-600 hover:text-primary-950 font-mono text-sm transition-colors"
            >
              Help
            </a>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-3 hover:bg-primary-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Avatar
                    initials={user.username?.substring(0, 2).toUpperCase() || 'U'}
                    size="sm"
                  />
                  <span className="hidden sm:block text-sm font-mono font-bold text-primary-950">
                    {user.username}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-primary-100 py-2 z-50">
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm font-mono text-primary-950 hover:bg-primary-50 transition-colors"
                    >
                      Profile
                    </a>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm font-mono text-primary-950 hover:bg-primary-50 transition-colors"
                    >
                      Settings
                    </a>
                    <hr className="my-2 border-primary-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm font-mono text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={() => navigate({ to: '/' })}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
