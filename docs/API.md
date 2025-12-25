# API Reference

This document provides a comprehensive reference for the NullStack API.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [API Gateway](#api-gateway)
- [Auth Service](#auth-service)
- [Title Service](#title-service)
- [Player Service](#player-service)
- [Economy Service](#economy-service)
- [Analytics Service](#analytics-service)
- [CloudScript Service](#cloudscript-service)
- [Matchmaking Service](#matchmaking-service)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [WebSocket API](#websocket-api)

## Overview

### Base URLs

- **Development**: `http://localhost:3000`
- **Staging**: `https://api-staging.yourdomain.com`
- **Production**: `https://api.yourdomain.com`

### API Versioning

All API endpoints are versioned using URL path versioning:
```
/api/v1/resource
```

### Content Type

All requests and responses use JSON:
```
Content-Type: application/json
```

### Response Format

All responses follow this standard format:

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Authentication

NullStack uses JWT (JSON Web Tokens) for authentication with two token types:
- **Access Token**: Short-lived token for API requests (default: 1 hour)
- **Refresh Token**: Long-lived token for obtaining new access tokens (default: 7 days)

### Authentication Headers

Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Token Types

#### Developer Tokens
Used for administrative operations and Developer Portal access.

#### Player Tokens
Used for player-specific operations within a game title.

## API Gateway

**Base Path**: `/`

### Health Check

#### Get Health Status

```http
GET /health
```

**Response**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "uptime": 3600,
    "services": {
      "auth": "healthy",
      "player": "healthy",
      "economy": "healthy"
    }
  }
}
```

### API Documentation

#### Get Swagger Documentation

```http
GET /api-docs
```

Returns interactive Swagger UI documentation.

## Auth Service

**Base Path**: `/api/auth`

### Developer Authentication

#### Register Developer

```http
POST /api/auth/developer/register
```

**Request Body**
```json
{
  "email": "developer@example.com",
  "password": "SecurePassword123!",
  "name": "Developer Name",
  "company": "Company Name"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "developer": {
      "id": "dev_123",
      "email": "developer@example.com",
      "name": "Developer Name",
      "company": "Company Name"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 3600
    }
  }
}
```

#### Login Developer

```http
POST /api/auth/developer/login
```

**Request Body**
```json
{
  "email": "developer@example.com",
  "password": "SecurePassword123!"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "developer": {
      "id": "dev_123",
      "email": "developer@example.com"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 3600
    }
  }
}
```

### Player Authentication

#### Authenticate Player

```http
POST /api/auth/player/authenticate
```

**Headers**
```
X-Title-ID: title_123
X-Title-Secret: secret_key
```

**Request Body**
```json
{
  "playerId": "player_456",
  "customId": "custom_player_id"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "player": {
      "id": "player_456",
      "titleId": "title_123",
      "customId": "custom_player_id"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 3600
    },
    "isNewPlayer": false
  }
}
```

### Token Management

#### Refresh Access Token

```http
POST /api/auth/refresh
```

**Request Body**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

#### Revoke Token

```http
POST /api/auth/revoke
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response**
```json
{
  "success": true,
  "data": {
    "message": "Token revoked successfully"
  }
}
```

## Title Service

**Base Path**: `/api/title`

**Authentication**: Developer token required

### Title Management

#### Create Title

```http
POST /api/title/titles
```

**Request Body**
```json
{
  "name": "My Awesome Game",
  "description": "An amazing game",
  "platform": ["PC", "Mobile"],
  "settings": {
    "maxPlayersPerAccount": 5,
    "enableCrossPlay": true
  }
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "title": {
      "id": "title_123",
      "name": "My Awesome Game",
      "developerId": "dev_123",
      "secretKey": "sk_live_abc123...",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

#### Get Title Details

```http
GET /api/title/titles/:titleId
```

**Response**
```json
{
  "success": true,
  "data": {
    "title": {
      "id": "title_123",
      "name": "My Awesome Game",
      "description": "An amazing game",
      "platform": ["PC", "Mobile"],
      "settings": { ... },
      "statistics": {
        "totalPlayers": 1000,
        "activeToday": 250
      }
    }
  }
}
```

#### List Titles

```http
GET /api/title/titles
```

**Query Parameters**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response**
```json
{
  "success": true,
  "data": {
    "titles": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

#### Update Title

```http
PATCH /api/title/titles/:titleId
```

**Request Body**
```json
{
  "name": "Updated Game Name",
  "settings": {
    "maxPlayersPerAccount": 10
  }
}
```

#### Delete Title

```http
DELETE /api/title/titles/:titleId
```

## Player Service

**Base Path**: `/api/player`

**Authentication**: Player token required

### Player Data

#### Get Player Data

```http
GET /api/player/data
```

**Query Parameters**
- `keys` (string[]): Specific keys to retrieve (optional)

**Response**
```json
{
  "success": true,
  "data": {
    "playerId": "player_456",
    "data": {
      "level": 25,
      "experience": 12500,
      "inventory": [ ... ],
      "customData": { ... }
    },
    "version": 42
  }
}
```

#### Update Player Data

```http
PUT /api/player/data
```

**Request Body**
```json
{
  "data": {
    "level": 26,
    "experience": 13000
  },
  "version": 42
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "playerId": "player_456",
    "data": { ... },
    "version": 43,
    "updated": ["level", "experience"]
  }
}
```

### Player Statistics

#### Get Player Statistics

```http
GET /api/player/statistics
```

**Response**
```json
{
  "success": true,
  "data": {
    "playerId": "player_456",
    "statistics": {
      "gamesPlayed": 150,
      "wins": 75,
      "totalPlaytime": 36000,
      "achievements": 25
    }
  }
}
```

#### Update Player Statistics

```http
POST /api/player/statistics
```

**Request Body**
```json
{
  "statistics": {
    "gamesPlayed": 1,
    "wins": 1,
    "totalPlaytime": 300
  },
  "increment": true
}
```

### Leaderboards

#### Get Leaderboard

```http
GET /api/player/leaderboard/:leaderboardId
```

**Query Parameters**
- `limit` (number): Number of entries (default: 100)
- `offset` (number): Starting position (default: 0)
- `around` (string): Player ID to center results around

**Response**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "playerId": "player_123",
        "displayName": "TopPlayer",
        "score": 10000
      },
      ...
    ]
  }
}
```

#### Submit Leaderboard Score

```http
POST /api/player/leaderboard/:leaderboardId
```

**Request Body**
```json
{
  "score": 5000,
  "metadata": {
    "level": 25,
    "time": 120
  }
}
```

## Economy Service

**Base Path**: `/api/economy`

**Authentication**: Player token required

### Virtual Currency

#### Get Player Balances

```http
GET /api/economy/currency
```

**Response**
```json
{
  "success": true,
  "data": {
    "balances": {
      "Gold": 1000,
      "Gems": 50,
      "PremiumCurrency": 10
    }
  }
}
```

#### Add Currency

```http
POST /api/economy/currency/add
```

**Request Body**
```json
{
  "currency": "Gold",
  "amount": 100,
  "reason": "Quest completion",
  "metadata": {
    "questId": "quest_123"
  }
}
```

#### Subtract Currency

```http
POST /api/economy/currency/subtract
```

**Request Body**
```json
{
  "currency": "Gold",
  "amount": 50,
  "reason": "Item purchase",
  "metadata": {
    "itemId": "item_456"
  }
}
```

### Inventory

#### Get Player Inventory

```http
GET /api/economy/inventory
```

**Response**
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "itemId": "item_123",
        "itemClass": "Weapon",
        "quantity": 1,
        "metadata": {
          "level": 5,
          "durability": 100
        },
        "acquiredAt": "2024-01-01T12:00:00.000Z"
      },
      ...
    ]
  }
}
```

#### Grant Item

```http
POST /api/economy/inventory/grant
```

**Request Body**
```json
{
  "itemId": "item_123",
  "quantity": 1,
  "metadata": {
    "level": 5,
    "durability": 100
  }
}
```

#### Consume Item

```http
POST /api/economy/inventory/consume
```

**Request Body**
```json
{
  "itemId": "item_123",
  "quantity": 1
}
```

### Store

#### Get Store Catalog

```http
GET /api/economy/store/catalog
```

**Response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "itemId": "item_123",
        "name": "Health Potion",
        "description": "Restores 50 HP",
        "price": {
          "Gold": 10
        },
        "category": "Consumables"
      },
      ...
    ]
  }
}
```

#### Purchase Item

```http
POST /api/economy/store/purchase
```

**Request Body**
```json
{
  "itemId": "item_123",
  "quantity": 5,
  "currency": "Gold"
}
```

## Analytics Service

**Base Path**: `/api/analytics`

**Authentication**: Player or Developer token

### Event Tracking

#### Track Event

```http
POST /api/analytics/events
```

**Request Body**
```json
{
  "eventName": "level_completed",
  "properties": {
    "level": 5,
    "score": 1000,
    "time": 120,
    "deaths": 2
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Track Multiple Events

```http
POST /api/analytics/events/batch
```

**Request Body**
```json
{
  "events": [
    {
      "eventName": "level_started",
      "properties": { "level": 5 },
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    {
      "eventName": "level_completed",
      "properties": { "level": 5, "score": 1000 },
      "timestamp": "2024-01-01T12:05:00.000Z"
    }
  ]
}
```

### Analytics Queries

#### Get Event Metrics

```http
GET /api/analytics/metrics
```

**Query Parameters**
- `eventName` (string): Event to query
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)
- `groupBy` (string): Grouping dimension (hour, day, week)

**Response**
```json
{
  "success": true,
  "data": {
    "metrics": [
      {
        "date": "2024-01-01",
        "count": 1000,
        "uniquePlayers": 250,
        "averageValue": 15.5
      },
      ...
    ]
  }
}
```

## CloudScript Service

**Base Path**: `/api/cloudscript`

**Authentication**: Developer or Player token

### Function Execution

#### Execute CloudScript Function

```http
POST /api/cloudscript/execute
```

**Request Body**
```json
{
  "functionName": "processGameLogic",
  "parameters": {
    "action": "completeQuest",
    "questId": "quest_123"
  }
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "result": {
      "rewards": {
        "Gold": 100,
        "experience": 500
      },
      "questCompleted": true
    },
    "executionTime": 125,
    "logs": [
      "Quest validation successful",
      "Rewards granted"
    ]
  }
}
```

### Function Management (Developer Only)

#### Upload CloudScript

```http
POST /api/cloudscript/functions
```

**Request Body**
```json
{
  "name": "processGameLogic",
  "code": "function processGameLogic(context, args) { ... }",
  "description": "Handles game logic processing"
}
```

#### List Functions

```http
GET /api/cloudscript/functions
```

#### Delete Function

```http
DELETE /api/cloudscript/functions/:functionName
```

## Matchmaking Service

**Base Path**: `/api/matchmaking`

**Authentication**: Player token required

### Queue Management

#### Join Matchmaking Queue

```http
POST /api/matchmaking/queue/:queueId/join
```

**Request Body**
```json
{
  "attributes": {
    "skillLevel": 1500,
    "region": "us-east",
    "gameMode": "ranked"
  },
  "teamMembers": []
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "ticketId": "ticket_123",
    "queueId": "queue_ranked",
    "status": "searching",
    "estimatedWaitTime": 30
  }
}
```

#### Leave Matchmaking Queue

```http
POST /api/matchmaking/queue/:queueId/leave
```

**Request Body**
```json
{
  "ticketId": "ticket_123"
}
```

#### Get Ticket Status

```http
GET /api/matchmaking/ticket/:ticketId
```

**Response**
```json
{
  "success": true,
  "data": {
    "ticketId": "ticket_123",
    "status": "matched",
    "match": {
      "matchId": "match_456",
      "players": [ ... ],
      "server": {
        "host": "server1.example.com",
        "port": 7777
      }
    }
  }
}
```

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Rate Limiting

Rate limits are applied per API key or IP address:

- **Default**: 100 requests per minute
- **Burst**: 200 requests per minute (temporary)

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

When rate limit is exceeded:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "retryAfter": 30
    }
  }
}
```

## WebSocket API

WebSocket endpoint for real-time features:

### Connection

```javascript
const ws = new WebSocket('wss://api.yourdomain.com/ws');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your_access_token'
}));
```

### Event Types

#### Subscribe to Events

```json
{
  "type": "subscribe",
  "channel": "matchmaking",
  "data": {
    "ticketId": "ticket_123"
  }
}
```

#### Matchmaking Updates

```json
{
  "type": "matchmaking.update",
  "data": {
    "ticketId": "ticket_123",
    "status": "matched",
    "match": { ... }
  }
}
```

#### Player Updates

```json
{
  "type": "player.update",
  "data": {
    "field": "level",
    "oldValue": 25,
    "newValue": 26
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { NullStackClient } from '@nullstack/sdk';

const client = new NullStackClient({
  apiUrl: 'https://api.yourdomain.com',
  titleId: 'title_123',
  titleSecret: 'secret_key'
});

// Authenticate player
const auth = await client.auth.authenticatePlayer({
  customId: 'player_custom_id'
});

// Get player data
const playerData = await client.player.getData();

// Update player data
await client.player.updateData({
  level: 26,
  experience: 13000
});

// Grant currency
await client.economy.addCurrency('Gold', 100);
```

### Unity C#

```csharp
using NullStack;

var client = new NullStackClient("title_123", "secret_key");

// Authenticate
var auth = await client.Auth.AuthenticatePlayerAsync("player_custom_id");

// Get player data
var data = await client.Player.GetDataAsync();

// Track event
await client.Analytics.TrackEventAsync("level_completed", new {
    level = 5,
    score = 1000
});
```

## Postman Collection

Import the Postman collection for easy API testing:

[Download Postman Collection](../postman/nullstack-api.json)

## Support

For API questions or issues:
- Check [GitHub Issues](https://github.com/your-org/nullstack/issues)
- Review [Developer Portal Documentation](https://portal.yourdomain.com/docs)
- Contact support@yourdomain.com
