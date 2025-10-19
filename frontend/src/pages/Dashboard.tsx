import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { apiClient } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { FunctionComponent } from '../common/types';

const Dashboard = (): FunctionComponent => {
  const user = useAuthStore((state) => state.user);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await apiClient.listUserRooms();
      return response.data;
    },
  });

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;

    try {
      await apiClient.createRoom({
        name: roomName,
        description: roomDescription,
        maxUsers: 50,
      });
      setRoomName('');
      setRoomDescription('');
      setShowCreateRoom(false);
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <header className="bg-white border-b border-primary-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-primary-950 font-serif">VoiceFlow</h1>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-primary-600 hover:text-primary-950 font-mono text-sm">
                Dashboard
              </a>
              <a href="#" className="text-primary-600 hover:text-primary-950 font-mono text-sm">
                Rooms
              </a>
              <a href="#" className="text-primary-600 hover:text-primary-950 font-mono text-sm">
                Settings
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <Avatar initials={user?.username?.substring(0, 2).toUpperCase() || 'U'} status="online" />
              <div className="hidden sm:block">
                <p className="text-sm font-mono font-bold text-primary-950">{user?.username}</p>
                <p className="text-xs font-mono text-primary-600">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary-950 font-serif mb-2">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-primary-600 font-mono">
            Manage your rooms and connect with your team
          </p>
        </div>

        {/* Create Room Button */}
        <div className="mb-8">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowCreateRoom(true)}
          >
            + Create New Room
          </Button>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomsLoading ? (
            <Card className="col-span-full flex items-center justify-center h-40">
              <div className="text-center">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-900 rounded-full" />
                <p className="mt-4 text-primary-600 font-mono">Loading rooms...</p>
              </div>
            </Card>
          ) : (roomsData as any)?.length > 0 ? (
            (roomsData as any).map((room: any) => (
              <Card key={room.id} variant="default" className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-primary-950 font-serif">{room.name}</h3>
                    <p className="text-sm text-primary-600 font-mono mt-1">
                      {room.description || 'No description'}
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 bg-primary-100 text-primary-900 rounded-full text-xs font-mono font-bold">
                    {room.memberCount || 0} members
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-primary-100">
                  <span className="text-xs text-primary-600 font-mono">
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </span>
                  <Button variant="ghost" size="sm">
                    Enter
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="col-span-full text-center py-12">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto text-primary-200 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4"
                  />
                </svg>
                <h3 className="text-lg font-bold text-primary-950 font-serif mb-2">No rooms yet</h3>
                <p className="text-primary-600 font-mono mb-4">
                  Create your first room to start collaborating
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateRoom(true)}
                >
                  Create Room
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Create Room Modal */}
      <Modal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        title="Create New Room"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Room Name"
            placeholder="Team Meeting"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />

          <Input
            label="Description (optional)"
            placeholder="What's this room about?"
            value={roomDescription}
            onChange={(e) => setRoomDescription(e.target.value)}
          />

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreateRoom(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateRoom} className="flex-1">
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
