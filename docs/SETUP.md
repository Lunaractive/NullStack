# Local Development Setup Guide

This guide will help you set up NullStack for local development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Services](#running-the-services)
- [Troubleshooting](#troubleshooting)
- [Development Tips](#development-tips)

## Prerequisites

### Required Software

1. **Node.js and npm**
   - Version: Node.js 20.x or higher
   - Download: https://nodejs.org/
   - Verify installation:
     ```bash
     node -v  # Should show v20.x.x or higher
     npm -v   # Should show 10.x.x or higher
     ```

2. **Docker and Docker Compose**
   - Docker Desktop (recommended) or Docker Engine
   - Download: https://www.docker.com/products/docker-desktop
   - Verify installation:
     ```bash
     docker --version
     docker-compose --version  # or docker compose version
     ```

3. **Git**
   - Version: 2.x or higher
   - Download: https://git-scm.com/
   - Verify installation:
     ```bash
     git --version
     ```

### Recommended Software

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Docker
  - GitLens

- **Postman** or **Insomnia** for API testing

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/nullstack.git
cd nullstack
```

### 2. Automated Setup (Recommended)

Run the automated setup script:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This script will:
- Check prerequisites
- Install npm dependencies
- Create `.env` file from template
- Start Docker containers for databases
- Run database migrations
- Build all packages

### 3. Manual Setup (Alternative)

If you prefer manual setup or the script fails:

#### Step 1: Install Dependencies

```bash
npm install
```

#### Step 2: Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and update any values as needed.

#### Step 3: Start Docker Containers

```bash
docker-compose up -d postgres mongodb redis rabbitmq
```

Wait for containers to be healthy:

```bash
docker-compose ps
```

#### Step 4: Run Database Migrations

```bash
npm run migrate
```

#### Step 5: Build Packages

```bash
npm run build
```

## Configuration

### Environment Variables

The `.env` file contains all configuration. Key variables:

#### Database Configuration

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=nullstack
POSTGRES_USER=nullstack
POSTGRES_PASSWORD=nullstack_dev_password

# MongoDB
MONGODB_URI=mongodb://nullstack:nullstack_dev_password@localhost:27017/nullstack?authSource=admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=nullstack_dev_password
```

#### JWT Configuration

```bash
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

#### Service URLs

```bash
API_GATEWAY_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:3001
TITLE_SERVICE_URL=http://localhost:3002
PLAYER_SERVICE_URL=http://localhost:3003
ECONOMY_SERVICE_URL=http://localhost:3004
ANALYTICS_SERVICE_URL=http://localhost:3005
CLOUDSCRIPT_SERVICE_URL=http://localhost:3006
MATCHMAKING_SERVICE_URL=http://localhost:3007
AUTOMATION_SERVICE_URL=http://localhost:3008
```

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 3000 | http://localhost:3000 |
| Auth Service | 3001 | http://localhost:3001 |
| Title Service | 3002 | http://localhost:3002 |
| Player Service | 3003 | http://localhost:3003 |
| Economy Service | 3004 | http://localhost:3004 |
| Analytics Service | 3005 | http://localhost:3005 |
| CloudScript Service | 3006 | http://localhost:3006 |
| Matchmaking Service | 3007 | http://localhost:3007 |
| Automation Service | 3008 | http://localhost:3008 |
| Developer Portal | 3100 | http://localhost:3100 |

### Database Ports

| Database | Port | Access |
|----------|------|--------|
| PostgreSQL | 5432 | `psql -h localhost -U nullstack -d nullstack` |
| MongoDB | 27017 | `mongosh mongodb://nullstack:nullstack_dev_password@localhost:27017/nullstack?authSource=admin` |
| Redis | 6379 | `redis-cli -a nullstack_dev_password` |
| RabbitMQ | 5672 | AMQP connection |
| RabbitMQ Management | 15672 | http://localhost:15672 |

## Running the Services

### Start All Services

```bash
npm run dev
```

This uses Turborepo to start all services concurrently in development mode with hot-reload.

### Start Specific Services

```bash
# Start only the API Gateway
npm run dev --workspace=@nullstack/api-gateway

# Start multiple specific services
npm run dev --workspace=@nullstack/auth-service --workspace=@nullstack/player-service
```

### Start with Docker Compose

To run everything in Docker:

```bash
docker-compose up
```

Or in detached mode:

```bash
docker-compose up -d
```

### Stop Services

```bash
# Stop Docker services
docker-compose down

# Stop with volume cleanup
docker-compose down -v
```

## Verifying the Setup

### 1. Check Service Health

```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# Player Service
curl http://localhost:3003/health
```

### 2. Access Developer Portal

Open http://localhost:3100 in your browser. You should see the login page.

### 3. View API Documentation

Open http://localhost:3000/api-docs to view the Swagger documentation.

### 4. Check Database Connections

```bash
# PostgreSQL
docker exec -it nullstack-postgres psql -U nullstack -d nullstack -c "\dt"

# MongoDB
docker exec -it nullstack-mongo mongosh --eval "use nullstack; db.stats()"

# Redis
docker exec -it nullstack-redis redis-cli -a nullstack_dev_password ping
```

## Troubleshooting

### Port Already in Use

If you get port conflicts:

1. Check what's using the port:
```bash
# On Linux/Mac
lsof -i :3000

# On Windows
netstat -ano | findstr :3000
```

2. Either stop the conflicting process or change the port in `.env`

### Docker Containers Won't Start

1. Check Docker is running:
```bash
docker ps
```

2. Check container logs:
```bash
docker-compose logs postgres
docker-compose logs mongodb
docker-compose logs redis
```

3. Remove and recreate containers:
```bash
docker-compose down -v
docker-compose up -d
```

### Database Connection Errors

1. Verify containers are running:
```bash
docker-compose ps
```

2. Check environment variables in `.env`

3. Wait for containers to be fully ready:
```bash
# PostgreSQL
docker exec nullstack-postgres pg_isready -U nullstack

# MongoDB
docker exec nullstack-mongo mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec nullstack-redis redis-cli ping
```

### npm Install Failures

1. Clear npm cache:
```bash
npm cache clean --force
```

2. Delete node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

3. Check Node.js version:
```bash
node -v  # Should be 20.x or higher
```

### Build Errors

1. Clean build artifacts:
```bash
npm run clean
```

2. Rebuild:
```bash
npm run build
```

3. Check for TypeScript errors:
```bash
npx tsc --noEmit
```

## Development Tips

### Hot Reload

All services support hot-reload in development mode. Changes to TypeScript files will automatically restart the service.

### Debugging

#### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Auth Service",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/services/auth-service",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

#### Console Logging

All services use structured logging:

```typescript
import { logger } from '@nullstack/shared';

logger.info('User logged in', { userId: user.id });
logger.error('Failed to fetch data', { error });
```

### Database Management

#### Run Migrations

```bash
npm run migrate
```

#### Create New Migration

1. Create a new SQL file in `packages/database/migrations/`:
```sql
-- 2_add_new_table.sql
CREATE TABLE IF NOT EXISTS new_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

2. Run migrations:
```bash
npm run migrate
```

#### Reset Database

```bash
docker-compose down -v
docker-compose up -d postgres mongodb redis rabbitmq
npm run migrate
```

### Testing

#### Run All Tests

```bash
npm run test
```

#### Run Tests for Specific Service

```bash
npm run test --workspace=@nullstack/auth-service
```

#### Run Tests in Watch Mode

```bash
npm run test:watch
```

#### Run Tests with Coverage

```bash
npm run test:coverage
```

### Linting and Formatting

#### Run ESLint

```bash
npm run lint
```

#### Fix ESLint Issues

```bash
npm run lint:fix
```

#### Format Code with Prettier

```bash
npm run format
```

### Working with Turborepo

#### Build Only Changed Packages

```bash
npm run build
```

Turborepo automatically detects and builds only changed packages.

#### Clear Turbo Cache

```bash
npx turbo run build --force
```

#### Run Command in All Workspaces

```bash
npx turbo run <command>
```

### Docker Commands

#### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 -f
```

#### Execute Commands in Container

```bash
# PostgreSQL
docker exec -it nullstack-postgres psql -U nullstack -d nullstack

# MongoDB
docker exec -it nullstack-mongo mongosh

# Redis
docker exec -it nullstack-redis redis-cli -a nullstack_dev_password
```

#### Restart Service

```bash
docker-compose restart postgres
```

## Next Steps

- [Read the Architecture Documentation](ARCHITECTURE.md)
- [Review the API Documentation](API.md)
- [Learn about Deployment](DEPLOYMENT.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

## Need Help?

- Check [Troubleshooting](#troubleshooting) section above
- Review existing [GitHub Issues](https://github.com/your-org/nullstack/issues)
- Create a new issue with the `question` label
- Join our [GitHub Discussions](https://github.com/your-org/nullstack/discussions)
