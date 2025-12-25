# NullStack Client SDK Guide

This guide covers both the TypeScript/JavaScript SDK and the C# Unity SDK for integrating NullStack into your game.

## Overview

NullStack provides official SDKs for two primary platforms:

1. **TypeScript/JavaScript SDK** (`@nullstack/sdk`)
   - Web games (HTML5, WebGL)
   - Node.js servers
   - React, Vue, Angular applications
   - Mobile web games

2. **C# SDK** (`NullStack.SDK`)
   - Unity games (2020.3+)
   - .NET applications
   - Cross-platform desktop games

## Quick Comparison

| Feature | TypeScript SDK | C# SDK |
|---------|---------------|--------|
| **Platform** | Web, Node.js | Unity, .NET |
| **Language** | TypeScript/JavaScript | C# |
| **Async Pattern** | Promises/async-await | Task/async-await |
| **Type Safety** | Full TypeScript support | Full C# type safety |
| **Bundle Size** | ~50KB (minified) | N/A |
| **Unity Support** | No | Yes (2020.3+) |
| **WebGL Support** | Yes | Via Unity |

## Installation

### TypeScript SDK

```bash
npm install @nullstack/sdk
# or
yarn add @nullstack/sdk
```

### C# SDK

**Unity Package Manager:**
1. Open Window > Package Manager
2. Click + > Add package from git URL
3. Enter: `https://github.com/nullstack/nullstack.git#packages/sdk-csharp`

**NuGet:**
```bash
dotnet add package NullStack.SDK
```

## Basic Usage Comparison

### Initialization

**TypeScript:**
```typescript
import { NullStackClient } from '@nullstack/sdk';

const client = new NullStackClient({
  titleId: 'your-title-id',
  apiUrl: 'https://api.nullstack.com'
});
```

**C#:**
```csharp
using NullStack.SDK;

var client = new NullStackClient(new NullStackConfig
{
    TitleId = "your-title-id",
    ApiUrl = "https://api.nullstack.com"
});
```

### Authentication

**TypeScript:**
```typescript
// Email login
const auth = await client.loginWithEmail({
  email: 'player@example.com',
  password: 'password123'
});

// Anonymous login
const auth = await client.loginAnonymous({
  deviceId: 'device-id'
});
```

**C#:**
```csharp
// Email login
var auth = await client.LoginWithEmailAsync(new LoginWithEmailRequest
{
    Email = "player@example.com",
    Password = "password123"
});

// Anonymous login (Unity)
var auth = await client.LoginAnonymousAsync(new LoginAnonymousRequest
{
    DeviceId = SystemInfo.deviceUniqueIdentifier
});
```

### Player Data

**TypeScript:**
```typescript
// Set data
await client.setData({
  data: {
    level: 10,
    experience: 5000,
    settings: { soundEnabled: true }
  },
  permission: 'Private'
});

// Get data
const data = await client.getData({
  keys: ['level', 'experience']
});
console.log(data.data.level.value);
```

**C#:**
```csharp
// Set data
await client.SetDataAsync(new SetDataRequest
{
    Data = new Dictionary<string, object>
    {
        { "level", 10 },
        { "experience", 5000 },
        { "settings", new { soundEnabled = true } }
    },
    Permission = "Private"
});

// Get data
var data = await client.GetDataAsync(new GetDataRequest
{
    Keys = new List<string> { "level", "experience" }
});
Debug.Log(data.Data["level"].Value);
```

### Economy

**TypeScript:**
```typescript
// Purchase item
const purchase = await client.purchaseItem({
  itemId: 'sword_legendary',
  currencyCode: 'GO',
  price: 1000
});

// Get inventory
const inventory = await client.getInventory();
```

**C#:**
```csharp
// Purchase item
var purchase = await client.PurchaseItemAsync(new PurchaseItemRequest
{
    ItemId = "sword_legendary",
    CurrencyCode = "GO",
    Price = 1000
});

// Get inventory
var inventory = await client.GetInventoryAsync();
```

### Leaderboards

**TypeScript:**
```typescript
// Submit score
await client.submitScore({
  statisticName: 'HighScore',
  value: 10000
});

// Get leaderboard
const leaderboard = await client.getLeaderboard({
  statisticName: 'HighScore',
  maxResults: 100
});
```

