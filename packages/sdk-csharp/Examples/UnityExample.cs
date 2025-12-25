/**
 * NullStack C# SDK - Unity Integration Example
 *
 * This example shows how to integrate NullStack into a Unity game.
 * Attach this script to a GameObject in your scene.
 */

using UnityEngine;
using UnityEngine.UI;
using NullStack.SDK;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public class NullStackExample : MonoBehaviour
{
    [Header("UI Elements")]
    [SerializeField] private Text statusText;
    [SerializeField] private Text playerNameText;
    [SerializeField] private Text levelText;
    [SerializeField] private Text goldText;
    [SerializeField] private Button loginButton;
    [SerializeField] private Button saveProgressButton;

    private NullStackClient client;
    private int currentLevel = 1;
    private int currentExperience = 0;

    async void Start()
    {
        // Initialize NullStack client
        client = new NullStackClient(new NullStackConfig
        {
            TitleId = "your-title-id",
            ApiUrl = "https://api.nullstack.com"
        });

        // Setup UI
        if (loginButton != null)
            loginButton.onClick.AddListener(() => OnLoginClicked());

        if (saveProgressButton != null)
            saveProgressButton.onClick.AddListener(() => OnSaveProgressClicked());

        // Auto-login on start
        await AutoLogin();
    }

    // ============================================================================
    // AUTHENTICATION
    // ============================================================================

    async Task AutoLogin()
    {
        UpdateStatus("Logging in...");

        try
        {
            // Use device unique identifier for anonymous login
            var auth = await client.LoginAnonymousAsync(new LoginAnonymousRequest
            {
                DeviceId = SystemInfo.deviceUniqueIdentifier,
                CreateAccount = true
            });

            if (auth.NewlyCreated)
            {
                UpdateStatus("Welcome, new player!");
                await InitializeNewPlayer();
            }
            else
            {
                UpdateStatus("Welcome back!");
                await LoadPlayerData();
            }

            Debug.Log($"Logged in as Player ID: {auth.PlayerId}");
        }
        catch (NullStackError error)
        {
            UpdateStatus($"Login failed: {error.Message}");
            Debug.LogError($"Login Error [{error.Code}]: {error.Message}");
        }
    }

    async void OnLoginClicked()
    {
        await AutoLogin();
    }

    // ============================================================================
    // PLAYER INITIALIZATION
    // ============================================================================

    async Task InitializeNewPlayer()
    {
        try
        {
            // Set initial player data
            await client.SetDataAsync(new SetDataRequest
            {
                Data = new Dictionary<string, object>
                {
                    { "level", 1 },
                    { "experience", 0 },
                    { "created", DateTime.UtcNow.ToString("O") },
                    { "settings", new { soundEnabled = true, musicVolume = 1.0f } }
                },
                Permission = "Private"
            });

            // Update profile
            await client.UpdateProfileAsync(new UpdateProfileRequest
            {
                DisplayName = "New Player"
            });

            // Track new player event
            await client.TrackEventAsync(new TrackEventRequest
            {
                EventName = "new_player_created",
                Properties = new Dictionary<string, object>
                {
                    { "device", SystemInfo.deviceModel },
                    { "platform", Application.platform.ToString() }
                }
            });

            currentLevel = 1;
            currentExperience = 0;
            UpdateUI();
        }
        catch (NullStackError error)
        {
            Debug.LogError($"Initialization Error: {error.Message}");
        }
    }

    // ============================================================================
    // PLAYER DATA
    // ============================================================================

    async Task LoadPlayerData()
    {
        try
        {
            // Get profile
            var profile = await client.GetProfileAsync();
            if (playerNameText != null)
                playerNameText.text = profile.DisplayName ?? "Anonymous";

            // Get player data
            var data = await client.GetDataAsync(new GetDataRequest
            {
                Keys = new List<string> { "level", "experience" }
            });

            if (data.Data.TryGetValue("level", out var levelValue))
            {
                currentLevel = Convert.ToInt32(levelValue.Value);
            }

            if (data.Data.TryGetValue("experience", out var xpValue))
            {
                currentExperience = Convert.ToInt32(xpValue.Value);
            }

            // Get currencies
            var currencies = await client.GetCurrenciesAsync();
            var gold = currencies.Find(c => c.CurrencyCode == "GO");
            if (goldText != null)
                goldText.text = $"Gold: {gold?.Amount ?? 0}";

            UpdateUI();
        }
        catch (NullStackError error)
        {
            Debug.LogError($"Load Data Error: {error.Message}");
        }
    }

    async void OnSaveProgressClicked()
    {
        await SaveProgress();
    }

    async Task SaveProgress()
    {
        try
        {
            UpdateStatus("Saving progress...");

            await client.SetDataAsync(new SetDataRequest
            {
                Data = new Dictionary<string, object>
                {
                    { "level", currentLevel },
                    { "experience", currentExperience },
                    { "lastSaved", DateTime.UtcNow.ToString("O") }
                }
            });

            UpdateStatus("Progress saved!");
            Debug.Log("Progress saved successfully");
        }
        catch (NullStackError error)
        {
            UpdateStatus($"Save failed: {error.Message}");
            Debug.LogError($"Save Error: {error.Message}");
        }
    }

    // ============================================================================
    // GAME ACTIONS
    // ============================================================================

    public async void OnLevelCompleted(int earnedXP, int earnedGold)
    {
        try
        {
            // Update local state
            currentExperience += earnedXP;
            int xpForNextLevel = currentLevel * 1000;

            // Level up check
            if (currentExperience >= xpForNextLevel)
            {
                currentLevel++;
                currentExperience -= xpForNextLevel;
                await OnLevelUp();
            }

            // Save progress
            await SaveProgress();

            // Submit to leaderboard
            await client.SubmitScoreAsync(new SubmitScoreRequest
            {
                StatisticName = "PlayerLevel",
                Value = currentLevel
            });

            // Track analytics
            await client.TrackEventAsync(new TrackEventRequest
            {
                EventName = "level_completed",
                Properties = new Dictionary<string, object>
                {
                    { "level", currentLevel },
                    { "earnedXP", earnedXP },
                    { "earnedGold", earnedGold }
                }
            });

            UpdateUI();
        }
        catch (NullStackError error)
        {
            Debug.LogError($"Level Complete Error: {error.Message}");
        }
    }

    async Task OnLevelUp()
    {
        try
        {
            UpdateStatus($"Level Up! You are now level {currentLevel}");

            // Execute CloudScript for level up rewards
            var result = await client.ExecuteAsync(new ExecuteCloudScriptRequest
            {
                FunctionName = "grantLevelUpReward",
                FunctionParameter = new { level = currentLevel }
            });

            Debug.Log($"Level up rewards: {result.FunctionResult}");

            // Track level up event
            await client.TrackEventAsync(new TrackEventRequest
            {
                EventName = "level_up",
                Properties = new Dictionary<string, object>
                {
                    { "newLevel", currentLevel },
                    { "timestamp", DateTime.UtcNow.ToString("O") }
                }
            });
        }
        catch (NullStackError error)
        {
            Debug.LogError($"Level Up Error: {error.Message}");
        }
    }

    // ============================================================================
    // ECONOMY
    // ============================================================================

    public async void OnPurchaseItem(string itemId, string currencyCode, int price)
    {
        try
        {
            UpdateStatus("Purchasing item...");

            var purchase = await client.PurchaseItemAsync(new PurchaseItemRequest
            {
                ItemId = itemId,
                CurrencyCode = currencyCode,
                Price = price
            });

            UpdateStatus($"Purchased: {itemId}");
            Debug.Log($"Item purchased: {purchase.ItemInstanceId}");

            // Reload currencies
            await LoadPlayerData();

            // Track purchase
            await client.TrackEventAsync(new TrackEventRequest
            {
                EventName = "item_purchased",
                Properties = new Dictionary<string, object>
                {
                    { "itemId", itemId },
                    { "price", price },
                    { "currency", currencyCode }
                }
            });
        }
        catch (NullStackError error)
        {
            if (error.Code == "INSUFFICIENT_FUNDS")
            {
                UpdateStatus("Not enough currency!");
            }
            else
            {
                UpdateStatus($"Purchase failed: {error.Message}");
            }
            Debug.LogError($"Purchase Error: {error.Message}");
        }
    }

    public async void ShowInventory()
    {
        try
        {
            var inventory = await client.GetInventoryAsync();
            Debug.Log($"You have {inventory.Count} items:");

            foreach (var item in inventory)
            {
                Debug.Log($"- {item.DisplayName} ({item.ItemClass})");
                if (item.RemainingUses.HasValue)
                {
                    Debug.Log($"  Remaining Uses: {item.RemainingUses}");
                }
            }
        }
        catch (NullStackError error)
        {
            Debug.LogError($"Inventory Error: {error.Message}");
        }
    }

    // ============================================================================
    // LEADERBOARDS
    // ============================================================================

    public async void ShowLeaderboard(string statisticName)
    {
        try
        {
            var leaderboard = await client.GetLeaderboardAsync(new GetLeaderboardRequest
            {
                StatisticName = statisticName,
                StartPosition = 0,
                MaxResults = 10
            });

            Debug.Log($"=== {statisticName} Leaderboard ===");
            foreach (var entry in leaderboard.Leaderboard)
            {
                Debug.Log($"{entry.Position}. {entry.DisplayName}: {entry.Score}");
            }
        }
        catch (NullStackError error)
        {
            Debug.LogError($"Leaderboard Error: {error.Message}");
        }
    }

    // ============================================================================
    // UI UPDATES
    // ============================================================================

    void UpdateUI()
    {
        if (levelText != null)
            levelText.text = $"Level: {currentLevel}";
    }

    void UpdateStatus(string message)
    {
        if (statusText != null)
            statusText.text = message;
        Debug.Log($"Status: {message}");
    }

    // ============================================================================
    // UNITY LIFECYCLE
    // ============================================================================

    async void OnApplicationPause(bool pauseStatus)
    {
        if (pauseStatus)
        {
            // Save when app goes to background
            await SaveProgress();
        }
    }

    async void OnApplicationQuit()
    {
        // Save before quitting
        await SaveProgress();

        // Track session end
        try
        {
            await client.TrackEventAsync(new TrackEventRequest
            {
                EventName = "session_end",
                Properties = new Dictionary<string, object>
                {
                    { "duration", Time.realtimeSinceStartup }
                }
            });
        }
        catch (Exception ex)
        {
            Debug.LogError($"Failed to track session end: {ex.Message}");
        }

        // Cleanup
        client?.Dispose();
    }

    void OnDestroy()
    {
        client?.Dispose();
    }
}
