using System;
using System.Collections;
using UnityEngine;
using NullStack.Models;

namespace NullStack.API
{
    public class LeaderboardAPI
    {
        private readonly NullStackClient _client;
        private NullStackSettings Settings => NullStackSettings.Instance;

        public LeaderboardAPI(NullStackClient client)
        {
            _client = client;
        }

        public IEnumerator GetLeaderboard(
            string leaderboardName,
            int startPosition,
            int maxResults,
            Action<LeaderboardResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.leaderboardEndpoint}/{leaderboardName}?startPosition={startPosition}&maxResults={maxResults}";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GetLeaderboardAroundPlayer(
            string leaderboardName,
            int maxResults,
            Action<LeaderboardResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.leaderboardEndpoint}/{leaderboardName}/around-player?maxResults={maxResults}";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator UpdatePlayerStatistic(
            string statisticName,
            int value,
            Action<UpdateLeaderboardResponse> onSuccess,
            Action<string> onError)
        {
            var request = new UpdateLeaderboardRequest
            {
                statisticName = statisticName,
                value = value
            };

            string url = $"{Settings.baseUrl}{Settings.leaderboardEndpoint}/update";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GetPlayerRank(
            string leaderboardName,
            Action<PlayerRankResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.leaderboardEndpoint}/{leaderboardName}/rank";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }
    }
}
