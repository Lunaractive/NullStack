# NullStack API Documentation

## Overview

NullStack provides a comprehensive REST API for managing game titles, players, economy, CloudScript functions, and analytics.

Base URLs:
- **Auth Service**: `http://localhost:3001`
- **Title Service**: `http://localhost:3002`
- **Player Service**: `http://localhost:3003`
- **Economy Service**: `http://localhost:3004`
- **CloudScript Service**: `http://localhost:3007`
- **Analytics Service**: `http://localhost:3009`

---

## Authentication

### Developer Authentication

All developer endpoints require a JWT Bearer token.

**Register Developer**
```http
POST /api/v1/developer/auth/register
Content-Type: application/json

{
  "email": "developer@example.com",
  "password": "SecurePassword123",
  "name": "John Doe",
  "companyName": "Game Studio Inc" // optional
}

Response: 201 Created
{
  "success": true,
  "data": {
    "message": "Developer registered successfully"
  }
}
```

**Login**
```http
POST /api/v1/developer/auth/login
Content-Type: application/json

{
  "email": "developer@example.com",
  "password": "SecurePassword123"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "developer": {
      "id": "uuid",
      "email": "developer@example.com",
      "name": "John Doe"
    }
  }
}
```

**Get Current Developer**
```http
GET /api/v1/developer/auth/me
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "developer@example.com",
    "name": "John Doe",
    "companyName": "Game Studio Inc",
    "emailVerified": false,
    "createdAt": "2025-12-25T00:00:00.000Z"
  }
}
```

---

## Title Management

### List Titles

```http
GET /api/v1/titles?page=1&pageSize=10
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "My Awesome Game",
        "status": "active",
        "createdAt": "2025-12-25T00:00:00.000Z",
        "updatedAt": "2025-12-25T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

### Create Title

```http
POST /api/v1/titles
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "My Awesome Game"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Awesome Game",
    "secretKey": "uuid_randomkey",
    "status": "active",
    "createdAt": "2025-12-25T00:00:00.000Z"
  }
}
```

**Note**: Save the `secretKey` - it's only returned on creation and detail view!

### Get Title Details

```http
GET /api/v1/titles/{titleId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Awesome Game",
    "secretKey": "uuid_randomkey",
    "status": "active",
    "createdAt": "2025-12-25T00:00:00.000Z",
    "updatedAt": "2025-12-25T00:00:00.000Z"
  }
}
```

---

## CloudScript Functions

**Authentication**: Requires both Bearer token AND `x-title-key` header with the title's secretKey.

### List Functions

```http
GET /api/v1/cloudscript/functions
Authorization: Bearer {accessToken}
x-title-key: {titleSecretKey}

Response: 200 OK
{
  "success": true,
  "data": {
    "functions": [
      {
        "functionName": "grantWelcomeBonus",
        "version": 1,
        "runtime": "nodejs20",
        "timeoutSeconds": 10,
        "memoryMB": 128,
        "published": true,
        "createdAt": "2025-12-25T00:00:00.000Z",
        "updatedAt": "2025-12-25T00:00:00.000Z"
      }
    ]
  }
}
```

### Create/Update Function

```http
POST /api/v1/cloudscript/functions
Authorization: Bearer {accessToken}
x-title-key: {titleSecretKey}
Content-Type: application/json

{
  "functionName": "grantWelcomeBonus",
  "code": "function handler(args, context) { return { success: true, bonus: 100 }; }",
  "runtime": "nodejs20",  // optional, default: nodejs20
  "timeoutSeconds": 10,   // optional, default: 10, max: 30
  "memoryMB": 128         // optional, default: 128, max: 512
}

Response: 201 Created (or 200 OK if updating)
{
  "success": true,
  "data": {
    "functionName": "grantWelcomeBonus",
    "version": 1,
    "runtime": "nodejs20",
    "timeoutSeconds": 10,
    "memoryMB": 128,
    "published": false,
    "createdAt": "2025-12-25T00:00:00.000Z",
    "updatedAt": "2025-12-25T00:00:00.000Z"
  }
}
```

### Get Function Details

```http
GET /api/v1/cloudscript/functions/{functionName}
Authorization: Bearer {accessToken}
x-title-key: {titleSecretKey}

