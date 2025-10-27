import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatInterface } from "../components/chat/ChatInterface";
import { useWebRTCStore } from "../stores/webrtcStore";

function RoomPage() {
  const { initialize, cleanup } = useWebRTCStore();

  // Initialize WebRTC store when component mounts
  useEffect(() => {
    initialize();
    return () => {
      cleanup();
    };
  }, [initialize, cleanup]);

  return <ChatInterface />;
}

export const Route = createFileRoute("/room/$roomId")({
  component: RoomPage,
});
