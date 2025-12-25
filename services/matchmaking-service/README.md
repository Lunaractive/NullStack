# Matchmaking Service

The matchmaking service handles player matchmaking, queue management, and match creation for NullStack.

## Features

- **Player Matchmaking**: Create tickets, join queues, and get matched with other players
- **Queue Management**: Create and configure matchmaking queues with custom rules
- **Smart Matching**: Skill-based, attribute-based, and latency-based matchmaking
- **Team Formation**: Automatic team assignment based on queue configuration
- **Server Allocation**: Intelligent server selection based on region and load
- **Real-time Updates**: Redis pub/sub for instant match notifications

## Architecture

### Data Storage

- **Redis**: Fast ticket matching and real-time queue management
- **MongoDB**: Match history and ticket persistence
- **PostgreSQL**: Queue configuration persistence

### Background Matcher

The service runs a background process that continuously:
1. Polls waiting tickets from Redis queues
2. Matches players based on queue rules
3. Creates matches and allocates servers
4. Notifies players via Redis pub/sub

## API Endpoints

### Matchmaking Endpoints (Player)

#### Create Matchmaking Ticket
```http
POST /api/v1/matchmaking/ticket
Authorization: Bearer <player_token>
Content-Type: application/json

{
  "queueName": "ranked-1v1",
  "attributes": {
    "skillRating": 1500,
    "region": "us-east"
  },
  "giveUpAfterSeconds": 300
}
```

#### Get Ticket Status
```http
GET /api/v1/matchmaking/ticket/:ticketId
Authorization: Bearer <player_token>
```

#### Cancel Ticket
```http
DELETE /api/v1/matchmaking/ticket/:ticketId
Authorization: Bearer <player_token>
```

#### Get Match Details
```http
GET /api/v1/matchmaking/match/:matchId
Authorization: Bearer <player_token>
```

### Queue Management Endpoints (Developer)

#### Create Queue
```http
POST /api/v1/matchmaking/queues
Authorization: Bearer <developer_token>
Content-Type: application/json

{
  "queueName": "ranked-1v1",
  "displayName": "Ranked 1v1",
  "minPlayers": 2,
  "maxPlayers": 2,
  "matchingRules": {
    "skillMatchingEnabled": true,
    "skillRange": 200
  },
  "serverAllocationStrategy": "closest",
  "timeoutSeconds": 300
}
```

#### List Queues
```http
GET /api/v1/matchmaking/queues
X-Title-Key: <title_key>
```

#### Update Queue
```http
PUT /api/v1/matchmaking/queues/:queueName
Authorization: Bearer <developer_token>
Content-Type: application/json

{
  "skillRange": 300,
  "enabled": true
}
```

#### Delete Queue
```http
DELETE /api/v1/matchmaking/queues/:queueName
Authorization: Bearer <developer_token>
```

## Queue Configuration

### Basic Settings

- `queueName`: Unique identifier for the queue (alphanumeric, hyphens, underscores)
- `displayName`: Human-readable name
- `minPlayers`: Minimum players required for a match
- `maxPlayers`: Maximum players allowed in a match
- `timeoutSeconds`: How long tickets wait before expiring (10-600 seconds)

### Team Configuration

```json
{
  "teamConfiguration": {
    "teams": [
      {
        "teamId": "team1",
        "minPlayers": 1,
        "maxPlayers": 5
      },
      {
        "teamId": "team2",
        "minPlayers": 1,
        "maxPlayers": 5
      }
    ]
  }
}
```

### Matching Rules

#### Skill-Based Matching
```json
{
  "matchingRules": {
    "skillMatchingEnabled": true,
    "skillRange": 200
  }
}
```

Players must have `skillRating` attribute. Players within `skillRange` of each other will be matched.

#### Latency-Based Matching
```json
{
  "matchingRules": {
    "latencyMatchingEnabled": true,
    "maxLatencyMs": 100
  }
}
```

#### Custom Attribute Matching
```json
{
  "matchingRules": {
    "customAttributeMatching": [
      {
        "attributeName": "gameMode",
        "matchType": "exact"
      },
      {
        "attributeName": "skillLevel",
        "matchType": "difference",
        "maxDifference": 5
      }
    ]
  }
}
```

Match types:
- `exact`: Players must have identical values
- `range`: Players within a specified range
- `difference`: Maximum difference between values

### Server Allocation Strategy

- `closest`: Select server closest to players
- `balanced`: Select least loaded server
- `custom`: Custom allocation logic

## Matchmaking Flow

1. **Player creates ticket**: POST to `/api/v1/matchmaking/ticket`
2. **Ticket added to queue**: Stored in Redis sorted set by creation time
3. **Background matcher processes queue**: Runs every 1 second
4. **Players matched**: Based on queue rules and attributes
5. **Match created**: Server allocated, match record created
6. **Players notified**: Via Redis pub/sub
7. **Player retrieves match**: GET `/api/v1/matchmaking/match/:matchId`

## Real-time Notifications

Subscribe to Redis channels for real-time updates:

### Match Created
```
Channel: matchmaking:{titleId}
Message: {
  "type": "match.created",
  "titleId": "...",
  "matchId": "...",
  "players": [...],
  "timestamp": "..."
}
```

### Player Notifications
```
Channel: player:{playerId}:notifications
Messages:
- { "type": "match_found", "matchId": "...", "teamId": "..." }
- { "type": "ticket_expired", "ticketId": "..." }
```

## Environment Variables

```env
PORT=3004
JWT_SECRET=your-jwt-secret

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=nullstack
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/nullstack

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Start production
npm start
```

## Docker

```bash
# Build image
docker build -t matchmaking-service .

# Run container
docker run -p 3004:3004 \
  -e POSTGRES_HOST=postgres \
  -e MONGODB_URI=mongodb://mongo:27017/nullstack \
  -e REDIS_HOST=redis \
  matchmaking-service
```

## Health Check

```http
GET /health

Response:
{
  "status": "healthy",
  "service": "matchmaking-service",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "dependencies": {
    "postgres": "healthy",
    "redis": "healthy",
    "mongodb": "healthy"
  }
}
```

## Example Use Cases

### Ranked 1v1
```json
{
  "queueName": "ranked-1v1",
  "displayName": "Ranked 1v1",
  "minPlayers": 2,
  "maxPlayers": 2,
  "matchingRules": {
    "skillMatchingEnabled": true,
    "skillRange": 200
  }
}
```

### Casual 5v5
```json
{
  "queueName": "casual-5v5",
  "displayName": "Casual 5v5",
  "minPlayers": 10,
  "maxPlayers": 10,
  "teamConfiguration": {
    "teams": [
      { "teamId": "team1", "minPlayers": 5, "maxPlayers": 5 },
      { "teamId": "team2", "minPlayers": 5, "maxPlayers": 5 }
    ]
  }
}
```

### Regional Battle Royale
```json
{
  "queueName": "br-100",
  "displayName": "Battle Royale",
  "minPlayers": 50,
  "maxPlayers": 100,
  "matchingRules": {
    "customAttributeMatching": [
      {
        "attributeName": "region",
        "matchType": "exact"
      }
    ]
  },
  "serverAllocationStrategy": "closest"
}
```
