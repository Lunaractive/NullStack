# NullStack C# SDK

Official C# SDK for NullStack - Game Backend as a Service. Compatible with Unity 2020.3+ and .NET Standard 2.1+.

## Installation

### Unity (Package Manager)

1. Open Unity Package Manager (Window > Package Manager)
2. Click the + button and select "Add package from git URL"
3. Enter: `https://github.com/nullstack/nullstack.git#packages/sdk-csharp`

### Unity (Manual)

1. Download the latest release
2. Extract to your Unity project's `Assets/Plugins/NullStack` folder

### .NET / NuGet

```bash
dotnet add package NullStack.SDK
```

Or via NuGet Package Manager:
```
Install-Package NullStack.SDK
```

## Quick Start

```csharp
using NullStack.SDK;
using System.Threading.Tasks;

public class GameManager
{
    private NullStackClient client;

    public async Task Initialize()
    {
        // Initialize the client
        client = new NullStackClient(new NullStackConfig
        {
            TitleId = "your-title-id",
            ApiUrl = "https://api.nullstack.com"
        });

        // Login with email
        var auth = await client.LoginWithEmailAsync(new LoginWithEmailRequest
        {
            Email = "player@example.com",
            Password = "password123"
        });

        Debug.Log($"Logged in as: {auth.PlayerId}");

        // Get player profile
        var profile = await client.GetProfileAsync();
        Debug.Log($"Display Name: {profile.DisplayName}");
    }
}
```

## Unity Integration

### Basic Unity Example

```csharp
using UnityEngine;
using NullStack.SDK;
using System.Threading.Tasks;

public class NullStackManager : MonoBehaviour
{
    private NullStackClient client;

    async void Start()
    {
        client = new NullStackClient(new NullStackConfig
        {
            TitleId = "your-title-id"
        });

        try
        {
            await LoginPlayer();
        }
        catch (NullStackError error)
        {
            Debug.LogError($"Error: {error.Code} - {error.Message}");
        }
    }

    async Task LoginPlayer()
    {
        var auth = await client.LoginAnonymousAsync(new LoginAnonymousRequest
        {
            DeviceId = SystemInfo.deviceUniqueIdentifier
        });

        Debug.Log($"Player ID: {auth.PlayerId}");
        Debug.Log($"Newly Created: {auth.NewlyCreated}");
    }

    void OnDestroy()
    {
        client?.Dispose();
    }
}
```

## Configuration

```csharp
var config = new NullStackConfig
{
    TitleId = "your-title-id",           // Required
    ApiUrl = "https://api.nullstack.com", // Optional, defaults to production
    Timeout = 30000,                       // Optional, request timeout in ms
    RetryAttempts = 3,                     // Optional, number of retry attempts
    RetryDelay = 1000                      // Optional, delay between retries in ms
};

var client = new NullStackClient(config);
```

## Authentication

### Email Login

```csharp
var auth = await client.LoginWithEmailAsync(new LoginWithEmailRequest
{
    Email = "player@example.com",
    Password = "password123"
});
```

### Registration

```csharp
var auth = await client.RegisterAsync(new RegisterRequest
{
    Email = "newplayer@example.com",
    Password = "securepass123",
    Username = "newplayer",
    DisplayName = "New Player"
});
```

### Anonymous Login (Ideal for Unity)

```csharp
var auth = await client.LoginAnonymousAsync(new LoginAnonymousRequest
{
    DeviceId = SystemInfo.deviceUniqueIdentifier,
    CreateAccount = true
});
```

### Logout

```csharp
client.Logout();
```

### Check Authentication Status

```csharp
if (client.IsAuthenticated())
{
    Debug.Log("Player is logged in");
    Debug.Log($"Player ID: {client.GetPlayerId()}");
}
```

## Player Data

### Get Profile

```csharp
var profile = await client.GetProfileAsync();
Debug.Log(profile.DisplayName);
Debug.Log(profile.Email);
```

### Update Profile

```csharp
await client.UpdateProfileAsync(new UpdateProfileRequest
{
    DisplayName = "Pro Gamer",
    AvatarUrl = "https://example.com/avatar.png"
});
```

### Get Player Data (Key-Value Storage)

```csharp
// Get all data
var allData = await client.GetDataAsync();

// Get specific keys
var data = await client.GetDataAsync(new GetDataRequest
{
    Keys = new List<string> { "level", "experience", "settings" }
});

if (data.Data.TryGetValue("level", out var levelValue))
{
    Debug.Log($"Level: {levelValue.Value}");
}
```

### Set Player Data

