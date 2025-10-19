import React, { useState, useEffect, useRef } from 'react';
import { useWebRTCStore } from '../stores/webrtcStore';
import { socketClient } from '../services/socket';
import Button from './ui/Button';
import Avatar from './ui/Avatar';

interface VoiceChatProps {
  roomId: string;
  isActive: boolean;
  onToggle: () => void;
}

interface AudioLevelMeterProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
}

const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({ level, size = 'md' }) => {
  const barCount = size === 'sm' ? 3 : size === 'md' ? 5 : 7;
  const barHeight = size === 'sm' ? 2 : size === 'md' ? 3 : 4;
  const activeCount = Math.ceil(level * barCount);

  return (
    <div className={`flex items-end gap-0.5 ${size === 'sm' ? 'w-3' : size === 'md' ? 'w-4' : 'w-5'}`}>
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className={`bg-current transition-all duration-100 ${
            i < activeCount ? 'opacity-100' : 'opacity-30'
          }`}
          style={{
            height: `${barHeight * (i + 1)}px`,
            width: size === 'sm' ? '2px' : '3px',
          }}
        />
      ))}
    </div>
  );
};

interface VoiceControlsProps {
  isConnected: boolean;
  isMuted: boolean;
  isPushToTalk: boolean;
  isVoiceActivation: boolean;
  onMuteToggle: () => void;
  onModeToggle: () => void;
  onLeave: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  isConnected,
  isMuted,
  isPushToTalk,
  onMuteToggle,
  onModeToggle,
  onLeave,
}) => {
  return (
    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-primary-200">
      <Button
        variant={isMuted ? 'danger' : 'ghost'}
        size="sm"
        onClick={onMuteToggle}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19L5 5m0 0v14l9-7-9-7z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9l6 6m0-6l-6 6" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m0 0a7 7 0 01-7-7z" />
          </svg>
        )}
      </Button>

      <Button
        variant={isPushToTalk ? 'primary' : 'ghost'}
        size="sm"
        onClick={onModeToggle}
        title={isPushToTalk ? 'Push to Talk ON' : 'Voice Activation'}
      >
        {isPushToTalk ? 'PTT' : 'VA'}
      </Button>

      <div className="flex-1 text-center">
        <span className="text-xs font-mono text-primary-600">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <Button
        variant="danger"
        size="sm"
        onClick={onLeave}
        title="Leave Voice Chat"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
        </svg>
      </Button>
    </div>
  );
};

interface VoiceParticipantProps {
  participant: {
    userId: string;
    username: string;
    isMuted: boolean;
    isConnected: boolean;
    audioLevel: number;
  };
}

