# VoiceFlow - Real-Time Collaboration Platform

A Discord-inspired, production-ready real-time collaboration platform built with React, Node.js, WebRTC, and Socket.IO.

## 🎯 Features

### Phase 1: Persistent Room Management ✅
- Create rooms with custom names & unique codes (e.g., `TEAM-X7B9K2`)
- Persistent rooms with `last_activity` tracking
- User dashboard: "My Rooms" and "Recent Rooms"
- Configurable room settings (max users, permissions)

### Phase 2: Real-time Text Chat
- Socket.IO real-time messaging
- Typing indicators
- Online user presence tracking
- Infinite scroll message history
- File attachment support via FileFlow

### Phase 3: WebRTC Voice Chat
- Peer-to-peer voice communication
- Push-to-talk and voice activation modes
- Speaker indicators and audio visualization
- Voice room management

### Phase 4: Enhanced Features
- User avatar system
- Desktop notifications & sound alerts
- Mobile-responsive design
- Admin/member role-based permissions

## 🏗️ Architecture

### Monorepo Structure

```
voiceflow/
├── packages/shared/     # Shared types, schemas, constants
├── packages/backend/    # Express + Socket.IO server
├── packages/frontend/   # React + Vite application
└── infra/              # Docker & deployment configs
```

### Technology Stack

**Frontend**: React 19 • TypeScript • Vite • TanStack Router • Zustand • Socket.IO Client • WebRTC • Tailwind CSS

**Backend**: Node.js • Express • Socket.IO • PostgreSQL • Redis • Sequelize • JWT • Bull Queue

**Infrastructure**: Docker • Docker Compose • pnpm

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9.0+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KabsiMontassar/VoiceFlow.git
   cd VoiceFlow
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Docker services**
   ```bash
   pnpm docker:up
   ```

5. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

6. **Start development servers**
   ```bash
   # Terminal 1: Backend
   pnpm dev:backend

   # Terminal 2: Frontend
   pnpm dev:frontend
   ```

7. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📚 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - Detailed architecture, design patterns, and implementation roadmap
- **[API Documentation](./docs/API.md)** - REST API endpoints and WebSocket events
- **[Development Guide](./docs/DEVELOPMENT.md)** - Setup and development workflow

## 🔧 Available Scripts

### Development
```bash
pnpm dev                    # Start all services
pnpm dev:backend           # Backend only
pnpm dev:frontend          # Frontend only
```

### Building
```bash
pnpm build                 # Build all packages
pnpm build:backend        # Backend only
pnpm build:frontend       # Frontend only
```

### Code Quality
```bash
pnpm lint                 # Lint all packages
pnpm format               # Format code
pnpm typecheck            # Type checking
```

### Docker
```bash
pnpm docker:up            # Start services
pnpm docker:down          # Stop services
pnpm docker:logs          # View logs
```

### Database
```bash
pnpm db:migrate           # Run migrations
pnpm db:seed              # Seed database
```

## 📦 Project Structure

```
packages/
├── shared/
│   ├── src/
│   │   ├── types/          # TypeScript interfaces
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── constants/      # App constants
│   │   └── utils/          # Helper functions
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── sockets/        # WebSocket handlers
│   │   ├── routes/         # API routes
│   │   ├── database/       # DB setup
│   │   ├── utils/          # Utilities
│   │   ├── jobs/           # Bull jobs
│   │   └── index.ts        # Entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/     # React components
    │   ├── pages/          # Page components
    │   ├── routes/         # Router config
    │   ├── stores/         # Zustand stores
    │   ├── hooks/          # Custom hooks
    │   ├── services/       # API client
    │   ├── utils/          # Utilities
    │   └── App.tsx
    └── package.json
```

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts and profiles
- **rooms**: Communication rooms
- **room_users**: Room membership and roles
- **messages**: Chat messages with attachments
- **file_metadata**: File information for FileFlow integration

