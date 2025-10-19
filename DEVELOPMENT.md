# Development Guide

## Overview

This guide covers setup, development workflow, and debugging for VoiceFlow developers.

## Environment Setup

### Prerequisites
- Node.js 20+
- pnpm 10+
- Docker & Docker Compose (optional)
- Git

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/KabsiMontassar/VoiceFlow.git
cd VoiceFlow

# 2. Review environment variables
cat .env

# 3. Install backend dependencies
cd backend && pnpm install

# 4. Install frontend dependencies  
cd ../frontend && pnpm install

# 5. Return to root
cd ..
```

## Running Services

### Backend Development

```bash
cd backend
pnpm dev
```

Server starts on `http://localhost:3000` with auto-reload enabled.

**Environment Variables** (in `backend/.env`):
- `PORT=3000` - Server port
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing key
- `NODE_ENV=development` - Development mode

### Frontend Development

```bash
cd frontend
pnpm dev
```

Server starts on `http://localhost:5173` with hot module replacement (HMR).

**Environment Variables** (in `frontend/.env`):
- `VITE_API_URL=http://localhost:3000` - Backend API
- `VITE_SOCKET_URL=http://localhost:3000` - WebSocket server

### Database Services

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# View logs
docker compose logs -f postgres redis

# Stop services
docker compose down
```

### Full Stack (Optional)

Start all services including backend and frontend in Docker:

```bash
docker compose up -d

# View all services
docker compose ps

# View logs
docker compose logs -f
```

## Project Structure

```
backend/
├── src/
│   ├── controllers/    # Route handlers
│   ├── services/       # Business logic
│   ├── models/         # Database models (Sequelize)
│   ├── routes/         # API endpoint definitions
│   ├── middleware/     # Express middleware (auth, error handling)
│   ├── sockets/        # WebSocket event handlers
│   ├── database/       # DB connection & initialization
│   ├── config/         # Configuration
│   ├── utils/          # Utility functions
│   └── index.ts        # Entry point
├── package.json
├── tsconfig.json
└── .env

frontend/
├── src/
│   ├── services/       # API client, Socket.IO client
│   ├── stores/         # Zustand state management
│   ├── pages/          # Page components
│   ├── components/     # Reusable UI components
│   ├── styles/         # Tailwind CSS
│   ├── routes/         # TanStack Router setup
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html

shared/
├── src/
│   ├── types/          # TypeScript interfaces
│   ├── schemas/        # Zod validation schemas
│   ├── constants/      # Application constants
│   └── utils/          # Shared utilities
└── package.json
```

## Common Development Tasks

### Adding a New API Endpoint

1. **Create controller** (`backend/src/controllers/example.controller.ts`):
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError, sendSuccess } from '../utils/responses';

export class ExampleController {
  getExample = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = { message: 'Hello, World!' };
      res.json(sendSuccess(data, 'Example retrieved'));
    } catch (error) {
      next(error);
    }
  };
}
```

2. **Create service** (`backend/src/services/example.service.ts`):
```typescript
export class ExampleService {
  async getExample() {
    return { message: 'Hello, World!' };
  }
}
```

3. **Create route** (`backend/src/routes/example.routes.ts`):
```typescript
import { Router } from 'express';
import { ExampleController } from '../controllers/example.controller';

const router = Router();
const controller = new ExampleController();

router.get('/', controller.getExample);

export default router;
```

4. **Register route** in `backend/src/routes/index.ts`:
```typescript
import exampleRoutes from './example.routes';
router.use('/examples', exampleRoutes);
```

### Adding a New Frontend Page

1. **Create route** (`frontend/src/routes/example.tsx`):
```typescript
import { createFileRoute } from '@tanstack/react-router';
import ExamplePage from '../pages/Example';

export const Route = createFileRoute('/example')({
  component: ExamplePage,
});
```

2. **Create page component** (`frontend/src/pages/Example.tsx`):
```typescript
export default function ExamplePage() {
  return <div>Example Page</div>;
}
```

### Type Checking

```bash
# Backend
cd backend && pnpm typecheck

# Frontend
cd frontend && pnpm typecheck

# Both
cd frontend && pnpm typecheck && cd ../backend && pnpm typecheck
```

### Linting & Formatting

```bash
# Frontend
cd frontend
pnpm lint          # Check for issues
pnpm lint:fix      # Fix issues
pnpm format        # Format code with Prettier
```

### Building for Production

```bash
# Backend
cd backend
pnpm build
# Output: dist/

# Frontend
cd frontend
pnpm build
# Output: dist/

# Or use Docker
docker compose build
```

## Database

### Models