const VoiceParticipant: React.FC<VoiceParticipantProps> = ({ participant }) => {
  const { username, isMuted, isConnected, audioLevel } = participant;

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-primary-200">
      <div className="relative">
        <Avatar
          initials={username.substring(0, 2).toUpperCase()}
          size="sm"
          status={isConnected ? 'online' : 'offline'}
        />
        {isMuted && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 19L5 5m0 0v14l9-7-9-7z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono font-bold text-primary-950 truncate">
          {username}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-primary-600">
            {isMuted ? 'Muted' : 'Unmuted'}
          </span>
          {!isMuted && isConnected && (
            <div className="text-green-500">
              <AudioLevelMeter level={audioLevel} size="sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VoiceChat: React.FC<VoiceChatProps> = ({ roomId, isActive, onToggle }) => {
  const webrtcStore = useWebRTCStore();
  const [isJoining, setIsJoining] = useState(false);
  const pushToTalkRef = useRef<boolean>(false);

  const {
    isConnected,
    isConnecting,
    isMuted,
    isPushToTalk,
    isVoiceActivation,
    voiceParticipants,
    localAudioLevel,
    error,
    initializeAudio,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    setPushToTalk,
    setError,
  } = webrtcStore;

  // Handle join/leave voice room
  useEffect(() => {
    if (isActive && !isConnected && !isConnecting) {
      handleJoinVoice();
    } else if (!isActive && isConnected) {
      handleLeaveVoice();
    }
  }, [isActive, isConnected, isConnecting]);

  // Push to talk keyboard handling
  useEffect(() => {
    if (!isPushToTalk) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !pushToTalkRef.current) {
        e.preventDefault();
        pushToTalkRef.current = true;
        if (isMuted) {
          toggleMute();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && pushToTalkRef.current) {
        e.preventDefault();
        pushToTalkRef.current = false;
        if (!isMuted) {
          toggleMute();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPushToTalk, isMuted, toggleMute]);

  // Socket event handlers
  useEffect(() => {
    const handleVoiceSignal = (message: any) => {
      webrtcStore.handleSignalingMessage(message);
    };

    const handleUserJoined = (data: any) => {
      webrtcStore.addVoiceParticipant({
        userId: data.userId,
        username: data.username || data.userId,
        isMuted: false,
        isConnected: true,
        audioLevel: 0,
      });
    };

    const handleUserLeft = (data: any) => {
      webrtcStore.removeVoiceParticipant(data.userId);
    };

    const handleUserMuted = (data: any) => {
      webrtcStore.updateParticipantMute(data.userId, data.isMuted);
    };

    socketClient.on('voice:signal', handleVoiceSignal);
    socketClient.on('voice:user_joined', handleUserJoined);
    socketClient.on('voice:user_left', handleUserLeft);
    socketClient.on('voice:user_muted', handleUserMuted);

    return () => {
      socketClient.off('voice:signal', handleVoiceSignal);
      socketClient.off('voice:user_joined', handleUserJoined);
      socketClient.off('voice:user_left', handleUserLeft);
      socketClient.off('voice:user_muted', handleUserMuted);
    };
  }, []);

  const handleJoinVoice = async () => {
    try {
      setIsJoining(true);
      setError(null);

      // Initialize audio first
      if (!webrtcStore.localStream) {
        await initializeAudio();
      }

      // Join voice room
      await joinVoiceRoom(roomId);

      // Notify via socket
      socketClient.emit('voice:join', { roomId });

    } catch (error) {
      console.error('Failed to join voice:', error);
      setError('Failed to join voice chat. Check your microphone permissions.');
      onToggle(); // Turn off the toggle
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveVoice = () => {
    leaveVoiceRoom();
    socketClient.emit('voice:leave', { roomId });
  };

  const handleMuteToggle = () => {
    toggleMute();
    socketClient.emit('voice:mute', { isMuted: !isMuted });
  };

  const handleModeToggle = () => {
    setPushToTalk(!isPushToTalk);
  };

  const handleLeave = () => {
    onToggle();
  };

  if (!isActive) {
    return (
      <div className="p-4 bg-primary-50 border-t border-primary-200">
        <Button
          variant="primary"
          onClick={onToggle}
          isLoading={isJoining}
          className="w-full"
        >
          🎤 Join Voice Chat
        </Button>
        {error && (
          <p className="text-sm text-red-600 font-mono mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-primary-200 bg-primary-50">
      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm font-mono">
          {error}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Local Audio Level */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Avatar initials="You" size="sm" status="online" />
          <div className="flex-1">
            <p className="text-sm font-mono font-bold text-primary-950">You</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary-600">
                {isMuted ? 'Muted' : 'Unmuted'}
              </span>
              {!isMuted && (
                <div className="text-blue-500">
                  <AudioLevelMeter level={localAudioLevel} size="sm" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voice Controls */}
        <VoiceControls
          isConnected={isConnected}
          isMuted={isMuted}
          isPushToTalk={isPushToTalk}
          isVoiceActivation={isVoiceActivation}
          onMuteToggle={handleMuteToggle}
          onModeToggle={handleModeToggle}
          onLeave={handleLeave}
        />

        {/* Push to Talk Instructions */}
        {isPushToTalk && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono text-yellow-800 text-center">
            Hold SPACE to talk
          </div>
        )}

        {/* Voice Participants */}
        {voiceParticipants.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-mono font-bold text-primary-950">
              Voice Participants ({voiceParticipants.length})
            </h4>
            {voiceParticipants.map((participant) => (
              <VoiceParticipant key={participant.userId} participant={participant} />
            ))}
          </div>
        )}

        {/* Connection Status */}
        <div className="text-center">
          {isConnecting ? (
            <div className="flex items-center justify-center gap-2 text-primary-600">
              <div className="animate-spin w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full" />
              <span className="text-xs font-mono">Connecting...</span>
            </div>
          ) : isConnected ? (
            <span className="text-xs font-mono text-green-600">✓ Connected to voice</span>
          ) : (
            <span className="text-xs font-mono text-red-600">⚠ Disconnected</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;