```csharp
await client.SetDataAsync(new SetDataRequest
{
    Data = new Dictionary<string, object>
    {
        { "level", 10 },
        { "experience", 5000 },
        { "settings", new { soundEnabled = true, musicVolume = 0.8f } },
        { "inventory", new[] { "sword", "shield", "potion" } }
    },
    Permission = "Private" // or "Public"
});
```

## Economy

### Get Currencies

```csharp
var currencies = await client.GetCurrenciesAsync();
foreach (var currency in currencies)
{
    Debug.Log($"{currency.CurrencyCode}: {currency.Amount}");
}
```

### Purchase Item

```csharp
var purchase = await client.PurchaseItemAsync(new PurchaseItemRequest
{
    ItemId = "sword_legendary",
    CurrencyCode = "GO", // Gold
    Price = 1000
});

Debug.Log($"Item Instance ID: {purchase.ItemInstanceId}");
Debug.Log($"Purchase Date: {purchase.PurchaseDate}");
```

### Get Inventory

```csharp
var inventory = await client.GetInventoryAsync();
foreach (var item in inventory)
{
    Debug.Log($"{item.DisplayName} ({item.ItemClass})");
    Debug.Log($"  Instance ID: {item.ItemInstanceId}");
    if (item.RemainingUses.HasValue)
    {
        Debug.Log($"  Remaining Uses: {item.RemainingUses}");
    }
}
```

### Consume Item

```csharp
var result = await client.ConsumeItemAsync(new ConsumeItemRequest
{
    ItemInstanceId = "item-instance-123",
    ConsumeCount = 1
});

Debug.Log($"Remaining Uses: {result.RemainingUses}");
```

## Leaderboards

### Get Leaderboard

```csharp
var leaderboard = await client.GetLeaderboardAsync(new GetLeaderboardRequest
{
    StatisticName = "HighScore",
    StartPosition = 0,
    MaxResults = 100
});

Debug.Log($"Leaderboard Version: {leaderboard.Version}");
foreach (var entry in leaderboard.Leaderboard)
{
    Debug.Log($"{entry.Position}. {entry.DisplayName}: {entry.Score}");
}
```

### Submit Score

```csharp
var result = await client.SubmitScoreAsync(new SubmitScoreRequest
{
    StatisticName = "HighScore",
    Value = 10000,
    Metadata = new Dictionary<string, object>
    {
        { "level", "hard" },
        { "time", 120 }
    }
});

Debug.Log($"Your Position: {result.Position}");
Debug.Log($"Your Score: {result.Value}");
```

## CloudScript

Execute server-side functions:

```csharp
var result = await client.ExecuteAsync(new ExecuteCloudScriptRequest
{
    FunctionName = "grantDailyReward",
    FunctionParameter = new { day = 7, streak = true },
    GeneratePlayStreamEvent = true
});

Debug.Log($"Result: {result.FunctionResult}");
Debug.Log($"Execution Time: {result.ExecutionTimeSeconds}s");

if (result.Logs != null)
{
    foreach (var log in result.Logs)
    {
        Debug.Log($"[{log.Level}] {log.Message}");
    }
}

if (result.Error != null)
{
    Debug.LogError($"CloudScript Error: {result.Error.Message}");
}
```

## Analytics

Track custom events:

```csharp
await client.TrackEventAsync(new TrackEventRequest
{
    EventName = "level_completed",
    Properties = new Dictionary<string, object>
    {
        { "level", 5 },
        { "score", 1000 },
        { "duration", 120 },
        { "difficulty", "hard" }
    }
});

await client.TrackEventAsync(new TrackEventRequest
{
    EventName = "item_purchased",
    Properties = new Dictionary<string, object>
    {
        { "itemId", "sword_legendary" },
        { "price", 1000 },
        { "currency", "GO" }
    }
});
```

## Error Handling

```csharp
using NullStack.SDK;

try
{
    var auth = await client.LoginWithEmailAsync(new LoginWithEmailRequest
    {
        Email = "player@example.com",
        Password = "wrongpassword"
    });
}
catch (NullStackError error)
{
    Debug.LogError($"Error Code: {error.Code}");
    Debug.LogError($"Error Message: {error.Message}");
    Debug.LogError($"HTTP Status: {error.Status}");

    if (error.Details != null)
    {
        Debug.LogError($"Details: {error.Details}");
    }

    // Handle specific errors
    switch (error.Code)
    {
        case "INVALID_CREDENTIALS":
            ShowLoginError("Invalid email or password");
            break;
        case "NETWORK_ERROR":
            ShowConnectionError();
            break;
        default:
            ShowGenericError(error.Message);
            break;
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

## Complete Unity Example

```csharp
using UnityEngine;
using UnityEngine.UI;
using NullStack.SDK;
using System.Threading.Tasks;

