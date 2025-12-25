# NullStack Unity SDK - Quick Start Guide

Get up and running with NullStack in under 5 minutes.

## 1. Install the SDK

In Unity:
1. `Window > Package Manager`
2. Click `+` → `Add package from disk...`
3. Select `unity-sdk/package.json`

## 2. Create Settings

1. Right-click in Project → `Create > NullStack > Settings`
2. Save as `NullStackSettings` in `Assets/Resources/`
3. Configure:
   - Base URL: `http://localhost:3001`
   - Title ID: (from Developer Portal)
   - Secret Key: (from Developer Portal)

## 3. Login Player

Create a script called `GameLogin.cs`:

```csharp
using UnityEngine;
using NullStack.API;

public class GameLogin : MonoBehaviour
{
    void Start()
    {
        // Login with device ID (auto-creates account)
        string deviceId = SystemInfo.deviceUniqueIdentifier;

        StartCoroutine(NullStackClient.Instance.Authentication.LoginWithCustomId(
            deviceId,
            createAccount: true,
            OnLoginSuccess,
            OnLoginError
        ));
    }

    void OnLoginSuccess(NullStack.Models.LoginResponse response)
    {
        Debug.Log($"✓ Logged in as {response.data.player.username}");
        // Player is authenticated - start your game!
    }

    void OnLoginError(string error)
    {
        Debug.LogError($"✗ Login failed: {error}");
    }
}
```

Attach to a GameObject and press Play!

## 4. Common Tasks

### Save Player Data

```csharp
var data = new NullStack.Models.PlayerDataItem[]
{
    new NullStack.Models.PlayerDataItem { key = "level", value = "5" },
    new NullStack.Models.PlayerDataItem { key = "gold", value = "1000" }
};

yield return NullStackClient.Instance.Player.UpdatePlayerData(
    data,
    (response) => Debug.Log("Saved!"),
    (error) => Debug.LogError(error)
);
```

### Update Leaderboard

```csharp
yield return NullStackClient.Instance.Leaderboards.UpdatePlayerStatistic(
    "HighScore",
    1000,
    (response) => Debug.Log("Score updated!"),
    (error) => Debug.LogError(error)
);
```

### Track Analytics

```csharp
var eventData = new Dictionary<string, object>
{
    { "level", 5 },
    { "score", 1000 }
};

yield return NullStackClient.Instance.Analytics.TrackEvent(
    "LevelCompleted",
    eventData,
    (response) => Debug.Log("Event tracked!"),
    (error) => Debug.LogError(error)
);
```

## 5. Next Steps

- [Full Documentation](README.md) - Complete API reference
- [Examples](NullStack/Examples/NullStackExample.cs) - Code samples for all features
- [Installation Guide](INSTALLATION.md) - Detailed setup instructions

## Common Patterns

### Check Authentication

```csharp
if (NullStackClient.Instance.IsAuthenticated())
{
    // Player is logged in
}
```

### Logout

```csharp
NullStackClient.Instance.Logout();
```

### Error Handling

```csharp
yield return NullStackClient.Instance.Player.GetPlayerProfile(
    (response) => {
        // Success
        Debug.Log($"Player: {response.data.username}");
    },
    (error) => {
        // Error
        Debug.LogError($"Failed: {error}");
        ShowErrorToPlayer(error);
    }
);
```

## Tips

- Enable logging in NullStackSettings during development
- All API calls use coroutines - must be called with `StartCoroutine()`
- Session tokens are managed automatically
- Use `LoginWithCustomId()` for mobile games (simplest)
- Use `Login()` for email/password authentication

---

**You're ready to build!** Check the full docs for advanced features like CloudScript, Matchmaking, and Virtual Economy.
