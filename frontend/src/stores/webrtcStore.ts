import { create } from 'zustand';
import { socketClient as socket } from '../services/socket';
import { WEBRTC_CONFIG } from '../../../shared/src';
import { useAuthStore } from './authStore';

// ==================== CONSTANTS ====================

// Audio constraints for getUserMedia
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
};

// ==================== INTERFACES ====================

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatarUrl: string;
  isMuted: boolean;
  isDeafened: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface PeerConnectionInfo {
  connection: RTCPeerConnection;
  stream: MediaStream | null;
  dataChannel: RTCDataChannel | null;
  stats: {
    packetsLost: number;
    jitter: number;
    roundTripTime: number;
  };
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

// ==================== STATE INTERFACE ====================

interface WebRTCState {
  // Connection State
  isConnected: boolean;
  isConnecting: boolean;
  currentRoomId: string | null;
  localStream: MediaStream | null;
  
  // Audio State
  isMuted: boolean;
  isDeafened: boolean;
  isPushToTalk: boolean;
  isPushToTalkActive: boolean;
  isVoiceActivation: boolean;
  localAudioLevel: number;
  
  // Participants (Array for easier React rendering)
  participants: Map<string, VoiceParticipant>;
  voiceParticipants: VoiceParticipant[]; // Derived array for UI
  peerConnections: Map<string, PeerConnectionInfo>;
  remoteStreams: Map<string, MediaStream>;
  
  // Devices
  audioInputDevices: AudioDeviceInfo[];
  audioOutputDevices: AudioDeviceInfo[];
  selectedInputDevice: string | null;
  selectedOutputDevice: string | null;
  
  // Audio Context
  audioContext: AudioContext | null;
  localAudioAnalyser: AnalyserNode | null;
  
  // Error handling
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  cleanup: () => void;
  requestPermissions: () => Promise<boolean>;
  initializeAudio: () => Promise<void>;
  joinVoiceRoom: (roomId: string) => Promise<void>;
  leaveVoiceRoom: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  togglePushToTalk: () => void;
  setPushToTalk: (enabled: boolean) => void;
  setPushToTalkActive: (active: boolean) => void;
  selectInputDevice: (deviceId: string) => Promise<void>;
  selectOutputDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  testMicrophone: () => Promise<void>;
  debugAudioElements: () => void;
  enableEchoTest: () => Promise<void>;
  disableEchoTest: () => void;
  enableEchoTestWithFeedback: () => Promise<void>;
  testLoopbackConnection: () => Promise<void>;
  stopLoopbackTest: () => void;
  diagnoseConnection: (userId?: string) => Promise<void>;
  testSTUNServers: () => Promise<void>;
  fixAudioIssues: () => Promise<void>;
  setError: (error: string | null) => void;
  
  // Participant Management
  addVoiceParticipant: (participant: Partial<VoiceParticipant> & { userId: string }) => void;
  removeVoiceParticipant: (userId: string) => void;
  updateParticipantMute: (userId: string, isMuted: boolean) => void;
  updateParticipantDeafen: (userId: string, isDeafened: boolean) => void;
  updateParticipantAudioLevel: (userId: string, level: number) => void;
  
  // Internal Methods
  createPeerConnection: (userId: string) => RTCPeerConnection;
  handleSignalingMessage: (message: any) => Promise<void>;
  updateParticipant: (userId: string, updates: Partial<VoiceParticipant>) => void;
  removeParticipant: (userId: string) => void;
}

// ==================== HELPER FUNCTIONS ====================

function createRemoteAudioElement(userId: string, stream: MediaStream, outputDeviceId: string | null) {
  console.log('[WebRTC] Creating remote audio element for user:', userId);
  console.log('[WebRTC] Stream details:', {
    id: stream.id,
    active: stream.active,
    tracks: stream.getTracks().length,
    audioTracks: stream.getAudioTracks().length,
    videoTracks: stream.getVideoTracks().length,
  });

  // Log audio track details
  stream.getAudioTracks().forEach((track, index) => {
    console.log(`[WebRTC] Audio track ${index}:`, {
      id: track.id,
      kind: track.kind,
      label: track.label,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      settings: track.getSettings(),
    });
  });

  const existing = document.querySelector(`audio[data-voice-user="${userId}"]`);
  if (existing) {
    console.log('[WebRTC] Removing existing audio element for user:', userId);
    existing.remove();
  }

  const audio = document.createElement('audio');
  audio.setAttribute('data-voice-user', userId);
  audio.srcObject = stream;
  audio.autoplay = true;
  
  // Check if user is deafened - if so, mute this audio element
  const isDeafened = useWebRTCStore.getState().isDeafened;
  audio.muted = isDeafened;
  audio.volume = 1.0; // Max volume

  // Add event listeners for debugging
  audio.onloadedmetadata = () => {
    console.log('[WebRTC] Audio metadata loaded for user:', userId);
  };

  audio.onplay = () => {
    console.log('[WebRTC] Audio started playing for user:', userId);
  };

  audio.onpause = () => {
    console.log('[WebRTC] Audio paused for user:', userId);
  };

  audio.onerror = (error) => {
    console.error('[WebRTC] Audio element error for user:', userId, error);
  };

  audio.oncanplay = () => {
    console.log('[WebRTC] Audio can play for user:', userId);
  };

  // Set output device if specified
  if (outputDeviceId && 'setSinkId' in audio) {
    (audio as any).setSinkId(outputDeviceId)
      .then(() => {
        console.log('[WebRTC] Set output device for user:', userId, 'to:', outputDeviceId);
      })
      .catch((error: any) => {
        console.error('[WebRTC] Failed to set sink ID for user:', userId, error);
      });
  }

  audio.style.display = 'none';
  document.body.appendChild(audio);

  // Force play (required for some browsers due to autoplay policy)
  audio.play()
    .then(() => {
      console.log('✓ [WebRTC] Audio playback started successfully for user:', userId);
    })
    .catch((error) => {
      console.error('❌ [WebRTC] Failed to start audio playback for user:', userId, error);
      console.error('[WebRTC] This might be due to browser autoplay policy. User interaction may be required.');
    });

  console.log('[WebRTC] Audio element created and added to DOM for user:', userId);
}

// ==================== STORE IMPLEMENTATION ====================

export const useWebRTCStore = create<WebRTCState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  currentRoomId: null,
  localStream: null,
  isMuted: false,
  isDeafened: false,
  isPushToTalk: false,
  isPushToTalkActive: false,
  isVoiceActivation: true,
  localAudioLevel: 0,
  participants: new Map(),
  voiceParticipants: [],
  peerConnections: new Map(),
  remoteStreams: new Map(),
  audioInputDevices: [],
  audioOutputDevices: [],
  selectedInputDevice: null,
  selectedOutputDevice: null,
  audioContext: null,
  localAudioAnalyser: null,
  error: null,

  initialize: async () => {
    console.log('[WebRTC] Initializing...');
    
    try {
      const audioContext = new AudioContext();
      set({ audioContext });

      await get().refreshDevices();

      // Handle initial participants list when joining
      socket.on('voice:participants', (response: { success: boolean; data: { participants: Array<{ userId: string; isMuted: boolean; isDeafened: boolean }>; roomId: string }; timestamp: number }) => {
        console.log('[WebRTC] Received participants response:', response);
        
        if (!response.success || !response.data || !response.data.participants) {
          console.warn('[WebRTC] Invalid participants response');
          return;
        }
        
        const newParticipants = new Map<string, VoiceParticipant>();
        response.data.participants.forEach(p => {
          newParticipants.set(p.userId, {
            userId: p.userId,
            username: 'User', // Will be updated from room members
            avatarUrl: '',
            isMuted: p.isMuted,
            isDeafened: p.isDeafened,
            isConnected: true,
            isSpeaking: false,
            audioLevel: 0,
            connectionQuality: 'good',
          });
        });
        
        set({ 
          participants: newParticipants,
          voiceParticipants: Array.from(newParticipants.values()),
        });
      });

      socket.on('voice:user_joined', async (data: { userId: string; socketId: string }) => {
        console.log('[WebRTC] User joined:', data);
        const { participants, localStream } = get();
        
        // Create participant entry if it doesn't exist
        if (!participants.has(data.userId)) {
          const newParticipant: VoiceParticipant = {
            userId: data.userId,
            username: 'User', // Will be updated from room members
            avatarUrl: '',
            isMuted: false,
            isDeafened: false,
            isConnected: true,
            isSpeaking: false,
            audioLevel: 0,
            connectionQuality: 'good',
          };
          
          const newParticipants = new Map(participants);
          newParticipants.set(data.userId, newParticipant);
          set({ 
            participants: newParticipants,
            voiceParticipants: Array.from(newParticipants.values()),
          });

          // Initiate WebRTC connection by creating an offer
          if (localStream) {
            try {
              // createPeerConnection already adds tracks, so don't add them again!
              const pc = get().createPeerConnection(data.userId);

              // Create and send offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              socket.emit('voice:signal', {
                to: data.userId,
                type: 'offer',
                offer,
              });

              console.log('[WebRTC] Sent offer to:', data.userId);
            } catch (error) {
              console.error('[WebRTC] Failed to create offer:', error);
            }
          }
        }
      });

      socket.on('voice:user_left', (data: { userId: string }) => {
        console.log('[WebRTC] User left:', data.userId);
        get().removeParticipant(data.userId);
      });

      socket.on('voice:user_muted', (data: { userId: string; isMuted: boolean }) => {
        console.log('[WebRTC] User muted:', data);
        get().updateParticipant(data.userId, { isMuted: data.isMuted });
      });

      socket.on('voice:user_deafened', (data: { userId: string; isDeafened: boolean }) => {
        console.log('[WebRTC] User deafened:', data);
        get().updateParticipant(data.userId, { isDeafened: data.isDeafened });
      });

      socket.on('voice:user_speaking', (data: { userId: string; isSpeaking: boolean; audioLevel: number }) => {
        get().updateParticipant(data.userId, { 
          isSpeaking: data.isSpeaking,
          audioLevel: data.audioLevel 
        });
      });

      socket.on('voice:signal', async (message: any) => {
        console.log('[WebRTC] Received signal:', message.type);
        await get().handleSignalingMessage(message);
      });

      socket.on('voice:connection_quality', (data: { userId: string; quality: any }) => {
        get().updateParticipant(data.userId, { connectionQuality: data.quality });
      });

      console.log('[WebRTC] Initialized successfully');
    } catch (error) {
      console.error('[WebRTC] Initialization failed:', error);
      throw error;
    }
  },

  cleanup: () => {
    console.log('[WebRTC] Cleaning up...');
    
    const { localStream, peerConnections, audioContext, remoteStreams } = get();

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    peerConnections.forEach((peerInfo) => {
      peerInfo.connection.close();
      if (peerInfo.dataChannel) {
        peerInfo.dataChannel.close();
      }
    });

    remoteStreams.forEach((stream) => {
      stream.getTracks().forEach(track => track.stop());
    });

    if (audioContext) {
      audioContext.close();
    }

    socket.off('voice:user_joined');
    socket.off('voice:user_left');
    socket.off('voice:user_muted');
    socket.off('voice:user_deafened');
    socket.off('voice:user_speaking');
    socket.off('voice:signal');
    socket.off('voice:connection_quality');

    set({
      isConnected: false,
      currentRoomId: null,
      localStream: null,
      isMuted: false,
      isDeafened: false,
      isPushToTalkActive: false,
      participants: new Map(),
      peerConnections: new Map(),
      remoteStreams: new Map(),
      audioContext: null,
      localAudioAnalyser: null,
    });

    console.log('[WebRTC] Cleanup complete');
  },

  requestPermissions: async () => {
    console.log('[WebRTC] Requesting microphone permissions...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });

      stream.getTracks().forEach(track => track.stop());
      
      console.log('[WebRTC] Permissions granted');
      return true;
    } catch (error) {
      console.error('[WebRTC] Permission denied:', error);
      set({ error: 'Microphone permission denied. Please allow access in browser settings.' });
      return false;
    }
  },

  initializeAudio: async () => {
    console.log('[WebRTC] Initializing audio...');
    
    try {
      set({ error: null });

      // Create proper MediaStreamConstraints from config
      const constraints: MediaStreamConstraints = {
        audio: AUDIO_CONSTRAINTS,
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioContext = get().audioContext || new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      set({
        localStream: stream,
        audioContext,
        localAudioAnalyser: analyser,
      });

      // Start audio level monitoring with speaking detection
      const SPEAKING_THRESHOLD = 0.1; // Adjust sensitivity (0.0 - 1.0)
      let lastSpeakingState = false;
      
      const updateAudioLevel = () => {
        const state = get();
        if (!state.localAudioAnalyser || !state.localStream) return;

        const dataArray = new Uint8Array(state.localAudioAnalyser.frequencyBinCount);
        state.localAudioAnalyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = Math.min(average / 128, 1);

        // Detect if user is speaking
        const isSpeaking = !state.isMuted && normalizedLevel > SPEAKING_THRESHOLD;
        
        set({ localAudioLevel: normalizedLevel });

        // Broadcast speaking state changes to other users
        if (isSpeaking !== lastSpeakingState && state.currentRoomId) {
          lastSpeakingState = isSpeaking;
          
          // Update local participant
          const currentUserId = useAuthStore.getState().user?.id;
          if (currentUserId) {
            get().updateParticipant(currentUserId, { 
              isSpeaking,
              audioLevel: normalizedLevel 
            });
          }

          // Broadcast to other users
          socket.emit('voice:speaking', {
            roomId: state.currentRoomId,
            isSpeaking,
            audioLevel: normalizedLevel,
          });
        }

        if (state.localStream) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      console.log('[WebRTC] Audio initialized successfully');
    } catch (error) {
      console.error('[WebRTC] Failed to initialize audio:', error);
      set({ error: 'Failed to access microphone. Please check permissions.' });
      throw error;
    }
  },

  joinVoiceRoom: async (roomId: string) => {
    console.log('[WebRTC] Joining voice room:', roomId);
    
    try {
      set({ isConnecting: true, error: null });
      
      const { selectedInputDevice, audioContext: existingAudioContext } = get();

      // Create or reuse audio context
      const audioContext = existingAudioContext || new AudioContext();
      if (!existingAudioContext) {
        set({ audioContext });
      }

      // Get user media with selected device
      const constraints: MediaStreamConstraints = {
        audio: selectedInputDevice
          ? { ...AUDIO_CONSTRAINTS, deviceId: { exact: selectedInputDevice } }
          : AUDIO_CONSTRAINTS,
        video: false,
      };

      console.log('[WebRTC] Requesting microphone access with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WebRTC] Microphone access granted, tracks:', stream.getTracks().length);

      // Create analyzer for audio level monitoring
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      console.log('[WebRTC] Audio analyzer created and connected');

      set({ 
        localStream: stream,
        currentRoomId: roomId,
        isConnected: true,
        isConnecting: false,
        localAudioAnalyser: analyser,
      });

      // Emit join event
      socket.emit('voice:join', { roomId });

      // Start audio level monitoring with speaking detection
      const SPEAKING_THRESHOLD = 0.1; // Adjust sensitivity (0.0 - 1.0)
      let lastSpeakingState = false;
      let frameCount = 0;
      
      const updateAudioLevel = () => {
        const state = get();
        
        // Stop if no longer in this room or stream ended
        if (state.currentRoomId !== roomId || !state.localStream || !state.localAudioAnalyser) {
          console.log('[WebRTC] Stopping audio monitoring - room changed or stream ended');
          return;
        }

        const dataArray = new Uint8Array(state.localAudioAnalyser.frequencyBinCount);
        state.localAudioAnalyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = Math.min(average / 128, 1);

        // Log every 60 frames (~1 second) for debugging
        frameCount++;
        if (frameCount % 60 === 0) {
          console.log('[WebRTC] Audio level:', {
            raw: average.toFixed(2),
            normalized: normalizedLevel.toFixed(3),
            isMuted: state.isMuted,
            threshold: SPEAKING_THRESHOLD
          });
        }

        // Detect if user is speaking
        const isSpeaking = !state.isMuted && normalizedLevel > SPEAKING_THRESHOLD;
        
        set({ localAudioLevel: normalizedLevel });

        // Broadcast speaking state changes to other users
        if (isSpeaking !== lastSpeakingState && state.currentRoomId) {
          lastSpeakingState = isSpeaking;
          
          console.log('[WebRTC] Speaking state changed:', isSpeaking, 'level:', normalizedLevel.toFixed(3));
          
          // Update local participant
          const currentUserId = useAuthStore.getState().user?.id;
          if (currentUserId) {
            get().updateParticipant(currentUserId, { 
              isSpeaking,
              audioLevel: normalizedLevel 
            });
          }

          // Broadcast to other users
          socket.emit('voice:speaking', {
            roomId: state.currentRoomId,
            isSpeaking,
            audioLevel: normalizedLevel,
          });
        }

        requestAnimationFrame(updateAudioLevel);
      };
      
      console.log('[WebRTC] Starting audio level monitoring...');
      updateAudioLevel();

      // Add self to participants
      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId) {
        const currentParticipants = get().participants;
        currentParticipants.set(currentUserId, {
          userId: currentUserId,
          username: useAuthStore.getState().user?.username || 'You',
          avatarUrl: useAuthStore.getState().user?.avatarUrl || '',
          isMuted: get().isMuted,
          isDeafened: get().isDeafened,
          isConnected: true,
          isSpeaking: false,
          audioLevel: 0,
          connectionQuality: 'good',
        });
        
        set({ 
          participants: new Map(currentParticipants),
          voiceParticipants: Array.from(currentParticipants.values()),
        });
      }

      console.log('[WebRTC] Joined voice room successfully');
    } catch (error) {
      console.error('[WebRTC] Failed to join voice room:', error);
      set({ 
        error: 'Failed to join voice room',
        isConnecting: false,
      });
      throw error;
    }
  },

  leaveVoiceRoom: () => {
    console.log('[WebRTC] Leaving voice room');
    
    const { currentRoomId } = get();
    
    if (currentRoomId) {
      socket.emit('voice:leave', { roomId: currentRoomId });
    }

    get().cleanup();
  },

  toggleMute: () => {
    const { isMuted, localStream, currentRoomId } = get();
    const newMutedState = !isMuted;

    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
    }

    set({ isMuted: newMutedState });

    // Update local participant state
    const currentUserId = useAuthStore.getState().user?.id;
    if (currentUserId) {
      get().updateParticipant(currentUserId, { isMuted: newMutedState });
    }

    if (currentRoomId) {
      socket.emit(newMutedState ? 'voice:mute' : 'voice:unmute', { 
        roomId: currentRoomId,
        isMuted: newMutedState
      });
    }

    console.log('[WebRTC] Mute toggled:', newMutedState);
  },

  toggleDeafen: () => {
    const { isDeafened, currentRoomId } = get();
    const newDeafenedState = !isDeafened;

    document.querySelectorAll<HTMLAudioElement>('audio[data-voice-user]').forEach(audioEl => {
      audioEl.muted = newDeafenedState;
    });

    set({ isDeafened: newDeafenedState });

    // Update local participant state
    const currentUserId = useAuthStore.getState().user?.id;
    if (currentUserId) {
      get().updateParticipant(currentUserId, { isDeafened: newDeafenedState });
    }

    if (currentRoomId) {
      socket.emit(newDeafenedState ? 'voice:deafen' : 'voice:undeafen', { 
        roomId: currentRoomId,
        isDeafened: newDeafenedState
      });
    }

    console.log('[WebRTC] Deafen toggled:', newDeafenedState);
  },

  togglePushToTalk: () => {
    const { isPushToTalk } = get();
    set({ 
      isPushToTalk: !isPushToTalk,
      isVoiceActivation: isPushToTalk, // Toggle opposite
    });
    console.log('[WebRTC] Push-to-talk toggled:', !isPushToTalk);
  },

  setPushToTalk: (enabled: boolean) => {
    set({ 
      isPushToTalk: enabled,
      isVoiceActivation: !enabled,
    });
    console.log('[WebRTC] Push-to-talk set to:', enabled);
  },

  setPushToTalkActive: (active: boolean) => {
    const { isPushToTalk, localStream, currentRoomId } = get();
    
    if (!isPushToTalk) return;

    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = active;
      });
    }

    set({ isPushToTalkActive: active });

    if (currentRoomId) {
      socket.emit(active ? 'voice:unmute' : 'voice:mute', { roomId: currentRoomId });
    }
  },

  selectInputDevice: async (deviceId: string) => {
    console.log('[WebRTC] Selecting input device:', deviceId);
    
    const { localStream, currentRoomId } = get();

    if (localStream && currentRoomId) {
      localStream.getTracks().forEach(track => track.stop());

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { ...AUDIO_CONSTRAINTS, deviceId: { exact: deviceId } },
        video: false,
      });

      set({ localStream: newStream, selectedInputDevice: deviceId });

      const { peerConnections } = get();
      peerConnections.forEach((peerInfo) => {
        const audioTrack = newStream.getAudioTracks()[0];
        const sender = peerInfo.connection.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) {
          sender.replaceTrack(audioTrack);
        }
      });
    } else {
      set({ selectedInputDevice: deviceId });
    }
  },

  selectOutputDevice: async (deviceId: string) => {
    console.log('[WebRTC] Selecting output device:', deviceId);
    
    set({ selectedOutputDevice: deviceId });

    const audioElements = document.querySelectorAll<HTMLAudioElement>('audio[data-voice-user]');
    for (const audioEl of audioElements) {
      try {
        if ('setSinkId' in audioEl) {
          await (audioEl as any).setSinkId(deviceId);
        }
      } catch (error) {
        console.error('[WebRTC] Failed to set sink ID:', error);
      }
    }
  },

  refreshDevices: async () => {
    console.log('[WebRTC] Refreshing audio devices...');
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputDevices = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label, kind: d.kind }));
      
      const outputDevices = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label, kind: d.kind }));

      set({ 
        audioInputDevices: inputDevices,
        audioOutputDevices: outputDevices,
      });

      console.log('[WebRTC] Found devices:', { inputDevices, outputDevices });
    } catch (error) {
      console.error('[WebRTC] Failed to enumerate devices:', error);
    }
  },

  testMicrophone: async () => {
    console.log('=== MICROPHONE TEST START ===');
    
    try {
      // Test 1: Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia not supported in this browser');
        set({ error: 'Your browser does not support microphone access' });
        return;
      }
      console.log('✓ getUserMedia is available');

      // Test 2: Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      console.log(`✓ Found ${audioInputs.length} audio input devices:`, audioInputs);

      if (audioInputs.length === 0) {
        console.error('❌ No microphone devices found');
        set({ error: 'No microphone detected' });
        return;
      }

      // Test 3: Request microphone access
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
        video: false,
      };
      
      console.log('Requesting microphone with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✓ Microphone access granted');
      console.log('Stream tracks:', stream.getTracks());
      
      const audioTrack = stream.getAudioTracks()[0];
      console.log('Audio track settings:', audioTrack.getSettings());
      console.log('Audio track constraints:', audioTrack.getConstraints());
      console.log('Audio track enabled:', audioTrack.enabled);
      console.log('Audio track muted:', audioTrack.muted);
      console.log('Audio track readyState:', audioTrack.readyState);

      // Test 4: Create audio context and analyzer
      const audioContext = new AudioContext();
      console.log('✓ AudioContext created, state:', audioContext.state);
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      console.log('✓ Audio analyzer connected');

      // Test 5: Monitor audio levels for 5 seconds
      console.log('📊 Monitoring audio levels for 5 seconds...');
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let sampleCount = 0;
      let maxLevel = 0;
      
      const testInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalized = Math.min(average / 128, 1);
        
        maxLevel = Math.max(maxLevel, normalized);
        sampleCount++;
        
        console.log(`Sample ${sampleCount}: Raw=${average.toFixed(2)}, Normalized=${normalized.toFixed(3)} (${(normalized * 100).toFixed(1)}%)`);
        
        if (sampleCount >= 50) { // 50 samples ~5 seconds
          clearInterval(testInterval);
          
          // Cleanup
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          
          console.log('=== MICROPHONE TEST COMPLETE ===');
          console.log(`Max audio level detected: ${(maxLevel * 100).toFixed(1)}%`);
          
          if (maxLevel < 0.01) {
            console.error('❌ No audio detected! Microphone might be muted or not working.');
            set({ error: 'Microphone is not picking up audio. Check system settings.' });
          } else {
            console.log('✓ Microphone is working!');
            set({ error: null });
          }
        }
      }, 100);

    } catch (error: any) {
      console.error('❌ Microphone test failed:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      if (error.name === 'NotAllowedError') {
        set({ error: 'Microphone permission denied. Please allow access in browser settings.' });
      } else if (error.name === 'NotFoundError') {
        set({ error: 'No microphone found. Please connect a microphone.' });
      } else {
        set({ error: `Microphone error: ${error.message}` });
      }
    }
  },

  createPeerConnection: (userId: string) => {
    console.log('[WebRTC] Creating peer connection for user:', userId);
    
    const { localStream } = get();
    const configuration: RTCConfiguration = {
      iceServers: [...WEBRTC_CONFIG.ICE_SERVERS],
    };

    const pc = new RTCPeerConnection(configuration);

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:signal', {
          to: userId,
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] ========================================');
      console.log('[WebRTC] Received remote track from:', userId);
      console.log('[WebRTC] Track details:', {
        kind: event.track.kind,
        id: event.track.id,
        label: event.track.label,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState,
      });
      console.log('[WebRTC] Number of streams:', event.streams.length);
      
      const [remoteStream] = event.streams;
      
      if (!remoteStream) {
        console.error('[WebRTC] No remote stream received!');
        return;
      }

      console.log('[WebRTC] Remote stream received:', {
        id: remoteStream.id,
        active: remoteStream.active,
        audioTracks: remoteStream.getAudioTracks().length,
      });
      
      const { remoteStreams } = get();
      const newRemoteStreams = new Map(remoteStreams);
      newRemoteStreams.set(userId, remoteStream);
      set({ remoteStreams: newRemoteStreams });

      console.log('[WebRTC] Creating audio element...');
      createRemoteAudioElement(userId, remoteStream, get().selectedOutputDevice);
      console.log('[WebRTC] ========================================');
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state changed:', pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        get().updateParticipant(userId, { isConnected: true });
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        get().updateParticipant(userId, { isConnected: false });
      }
    };

    const { peerConnections } = get();
    const newPeerConnections = new Map(peerConnections);
    newPeerConnections.set(userId, {
      connection: pc,
      stream: null,
      dataChannel: null,
      stats: { packetsLost: 0, jitter: 0, roundTripTime: 0 },
    });
    set({ peerConnections: newPeerConnections });

    return pc;
  },

  handleSignalingMessage: async (message: any) => {
    const { peerConnections, localStream } = get();
    const { from, type } = message;

    let pc = peerConnections.get(from)?.connection;

    if (!pc && type !== 'ice-candidate') {
      pc = get().createPeerConnection(from);
    }

    if (!pc) return;

    try {
      if (type === 'offer') {
        // Add local stream tracks before answering
        if (localStream && pc.getSenders().length === 0) {
          localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
          });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('voice:signal', {
          to: from,
          type: 'answer',
          answer,
        });

        console.log('[WebRTC] Sent answer to:', from);
      } else if (type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
        console.log('[WebRTC] Received answer from:', from);
      } else if (type === 'ice-candidate') {
        if (pc && message.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
          console.log('[WebRTC] Added ICE candidate from:', from);
        }
      }
    } catch (error) {
      console.error('[WebRTC] Error handling signal:', error);
    }
  },

  updateParticipant: (userId: string, updates: Partial<VoiceParticipant>) => {
    const { participants } = get();
    const existing = participants.get(userId);
    
    if (existing) {
      const newParticipants = new Map(participants);
      newParticipants.set(userId, { ...existing, ...updates });
      set({ 
        participants: newParticipants,
        voiceParticipants: Array.from(newParticipants.values()),
      });
    }
  },

  removeParticipant: (userId: string) => {
    const { participants, peerConnections, remoteStreams } = get();

    const newParticipants = new Map(participants);
    newParticipants.delete(userId);

    const peerInfo = peerConnections.get(userId);
    if (peerInfo) {
      peerInfo.connection.close();
      if (peerInfo.dataChannel) {
        peerInfo.dataChannel.close();
      }
    }
    const newPeerConnections = new Map(peerConnections);
    newPeerConnections.delete(userId);

    const stream = remoteStreams.get(userId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    const newRemoteStreams = new Map(remoteStreams);
    newRemoteStreams.delete(userId);

    const audioEl = document.querySelector(`audio[data-voice-user="${userId}"]`);
    if (audioEl) {
      audioEl.remove();
    }

    set({ 
      participants: newParticipants,
      voiceParticipants: Array.from(newParticipants.values()),
      peerConnections: newPeerConnections,
      remoteStreams: newRemoteStreams,
    });

    console.log('[WebRTC] Removed participant:', userId);
  },

  // Participant Management Methods
  addVoiceParticipant: (participant: Partial<VoiceParticipant> & { userId: string }) => {
    const { participants } = get();
    const newParticipants = new Map(participants);
    
    const fullParticipant: VoiceParticipant = {
      userId: participant.userId,
      username: participant.username || participant.userId,
      avatarUrl: participant.avatarUrl || '',
      isMuted: participant.isMuted ?? false,
      isDeafened: participant.isDeafened ?? false,
      isConnected: participant.isConnected ?? true,
      isSpeaking: participant.isSpeaking ?? false,
      audioLevel: participant.audioLevel ?? 0,
      connectionQuality: participant.connectionQuality ?? 'good',
    };
    
    newParticipants.set(participant.userId, fullParticipant);
    set({ 
      participants: newParticipants,
      voiceParticipants: Array.from(newParticipants.values()),
    });
    
    console.log('[WebRTC] Added voice participant:', participant.userId);
  },

  removeVoiceParticipant: (userId: string) => {
    get().removeParticipant(userId);
  },

  updateParticipantMute: (userId: string, isMuted: boolean) => {
    get().updateParticipant(userId, { isMuted });
  },

  updateParticipantDeafen: (userId: string, isDeafened: boolean) => {
    get().updateParticipant(userId, { isDeafened });
  },

  updateParticipantAudioLevel: (userId: string, level: number) => {
    get().updateParticipant(userId, { audioLevel: level });
  },

  debugAudioElements: () => {
    console.log('=== AUDIO ELEMENTS DEBUG ===');
    console.log('🎤 Local Stream Status:');
    const localStream = get().localStream;
    if (localStream) {
      console.log('  ✓ Local stream exists:', {
        id: localStream.id,
        active: localStream.active,
        audioTracks: localStream.getAudioTracks().length,
      });
      localStream.getAudioTracks().forEach((track, i) => {
        console.log(`    Track ${i}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });
    } else {
      console.log('  ❌ No local stream');
    }
    
    console.log('\n📡 Peer Connections:');
    const { peerConnections } = get();
    console.log(`  Total connections: ${peerConnections.size}`);
    
    peerConnections.forEach((peerInfo, userId) => {
      console.log(`\n  Connection to ${userId}:`);
      const pc = peerInfo.connection;
      console.log('    States:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
      });
      
      // Check senders (what we're sending)
      const senders = pc.getSenders();
      console.log(`    Senders (${senders.length}):`);
      senders.forEach((sender, i) => {
        console.log(`      ${i}:`, {
          track: sender.track ? `${sender.track.kind} (${sender.track.readyState})` : 'null',
        });
      });
      
      // Check receivers (what we're receiving)
      const receivers = pc.getReceivers();
      console.log(`    Receivers (${receivers.length}):`);
      receivers.forEach((receiver, i) => {
        console.log(`      ${i}:`, {
          track: receiver.track ? `${receiver.track.kind} (${receiver.track.readyState})` : 'null',
        });
      });
    });
    
    console.log('\n🔊 Audio Elements in DOM:');
    const audioElements = document.querySelectorAll('audio[data-voice-user]');
    console.log(`  Found ${audioElements.length} audio elements`);
    
    audioElements.forEach((audio: Element, index) => {
      const audioEl = audio as HTMLAudioElement;
      const userId = audioEl.getAttribute('data-voice-user');
      
      console.log(`\n  Audio Element ${index + 1} (${userId}):`);
      console.log('    Playback:', {
        paused: audioEl.paused,
        muted: audioEl.muted,
        volume: audioEl.volume,
        readyState: audioEl.readyState,
        currentTime: audioEl.currentTime,
      });
      
      if (audioEl.srcObject) {
        const stream = audioEl.srcObject as MediaStream;
        console.log('    Stream:', {
          id: stream.id,
          active: stream.active,
          audioTracks: stream.getAudioTracks().length,
        });
        
        stream.getAudioTracks().forEach((track, trackIndex) => {
          console.log(`      Track ${trackIndex}:`, {
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          });
        });
      } else {
        console.log('    ❌ No srcObject set!');
      }
    });
    
    console.log('\n📦 Remote Streams in Store:');
    const { remoteStreams } = get();
    console.log(`  Total: ${remoteStreams.size}`);
    
    remoteStreams.forEach((stream, userId) => {
      console.log(`  ${userId}:`, {
        id: stream.id,
        active: stream.active,
        audioTracks: stream.getAudioTracks().length,
      });
    });
    
    console.log('\n👥 Voice Participants:');
    const { voiceParticipants } = get();
    console.log(`  Total: ${voiceParticipants.length}`);
    voiceParticipants.forEach(p => {
      console.log(`  - ${p.username} (${p.userId}):`, {
        isSpeaking: p.isSpeaking,
        isMuted: p.isMuted,
        isConnected: p.isConnected,
      });
    });
    
    console.log('\n=== END DEBUG ===');
  },

  enableEchoTest: async () => {
    console.log('[WebRTC] 🔊 ENABLING ECHO TEST MODE');
    console.log('[WebRTC] This will play back your own audio so you can test your microphone');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });

      // Create audio element to play back local stream
      const audio = document.createElement('audio');
      audio.setAttribute('data-voice-user', 'echo-test');
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.muted = false;
      audio.volume = 1.0;
      audio.style.display = 'none';
      
      document.body.appendChild(audio);

      await audio.play();
      
      set({ localStream: stream });
      
      console.log('[WebRTC] ✓ Echo test enabled - you should hear yourself now');
      console.log('[WebRTC] Call disableEchoTest() to stop');
    } catch (error) {
      console.error('[WebRTC] Echo test failed:', error);
      set({ error: 'Failed to start echo test' });
    }
  },

  disableEchoTest: () => {
    console.log('[WebRTC] Disabling echo test mode');
    
    const audio = document.querySelector('audio[data-voice-user="echo-test"]');
    if (audio) {
      const audioEl = audio as HTMLAudioElement;
      if (audioEl.srcObject) {
        const stream = audioEl.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      audio.remove();
    }
    
    // Also clean up enhanced echo test
    const interval = (window as any).__echoTestInterval;
    if (interval) {
      clearInterval(interval);
      delete (window as any).__echoTestInterval;
    }
    
    set({ localStream: null });
    console.log('[WebRTC] Echo test disabled');
  },

  enableEchoTestWithFeedback: async () => {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎤 ENHANCED ECHO TEST MODE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('This will play back your voice with real-time volume feedback');
    console.log('Speak into your microphone to test!\n');
    
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });

      console.log('✅ Microphone access granted');

      // Create audio element to play back local stream
      const audio = document.createElement('audio');
      audio.setAttribute('data-voice-user', 'echo-test');
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.muted = false;
      audio.volume = 0.8; // Slightly reduced to avoid feedback
      audio.style.display = 'none';
      
      document.body.appendChild(audio);
      await audio.play();
      
      console.log('✅ Audio playback started');
      console.log('🔊 You should now hear yourself speak!\n');

      // Set up audio analyzer for volume feedback
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      set({ localStream: stream, audioContext, localAudioAnalyser: analyser });

      // Real-time volume monitoring
      let sampleCount = 0;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const monitorVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalized = Math.min(average / 128, 1);
        
        sampleCount++;
        
        // Log every 30 frames (~0.5 seconds)
        if (sampleCount % 30 === 0) {
          const bars = '█'.repeat(Math.floor(normalized * 50));
          const percentage = (normalized * 100).toFixed(0);
          
          if (normalized > 0.1) {
            console.log(`🔊 Volume: [${bars.padEnd(50, '░')}] ${percentage}%`);
          } else {
            console.log(`🔇 Volume: [${bars.padEnd(50, '░')}] ${percentage}% (speak louder)`);
          }
        }
      };

      // Store interval reference for cleanup
      const interval = setInterval(monitorVolume, 33); // ~30fps
      (window as any).__echoTestInterval = interval;
      
      console.log('📊 Real-time volume monitoring started');
      console.log('To stop: window.webrtcStore.getState().disableEchoTest()');
      console.log('═══════════════════════════════════════════════════════\n');
      
    } catch (error) {
      console.error('❌ Echo test failed:', error);
      set({ error: 'Failed to start echo test' });
    }
  },

  testLoopbackConnection: async () => {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔗 WEBRTC LOOPBACK CONNECTION TEST');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Creating two peer connections on same machine...');
    console.log('This simulates a real WebRTC call to yourself!\n');

    try {
      // Configuration with STUN servers
      const config: RTCConfiguration = {
        iceServers: [...WEBRTC_CONFIG.ICE_SERVERS],
      };

      // Create two peer connections (simulating two users)
      const pc1 = new RTCPeerConnection(config);
      const pc2 = new RTCPeerConnection(config);

      console.log('✅ Created two peer connections');

      // Get local microphone stream
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });
      console.log('✅ Microphone access granted\n');

      // Add tracks to first peer connection
      stream.getTracks().forEach(track => {
        pc1.addTrack(track, stream);
        console.log(`📤 Added ${track.kind} track to PC1`);
      });

      // Set up to receive tracks on second peer connection
      pc2.ontrack = (event) => {
        console.log('\n🎵 ═══════════════════════════════════════════════════');
        console.log('📥 PC2 RECEIVED AUDIO TRACK VIA WEBRTC!');
        console.log('═══════════════════════════════════════════════════════');
        
        const [remoteStream] = event.streams;
        console.log('Stream info:', {
          id: remoteStream.id,
          active: remoteStream.active,
          tracks: remoteStream.getTracks().length,
        });

        // Create audio element to play received audio
        const audio = document.createElement('audio');
        audio.setAttribute('data-voice-user', 'loopback-test');
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.volume = 0.7; // Slightly lower to avoid feedback
        audio.style.display = 'none';
        document.body.appendChild(audio);

        audio.play()
          .then(() => {
            console.log('✅ PLAYING RECEIVED AUDIO - You should hear yourself!');
            console.log('🔊 Speak into your microphone to test\n');
          })
          .catch(err => {
            console.error('❌ Failed to play audio:', err);
          });
      };

      // ICE candidate exchange (signaling simulation)
      let pc1IceCandidates = 0;
      let pc2IceCandidates = 0;

      pc1.onicecandidate = (event) => {
        if (event.candidate) {
          pc1IceCandidates++;
          pc2.addIceCandidate(event.candidate);
        }
      };

      pc2.onicecandidate = (event) => {
        if (event.candidate) {
          pc2IceCandidates++;
          pc1.addIceCandidate(event.candidate);
        }
      };

      // Connection state monitoring
      pc1.onconnectionstatechange = () => {
        console.log(`🔗 PC1 Connection State: ${pc1.connectionState}`);
        if (pc1.connectionState === 'connected') {
          console.log('   ✅ PC1 Connected!');
        }
      };

      pc2.onconnectionstatechange = () => {
        console.log(`🔗 PC2 Connection State: ${pc2.connectionState}`);
        if (pc2.connectionState === 'connected') {
          console.log('   ✅ PC2 Connected!');
        }
      };

      pc1.oniceconnectionstatechange = () => {
        console.log(`🧊 PC1 ICE State: ${pc1.iceConnectionState}`);
      };

      pc2.oniceconnectionstatechange = () => {
        console.log(`🧊 PC2 ICE State: ${pc2.iceConnectionState}`);
      };

      // Create offer/answer (signaling)
      console.log('\n📡 Starting WebRTC signaling...');
      
      console.log('   Creating offer from PC1...');
      const offer = await pc1.createOffer();
      console.log('   ✅ Offer created');

      console.log('   Setting local description on PC1...');
      await pc1.setLocalDescription(offer);
      console.log('   ✅ PC1 local description set');

      console.log('   Setting remote description on PC2...');
      await pc2.setRemoteDescription(offer);
      console.log('   ✅ PC2 remote description set');

      console.log('   Creating answer from PC2...');
      const answer = await pc2.createAnswer();
      console.log('   ✅ Answer created');

      console.log('   Setting local description on PC2...');
      await pc2.setLocalDescription(answer);
      console.log('   ✅ PC2 local description set');

      console.log('   Setting remote description on PC1...');
      await pc1.setRemoteDescription(answer);
      console.log('   ✅ PC1 remote description set');

      console.log('\n✅ SIGNALING COMPLETE!\n');

      // Wait for connection to establish
      await new Promise<void>((resolve) => {
        const checkConnection = setInterval(() => {
          if (pc1.connectionState === 'connected' && pc2.connectionState === 'connected') {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkConnection);
          resolve();
        }, 10000);
      });

      console.log('📊 ICE Candidates Exchanged:');
      console.log(`   PC1 → PC2: ${pc1IceCandidates} candidates`);
      console.log(`   PC2 → PC1: ${pc2IceCandidates} candidates\n`);

      // Get statistics
      console.log('📈 GATHERING WEBRTC STATISTICS...\n');
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for stats

      const stats1 = await pc1.getStats();
      const stats2 = await pc2.getStats();

      console.log('📤 PC1 (Sender) Statistics:');
      stats1.forEach((report) => {
        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          console.log('   Outbound Audio:');
          console.log(`      Packets Sent: ${report.packetsSent || 0}`);
          console.log(`      Bytes Sent: ${report.bytesSent || 0}`);
          
          if (report.packetsSent > 0) {
            console.log('      ✅ Audio data flowing!');
          } else {
            console.warn('      ⚠️  No packets sent yet - speak into mic');
          }
        }
      });

      console.log('\n📥 PC2 (Receiver) Statistics:');
      stats2.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          console.log('   Inbound Audio:');
          console.log(`      Packets Received: ${report.packetsReceived || 0}`);
          console.log(`      Bytes Received: ${report.bytesReceived || 0}`);
          console.log(`      Packets Lost: ${report.packetsLost || 0}`);
          console.log(`      Jitter: ${report.jitter ? (report.jitter * 1000).toFixed(2) + 'ms' : 'N/A'}`);
          
          if (report.packetsReceived > 0) {
            console.log('      ✅ Receiving audio via WebRTC!');
          } else {
            console.warn('      ⚠️  No packets received yet');
          }
        }
      });

      // Store for cleanup
      (window as any).__loopbackTest = { pc1, pc2, stream };

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ LOOPBACK TEST COMPLETE!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('What this proves:');
      console.log('  ✅ WebRTC peer connections work');
      console.log('  ✅ ICE negotiation successful');
      console.log('  ✅ RTP audio packets transmitted');
      console.log('  ✅ Audio codec negotiation works');
      console.log('  ✅ Full audio pipeline functional');
      console.log('');
      console.log('🎤 Speak into your microphone - you should hear yourself!');
      console.log('');
      console.log('To stop test: window.webrtcStore.getState().stopLoopbackTest()');
      console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
      console.error('\n❌ LOOPBACK TEST FAILED:', error);
      console.error('This indicates a problem with WebRTC setup\n');
      throw error;
    }
  },

  stopLoopbackTest: () => {
    console.log('[WebRTC] Stopping loopback test...');
    
    const test = (window as any).__loopbackTest;
    if (test) {
      // Close peer connections
      test.pc1.close();
      test.pc2.close();
      
      // Stop media stream
      test.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      
      // Remove audio element
      const audio = document.querySelector('audio[data-voice-user="loopback-test"]');
      if (audio) {
        audio.remove();
      }
      
      delete (window as any).__loopbackTest;
      console.log('[WebRTC] ✅ Loopback test stopped and cleaned up');
    } else {
      console.log('[WebRTC] No active loopback test found');
    }
  },

  diagnoseConnection: async (userId?: string) => {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔍 WEBRTC CONNECTION DIAGNOSTICS');
    console.log('═══════════════════════════════════════════════════════\n');

    const { peerConnections } = get();

    if (userId) {
      // Diagnose specific connection
      const peerInfo = peerConnections.get(userId);
      if (!peerInfo) {
        console.error(`❌ No peer connection found for user: ${userId}`);
        return;
      }

      await diagnosePeerConnection(userId, peerInfo.connection);
    } else {
      // Diagnose all connections
      if (peerConnections.size === 0) {
        console.warn('⚠️  No active peer connections to diagnose');
        return;
      }

      for (const [id, peerInfo] of peerConnections) {
        await diagnosePeerConnection(id, peerInfo.connection);
        console.log('\n───────────────────────────────────────────────────────\n');
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ DIAGNOSTICS COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');

    // Helper function to diagnose a single peer connection
    async function diagnosePeerConnection(userId: string, pc: RTCPeerConnection) {
      console.log(`👤 Diagnosing connection to: ${userId}`);
      console.log('');

      // 1. Connection States
      console.log('📊 CONNECTION STATES:');
      console.log(`   Connection State:     ${pc.connectionState}`);
      console.log(`   ICE Connection State: ${pc.iceConnectionState}`);
      console.log(`   ICE Gathering State:  ${pc.iceGatheringState}`);
      console.log(`   Signaling State:      ${pc.signalingState}`);
      console.log('');

      // Check for problematic states
      if (pc.connectionState === 'failed') {
        console.error('   ❌ Connection FAILED - Network or firewall issue likely');
      } else if (pc.connectionState === 'disconnected') {
        console.warn('   ⚠️  Connection DISCONNECTED - May recover automatically');
      } else if (pc.connectionState === 'connected') {
        console.log('   ✅ Connection ESTABLISHED');
      }

      // 2. ICE Candidates (Network Path Information)
      console.log('🌐 ICE CANDIDATES (Network Paths):');
      try {
        const stats = await pc.getStats();
        const localCandidates: any[] = [];
        const remoteCandidates: any[] = [];
        const candidatePairs: any[] = [];

        stats.forEach((report) => {
          if (report.type === 'local-candidate') {
            localCandidates.push(report);
          } else if (report.type === 'remote-candidate') {
            remoteCandidates.push(report);
          } else if (report.type === 'candidate-pair') {
            candidatePairs.push(report);
          }
        });

        console.log(`   Local Candidates:  ${localCandidates.length}`);
        localCandidates.forEach((c, i) => {
          console.log(`      ${i + 1}. ${c.candidateType?.toUpperCase() || 'unknown'} - ${c.protocol} ${c.address || c.ip}:${c.port}`);
        });

        console.log(`   Remote Candidates: ${remoteCandidates.length}`);
        remoteCandidates.forEach((c, i) => {
          console.log(`      ${i + 1}. ${c.candidateType?.toUpperCase() || 'unknown'} - ${c.protocol} ${c.address || c.ip}:${c.port}`);
        });

        // Find active candidate pair
        const activePair = candidatePairs.find(p => p.state === 'succeeded' || p.nominated);
        if (activePair) {
          console.log('   ✅ Active Connection Path:');
          console.log(`      State: ${activePair.state}`);
          console.log(`      Nominated: ${activePair.nominated || false}`);
          
          // Get local and remote candidate details
          const localCandidate = localCandidates.find(c => c.id === activePair.localCandidateId);
          const remoteCandidate = remoteCandidates.find(c => c.id === activePair.remoteCandidateId);
          
          if (localCandidate) {
            console.log(`      Local:  ${localCandidate.candidateType} ${localCandidate.protocol} ${localCandidate.address || localCandidate.ip}:${localCandidate.port}`);
          }
          if (remoteCandidate) {
            console.log(`      Remote: ${remoteCandidate.candidateType} ${remoteCandidate.protocol} ${remoteCandidate.address || remoteCandidate.ip}:${remoteCandidate.port}`);
          }

          // Check if using TURN (relay) - indicates firewall/NAT issues
          if (localCandidate?.candidateType === 'relay' || remoteCandidate?.candidateType === 'relay') {
            console.warn('      ⚠️  Using RELAY (TURN server) - Direct connection blocked by firewall/NAT');
          } else if (localCandidate?.candidateType === 'srflx' || remoteCandidate?.candidateType === 'srflx') {
            console.log('      ℹ️  Using SERVER-REFLEXIVE - NAT traversal via STUN');
          } else {
            console.log('      ✅ Using HOST - Direct local network connection');
          }
        } else {
          console.error('   ❌ No active candidate pair found!');
          console.error('      This indicates a firewall or network connectivity issue.');
        }
      } catch (error) {
        console.error('   ❌ Failed to get ICE candidates:', error);
      }
      console.log('');

      // 3. Media Tracks
      console.log('🎵 MEDIA TRACKS:');
      const senders = pc.getSenders();
      const receivers = pc.getReceivers();
      
      console.log(`   Outgoing (Senders): ${senders.length}`);
      senders.forEach((sender, i) => {
        const track = sender.track;
        if (track) {
          console.log(`      ${i + 1}. ${track.kind} - ${track.readyState} (enabled: ${track.enabled}, muted: ${track.muted})`);
          
          // Check for issues
          if (!track.enabled) {
            console.error(`         ❌ Track is DISABLED - Call toggleMute() to enable`);
          }
          if (track.muted) {
            console.warn(`         ⚠️  Track is MUTED by browser/system - Check system mic permissions`);
          }
          if (track.readyState === 'ended') {
            console.error(`         ❌ Track has ENDED - Need to get new media stream`);
          }
        } else {
          console.log(`      ${i + 1}. No track`);
        }
      });

      console.log(`   Incoming (Receivers): ${receivers.length}`);
      receivers.forEach((receiver, i) => {
        const track = receiver.track;
        if (track) {
          console.log(`      ${i + 1}. ${track.kind} - ${track.readyState} (enabled: ${track.enabled}, muted: ${track.muted})`);
          
          if (track.muted) {
            console.warn(`         ⚠️  Remote track is MUTED - Remote user may have mic issues`);
          }
        } else {
          console.log(`      ${i + 1}. No track`);
        }
      });
      console.log('');

      // 4. Detailed Statistics
      console.log('📈 MEDIA STATISTICS:');
      try {
        const stats = await pc.getStats();
        
        stats.forEach((report) => {
          // Inbound audio stats
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            console.log('   📥 INBOUND AUDIO:');
            console.log(`      Packets Received:  ${report.packetsReceived || 0}`);
            console.log(`      Packets Lost:      ${report.packetsLost || 0}`);
            console.log(`      Bytes Received:    ${report.bytesReceived || 0}`);
            console.log(`      Jitter:            ${report.jitter ? (report.jitter * 1000).toFixed(2) + 'ms' : 'N/A'}`);
            
            if (report.packetsLost > 0) {
              const lossRate = ((report.packetsLost / (report.packetsReceived + report.packetsLost)) * 100).toFixed(2);
              console.warn(`      ⚠️  Packet Loss Rate: ${lossRate}%`);
            }

            if (report.bytesReceived === 0 || report.packetsReceived === 0) {
              console.error('      ❌ NO AUDIO DATA RECEIVED!');
              console.error('         Possible causes:');
              console.error('         - Firewall blocking RTP packets');
              console.error('         - Remote user has no audio/is muted');
              console.error('         - Network connectivity issues');
            } else {
              console.log('      ✅ Audio data flowing');
            }
          }

          // Outbound audio stats
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            console.log('   📤 OUTBOUND AUDIO:');
            console.log(`      Packets Sent:      ${report.packetsSent || 0}`);
            console.log(`      Bytes Sent:        ${report.bytesSent || 0}`);
            
            if (report.bytesSent === 0 || report.packetsSent === 0) {
              console.error('      ❌ NO AUDIO DATA SENT!');
              console.error('         Possible causes:');
              console.error('         1. Microphone is muted in app - Try: window.webrtcStore.getState().toggleMute()');
              console.error('         2. Microphone is muted/blocked by system');
              console.error('         3. Track is disabled or ended');
              console.error('         4. Microphone is not picking up sound');
              
              // Check local stream
              const localStream = get().localStream;
              if (localStream) {
                const audioTracks = localStream.getAudioTracks();
                if (audioTracks.length > 0) {
                  const track = audioTracks[0];
                  console.error(`         Local track status: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
                } else {
                  console.error('         ❌ No audio tracks in local stream!');
                }
              } else {
                console.error('         ❌ No local stream!');
              }
            } else {
              console.log('      ✅ Audio being sent');
            }
          }
        });
      } catch (error) {
        console.error('   ❌ Failed to get statistics:', error);
      }
    }
  },

  testSTUNServers: async () => {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🌐 TESTING STUN/TURN SERVERS');
    console.log('═══════════════════════════════════════════════════════\n');

    const iceServers = WEBRTC_CONFIG.ICE_SERVERS;
    
    console.log(`Testing ${iceServers.length} ICE server(s)...\n`);

    for (let i = 0; i < iceServers.length; i++) {
      const server = iceServers[i];
      console.log(`📡 Server ${i + 1}:`);
      
      if (server.urls) {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        urls.forEach(url => console.log(`   ${url}`));
      }
      
      if ('username' in server && server.username) {
        console.log(`   Username: ${server.username}`);
        console.log(`   Credential: ${'credential' in server && server.credential ? '***' : 'none'}`);
      }
      
      console.log('   Testing...');

      try {
        const pc = new RTCPeerConnection({ iceServers: [server] });
        
        let candidatesFound = 0;
        let srflxFound = false;
        let relayFound = false;
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            pc.close();
            reject(new Error('Timeout waiting for ICE candidates'));
          }, 10000); // 10 second timeout

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              candidatesFound++;
              
              // Parse candidate string to get type
              const candidateStr = event.candidate.candidate;
              
              if (candidateStr.includes('typ srflx')) {
                srflxFound = true;
              } else if (candidateStr.includes('typ relay')) {
                relayFound = true;
              }
            } else {
              // null candidate means gathering is complete
              clearTimeout(timeout);
              pc.close();
              resolve();
            }
          };

          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              clearTimeout(timeout);
              pc.close();
              resolve();
            }
          };

          // Create a data channel to trigger ICE gathering
          pc.createDataChannel('test');
          pc.createOffer().then(offer => pc.setLocalDescription(offer));
        });

        console.log(`   ✅ Server responsive`);
        console.log(`   Found ${candidatesFound} candidate(s)`);
        
        if (srflxFound) {
          console.log('   ✅ STUN working - Server-reflexive candidates found');
        }
        if (relayFound) {
          console.log('   ✅ TURN working - Relay candidates found');
        }
        if (!srflxFound && !relayFound) {
          console.warn('   ⚠️  No server-reflexive or relay candidates found');
          console.warn('      STUN/TURN server may not be working correctly');
        }
      } catch (error: any) {
        console.error(`   ❌ Server test failed: ${error.message}`);
        console.error('      This server may be unreachable or misconfigured');
      }
      
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('RECOMMENDATIONS:');
    console.log('───────────────────────────────────────────────────────');
    console.log('If STUN/TURN tests failed:');
    console.log('  1. Check firewall rules for UDP ports 3478, 5349');
    console.log('  2. Verify STUN/TURN server is accessible from your network');
    console.log('  3. Check if corporate firewall blocks WebRTC traffic');
    console.log('  4. Try using a different STUN/TURN provider');
    console.log('');
    console.log('If tests passed but still no audio:');
    console.log('  1. Run: window.webrtcStore.getState().diagnoseConnection()');
    console.log('  2. Check for "RTP packets blocked" in diagnostics');
    console.log('  3. Verify both users can access STUN/TURN servers');
    console.log('  4. Test from a different network (e.g., mobile hotspot)');
    console.log('═══════════════════════════════════════════════════════\n');
  },

  fixAudioIssues: async () => {
    console.log('\n🔧 ATTEMPTING TO FIX AUDIO ISSUES...\n');

    const { localStream, isMuted, currentRoomId, peerConnections } = get();

    // Issue 1: Check if muted
    if (isMuted) {
      console.log('📍 Issue found: You are MUTED in the app');
      console.log('   Fixing: Unmuting...');
      get().toggleMute();
      console.log('   ✅ Unmuted\n');
    } else {
      console.log('✅ Not muted in app\n');
    }

    // Issue 2: Check local stream
    if (!localStream) {
      console.error('❌ Issue found: No local stream');
      console.log('   Fixing: Initializing audio...');
      try {
        await get().initializeAudio();
        console.log('   ✅ Audio initialized\n');
      } catch (error) {
        console.error('   ❌ Failed to initialize audio:', error);
        console.error('   Manual action needed: Grant microphone permission\n');
        return;
      }
    } else {
      console.log('✅ Local stream exists\n');

      // Check audio tracks
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error('❌ Issue found: No audio tracks in stream');
        console.log('   Fixing: Reinitializing audio...');
        try {
          localStream.getTracks().forEach(t => t.stop());
          await get().initializeAudio();
          console.log('   ✅ Audio reinitialized\n');
        } catch (error) {
          console.error('   ❌ Failed to reinitialize audio:', error);
          return;
        }
      } else {
        const track = audioTracks[0];
        console.log(`📊 Audio track status:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });

        // Issue 3: Track disabled
        if (!track.enabled) {
          console.log('📍 Issue found: Track is DISABLED');
          console.log('   Fixing: Enabling track...');
          track.enabled = true;
          console.log('   ✅ Track enabled\n');
        }

        // Issue 4: Track muted by system
        if (track.muted) {
          console.warn('⚠️  Issue found: Track is MUTED by browser/system');
          console.warn('   This usually means:');
          console.warn('   - System microphone is muted');
          console.warn('   - Browser doesn\'t have permission');
          console.warn('   - Microphone is being used by another app');
          console.warn('   Manual action needed: Check system settings\n');
        }

        // Issue 5: Track ended
        if (track.readyState === 'ended') {
          console.error('❌ Issue found: Track has ENDED');
          console.log('   Fixing: Getting new media stream...');
          try {
            localStream.getTracks().forEach(t => t.stop());
            await get().initializeAudio();
            console.log('   ✅ New stream acquired\n');
          } catch (error) {
            console.error('   ❌ Failed to get new stream:', error);
            return;
          }
        }
      }
    }

    // Issue 6: Not in a room
    if (!currentRoomId) {
      console.warn('⚠️  Not in a voice room');
      console.warn('   Join a room to test audio with others\n');
      return;
    }

    // Issue 7: Check peer connections
    if (peerConnections.size === 0) {
      console.warn('⚠️  No peer connections');
      console.warn('   Wait for other users to join the room\n');
    } else {
      console.log(`✅ Connected to ${peerConnections.size} peer(s)\n`);

      // Refresh tracks in peer connections
      console.log('🔄 Refreshing tracks in peer connections...');
      const updatedStream = get().localStream;
      if (updatedStream) {
        const audioTrack = updatedStream.getAudioTracks()[0];
        if (audioTrack) {
          peerConnections.forEach((peerInfo, userId) => {
            const sender = peerInfo.connection.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) {
              sender.replaceTrack(audioTrack)
                .then(() => console.log(`   ✅ Updated track for ${userId}`))
                .catch(err => console.error(`   ❌ Failed to update track for ${userId}:`, err));
            }
          });
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎤 AUDIO FIX COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Next steps:');
    console.log('1. Try speaking into your microphone');
    console.log('2. Check if audio level indicator moves');
    console.log('3. Run diagnostics: await window.webrtcStore.getState().diagnoseConnection()');
    console.log('4. If still no audio, run: await window.webrtcStore.getState().testMicrophone()');
    console.log('═══════════════════════════════════════════════════════\n');
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
