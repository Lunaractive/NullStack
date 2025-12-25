# Analytics Service

The Analytics Service is responsible for tracking game events and generating analytics reports for NullStack platform.

## Features

- **Event Tracking**: Capture custom events from game clients
- **Batch Processing**: Submit multiple events in a single request for efficiency
- **Real-time Metrics**: Track DAU, sessions, and custom events in Redis
- **Historical Data**: Store raw events in MongoDB with TTL indexes
- **Background Aggregation**: Process events asynchronously via RabbitMQ
- **Analytics Reports**: Generate DAU, retention, event analytics, and funnel reports

## Architecture

### Components

1. **HTTP API** (`src/index.ts`): REST API for event submission and report queries
2. **Aggregator Worker** (`src/aggregator.ts`): Background worker that processes events from RabbitMQ
3. **MongoDB**: Stores raw event data with 90-day TTL
4. **Redis**: Real-time counters and cached aggregations
5. **RabbitMQ**: Message queue for async event processing

### Data Flow

```
Game Client → POST /events → RabbitMQ → Aggregator Worker → MongoDB + Redis
                                                            ↓
Developer → GET /reports → Redis Cache → MongoDB (fallback) → Response
```

## API Endpoints

### Event Submission

#### POST /api/v1/analytics/events
Submit a single analytics event from game client.

**Request Body:**
```json
{
  "titleId": "title_123",
  "playerId": "player_456",
  "sessionId": "session_789",
  "eventName": "level_completed",
  "eventData": {
    "level": 5,
    "score": 1000,
    "time": 120
  },
  "platform": "ios",
  "version": "1.0.0",
  "country": "US"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event accepted for processing",
  "eventId": "uuid"
}
```

#### POST /api/v1/analytics/events/batch
Submit multiple events in a single request (up to 100 events).

**Request Body:**
```json
{
  "events": [
    {
      "titleId": "title_123",
      "eventName": "session_start",
      "playerId": "player_456"
    },
    {
      "titleId": "title_123",
      "eventName": "button_click",
      "eventData": { "button": "play" }
    }
  ]
}
```

#### GET /api/v1/analytics/events
Query raw events (for developers).

**Query Parameters:**
- `titleId` (required): Title ID
- `eventName` (optional): Filter by event name
- `playerId` (optional): Filter by player ID
- `startDate` (optional): ISO 8601 datetime
- `endDate` (optional): ISO 8601 datetime
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

### Analytics Reports

#### GET /api/v1/analytics/reports/dau
Get Daily Active Users report.

**Query Parameters:**
- `titleId` (required): Title ID
- `startDate` (optional): Start date (default: 30 days ago)
- `endDate` (optional): End date (default: today)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "activeUsers": 1500,
      "newUsers": 200,
      "returningUsers": 1300,
      "sessions": 3000,
      "avgSessionDuration": 450
    }
  ]
}
```

#### GET /api/v1/analytics/reports/retention
Get user retention metrics.

**Query Parameters:**
- `titleId` (required): Title ID
- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "cohortDate": "2024-01-01",
      "cohortSize": 1000,
      "day1": 45.5,
      "day3": 30.2,
      "day7": 20.1,
      "day14": 15.3,
      "day30": 10.5
    }
  ]
}
```

#### GET /api/v1/analytics/reports/events/:eventName
Get analytics for a specific event.

**Query Parameters:**
- `titleId` (required): Title ID
- `startDate` (optional): Start date (default: 7 days ago)
- `endDate` (optional): End date (default: today)
- `groupBy` (optional): 'day' or 'hour' (default: 'day')

**Response:**
```json
{
  "success": true,
  "data": {
    "eventName": "level_completed",
    "totalCount": 5000,
    "uniqueUsers": 800,
    "avgPerUser": 6.25,
    "topValues": [],
    "timeline": [
      {
        "date": "2024-01-01",
        "count": 500
      }
    ]
  }
}
```

#### GET /api/v1/analytics/reports/funnel
Analyze user funnel progression.

**Query Parameters:**
- `titleId` (required): Title ID
- `steps` (required): JSON array of funnel steps
- `startDate` (optional): Start date
- `endDate` (optional): End date

**Example:**
```
GET /api/v1/analytics/reports/funnel?titleId=title_123&steps=[
  {"stepName":"Start","eventName":"session_start"},
  {"stepName":"Tutorial","eventName":"tutorial_complete"},
  {"stepName":"First Level","eventName":"level_completed"}
]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 10000,
    "steps": [
      {
        "stepName": "Start",
        "users": 10000,
        "dropoff": 0,
        "conversionRate": 100
      },
      {
        "stepName": "Tutorial",
        "users": 7500,
        "dropoff": 2500,
        "conversionRate": 75
      }
    ]
  }
}
```

## Environment Variables

```env
# Server
PORT=3005
NODE_ENV=development
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://nullstack:nullstack_dev_password@localhost:27017/nullstack?authSource=admin

# Redis
REDIS_URL=redis://:nullstack_dev_password@localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://nullstack:nullstack_dev_password@localhost:5672

# CORS
CORS_ORIGIN=*
```

## Running the Service

### Development

```bash
# Install dependencies
npm install

# Run API server
npm run dev

# Run aggregator worker (in separate terminal)
npm run aggregator
```

### Production

```bash
# Build
npm run build

# Run API server
npm start

# Run aggregator worker
npm run aggregator
```

### Docker

```bash
# Build
docker-compose build analytics-service

# Run
docker-compose up analytics-service
```

## Data Retention

- **Raw Events**: 90 days (MongoDB TTL index)
- **Redis Counters**:
  - Hourly metrics: 7 days
  - Daily metrics: 90 days
  - Cached reports: 1-6 hours

## Performance Considerations

1. **Rate Limiting**:
   - Event submission: 100 requests/minute per IP
   - Reports: 1000 requests/15 minutes per IP

2. **Batch Processing**: Use `/events/batch` endpoint for bulk submissions (up to 100 events)

3. **Caching**: Reports are cached in Redis for faster access

4. **Indexes**: MongoDB has compound indexes for common queries

5. **Async Processing**: Events are processed asynchronously via RabbitMQ

## Monitoring

### Health Check

```bash
GET /health
```

Response includes status of MongoDB, Redis, and RabbitMQ connections.

### Key Metrics to Monitor

- RabbitMQ queue length
- Event processing rate
- API response times
- MongoDB query performance
- Redis memory usage

## Common Event Patterns

### Session Tracking
```json
// Session start
{
  "eventName": "session_start",
  "sessionId": "unique_session_id",
  "playerId": "player_id"
}

// Session end
{
  "eventName": "session_end",
  "sessionId": "unique_session_id",
  "playerId": "player_id"
}
```

### Custom Events
```json
{
  "eventName": "purchase",
  "eventData": {
    "itemId": "sword_001",
    "amount": 100,
    "currency": "gold"
  }
}
```

### Progression Events
```json
{
  "eventName": "level_completed",
  "eventData": {
    "level": 5,
    "score": 1000,
    "duration": 120,
    "stars": 3
  }
}
```
