import { createFileRoute } from "@tanstack/react-router";
import NewDashboard from "../pages/NewDashboard";

export const Route = createFileRoute("/dashboard")({
  component: NewDashboard,
});
