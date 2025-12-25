# NullStack API Gateway - Quick Start Guide

This guide will help you get the API Gateway up and running in minutes.

## Prerequisites

- Node.js 18+ and npm 9+
- Docker (optional, for containerized deployment)
- Kubernetes cluster (optional, for K8s deployment)

## Quick Start Options

### Option 1: Local Development (Recommended for Development)

1. **Clone and Navigate**
   ```bash
   cd services/api-gateway
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your service URLs
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Gateway**
   - API Gateway: http://localhost:8080
   - API Documentation: http://localhost:8080/api-docs
   - Health Check: http://localhost:8080/health
   - Metrics: http://localhost:8080/metrics
   - WebSocket: ws://localhost:8080/ws

### Option 2: Docker (Recommended for Testing)

1. **Build Docker Image**
   ```bash
   docker build -t nullstack/api-gateway .
   ```

2. **Run Container**
   ```bash
   docker run -p 8080:8080 \
     -e AUTH_SERVICE_URL=http://auth-service:3001 \
     -e TITLE_SERVICE_URL=http://title-service:3002 \
     nullstack/api-gateway
   ```

### Option 3: Docker Compose (Easiest for Full Stack)

1. **Start All Services**
   ```bash
   docker-compose up -d
   ```

2. **View Logs**
   ```bash
   docker-compose logs -f api-gateway
   ```

3. **Stop Services**
   ```bash
   docker-compose down
   ```

### Option 4: Kubernetes (Recommended for Production)

1. **Apply Kubernetes Manifests**
   ```bash
   kubectl create namespace nullstack
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

2. **Check Deployment Status**
   ```bash
   kubectl get pods -n nullstack
   kubectl get svc -n nullstack
   ```

3. **View Logs**
   ```bash
   kubectl logs -f -l app=api-gateway -n nullstack
   ```

## Using the Makefile (Recommended)

The Makefile provides convenient shortcuts:

```bash
# Setup and install
make setup

# Development
make dev

# Production
make build
make start

# Testing
make test
make lint

# Docker
make docker-build
make docker-run

# Kubernetes
make k8s-deploy
make k8s-status
make k8s-logs

# Health checks
make check-health
make check-metrics
```

## Testing the Gateway

### 1. Health Check
```bash
curl http://localhost:8080/health
```

### 2. Detailed Health with All Services
```bash
curl http://localhost:8080/health/detailed
```

### 3. Gateway Information
```bash
curl http://localhost:8080/
```

### 4. Metrics
```bash
curl http://localhost:8080/metrics
```

### 5. Test Service Routing (Example: Auth Service)
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 6. WebSocket Connection (Using wscat)
```bash
npm install -g wscat
wscat -c ws://localhost:8080/ws
```

Then send messages:
```json
{"type":"auth","data":{"userId":"user123","token":"your-token"}}
{"type":"subscribe","data":{"channel":"game-updates"}}
{"type":"ping"}
```

## Configuration

### Environment Variables

Key environment variables to configure:

```env
# Server
NODE_ENV=development
PORT=8080

# Service URLs
AUTH_SERVICE_URL=http://auth-service:3001
TITLE_SERVICE_URL=http://title-service:3002
PLAYER_SERVICE_URL=http://player-service:3003
ECONOMY_SERVICE_URL=http://economy-service:3004
CLOUDSCRIPT_SERVICE_URL=http://cloudscript-service:3005
MATCHMAKING_SERVICE_URL=http://matchmaking-service:3006
ANALYTICS_SERVICE_URL=http://analytics-service:3007

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
GLOBAL_RATE_LIMIT=1000
AUTH_RATE_LIMIT=100
API_RATE_LIMIT=500

# Admin
ADMIN_API_KEY=your-secure-key
```

## API Routes

The gateway routes requests to these microservices:

| Route Pattern | Target Service | Description |
|--------------|----------------|-------------|
| `/api/v1/auth/*` | auth-service:3001 | Authentication & authorization |
| `/api/v1/titles/*` | title-service:3002 | Game title management |
| `/api/v1/player/*` | player-service:3003 | Player data & profiles |
| `/api/v1/economy/*` | economy-service:3004 | Virtual currency & transactions |
| `/api/v1/cloudscript/*` | cloudscript-service:3005 | Server-side game logic |
| `/api/v1/matchmaking/*` | matchmaking-service:3006 | Player matchmaking |
| `/api/v1/analytics/*` | analytics-service:3007 | Game analytics & metrics |

## Common Issues

### 1. Port Already in Use
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

### 2. Service Connection Failed
- Check if downstream services are running
- Verify service URLs in .env
- Check health endpoint: `curl http://localhost:8080/health/detailed`

### 3. Rate Limit Errors
- Increase rate limits in .env
- Clear rate limit cache by restarting the gateway

### 4. WebSocket Connection Issues
- Ensure firewall allows WebSocket connections
- Check if using a proxy that supports WebSocket
- Verify WebSocket endpoint: ws://localhost:8080/ws

## Monitoring

### View Logs
```bash
# Development
npm run dev

# Production (file logs)
tail -f /var/log/nullstack/combined.log
tail -f /var/log/nullstack/error.log
```

### Health Monitoring
```bash
# Basic health
curl http://localhost:8080/health

# Detailed health with all services
curl http://localhost:8080/health/detailed | jq

# Kubernetes liveness
curl http://localhost:8080/health/live

# Kubernetes readiness
curl http://localhost:8080/health/ready
```

### Metrics Monitoring
```bash
# Get current metrics
curl http://localhost:8080/metrics | jq

# Circuit breaker status
curl http://localhost:8080/circuit-breakers | jq
```

## Next Steps

1. **Configure downstream services** - Ensure all microservices are running
2. **Setup monitoring** - Integrate with Prometheus/Grafana
3. **Configure SSL/TLS** - Setup HTTPS in production
4. **Setup logging** - Configure centralized logging (ELK, Splunk)
5. **Load testing** - Test performance under load
6. **Security hardening** - Review and update security settings

## API Documentation

Once running, visit http://localhost:8080/api-docs for interactive Swagger documentation.

## Support

For issues or questions:
- Check logs: `docker-compose logs api-gateway`
- View health: `curl http://localhost:8080/health/detailed`
- Check metrics: `curl http://localhost:8080/metrics`

## Production Checklist

Before deploying to production:

- [ ] Update all environment variables
- [ ] Set strong ADMIN_API_KEY
- [ ] Configure ALLOWED_ORIGINS properly
- [ ] Enable HTTPS/TLS
- [ ] Setup monitoring and alerting
- [ ] Configure log aggregation
- [ ] Test health checks
- [ ] Load test the gateway
- [ ] Review rate limits
- [ ] Setup backup and disaster recovery
- [ ] Document API endpoints
- [ ] Setup CI/CD pipeline
