import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
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
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Left side - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 flex-col justify-center px-12">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6">VoiceFlow</h1>
          <p className="text-xl text-neutral-300 mb-8">
            Professional communication platform designed for modern teams.
          </p>
          <div className="space-y-4 text-neutral-400">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-neutral-500 rounded-full"></div>
              <span>Enterprise-grade security</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-neutral-500 rounded-full"></div>
              <span>99.9% uptime guarantee</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-neutral-500 rounded-full"></div>
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12">
        <div className="w-full max-w-md mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </button>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Welcome back</h2>
            <p className="text-neutral-600">Sign in to your account to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-500"
                />
                <span className="ml-2 text-sm text-neutral-700">Remember me</span>
              </label>
              <a href="#" className="text-sm text-neutral-900 hover:text-neutral-700 font-medium">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loginMutation.isPending}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
            >
              Sign In
            </Button>
          </form>

          {/* Sign up link */}
          <div className="mt-8 text-center">
            <p className="text-neutral-600">
              Don't have an account?{' '}
              <button
                onClick={() => navigate({ to: '/register' })}
                className="text-neutral-900 font-medium hover:text-neutral-700"
              >
                Create account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
