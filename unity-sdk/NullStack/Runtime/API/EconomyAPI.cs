using System;
using System.Collections;
using UnityEngine;
using NullStack.Models;

namespace NullStack.API
{
    public class EconomyAPI
    {
        private readonly NullStackClient _client;
        private NullStackSettings Settings => NullStackSettings.Instance;

        public EconomyAPI(NullStackClient client)
        {
            _client = client;
        }

        // Virtual Currency
        public IEnumerator GetPlayerCurrency(
            Action<PlayerCurrencyResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.economyEndpoint}/currency/player";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator AddPlayerCurrency(
            string currencyCode,
            int amount,
            Action<PlayerCurrencyResponse> onSuccess,
            Action<string> onError)
        {
            var request = new CurrencyChangeRequest
            {
                currencyCode = currencyCode,
                amount = amount
            };

            string url = $"{Settings.baseUrl}{Settings.economyEndpoint}/currency/add";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator SubtractPlayerCurrency(
            string currencyCode,
            int amount,
            Action<PlayerCurrencyResponse> onSuccess,
            Action<string> onError)
        {
            var request = new CurrencyChangeRequest
            {
                currencyCode = currencyCode,
                amount = amount
            };

            string url = $"{Settings.baseUrl}{Settings.economyEndpoint}/currency/subtract";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        // Catalog Items
        public IEnumerator GetCatalogItems(
            Action<CatalogItemsResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.economyEndpoint}/catalog";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        // Player Inventory
        public IEnumerator GetPlayerInventory(
            Action<PlayerInventoryResponse> onSuccess,
            Action<string> onError)
        {
            string url = $"{Settings.baseUrl}{Settings.economyEndpoint}/inventory";

            yield return _client.SendRequest(
                url,
                "GET",
                null,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator PurchaseItem(
            string itemId,
            string currencyCode,
            int price,
            Action<PurchaseItemResponse> onSuccess,
            Action<string> onError)
        {
            var request = new PurchaseItemRequest
            {
                itemId = itemId,
                currencyCode = currencyCode,
                price = price
            };

            string url = $"{Settings.baseUrl}{Settings.economyEndpoint}/purchase";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator ConsumeItem(
            string instanceId,
            int consumeCount,
            Action<ConsumeItemResponse> onSuccess,
            Action<string> onError)
        {
            var request = new ConsumeItemRequest
            {
                instanceId = instanceId,
                consumeCount = consumeCount
            };

            string url = $"{Settings.baseUrl}{Settings.economyEndpoint}/consume";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }

        public IEnumerator GrantItemToPlayer(
            string itemId,
            Action<GrantItemResponse> onSuccess,
            Action<string> onError)
        {
            var request = new GrantItemRequest
            {
                itemId = itemId
            };

            string url = $"{Settings.baseUrl}{Settings.economyEndpoint}/grant";

            yield return _client.SendRequest(
                url,
                "POST",
                request,
                onSuccess,
                onError,
                requiresAuth: true
            );
        }
    }
}
