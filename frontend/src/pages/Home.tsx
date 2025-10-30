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
    <div className="min-h-screen bg-background-primary flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-default bg-background-secondary/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-primary font-primary">♪ Valero</div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={() => navigate({ to: '/login' })}
                className="font-primary"
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate({ to: '/register' })}
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
            <h1 className="text-6xl sm:text-7xl font-bold text-primary-text mb-6 font-primary">
              Professional
              <span className="block text-primary mt-2">Communication</span>
            </h1>
            <p className="text-xl text-muted mb-8 max-w-3xl mx-auto font-primary leading-relaxed">
              Streamline your team collaboration with enterprise-grade voice and messaging. 
              Secure, reliable, and designed for modern workflows.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate({ to: '/register' })}
                className="px-8 py-4 text-base"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate({ to: '/login' })}
                className="px-8 py-4 text-base"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-primary-text mb-4 font-primary">
                Everything you need for team communication
              </h2>
              <p className="text-lg text-muted max-w-2xl mx-auto font-primary">
                Built for teams that demand reliability, security, and seamless collaboration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card text-center p-8">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Mic className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-primary-text mb-3 font-primary">Crystal Clear Voice</h3>
                <p className="text-muted font-primary">
                  High-definition audio with noise cancellation and automatic gain control for professional conversations.
                </p>
              </div>

              <div className="card text-center p-8">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-primary-text mb-3 font-primary">Instant Messaging</h3>
                <p className="text-muted font-primary">
                  Real-time text chat with file sharing, emoji reactions, and message history across all devices.
                </p>
              </div>

              <div className="card text-center p-8">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-primary-text mb-3 font-primary">Team Spaces</h3>
                <p className="text-muted font-primary">
                  Organize projects with dedicated rooms, role-based permissions, and advanced moderation tools.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 py-16 bg-background-secondary border border-default rounded-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-primary mb-2 font-primary">99.9%</div>
                <div className="text-muted font-primary">Uptime SLA</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2 font-primary">50ms</div>
                <div className="text-muted font-primary">Average Latency</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2 font-primary">256-bit</div>
                <div className="text-muted font-primary">Encryption</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-default bg-background-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-muted font-primary text-sm">
            <p>© 2025 Valero. All rights reserved. • Built for professional teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
