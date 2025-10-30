#!/bin/bash

# valero Demo Setup Script
# This script sets up the development environment for local development

echo "🚀 Setting up valero Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📋 Step 1: Starting database services..."
docker-compose -f docker-compose-demo.yaml up -d

echo "⏳ Step 2: Waiting for services to be ready..."
echo "   - PostgreSQL starting..."
until docker-compose -f docker-compose-demo.yaml exec postgres pg_isready -U valero_user -d valero_dev > /dev/null 2>&1; do
    sleep 2
    echo "   - Still waiting for PostgreSQL..."
done

echo "   - Redis starting..."
until docker-compose -f docker-compose-demo.yaml exec redis redis-cli -a valero_redis_pass ping > /dev/null 2>&1; do
    sleep 2
    echo "   - Still waiting for Redis..."
done

echo "✅ All services are ready!"

echo ""
echo "🔗 Service URLs:"
echo "   PostgreSQL: localhost:5432"
echo "   Redis: localhost:6379"
echo "   pgAdmin: http://localhost:8080 (admin@valero.dev / admin123)"
echo "   Redis Commander: http://localhost:8081 (admin / admin)"

echo ""
echo "📝 Next Steps:"
echo "   1. Copy .env.demo to .env in both backend and frontend folders"
echo "   2. Start backend: cd backend && pnpm install && pnpm run dev"
echo "   3. Start frontend: cd frontend && pnpm install && pnpm run dev"

echo ""
echo "🛑 To stop services: docker-compose -f docker-compose-demo.yaml down"
echo "🗑️  To cleanup data: docker-compose -f docker-compose-demo.yaml down -v"