import { createFileRoute } from "@tanstack/react-router";
import Toast from "../components/ui/Toast";
import WelcomeHeader from "../components/dashboard/WelcomeHeader";
import StatsCards from "../components/dashboard/StatsCards";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivity from "../components/dashboard/RecentActivity";
import CreateRoomModal from "../components/dashboard/CreateRoomModal";
import JoinRoomModal from "../components/dashboard/JoinRoomModal";
import { useDashboard } from "../hooks/useDashboard";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const {
    user,
    isHydrated,
    rooms,
    totalMessages,
    totalMembers,
    isModalOpen,
    setIsModalOpen,
    isJoinModalOpen,
    setIsJoinModalOpen,
    roomName,
    setRoomName,
    roomCode,
    setRoomCode,
    isLoading,
    toastMessage,
    setToastMessage,
    handleCreateRoom,
    handleJoinRoom,
    handleJoinByCode,
    copyRoomCode
  } = useDashboard();

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        <WelcomeHeader username={user?.username} />
        <StatsCards
          totalRooms={rooms.length}
          totalMembers={totalMembers}
          totalMessages={totalMessages}
        />
        <QuickActions
          onCreateRoom={() => setIsModalOpen(true)}
          onJoinRoom={() => setIsJoinModalOpen(true)}
        />
        <RecentActivity
          rooms={rooms}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={() => setIsModalOpen(true)}
          onCopyRoomCode={copyRoomCode}
        />
      </div>

      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roomName={roomName}
        setRoomName={setRoomName}
        onSubmit={handleCreateRoom}
        isLoading={isLoading}
      />

      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        onSubmit={handleJoinByCode}
        isLoading={isLoading}
      />

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
