import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import Toast from "../components/ui/Toast";
import { useAuthStore } from "../stores/authStore";
import { apiClient } from "../services/api";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { setUser } = useAuthStore();
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(data);
      
      const authData = (response as any).data || response;
      console.log('Login: Auth data received:', authData);
      
      // Store tokens in localStorage
      if (authData.accessToken) {
        localStorage.setItem("authToken", authData.accessToken);
        localStorage.setItem("accessToken", authData.accessToken);
        apiClient.setAccessToken(authData.accessToken);
        console.log('Login: Access token stored');
      }

      if (authData.refreshToken) {
        localStorage.setItem("refreshToken", authData.refreshToken);
        apiClient.setRefreshToken(authData.refreshToken);
        console.log('Login: Refresh token stored');
      }
      
      // Update auth store with both user and tokens
      if (authData.user) {
        setUser(authData.user);
        console.log('Login: User set in store');
      }
      
      // Set tokens in the store to ensure isAuthenticated is true
      if (authData.accessToken) {
        useAuthStore.getState().setTokens(
          authData.accessToken, 
          authData.refreshToken || ""
        );
        console.log('Login: Tokens set in auth store');
      }
      
      setToastMessage({ type: "success", text: "Login successful! Redirecting..." });
      
      // Redirect to dashboard
      setTimeout(() => {
        console.log('Login: Redirecting to dashboard');
        window.location.href = "/dashboard";
      }, 500);
    } catch (error: any) {
      console.error('Login error:', error);
      setToastMessage({
        type: "error",
        text: error.response?.data?.message || "Login failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card variant="elevated" className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-neutral text-sm">Sign in to your VoiceFlow account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register("email")}
            type="email"
            placeholder="Email address"
            label="Email"
            error={errors.email?.message}
            disabled={isLoading}
          />

          <Input
            {...register("password")}
            type="password"
            placeholder="Enter your password"
            label="Password"
            error={errors.password?.message}
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-primary-200">
          <p className="text-center text-sm text-neutral">
            Don't have an account?{" "}
            <button
              onClick={() => window.location.href = "/register"}
              className="text-primary-600 hover:text-primary-700 font-semibold transition"
            >
              Create one
            </button>
          </p>
        </div>
      </Card>

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
