import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import Toast from "../components/ui/Toast";
import { useState } from "react";
import { apiClient } from "../services/api";

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
      // Send all data including confirmPassword to the API
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card variant="elevated" className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Create Account</h1>
          <p className="text-neutral text-sm">Join VoiceFlow and start collaborating</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register("username")}
            type="text"
            placeholder="Choose a username"
            label="Username"
            error={errors.username?.message}
            disabled={isLoading}
          />

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
            placeholder="Create a password"
            label="Password"
            error={errors.password?.message}
            disabled={isLoading}
          />

          <Input
            {...register("confirmPassword")}
            type="password"
            placeholder="Confirm your password"
            label="Confirm Password"
            error={errors.confirmPassword?.message}
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-primary-200">
          <p className="text-center text-sm text-neutral">
            Already have an account?{" "}
            <button
              onClick={() => window.location.href = "/login"}
              className="text-primary-600 hover:text-primary-700 font-semibold transition"
            >
              Sign in
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
