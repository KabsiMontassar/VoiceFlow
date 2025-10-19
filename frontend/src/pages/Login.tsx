import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
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
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white font-serif mb-2">VoiceFlow</h1>
          <p className="text-primary-100 font-mono">Connect, communicate, collaborate</p>
        </div>

        {/* Login Form */}
        <Card variant="elevated" className="bg-white">
          <h2 className="text-2xl font-bold text-primary-950 mb-6 font-serif">Welcome Back</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-mono">
                <input
                  type="checkbox"
                  className="rounded border-primary-300 text-primary-900 focus:ring-primary-900"
                />
                <span className="text-primary-950">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary-900 hover:underline font-mono">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loginMutation.isPending}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-primary-600 mt-6 font-mono">
            Don't have an account?{' '}
            <button
              onClick={() => navigate({ to: '/' })}
              className="text-primary-900 font-bold hover:underline"
            >
              Sign up
            </button>
          </p>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-primary-200 mt-8 font-mono">
          © 2024 VoiceFlow. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
