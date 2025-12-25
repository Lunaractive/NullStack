using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace NullStack.SDK
{
    /// <summary>
    /// Main NullStack SDK Client for C# and Unity
    /// </summary>
    /// <example>
    /// <code>
    /// var client = new NullStackClient(new NullStackConfig
    /// {
    ///     TitleId = "your-title-id",
    ///     ApiUrl = "https://api.nullstack.com"
    /// });
    ///
    /// // Login
    /// var auth = await client.LoginWithEmailAsync(new LoginWithEmailRequest
    /// {
    ///     Email = "player@example.com",
    ///     Password = "password123"
    /// });
    ///
    /// // Get player data
    /// var profile = await client.GetProfileAsync();
    /// </code>
    /// </example>
    public class NullStackClient : IDisposable
    {
        private readonly NullStackConfig _config;
        private readonly HttpClient _httpClient;
        private string? _sessionToken;
        private string? _entityToken;
        private string? _playerId;

        public NullStackClient(NullStackConfig config)
        {
            _config = config ?? throw new ArgumentNullException(nameof(config));

            if (string.IsNullOrEmpty(_config.TitleId))
            {
                throw new ArgumentException("TitleId is required", nameof(config));
            }

            _httpClient = new HttpClient
            {
                BaseAddress = new Uri(_config.ApiUrl),
                Timeout = TimeSpan.FromMilliseconds(_config.Timeout)
            };

            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _httpClient.DefaultRequestHeaders.Add("X-Title-Id", _config.TitleId);
        }

        /// <summary>
        /// Make an API request with retry logic
        /// </summary>
        private async Task<T> RequestAsync<T>(
            HttpMethod method,
            string endpoint,
            object? data = null,
            int attempt = 1,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var request = new HttpRequestMessage(method, endpoint);

                // Add authentication headers
                if (!string.IsNullOrEmpty(_sessionToken))
                {
                    request.Headers.Add("X-Session-Token", _sessionToken);
                }
                if (!string.IsNullOrEmpty(_entityToken))
                {
                    request.Headers.Add("X-Entity-Token", _entityToken);
                }

                // Add request body if present
                if (data != null)
                {
                    var json = JsonConvert.SerializeObject(data);
                    request.Content = new StringContent(json, Encoding.UTF8, "application/json");
                }

                var response = await _httpClient.SendAsync(request, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    dynamic? errorData = null;

                    try
                    {
                        errorData = JsonConvert.DeserializeObject<dynamic>(errorContent);
                    }
                    catch
                    {
                        // If JSON parsing fails, use the raw content
                    }

                    var errorCode = errorData?.code ?? errorData?.errorCode ?? "API_ERROR";
                    var errorMessage = errorData?.message ?? errorData?.errorMessage ?? response.ReasonPhrase ?? "Unknown error";

                    throw new NullStackError(
                        errorCode.ToString(),
                        errorMessage.ToString(),
                        (int)response.StatusCode,
                        errorData?.details ?? errorData?.errorDetails
                    );
                }

                var content = await response.Content.ReadAsStringAsync();
                var apiResponse = JsonConvert.DeserializeObject<ApiResponse<T>>(content);

                if (apiResponse?.Data == null)
                {
                    throw new NullStackError("INVALID_RESPONSE", "Invalid API response format");
                }

                return apiResponse.Data;
            }
            catch (HttpRequestException ex)
            {
                if (attempt < _config.RetryAttempts)
                {
                    await Task.Delay(_config.RetryDelay * attempt, cancellationToken);
                    return await RequestAsync<T>(method, endpoint, data, attempt + 1, cancellationToken);
                }

                throw new NullStackError("NETWORK_ERROR", "Network error - could not reach the server", 0, ex.Message);
            }
            catch (NullStackError)
            {
                // Re-throw NullStack errors
                throw;
            }
            catch (Exception ex)
            {
                throw new NullStackError("UNKNOWN_ERROR", ex.Message, 0, ex);
            }
        }

        /// <summary>
        /// Store authentication tokens from login response
        /// </summary>
        private void SetAuthTokens(AuthResponse auth)
        {
            _sessionToken = auth.SessionToken;
            _entityToken = auth.EntityToken;
            _playerId = auth.PlayerId;
        }

        // ============================================================================
        // AUTHENTICATION
        // ============================================================================

        /// <summary>
        /// Login with email and password
        /// </summary>
        public async Task<AuthResponse> LoginWithEmailAsync(
            LoginWithEmailRequest request,
            CancellationToken cancellationToken = default)
        {
            var response = await RequestAsync<AuthResponse>(
                HttpMethod.Post,
                "/client/auth/login/email",
                request,
                cancellationToken: cancellationToken
            );
            SetAuthTokens(response);
            return response;
        }

        /// <summary>
        /// Register a new account with email and password
        /// </summary>
        public async Task<AuthResponse> RegisterAsync(
            RegisterRequest request,
            CancellationToken cancellationToken = default)
        {
            var response = await RequestAsync<AuthResponse>(
                HttpMethod.Post,
                "/client/auth/register",
                request,
                cancellationToken: cancellationToken
            );
            SetAuthTokens(response);
            return response;
        }

        /// <summary>
        /// Login anonymously with a device ID
        /// </summary>
        public async Task<AuthResponse> LoginAnonymousAsync(
            LoginAnonymousRequest? request = null,
            CancellationToken cancellationToken = default)
        {
            request ??= new LoginAnonymousRequest();
            var response = await RequestAsync<AuthResponse>(
                HttpMethod.Post,
                "/client/auth/login/anonymous",
                request,
                cancellationToken: cancellationToken
            );
            SetAuthTokens(response);
            return response;
        }

        /// <summary>
        /// Clear all authentication tokens
        /// </summary>
        public void Logout()
        {
            _sessionToken = null;
            _entityToken = null;
            _playerId = null;
        }

        /// <summary>
        /// Check if user is authenticated
        /// </summary>
        public bool IsAuthenticated()
        {
            return !string.IsNullOrEmpty(_sessionToken) && !string.IsNullOrEmpty(_entityToken);
        }

        /// <summary>
        /// Get current player ID
        /// </summary>
        public string? GetPlayerId()
        {
            return _playerId;
        }

        // ============================================================================
        // PLAYER DATA
        // ============================================================================

        /// <summary>
        /// Get the current player's profile
        /// </summary>
        public async Task<PlayerProfile> GetProfileAsync(CancellationToken cancellationToken = default)
        {
            return await RequestAsync<PlayerProfile>(
                HttpMethod.Get,
                "/client/player/profile",
                cancellationToken: cancellationToken
            );
        }

        /// <summary>
        /// Update the current player's profile
        /// </summary>
        public async Task<PlayerProfile> UpdateProfileAsync(
            UpdateProfileRequest request,
            CancellationToken cancellationToken = default)
        {
            return await RequestAsync<PlayerProfile>(
                HttpMethod.Put,
                "/client/player/profile",
                request,
                cancellationToken: cancellationToken
            );
        }

        /// <summary>
        /// Get player data (key-value storage)
        /// </summary>
        public async Task<PlayerData> GetDataAsync(
            GetDataRequest? request = null,
            CancellationToken cancellationToken = default)
        {
            request ??= new GetDataRequest();
            var endpoint = "/client/player/data";

            if (request.Keys != null && request.Keys.Count > 0)
            {
                endpoint += "?keys=" + string.Join(",", request.Keys);
            }

            return await RequestAsync<PlayerData>(
                HttpMethod.Get,
                endpoint,
                cancellationToken: cancellationToken
            );
        }

        /// <summary>
        /// Set player data (key-value storage)
        /// </summary>
        public async Task SetDataAsync(
            SetDataRequest request,
            CancellationToken cancellationToken = default)
        {
            await RequestAsync<object>(
                HttpMethod.Put,
                "/client/player/data",
                request,
                cancellationToken: cancellationToken
            );
        }

        // ============================================================================
        // ECONOMY
        // ============================================================================

        /// <summary>
        /// Get player's virtual currencies
        /// </summary>
        public async Task<List<PlayerCurrency>> GetCurrenciesAsync(
            CancellationToken cancellationToken = default)
        {
            return await RequestAsync<List<PlayerCurrency>>(
                HttpMethod.Get,
                "/client/economy/currencies",
                cancellationToken: cancellationToken
            );
        }

        /// <summary>
        /// Purchase an item from the catalog
        /// </summary>
        public async Task<PurchaseItemResponse> PurchaseItemAsync(
            PurchaseItemRequest request,
            CancellationToken cancellationToken = default)
        {
            return await RequestAsync<PurchaseItemResponse>(
                HttpMethod.Post,
                "/client/economy/purchase",
                request,
                cancellationToken: cancellationToken
            );
        }

        /// <summary>
        /// Get player's inventory
        /// </summary>
        public async Task<List<InventoryItem>> GetInventoryAsync(
            CancellationToken cancellationToken = default)
        {
            return await RequestAsync<List<InventoryItem>>(
                HttpMethod.Get,
                "/client/economy/inventory",
                cancellationToken: cancellationToken
            );
        }

        /// <summary>
        /// Consume an inventory item
        /// </summary>
        public async Task<ConsumeItemResponse> ConsumeItemAsync(
            ConsumeItemRequest request,
            CancellationToken cancellationToken = default)
        {
            return await RequestAsync<ConsumeItemResponse>(
                HttpMethod.Post,
                "/client/economy/consume",
                request,
                cancellationToken: cancellationToken
            );
        }

        // ============================================================================
        // LEADERBOARDS
        // ============================================================================

        /// <summary>
        /// Get a leaderboard
        /// </summary>
        public async Task<GetLeaderboardResponse> GetLeaderboardAsync(
            GetLeaderboardRequest request,
            CancellationToken cancellationToken = default)
        {
            var endpoint = $"/client/leaderboard/{request.StatisticName}?startPosition={request.StartPosition}&maxResults={request.MaxResults}";
            return await RequestAsync<GetLeaderboardResponse>(
                HttpMethod.Get,
                endpoint,
                cancellationToken: cancellationToken
            );
        }

        /// <summary>
        /// Submit a score to a leaderboard
        /// </summary>
        public async Task<SubmitScoreResponse> SubmitScoreAsync(
            SubmitScoreRequest request,
            CancellationToken cancellationToken = default)
        {
            return await RequestAsync<SubmitScoreResponse>(
                HttpMethod.Post,
                $"/client/leaderboard/{request.StatisticName}",
                new { value = request.Value, metadata = request.Metadata },
                cancellationToken: cancellationToken
            );
        }

        // ============================================================================
        // CLOUDSCRIPT
        // ============================================================================

        /// <summary>
        /// Execute a CloudScript function
        /// </summary>
        public async Task<ExecuteCloudScriptResponse> ExecuteAsync(
            ExecuteCloudScriptRequest request,
            CancellationToken cancellationToken = default)
        {
            return await RequestAsync<ExecuteCloudScriptResponse>(
                HttpMethod.Post,
                "/client/cloudscript/execute",
                request,
                cancellationToken: cancellationToken
            );
        }

        // ============================================================================
        // ANALYTICS
        // ============================================================================

        /// <summary>
        /// Track a custom analytics event
        /// </summary>
        public async Task TrackEventAsync(
            TrackEventRequest request,
            CancellationToken cancellationToken = default)
        {
            request.Timestamp ??= DateTime.UtcNow.ToString("O");
            await RequestAsync<object>(
                HttpMethod.Post,
                "/client/analytics/event",
                request,
                cancellationToken: cancellationToken
            );
        }

        // ============================================================================
        // DISPOSE
        // ============================================================================

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }
}
