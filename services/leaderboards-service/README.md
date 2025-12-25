# Leaderboards Service

The Leaderboards Service manages competitive leaderboards and player statistics for NullStack. It provides real-time leaderboard rankings with Redis caching and automatic periodic resets.

## Features

- **Leaderboard Management**: Create and configure leaderboards with custom sorting and reset schedules
- **Player Statistics**: Track and update player statistics that feed into leaderboards
- **Redis Caching**: Fast leaderboard queries with Redis sorted sets
- **Automatic Resets**: Background worker handles scheduled leaderboard resets (hourly, daily, weekly, monthly)
- **Flexible Updates**: Support for set, increment, max, and min update operations
- **Pagination Support**: Efficient pagination for large leaderboards
- **Player Rankings**: Quick lookup of individual player positions and scores

## Architecture

### Data Storage

- **PostgreSQL**: Stores leaderboard configurations and player statistics
- **Redis**: Caches leaderboard entries using sorted sets for O(log N) operations
- **MongoDB**: Used for session management (via shared database package)

### Components

1. **Main Service** (`src/index.ts`): REST API server
2. **Background Worker** (`src/worker.ts`): Handles scheduled leaderboard resets
3. **Routes**:
   - `leaderboards.ts`: Leaderboard CRUD and queries
   - `statistics.ts`: Player statistics updates

## API Endpoints

### Leaderboards

#### Create Leaderboard (Developer Only)
```
POST /api/v1/leaderboards
Headers:
  Authorization: Bearer {developer_token}
  X-Title-Key: {title_secret_key}
Body:
{
  "leaderboardName": "global_score",
  "displayName": "Global High Scores",
  "statisticName": "score",
  "sortOrder": "descending",
  "resetFrequency": "weekly",
  "maxEntries": 1000
}
```

**Sort Orders:**
- `ascending`: Lower values rank higher (e.g., race times)
- `descending`: Higher values rank higher (e.g., high scores)

**Reset Frequencies:**
- `never`: Leaderboard never resets
- `hourly`: Resets every hour at :00
- `daily`: Resets daily at midnight
- `weekly`: Resets every Monday at midnight
- `monthly`: Resets on the 1st of each month at midnight

#### List Leaderboards
```
GET /api/v1/leaderboards
Headers:
  X-Title-Key: {title_secret_key}
```

#### Get Leaderboard Entries
```
GET /api/v1/leaderboards/{id}/entries?limit=100&offset=0
Headers:
  X-Title-Key: {title_secret_key}
```

**Query Parameters:**
- `limit`: Number of entries to return (default: 100, max: 1000)
- `offset`: Number of entries to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboardId": "uuid",
    "leaderboardName": "global_score",
    "entries": [
      {
        "playerId": "player123",
        "value": 9999,
        "rank": 1
      },
      ...
    ]
  }
}
```

#### Get Player Position
```
GET /api/v1/leaderboards/{id}/player/{playerId}
Headers:
  X-Title-Key: {title_secret_key}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboardId": "uuid",
    "leaderboardName": "global_score",
    "playerId": "player123",
    "value": 9999,
    "rank": 1
  }
}
```

#### Reset Leaderboard (Developer Only)
```
POST /api/v1/leaderboards/{id}/reset
Headers:
  Authorization: Bearer {developer_token}
  X-Title-Key: {title_secret_key}
```

### Statistics

#### Update Player Statistic
```
POST /api/v1/statistics/update
Headers:
  X-Title-Key: {title_secret_key}
