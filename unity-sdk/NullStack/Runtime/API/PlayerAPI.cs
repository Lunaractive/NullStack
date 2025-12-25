using System;
using System.Collections;
using UnityEngine;
using NullStack.Models;

namespace NullStack.API
{
    public class PlayerAPI
    {
        private readonly NullStackClient _client;
        private NullStackSettings Settings => NullStackSettings.Instance;

        public PlayerAPI(NullStackClient client)
        {
            _client = client;
        }

        public IEnumerator GetPlayerProfile(
            Action<PlayerProfileResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.playerEndpoint}/profile";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator UpdatePlayerProfile(
            string displayName,
            Action<PlayerProfileResponse> onSuccess,
            Action<string> onError)
        {
            var request = new UpdateProfileRequest
            {
                displayName = displayName
            };

            string url = $"{Settings.baseUrl}{Settings.playerEndpoint}/profile";

            yield return _client.SendRequest(
                url,
                "PUT",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GetPlayerData(
            string[] keys,
            Action<PlayerDataResponse> onSuccess,
            Action<string> onError)
        {
            string keysParam = keys != null && keys.Length > 0 ? string.Join(",", keys) : "";
            string url = $"{Settings.baseUrl}{Settings.playerEndpoint}/data?keys={keysParam}";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator UpdatePlayerData(
            PlayerDataItem[] data,
            Action<GenericResponse> onSuccess,
            Action<string> onError)
        {
            var request = new UpdatePlayerDataRequest
            {
                data = data
            };

            string url = $"{Settings.baseUrl}{Settings.playerEndpoint}/data";

            yield return _client.SendRequest(
                url,
                "PUT",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GetStatistics(
            Action<PlayerStatisticsResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.playerEndpoint}/statistics";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator UpdateStatistics(
            StatisticUpdate[] statistics,
            Action<GenericResponse> onSuccess,
            Action<string> onError)
        {
            var request = new UpdateStatisticsRequest
            {
                statistics = statistics
            };

            string url = $"{Settings.baseUrl}{Settings.playerEndpoint}/statistics";

            yield return _client.SendRequest(
                url,
                "PUT",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }
    }
}
