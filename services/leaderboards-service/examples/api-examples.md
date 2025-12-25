# Leaderboards Service API Examples

This document provides comprehensive examples of using the Leaderboards Service API.

## Setup

First, ensure you have:
1. A developer account with a valid JWT token
2. A title created with a secret key
3. The service running on `http://localhost:3008`

## Example 1: Creating a High Score Leaderboard

### Create the Leaderboard

```bash
curl -X POST http://localhost:3008/api/v1/leaderboards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "leaderboardName": "global_highscore",
    "displayName": "Global High Scores",
    "statisticName": "score",
    "sortOrder": "descending",
    "resetFrequency": "never",
    "maxEntries": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "leaderboardName": "global_highscore",
    "displayName": "Global High Scores",
    "statisticName": "score",
    "sortOrder": "descending",
    "resetFrequency": "never",
    "maxEntries": 100,
    "lastResetAt": "2025-01-15T10:00:00.000Z",
    "nextResetAt": null,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

### Update Player Scores

```bash
# Player 1 scores 1000 points
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "player_001",
    "statisticName": "score",
    "value": 1000,
    "updateType": "set"
  }'

# Player 2 scores 1500 points
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "player_002",
    "statisticName": "score",
    "value": 1500,
    "updateType": "set"
  }'

# Player 1 gets 200 more points
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "player_001",
    "statisticName": "score",
    "value": 200,
    "updateType": "increment"
  }'
```

### Get Leaderboard Entries

```bash
curl -X GET "http://localhost:3008/api/v1/leaderboards/a1b2c3d4-e5f6-7890-1234-567890abcdef/entries?limit=10&offset=0" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboardId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "leaderboardName": "global_highscore",
    "entries": [
      {
        "playerId": "player_002",
        "value": 1500,
        "rank": 1
      },
      {
        "playerId": "player_001",
        "value": 1200,
        "rank": 2
      }
    ]
  }
}
```

### Get Player Position

```bash
curl -X GET "http://localhost:3008/api/v1/leaderboards/a1b2c3d4-e5f6-7890-1234-567890abcdef/player/player_001" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboardId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "leaderboardName": "global_highscore",
    "playerId": "player_001",
    "value": 1200,
    "rank": 2
  }
}
```

## Example 2: Weekly Race Time Leaderboard

### Create Racing Leaderboard

```bash
curl -X POST http://localhost:3008/api/v1/leaderboards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "leaderboardName": "weekly_race",
    "displayName": "Weekly Best Times",
    "statisticName": "race_time_ms",
    "sortOrder": "ascending",
    "resetFrequency": "weekly",
    "maxEntries": 500
  }'
```

### Update Race Times (Lower is Better)

```bash
# Player 1 completes race in 65.5 seconds
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "racer_001",
    "statisticName": "race_time_ms",
    "value": 65500,
    "updateType": "min"
  }'

# Player 1 beats their time with 62.3 seconds
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "racer_001",
    "statisticName": "race_time_ms",
    "value": 62300,
    "updateType": "min"
  }'
```

## Example 3: Daily PvP Leaderboard

### Create Daily PvP Leaderboard

```bash
curl -X POST http://localhost:3008/api/v1/leaderboards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "leaderboardName": "daily_kills",
    "displayName": "Daily Top Killers",
    "statisticName": "kills",
    "sortOrder": "descending",
    "resetFrequency": "daily",
    "maxEntries": 1000
  }'
```

### Track Kills

```bash
# Player gets 5 kills
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "pvp_warrior",
    "statisticName": "kills",
    "value": 5,
    "updateType": "increment"
  }'

# Player gets 3 more kills
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "pvp_warrior",
    "statisticName": "kills",
    "value": 3,
    "updateType": "increment"
  }'
```

## Example 4: List All Leaderboards

```bash
curl -X GET http://localhost:3008/api/v1/leaderboards \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "leaderboardName": "global_highscore",
      "displayName": "Global High Scores",
      "statisticName": "score",
      "sortOrder": "descending",
      "resetFrequency": "never",
      "maxEntries": 100,
      "lastResetAt": "2025-01-15T10:00:00.000Z",
      "nextResetAt": null,
      "createdAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": "b2c3d4e5-f6g7-8901-2345-678901bcdefg",
      "leaderboardName": "weekly_race",
      "displayName": "Weekly Best Times",
      "statisticName": "race_time_ms",
      "sortOrder": "ascending",
      "resetFrequency": "weekly",
      "maxEntries": 500,
      "lastResetAt": "2025-01-13T00:00:00.000Z",
      "nextResetAt": "2025-01-20T00:00:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

