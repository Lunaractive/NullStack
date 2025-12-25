using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NullStack.Models;

namespace NullStack.API
{
    public class MatchmakingAPI
    {
        private readonly NullStackClient _client;
        private NullStackSettings Settings => NullStackSettings.Instance;

        public MatchmakingAPI(NullStackClient client)
        {
            _client = client;
        }

        public IEnumerator CreateMatchmakingTicket(
            string queueName,
            Dictionary<string, object> attributes,
            Action<MatchmakingTicketResponse> onSuccess,
            Action<string> onError)
        {
            var request = new CreateMatchmakingTicketRequest
            {
                queueName = queueName,
                attributes = attributes
            };

            string url = $"{Settings.baseUrl}{Settings.matchmakingEndpoint}/ticket";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GetTicketStatus(
            string ticketId,
            Action<MatchmakingTicketResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.matchmakingEndpoint}/ticket/{ticketId}";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator CancelTicket(
            string ticketId,
            Action<GenericResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.matchmakingEndpoint}/ticket/{ticketId}";

            yield return _client.SendRequest(
                url,
                "DELETE",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GetMatchDetails(
            string matchId,
            Action<MatchDetailsResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.matchmakingEndpoint}/match/{matchId}";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator ListActiveMatches(
            Action<ActiveMatchesResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.matchmakingEndpoint}/matches";

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
