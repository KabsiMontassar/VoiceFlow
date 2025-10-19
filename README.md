# VoiceFlow - Real-Time Collaboration Platform

> A production-ready, Discord-inspired real-time collaboration platform built with React, Node.js, WebRTC, and Socket.IO.

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

---

## 📋 Quick Start

### Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (`npm install -g pnpm`)
- **Docker** & **Docker Compose** (optional, for database)

### 1️⃣ Clone & Setup

```bash
git clone https://github.com/KabsiMontassar/VoiceFlow.git
cd VoiceFlow
```

### 2️⃣ Configure Environment

```bash
# .env file is already created with defaults
cat .env  # Review if needed
```

### 3️⃣ Start Database (Optional)

```bash
# Start PostgreSQL & Redis
docker compose up -d
docker compose ps  # Verify services running
```

### 4️⃣ Start Backend & Frontend

**Terminal 1 - Backend:**

```bash
cd backend
pnpm dev
```

✅ Backend runs on `http://localhost:3000`

**Terminal 2 - Frontend:**

```bash
cd frontend
pnpm dev
```

✅ Frontend runs on `http://localhost:5173`

### 5️⃣ Access the App

Open **<http://localhost:5173>** in your browser

---

## 🏗️ Project Architecture

### Technology Stack

| Layer              | Technology                                | Purpose                   |
| ------------------ | ----------------------------------------- | ------------------------- |
| **Frontend**       | React 19, Vite, Zustand, Socket.IO Client | UI & State Management     |
| **Backend**        | Express.js, Socket.IO, Node.js            | REST API & WebSockets     |
| **Database**       | PostgreSQL 16, Sequelize ORM              | Persistent Data           |
| **Cache**          | Redis 7                                   | Session & Real-time State |
| **Authentication** | JWT, bcryptjs                             | Secure Auth               |
| **Infrastructure** | Docker, Docker Compose                    | Containerization          |

### Folder Structure

```text
VoiceFlow/
├── backend/                 # Express.js server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database schemas
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, error handling
│   │   ├── sockets/         # WebSocket handlers
│   │   ├── database/        # DB initialization
│   │   ├── config/          # Configuration
│   │   └── utils/           # Helpers
│   ├── package.json
│   └── .env
│
├── frontend/                # React Vite app
│   ├── src/
│   │   ├── services/        # API client, Socket.IO
│   │   ├── stores/          # Zustand stores
│   │   ├── pages/           # Page components
│   │   ├── components/      # UI components
│   │   └── styles/          # Tailwind CSS
│   ├── package.json
│   └── vite.config.ts
│
├── shared/                  # Shared types & schemas
│   ├── src/
│   │   ├── types/           # TypeScript interfaces
│   │   ├── schemas/         # Zod validation
│   │   ├── constants/       # App constants
│   │   └── utils/           # Utilities
│   └── package.json
│
├── docker-compose.yml       # Database services
├── Dockerfile.backend       # Backend container
├── Dockerfile.frontend      # Frontend container
├── .env                     # Environment variables
└── package.json             # Root coordination
```

---

## 🚀 Commands

### Backend

```bash
cd backend
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (auto-reload)
pnpm build                # Build for production
pnpm start                # Run production build
pnpm typecheck            # Check TypeScript errors
```

### Frontend

```bash
cd frontend
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (HMR enabled)
pnpm build                # Build for production
pnpm preview              # Preview production build
pnpm lint                 # Run ESLint
pnpm lint:fix             # Fix linting errors
pnpm format               # Format code with Prettier
pnpm typecheck            # Check TypeScript errors
```

### Docker

```bash
docker compose up -d      # Start all services
docker compose down       # Stop all services
docker compose logs -f    # View logs
docker compose ps         # List services
```

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint                | Description          |
| ------ | ----------------------- | -------------------- |
| POST   | `/api/v1/auth/register` | Create new account   |
| POST   | `/api/v1/auth/login`    | Login user           |
| POST   | `/api/v1/auth/refresh`  | Refresh access token |
| GET    | `/api/v1/auth/me`       | Get current user     |
| POST   | `/api/v1/auth/logout`   | Logout user          |

