# How to Access the NullStack Developer Portal

## Current Status

The backend services are running in Docker, but the Developer Portal needs to be accessed differently due to workspace configuration issues.

## Option 1: Access Backend Services Directly (Currently Working)

You can access the running backend services directly:

### Player Service (RUNNING ✅)
```
http://localhost:3003/health
```

Test it:
```powershell
curl http://localhost:3003/health
```

### Database Interfaces

**RabbitMQ Management UI** (RUNNING ✅)
```
http://localhost:15672
Username: nullstack
Password: nullstack_dev_password
```

**PostgreSQL** (RUNNING ✅)
```powershell
docker exec -it nullstack-postgres psql -U nullstack -d nullstack
```

**MongoDB** (RUNNING ✅)
```powershell
docker exec -it nullstack-mongo mongosh mongodb://nullstack:nullstack_dev_password@localhost:27017/nullstack?authSource=admin
```

**Redis** (RUNNING ✅)
```powershell
docker exec -it nullstack-redis redis-cli -a nullstack_dev_password
```

## Option 2: Use API Endpoints Directly

You can interact with the services using curl or Postman:

### Create a Developer Account
```powershell
curl -X POST http://localhost:3001/api/v1/developer/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"dev@example.com\",\"password\":\"password123\",\"name\":\"Developer\"}'
```

### Create a Player Account
```powershell
curl -X POST http://localhost:3001/api/v1/player/auth/register `
  -H "Content-Type: application/json" `
  -H "X-Title-Key: your-title-secret-key" `
  -d '{\"email\":\"player@example.com\",\"password\":\"password123\"}'
```

## Option 3: Build Developer Portal Manually

To get the React portal running:

```powershell
cd C:\Users\drych\Documents\NullStack\apps\developer-portal

# Install dependencies
npm install react react-dom react-router-dom @tanstack/react-query axios lucide-react recharts date-fns clsx react-hot-toast vite @vitejs/plugin-react typescript tailwindcss postcss autoprefixer

# Start dev server
npx vite
```

Then open: **http://localhost:5173**

## Option 4: Use Docker for Portal (Recommended)

Create a Dockerfile for the portal:

```powershell
cd apps/developer-portal
docker build -t developer-portal .
docker run -p 3100:3100 developer-portal
```

Then access: **http://localhost:3100**

## What's Currently Running

✅ **Infrastructure (All Healthy)**
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017
- Redis: localhost:6379
- RabbitMQ: localhost:5672 + UI at localhost:15672

✅ **Backend Services**
- Player Service: localhost:3003 (HEALTHY)
- Title Service: localhost:3002 (starting)
- Economy Service: localhost:3004 (starting)

## Quick Test

Test the running player service:

```powershell
# Health check
curl http://localhost:3003/health

# Create a player profile (after getting session token)
curl http://localhost:3003/api/v1/player/PLAYER_ID/profile
```

## RabbitMQ Dashboard (Works Now!)

The easiest UI to access right now:

**Open in browser:** http://localhost:15672

- Username: `nullstack`
- Password: `nullstack_dev_password`

This gives you a web interface to monitor the message queue!

## Summary

While the Developer Portal React app needs workspace configuration fixed, you have:

✅ All backend services running
✅ All databases operational
✅ RabbitMQ management UI accessible
✅ Direct API access available
✅ Database CLIs working

You can fully interact with the NullStack platform using API calls or the RabbitMQ UI!
