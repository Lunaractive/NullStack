# Analytics Service Architecture

## System Overview

```
┌─────────────────┐
│   Game Client   │
└────────┬────────┘
         │ HTTP POST
         │ /api/v1/analytics/events
         ▼
┌─────────────────────────────────────────┐
│         Analytics Service API            │
│  (Express + Rate Limiting + Validation) │
└────────┬────────────────────────────────┘
         │
         │ Publish Event
         ▼
┌─────────────────────────────────────────┐
│           RabbitMQ Queue                 │
│      (analytics_events queue)            │
└────────┬────────────────────────────────┘
         │
         │ Consume Event
         ▼
┌─────────────────────────────────────────┐
│      Aggregator Worker Process           │
│   (Background Event Processing)          │
└────┬────────────────┬────────────────┬──┘
     │                │                │
     │ Store          │ Update         │ Aggregate
     ▼                ▼                ▼
┌─────────┐    ┌──────────┐    ┌──────────┐
│ MongoDB │    │  Redis   │    │  Redis   │
│  (Raw   │    │(Counters)│    │ (Cache)  │
│ Events) │    │          │    │          │
└─────────┘    └──────────┘    └──────────┘
     │                │                │
     │                └────────┬───────┘
     │                         │
     │ Query (Fallback)        │ Read (Fast Path)
     │                         │
     └────────┬────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         Analytics Service API            │
│    GET /api/v1/analytics/reports/*      │
└────────┬────────────────────────────────┘
         │
         │ JSON Response
         ▼
┌─────────────────┐
│  Developer      │
│  Dashboard      │
└─────────────────┘
```

## Components

### 1. HTTP API Server (`src/index.ts`)

**Responsibilities:**
- Accept event submissions from game clients
- Serve analytics reports to developers
- Health monitoring
- Rate limiting
- Request validation

**Endpoints:**
- `POST /api/v1/analytics/events` - Single event submission
- `POST /api/v1/analytics/events/batch` - Batch event submission
- `GET /api/v1/analytics/events` - Query raw events
- `GET /api/v1/analytics/reports/dau` - Daily active users
- `GET /api/v1/analytics/reports/retention` - Retention metrics
- `GET /api/v1/analytics/reports/events/:eventName` - Event analytics
- `GET /api/v1/analytics/reports/funnel` - Funnel analysis
- `GET /health` - Health check

### 2. Aggregator Worker (`src/aggregator.ts`)

**Responsibilities:**
- Consume events from RabbitMQ queue
- Store raw events in MongoDB
- Update real-time counters in Redis
- Aggregate daily metrics
- Calculate retention cohorts

**Processing Pipeline:**
```
Event → [Validate] → [Store in MongoDB] → [Update Redis Counters] → [Aggregate Metrics]
```

**Redis Keys Used:**
```
analytics:events:{titleId}:{eventName}:{date}        - Event counters
analytics:dau:{titleId}:{date}                       - Daily active users (SET)
analytics:sessions:{titleId}:{date}                  - Session IDs (SET)
analytics:session_duration:{titleId}:{date}          - Session durations (HASH)
analytics:platform:{titleId}:{date}                  - Platform distribution (HASH)
analytics:country:{titleId}:{date}                   - Country distribution (HASH)
analytics:player:{titleId}:{playerId}:{event}:{date} - Player event counter
```

### 3. Data Storage

#### MongoDB (`src/models/Event.ts`)

**Schema:**
```typescript
{
  eventId: string (indexed),
  titleId: string (indexed),
  playerId: string (indexed),
  sessionId: string (indexed),
  eventName: string (indexed),
  eventData: object,
  timestamp: date (indexed),
  platform: string,
  version: string,
  country: string,
  deviceType: string,
  createdAt: date (TTL: 90 days)
}
```

**Indexes:**
- Single: eventId, titleId, playerId, sessionId, eventName, timestamp
- Compound: (titleId, eventName, timestamp), (titleId, playerId, timestamp), (titleId, timestamp)
- TTL: createdAt (90 days)

#### Redis (`src/services/redis.ts`)