Located in `backend/src/models/index.ts`, using Sequelize:
- `User` - User accounts
- `Room` - Chat rooms
- `Message` - Chat messages
- `RoomUser` - Room membership
- `FileMetadata` - File storage metadata

### Running Migrations

```bash
cd backend
pnpm migrate
```

### Seeding Data

```bash
cd backend
pnpm seed
```

## WebSocket Events

### Client Connects
- Authentication via JWT
- User joins default room
- Broadcast user online status

### Available Events

**Authentication**:
- `auth` - Send JWT token

**Room Management**:
- `room:join` - Join chat room
- `room:leave` - Leave chat room
- `room:created` - New room created

**Messaging**:
- `message:send` - Send message to room
- `message:edit` - Edit sent message
- `message:delete` - Delete message
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

**Presence**:
- `presence:update` - User online status
- `user:online` - User came online
- `user:offline` - User went offline

## Debugging

### Backend Debugging

1. **Enable verbose logging**:
```typescript
// backend/src/utils/logger.ts
const level = process.env.LOG_LEVEL || 'debug';
```

2. **Use debugger**:
```bash
cd backend
node --inspect-brk dist/index.js
# Open chrome://inspect in Chrome
```

### Frontend Debugging

1. **React DevTools** - Install browser extension
2. **React Router DevTools** - Available at app in dev mode
3. **Socket.IO Monitor** - Check WebSocket events in browser console

### Common Issues

**Backend fails to start**
```bash
# Check environment variables
cat backend/.env

# Check database connection
docker compose ps postgres
docker compose logs postgres

# Reinstall dependencies
cd backend && pnpm install
```

**Frontend won't build**
```bash
# Clear cache and reinstall
cd frontend && rm -rf node_modules && pnpm install

# Check TypeScript errors
pnpm typecheck
```

**Database connection refused**
```bash
# Start Docker services
docker compose up -d postgres redis

# Verify services
docker compose ps

# Check logs
docker compose logs postgres
```

**Port already in use (3000 or 5173)**
```powershell
# Windows: Find and kill process
Get-Process | Where-Object {$_.Name -eq "node"} | Stop-Process -Force

# Or use different port
cd backend && PORT=3001 pnpm dev
cd frontend && VITE_PORT=5174 pnpm dev
```

## Code Standards

### TypeScript

- Strict mode enabled
- No implicit any
- Use interfaces for complex types
- Export types from `shared` package

### Naming Conventions

- **Files**: kebab-case (e.g., `user.controller.ts`)
- **Classes**: PascalCase (e.g., `UserController`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_USERS`)
- **Types**: PascalCase (e.g., `UserDTO`)

### File Organization

- Keep files under 300 lines
- One class per file (exceptions for types)
- Group related functions
- Document public APIs

### Error Handling

- Use `AppError` for known errors
- Include error codes for client handling
- Log errors with context
- Return meaningful error messages

```typescript
throw new AppError(
  'User not found',
  404,
  'USER_NOT_FOUND',
  { userId: '123' }
);
```

### Comments

- Document public methods
- Explain complex logic
- Use JSDoc for types
- Avoid obvious comments

```typescript
/**
 * Authenticates user with email and password
 * @param email - User email
 * @param password - User password
 * @returns User with tokens
 */
async login(email: string, password: string): Promise<LoginResponse> {
  // ...
}
```

## Testing

### Unit Tests

```bash
cd frontend
pnpm test:unit

# With coverage
pnpm test:unit:coverage
```

### Integration Tests

Currently not configured. To add:

1. Install testing library
2. Create `*.test.ts` files
3. Run with Vitest

## CI/CD

GitHub Actions workflow planned. See `.github/workflows/` when available.

## Performance Tips

### Backend

- Use connection pooling for database
- Cache frequently accessed data in Redis
- Implement request rate limiting
- Use compression middleware

### Frontend

- Code split routes with dynamic imports
- Lazy load components
- Optimize images and assets
- Use React.memo for expensive components

## Resources

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Socket.IO Docs](https://socket.io/docs/)
- [Sequelize Docs](https://sequelize.org/)
- [Zustand Docs](https://zustand-demo.vercel.app/)
- [TanStack Router Docs](https://tanstack.com/router/latest)

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: add my feature"`
3. Push to branch: `git push origin feature/my-feature`
4. Create Pull Request

### Pre-commit

Husky is configured for lint and type checking:
- ESLint runs on staged TypeScript files
- TypeScript validation runs
- Prettier formats code

## Support

For questions or issues:
- Check existing GitHub issues
- Review this guide
- Check API documentation in backend README
- Contact maintainers

---

**Last Updated**: October 19, 2025  
**Version**: 1.0.0
