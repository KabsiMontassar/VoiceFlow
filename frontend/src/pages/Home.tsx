import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Mic, MessageSquare, Users, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import type { FunctionComponent } from '../common/types';
import { useAuthStore } from '../stores/authStore';

export const Home = (): FunctionComponent => {
  const navigate = useNavigate();
  const { isAuthenticated, isHydrated } = useAuthStore();

  // Auto-redirect to dashboard if already logged in
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, isHydrated, navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-neutral-900">VoiceFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="secondary"
                onClick={() => navigate({ to: '/login' })}
                className="text-neutral-700 bg-transparent hover:bg-neutral-100 border-neutral-300"
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate({ to: '/register' })}
                className="bg-neutral-900 hover:bg-neutral-800 text-white"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-6xl sm:text-7xl font-bold text-neutral-900 mb-6">
              Professional
              <span className="block text-neutral-600">Communication</span>
            </h1>
            <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
              Streamline your team collaboration with enterprise-grade voice and messaging. 
              Secure, reliable, and designed for modern workflows.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate({ to: '/register' })}
                className="bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-4 text-lg font-medium flex items-center justify-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate({ to: '/login' })}
                className="text-neutral-700 bg-transparent hover:bg-neutral-100 border-neutral-300 px-8 py-4 text-lg font-medium"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-neutral-900 mb-4">
                Everything you need for team communication
              </h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Built for teams that demand reliability, security, and seamless collaboration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8 rounded-xl border border-neutral-200 bg-white hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Mic className="w-8 h-8 text-neutral-700" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Crystal Clear Voice</h3>
                <p className="text-neutral-600">
                  High-definition audio with noise cancellation and automatic gain control for professional conversations.
                </p>
              </div>

              <div className="text-center p-8 rounded-xl border border-neutral-200 bg-white hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-neutral-700" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Instant Messaging</h3>
                <p className="text-neutral-600">
                  Real-time text chat with file sharing, emoji reactions, and message history across all devices.
                </p>
              </div>

              <div className="text-center p-8 rounded-xl border border-neutral-200 bg-white hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-neutral-700" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Team Spaces</h3>
                <p className="text-neutral-600">
                  Organize projects with dedicated rooms, role-based permissions, and advanced moderation tools.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 py-16 bg-neutral-50 rounded-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-neutral-900 mb-2">99.9%</div>
                <div className="text-neutral-600">Uptime SLA</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-neutral-900 mb-2">50ms</div>
                <div className="text-neutral-600">Average Latency</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-neutral-900 mb-2">256-bit</div>
                <div className="text-neutral-600">Encryption</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-neutral-500">
            <p>© 2025 VoiceFlow. All rights reserved. • Built for professional teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
