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
    <div className="min-h-screen bg-background-primary flex">
      {/* Left side - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-background-secondary via-background-primary to-black flex-col justify-center px-12 relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <div className="max-w-md relative z-10">
          <div className="mb-8">
            <div className="w-12 h-12 bg-primary/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 border border-primary/20">
              <div className="w-6 h-6 bg-primary rounded-md"></div>
            </div>
            <h1 className="text-5xl font-bold text-primary-text mb-4 tracking-tight font-primary">Valero</h1>
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
          </div>
          <p className="text-xl text-muted mb-12 leading-relaxed font-primary">
            Professional communication platform designed for modern teams.
          </p>
          <div className="space-y-4 text-muted">
            <div className="flex items-center space-x-3 group">
              <div className="w-1.5 h-1.5 bg-muted group-hover:bg-primary rounded-full transition-colors"></div>
              <span className="group-hover:text-primary-text transition-colors font-primary">Enterprise-grade security</span>
            </div>
            <div className="flex items-center space-x-3 group">
              <div className="w-1.5 h-1.5 bg-muted group-hover:bg-primary rounded-full transition-colors"></div>
              <span className="group-hover:text-primary-text transition-colors font-primary">99.9% uptime guarantee</span>
            </div>
            <div className="flex items-center space-x-3 group">
              <div className="w-1.5 h-1.5 bg-muted group-hover:bg-primary rounded-full transition-colors"></div>
              <span className="group-hover:text-primary-text transition-colors font-primary">24/7 support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 bg-background-secondary">
        <div className="w-full max-w-md mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center text-muted hover:text-primary-text mb-12 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium font-primary">Back to home</span>
          </button>

          {/* Header */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-primary-text mb-3 tracking-tight font-primary">Welcome back</h2>
            <p className="text-muted font-primary">Sign in to your account to continue</p>
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
                  className="w-4 h-4 text-primary bg-background-secondary border-default rounded focus:ring-2 focus:ring-primary focus:ring-offset-0 transition-all"
                />
                <span className="ml-2 text-sm text-muted group-hover:text-primary-text transition-colors font-primary">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary hover:text-secondary font-medium transition-colors font-primary">
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

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-default"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background-secondary text-muted font-primary">New to Valero?</span>
            </div>
          </div>

          {/* Sign up link */}
          <div className="text-center">
            <button
              onClick={() => navigate({ to: '/register' })}
              className="text-primary font-medium hover:text-secondary transition-colors inline-flex items-center group font-primary"
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
