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
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Left side - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 flex-col justify-center px-12">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6">Join VoiceFlow</h1>
          <p className="text-xl text-neutral-300 mb-8">
            Start collaborating with your team in minutes with our professional communication platform.
          </p>
          <div className="space-y-4 text-neutral-400">
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-500" />
              <span>Free 30-day trial</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-500" />
              <span>Cancel anytime</span>
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
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Create account</h2>
            <p className="text-neutral-600">Get started with your free trial today</p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errors.submit}
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

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-500 mt-1"
                required
              />
              <label htmlFor="terms" className="text-sm text-neutral-700">
                I agree to the{' '}
                <a href="#" className="text-neutral-900 font-medium hover:text-neutral-700">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-neutral-900 font-medium hover:text-neutral-700">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={registerMutation.isPending}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
            >
              Create Account
            </Button>
          </form>

          {/* Sign in link */}
          <div className="mt-8 text-center">
            <p className="text-neutral-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate({ to: '/login' })}
                className="text-neutral-900 font-medium hover:text-neutral-700"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
