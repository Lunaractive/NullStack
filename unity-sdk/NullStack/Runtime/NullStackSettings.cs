using UnityEngine;

namespace NullStack
{
    [CreateAssetMenu(fileName = "NullStackSettings", menuName = "NullStack/Settings")]
    public class NullStackSettings : ScriptableObject
    {
        [Header("Server Configuration")]
        [Tooltip("Base URL for NullStack API (e.g., http://localhost:3001)")]
        public string baseUrl = "http://localhost:3001";

        [Header("Title Configuration")]
        [Tooltip("Your game's Title ID from NullStack Developer Portal")]
        public string titleId;

        [Tooltip("Your game's Secret Key from NullStack Developer Portal")]
        public string secretKey;

        [Header("Service Endpoints")]
        public string authServiceUrl = "http://localhost:3001";
        public string titleServiceUrl = "http://localhost:3002";
        public string playerServiceUrl = "http://localhost:3003";
        public string economyServiceUrl = "http://localhost:3004";
        public string cloudScriptServiceUrl = "http://localhost:3007";
        public string analyticsServiceUrl = "http://localhost:3009";
        public string leaderboardsServiceUrl = "http://localhost:3010";
        public string matchmakingServiceUrl = "http://localhost:4001";

        [Header("Debug Settings")]
        public bool enableDebugLogs = true;
        public bool logApiCalls = false;

        private static NullStackSettings _instance;
        public static NullStackSettings Instance
        {
            get
            {
                if (_instance == null)
                {
                    _instance = Resources.Load<NullStackSettings>("NullStackSettings");
                    if (_instance == null)
                    {
                        Debug.LogError("NullStackSettings asset not found in Resources folder!");
                    }
                }
                return _instance;
            }
        }

        public void Log(string message)
        {
            if (enableDebugLogs)
            {
                Debug.Log($"[NullStack] {message}");
            }
        }

        public void LogWarning(string message)
        {
            if (enableDebugLogs)
            {
                Debug.LogWarning($"[NullStack] {message}");
            }
        }

        public void LogError(string message)
        {
            Debug.LogError($"[NullStack] {message}");
        }
    }
}
