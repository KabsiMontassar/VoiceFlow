import { create } from 'zustand';
import { RTCSignalingMessage, WEBRTC_CONFIG } from '../../../shared/src';

interface VoiceParticipant {
  userId: string;
  username: string;
  isMuted: boolean;
  isConnected: boolean;
  audioLevel: number;
}

interface WebRTCState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  roomId: string | null;
  localStream: MediaStream | null;
  
  // Peer connections
  peerConnections: Map<string, RTCPeerConnection>;
  remoteStreams: Map<string, MediaStream>;
  
  // Voice participants
  voiceParticipants: VoiceParticipant[];
  
  // Audio settings
  isMuted: boolean;
  isPushToTalk: boolean;
  isVoiceActivation: boolean;
  pushToTalkKey: string;
  
  // Audio analysis
  audioContext: AudioContext | null;
  audioAnalyser: AnalyserNode | null;
  localAudioLevel: number;
  
  // Error handling
  error: string | null;
  
  // Actions
  initializeAudio: () => Promise<void>;
  joinVoiceRoom: (roomId: string) => Promise<void>;
  leaveVoiceRoom: () => void;
  toggleMute: () => void;
  setPushToTalk: (enabled: boolean) => void;
  setVoiceActivation: (enabled: boolean) => void;
  setPushToTalkKey: (key: string) => void;
  handleSignalingMessage: (message: RTCSignalingMessage) => Promise<void>;
  addVoiceParticipant: (participant: VoiceParticipant) => void;
  removeVoiceParticipant: (userId: string) => void;
  updateParticipantMute: (userId: string, isMuted: boolean) => void;
  updateParticipantAudioLevel: (userId: string, level: number) => void;
  setError: (error: string | null) => void;
  cleanup: () => void;
}

export const useWebRTCStore = create<WebRTCState>((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  roomId: null,
  localStream: null,
  peerConnections: new Map(),
  remoteStreams: new Map(),
  voiceParticipants: [],
  isMuted: false,
  isPushToTalk: false,
  isVoiceActivation: true,
  pushToTalkKey: 'Space',
  audioContext: null,
  audioAnalyser: null,
  localAudioLevel: 0,
  error: null,

  initializeAudio: async () => {
    try {
      set({ error: null });
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Initialize audio context for level monitoring
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);

      set({
        localStream: stream,
        audioContext,
        audioAnalyser: analyser,
      });

      // Start audio level monitoring
      const updateAudioLevel = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = Math.min(average / 128, 1);
        
        set({ localAudioLevel: normalizedLevel });
        
        if (get().localStream) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

    } catch (error) {
      console.error('Failed to initialize audio:', error);
      set({ error: 'Failed to access microphone. Please check permissions.' });
      throw error;
    }
  },

  joinVoiceRoom: async (roomId: string) => {
    const state = get();
    if (state.isConnecting || state.isConnected) return;

    try {
      set({ isConnecting: true, roomId, error: null });

      // Initialize audio if not already done
      if (!state.localStream) {
        await state.initializeAudio();
      }

      set({ isConnected: true, isConnecting: false });
    } catch (error) {
      console.error('Failed to join voice room:', error);
      set({ 
        error: 'Failed to join voice room',
        isConnecting: false,
        isConnected: false,
      });
      throw error;
    }
  },

  leaveVoiceRoom: () => {
    const state = get();
    
    // Close all peer connections
    state.peerConnections.forEach((pc) => {
      pc.close();
    });

    // Stop local stream
    if (state.localStream) {
      state.localStream.getTracks().forEach((track) => track.stop());
    }

    // Close audio context
    if (state.audioContext) {
      state.audioContext.close();
    }

    set({
      isConnected: false,
      isConnecting: false,
      roomId: null,
      localStream: null,
      peerConnections: new Map(),
      remoteStreams: new Map(),
      voiceParticipants: [],
      audioContext: null,
      audioAnalyser: null,
      localAudioLevel: 0,
    });
  },

  toggleMute: () => {
    const state = get();
    const newMutedState = !state.isMuted;
    
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMutedState;
      });
    }

    set({ isMuted: newMutedState });
  },

  setPushToTalk: (enabled: boolean) => {
    set({ isPushToTalk: enabled, isVoiceActivation: !enabled });
  },

  setVoiceActivation: (enabled: boolean) => {
    set({ isVoiceActivation: enabled, isPushToTalk: !enabled });
  },

  setPushToTalkKey: (key: string) => {
    set({ pushToTalkKey: key });
  },

  handleSignalingMessage: async (message: RTCSignalingMessage) => {
    const state = get();
    
    try {
      switch (message.type) {
        case 'user-joined':
          // Create peer connection for new user
          await createPeerConnection(message.from, state);
          break;
          
        case 'user-left':
          // Remove peer connection
          const pc = state.peerConnections.get(message.from);
          if (pc) {
            pc.close();
            state.peerConnections.delete(message.from);
            state.remoteStreams.delete(message.from);
            get().removeVoiceParticipant(message.from);
          }
          break;
          
        case 'offer':
          await handleOffer(message, state);
          break;
          
        case 'answer':
          await handleAnswer(message, state);
          break;
          
        case 'ice-candidate':
          await handleIceCandidate(message, state);
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      set({ error: 'Failed to handle WebRTC signaling' });
    }
  },

  addVoiceParticipant: (participant: VoiceParticipant) => {
    set((state) => ({
      voiceParticipants: [...state.voiceParticipants.filter(p => p.userId !== participant.userId), participant],
    }));
  },

  removeVoiceParticipant: (userId: string) => {
    set((state) => ({
      voiceParticipants: state.voiceParticipants.filter(p => p.userId !== userId),
    }));
  },

  updateParticipantMute: (userId: string, isMuted: boolean) => {
    set((state) => ({
      voiceParticipants: state.voiceParticipants.map(p =>
        p.userId === userId ? { ...p, isMuted } : p
      ),
    }));
  },

  updateParticipantAudioLevel: (userId: string, level: number) => {
    set((state) => ({
      voiceParticipants: state.voiceParticipants.map(p =>
        p.userId === userId ? { ...p, audioLevel: level } : p
      ),
    }));
  },

  setError: (error: string | null) => {
    set({ error });
  },

  cleanup: () => {
    get().leaveVoiceRoom();
  },
}));