## Example 5: Get All Player Statistics

```bash
curl -X GET http://localhost:3008/api/v1/statistics/player/player_001 \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "player_001",
    "statistics": [
      {
        "statisticName": "kills",
        "value": 127,
        "updatedAt": "2025-01-15T15:30:00.000Z"
      },
      {
        "statisticName": "race_time_ms",
        "value": 62300,
        "updatedAt": "2025-01-15T14:20:00.000Z"
      },
      {
        "statisticName": "score",
        "value": 1200,
        "updatedAt": "2025-01-15T12:00:00.000Z"
      }
    ]
  }
}
```

## Example 6: Manual Leaderboard Reset

```bash
curl -X POST http://localhost:3008/api/v1/leaderboards/a1b2c3d4-e5f6-7890-1234-567890abcdef/reset \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboardId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "resetAt": "2025-01-15T16:00:00.000Z",
    "nextResetAt": "2025-01-22T00:00:00.000Z"
  }
}
```

## Example 7: Pagination

### Get Top 10

```bash
curl -X GET "http://localhost:3008/api/v1/leaderboards/a1b2c3d4-e5f6-7890-1234-567890abcdef/entries?limit=10&offset=0" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

### Get Ranks 11-20

```bash
curl -X GET "http://localhost:3008/api/v1/leaderboards/a1b2c3d4-e5f6-7890-1234-567890abcdef/entries?limit=10&offset=10" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

### Get Ranks 101-200

```bash
curl -X GET "http://localhost:3008/api/v1/leaderboards/a1b2c3d4-e5f6-7890-1234-567890abcdef/entries?limit=100&offset=100" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

## Update Type Examples

### Set (Replace Value)
```bash
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "player_001",
    "statisticName": "level",
    "value": 50,
    "updateType": "set"
  }'
```

### Increment (Add to Current)
```bash
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "player_001",
    "statisticName": "total_kills",
    "value": 5,
    "updateType": "increment"
  }'
```

### Max (Keep Higher Value)
```bash
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "player_001",
    "statisticName": "highest_combo",
    "value": 25,
    "updateType": "max"
  }'
```

### Min (Keep Lower Value)
```bash
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "playerId": "player_001",
    "statisticName": "best_time",
    "value": 45200,
    "updateType": "min"
  }'
```

## Common Patterns

### Game Session Completion

When a player finishes a game session, update multiple statistics:

```bash
# Update score
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{"playerId": "player_001", "statisticName": "score", "value": 1000, "updateType": "increment"}'

# Update kills
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{"playerId": "player_001", "statisticName": "kills", "value": 15, "updateType": "increment"}'

# Update best time if applicable
curl -X POST http://localhost:3008/api/v1/statistics/update \
  -H "Content-Type: application/json" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{"playerId": "player_001", "statisticName": "best_time", "value": 62300, "updateType": "min"}'
```

### Check Player's Position

After updating stats, check where the player ranks:

```bash
curl -X GET "http://localhost:3008/api/v1/leaderboards/LEADERBOARD_ID/player/player_001" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

### Show Top Players Around User

Get top 10, then get player position to show both:

```bash
# Get top 10
curl -X GET "http://localhost:3008/api/v1/leaderboards/LEADERBOARD_ID/entries?limit=10&offset=0" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"

# Get player's rank
curl -X GET "http://localhost:3008/api/v1/leaderboards/LEADERBOARD_ID/player/player_001" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

## Error Handling

### Invalid Leaderboard Name

```bash
curl -X POST http://localhost:3008/api/v1/leaderboards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY" \
  -d '{
    "leaderboardName": "invalid name!",
    "displayName": "Test",
    "statisticName": "score"
  }'
```

**Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "code": "invalid_string",
        "message": "Invalid",
        "path": ["leaderboardName"]
      }
    ]
  }
}
```

### Leaderboard Not Found

```bash
curl -X GET "http://localhost:3008/api/v1/leaderboards/invalid-id/entries" \
  -H "X-Title-Key: YOUR_TITLE_SECRET_KEY"
```

**Response (404):**
```json
{
  "success": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Leaderboard not found"
  }
}
```

### Unauthorized Access

```bash
curl -X POST http://localhost:3008/api/v1/leaderboards \
  -H "Content-Type: application/json" \
  -d '{"leaderboardName": "test", "displayName": "Test", "statisticName": "score"}'
```

**Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No token provided"
  }
}
```
