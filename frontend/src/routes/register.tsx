import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Github, Chrome } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useNavigate } from '@tanstack/react-router';
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Toast from "../components/ui/Toast";
import { apiClient } from "../services/api";
import { useAuthStore } from "../stores/authStore";

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isHydrated } = useAuthStore();

  // Auto-redirect to dashboard if already logged in
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, isHydrated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await apiClient.register(data);
      
      setToastMessage({ type: "success", text: "Registration successful! Redirecting to login..." });
      
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (error: any) {
      setToastMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Registration failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-12 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-48 -translate-y-48"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-bold mb-4">Join VoiceFlow</h1>
            <p className="text-primary-100 text-lg leading-relaxed">
              Create your account and start collaborating with your team through real-time messaging and voice communication.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Personal Workspace</h3>
                <p className="text-primary-100 text-sm">Get your own space to manage rooms and conversations</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Secure Communication</h3>
                <p className="text-primary-100 text-sm">End-to-end encryption for all your messages</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <ArrowRight className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Easy Setup</h3>
                <p className="text-primary-100 text-sm">Get started in minutes with our simple onboarding</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-neutral-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-2">
                Create Account
              </h2>
              <p className="text-neutral-600">
                Join thousands of teams using VoiceFlow
              </p>
            </div>

            {/* Social Login Options */}
            <div className="space-y-3 mb-6">
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-3 py-3 border-neutral-200 hover:bg-neutral-50"
                disabled={isLoading}
              >
                <Github className="w-5 h-5" />
                <span>Continue with GitHub</span>
              </Button>
              
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-3 py-3 border-neutral-200 hover:bg-neutral-50"
                disabled={isLoading}
              >
                <Chrome className="w-5 h-5" />
                <span>Continue with Google</span>
              </Button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-neutral-500">Or continue with email</span>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Username */}
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                  <Input
                    {...register("username")}
                    type="text"
                    placeholder="Username"
                    className={`pl-10 py-3 ${errors.username ? 'border-red-300 focus:border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                  <Input
                    {...register("email")}
                    type="email"
                    placeholder="Email address"
                    className={`pl-10 py-3 ${errors.email ? 'border-red-300 focus:border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                  <Input
                    {...register("password")}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    className={`pl-10 pr-10 py-3 ${errors.password ? 'border-red-300 focus:border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
                  <Input
                    {...register("confirmPassword")}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    className={`pl-10 pr-10 py-3 ${errors.confirmPassword ? 'border-red-300 focus:border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Terms */}
              <div className="text-sm text-neutral-600 py-2">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                  Privacy Policy
                </a>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-3 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                isLoading={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating account...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="text-center mt-6 pt-6 border-t border-neutral-200">
              <p className="text-neutral-600">
                Already have an account?{' '}
                <button
                  onClick={() => window.location.href = "/login"}
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
