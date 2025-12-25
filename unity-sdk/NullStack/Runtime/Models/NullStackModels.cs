using System;
using System.Collections.Generic;

namespace NullStack.Models
{
    [Serializable]
    public class LoginRequest
    {
        public string email;
        public string password;
    }

    [Serializable]
    public class RegisterRequest
    {
        public string email;
        public string password;
        public string username;
    }

    [Serializable]
    public class LoginResponse
    {
        public bool success;
        public LoginData data;
    }

    [Serializable]
    public class LoginData
    {
        public string accessToken;
        public string refreshToken;
        public PlayerData player;
    }

    [Serializable]
    public class PlayerData
    {
        public string id;
        public string email;
        public string username;
        public string titleId;
        public bool isBanned;
        public string createdAt;
    }

    [Serializable]
    public class CloudScriptExecuteRequest
    {
        public string functionName;
        public Dictionary<string, object> args;
    }

    [Serializable]
    public class CloudScriptExecuteResponse
    {
        public bool success;
        public object data;
        public CloudScriptError error;
    }

    [Serializable]
    public class CloudScriptError
    {
        public string code;
        public string message;
    }

    [Serializable]
    public class GetLeaderboardRequest
    {
        public string leaderboardId;
        public int maxResults = 100;
    }

    [Serializable]
    public class LeaderboardResponse
    {
        public bool success;
        public LeaderboardData data;
    }

    [Serializable]
    public class LeaderboardData
    {
        public List<LeaderboardEntry> entries;
        public int total;
    }

    [Serializable]
    public class LeaderboardEntry
    {
        public int position;
        public string playerId;
        public string username;
        public int score;
        public string updatedAt;
    }

    [Serializable]
    public class UpdateLeaderboardRequest
    {
        public string leaderboardId;
        public int score;
    }

    [Serializable]
    public class VirtualCurrencyBalance
    {
        public string currencyCode;
        public int balance;
    }

    [Serializable]
    public class GetPlayerDataResponse
    {
        public bool success;
        public PlayerDataInfo data;
    }

    [Serializable]
    public class PlayerDataInfo
    {
        public string playerId;
        public Dictionary<string, string> data;
    }

    [Serializable]
    public class UpdatePlayerDataRequest
    {
        public Dictionary<string, string> data;
    }

    [Serializable]
    public class CatalogItem
    {
        public string itemId;
        public string displayName;
        public string description;
        public string itemClass;
        public Dictionary<string, int> prices;
        public List<string> tags;
    }

    [Serializable]
    public class PurchaseItemRequest
    {
        public string itemId;
        public string currencyCode;
        public int price;
    }

    [Serializable]
    public class MatchmakingTicketRequest
    {
        public string queueName;
        public Dictionary<string, object> attributes;
    }

    [Serializable]
    public class MatchmakingTicketResponse
    {
        public bool success;
        public MatchmakingTicketData data;
    }

    [Serializable]
    public class MatchmakingTicketData
    {
        public string ticketId;
        public string status;
        public string queueName;
        public string matchId;
        public string createdAt;
    }

    [Serializable]
    public class AnalyticsEvent
    {
        public string eventName;
        public Dictionary<string, object> properties;
    }

    [Serializable]
    public class ErrorResponse
    {
        public bool success;
        public ErrorData error;
    }

    [Serializable]
    public class ErrorData
    {
        public string code;
        public string message;
        public object details;
    }
}