### Rooms

| Method | Endpoint                  | Description       |
| ------ | ------------------------- | ----------------- |
| GET    | `/api/v1/rooms`           | List user's rooms |
| POST   | `/api/v1/rooms`           | Create new room   |
| GET    | `/api/v1/rooms/:id`       | Get room details  |
| PUT    | `/api/v1/rooms/:id`       | Update room       |
| DELETE | `/api/v1/rooms/:id`       | Delete room       |
| POST   | `/api/v1/rooms/:id/join`  | Join room         |
| POST   | `/api/v1/rooms/:id/leave` | Leave room        |

### Messages

| Method | Endpoint                         | Description    |
| ------ | -------------------------------- | -------------- |
| GET    | `/api/v1/rooms/:roomId/messages` | Get messages   |
| POST   | `/api/v1/rooms/:roomId/messages` | Send message   |
| PUT    | `/api/v1/messages/:id`           | Edit message   |
| DELETE | `/api/v1/messages/:id`           | Delete message |

### WebSocket Events

- `room:join` - Join a chat room
- `room:leave` - Leave a room
- `message:send` - Send message
- `typing:start` / `typing:stop` - Typing indicators
- `presence:update` - User online status
- `voice:signal` - WebRTC signaling

---

## 🔐 Environment Variables

### Backend (.env in `backend/`)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/voiceflow_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=voiceflow_db
DB_USER=voiceflow_user
DB_PASSWORD=voiceflow_password

# JWT Authentication
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server
NODE_ENV=development
PORT=3000

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env in `frontend/`)

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## 🧪 Testing

### Test Backend API with curl

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Frontend

1. Open <http://localhost:5173>
2. Register a new account
3. Create a chat room
4. Send messages
5. Test real-time updates

---

## 🐳 Docker Deployment

### Build Images

```bash
docker compose build
```

### Run in Production

```bash
docker compose -f docker-compose.yml up -d
```

### View Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

### Health Check

```bash
curl http://localhost:3000/health
curl http://localhost:5173
```

---

## 📊 Database Schema

### Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Roomss

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE,
  created_by UUID REFERENCES users(id),
  max_users INTEGER DEFAULT 10,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Messagess

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚨 Troubleshooting

### Backend won't start

```bash
# Check environment variables
cat backend/.env

# Reinstall dependencies
cd backend && pnpm install

# Verify database is running
docker compose ps
```

### Frontend won't start

```bash
# Check dependencies
cd frontend && pnpm install

# Clear cache
rm -rf frontend/.vite node_modules

# Reinstall
pnpm install
```

### Database connection refused

```bash
# Start database
docker compose up -d postgres redis

# Check if running
docker compose ps
docker compose logs postgres
```

### Port already in use

```powershell
# Find process using port 3000
Get-Process | Where-Object {$_.Name -eq "node"} | Stop-Process -Force

# Or use different port
PORT=3001 pnpm dev
```

---

## 📚 Additional Resources

- **API Documentation**: See `ARCHITECTURE.md`
- **Implementation Details**: See `IMPLEMENTATION.md`
- **Environment Setup**: See `.env`
- **TypeScript Types**: See `shared/src/types/`
- **Validation Schemas**: See `shared/src/schemas/`

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint configured
- **Formatting**: Prettier configured
- **Testing**: Vitest ready

---

## 📝 License

MIT License - See LICENSE file for details

---

## 👨‍💼 Author

## Montassar Kabsi

- GitHub: [@KabsiMontassar](https://github.com/KabsiMontassar)
- Email: <montassar.kabsi@example.com>

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/)
- [React](https://react.dev/)
- [Socket.IO](https://socket.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)

---

**Status**: ✅ Production Ready  
**Last Updated**: October 19, 2025  
**Version**: 1.0.0