**Data Structures:**
- **Strings**: Event counters, cached reports
- **Sets**: Unique users, unique sessions
- **Hashes**: Session durations, distributions

**TTL Strategy:**
- Hourly metrics: 7 days
- Daily metrics: 90 days
- Cached reports: 1-6 hours

### 4. Message Queue

#### RabbitMQ (`src/services/rabbitmq.ts`)

**Exchange:** `analytics` (topic)
**Queue:** `analytics_events`
**Routing Key:** `events.*`

**Configuration:**
- Durable: Yes
- Message TTL: 24 hours
- Max Length: 1M messages
- Prefetch: 10 messages

## Data Flow

### Event Submission Flow

1. Game client sends event via HTTP POST
2. API validates request with Zod schema
3. Event assigned UUID and timestamp
4. Event published to RabbitMQ queue
5. API returns 202 Accepted immediately
6. Aggregator worker consumes event from queue
7. Event stored in MongoDB (with 90-day TTL)
8. Redis counters updated (atomic increments)
9. Aggregated metrics calculated if needed

### Report Generation Flow

1. Developer requests report via HTTP GET
2. API checks Redis cache for pre-computed report
3. If cached: Return from Redis (fast path)
4. If not cached:
   - Query MongoDB for raw data
   - Calculate metrics
   - Cache result in Redis
   - Return to developer
5. Subsequent requests hit Redis cache

## Performance Characteristics

### Throughput

- **Event Ingestion**: 100+ events/second per instance
- **Report Queries**: Sub-second for cached, 1-5 seconds for uncached
- **Batch Processing**: Up to 100 events per request

### Scalability

**Horizontal Scaling:**
- API servers: Stateless, can scale infinitely
- Aggregator workers: Can run multiple instances (RabbitMQ distributes load)

**Vertical Scaling:**
- MongoDB: Increase storage for longer retention
- Redis: Increase memory for more counters/cache

### Latency

- Event submission: < 50ms (async)
- Cached reports: < 100ms
- Uncached reports: 1-5 seconds
- Aggregation processing: < 1 second per event

## Reliability

### Data Durability

1. **RabbitMQ**: Durable queues, persistent messages
2. **MongoDB**: Replica sets (production)
3. **Redis**: AOF persistence (production)

### Failure Handling

1. **API Failure**: Load balancer redirects to healthy instance
2. **Aggregator Failure**: Messages requeued, processed by another worker
3. **MongoDB Failure**: Query degradation, Redis cache continues serving
4. **Redis Failure**: Fallback to MongoDB queries

### Retry Strategy

- RabbitMQ: Messages requeued on processing failure
- MongoDB: Automatic retry with exponential backoff
- Redis: Fail fast, fallback to MongoDB

## Monitoring

### Key Metrics

1. **API Metrics**:
   - Request rate (events/sec)
   - Response time (p50, p95, p99)
   - Error rate
   - Rate limit hits

2. **Aggregator Metrics**:
   - Processing rate (events/sec)
   - Queue length
   - Processing errors
   - Lag (time between event creation and processing)

3. **Storage Metrics**:
   - MongoDB: Query time, storage size, index efficiency
   - Redis: Memory usage, eviction rate, hit rate

### Health Checks

- `/health` endpoint checks:
  - MongoDB connection state
  - Redis connection state
  - RabbitMQ connection state
  - Service uptime

## Security

1. **Rate Limiting**: Prevents abuse
2. **Input Validation**: Zod schemas validate all inputs
3. **CORS**: Configurable origin restrictions
4. **Helmet**: Security headers
5. **Authentication**: Can integrate with auth-service (future)

## Future Enhancements

1. **Real-time Streaming**: WebSocket support for live dashboards
2. **Machine Learning**: Predictive analytics, anomaly detection
3. **Custom Dimensions**: User-defined event properties for segmentation
4. **A/B Testing**: Variant tracking and analysis
5. **Cohort Analysis**: Advanced user segmentation
6. **Data Export**: CSV/JSON export for external analysis
7. **Alerting**: Threshold-based notifications
8. **Sampling**: High-volume event sampling for cost optimization
