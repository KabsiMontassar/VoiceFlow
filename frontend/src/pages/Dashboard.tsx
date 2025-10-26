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
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="bg-background-secondary/80 backdrop-blur-xl border-b border-default sticky top-0 z-40 shadow-lg shadow-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-black rounded-sm"></div>
              </div>
              <h1 className="text-2xl font-bold text-primary-text tracking-tight font-primary">VoiceFlow</h1>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <a href="#" className="nav-link nav-link-active">
                Dashboard
              </a>
              <a href="#" className="nav-link">
                Rooms
              </a>
              <a href="#" className="nav-link">
                Settings
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-primary-text font-primary">{user?.username}</p>
                <p className="text-xs text-muted font-primary">{user?.email}</p>
              </div>
              <Avatar initials={user?.username?.substring(0, 2).toUpperCase() || 'U'} status="active" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-primary-text mb-3 tracking-tight font-primary">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-muted text-lg font-primary">
            Manage your rooms and connect with your team
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-10 flex gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowCreateRoom(true)}
          >
            <span className="text-lg mr-2">+</span>
            Create New Room
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
              <Card key={room.id} variant="default" className="hover:shadow-[0_8px_24px_rgba(201,239,49,0.15)] group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-primary-text mb-2 group-hover:text-primary transition-colors font-primary">{room.name}</h3>
                    <p className="text-sm text-muted leading-relaxed font-primary">
                      {room.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted font-medium font-primary">Code:</span>
                      <span className="inline-block px-3 py-1.5 bg-background-secondary text-primary rounded-lg text-xs font-bold tracking-wider border border-primary/20 font-primary">
                        {room.code}
                      </span>
                      <button
                        onClick={() => copyRoomCode(room.code)}
                        className="p-1.5 text-muted hover:text-primary hover:bg-background-secondary rounded-md transition-all"
                        title="Copy room code"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold shadow-sm border border-primary/20 font-primary">
                    {room.memberCount || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-subtle">
                  <span className="text-xs text-muted font-medium font-primary">
                    {new Date(room.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => enterRoom(room.id)}
                    className="hover:text-primary font-primary"
                  >
                    Enter →
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="col-span-full text-center py-16 border-2 border-dashed border-default bg-background-tertiary/50">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                  <svg
                    className="w-10 h-10 text-primary"
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
                </div>
                <h3 className="text-2xl font-bold text-primary-text mb-3 font-primary">No rooms yet</h3>
                <p className="text-muted mb-6 max-w-sm mx-auto font-primary">
                  Create your first room to start collaborating with your team
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateRoom(true)}
                >
                  <span className="text-lg mr-2">+</span>
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
