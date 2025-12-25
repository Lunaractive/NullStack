using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NullStack.Models;

namespace NullStack.API
{
    public class CloudScriptAPI
    {
        private readonly NullStackClient _client;
        private NullStackSettings Settings => NullStackSettings.Instance;

        public CloudScriptAPI(NullStackClient client)
        {
            _client = client;
        }

        public IEnumerator ExecuteFunction(
            string functionName,
            Dictionary<string, object> functionParameters,
            Action<CloudScriptExecuteResponse> onSuccess,
            Action<string> onError)
        {
            var request = new CloudScriptExecuteRequest
            {
                functionName = functionName,
                functionParameters = functionParameters
            };

            string url = $"{Settings.baseUrl}{Settings.cloudScriptEndpoint}/execute";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator ListFunctions(
            Action<CloudScriptListResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.cloudScriptEndpoint}/functions";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GetExecutionHistory(
            int limit,
            Action<CloudScriptHistoryResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.cloudScriptEndpoint}/history?limit={limit}";

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
