# NullStack Unity SDK

Complete Unity SDK for NullStack - The open-source backend services platform for indie game developers.

## Installation

### Unity Package Manager (UPM)

1. In Unity, go to `Window > Package Manager`
2. Click the `+` button and select `Add package from disk...`
3. Navigate to the `unity-sdk` folder and select `package.json`

### Manual Installation

1. Copy the entire `NullStack` folder into your Unity project's `Assets` folder
2. Unity will automatically import and compile the scripts

## Quick Start

### 1. Create NullStack Settings

1. In Unity, right-click in the Project window
2. Select `Create > NullStack > Settings`
3. Name it `NullStackSettings` and save it in `Assets/Resources/`
4. Configure your settings:
   - **Base URL**: Your NullStack server URL (e.g., `http://localhost:3001`)
   - **Title ID**: Your game's title ID from the Developer Portal
   - **Secret Key**: Your title's secret key (keep this secure!)
   - **Enable Logging**: Check for debug logs during development

### 2. Basic Authentication

```csharp
using UnityEngine;
using NullStack.API;
using NullStack.Models;

public class GameManager : MonoBehaviour
{
    void Start()
    {
        // Login with email and password
        StartCoroutine(NullStackClient.Instance.Authentication.Login(
            "player@example.com",
            "password123",
            OnLoginSuccess,
            OnLoginError
        ));
    }

    void OnLoginSuccess(LoginResponse response)
    {
        Debug.Log($"Logged in as {response.data.player.username}");
        // Player is now authenticated - session token is stored automatically
    }

    void OnLoginError(string error)
    {
        Debug.LogError($"Login failed: {error}");
    }
}
```

### 3. Device ID Login (Recommended for Mobile)

```csharp
string deviceId = SystemInfo.deviceUniqueIdentifier;

StartCoroutine(NullStackClient.Instance.Authentication.LoginWithCustomId(
    deviceId,
    createAccount: true, // Auto-create account if doesn't exist
    OnLoginSuccess,
    OnLoginError
));
```

## Features

### Authentication

```csharp
// Register new player
yield return NullStackClient.Instance.Authentication.Register(
    "player@example.com",
    "PlayerName",
    "password123",
    (response) => Debug.Log("Registered!"),
    (error) => Debug.LogError(error)
);

// Logout
NullStackClient.Instance.Authentication.Logout();

// Check if authenticated
bool isLoggedIn = NullStackClient.Instance.IsAuthenticated();
```

### Player Data

```csharp
// Get player profile
yield return NullStackClient.Instance.Player.GetPlayerProfile(
    (response) => {
        Debug.Log($"Username: {response.data.username}");
        Debug.Log($"Email: {response.data.email}");
    },
    (error) => Debug.LogError(error)
);

// Update player data
var data = new PlayerDataItem[]
{
    new PlayerDataItem { key = "level", value = "10" },
    new PlayerDataItem { key = "class", value = "warrior" }
};

yield return NullStackClient.Instance.Player.UpdatePlayerData(
    data,
    (response) => Debug.Log("Data saved!"),
    (error) => Debug.LogError(error)
);

// Get player data
yield return NullStackClient.Instance.Player.GetPlayerData(
    new string[] { "level", "class" },
    (response) => {
        foreach (var item in response.data.data)
        {
            Debug.Log($"{item.key}: {item.value}");
        }
    },
    (error) => Debug.LogError(error)
);
```

### CloudScript

Execute server-side code securely:

```csharp
var parameters = new Dictionary<string, object>
{
    { "itemId", "sword_legendary" },
    { "quantity", 1 }
};

yield return NullStackClient.Instance.CloudScript.ExecuteFunction(
    "GrantDailyReward",
    parameters,
    (response) => {
        Debug.Log($"CloudScript result: {response.data.result}");
        Debug.Log($"Logs: {string.Join("\n", response.data.logs)}");
    },
    (error) => Debug.LogError(error)
);
```

### Leaderboards

