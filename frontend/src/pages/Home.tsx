import { useNavigate } from '@tanstack/react-router';
import Button from '../components/ui/Button';
import type { FunctionComponent } from '../common/types';

export const Home = (): FunctionComponent => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex flex-col items-center justify-center px-4">
      {/* Hero Section */}
      <div className="text-center max-w-2xl">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white font-serif mb-2">♪ VoiceFlow</h1>
          <p className="text-2xl text-primary-100 font-mono">Real-time voice & text communication</p>
        </div>

        {/* Description */}
        <p className="text-lg text-primary-200 font-mono mb-8">
          Connect with your team through seamless voice and instant messaging. 
          Crystal-clear communication. Zero latency. Complete control.
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
            <div className="text-3xl mb-3">🎤</div>
            <h3 className="text-lg font-bold text-white font-serif mb-2">HD Voice</h3>
            <p className="text-primary-200 text-sm font-mono">Crystal-clear audio for natural conversations</p>
          </div>

          <div className="p-6 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="text-lg font-bold text-white font-serif mb-2">Instant Chat</h3>
            <p className="text-primary-200 text-sm font-mono">Real-time text messaging with typing indicators</p>
          </div>

          <div className="p-6 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="text-lg font-bold text-white font-serif mb-2">Team Rooms</h3>
            <p className="text-primary-200 text-sm font-mono">Organize conversations in dedicated spaces</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate({ to: '/' })}
            className="px-8"
          >
            Sign In
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate({ to: '/' })}
            className="px-8"
          >
            Create Account
          </Button>
        </div>

        {/* Footer Text */}
        <p className="mt-16 text-primary-300 text-sm font-mono">
          © 2024 VoiceFlow. All rights reserved. • Built with React & TypeScript
        </p>
      </div>
    </div>
  );
};