See [ARCHITECTURE.md](./ARCHITECTURE.md#database-schema) for full schema details.

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/verify` - Verify token

### Rooms
- `POST /api/v1/rooms` - Create room
- `GET /api/v1/rooms` - List rooms
- `GET /api/v1/rooms/:id` - Get room
- `PATCH /api/v1/rooms/:id` - Update room
- `DELETE /api/v1/rooms/:id` - Delete room
- `POST /api/v1/rooms/:code/join` - Join room
- `POST /api/v1/rooms/:id/leave` - Leave room
- `GET /api/v1/rooms/:id/members` - Get members

### Messages
- `POST /api/v1/messages` - Send message
- `GET /api/v1/rooms/:roomId/messages` - Get messages
- `DELETE /api/v1/messages/:id` - Delete message

### Users
- `GET /api/v1/users/me` - Get profile
- `PATCH /api/v1/users/:id` - Update profile

## 🔌 WebSocket Events

### Client → Server
- `room:join` - Join a room
- `room:leave` - Leave a room
- `message:send` - Send a message
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `presence:update` - Update presence
- `voice:join` - Join voice room
- `voice:signal` - WebRTC signaling

### Server → Client
- `room:joined` - Joined room
- `room:user_joined` - User joined
- `room:user_left` - User left
- `message:received` - Message received
- `user:typing` - User typing
- `user:presence_changed` - Presence changed
- `voice:user_joined` - User joined voice
- `voice:signal` - WebRTC signal

See [ARCHITECTURE.md](./ARCHITECTURE.md#socketio-events) for detailed event documentation.

## 🔐 Security Features

- ✅ JWT-based authentication with refresh tokens
- ✅ bcryptjs password hashing
- ✅ CORS protection with Helmet
- ✅ Input validation with Zod schemas
- ✅ Rate limiting on sensitive endpoints
- ✅ WebSocket authentication
- ✅ SQL injection prevention with parameterized queries
- ✅ HTTPS support in production

## ⚡ Performance Optimizations

- Redis caching for frequently accessed data
- Message pagination with infinite scroll
- Socket.IO room-based broadcasting
- Database connection pooling
- Query optimization with indexes
- Frontend code splitting and lazy loading
- CSS/JS minification in production

## 🐳 Docker Deployment

### Development
```bash
pnpm docker:up
pnpm docker:logs
```

### Production Build
```bash
pnpm docker:build
docker-compose -f docker-compose.yml up -d
```

### Environment Variables
See `.env.example` for all configuration options.

## 📊 Implementation Roadmap

### Week 1: Foundation
- [x] Project structure & configuration
- [ ] User authentication
- [ ] Database setup
- [ ] Basic Express routes

### Week 2: Room Management
- [ ] Room CRUD operations
- [ ] Real-time chat
- [ ] Message persistence

### Week 3: Advanced Features
- [ ] User presence tracking
- [ ] File attachments
- [ ] Room permissions

### Week 4: Voice Chat
- [ ] WebRTC integration
- [ ] Audio controls
- [ ] Voice room management

### Week 5-6: Polish & Deployment
- [ ] Mobile responsiveness
- [ ] Notifications
- [ ] Docker deployment
- [ ] Production optimization

See [ARCHITECTURE.md](./ARCHITECTURE.md#implementation-roadmap) for detailed roadmap.

## 🛠️ Development Workflow

### Creating a Feature

1. **Define types** in `packages/shared/src/types/`
2. **Create schemas** in `packages/shared/src/schemas/`
3. **Implement backend**:
   - Service logic
   - Controller/route handler
   - Socket handlers (if real-time)
4. **Implement frontend**:
   - Zustand store
   - React components
   - API client integration

### Code Quality

```bash
pnpm lint        # Check code quality
pnpm format      # Format code
pnpm typecheck   # Type checking
```

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Ensure PostgreSQL is running
pnpm docker:up

# Check connection in .env
DATABASE_URL=postgresql://user:password@localhost:5432/voiceflow
```

### Socket.IO Connection Issues
- Ensure backend is running on port 3000
- Check CORS settings in `.env`
- Verify `FRONTEND_URL` matches client origin

### Module Not Found Errors
```bash
# Reinstall dependencies
pnpm install --frozen-lockfile

# Clear build cache
pnpm run clean
pnpm build
```

## 📝 Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/voiceflow

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# FileFlow Integration
FILEFLOW_API_URL=http://localhost:3001
FILEFLOW_API_KEY=your-api-key
```

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m 'Add feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Open a pull request

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

Montassar Kabsi - [@KabsiMontassar](https://github.com/KabsiMontassar)

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [Socket.IO](https://socket.io/) - Real-time communication
- [Sequelize](https://sequelize.org/) - ORM
- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## 📞 Support

For issues, questions, or suggestions:
- Open an [issue](https://github.com/KabsiMontassar/VoiceFlow/issues)
- Start a [discussion](https://github.com/KabsiMontassar/VoiceFlow/discussions)
- Contact: [email@example.com](mailto:email@example.com)

---

**Build real-time collaboration experiences with VoiceFlow** ✨
