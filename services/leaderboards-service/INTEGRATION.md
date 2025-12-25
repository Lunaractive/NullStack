# Leaderboards Service Integration Guide

This guide explains how to integrate the Leaderboards Service into your NullStack deployment.

## Docker Compose Integration

Add the following services to your `docker-compose.yml`:

```yaml
services:
  # ... other services ...

  leaderboards-service:
    build:
      context: .
      dockerfile: services/leaderboards-service/Dockerfile
    ports:
      - "3008:3008"
    environment:
      - PORT=3008
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=nullstack
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - MONGO_URI=mongodb://mongodb:27017/nullstack
    depends_on:
      - postgres
      - redis
      - mongodb
    networks:
      - nullstack-network
    restart: unless-stopped

  leaderboards-worker:
    build:
      context: .
      dockerfile: services/leaderboards-service/Dockerfile
    command: ["npm", "run", "worker"]
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=nullstack
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - MONGO_URI=mongodb://mongodb:27017/nullstack
    depends_on:
      - postgres
      - redis
      - mongodb
      - leaderboards-service
    networks:
      - nullstack-network
    restart: unless-stopped
```

## API Gateway Integration

Add leaderboards routes to your API Gateway (`services/api-gateway/src/index.ts`):

```typescript
import { createProxyMiddleware } from 'http-proxy-middleware';

// Leaderboards Service Proxy
app.use(
  '/api/v1/leaderboards',
  createProxyMiddleware({
    target: 'http://leaderboards-service:3008',
    changeOrigin: true,
    pathRewrite: {
      '^/api/v1/leaderboards': '/api/v1/leaderboards',
    },
  })
);

app.use(
  '/api/v1/statistics',
  createProxyMiddleware({
    target: 'http://leaderboards-service:3008',
    changeOrigin: true,
    pathRewrite: {
      '^/api/v1/statistics': '/api/v1/statistics',
    },
  })
);
```

## Database Migration

Run the migration script to create the necessary tables:

```bash
psql -h localhost -U postgres -d nullstack -f services/leaderboards-service/migrations/001_create_leaderboards_tables.sql
```

Or using Docker:

```bash
docker-compose exec postgres psql -U postgres -d nullstack -f /app/services/leaderboards-service/migrations/001_create_leaderboards_tables.sql
```

## Environment Variables

Add to your `.env` file:

```env
# Leaderboards Service (uses existing DB credentials)
# No additional environment variables needed - uses shared config
```

## Health Check Endpoint

The service provides a health check at:

```
GET http://localhost:3008/health
```

Add to your monitoring/health check system.

## Service Dependencies

### Required Services
- **PostgreSQL**: Stores leaderboard configurations and player statistics
- **Redis**: Caches leaderboard rankings and player positions
- **MongoDB**: Used by shared database package for session management

### Required Packages
- `@nullstack/shared`: Shared error codes and utilities
- `@nullstack/database`: Database connection managers

## Testing the Integration

### 1. Start all services

```bash
docker-compose up -d
```

### 2. Check service health

```bash
curl http://localhost:3008/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "leaderboards-service",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "databases": {
    "postgres": "healthy",
    "redis": "healthy",
    "mongodb": "healthy"
  }
}
```

### 3. Create a test leaderboard

```bash
curl -X POST http://localhost:3008/api/v1/leaderboards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "leaderboardName": "test_leaderboard",
    "displayName": "Test Leaderboard",
    "statisticName": "test_score",
    "sortOrder": "descending",
    "resetFrequency": "never",
    "maxEntries": 100
  }'
```

### 4. Update a player statistic

```bash
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "test_player",
    "statisticName": "test_score",
    "value": 1000,
    "updateType": "set"
  }'
```

### 5. Verify leaderboard entry

