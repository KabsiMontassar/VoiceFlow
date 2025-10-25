import { Outlet, useLocation } from "@tanstack/react-router";
import { useAuthStore } from "../stores/authStore";
import { AppLayout } from "./layouts/AppLayout";

export function Root() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  
  // Routes that don't need the app layout
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.includes(location.pathname);
  
  // If user is authenticated and not on auth routes, use app layout
  if (isAuthenticated && !isAuthRoute) {
    return <AppLayout />;
  }
  
  // For auth routes or unauthenticated users, render pages directly
  return <div className="h-full"><Outlet /></div>;
}