**C#:**
```csharp
// Submit score
await client.SubmitScoreAsync(new SubmitScoreRequest
{
    StatisticName = "HighScore",
    Value = 10000
});

// Get leaderboard
var leaderboard = await client.GetLeaderboardAsync(new GetLeaderboardRequest
{
    StatisticName = "HighScore",
    MaxResults = 100
});
```

### Analytics

**TypeScript:**
```typescript
await client.trackEvent({
  eventName: 'level_completed',
  properties: {
    level: 5,
    score: 1000
  }
});
```

**C#:**
```csharp
await client.TrackEventAsync(new TrackEventRequest
{
    EventName = "level_completed",
    Properties = new Dictionary<string, object>
    {
        { "level", 5 },
        { "score", 1000 }
    }
});
```

## Error Handling

### TypeScript

```typescript
import { NullStackError } from '@nullstack/sdk';

try {
  await client.loginWithEmail({ email, password });
} catch (error) {
  const nsError = error as NullStackError;
  console.error(`Error [${nsError.code}]: ${nsError.message}`);

  switch (nsError.code) {
    case 'INVALID_CREDENTIALS':
      showError('Invalid email or password');
      break;
    case 'NETWORK_ERROR':
      showError('Connection failed');
      break;
  }
}
```

### C#

```csharp
using NullStack.SDK;

try
{
    await client.LoginWithEmailAsync(new LoginWithEmailRequest
    {
        Email = email,
        Password = password
    });
}
catch (NullStackError error)
{
    Debug.LogError($"Error [{error.Code}]: {error.Message}");

    switch (error.Code)
    {
        case "INVALID_CREDENTIALS":
            ShowError("Invalid email or password");
            break;
        case "NETWORK_ERROR":
            ShowError("Connection failed");
            break;
    }
}
```

## Platform-Specific Features

### TypeScript SDK - Web-Specific

```typescript
// Works in browsers and Node.js
const client = new NullStackClient({
  titleId: 'web-game',
  // Automatically handles CORS
  apiUrl: 'https://api.nullstack.com'
});

// Store session in localStorage (browser)
localStorage.setItem('sessionToken', auth.sessionToken);

// Use with React
function GameComponent() {
  useEffect(() => {
    client.loginAnonymous().then(auth => {
      console.log('Logged in:', auth.playerId);
    });
  }, []);
}
```

### C# SDK - Unity-Specific

```csharp
using UnityEngine;
using NullStack.SDK;

public class GameManager : MonoBehaviour
{
    private NullStackClient client;

    async void Start()
    {
        // Unity-specific initialization
        client = new NullStackClient(new NullStackConfig
        {
            TitleId = "unity-game"
        });

        // Use Unity's device ID
        var auth = await client.LoginAnonymousAsync(new LoginAnonymousRequest
        {
            DeviceId = SystemInfo.deviceUniqueIdentifier
        });

        Debug.Log($"Player: {auth.PlayerId}");
    }

    // Save on app pause (mobile)
    async void OnApplicationPause(bool pauseStatus)
    {
        if (pauseStatus)
        {
            await SaveProgress();
        }
    }

    // Cleanup
    void OnDestroy()
    {
        client?.Dispose();
    }
}
```

## Best Practices

### Both SDKs

1. **Single Instance**: Create one client instance and reuse it
2. **Error Handling**: Always wrap API calls in try-catch blocks
3. **Async/Await**: Use async/await pattern for all API calls
4. **Auto-Save**: Save player data periodically and on important events
5. **Analytics**: Track meaningful events to understand player behavior

### TypeScript-Specific

1. **Type Safety**: Use TypeScript for full type checking
2. **Tree Shaking**: Import only what you need for smaller bundles
3. **State Management**: Integrate with Redux, Zustand, or other state managers
4. **SSR Support**: SDK works with Next.js, Nuxt, and other SSR frameworks

### C#-Specific (Unity)

1. **Main Thread**: Update UI only on Unity's main thread
2. **Lifecycle**: Save data in OnApplicationPause and OnApplicationQuit
3. **Device ID**: Use SystemInfo.deviceUniqueIdentifier for anonymous login
4. **Dispose**: Always call Dispose() in OnDestroy
5. **Coroutines**: Can wrap async calls in coroutines if needed

## Common Patterns

### Auto-Login on Start

**TypeScript:**
```typescript
class GameClient {
  async initialize() {
    const savedToken = localStorage.getItem('sessionToken');

    if (savedToken) {
      // Restore session
      this.client.sessionToken = savedToken;
    } else {
      // New login
      await this.client.loginAnonymous();
    }
  }
}
```