Body:
{
  "playerId": "player123",
  "statisticName": "score",
  "value": 100,
  "updateType": "increment"
}
```

**Update Types:**
- `set`: Set the statistic to the exact value
- `increment`: Add the value to the current statistic
- `max`: Set to the maximum of current and new value
- `min`: Set to the minimum of current and new value

**Note:** This endpoint automatically updates all leaderboards that use the specified statistic.

#### Get Player Statistics
```
GET /api/v1/statistics/player/{playerId}
Headers:
  X-Title-Key: {title_secret_key}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "player123",
    "statistics": [
      {
        "statisticName": "score",
        "value": 9999,
        "updatedAt": "2025-01-15T10:30:00Z"
      },
      ...
    ]
  }
}
```

## Database Schema

### Leaderboards Table
```sql
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY,
  title_id UUID NOT NULL,
  leaderboard_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  statistic_name VARCHAR(100) NOT NULL,
  sort_order VARCHAR(20) NOT NULL,
  reset_frequency VARCHAR(20) NOT NULL,
  max_entries INTEGER NOT NULL DEFAULT 100,
  last_reset_at TIMESTAMP NOT NULL,
  next_reset_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(title_id, leaderboard_name)
);
```

### Player Statistics Table
```sql
CREATE TABLE player_statistics (
  id SERIAL PRIMARY KEY,
  title_id UUID NOT NULL,
  player_id VARCHAR(255) NOT NULL,
  statistic_name VARCHAR(100) NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(title_id, player_id, statistic_name)
);
```

## Redis Data Structure

Leaderboards are stored in Redis as sorted sets:

```
Key: leaderboard:{leaderboard_id}:scores
Type: Sorted Set
Members: player IDs
Scores: statistic values
```

**Cache Keys:**
- `leaderboard:{id}:entries:{offset}:{limit}` - Cached leaderboard entries (TTL: 60s)
- `leaderboard:{id}:player:{playerId}` - Cached player position (TTL: 30s)
- `statistics:{titleId}:{playerId}` - Cached player statistics (TTL: 5min)

## Environment Variables

```env
PORT=3008
JWT_SECRET=your-jwt-secret
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=nullstack
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
MONGO_URI=mongodb://localhost:27017/nullstack
```

## Running the Service

### Development
```bash
npm run dev          # Start API server
npm run worker       # Start background worker (in separate terminal)
```

### Production
```bash
npm run build
npm start            # Start API server
npm run worker       # Start background worker (in separate terminal)
```

### Docker
```bash
docker build -t leaderboards-service .
docker run -p 3008:3008 leaderboards-service
```

## Background Worker

The background worker (`worker.ts`) runs every minute and:
1. Queries for leaderboards where `next_reset_at <= NOW()`
2. Clears Redis sorted sets for those leaderboards
3. Invalidates all related caches
4. Updates `last_reset_at` and calculates new `next_reset_at`

**Running the Worker:**
```bash
npm run worker
```

Or in Docker, run a separate container with `CMD ["npm", "run", "worker"]`

## Performance Considerations

### Redis Sorted Sets
- **Add/Update**: O(log N)
- **Get Rank**: O(log N)
- **Get Range**: O(log N + M) where M is the number of returned elements
- **Remove**: O(log N)

### Caching Strategy
1. Leaderboard entries cached for 60 seconds
2. Player positions cached for 30 seconds
3. Player statistics cached for 5 minutes
4. Cache invalidated on statistic updates and resets

### Scaling
- Multiple API server instances can run in parallel
- Only one worker instance should run per environment
- Redis handles concurrent updates to sorted sets atomically

## Common Use Cases

### High Score Leaderboard
```json
{
  "leaderboardName": "high_scores",
  "displayName": "All-Time High Scores",
  "statisticName": "score",
  "sortOrder": "descending",
  "resetFrequency": "never",
  "maxEntries": 100
}
```

### Weekly Race Times
```json
{
  "leaderboardName": "weekly_race",
  "displayName": "Weekly Best Times",
  "statisticName": "race_time",
  "sortOrder": "ascending",
  "resetFrequency": "weekly",
  "maxEntries": 500
}
```

### Daily Kill Count
```json
{
  "leaderboardName": "daily_kills",
  "displayName": "Daily Top Killers",
  "statisticName": "kills",
  "sortOrder": "descending",
  "resetFrequency": "daily",
  "maxEntries": 1000
}
```

## Error Codes

- `UNAUTHORIZED`: Missing or invalid authentication
- `INVALID_TITLE_KEY`: Invalid title key
- `VALIDATION_ERROR`: Request validation failed
- `ITEM_NOT_FOUND`: Leaderboard or statistic not found
- `CONFLICT`: Leaderboard name already exists
- `INTERNAL_ERROR`: Server error

## Testing

```bash
npm test
```

## Health Check

```
GET /health
```

Returns health status of PostgreSQL, Redis, and MongoDB connections.
