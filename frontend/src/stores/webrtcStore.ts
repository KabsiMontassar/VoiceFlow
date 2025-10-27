import { create } from 'zustand';
import { socketClient as socket } from '../services/socket';
import { WEBRTC_CONFIG } from '../../../shared/src';
import { useAuthStore } from './authStore';

// ==================== CONSTANTS ====================

// Audio constraints for getUserMedia
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
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
  const existing = document.querySelector(`audio[data-voice-user="${userId}"]`);
  if (existing) {
    existing.remove();
  }

  const audio = document.createElement('audio');
  audio.setAttribute('data-voice-user', userId);
  audio.srcObject = stream;
  audio.autoplay = true;

  if (outputDeviceId && 'setSinkId' in audio) {
    (audio as any).setSinkId(outputDeviceId).catch((error: any) => {
      console.error('[WebRTC] Failed to set sink ID:', error);
    });
  }

  audio.style.display = 'none';
  document.body.appendChild(audio);

  console.log('[WebRTC] Created audio element for user:', userId);
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
              const pc = get().createPeerConnection(data.userId);
              
              // Add local stream tracks to peer connection
              localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
              });

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
          echoCancellation: true,
          noiseSuppression: true,
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
      console.log('[WebRTC] Received remote track from:', userId);
      const [remoteStream] = event.streams;
      
      const { remoteStreams } = get();
      const newRemoteStreams = new Map(remoteStreams);
      newRemoteStreams.set(userId, remoteStream);
      set({ remoteStreams: newRemoteStreams });

      createRemoteAudioElement(userId, remoteStream, get().selectedOutputDevice);
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

  setError: (error: string | null) => {
    set({ error });
  },
}));
