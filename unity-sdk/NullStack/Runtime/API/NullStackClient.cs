using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using NullStack.Models;

namespace NullStack.API
{
    public class NullStackClient : MonoBehaviour
    {
        private static NullStackClient _instance;
        public static NullStackClient Instance
        {
            get
            {
                if (_instance == null)
                {
                    GameObject go = new GameObject("NullStackClient");
                    _instance = go.AddComponent<NullStackClient>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }

        private string _sessionToken;
        private NullStackSettings Settings => NullStackSettings.Instance;

        // Service APIs
        public AuthenticationAPI Authentication { get; private set; }
        public PlayerAPI Player { get; private set; }
        public CloudScriptAPI CloudScript { get; private set; }
        public LeaderboardAPI Leaderboards { get; private set; }
        public EconomyAPI Economy { get; private set; }
        public MatchmakingAPI Matchmaking { get; private set; }
        public AnalyticsAPI Analytics { get; private set; }

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;
            DontDestroyOnLoad(gameObject);

            InitializeServices();
        }

        private void InitializeServices()
        {
            Authentication = new AuthenticationAPI(this);
            Player = new PlayerAPI(this);
            CloudScript = new CloudScriptAPI(this);
            Leaderboards = new LeaderboardAPI(this);
            Economy = new EconomyAPI(this);
            Matchmaking = new MatchmakingAPI(this);
            Analytics = new AnalyticsAPI(this);
        }

        public void SetSessionToken(string token)
        {
            _sessionToken = token;
            Settings.Log($"Session token set");
        }

        public string GetSessionToken()
        {
            return _sessionToken;
        }

        public bool IsAuthenticated()
        {
            return !string.IsNullOrEmpty(_sessionToken);
        }

        public void Logout()
        {
            _sessionToken = null;
            Settings.Log("User logged out");
        }

        // Core HTTP Methods
        public IEnumerator SendRequest<T>(
            string url,
            string method,
            object body,
            Action<T> onSuccess,
            Action<string> onError,
            bool requiresAuth = false,
            bool useTitleKey = false)
        {
            UnityWebRequest request;

            if (method == "GET")
            {
                request = UnityWebRequest.Get(url);
            }
            else
            {
                string jsonBody = body != null ? JsonUtility.ToJson(body) : "{}";
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
                request = new UnityWebRequest(url, method);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
            }

            request.SetRequestHeader("Content-Type", "application/json");

            if (requiresAuth && !string.IsNullOrEmpty(_sessionToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {_sessionToken}");
            }

            if (useTitleKey && !string.IsNullOrEmpty(Settings.secretKey))
            {
                request.SetRequestHeader("x-title-key", Settings.secretKey);
            }

            if (Settings.logApiCalls)
            {
                Settings.Log($"API Call: {method} {url}");
            }

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                try
                {
                    T response = JsonUtility.FromJson<T>(request.downloadHandler.text);
                    onSuccess?.Invoke(response);
                }
                catch (Exception e)
                {
                    Settings.LogError($"Failed to parse response: {e.Message}");
                    onError?.Invoke($"Parse error: {e.Message}");
                }
            }
            else
            {
                string errorMsg = $"Request failed: {request.error}";
                Settings.LogError(errorMsg);
                onError?.Invoke(errorMsg);
            }

            request.Dispose();
        }
    }
}
