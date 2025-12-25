# NullStack API Gateway

The API Gateway is the main entry point for all NullStack microservices. It provides a unified interface for clients to interact with the distributed system.

## Features

- **Unified API Entry Point**: Single endpoint for all microservices
- **Intelligent Routing**: Routes requests to appropriate microservices
- **Rate Limiting**: Global and per-endpoint rate limiting
- **CORS Support**: Configurable cross-origin resource sharing
- **Request Logging**: Detailed HTTP request/response logging
- **Health Monitoring**: Comprehensive health checks for all services
- **WebSocket Support**: Real-time bidirectional communication
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Security**: Helmet.js security headers, input validation
- **Compression**: Response compression for better performance

## Architecture

```
Client → API Gateway → Microservices
                    ├── Auth Service (3001)
                    ├── Title Service (3002)
                    ├── Player Service (3003)
                    ├── Economy Service (3004)
                    ├── CloudScript Service (3005)
                    ├── Matchmaking Service (3006)
                    └── Analytics Service (3007)
```

## API Routes

### Service Routes

- `POST /api/v1/auth/*` → Auth Service
- `GET|POST|PUT|DELETE /api/v1/titles/*` → Title Service
- `GET|POST|PUT|DELETE /api/v1/player/*` → Player Service
- `GET|POST|PUT|DELETE /api/v1/economy/*` → Economy Service
- `POST /api/v1/cloudscript/*` → CloudScript Service
- `GET|POST /api/v1/matchmaking/*` → Matchmaking Service
- `GET|POST /api/v1/analytics/*` → Analytics Service

### Health & Monitoring

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health status of all services
- `GET /health/live` - Kubernetes liveness probe
- `GET /health/ready` - Kubernetes readiness probe
- `POST /health/cache/clear` - Clear health check cache (admin only)

### Documentation

- `GET /` - API Gateway information
- `GET /api-docs` - Swagger UI documentation
- `GET /api-docs.json` - OpenAPI specification (JSON)

### WebSocket

- `WS /ws` - WebSocket endpoint for real-time communication

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` to match your environment.

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Docker

Build image:

```bash
npm run docker:build
```

Run container:

```bash
npm run docker:run
```

Or use Docker Compose:

```bash
docker-compose up -d
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 8080 |
| `HOST` | Server host | 0.0.0.0 |
| `AUTH_SERVICE_URL` | Auth service URL | http://auth-service:3001 |
| `TITLE_SERVICE_URL` | Title service URL | http://title-service:3002 |
| `PLAYER_SERVICE_URL` | Player service URL | http://player-service:3003 |
| `ECONOMY_SERVICE_URL` | Economy service URL | http://economy-service:3004 |
| `CLOUDSCRIPT_SERVICE_URL` | CloudScript service URL | http://cloudscript-service:3005 |
| `MATCHMAKING_SERVICE_URL` | Matchmaking service URL | http://matchmaking-service:3006 |
| `ANALYTICS_SERVICE_URL` | Analytics service URL | http://analytics-service:3007 |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | - |
| `GLOBAL_RATE_LIMIT` | Global rate limit (per 15 min) | 1000 |
| `AUTH_RATE_LIMIT` | Auth rate limit (per 15 min) | 100 |
| `API_RATE_LIMIT` | API rate limit (per 15 min) | 500 |
| `ADMIN_API_KEY` | Admin API key | - |

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
```

### Message Types

#### Authentication

```json
{
  "type": "auth",
  "data": {
    "userId": "user123",
    "token": "jwt-token"
  }
}
```

#### Subscribe to Channel

```json
{
  "type": "subscribe",
  "data": {
    "channel": "game-updates"
  }
}
```

#### Unsubscribe from Channel

```json
{
  "type": "unsubscribe",
  "data": {
    "channel": "game-updates"
  }
}
```

#### Broadcast Message

```json
{
  "type": "broadcast",
  "data": {
    "channel": "game-updates",
    "message": "Hello World"
  }
}
```

## Rate Limiting

The API Gateway implements multiple tiers of rate limiting:

- **Global**: 1000 requests per 15 minutes (all endpoints)
- **Auth**: 100 requests per 15 minutes (authentication endpoints)
- **Strict**: 20 requests per 15 minutes (sensitive operations)
- **API**: 500 requests per 15 minutes (general API endpoints)
- **WebSocket**: 10 connections per minute

Rate limits are enforced per IP address or API key.

## Health Monitoring

The gateway continuously monitors all downstream services and provides:

- Individual service health status
- Response time metrics
- Circuit breaker patterns
- Automatic retry mechanisms
- Health check caching (30s TTL)

## Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin policies
- **Rate Limiting**: DDoS protection
- **Request Validation**: Input sanitization
- **Error Handling**: No sensitive data exposure

## Logging

Winston-based logging with multiple levels:

- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `http`: HTTP request/response logs
- `debug`: Debug-level messages

Logs include:
- Request ID tracking
- Response time metrics
- IP address logging
- User agent tracking

## Development

### Project Structure

```
api-gateway/
├── src/
│   ├── config/          # Configuration files
│   │   ├── services.ts  # Service definitions
│   │   └── swagger.ts   # API documentation config
│   ├── middleware/      # Express middleware
│   │   ├── cors.ts      # CORS configuration
│   │   ├── logger.ts    # Request logging
│   │   └── rate-limiter.ts  # Rate limiting
│   ├── routes/          # Route handlers
│   │   ├── health.ts    # Health check routes
│   │   └── proxy.ts     # Proxy routes
│   ├── utils/           # Utilities
│   │   ├── logger.ts    # Winston logger
│   │   └── health-checker.ts  # Health monitoring
│   ├── websocket/       # WebSocket server
│   │   └── server.ts    # WebSocket implementation
│   └── index.ts         # Application entry point
├── Dockerfile           # Docker configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## License

MIT
