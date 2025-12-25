# System Architecture

This document describes the architecture, design decisions, and technical details of NullStack.

## Table of Contents

- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Service Communication](#service-communication)
- [Security Architecture](#security-architecture)
- [Scalability Design](#scalability-design)
- [Technology Choices](#technology-choices)
- [Design Patterns](#design-patterns)

## Overview

NullStack is built as a microservices architecture using Node.js, TypeScript, and modern cloud-native technologies. The system is designed to be:

- **Scalable**: Handle millions of concurrent players
- **Reliable**: 99.9% uptime with fault tolerance
- **Maintainable**: Clean code, modular design, comprehensive testing
- **Secure**: Industry-standard security practices
- **Developer-Friendly**: Easy to use, well-documented APIs

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Game Client │  │  Web Client  │  │   Mobile App │          │
│  │  (Unity/UE)  │  │   (React)    │  │   (Native)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Edge Layer (CDN + WAF)                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Gateway Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Gateway                                              │  │
│  │  - Request Routing    - Rate Limiting                     │  │
│  │  - Authentication     - CORS                              │  │
│  │  - Load Balancing     - WebSocket Support                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────┬───────┬────────┬────────┬────────┬────────┬────────┬─────┘
      │       │        │        │        │        │        │
      ▼       ▼        ▼        ▼        ▼        ▼        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ Auth │ │Title │ │Player│ │Econ. │ │Analyt│ │Cloud │ ...    │
│  │Serv. │ │Serv. │ │Serv. │ │Serv. │ │Serv. │ │Script│        │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘        │
└─────┼────────┼────────┼────────┼────────┼────────┼─────────────┘
      │        │        │        │        │        │
      ▼        ▼        ▼        ▼        ▼        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  ┌──────────┐          │
│  │PostgreSQL│  │ MongoDB  │  │ Redis │  │ RabbitMQ │          │
│  └──────────┘  └──────────┘  └───────┘  └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### 1. Microservices

Each service is:
- **Independent**: Can be deployed, scaled, and updated independently
- **Single Responsibility**: Focused on a specific domain
- **Loosely Coupled**: Minimal dependencies on other services
- **Technology Agnostic**: Can use different technologies if needed

### 2. Domain-Driven Design

Services are organized by business domains:
- **Authentication**: User identity and access management
- **Title Management**: Game configuration and settings
- **Player Data**: Player profiles, progress, and statistics
- **Economy**: Virtual currencies and item management
- **Analytics**: Event tracking and metrics
- **CloudScript**: Server-side game logic
- **Matchmaking**: Player matching algorithms
- **Automation**: Scheduled tasks and triggers

### 3. API-First Design

- RESTful APIs for all services
- OpenAPI/Swagger specifications
- Versioned endpoints
- Consistent response formats

### 4. Event-Driven Architecture

- Asynchronous communication via message queues
- Event sourcing for audit trails
- Pub/Sub pattern for real-time updates

## System Components

### API Gateway

**Responsibility**: Entry point for all client requests

**Key Features**:
- Request routing to appropriate services
- Authentication and authorization
- Rate limiting and throttling
- Request/response transformation
- WebSocket support for real-time features
- API documentation (Swagger)

**Technology**: Express.js, http-proxy-middleware, ws

**Scaling**: Horizontal scaling with load balancer

### Auth Service

**Responsibility**: Authentication and authorization

**Key Features**:
- Developer registration and login
- Player authentication
- JWT token generation and validation
- Refresh token rotation
- Session management
- OAuth provider support (planned)

**Data Store**: PostgreSQL (user credentials), Redis (sessions)

**Security**:
- Bcrypt for password hashing
- JWT for stateless authentication
- Rate limiting on auth endpoints
- Account lockout after failed attempts

### Title Service

**Responsibility**: Game title management

**Key Features**:
- Title creation and configuration
- API key management
- Title settings and metadata
- Title statistics and analytics
- Multi-title support per developer

**Data Store**: PostgreSQL

**Access Control**: Developer-only access

### Player Service

**Responsibility**: Player data management

**Key Features**:
- Player profile storage
- Custom player data (flexible schema)
- Player statistics tracking
- Leaderboards
- Player segmentation
- Data versioning and conflict resolution

**Data Store**: MongoDB (player data), Redis (cache)

**Design Patterns**:
- Repository pattern for data access
- Optimistic locking for concurrent updates
- Cache-aside pattern for performance

### Economy Service

**Responsibility**: Virtual economy management

**Key Features**:
- Virtual currency management
- Inventory system
- Item catalog
- Store and purchasing
- Transaction history
- Economy analytics

**Data Store**: PostgreSQL (transactions), MongoDB (inventory), Redis (cache)

**Key Considerations**:
- ACID transactions for currency operations
- Idempotency for purchase operations
- Audit trail for all transactions

### Analytics Service

**Responsibility**: Event tracking and analytics

**Key Features**:
- Custom event tracking
- Real-time metrics
- Player behavior analytics
- Funnel analysis
- Cohort analysis
- A/B testing support (planned)

**Data Store**: MongoDB (events), RabbitMQ (event queue)

**Processing Pipeline**:
1. Event ingestion (REST API)
2. Event validation
3. Queue for processing
4. Aggregation and storage
5. Query and reporting

### CloudScript Service

**Responsibility**: Server-side game logic execution

**Key Features**:
- Custom JavaScript function execution
- Sandboxed execution environment
- Access to player data and economy APIs
- Scheduled execution
- Event triggers
- Version management

**Data Store**: MongoDB (function code and metadata)

**Security**:
- VM2 sandbox for code isolation
- Resource limits (CPU, memory, time)
- No access to file system or network
- Whitelisted APIs only

### Matchmaking Service

**Responsibility**: Player matchmaking

**Key Features**:
- Queue management
- Skill-based matchmaking
- Region-based matching
- Party/team support
- Match history
- Ranking system

**Data Store**: Redis (active queues), PostgreSQL (match history)

**Algorithm**:
- Elo-based skill rating
- Geographic proximity matching
- Wait time balancing
- Configurable matchmaking rules

### Automation Service

**Responsibility**: Scheduled tasks and automation

**Key Features**:
- Scheduled task execution
- Event-based triggers
- Workflow automation
- Bulk operations
- Data cleanup jobs

**Data Store**: PostgreSQL (task definitions), Redis (task queue)

**Scheduler**: Node-cron for scheduling

## Data Flow

### Player Authentication Flow

```
Client                API Gateway         Auth Service         Database
  │                        │                   │                   │
  ├──1. POST /auth────────▶│                   │                   │
  │   {customId}           │                   │                   │
  │                        ├──2. Validate──────▶│                   │
  │                        │   & Forward        │                   │
  │                        │                    ├──3. Check Player──▶│
  │                        │                    │                   │
  │                        │                    ◀──4. Player Data───┤
  │                        │                    │                   │
  │                        │                    ├──5. Generate JWT──┤
  │                        │                    │                   │
  │                        ◀──6. Return Tokens─┤                   │
  │◀──7. Response──────────┤                   │                   │
  │   {tokens}             │                   │                   │
```

### Player Data Update Flow

```
Client              API Gateway      Player Service       MongoDB        RabbitMQ
  │                      │                 │                 │              │
  ├──1. PUT /data───────▶│                 │                 │              │
  │                      ├──2. Validate────▶│                 │              │
  │                      │   Token          │                 │              │
  │                      │                  ├──3. Get Current─▶│              │
  │                      │                  │   Data           │              │
  │                      │                  ◀──4. Data────────┤              │
  │                      │                  │                 │              │
  │                      │                  ├──5. Version──────▶│              │
  │                      │                  │   Check          │              │
  │                      │                  │                  │              │
  │                      │                  ├──6. Update───────▶│              │
  │                      │                  │                  │              │
  │                      │                  ├──7. Publish──────┼─────────────▶│
  │                      │                  │   Event          │              │
  │                      │                  │                  │              │
  │                      ◀──8. Success──────┤                  │              │
  │◀──9. Response────────┤                  │                  │              │
```

### Purchase Transaction Flow

```
Client           Economy Service      PostgreSQL      MongoDB         Player Service
  │                    │                  │              │                   │
  ├──1. Purchase───────▶│                  │              │                   │
  │                    ├──2. Begin────────▶│              │                   │
  │                    │   Transaction     │              │                   │
  │                    │                   │              │                   │
  │                    ├──3. Check────────▶│              │                   │
  │                    │   Balance         │              │                   │
  │                    ◀──4. Balance───────┤              │                   │
  │                    │                   │              │                   │
  │                    ├──5. Deduct────────▶│              │                   │
  │                    │   Currency        │              │                   │
  │                    │                   │              │                   │
  │                    ├──6. Grant─────────┼──────────────▶│                   │
  │                    │   Item            │              │                   │
  │                    │                   │              │                   │
  │                    ├──7. Record────────▶│              │                   │
  │                    │   Transaction     │              │                   │
  │                    │                   │              │                   │
  │                    ├──8. Commit────────▶│              │                   │
  │                    │                   │              │                   │
  │                    ├──9. Update Stats──┼──────────────┼──────────────────▶│
  │                    │                   │              │                   │
  │◀──10. Success──────┤                   │              │                   │
```

## Database Schema

### PostgreSQL Schema (Relational Data)

#### Developers Table
```sql
CREATE TABLE developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Titles Table
```sql
CREATE TABLE titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID REFERENCES developers(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  secret_key VARCHAR(255) UNIQUE NOT NULL,
  settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Currency Transactions Table
```sql
CREATE TABLE currency_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID REFERENCES titles(id),
  player_id VARCHAR(255) NOT NULL,
  currency_code VARCHAR(50) NOT NULL,
  amount DECIMAL(20, 4) NOT NULL,
  balance_before DECIMAL(20, 4) NOT NULL,
  balance_after DECIMAL(20, 4) NOT NULL,
  reason VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_player_currency (title_id, player_id, currency_code),
  INDEX idx_created_at (created_at)
);
```

### MongoDB Schema (Document Data)

#### Player Data Collection
```javascript
{
  _id: ObjectId,
  titleId: "title_123",
  playerId: "player_456",
  customId: "custom_player_id",
  displayName: "PlayerName",
  data: {
    level: 25,
    experience: 12500,
    inventory: [...],
    customData: {...}
  },
  version: 42,
  createdAt: ISODate,
  updatedAt: ISODate
}

// Indexes
db.playerData.createIndex({ titleId: 1, playerId: 1 }, { unique: true })
db.playerData.createIndex({ titleId: 1, customId: 1 })
db.playerData.createIndex({ updatedAt: 1 })
```

#### Analytics Events Collection
```javascript
{
  _id: ObjectId,
  titleId: "title_123",
  playerId: "player_456",
  sessionId: "session_789",
  eventName: "level_completed",
  properties: {
    level: 5,
    score: 1000,
    time: 120
  },
  timestamp: ISODate,
  receivedAt: ISODate
}

// Indexes
db.analyticsEvents.createIndex({ titleId: 1, eventName: 1, timestamp: -1 })
db.analyticsEvents.createIndex({ playerId: 1, timestamp: -1 })
db.analyticsEvents.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }) // 90 days
```

#### CloudScript Functions Collection
```javascript
{
  _id: ObjectId,
  titleId: "title_123",
  functionName: "processGameLogic",
  code: "function processGameLogic(context, args) {...}",
  description: "Handles game logic",
  version: 3,
  active: true,
  createdAt: ISODate,
  updatedAt: ISODate
}

// Indexes
db.cloudScriptFunctions.createIndex({ titleId: 1, functionName: 1, active: 1 })
```

### Redis Data Structures

#### Session Storage
```
Key: session:{sessionId}
Type: Hash
TTL: 7 days
Value: {
  userId: "user_123",
  type: "developer|player",
  titleId: "title_123",
  createdAt: timestamp
}
```

#### Player Cache
```
Key: player:{titleId}:{playerId}
Type: String (JSON)
TTL: 1 hour
Value: {JSON serialized player data}
```

#### Leaderboard
```
Key: leaderboard:{titleId}:{leaderboardId}
Type: Sorted Set
Score: Player score
Member: player:{playerId}
```

#### Matchmaking Queue
```
Key: queue:{queueId}
Type: List
Value: {ticketId, playerId, attributes, timestamp}
```

## Service Communication

### Synchronous Communication (REST)

Services communicate via HTTP REST APIs:
- Service discovery via DNS (Kubernetes)
- Direct service-to-service calls
- Circuit breaker pattern for fault tolerance
- Retry logic with exponential backoff

### Asynchronous Communication (Message Queue)

RabbitMQ for event-driven communication:

**Exchange Types**:
- Topic exchange for event routing
- Fanout exchange for broadcasts

**Event Examples**:
```javascript
// Player level up event
{
  event: 'player.levelUp',
  titleId: 'title_123',
  playerId: 'player_456',
  data: {
    oldLevel: 24,
    newLevel: 25
  },
  timestamp: '2024-01-01T12:00:00.000Z'
}

// Purchase completed event
{
  event: 'economy.purchaseCompleted',
  titleId: 'title_123',
  playerId: 'player_456',
  data: {
    itemId: 'item_123',
    price: { Gold: 100 },
    transactionId: 'txn_789'
  },
  timestamp: '2024-01-01T12:00:00.000Z'
}
```

## Security Architecture

### Authentication & Authorization

**JWT Tokens**:
- Access Token (short-lived, 1 hour)
- Refresh Token (long-lived, 7 days)
- Token stored in HTTP-only cookies or Authorization header

**Token Structure**:
```javascript
{
  sub: 'user_123',         // Subject (user ID)
  type: 'developer',       // User type
  titleId: 'title_123',    // Title ID (for players)
  iat: 1640995200,        // Issued at
  exp: 1640998800,        // Expiration
  jti: 'token_id'         // Token ID (for revocation)
}
```

### Input Validation

- Request validation using Joi schemas
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- CSRF protection (CSRF tokens)

### Rate Limiting

Multiple tiers:
- Global: 1000 req/min per IP
- Per endpoint: Varies by endpoint
- Per user: 100 req/min per user

Implementation: Redis-based sliding window

### Secrets Management

- Environment variables for configuration
- Kubernetes secrets for sensitive data
- No secrets in code or version control
- Secret rotation policies

## Scalability Design

### Horizontal Scaling

All services are stateless and can scale horizontally:
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Scale based on CPU, memory, or custom metrics
- Automatic pod scheduling and load balancing

### Database Scaling

**PostgreSQL**:
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Partitioning for large tables

**MongoDB**:
- Replica sets for high availability
- Sharding for horizontal scaling
- Indexes for query performance

**Redis**:
- Redis Cluster for data distribution
- Redis Sentinel for automatic failover
- Read replicas for read scaling

### Caching Strategy

**Multi-layer caching**:
1. Application-level cache (in-memory)
2. Redis distributed cache
3. Database query cache

**Cache invalidation**:
- Time-based (TTL)
- Event-based (on data updates)
- LRU eviction policy

### Performance Optimization

- Connection pooling for databases
- Async I/O for non-blocking operations
- Batch processing for bulk operations
- Query optimization and indexing
- CDN for static assets

## Technology Choices

### Why Node.js?

- **Performance**: Event-driven, non-blocking I/O
- **Ecosystem**: Rich npm ecosystem
- **Developer Experience**: JavaScript/TypeScript familiarity
- **Scalability**: Horizontal scaling, microservices-friendly
- **Real-time**: WebSocket support, event-driven architecture

### Why TypeScript?

- **Type Safety**: Catch errors at compile time
- **Developer Experience**: Better IDE support, autocomplete
- **Maintainability**: Self-documenting code
- **Refactoring**: Safer refactoring with type checking

### Why PostgreSQL?

- **ACID Compliance**: Critical for transactions
- **Reliability**: Battle-tested, mature
- **Features**: Rich feature set, JSON support
- **Performance**: Excellent for complex queries
- **Community**: Strong community support

### Why MongoDB?

- **Flexibility**: Schema-less for player data
- **Scalability**: Easy horizontal scaling
- **Performance**: Fast for document queries
- **Developer Experience**: JSON-like documents

### Why Redis?

- **Performance**: In-memory, sub-millisecond latency
- **Data Structures**: Rich data types
- **Pub/Sub**: Built-in messaging
- **Persistence**: Optional data persistence

### Why RabbitMQ?

- **Reliability**: Message durability, acknowledgments
- **Flexibility**: Multiple exchange types
- **Features**: Dead letter queues, priority queues
- **Performance**: High throughput

## Design Patterns

### Repository Pattern

Abstraction layer between business logic and data access:

```typescript
interface IPlayerRepository {
  findById(titleId: string, playerId: string): Promise<Player>;
  update(player: Player): Promise<Player>;
  delete(titleId: string, playerId: string): Promise<void>;
}

class MongoPlayerRepository implements IPlayerRepository {
  // Implementation
}
```

### Service Layer Pattern

Business logic separated from controllers:

```typescript
class PlayerService {
  constructor(
    private playerRepo: IPlayerRepository,
    private cacheService: ICacheService
  ) {}

  async getPlayerData(titleId: string, playerId: string): Promise<PlayerData> {
    // Business logic
  }
}
```

### Factory Pattern

Creating service instances:

```typescript
class ServiceFactory {
  static createPlayerService(): PlayerService {
    const repo = new MongoPlayerRepository();
    const cache = new RedisCache();
    return new PlayerService(repo, cache);
  }
}
```

### Middleware Pattern

Request processing pipeline:

```typescript
app.use(authMiddleware);
app.use(rateLimitMiddleware);
app.use(validateRequestMiddleware);
app.use(errorHandlerMiddleware);
```

### Circuit Breaker Pattern

Fault tolerance for service calls:

```typescript
const breaker = new CircuitBreaker(async () => {
  return await externalService.call();
}, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

## Future Considerations

### Service Mesh

Consider implementing Istio or Linkerd for:
- Advanced traffic management
- Service-to-service authentication
- Observability
- Policy enforcement

### Event Sourcing

For audit trail and data recovery:
- Store all state changes as events
- Rebuild state from event log
- Time travel debugging

### CQRS (Command Query Responsibility Segregation)

Separate read and write models:
- Optimized read models
- Better scalability
- Event sourcing integration

### Multi-Region Deployment

For global scale:
- Regional databases
- Data replication strategies
- Geo-routing

## Conclusion

NullStack's architecture is designed to be scalable, reliable, and maintainable. The microservices approach allows independent scaling and deployment, while the event-driven design enables loose coupling and asynchronous processing. The technology stack is chosen for performance, developer experience, and ecosystem maturity.

For questions about the architecture, please open an issue or discussion on GitHub.
