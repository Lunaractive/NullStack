# CloudScript Service

The CloudScript service provides a sandboxed JavaScript execution environment for NullStack. It allows developers to write custom server-side logic that can be executed securely with access to player data, inventory, economy, and other game backend features.

## Features

- **Sandboxed Execution**: Uses `isolated-vm` for secure code execution with memory and timeout limits
- **Resource Limits**: Configurable timeout (max 30s) and memory limits (max 512MB)
- **API Context**: Functions have access to player data, inventory, economy, and statistics
- **Version Control**: Functions support versioning and publishing
- **Execution Logging**: All executions are logged to MongoDB with TTL (30 days)
- **Developer Testing**: Test endpoint for executing unpublished functions

## API Endpoints

### Function Management (Developer Only)

#### Create/Update Function
```
POST /api/v1/cloudscript/functions
Headers:
  - Authorization: Bearer <developer-token>
  - x-title-key: <title-key>
Body:
{
  "functionName": "grantDailyReward",
  "code": "const handlers = { grantDailyReward: async (args, context) => { ... } }",
  "runtime": "nodejs20",
  "timeoutSeconds": 10,
  "memoryMB": 128
}
```

#### List Functions
```
GET /api/v1/cloudscript/functions
Headers:
  - Authorization: Bearer <developer-token>
  - x-title-key: <title-key>
```

#### Get Function Details
```
GET /api/v1/cloudscript/functions/:name
Headers:
  - Authorization: Bearer <developer-token>
  - x-title-key: <title-key>
```

#### Delete Function
```
DELETE /api/v1/cloudscript/functions/:name
Headers:
  - Authorization: Bearer <developer-token>
  - x-title-key: <title-key>
```

#### Publish Function
```
POST /api/v1/cloudscript/functions/:name/publish
Headers:
  - Authorization: Bearer <developer-token>
  - x-title-key: <title-key>
```

### Function Execution

#### Execute Function (Player)
```
POST /api/v1/cloudscript/execute/:functionName
Headers:
  - Authorization: Bearer <player-token>
  - x-title-key: <title-key>
Body:
{
  "args": {
    "customParam": "value"
  }
}
```

#### Test Function (Developer)
```
POST /api/v1/cloudscript/test/:functionName
Headers:
  - x-title-key: <title-key>
Body:
{
  "args": {
    "customParam": "value"
  },
  "testPlayerId": "test-player-123"
}
```

## CloudScript Function Format

Functions must be written in the following format:

```javascript
const handlers = {
  functionName: async (args, context) => {
    const { server, currentPlayerId } = context;

    // Your logic here
    server.log.info('Function started');

    const playerData = await server.getPlayerData(currentPlayerId);
    await server.addVirtualCurrency('Gold', 100);

    return {
      success: true,
      message: 'Reward granted'
    };
  }
};
```

## Available Server API

The `server` object provides the following methods:

### Logging
```javascript
server.log.info(message)
server.log.warn(message)
server.log.error(message)
```

### Player Data
```javascript
// Get player data
const data = await server.getPlayerData(playerId?)
// Returns: { playerId, displayName, level, experience, customData, statistics }

// Set player custom data
await server.setPlayerData(playerId?, data)
```

### Inventory
```javascript
// Get player inventory
const inventory = await server.getPlayerInventory(playerId?)
// Returns: { items: [...] }

// Grant item to player
const result = await server.grantItem(playerId?, itemId, catalogVersion?)
// Returns: { itemInstanceId, itemId }
```

### Virtual Currency
```javascript
// Add virtual currency
await server.addVirtualCurrency(playerId?, currency, amount)

// Subtract virtual currency
await server.subtractVirtualCurrency(playerId?, currency, amount)
// Throws error if insufficient funds
```

### Statistics
```javascript
// Update player statistics
await server.updatePlayerStatistics(playerId?, { stat1: value1, stat2: value2 })
```

**Note**: When `playerId` is omitted, methods operate on the `currentPlayerId` (the player executing the function).

## Function Arguments

Functions receive two parameters:

1. **args**: Object containing custom arguments passed when executing the function
2. **context**: Object containing:
   - `server`: API object with methods for accessing game backend
   - `currentPlayerId`: ID of the player executing the function

## Resource Limits

- **Timeout**: 1-30 seconds (default: 10s)
- **Memory**: 128-512 MB (default: 128MB)
- **Code Size**: Limited by MongoDB document size (16MB)

## Execution Logs

All function executions are logged to MongoDB with:
- Title ID
- Function name
- Player ID
- Arguments
- Result or error
- Execution time
- TTL of 30 days (automatic cleanup)

## Example Functions

### Grant Daily Reward
```javascript
const handlers = {
  grantDailyReward: async (args, context) => {
    const { server, currentPlayerId } = context;

    server.log.info('Granting daily reward');

    // Grant currency
    await server.addVirtualCurrency('Gold', 100);
    await server.addVirtualCurrency('Gems', 10);

    // Grant item
    await server.grantItem('daily_chest', 'v1');

    return {
      success: true,
      rewards: {
        gold: 100,
        gems: 10,
        items: ['daily_chest']
      }
    };
  }
};
```

### Level Up Reward
```javascript
const handlers = {
  levelUpReward: async (args, context) => {
    const { server, currentPlayerId } = context;
    const { newLevel } = args;

    server.log.info(`Player reached level ${newLevel}`);

    // Calculate rewards based on level
    const goldReward = newLevel * 50;
    const gemsReward = Math.floor(newLevel / 5);

    await server.addVirtualCurrency('Gold', goldReward);
    if (gemsReward > 0) {
      await server.addVirtualCurrency('Gems', gemsReward);
    }

    // Update statistics
    await server.updatePlayerStatistics({
      totalLevelUps: 1,
      currentLevel: newLevel
    });

    return {
      success: true,
      rewards: { gold: goldReward, gems: gemsReward }
    };
  }
};
```

### Purchase Validation
```javascript
const handlers = {
  purchaseItem: async (args, context) => {
    const { server, currentPlayerId } = context;
    const { itemId, price, currency } = args;

    try {
      // Subtract currency
      await server.subtractVirtualCurrency(currency, price);

      // Grant item
      const result = await server.grantItem(itemId);

      server.log.info(`Item ${itemId} purchased for ${price} ${currency}`);

      return {
        success: true,
        itemInstanceId: result.itemInstanceId
      };
    } catch (error) {
      server.log.error(`Purchase failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
```

## Environment Variables

- `PORT`: Server port (default: 3004)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT token verification
- `NODE_ENV`: Environment (development/production)

## Docker

Build and run using Docker:

```bash
docker build -t nullstack-cloudscript .
docker run -p 3004:3004 nullstack-cloudscript
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Security Considerations

1. **Sandboxing**: All code runs in isolated-vm with no access to Node.js internals
2. **Resource Limits**: Timeout and memory limits prevent resource exhaustion
3. **Version Control**: Only published functions can be executed by players
4. **Authentication**: All endpoints require proper authentication
5. **Input Validation**: All inputs are validated using Zod schemas
6. **Error Handling**: Errors are caught and logged without exposing internal details

## MongoDB Collections

- **cloudscriptfunctions**: Stores function definitions
  - Indexed by: titleId, functionName
  - Fields: code, runtime, timeoutSeconds, memoryMB, version, published

- **cloudscriptexecutions**: Stores execution logs (TTL: 30 days)
  - Indexed by: titleId, createdAt, playerId
  - Fields: functionName, args, result, error, executionTimeMs