```csharp
// Update player score
yield return NullStackClient.Instance.Leaderboards.UpdatePlayerStatistic(
    "HighScore",
    1000,
    (response) => Debug.Log("Score updated!"),
    (error) => Debug.LogError(error)
);

// Get leaderboard
yield return NullStackClient.Instance.Leaderboards.GetLeaderboard(
    "HighScore",
    startPosition: 0,
    maxResults: 10,
    (response) => {
        foreach (var entry in response.data.leaderboard)
        {
            Debug.Log($"{entry.position}. {entry.displayName} - {entry.value}");
        }
    },
    (error) => Debug.LogError(error)
);

// Get leaderboard around current player
yield return NullStackClient.Instance.Leaderboards.GetLeaderboardAroundPlayer(
    "HighScore",
    maxResults: 10,
    (response) => {
        // Shows 10 entries centered around the player
        foreach (var entry in response.data.leaderboard)
        {
            Debug.Log($"{entry.position}. {entry.displayName} - {entry.value}");
        }
    },
    (error) => Debug.LogError(error)
);
```

### Virtual Economy

```csharp
// Get player currencies
yield return NullStackClient.Instance.Economy.GetPlayerCurrency(
    (response) => {
        foreach (var currency in response.data.currencies)
        {
            Debug.Log($"{currency.currencyCode}: {currency.amount}");
        }
    },
    (error) => Debug.LogError(error)
);

// Purchase item
yield return NullStackClient.Instance.Economy.PurchaseItem(
    "potion_health_001",
    "GOLD",
    50, // price
    (response) => {
        Debug.Log($"Purchased! Instance: {response.data.instanceId}");
    },
    (error) => Debug.LogError(error)
);

// Get inventory
yield return NullStackClient.Instance.Economy.GetPlayerInventory(
    (response) => {
        foreach (var item in response.data.items)
        {
            Debug.Log($"{item.itemId} x{item.quantity}");
        }
    },
    (error) => Debug.LogError(error)
);

// Consume item
yield return NullStackClient.Instance.Economy.ConsumeItem(
    "instance_12345",
    consumeCount: 1,
    (response) => Debug.Log("Item consumed!"),
    (error) => Debug.LogError(error)
);
```

### Matchmaking

```csharp
// Create matchmaking ticket
var attributes = new Dictionary<string, object>
{
    { "skill", 1200 },
    { "region", "us-west" }
};

yield return NullStackClient.Instance.Matchmaking.CreateMatchmakingTicket(
    "casual",
    attributes,
    (response) => {
        Debug.Log($"Ticket ID: {response.data.ticketId}");
        StartCoroutine(PollMatchStatus(response.data.ticketId));
    },
    (error) => Debug.LogError(error)
);

// Check ticket status
IEnumerator PollMatchStatus(string ticketId)
{
    bool matchFound = false;

    while (!matchFound)
    {
        yield return new WaitForSeconds(2f);

        yield return NullStackClient.Instance.Matchmaking.GetTicketStatus(
            ticketId,
            (response) => {
                if (response.data.status == "matched")
                {
                    matchFound = true;
                    Debug.Log($"Match found! Match ID: {response.data.matchId}");
                }
            },
            (error) => {
                matchFound = true;
                Debug.LogError(error);
            }
        );
    }
}

// Cancel ticket
yield return NullStackClient.Instance.Matchmaking.CancelTicket(
    ticketId,
    (response) => Debug.Log("Cancelled"),
    (error) => Debug.LogError(error)
);
```

### Analytics

```csharp
// Track custom event
var eventData = new Dictionary<string, object>
{
    { "level", 5 },
    { "score", 1000 },
    { "timeSpent", 120 }
};

yield return NullStackClient.Instance.Analytics.TrackEvent(
    "LevelCompleted",
    eventData,
    (response) => Debug.Log("Event tracked!"),
    (error) => Debug.LogError(error)
);
```

## Advanced Usage

### Error Handling

All API methods use callbacks for success and error handling:

```csharp
yield return NullStackClient.Instance.Player.GetPlayerProfile(
    (response) => {
        // Success - response contains data
        if (response.success)
        {
            Debug.Log($"Player: {response.data.username}");
        }
    },
    (error) => {
        // Error - handle failure
        Debug.LogError($"API Error: {error}");
        // Show error message to player
        ShowErrorDialog(error);
    }
);
```

### Session Management

The SDK automatically manages session tokens:

```csharp
// Check if player is authenticated
if (NullStackClient.Instance.IsAuthenticated())
{
    // Player is logged in
    Debug.Log("Player is authenticated");
}

// Get current session token (advanced usage)
string token = NullStackClient.Instance.GetSessionToken();

// Logout (clears session)
NullStackClient.Instance.Logout();
```

### Debugging

Enable detailed logging in NullStackSettings:

1. Select your NullStackSettings asset
2. Check "Enable Logging"
3. Check "Log API Calls" to see all HTTP requests

Logs will appear in the Unity Console with the `[NullStack]` prefix.

## API Reference

### Authentication API
- `Login(email, password, onSuccess, onError)`
- `Register(email, username, password, onSuccess, onError)`
- `LoginWithCustomId(customId, createAccount, onSuccess, onError)`
- `Logout()`

### Player API
- `GetPlayerProfile(onSuccess, onError)`
- `UpdatePlayerProfile(displayName, onSuccess, onError)`
- `GetPlayerData(keys, onSuccess, onError)`
- `UpdatePlayerData(data, onSuccess, onError)`
- `GetStatistics(onSuccess, onError)`
- `UpdateStatistics(statistics, onSuccess, onError)`

### CloudScript API
- `ExecuteFunction(functionName, parameters, onSuccess, onError)`
- `ListFunctions(onSuccess, onError)`
- `GetExecutionHistory(limit, onSuccess, onError)`

### Leaderboard API
- `GetLeaderboard(name, startPosition, maxResults, onSuccess, onError)`
- `GetLeaderboardAroundPlayer(name, maxResults, onSuccess, onError)`
- `UpdatePlayerStatistic(statisticName, value, onSuccess, onError)`
- `GetPlayerRank(leaderboardName, onSuccess, onError)`

### Economy API
- `GetPlayerCurrency(onSuccess, onError)`
- `AddPlayerCurrency(currencyCode, amount, onSuccess, onError)`
- `SubtractPlayerCurrency(currencyCode, amount, onSuccess, onError)`
- `GetCatalogItems(onSuccess, onError)`
- `GetPlayerInventory(onSuccess, onError)`
- `PurchaseItem(itemId, currencyCode, price, onSuccess, onError)`
- `ConsumeItem(instanceId, consumeCount, onSuccess, onError)`
- `GrantItemToPlayer(itemId, onSuccess, onError)`

### Matchmaking API
- `CreateMatchmakingTicket(queueName, attributes, onSuccess, onError)`
- `GetTicketStatus(ticketId, onSuccess, onError)`
- `CancelTicket(ticketId, onSuccess, onError)`
- `GetMatchDetails(matchId, onSuccess, onError)`
- `ListActiveMatches(onSuccess, onError)`

### Analytics API
- `TrackEvent(eventName, eventData, onSuccess, onError)`
- `TrackCustomEvent(eventName, eventType, properties, onSuccess, onError)`
- `GetPlayerEvents(limit, onSuccess, onError)`
- `GetAnalyticsSummary(startDate, endDate, onSuccess, onError)`

## Examples

Check the `Examples` folder for complete working examples:
- `NullStackExample.cs` - Comprehensive examples of all features

## Support

- Documentation: [NullStack Docs](http://localhost:3006)
- GitHub: [NullStack Repository](https://github.com/lunaractive/nullstack)
- Issues: Report bugs and request features on GitHub

## License

MIT License - See LICENSE file for details

## About NullStack

NullStack is an open-source PlayFab alternative built for indie game developers. Self-host anywhere, no per-MAU fees, complete transparency.

A product of **Lunaractive**.
