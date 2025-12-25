using System;
using System.Collections;
using UnityEngine;
using NullStack.Models;

namespace NullStack.API
{
    public class AuthenticationAPI
    {
        private readonly NullStackClient _client;
        private NullStackSettings Settings => NullStackSettings.Instance;

        public AuthenticationAPI(NullStackClient client)
        {
            _client = client;
        }

        public IEnumerator Login(
            string email,
            string password,
            Action<LoginResponse> onSuccess,
            Action<string> onError)
        {
            var request = new LoginRequest
            {
                email = email,
                password = password
            };

            string url = $"{Settings.baseUrl}{Settings.authEndpoint}/login";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                (LoginResponse response) =>
                {
                    if (response.success && !string.IsNullOrEmpty(response.data.token))
                    {
                        _client.SetSessionToken(response.data.token);
                    }
                    onSuccess?.Invoke(response);
                },
                onError
            );
        }

        public IEnumerator Register(
            string email,
            string username,
            string password,
            Action<RegisterResponse> onSuccess,
            Action<string> onError)
        {
            var request = new RegisterRequest
            {
                email = email,
                username = username,
                password = password,
                titleId = Settings.titleId
            };

            string url = $"{Settings.baseUrl}{Settings.authEndpoint}/register";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                (RegisterResponse response) =>
                {
                    if (response.success && !string.IsNullOrEmpty(response.data.token))
                    {
                        _client.SetSessionToken(response.data.token);
                    }
                    onSuccess?.Invoke(response);
                },
                onError
            );
        }

        public IEnumerator LoginWithCustomId(
            string customId,
            bool createAccount,
            Action<LoginResponse> onSuccess,
            Action<string> onError)
        {
            var request = new CustomIdLoginRequest
            {
                customId = customId,
                createAccount = createAccount,
                titleId = Settings.titleId
            };

            string url = $"{Settings.baseUrl}{Settings.authEndpoint}/login/custom";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                (LoginResponse response) =>
                {
                    if (response.success && !string.IsNullOrEmpty(response.data.token))
                    {
                        _client.SetSessionToken(response.data.token);
                    }
                    onSuccess?.Invoke(response);
                },
                onError
            );
        }

        public void Logout()
        {
            _client.Logout();
        }
    }
}
