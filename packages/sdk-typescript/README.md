# NullStack TypeScript/JavaScript SDK

Official TypeScript/JavaScript SDK for NullStack - Game Backend as a Service.

## Installation

```bash
npm install @nullstack/sdk
# or
yarn add @nullstack/sdk
# or
pnpm add @nullstack/sdk
```

## Quick Start

```typescript
import { NullStackClient } from '@nullstack/sdk';

// Initialize the client
const client = new NullStackClient({
  titleId: 'your-title-id',
  apiUrl: 'https://api.nullstack.com' // Optional, defaults to production
});

// Login with email
const auth = await client.loginWithEmail({
  email: 'player@example.com',
  password: 'password123'
});

console.log('Logged in as:', auth.playerId);

// Get player profile
const profile = await client.getProfile();
console.log('Display Name:', profile.displayName);
```

## Features

- Full TypeScript support with type definitions
- Automatic authentication token management
- Built-in retry logic for failed requests
- Comprehensive error handling
- Support for all NullStack features:
  - Authentication (Email, Anonymous)
  - Player Profiles and Data Storage
  - Virtual Economy and Inventory
  - Leaderboards
  - CloudScript Execution
  - Analytics

## Configuration

```typescript
const client = new NullStackClient({
  titleId: 'your-title-id',           // Required
  apiUrl: 'https://api.nullstack.com', // Optional
  timeout: 30000,                       // Optional, request timeout in ms
  retryAttempts: 3,                     // Optional, number of retry attempts
  retryDelay: 1000                      // Optional, delay between retries in ms
});
```

## Authentication

### Email Login

```typescript
const auth = await client.loginWithEmail({
  email: 'player@example.com',
  password: 'password123'
});
```

### Registration

```typescript
const auth = await client.register({
  email: 'newplayer@example.com',
  password: 'securepass123',
  username: 'newplayer',
  displayName: 'New Player'
});
```

### Anonymous Login

```typescript
const auth = await client.loginAnonymous({
  deviceId: 'device-unique-id', // Optional
  createAccount: true
});
```

### Logout

```typescript
client.logout();
```

### Check Authentication Status

```typescript
if (client.isAuthenticated()) {
  console.log('Player is logged in');
  console.log('Player ID:', client.getPlayerId());
}
```

## Player Data

### Get Profile

```typescript
const profile = await client.getProfile();
console.log(profile.displayName);
console.log(profile.email);
console.log(profile.statistics);
```

### Update Profile

```typescript
await client.updateProfile({
  displayName: 'Pro Gamer',
  avatarUrl: 'https://example.com/avatar.png'
});
```

### Get Player Data (Key-Value Storage)

```typescript
// Get all data
const allData = await client.getData();

// Get specific keys
const data = await client.getData({
  keys: ['level', 'experience', 'settings']
});

console.log('Level:', data.data.level.value);
console.log('Experience:', data.data.experience.value);
```

### Set Player Data

```typescript
await client.setData({
  data: {
    level: 10,
    experience: 5000,
    settings: {
      soundEnabled: true,
      musicVolume: 0.8
    },
    inventory: ['sword', 'shield', 'potion']
  },
  permission: 'Private' // or 'Public'
});
```

## Economy

### Get Currencies

```typescript
const currencies = await client.getCurrencies();
currencies.forEach(currency => {
  console.log(`${currency.currencyCode}: ${currency.amount}`);
});
```

### Purchase Item

```typescript
const purchase = await client.purchaseItem({
  itemId: 'sword_legendary',
  currencyCode: 'GO', // Gold
  price: 1000
});

console.log('Item Instance ID:', purchase.itemInstanceId);
console.log('Purchase Date:', purchase.purchaseDate);
```

### Get Inventory

```typescript
const inventory = await client.getInventory();
inventory.forEach(item => {
  console.log(`${item.displayName} (${item.itemClass})`);
  console.log(`  Instance ID: ${item.itemInstanceId}`);
  if (item.remainingUses) {
    console.log(`  Remaining Uses: ${item.remainingUses}`);
  }
});
```

### Consume Item

```typescript
const result = await client.consumeItem({
  itemInstanceId: 'item-instance-123',
  consumeCount: 1
});

console.log('Remaining Uses:', result.remainingUses);
```

## Leaderboards

### Get Leaderboard