```bash
curl -X GET "http://localhost:3008/api/v1/leaderboards/LEADERBOARD_ID/entries?limit=10" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

## Monitoring

### Key Metrics to Monitor

1. **API Response Times**
   - `/api/v1/leaderboards/:id/entries` - Should be < 50ms (cached)
   - `/api/v1/leaderboards/:id/player/:playerId` - Should be < 30ms (cached)
   - `/api/v1/statistics/update` - Should be < 100ms

2. **Redis Performance**
   - Sorted set operations (ZADD, ZRANGE, ZRANK)
   - Cache hit rate
   - Memory usage

3. **PostgreSQL Performance**
   - Query performance on player_statistics table
   - Index usage
   - Connection pool utilization

4. **Worker Health**
   - Leaderboard reset job execution
   - Error rate in reset operations
   - Job completion time

### Logging

The service logs to stdout/stderr. Key log events:

- Service startup
- Database connections
- Leaderboard resets
- API errors
- Worker job execution

### Redis Keys to Monitor

```bash
# Check leaderboard sizes
redis-cli ZCARD leaderboard:LEADERBOARD_ID:scores

# Check cache keys
redis-cli KEYS "leaderboard:*"
redis-cli KEYS "statistics:*"

# Monitor Redis memory
redis-cli INFO memory
```

## Scaling Considerations

### Horizontal Scaling

The API service can be scaled horizontally:

```yaml
leaderboards-service:
  # ... config ...
  deploy:
    replicas: 3
```

**Important**: Only run ONE worker instance to avoid duplicate reset operations.

### Redis Scaling

For high-traffic deployments:
- Use Redis Cluster for distributed sorted sets
- Configure Redis persistence (RDB + AOF)
- Set appropriate maxmemory policies

### Database Scaling

- Add read replicas for PostgreSQL
- Use connection pooling
- Index optimization on high-query columns

## Backup and Recovery

### PostgreSQL Backup

```bash
# Backup leaderboards and statistics
pg_dump -h localhost -U postgres -d nullstack \
  -t leaderboards -t player_statistics \
  > leaderboards_backup.sql
```

### Redis Backup

Redis sorted sets should be considered cache. The source of truth is in PostgreSQL player_statistics table.

To rebuild Redis from PostgreSQL:
1. Clear all leaderboard keys: `redis-cli KEYS "leaderboard:*" | xargs redis-cli DEL`
2. Trigger statistic updates for active players

### Recovery Procedure

1. Restore PostgreSQL tables from backup
2. Clear Redis cache
3. Restart leaderboards service
4. Statistics will repopulate leaderboards on next update

## Troubleshooting

### Leaderboard entries not updating

1. Check Redis connection: `docker-compose logs redis`
2. Verify statistic updates: Query `player_statistics` table
3. Check worker logs: `docker-compose logs leaderboards-worker`

### Worker not resetting leaderboards

1. Ensure only one worker instance is running
2. Check worker logs for errors
3. Verify `next_reset_at` values in database
4. Manually trigger reset via API endpoint

### High Redis memory usage

1. Check number of leaderboards and entries
2. Review cache TTL settings
3. Consider increasing `maxEntries` limits
4. Implement cache eviction policies

### Slow leaderboard queries

1. Check Redis performance: `redis-cli --latency`
2. Review sorted set sizes
3. Consider pagination limits
4. Check network latency between services

## Security Considerations

1. **Developer Endpoints**: Create/reset leaderboards require developer authentication
2. **Title Key Validation**: All endpoints validate title key
3. **Input Validation**: All inputs validated with Zod schemas
4. **Rate Limiting**: Consider adding rate limiting for statistics updates
5. **Sorted Set Limits**: `maxEntries` prevents unbounded growth

## Performance Tuning

### Redis Configuration

```redis
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### PostgreSQL Indexes

The migration includes optimal indexes. For high-volume deployments, consider:

```sql
CREATE INDEX CONCURRENTLY idx_player_statistics_updated
ON player_statistics(updated_at DESC);
```

### Node.js Configuration

```dockerfile
# In Dockerfile
ENV NODE_OPTIONS="--max-old-space-size=2048"
```

## API Rate Limiting

Consider adding rate limiting to statistics updates:

```typescript
import rateLimit from 'express-rate-limit';

const statisticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many statistics updates',
});

app.use('/api/v1/statistics/update', statisticsLimiter);
```

## Future Enhancements

Potential improvements:
- WebSocket support for real-time leaderboard updates
- Leaderboard archival for historical data
- Advanced filtering (by region, level, etc.)
- Leaderboard seasons and tournaments
- Player vs player rank comparisons
- Percentile rankings
