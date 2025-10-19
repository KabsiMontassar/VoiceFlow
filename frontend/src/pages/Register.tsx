import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
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
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white font-serif mb-2">VoiceFlow</h1>
          <p className="text-primary-100 font-mono">Create your account</p>
        </div>

        {/* Register Form */}
        <Card variant="elevated" className="bg-white">
          <h2 className="text-2xl font-bold text-primary-950 mb-6 font-serif">Get Started</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-mono">
                {errors.submit}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <Input
              label="Username"
              type="text"
              name="username"
              placeholder="your_username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              helperText="Must be at least 6 characters"
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
            />

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

          <p className="text-center text-sm text-primary-600 mt-6 font-mono">
            Already have an account?{' '}
            <button
              onClick={() => navigate({ to: '/' })}
              className="text-primary-900 font-bold hover:underline"
            >
              Sign in
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

export default Register;