```typescript
const leaderboard = await client.getLeaderboard({
  statisticName: 'HighScore',
  startPosition: 0,
  maxResults: 100
});

console.log('Leaderboard Version:', leaderboard.version);
leaderboard.leaderboard.forEach(entry => {
  console.log(`${entry.position}. ${entry.displayName}: ${entry.score}`);
});
```

### Submit Score

```typescript
const result = await client.submitScore({
  statisticName: 'HighScore',
  value: 10000,
  metadata: {
    level: 'hard',
    time: 120
  }
});

console.log('Your Position:', result.position);
console.log('Your Score:', result.value);
```

## CloudScript

Execute server-side functions:

```typescript
const result = await client.execute({
  functionName: 'grantDailyReward',
  functionParameter: {
    day: 7,
    streak: true
  },
  generatePlayStreamEvent: true
});

console.log('Result:', result.functionResult);
console.log('Execution Time:', result.executionTimeSeconds);

if (result.logs) {
  result.logs.forEach(log => {
    console.log(`[${log.level}] ${log.message}`);
  });
}

if (result.error) {
  console.error('CloudScript Error:', result.error.message);
}
```

## Analytics

Track custom events:

```typescript
await client.trackEvent({
  eventName: 'level_completed',
  properties: {
    level: 5,
    score: 1000,
    duration: 120,
    difficulty: 'hard'
  }
});

await client.trackEvent({
  eventName: 'item_purchased',
  properties: {
    itemId: 'sword_legendary',
    price: 1000,
    currency: 'GO'
  }
});
```

## Error Handling

The SDK throws structured errors that you can catch and handle:

```typescript
import { NullStackClient, NullStackError } from '@nullstack/sdk';

try {
  const auth = await client.loginWithEmail({
    email: 'player@example.com',
    password: 'wrongpassword'
  });
} catch (error) {
  const nsError = error as NullStackError;
  console.error('Error Code:', nsError.code);
  console.error('Error Message:', nsError.message);
  console.error('HTTP Status:', nsError.status);

  if (nsError.details) {
    console.error('Details:', nsError.details);
  }
}
```

Common error codes:
- `INVALID_CREDENTIALS` - Invalid email or password
- `PLAYER_NOT_FOUND` - Player does not exist
- `INSUFFICIENT_FUNDS` - Not enough virtual currency
- `ITEM_NOT_FOUND` - Item does not exist
- `NETWORK_ERROR` - Network connectivity issues
- `UNAUTHORIZED` - Invalid or expired session token

## Complete Example

```typescript
import { NullStackClient } from '@nullstack/sdk';

async function playGame() {
  const client = new NullStackClient({
    titleId: 'my-game-title'
  });

  try {
    // Login
    const auth = await client.loginWithEmail({
      email: 'player@example.com',
      password: 'password123'
    });
    console.log('Logged in as:', auth.playerId);

    // Get profile
    const profile = await client.getProfile();
    console.log('Welcome back,', profile.displayName);

    // Get player data
    const data = await client.getData({
      keys: ['level', 'experience']
    });
    console.log('Level:', data.data.level?.value || 1);

    // Check currencies
    const currencies = await client.getCurrencies();
    const gold = currencies.find(c => c.currencyCode === 'GO');
    console.log('Gold:', gold?.amount || 0);

    // View leaderboard
    const leaderboard = await client.getLeaderboard({
      statisticName: 'HighScore',
      maxResults: 10
    });
    console.log('Top 10 Players:');
    leaderboard.leaderboard.forEach(entry => {
      console.log(`  ${entry.position}. ${entry.displayName}: ${entry.score}`);
    });

    // Submit a new score
    await client.submitScore({
      statisticName: 'HighScore',
      value: 15000
    });

    // Track analytics
    await client.trackEvent({
      eventName: 'session_start',
      properties: {
        platform: 'web',
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Game error:', error);
  }
}

playGame();
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import {
  NullStackClient,
  PlayerProfile,
  InventoryItem,
  LeaderboardEntry
} from '@nullstack/sdk';

// Types are automatically inferred
const profile: PlayerProfile = await client.getProfile();
const inventory: InventoryItem[] = await client.getInventory();
```

## Browser Support

The SDK works in all modern browsers that support ES2015+ and can be bundled with:
- Webpack
- Rollup
- Vite
- Parcel
- esbuild

## Node.js Support

The SDK works in Node.js 14+ and can be used for server-side operations or testing.

## License

MIT

## Support

- Documentation: https://docs.nullstack.com
- GitHub: https://github.com/nullstack/nullstack
- Discord: https://discord.gg/nullstack
- Email: support@nullstack.com