Response: 200 OK
{
  "success": true,
  "data": {
    "functionName": "grantWelcomeBonus",
    "code": "function handler(args, context) { return { success: true, bonus: 100 }; }",
    "version": 1,
    "runtime": "nodejs20",
    "timeoutSeconds": 10,
    "memoryMB": 128,
    "published": false,
    "createdAt": "2025-12-25T00:00:00.000Z",
    "updatedAt": "2025-12-25T00:00:00.000Z"
  }
}
```

### Delete Function

```http
DELETE /api/v1/cloudscript/functions/{functionName}
Authorization: Bearer {accessToken}
x-title-key: {titleSecretKey}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "Function deleted successfully"
  }
}
```

### Publish Function

```http
POST /api/v1/cloudscript/functions/{functionName}/publish
Authorization: Bearer {accessToken}
x-title-key: {titleSecretKey}

Response: 200 OK
{
  "success": true,
  "data": {
    "functionName": "grantWelcomeBonus",
    "version": 1,
    "published": true,
    "message": "Function published successfully"
  }
}
```

---

## Analytics

### Get Daily Active Users Report

```http
GET /api/v1/analytics/reports/dau?titleId={titleId}&startDate={ISO8601}&endDate={ISO8601}
Authorization: Bearer {accessToken}

Example:
GET /api/v1/analytics/reports/dau?titleId=uuid&startDate=2025-12-18T00:00:00Z&endDate=2025-12-25T00:00:00Z

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "date": "2025-12-25",
      "activeUsers": 1234,
      "newUsers": 56,
      "sessions": 3456
    }
  ]
}
```

---

## Economy

### List Currencies

```http
GET /api/v1/economy/currency?titleId={titleId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "GC",
        "name": "Gold Coins",
        "initialDeposit": 100
      }
    ],
    "total": 1
  }
}
```

### Create Currency

```http
POST /api/v1/economy/currency
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "titleId": "uuid",
  "code": "GC",
  "name": "Gold Coins",
  "initialDeposit": 100
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "GC",
    "name": "Gold Coins",
    "initialDeposit": 100,
    "createdAt": "2025-12-25T00:00:00.000Z"
  }
}
```

### List Catalog Items

```http
GET /api/v1/economy/catalog/items?titleId={titleId}&search={query}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "itemId": "sword_legendary_001",
        "displayName": "Legendary Sword",
        "description": "A powerful legendary sword",
        "itemClass": "Weapon",
        "prices": {
          "GC": 1000
        }
      }
    ],
    "total": 1
  }
}
```

### Create Catalog Item

```http
POST /api/v1/economy/catalog/items
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "titleId": "uuid",
  "itemId": "sword_legendary_001",
  "displayName": "Legendary Sword",
  "description": "A powerful legendary sword",
  "itemClass": "Weapon",
  "prices": {
    "GC": 1000
  },
  "tags": ["legendary", "weapon", "sword"]
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "itemId": "sword_legendary_001",
    "displayName": "Legendary Sword",
    "itemClass": "Weapon",
    "createdAt": "2025-12-25T00:00:00.000Z"
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}  // optional
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401) - Missing or invalid authentication token
- `FORBIDDEN` (403) - Valid token but insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists
- `VALIDATION_ERROR` (400) - Invalid request data
- `INVALID_TITLE_KEY` (401) - Missing or invalid x-title-key header
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests

---

## Rate Limiting

**Note**: Rate limiting is currently disabled for development. In production:

- Authentication endpoints: 100 requests per minute
- API endpoints: 1000 requests per 15 minutes per title
- CloudScript execution: 100 executions per minute

---

## Best Practices

1. **Store Secret Keys Securely** - Never commit secret keys to version control
2. **Use Environment Variables** - Store API keys and credentials in .env files
3. **Implement Retry Logic** - Handle transient failures gracefully
4. **Cache Responses** - Use ETags and caching headers when available
5. **Validate Input** - Always validate data before sending to the API
6. **Handle Errors** - Implement proper error handling for all API calls
7. **Monitor Usage** - Track API usage to stay within rate limits

---

## SDK Examples

### JavaScript/TypeScript

```typescript
const NULLSTACK_API = 'http://localhost:3001';
const TOKEN = 'your-jwt-token';

// Login
const login = async (email: string, password: string) => {
  const response = await fetch(`${NULLSTACK_API}/api/v1/developer/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  return data.data.accessToken;
};

// Create CloudScript Function
const createFunction = async (titleSecretKey: string, functionName: string, code: string) => {
  const response = await fetch('http://localhost:3007/api/v1/cloudscript/functions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
      'x-title-key': titleSecretKey
    },
    body: JSON.stringify({ functionName, code })
  });
  return await response.json();
};
```

---

**For more information, visit the NullStack Developer Portal at http://localhost:3006**
