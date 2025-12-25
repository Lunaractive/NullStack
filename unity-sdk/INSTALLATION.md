# NullStack Unity SDK - Installation Guide

## Prerequisites

- Unity 2020.3 or later
- NullStack server running (local or remote)
- Title ID and Secret Key from NullStack Developer Portal

## Installation Methods

### Method 1: Unity Package Manager (Recommended)

1. Open your Unity project
2. Open the Package Manager: `Window > Package Manager`
3. Click the `+` button in the top-left corner
4. Select `Add package from disk...`
5. Navigate to `unity-sdk` folder and select `package.json`
6. Click `Open`

Unity will automatically import the NullStack SDK.

### Method 2: Manual Installation

1. Copy the entire `unity-sdk/NullStack` folder
2. Paste it into your Unity project's `Assets` folder
3. Unity will automatically compile the scripts

## Configuration

### Step 1: Create Settings Asset

1. In Unity Project window, right-click in any folder
2. Select `Create > NullStack > Settings`
3. Name the file `NullStackSettings`
4. **IMPORTANT**: Move this file to `Assets/Resources/` folder
   - If `Resources` folder doesn't exist, create it in `Assets/`
   - The SDK looks for settings in `Resources/NullStackSettings`

### Step 2: Configure Settings

Select the `NullStackSettings` asset and configure:

#### Server Configuration
- **Base URL**: Your NullStack server URL
  - Local: `http://localhost:3001`
  - Production: `https://your-server.com`

#### Title Configuration
- **Title ID**: From Developer Portal (e.g., `title_abc123`)
- **Secret Key**: From Developer Portal (keep this secure!)

#### Endpoints (Default values should work)
- Auth Endpoint: `/api/v1/auth`
- Player Endpoint: `/api/v1/players`
- CloudScript Endpoint: `/api/v1/cloudscript`
- Leaderboard Endpoint: `/api/v1/leaderboard`
- Economy Endpoint: `/api/v1/economy`
- Matchmaking Endpoint: `/api/v1/matchmaking`
- Analytics Endpoint: `/api/v1/analytics`

#### Debug Settings
- **Enable Logging**: Check this during development
- **Log API Calls**: Check to see all HTTP requests in console

## Verification

Create a test script to verify the SDK is working:

```csharp
using UnityEngine;
using NullStack.API;

public class SDKTest : MonoBehaviour
{
    void Start()
    {
        // Check if SDK is initialized
        if (NullStackClient.Instance != null)
        {
            Debug.Log("NullStack SDK initialized successfully!");
        }
        else
        {
            Debug.LogError("Failed to initialize NullStack SDK");
        }
    }
}
```

Attach this script to a GameObject in your scene and press Play.

## First API Call

Test authentication with this example:

```csharp
using UnityEngine;
using NullStack.API;

public class LoginTest : MonoBehaviour
{
    void Start()
    {
        string deviceId = SystemInfo.deviceUniqueIdentifier;

        StartCoroutine(NullStackClient.Instance.Authentication.LoginWithCustomId(
            deviceId,
            createAccount: true,
            (response) => {
                Debug.Log("Login successful!");
                Debug.Log($"Player ID: {response.data.player.id}");
            },
            (error) => {
                Debug.LogError($"Login failed: {error}");
            }
        ));
    }
}
```

## Troubleshooting

### "NullStackSettings not found"
- Ensure `NullStackSettings` asset is in `Assets/Resources/` folder
- Name must be exactly `NullStackSettings`

### "Connection refused" or network errors
- Verify your Base URL is correct
- Check that NullStack server is running
- For localhost, ensure Unity can access `http://localhost:3001`

### "Invalid Title ID"
- Verify Title ID and Secret Key in settings
- Check they match values in Developer Portal

### Compilation errors
- Ensure Unity version is 2020.3 or later
- Check that all SDK files were imported correctly

## Security Best Practices

### Development
- Use localhost URLs during development
- Keep Secret Key in settings asset (not committed to version control)

### Production
- Use HTTPS for production servers
- Consider using backend calls for Secret Key operations
- Never expose Secret Key in client builds if possible
- Use environment-specific settings assets

## Next Steps

- Read the [README.md](README.md) for full API documentation
- Check [Examples/NullStackExample.cs](NullStack/Examples/NullStackExample.cs) for code samples
- Visit Developer Portal to configure your title

## Support

- Documentation: http://localhost:3006
- GitHub Issues: Report bugs and request features
- Discord: Join the community (link in main repo)

---

**NullStack** - A product of Lunaractive
