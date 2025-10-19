# VoiceFlow Implementation Guide

Complete implementation guide with code examples and best practices for building the VoiceFlow real-time collaboration platform.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Shared Package](#shared-package)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Real-time Features](#real-time-features)
6. [Production Checklist](#production-checklist)

## Project Setup

### 1. Initialize Monorepo

```bash
# Install dependencies
pnpm install

# Install workspaces dependencies
pnpm install -r

# Build shared package first
pnpm --filter=@voiceflow/shared build
```

### 2. Environment Configuration

Create `.env` file:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://voiceflow:voiceflow_password@localhost:5432/voiceflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-key-minimum-32-characters
FRONTEND_URL=http://localhost:5173
FILEFLOW_API_URL=http://localhost:3001
```

### 3. Start Development

```bash
# Terminal 1: Start backend
pnpm dev:backend

# Terminal 2: Start frontend
pnpm dev:frontend

# Or start both in parallel
pnpm dev
```

## Shared Package

### Types Definition

The shared package defines all TypeScript interfaces used across frontend and backend:

```typescript
// packages/shared/src/types/index.ts

// User types
interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Room types
interface Room {
  id: string;
  code: string; // Unique room code
  name: string;
  description: string | null;
  createdById: string;
  maxUsers: number;
  settings: RoomSettings;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

// Message types
interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: MessageType;
  fileId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Validation Schemas

Zod schemas for runtime validation:

```typescript
// packages/shared/src/schemas/index.ts

const RegisterSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword);

const CreateRoomSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  maxUsers: z.number().int().min(2).max(500).default(100),
});

const CreateMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  type: z.enum(['text', 'file', 'voice_note']).default('text'),
});
```

## Backend Implementation

### 1. Database Models

Using Sequelize ORM for PostgreSQL:

```typescript
// packages/backend/src/models/index.ts

class UserModel extends Model implements User {
  declare id: string;
  declare username: string;
  declare email: string;
  declare passwordHash: string;
  declare avatarUrl: string | null;
}

class RoomModel extends Model implements Room {
  declare id: string;
  declare code: string;
  declare name: string;
  declare createdById: string;
  declare settings: RoomSettings;
}

class MessageModel extends Model implements Message {
  declare id: string;
  declare roomId: string;
  declare userId: string;
  declare content: string;
  declare type: MessageType;
}
```

### 2. Services Layer

Business logic implementations:

```typescript
// packages/backend/src/services/auth.service.ts

export class AuthService {
  async register(email: string, username: string, password: string): Promise<User> {
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const user = await UserModel.create({
      id: generateUUID(),
      email,
      username,
      passwordHash,
    });
    
    return user.toJSON();
  }

  async login(email: string, password: string) {
    const user = await UserModel.findOne({ where: { email } });
    
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
    }
    
    const payload = { userId: user.id, email, username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    return { user: user.toJSON(), accessToken, refreshToken };
  }
}
```

### 3. Controllers

HTTP request handlers:

```typescript
// packages/backend/src/controllers/auth.controller.ts

export const register = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = validateSchema(RegisterSchema, req.body);
    const result = await authService.register(data.email, data.username, data.password);
    sendSuccess(res, 201, result);
  } catch (error) {
    handleError(error, res);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = validateSchema(LoginSchema, req.body);
    const result = await authService.login(data.email, data.password);
    sendSuccess(res, 200, result);
  } catch (error) {
    handleError(error, res);
  }
};
```

### 4. Routes

API endpoint definitions:

```typescript
// packages/backend/src/routes/auth.routes.ts

import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', authMiddleware, (req, res) => {
  sendSuccess(res, 200, { valid: true, user: req.user });
});

export default router;
```

### 5. Socket.IO Integration

Real-time event handlers:

```typescript
// packages/backend/src/sockets/handlers.ts

export const setupSocketHandlers = (io: Server): void => {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Auth required'));
    
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`User ${socket.userId} connected`);

    // Room join
    socket.on('room:join', async ({ roomId }, callback) => {
      try {
        await roomService.joinRoom(roomId, socket.userId);
        socket.join(roomId);
        socket.to(roomId).emit('room:user_joined', { userId: socket.userId });
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Message send
    socket.on('message:send', async ({ roomId, content }, callback) => {
      try {
        const message = await messageService.sendMessage(roomId, socket.userId, content);
        io.to(roomId).emit('message:received', message);
        callback({ success: true, message });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`User ${socket.userId} disconnected`);
    });
  });
};
```

### 6. Error Handling

Centralized error management:

```typescript
// packages/backend/src/utils/responses.ts

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const errorHandler = (error: Error, req: Request, res: Response) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      timestamp: Date.now(),
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    timestamp: Date.now(),
  });
};
```

## Frontend Implementation

### 1. Zustand Stores

State management:

```typescript
// packages/frontend/src/stores/auth.store.ts

import { create } from 'zustand';
import { User } from '@voiceflow/shared';

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      set({
        user: response.data.user,
        token: response.data.token,
        refreshToken: response.data.refreshToken,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    set({ user: null, token: null, refreshToken: null });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },
}));
```

### 2. Socket.IO Client

Real-time communication:

```typescript
// packages/frontend/src/services/socket.service.ts

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) throw new Error('Socket not initialized');
  return socket;
};

export const sendMessage = (roomId: string, content: string): Promise<void> => {
  const socket = getSocket();
  return new Promise((resolve, reject) => {
    socket.emit('message:send', { roomId, content }, (response) => {
      if (response.success) resolve();
      else reject(new Error(response.error));
    });
  });
};
```

### 3. React Components

UI components:

```typescript
// packages/frontend/src/components/ChatRoom.tsx

import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { sendMessage, getSocket } from '../services/socket.service';

export const ChatRoom: React.FC<{ roomId: string }> = ({ roomId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const socket = getSocket();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Join room
    socket.emit('room:join', { roomId });

    // Listen for messages
    socket.on('message:received', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('message:received');
    };
  }, [roomId, socket]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(roomId, input);
    setInput('');
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <strong>{msg.author.username}</strong>: {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};
```

### 4. TanStack Router Configuration

Type-safe routing:

```typescript
// packages/frontend/src/routes/__root.ts

import { RootRoute, RootRouteWithoutChildren } from '@tanstack/react-router';
import { RootLayout } from '../layouts/RootLayout';

export const rootRoute = new RootRoute({
  component: RootLayout,
  beforeLoad: async ({ navigate }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate({ to: '/login' });
    }
  },
});

// Protected route example
export const roomRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/rooms/$roomId',
  component: ChatRoom,
});
```

## Real-time Features

### WebRTC Voice Chat

```typescript
// packages/frontend/src/hooks/useWebRTC.ts

export const useWebRTC = (roomId: string) => {
  const [peers, setPeers] = useState<Map<string, RTCPeerConnection>>(new Map());
  const socket = getSocket();
  const localStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Get user media
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        localStream.current = stream;
      });

    // Handle ICE candidate
    socket.on('voice:signal', ({ from, data }) => {
      handleSignal(from, data);
    });

    return () => {
      localStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [roomId, socket]);

  const createPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: WEBRTC_CONFIG.ICE_SERVERS });

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:signal', {
          to: peerId,
          data: event.candidate,
        });
      }
    };

    setPeers((prev) => new Map(prev).set(peerId, pc));
    return pc;
  };

  return { peers, createPeerConnection };
};
```

### User Presence Tracking

```typescript
// packages/frontend/src/stores/presence.store.ts

interface PresenceStore {
  onlineUsers: Map<string, UserPresence>;
  updatePresence: (userId: string, status: UserPresenceStatus) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
}

export const usePresenceStore = create<PresenceStore>((set) => {
  const socket = getSocket();

  socket.on('user:presence_changed', ({ userId, status }) => {
    set((state) => {
      const newOnlineUsers = new Map(state.onlineUsers);
      if (newOnlineUsers.has(userId)) {
        const user = newOnlineUsers.get(userId)!;
        user.status = status;
        user.lastActivity = new Date();
      }
      return { onlineUsers: newOnlineUsers };
    });
  });

  return {
    onlineUsers: new Map(),
    updatePresence: (userId, status) => {
      socket.emit('presence:update', { userId, status });
    },
    setTyping: (userId, isTyping) => {
      socket.emit(isTyping ? 'typing:start' : 'typing:stop', { userId });
    },
  };
});
```

## Production Checklist

### Security
- [ ] Set strong JWT secrets (min 32 characters)
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Validate all inputs
- [ ] Use helmet middleware
- [ ] Rotate secrets regularly

### Performance
- [ ] Enable Redis caching
- [ ] Optimize database queries
- [ ] Add database indexes
- [ ] Implement message pagination
- [ ] Use CDN for static assets
- [ ] Enable gzip compression
- [ ] Code split frontend
- [ ] Lazy load components

### Monitoring
- [ ] Set up logging (Pino)
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Monitor database connections
- [ ] Alert on anomalies
- [ ] Regular backups
- [ ] Uptime monitoring

### Deployment
- [ ] Build Docker images
- [ ] Use environment variables
- [ ] Database migrations
- [ ] Health checks
- [ ] Auto-scaling setup
- [ ] Load balancer config
- [ ] SSL certificates
- [ ] Disaster recovery plan

---

For more details, see [ARCHITECTURE.md](./ARCHITECTURE.md).