**C#:**
```csharp
public class GameManager : MonoBehaviour
{
    async Task Initialize()
    {
        var deviceId = PlayerPrefs.GetString("DeviceId",
            SystemInfo.deviceUniqueIdentifier);

        await client.LoginAnonymousAsync(new LoginAnonymousRequest
        {
            DeviceId = deviceId
        });

        PlayerPrefs.SetString("DeviceId", deviceId);
    }
}
```

### Progress Saving

**TypeScript:**
```typescript
class ProgressManager {
  async saveProgress(level: number, xp: number) {
    await client.setData({
      data: { level, experience: xp, lastSaved: Date.now() }
    });

    // Also submit to leaderboard
    await client.submitScore({
      statisticName: 'PlayerLevel',
      value: level
    });
  }
}
```

**C#:**
```csharp
public class ProgressManager
{
    public async Task SaveProgress(int level, int xp)
    {
        await client.SetDataAsync(new SetDataRequest
        {
            Data = new Dictionary<string, object>
            {
                { "level", level },
                { "experience", xp },
                { "lastSaved", DateTime.UtcNow.ToString("O") }
            }
        });

        // Also submit to leaderboard
        await client.SubmitScoreAsync(new SubmitScoreRequest
        {
            StatisticName = "PlayerLevel",
            Value = level
        });
    }
}
```

## Performance Tips

### TypeScript SDK

- **Bundle Size**: Use tree-shaking to reduce bundle size
- **Caching**: Cache frequently accessed data locally
- **Debouncing**: Debounce frequent API calls (e.g., auto-save)
- **Retry Logic**: Built-in retry logic handles transient failures

### C# SDK

- **Memory**: Dispose the client when done to free resources
- **Threading**: SDK is thread-safe, but Unity API calls must be on main thread
- **Caching**: Cache player data locally to reduce API calls
- **Batching**: Batch multiple operations when possible

## Testing

### TypeScript SDK

```typescript
import { NullStackClient } from '@nullstack/sdk';

describe('NullStack Integration', () => {
  let client: NullStackClient;

  beforeEach(() => {
    client = new NullStackClient({
      titleId: 'test-title',
      apiUrl: 'http://localhost:3000' // Test server
    });
  });

  test('should login anonymously', async () => {
    const auth = await client.loginAnonymous();
    expect(auth.playerId).toBeDefined();
    expect(client.isAuthenticated()).toBe(true);
  });
});
```

### C# SDK

```csharp
using NUnit.Framework;
using NullStack.SDK;

[TestFixture]
public class NullStackTests
{
    private NullStackClient client;

    [SetUp]
    public void Setup()
    {
        client = new NullStackClient(new NullStackConfig
        {
            TitleId = "test-title",
            ApiUrl = "http://localhost:3000"
        });
    }

    [Test]
    public async Task ShouldLoginAnonymously()
    {
        var auth = await client.LoginAnonymousAsync();
        Assert.IsNotNull(auth.PlayerId);
        Assert.IsTrue(client.IsAuthenticated());
    }

    [TearDown]
    public void Teardown()
    {
        client?.Dispose();
    }
}
```

## Migration Guide

### From Other BaaS Providers

If you're migrating from PlayFab, Firebase, or similar services:

1. **Authentication**: Map your existing auth methods to NullStack equivalents
2. **Player Data**: Use `setData`/`getData` for key-value storage
3. **Leaderboards**: Direct mapping with `submitScore`/`getLeaderboard`
4. **Economy**: Use virtual currencies and catalog items
5. **CloudScript**: Replace cloud functions with NullStack CloudScript

### Example: PlayFab to NullStack

**PlayFab:**
```csharp
PlayFabClientAPI.UpdateUserData(new UpdateUserDataRequest {
    Data = new Dictionary<string, string> {
        { "level", "10" }
    }
});
```

**NullStack:**
```csharp
await client.SetDataAsync(new SetDataRequest {
    Data = new Dictionary<string, object> {
        { "level", 10 }
    }
});
```

## Support

- **Documentation**: https://docs.nullstack.com
- **GitHub**: https://github.com/nullstack/nullstack
- **Discord**: https://discord.gg/nullstack
- **Email**: support@nullstack.com

## Examples

- TypeScript Examples: `/packages/sdk-typescript/examples/`
- C# Examples: `/packages/sdk-csharp/Examples/`

## License

Both SDKs are released under the MIT License.
