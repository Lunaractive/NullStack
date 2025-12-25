using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace NullStack.SDK
{
    // ============================================================================
    // Configuration
    // ============================================================================

    public class NullStackConfig
    {
        public string TitleId { get; set; } = string.Empty;
        public string ApiUrl { get; set; } = "https://api.nullstack.com";
        public int Timeout { get; set; } = 30000;
        public int RetryAttempts { get; set; } = 3;
        public int RetryDelay { get; set; } = 1000;
    }

    // ============================================================================
    // Authentication
    // ============================================================================

    public class LoginWithEmailRequest
    {
        [JsonProperty("email")]
        public string Email { get; set; } = string.Empty;

        [JsonProperty("password")]
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        [JsonProperty("email")]
        public string Email { get; set; } = string.Empty;

        [JsonProperty("password")]
        public string Password { get; set; } = string.Empty;

        [JsonProperty("username")]
        public string? Username { get; set; }

        [JsonProperty("displayName")]
        public string? DisplayName { get; set; }
    }

    public class LoginAnonymousRequest
    {
        [JsonProperty("deviceId")]
        public string? DeviceId { get; set; }

        [JsonProperty("createAccount")]
        public bool CreateAccount { get; set; } = true;
    }

    public class AuthResponse
    {
        [JsonProperty("playerId")]
        public string PlayerId { get; set; } = string.Empty;

        [JsonProperty("sessionToken")]
        public string SessionToken { get; set; } = string.Empty;

        [JsonProperty("entityToken")]
        public string EntityToken { get; set; } = string.Empty;

        [JsonProperty("newlyCreated")]
        public bool NewlyCreated { get; set; }
    }

    // ============================================================================
    // Player Data
    // ============================================================================

    public class PlayerProfile
    {
        [JsonProperty("playerId")]
        public string PlayerId { get; set; } = string.Empty;

        [JsonProperty("displayName")]
        public string? DisplayName { get; set; }

        [JsonProperty("username")]
        public string? Username { get; set; }

        [JsonProperty("email")]
        public string? Email { get; set; }

        [JsonProperty("created")]
        public string Created { get; set; } = string.Empty;

        [JsonProperty("lastLogin")]
        public string LastLogin { get; set; } = string.Empty;

        [JsonProperty("statistics")]
        public Dictionary<string, int>? Statistics { get; set; }

        [JsonProperty("tags")]
        public List<string>? Tags { get; set; }
    }

    public class UpdateProfileRequest
    {
        [JsonProperty("displayName")]
        public string? DisplayName { get; set; }

        [JsonProperty("avatarUrl")]
        public string? AvatarUrl { get; set; }
    }

    public class GetDataRequest
    {
        [JsonProperty("keys")]
        public List<string>? Keys { get; set; }
    }

    public class SetDataRequest
    {
        [JsonProperty("data")]
        public Dictionary<string, object> Data { get; set; } = new Dictionary<string, object>();

        [JsonProperty("permission")]
        public string Permission { get; set; } = "Private";
    }

    public class PlayerData
    {
        [JsonProperty("data")]
        public Dictionary<string, PlayerDataValue> Data { get; set; } = new Dictionary<string, PlayerDataValue>();
    }

    public class PlayerDataValue
    {
        [JsonProperty("value")]
        public object? Value { get; set; }

        [JsonProperty("lastUpdated")]
        public string LastUpdated { get; set; } = string.Empty;

        [JsonProperty("permission")]
        public string Permission { get; set; } = string.Empty;
    }

    // ============================================================================
    // Economy
    // ============================================================================

    public class Currency
    {
        [JsonProperty("code")]
        public string Code { get; set; } = string.Empty;

        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("initialDeposit")]
        public int InitialDeposit { get; set; }
    }

    public class PlayerCurrency
    {
        [JsonProperty("currencyCode")]
        public string CurrencyCode { get; set; } = string.Empty;

        [JsonProperty("amount")]
        public int Amount { get; set; }
    }

    public class CatalogItem
    {
        [JsonProperty("itemId")]
        public string ItemId { get; set; } = string.Empty;

        [JsonProperty("itemClass")]
        public string ItemClass { get; set; } = string.Empty;

        [JsonProperty("displayName")]
        public string DisplayName { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("virtualCurrencyPrices")]
        public Dictionary<string, int>? VirtualCurrencyPrices { get; set; }

        [JsonProperty("realCurrencyPrices")]
        public Dictionary<string, int>? RealCurrencyPrices { get; set; }

        [JsonProperty("tags")]
        public List<string>? Tags { get; set; }

        [JsonProperty("customData")]
        public Dictionary<string, object>? CustomData { get; set; }

        [JsonProperty("isStackable")]
        public bool IsStackable { get; set; }

        [JsonProperty("isLimitedEdition")]
        public bool IsLimitedEdition { get; set; }

        [JsonProperty("initialLimitedEditionCount")]
        public int? InitialLimitedEditionCount { get; set; }
    }

    public class PurchaseItemRequest
    {
        [JsonProperty("itemId")]
        public string ItemId { get; set; } = string.Empty;

        [JsonProperty("currencyCode")]
        public string CurrencyCode { get; set; } = string.Empty;

        [JsonProperty("price")]
        public int Price { get; set; }
    }

    public class PurchaseItemResponse
    {
        [JsonProperty("itemInstanceId")]
        public string ItemInstanceId { get; set; } = string.Empty;

        [JsonProperty("remainingUses")]
        public int? RemainingUses { get; set; }

        [JsonProperty("purchaseDate")]
        public string PurchaseDate { get; set; } = string.Empty;
    }

    public class InventoryItem
    {
        [JsonProperty("itemInstanceId")]
        public string ItemInstanceId { get; set; } = string.Empty;

        [JsonProperty("itemId")]
        public string ItemId { get; set; } = string.Empty;

        [JsonProperty("itemClass")]
        public string ItemClass { get; set; } = string.Empty;

        [JsonProperty("displayName")]
        public string DisplayName { get; set; } = string.Empty;

        [JsonProperty("purchaseDate")]
        public string PurchaseDate { get; set; } = string.Empty;

        [JsonProperty("remainingUses")]
        public int? RemainingUses { get; set; }

        [JsonProperty("annotation")]
        public string? Annotation { get; set; }

        [JsonProperty("customData")]
        public Dictionary<string, object>? CustomData { get; set; }
    }

    public class ConsumeItemRequest
    {
        [JsonProperty("itemInstanceId")]
        public string ItemInstanceId { get; set; } = string.Empty;

        [JsonProperty("consumeCount")]
        public int ConsumeCount { get; set; } = 1;
    }

    public class ConsumeItemResponse
    {
        [JsonProperty("itemInstanceId")]
        public string ItemInstanceId { get; set; } = string.Empty;

        [JsonProperty("remainingUses")]
        public int RemainingUses { get; set; }
    }

    // ============================================================================
    // Leaderboards
    // ============================================================================

    public class LeaderboardEntry
    {
        [JsonProperty("position")]
        public int Position { get; set; }

        [JsonProperty("playerId")]
        public string PlayerId { get; set; } = string.Empty;

        [JsonProperty("displayName")]
        public string? DisplayName { get; set; }

        [JsonProperty("score")]
        public int Score { get; set; }

        [JsonProperty("metadata")]
        public Dictionary<string, object>? Metadata { get; set; }
    }

    public class GetLeaderboardRequest
    {
        [JsonProperty("statisticName")]
        public string StatisticName { get; set; } = string.Empty;

        [JsonProperty("startPosition")]
        public int StartPosition { get; set; } = 0;

        [JsonProperty("maxResults")]
        public int MaxResults { get; set; } = 100;
    }

    public class GetLeaderboardResponse
    {
        [JsonProperty("leaderboard")]
        public List<LeaderboardEntry> Leaderboard { get; set; } = new List<LeaderboardEntry>();

        [JsonProperty("version")]
        public int Version { get; set; }

        [JsonProperty("nextReset")]
        public string? NextReset { get; set; }
    }

    public class SubmitScoreRequest
    {
        [JsonProperty("statisticName")]
        public string StatisticName { get; set; } = string.Empty;

        [JsonProperty("value")]
        public int Value { get; set; }

        [JsonProperty("metadata")]
        public Dictionary<string, object>? Metadata { get; set; }
    }

    public class SubmitScoreResponse
    {
        [JsonProperty("position")]
        public int Position { get; set; }

        [JsonProperty("value")]
        public int Value { get; set; }
    }

    // ============================================================================
    // CloudScript
    // ============================================================================

    public class ExecuteCloudScriptRequest
    {
        [JsonProperty("functionName")]
        public string FunctionName { get; set; } = string.Empty;

        [JsonProperty("functionParameter")]
        public object? FunctionParameter { get; set; }

        [JsonProperty("generatePlayStreamEvent")]
        public bool GeneratePlayStreamEvent { get; set; } = false;
    }

    public class ExecuteCloudScriptResponse
    {
        [JsonProperty("functionResult")]
        public object? FunctionResult { get; set; }

        [JsonProperty("logs")]
        public List<CloudScriptLog>? Logs { get; set; }

        [JsonProperty("executionTimeSeconds")]
        public double ExecutionTimeSeconds { get; set; }

        [JsonProperty("processorTimeSeconds")]
        public double ProcessorTimeSeconds { get; set; }

        [JsonProperty("memoryConsumedBytes")]
        public long MemoryConsumedBytes { get; set; }

        [JsonProperty("apiRequestsIssued")]
        public int ApiRequestsIssued { get; set; }

        [JsonProperty("httpRequestsIssued")]
        public int HttpRequestsIssued { get; set; }

        [JsonProperty("error")]
        public CloudScriptError? Error { get; set; }
    }

    public class CloudScriptLog
    {
        [JsonProperty("level")]
        public string Level { get; set; } = string.Empty;

        [JsonProperty("message")]
        public string Message { get; set; } = string.Empty;
    }

    public class CloudScriptError
    {
        [JsonProperty("error")]
        public string Error { get; set; } = string.Empty;

        [JsonProperty("message")]
        public string Message { get; set; } = string.Empty;

        [JsonProperty("stackTrace")]
        public string? StackTrace { get; set; }
    }

    // ============================================================================
    // Analytics
    // ============================================================================

    public class TrackEventRequest
    {
        [JsonProperty("eventName")]
        public string EventName { get; set; } = string.Empty;

        [JsonProperty("properties")]
        public Dictionary<string, object>? Properties { get; set; }

        [JsonProperty("timestamp")]
        public string? Timestamp { get; set; }
    }

    // ============================================================================
    // Error Handling
    // ============================================================================

    public class NullStackError : Exception
    {
        public string Code { get; set; }
        public int Status { get; set; }
        public object? Details { get; set; }

        public NullStackError(string code, string message, int status = 500, object? details = null)
            : base(message)
        {
            Code = code;
            Status = status;
            Details = details;
        }
    }

    // ============================================================================
    // API Response
    // ============================================================================

    public class ApiResponse<T>
    {
        [JsonProperty("data")]
        public T? Data { get; set; }

        [JsonProperty("code")]
        public int Code { get; set; }
    }
}
