# NullStack Quick Start Guide

## Prerequisites

Before running NullStack, you need:

1. **Node.js 20+** - [Download from nodejs.org](https://nodejs.org/)
2. **Docker Desktop** - [Download from docker.com](https://www.docker.com/products/docker-desktop/)
3. **Git** (optional)

## Installation Steps

### Step 1: Install Docker Desktop

1. Download Docker Desktop for Windows from https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Wait for Docker to be running (check system tray)

### Step 2: Verify Installation

Open PowerShell or Command Prompt and verify:

```powershell
node --version   # Should show v20.x.x or higher
npm --version    # Should show 10.x.x or higher
docker --version # Should show Docker version
```

### Step 3: Start the Databases

```powershell
cd C:\Users\drych\Documents\NullStack
docker-compose up -d postgres mongodb redis rabbitmq
```

Wait about 30 seconds for databases to fully start.

### Step 4: Check Database Status

```powershell
docker-compose ps
```

You should see 4 containers running (postgres, mongodb, redis, rabbitmq).

### Step 5: Run Database Migrations

```powershell
# Copy the SQL migration file into the container
docker cp packages/database/migrations/1_initial_schema.sql nullstack-postgres:/tmp/

# Run the migration
docker exec nullstack-postgres psql -U nullstack -d nullstack -f /tmp/1_initial_schema.sql
```

### Step 6: Install Dependencies

This project uses npm workspaces. Install all dependencies:

```powershell
npm install --legacy-peer-deps
```

### Step 7: Build Shared Packages

```powershell
cd packages/shared
npm run build
cd ../..

cd packages/database
npm run build
cd ../..
```

### Step 8: Start Individual Services

Open separate terminal windows for each service:

**Terminal 1 - Auth Service:**
```powershell
cd services/auth-service
npm install
npm run dev
```

**Terminal 2 - Title Service:**
```powershell
cd services/title-service
npm install
npm run dev
```

**Terminal 3 - Player Service:**
```powershell
cd services/player-service
npm install
npm run dev
```

**Terminal 4 - Economy Service:**
```powershell
cd services/economy-service
npm install
npm run dev
```

**Terminal 5 - API Gateway:**
```powershell
cd services/api-gateway
npm install
npm run dev
```

**Terminal 6 - Developer Portal:**
```powershell
cd apps/developer-portal
npm install
npm run dev
```

## Simplified Startup (All Databases Only)

If you just want to start the databases and test the setup:

```powershell
# Start databases
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres
```

## Access Points

Once everything is running:

- **Developer Portal**: http://localhost:3100
- **API Gateway**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Auth Service**: http://localhost:3001
- **Title Service**: http://localhost:3002
- **Player Service**: http://localhost:3003
- **Economy Service**: http://localhost:3004

## Troubleshooting

### Docker not starting
- Make sure Docker Desktop is running
- Check system tray for Docker icon
- Restart Docker Desktop if needed

### Port already in use
Check if ports are available:
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :5432
```

Kill processes using those ports or change ports in docker-compose.yml

### Database connection errors
- Wait 30 seconds after starting docker-compose
- Check logs: `docker-compose logs postgres`
- Restart: `docker-compose restart postgres`

### Migration errors
Make sure PostgreSQL is fully started before running migrations.

## Stopping Everything

```powershell
# Stop all Docker containers
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Next Steps

1. Create a developer account via the Developer Portal
2. Create your first game title
3. Copy the API key
4. Test the SDK with your game

## Alternative: Docker Compose (Full Stack)

To run everything in Docker (currently services need Dockerfiles updated):

```powershell
docker-compose up --build
```

This will start all services, but individual Dockerfiles may need path adjustments for the monorepo structure.
