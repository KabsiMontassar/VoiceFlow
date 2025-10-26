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
    <nav className="bg-background-secondary/80 backdrop-blur-xl border-b border-default sticky top-0 z-40 shadow-lg shadow-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary font-primary">
              ♪ VoiceFlow
            </div>
          </div>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="#"
              className="nav-link"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="nav-link"
            >
              Rooms
            </a>
            <a
              href="#"
              className="nav-link"
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
                  className="flex items-center gap-3 hover:bg-background-tertiary px-3 py-2 rounded-lg transition-colors"
                >
                  <Avatar
                    initials={user.username?.substring(0, 2).toUpperCase() || 'U'}
                    size="sm"
                  />
                  <span className="hidden sm:block text-sm font-primary font-bold text-primary-text">
                    {user.username}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-background-tertiary rounded-lg shadow-lg border border-default py-2 z-50">
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm font-primary text-primary-text hover:bg-background-secondary transition-colors"
                    >
                      Profile
                    </a>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm font-primary text-primary-text hover:bg-background-secondary transition-colors"
                    >
                      Settings
                    </a>
                    <hr className="my-2 border-subtle" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm font-primary text-error hover:bg-error/10 transition-colors"
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
