import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { apiClient } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import type { FunctionComponent } from '../common/types';

const Dashboard = (): FunctionComponent => {
  const user = useAuthStore((state) => state.user);
  const { rooms } = useRoomStore(); // Get rooms from global store
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomCode, setRoomCode] = useState('');

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!roomName.trim()) throw new Error('Room name is required');
      const response = await apiClient.createRoom({
        name: roomName,
        description: roomDescription,
        maxUsers: 50,
      });
      console.log('Create room response:', response);
      
      // Check if the response was successful
      if (!response.success) {
        throw new Error(response.message || 'Failed to create room');
      }
      
      return response;
    },
    onSuccess: (response) => {
      console.log('Room created successfully:', response);
      setRoomName('');
      setRoomDescription('');
      setShowCreateRoom(false);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error) => {
      console.error('Failed to create room:', error);
    },
  });

  // Join room mutation
  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!roomCode.trim()) throw new Error('Room code is required');
      
      // First get the room by code
      const roomResponse = await apiClient.getRoomByCode(roomCode);
      console.log('Room by code response:', roomResponse);
      
      if (!roomResponse.success) {
        throw new Error(roomResponse.message || 'Room not found');
      }
      
      const room = roomResponse.data as any;
      if (!room) throw new Error('Room not found');
      
      // Then try to join the room
      try {
        const joinResponse = await apiClient.joinRoom(room.id);
        
        if (!joinResponse.success) {
          throw new Error(joinResponse.message || 'Failed to join room');
        }
      } catch (error: any) {
        // Check if already in room
        const errorCode = error?.response?.data?.error?.code;
        if (errorCode === 'ALREADY_IN_ROOM') {
          console.log('[Dashboard] Already in room:', room.id);
          // Not an error - we're already a member
        } else {
          throw error;
        }
      }
      
      return room;
    },
    onSuccess: () => {
      setRoomCode('');
      setShowJoinRoom(false);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error) => {
      console.error('Failed to join room:', error);
    },
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate();
  };

  const handleJoinRoom = () => {
    joinRoomMutation.mutate();
  };

  const copyRoomCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      // You could add a toast notification here
      console.log('Room code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy room code:', error);
    }
  };

  const enterRoom = (roomId: string) => {
    navigate({ to: `/room/${roomId}` });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-950 font-serif">VoiceFlow</h1>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-neutral-600 hover:text-neutral-950 font-mono text-sm">
                Dashboard
              </a>
              <a href="#" className="text-neutral-600 hover:text-neutral-950 font-mono text-sm">
                Rooms
              </a>
              <a href="#" className="text-neutral-600 hover:text-neutral-950 font-mono text-sm">
                Settings
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <Avatar initials={user?.username?.substring(0, 2).toUpperCase() || 'U'} status="active" />
              <div className="hidden sm:block">
                <p className="text-sm font-mono font-bold text-neutral-950">{user?.username}</p>
                <p className="text-xs font-mono text-neutral-600">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-950 font-serif mb-2">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-neutral-600 font-mono">
            Manage your rooms and connect with your team
          </p>
        </div>

        {/* Create Room Button */}
        <div className="mb-8 flex gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowCreateRoom(true)}
          >
            + Create New Room
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowJoinRoom(true)}
          >
            Join Room
          </Button>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.length > 0 ? (
            rooms.map((room: any) => (
              <Card key={room.id} variant="default" className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-neutral-950 font-serif">{room.name}</h3>
                    <p className="text-sm text-neutral-600 font-mono mt-1">
                      {room.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-neutral-600 font-mono">Room Code:</span>
                      <span className="inline-block px-2 py-1 bg-neutral-100 text-neutral-900 rounded text-xs font-mono font-bold">
                        {room.code}
                      </span>
                      <button
                        onClick={() => copyRoomCode(room.code)}
                        className="text-neutral-600 hover:text-neutral-900 transition-colors"
                        title="Copy room code"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-900 rounded-full text-xs font-mono font-bold">
                    {room.memberCount || 0} members
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <span className="text-xs text-neutral-600 font-mono">
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => enterRoom(room.id)}
                  >
                    Enter
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="col-span-full text-center py-12">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto text-neutral-200 mb-4"
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
                <h3 className="text-lg font-bold text-neutral-950 font-serif mb-2">No rooms yet</h3>
                <p className="text-neutral-600 font-mono mb-4">
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
            <Button 
              variant="primary" 
              onClick={handleCreateRoom} 
              className="flex-1"
              isLoading={createRoomMutation.isPending}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        isOpen={showJoinRoom}
        onClose={() => setShowJoinRoom(false)}
        title="Join Room"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Room Code"
            placeholder="Enter the room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={8}
          />

          <p className="text-sm text-neutral-600 font-mono">
            Ask the room creator for the room code to join
          </p>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowJoinRoom(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleJoinRoom} 
              className="flex-1"
              isLoading={joinRoomMutation.isPending}
              disabled={!roomCode.trim()}
            >
              Join Room
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
