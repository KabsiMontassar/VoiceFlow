import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import type { FunctionComponent } from '../common/types';

const Register = (): FunctionComponent => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const registerMutation = useMutation({
    mutationFn: () =>
      register(formData.email, formData.username, formData.password, formData.confirmPassword),
    onSuccess: () => {
      navigate({ to: '/' });
    },
    onError: (error: any) => {
      setErrors({ submit: error.message || 'Registration failed' });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      registerMutation.mutate();
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
            <h1 className="text-5xl font-bold text-primary-text mb-4 tracking-tight font-primary">Join Valero</h1>
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
          </div>
          <p className="text-xl text-muted mb-12 leading-relaxed font-primary">
            Start collaborating with your team in minutes with our professional communication platform.
          </p>
          <div className="space-y-4 text-muted">
            <div className="flex items-center space-x-3 group">
              <div className="w-6 h-6 rounded-lg bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span className="group-hover:text-primary-text transition-colors font-primary">Free 30-day trial</span>
            </div>
            <div className="flex items-center space-x-3 group">
              <div className="w-6 h-6 rounded-lg bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span className="group-hover:text-primary-text transition-colors font-primary">No credit card required</span>
            </div>
            <div className="flex items-center space-x-3 group">
              <div className="w-6 h-6 rounded-lg bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span className="group-hover:text-primary-text transition-colors font-primary">Cancel anytime</span>
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
            <h2 className="text-4xl font-bold text-primary-text mb-3 tracking-tight font-primary">Create account</h2>
            <p className="text-muted font-primary">Get started with your free trial today</p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.submit && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">!</span>
                </div>
                <span className="font-primary">{errors.submit}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Username"
                type="text"
                name="username"
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange}
                error={errors.username}
                className="w-full"
              />

              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                className="w-full"
              />
            </div>

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              helperText="Must be at least 6 characters"
              className="w-full"
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              className="w-full"
            />

            <div className="flex items-start space-x-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 text-primary bg-background-secondary border-default rounded focus:ring-2 focus:ring-primary focus:ring-offset-0 transition-all mt-1"
                required
              />
              <label htmlFor="terms" className="text-sm text-muted leading-relaxed font-primary">
                I agree to the{' '}
                <a href="#" className="text-primary font-medium hover:text-secondary transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary font-medium hover:text-secondary transition-colors">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={registerMutation.isPending}
              className="w-full"
            >
              Create Account
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-default"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background-secondary text-muted font-primary">Already have an account?</span>
            </div>
          </div>

          {/* Sign in link */}
          <div className="text-center">
            <button
              onClick={() => navigate({ to: '/login' })}
              className="text-primary font-medium hover:text-secondary transition-colors inline-flex items-center group font-primary"
            >
              Sign in
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
