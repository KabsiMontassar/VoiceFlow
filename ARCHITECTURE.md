# VoiceFlow Architecture & Implementation Guide

A comprehensive guide to the VoiceFlow real-time collaboration platform architecture, implementation roadmap, and production-ready patterns.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Monorepo Structure](#monorepo-structure)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [Socket.IO Events](#socketio-events)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Development Guide](#development-guide)
10. [Deployment](#deployment)
11. [Production Considerations](#production-considerations)

## Project Overview

VoiceFlow is a Discord-inspired real-time collaboration platform with the following core features:

- **Persistent Room Management**: Create, join, and manage rooms with unique codes
- **Real-time Text Chat**: Socket.IO-powered messaging with typing indicators
- **WebRTC Voice Chat**: Peer-to-peer voice communication
- **File Sharing**: Integration with FileFlow API for uploads
- **User Presence**: Online status, typing indicators, and activity tracking
- **Room Permissions**: Admin and member roles with granular controls

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                 │
│  - TanStack Router for routing                              │
│  - Zustand for state management                             │
│  - Socket.IO client for real-time updates                   │
│  - WebRTC for peer connections                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    ┌───▼──────┐       ┌────▼──────┐
    │ REST API │       │ WebSocket │
    │ (axios)  │       │(Socket.IO)│
    └───┬──────┘       └────┬──────┘
        │                   │
┌───────▼───────────────────▼──────────────────────────────────┐
│              Backend (Express + Socket.IO)                   │
│  - JWT authentication                                        │
│  - Database models (Sequelize)                               │
│  - Real-time event handlers                                  │
│  - WebRTC signaling server                                   │
│  - Bull queue for background jobs                            │
└───────┬───────────────────┬──────────────────────────────────┘
        │                   │
    ┌───▼──────┐       ┌────▼──────┐
    │PostgreSQL│       │   Redis    │
    │ (rooms,  │       │ (cache,    │
    │ messages)│       │  sessions) │
    └──────────┘       └────────────┘
```

### Component Interaction Flow

```
User Action → React Component → Zustand Store → API Call/Socket Event
                                      ↓
                              Backend Service Layer
                                      ↓
                              Database/Cache Layer
                                      ↓
                              Response → Store Update → UI Re-render
```

## Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Routing**: TanStack Router
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Styling**: Tailwind CSS
- **Real-time**: Socket.IO Client
- **Testing**: Vitest + Testing Library

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Real-time**: Socket.IO + WebRTC
- **ORM**: Sequelize
- **Job Queue**: Bull
- **Authentication**: JWT (jsonwebtoken)
- **Password**: bcryptjs
- **Logging**: Pino
- **Validation**: Zod
- **HTTP Client**: Axios

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Package Manager**: pnpm
- **Version Control**: Git

## Monorepo Structure

```
voiceflow/
├── packages/
│   ├── shared/                 # Shared types, constants, schemas
│   │   ├── src/
│   │   │   ├── types/          # Shared interfaces
│   │   │   ├── schemas/        # Zod validation schemas
│   │   │   ├── constants/      # App constants & configs
│   │   │   └── utils/          # Shared utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── backend/                # Node.js/Express server
│   │   ├── src/
│   │   │   ├── config/         # Configuration files
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── models/         # Database models
│   │   │   ├── sockets/        # Socket.IO handlers
│   │   │   ├── routes/         # API routes
│   │   │   ├── database/       # DB initialization
│   │   │   ├── utils/          # Utilities (JWT, password, etc.)
│   │   │   ├── jobs/           # Bull queue jobs
│   │   │   └── index.ts        # Entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/               # React application
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Page components
│       │   ├── routes/         # TanStack Router config
│       │   ├── stores/         # Zustand stores
│       │   ├── hooks/          # Custom React hooks
│       │   ├── services/       # API client services
│       │   ├── types/          # Local types
│       │   ├── utils/          # Frontend utilities
│       │   └── App.tsx         # Root component
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── infra/                      # Infrastructure configs
│   ├── docker-compose.yml      # Docker Compose setup
│   ├── Dockerfile.backend      # Backend Docker image
│   ├── Dockerfile.frontend     # Frontend Docker image
│   └── .env.example            # Environment variables
│
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── .env.example
├── pnpm-workspace.yaml
├── package.json
├── .npmrc
└── README.md
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

### Rooms Table
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  max_users INTEGER NOT NULL DEFAULT 100 CHECK (max_users >= 2 AND max_users <= 500),
  settings JSONB NOT NULL DEFAULT '{
    "isPublic": true,
    "allowGuests": false,
    "requireApproval": false,
    "recordMessages": true
  }'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_created_by ON rooms(created_by);
CREATE INDEX idx_rooms_is_active ON rooms(is_active);
```

### Room Users Table
```sql
CREATE TABLE room_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_room_users_room_id ON room_users(room_id);
CREATE INDEX idx_room_users_user_id ON room_users(user_id);
```

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 4000),
  type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'file', 'system', 'voice_note')),
  file_id UUID REFERENCES file_metadata(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_room_created ON messages(room_id, created_at DESC);
```

### File Metadata Table
```sql
CREATE TABLE file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  url VARCHAR(255) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(uploaded_by);
```

## API Design

### Authentication Endpoints

```
POST /api/v1/auth/register
Body: { username, email, password, confirmPassword }
Response: { token, refreshToken, user, expiresIn }

POST /api/v1/auth/login
Body: { email, password }
Response: { token, refreshToken, user, expiresIn }

POST /api/v1/auth/refresh
Body: { refreshToken }
Response: { token, user }

GET /api/v1/auth/verify
Headers: { Authorization: Bearer <token> }
Response: { valid, user }
```

### Room Endpoints

```
POST /api/v1/rooms
Body: { name, description, maxUsers, settings }
Response: { id, code, name, ... }

GET /api/v1/rooms
Query: { page, limit }
Response: { data: [], total, page, limit, hasMore }

GET /api/v1/rooms/:id
Response: { id, code, name, participants, ... }

PATCH /api/v1/rooms/:id
Body: { name, description, maxUsers, settings }
Response: { id, name, ... }

DELETE /api/v1/rooms/:id
Response: { success }

POST /api/v1/rooms/:code/join
Response: { roomId, participants }

POST /api/v1/rooms/:id/leave
Response: { success }

GET /api/v1/rooms/:id/members
Response: { members: [...] }
```

### Message Endpoints

```
POST /api/v1/messages
Body: { roomId, content, fileId, type }
Response: { id, content, author, createdAt, ... }

GET /api/v1/rooms/:roomId/messages
Query: { page, limit, before }
Response: { data: [], total, hasMore }

DELETE /api/v1/messages/:id
Response: { success }
```

### User Endpoints

```
GET /api/v1/users/me
Response: { id, username, email, avatarUrl, ... }

PATCH /api/v1/users/:id
Body: { username, email, avatarUrl }
Response: { id, username, ... }
```

## Socket.IO Events

### Client → Server Events

```javascript
// Room Events
socket.emit('room:join', { roomId }, callback)
socket.emit('room:leave', { roomId }, callback)

// Messaging
socket.emit('message:send', { roomId, content, type }, callback)
socket.emit('typing:start', { roomId })
socket.emit('typing:stop', { roomId })

// Presence
socket.emit('presence:update', { roomId, status })

// Voice/WebRTC
socket.emit('voice:join', { roomId }, callback)
socket.emit('voice:leave', { roomId })
socket.emit('voice:signal', { to, data })
```

### Server → Client Events

```javascript
// Room Events
socket.on('room:joined', { roomId, participants })
socket.on('room:user_joined', { userId, timestamp })
socket.on('room:user_left', { userId, timestamp })

// Messages
socket.on('message:received', { id, content, author, createdAt })
socket.on('user:typing', { userId })
socket.on('user:stopped_typing', { userId })

// Presence
socket.on('user:presence_changed', { userId, status })

// Voice
socket.on('voice:user_joined', { userId })
socket.on('voice:signal', { from, data })

// Errors
socket.on('error', { code, message })
```

## Implementation Roadmap

### Week 1: Foundation & Authentication
- [x] Project structure and configuration
- [ ] User authentication (Register/Login)
- [ ] JWT token generation and validation
- [ ] Database setup and migrations
- [ ] Basic Express routes and middleware

**Deliverables**:
- Auth endpoints working
- Users can create accounts and login
- Tokens properly validated on protected routes

### Week 2: Room Management & Basic Chat
- [ ] Room creation with unique codes
- [ ] Room listing and joining
- [ ] Room persistence and last_activity tracking
- [ ] Socket.IO connection and authentication
- [ ] Real-time message broadcasting
- [ ] Message persistence

**Deliverables**:
- Users can create and join rooms
- Messages appear in real-time
- Messages persist in database
- Room activity tracked

### Week 3: Presence & Advanced Features
- [ ] User presence tracking (online/away/in_call)
- [ ] Typing indicators
- [ ] Room member list with presence
- [ ] Message editing and deletion
- [ ] File upload integration with FileFlow

**Deliverables**:
- See who's in the room
- Typing indicators work
- File attachments in messages

### Week 4: WebRTC Voice Chat
- [ ] WebRTC peer connection setup
- [ ] Voice room management
- [ ] Audio device selection
- [ ] Mute/unmute controls
- [ ] Voice activity detection

**Deliverables**:
- Voice chat functional
- Multiple participants can voice call
- Audio controls working

### Week 5: Polish & Mobile Responsiveness
- [ ] Mobile-responsive design
- [ ] Desktop notifications
- [ ] Sound alerts
- [ ] Performance optimization
- [ ] Rate limiting and security headers

**Deliverables**:
- Works on mobile devices
- Notifications enable users
- Fast performance

### Week 6: Deployment & DevOps
- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Production environment configuration
- [ ] Monitoring and logging
- [ ] Database backups

**Deliverables**:
- Application containerized
- Can be deployed to cloud
- Logs and monitoring in place

## Development Guide

### Getting Started

1. **Install dependencies**:
```bash
pnpm install
```

2. **Set up environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start Docker services**:
```bash
pnpm docker:up
```

4. **Run migrations**:
```bash
pnpm db:migrate
```

5. **Start development servers**:
```bash
# In separate terminals
pnpm dev:backend
pnpm dev:frontend
```

### Project Scripts

```bash
# Development
pnpm dev                 # Start all services in parallel
pnpm dev:backend        # Start backend only
pnpm dev:frontend       # Start frontend only

# Building
pnpm build              # Build all packages
pnpm build:backend      # Build backend only
pnpm build:frontend     # Build frontend only

# Code Quality
pnpm lint               # Lint all packages
pnpm format             # Format all code
pnpm typecheck          # Type check all packages

# Docker
pnpm docker:up          # Start Docker services
pnpm docker:down        # Stop Docker services
pnpm docker:logs        # View Docker logs

# Database
pnpm db:migrate         # Run migrations
pnpm db:seed            # Seed database
```

### Creating New Features

1. **Define types in shared package**:
```typescript
// packages/shared/src/types/index.ts
export interface MyFeature {
  id: string;
  // ... properties
}
```

2. **Create Zod schema for validation**:
```typescript
// packages/shared/src/schemas/index.ts
export const MyFeatureSchema = z.object({
  // ... validation rules
});
```

3. **Implement backend service**:
```typescript
// packages/backend/src/services/myFeature.service.ts
export class MyFeatureService {
  async create(data: CreateMyFeatureInput) {
    // Business logic
  }
}
```

4. **Create API controller**:
```typescript
// packages/backend/src/controllers/myFeature.controller.ts
export const createMyFeature = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = validateSchema(CreateMyFeatureSchema, req.body);
    const result = await myFeatureService.create(data);
    sendSuccess(res, 201, result);
  } catch (error) {
    // Error handling
  }
};
```

5. **Add routes**:
```typescript
// packages/backend/src/routes/myFeature.routes.ts
router.post('/', authMiddleware, createMyFeature);
```

6. **Create Zustand store in frontend**:
```typescript
// packages/frontend/src/stores/myFeature.store.ts
export const useMyFeatureStore = create((set) => ({
  features: [],
  setFeatures: (features) => set({ features }),
}));
```

7. **Create React components**:
```typescript
// packages/frontend/src/components/MyFeature.tsx
export function MyFeature() {
  const features = useMyFeatureStore((state) => state.features);
  // ... component logic
}
```

## Deployment

### Docker Deployment

1. **Build images**:
```bash
pnpm docker:build
```

2. **Run containers**:
```bash
pnpm docker:up
```

3. **View logs**:
```bash
pnpm docker:logs
```

### Production Environment Variables

```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@db-host:5432/voiceflow
DB_HOST=db-host
DB_PORT=5432

# Redis
REDIS_URL=redis://:password@redis-host:6379

# JWT
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>

# CORS
FRONTEND_URL=https://voiceflow.com
SOCKET_CORS_ORIGIN=https://voiceflow.com

# FileFlow Integration
FILEFLOW_API_URL=https://fileflow-api.com
FILEFLOW_API_KEY=<api-key>
FILEFLOW_API_SECRET=<api-secret>

# Email (optional)
EMAIL_FROM=noreply@voiceflow.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<app-password>
```

## Production Considerations

### Security

1. **Authentication**:
   - Use strong JWT secrets (minimum 32 characters)
   - Implement token rotation
   - Add refresh token rotation
   - Set secure cookie flags

2. **Rate Limiting**:
   - Implement per-IP rate limiting
   - Use exponential backoff for retries
   - Protect sensitive endpoints

3. **CORS & Headers**:
   - Use Helmet middleware
   - Set appropriate CORS origins
   - Implement CSRF protection

4. **Data Validation**:
   - Validate all inputs with Zod
   - Sanitize user input
   - Use parameterized queries

### Performance

1. **Database**:
   - Create appropriate indexes
   - Use connection pooling
   - Implement query caching with Redis
   - Archive old messages

2. **Caching**:
   - Cache room data in Redis
   - Cache user presence data
   - Implement cache invalidation

3. **Real-time**:
   - Use Socket.IO rooms for message broadcasting
   - Implement lazy loading for messages
   - Throttle presence updates

4. **Frontend**:
   - Code splitting with React.lazy
   - Image optimization
   - CSS/JS minification

### Monitoring & Logging

1. **Logging**:
   - Use Pino for structured logs
   - Log all errors with stack traces
   - Monitor sensitive operations

2. **Monitoring**:
   - Set up health checks
   - Monitor database performance
   - Track WebSocket connections
   - Monitor message queue depth

3. **Alerting**:
   - Set up alerts for errors
   - Monitor server resources
   - Track uptime

### Backup & Recovery

1. **Database**:
   - Daily automated backups
   - Point-in-time recovery
   - Test backup restoration

2. **Disaster Recovery**:
   - Document recovery procedures
   - Test failover mechanisms
   - Maintain recovery SLAs

---

## Next Steps

1. Review the tech stack and decide on any modifications
2. Install dependencies: `pnpm install`
3. Start with Week 1: Authentication implementation
4. Follow the development guide for adding new features
5. Refer to Socket.IO events for real-time features
6. Use the database schema for migrations

For questions or issues, refer to the implementation guides in each package.