// Helper functions for WebRTC operations
const createPeerConnection = async (userId: string, state: WebRTCState): Promise<void> => {
  const peerConnection = new RTCPeerConnection({
    iceServers: [...WEBRTC_CONFIG.ICE_SERVERS],
  });

  // Add local stream
  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, state.localStream!);
    });
  }

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    const [remoteStream] = event.streams;
    state.remoteStreams.set(userId, remoteStream);
    
    // Add participant if not already added
    const existingParticipant = state.voiceParticipants.find(p => p.userId === userId);
    if (!existingParticipant) {
      useWebRTCStore.getState().addVoiceParticipant({
        userId,
        username: userId, // This should be replaced with actual username
        isMuted: false,
        isConnected: true,
        audioLevel: 0,
      });
    }
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      // Send ICE candidate through Socket.IO
      // This would be handled by the socket service
    }
  };

  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log(`Peer connection state with ${userId}:`, peerConnection.connectionState);
    
    if (peerConnection.connectionState === 'disconnected' || 
        peerConnection.connectionState === 'failed') {
      useWebRTCStore.getState().removeVoiceParticipant(userId);
    }
  };

  state.peerConnections.set(userId, peerConnection);
};

const handleOffer = async (message: RTCSignalingMessage, state: WebRTCState): Promise<void> => {
  const peerConnection = state.peerConnections.get(message.from);
  if (!peerConnection || !message.data) return;

  await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data as any));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  // Send answer through Socket.IO
  // This would be handled by the socket service
};

const handleAnswer = async (message: RTCSignalingMessage, state: WebRTCState): Promise<void> => {
  const peerConnection = state.peerConnections.get(message.from);
  if (!peerConnection || !message.data) return;

  await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data as any));
};

const handleIceCandidate = async (message: RTCSignalingMessage, state: WebRTCState): Promise<void> => {
  const peerConnection = state.peerConnections.get(message.from);
  if (!peerConnection || !message.data) return;

  await peerConnection.addIceCandidate(new RTCIceCandidate(message.data as any));
};

export default useWebRTCStore;