using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NullStack.Models;

namespace NullStack.API
{
    public class AnalyticsAPI
    {
        private readonly NullStackClient _client;
        private NullStackSettings Settings => NullStackSettings.Instance;

        public AnalyticsAPI(NullStackClient client)
        {
            _client = client;
        }

        public IEnumerator TrackEvent(
            string eventName,
            Dictionary<string, object> eventData,
            Action<GenericResponse> onSuccess,
            Action<string> onError)
        {
            var request = new TrackEventRequest
            {
                eventName = eventName,
                eventData = eventData
            };

            string url = $"{Settings.baseUrl}{Settings.analyticsEndpoint}/track";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator TrackCustomEvent(
            string eventName,
            string eventType,
            Dictionary<string, object> properties,
            Action<GenericResponse> onSuccess,
            Action<string> onError)
        {
            var request = new CustomEventRequest
            {
                eventName = eventName,
                eventType = eventType,
                properties = properties
            };

            string url = $"{Settings.baseUrl}{Settings.analyticsEndpoint}/custom";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GetPlayerEvents(
            int limit,
            Action<PlayerEventsResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.analyticsEndpoint}/events?limit={limit}";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GetAnalyticsSummary(
            string startDate,
            string endDate,
            Action<AnalyticsSummaryResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.analyticsEndpoint}/summary?startDate={startDate}&endDate={endDate}";

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