public class GameController : MonoBehaviour
{
    [SerializeField] private Text statusText;
    [SerializeField] private Text goldText;
    private NullStackClient client;

    async void Start()
    {
        client = new NullStackClient(new NullStackConfig
        {
            TitleId = "my-game-title"
        });

        await InitializeGame();
    }

    async Task InitializeGame()
    {
        try
        {
            // Login anonymously
            statusText.text = "Logging in...";
            var auth = await client.LoginAnonymousAsync(new LoginAnonymousRequest
            {
                DeviceId = SystemInfo.deviceUniqueIdentifier
            });

            if (auth.NewlyCreated)
            {
                statusText.text = "Welcome, new player!";
            }
            else
            {
                statusText.text = "Welcome back!";
            }

            // Get profile
            var profile = await client.GetProfileAsync();
            Debug.Log($"Player: {profile.DisplayName ?? "Anonymous"}");

            // Get player data
            var data = await client.GetDataAsync(new GetDataRequest
            {
                Keys = new List<string> { "level", "experience" }
            });

            int level = 1;
            if (data.Data.TryGetValue("level", out var levelValue))
            {
                level = Convert.ToInt32(levelValue.Value);
            }
            Debug.Log($"Level: {level}");

            // Check currencies
            var currencies = await client.GetCurrenciesAsync();
            var gold = currencies.Find(c => c.CurrencyCode == "GO");
            goldText.text = $"Gold: {gold?.Amount ?? 0}";

            // Track session start
            await client.TrackEventAsync(new TrackEventRequest
            {
                EventName = "session_start",
                Properties = new Dictionary<string, object>
                {
                    { "platform", "unity" },
                    { "version", Application.version },
                    { "device", SystemInfo.deviceModel }
                }
            });
        }
        catch (NullStackError error)
        {
            Debug.LogError($"Game initialization error: {error.Message}");
            statusText.text = "Connection failed. Please try again.";
        }
    }

    public async void OnLevelComplete(int level, int score)
    {
        try
        {
            // Save progress
            await client.SetDataAsync(new SetDataRequest
            {
                Data = new Dictionary<string, object>
                {
                    { "level", level },
                    { "lastScore", score }
                }
            });

            // Submit to leaderboard
            await client.SubmitScoreAsync(new SubmitScoreRequest
            {
                StatisticName = "HighScore",
                Value = score
            });

            // Track event
            await client.TrackEventAsync(new TrackEventRequest
            {
                EventName = "level_completed",
                Properties = new Dictionary<string, object>
                {
                    { "level", level },
                    { "score", score }
                }
            });

            Debug.Log("Progress saved!");
        }
        catch (NullStackError error)
        {
            Debug.LogError($"Failed to save progress: {error.Message}");
        }
    }

    void OnDestroy()
    {
        client?.Dispose();
    }
}
```

## Thread Safety

The SDK is designed to be thread-safe and can be used with Unity's async/await pattern. However, remember that Unity MonoBehaviour methods must be called on the main thread:

```csharp
async Task LoadPlayerData()
{
    var profile = await client.GetProfileAsync();

    // Use Unity's main thread dispatcher for UI updates
    UnityMainThreadDispatcher.Instance().Enqueue(() =>
    {
        playerNameText.text = profile.DisplayName;
    });
}
```

## Best Practices

1. **Initialize Once**: Create a single instance of `NullStackClient` and reuse it throughout your game.

2. **Error Handling**: Always wrap async calls in try-catch blocks to handle network errors gracefully.

3. **Device ID**: Use `SystemInfo.deviceUniqueIdentifier` for anonymous login in Unity.

4. **Dispose**: Call `Dispose()` when you're done with the client to clean up resources.

5. **Async/Await**: Use async/await pattern for all API calls to avoid blocking the main thread.

6. **Save Progress**: Save player data after significant achievements or level completions.

7. **Analytics**: Track important game events to understand player behavior.

## System Requirements

- Unity 2020.3 or higher (for Unity)
- .NET Standard 2.1 or higher
- C# 9.0 or higher

## Dependencies

- Newtonsoft.Json 13.0.3+
- System.Net.Http 4.3.4+

## License

MIT

## Support

- Documentation: https://docs.nullstack.com
- GitHub: https://github.com/nullstack/nullstack
- Discord: https://discord.gg/nullstack
- Email: support@nullstack.com
