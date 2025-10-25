import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import type { FunctionComponent } from '../common/types';

const Login = (): FunctionComponent => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: () => {
      navigate({ to: '/' });
    },
    onError: (error: any) => {
      setErrors({ password: error.message || 'Login failed' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!email) setErrors((prev) => ({ ...prev, email: 'Email is required' }));
    if (!password) setErrors((prev) => ({ ...prev, password: 'Password is required' }));

    if (email && password) {
      loginMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-neutral-50 to-stone-50 flex">
      {/* Left side - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-900 via-neutral-900 to-black flex-col justify-center px-12 relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <div className="max-w-md relative z-10">
          <div className="mb-8">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 border border-white/20">
              <div className="w-6 h-6 bg-white rounded-md"></div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">VoiceFlow</h1>
            <div className="h-1 w-20 bg-gradient-to-r from-white to-white/30 rounded-full"></div>
          </div>
          <p className="text-xl text-neutral-300 mb-12 leading-relaxed">
            Professional communication platform designed for modern teams.
          </p>
          <div className="space-y-4 text-neutral-400">
            <div className="flex items-center space-x-3 group">
              <div className="w-1.5 h-1.5 bg-neutral-400 group-hover:bg-white rounded-full transition-colors"></div>
              <span className="group-hover:text-neutral-200 transition-colors">Enterprise-grade security</span>
            </div>
            <div className="flex items-center space-x-3 group">
              <div className="w-1.5 h-1.5 bg-neutral-400 group-hover:bg-white rounded-full transition-colors"></div>
              <span className="group-hover:text-neutral-200 transition-colors">99.9% uptime guarantee</span>
            </div>
            <div className="flex items-center space-x-3 group">
              <div className="w-1.5 h-1.5 bg-neutral-400 group-hover:bg-white rounded-full transition-colors"></div>
              <span className="group-hover:text-neutral-200 transition-colors">24/7 support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center text-neutral-500 hover:text-black mb-12 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to home</span>
          </button>

          {/* Header */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-black mb-3 tracking-tight">Welcome back</h2>
            <p className="text-neutral-600">Sign in to your account to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              className="w-full"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              className="w-full"
            />

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-black border-neutral-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0 transition-all"
                />
                <span className="ml-2 text-sm text-neutral-700 group-hover:text-black transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm text-black hover:text-neutral-700 font-medium transition-colors">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loginMutation.isPending}
              className="w-full bg-black hover:bg-neutral-800 text-white shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 transition-all"
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-500">New to VoiceFlow?</span>
            </div>
          </div>

          {/* Sign up link */}
          <div className="text-center">
            <button
              onClick={() => navigate({ to: '/register' })}
              className="text-black font-medium hover:text-neutral-700 transition-colors inline-flex items-center group"
            >
              Create account
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
