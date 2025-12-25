using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NullStack.API;
using NullStack.Models;

namespace NullStack.Examples
{
    public class NullStackExample : MonoBehaviour
    {
        private void Start()
        {
            // Example: Login with email and password
            StartCoroutine(LoginExample());
        }

        IEnumerator LoginExample()
        {
            Debug.Log("Attempting login...");

            yield return NullStackClient.Instance.Authentication.Login(
                "player@example.com",
                "password123",
                (response) =>
                {
                    Debug.Log("Login successful!");
                    Debug.Log($"Player ID: {response.data.player.id}");
                    Debug.Log($"Username: {response.data.player.username}");

                    // After login, you can access other APIs
                    StartCoroutine(GetPlayerProfileExample());
                },
                (error) =>
                {
                    Debug.LogError($"Login failed: {error}");
                }
            );
        }

        IEnumerator RegisterExample()
        {
            yield return NullStackClient.Instance.Authentication.Register(
                "newplayer@example.com",
                "newplayer",
                "password123",
                (response) =>
                {
                    Debug.Log("Registration successful!");
                    Debug.Log($"Player ID: {response.data.player.id}");
                },
                (error) =>
                {
                    Debug.LogError($"Registration failed: {error}");
                }
            );
        }

        IEnumerator LoginWithCustomIdExample()
        {
            string deviceId = SystemInfo.deviceUniqueIdentifier;

            yield return NullStackClient.Instance.Authentication.LoginWithCustomId(
                deviceId,
                createAccount: true,
                (response) =>
                {
                    Debug.Log("Login with Custom ID successful!");
                },
                (error) =>
                {
                    Debug.LogError($"Login failed: {error}");
                }
            );
        }

        IEnumerator GetPlayerProfileExample()
        {
            yield return NullStackClient.Instance.Player.GetPlayerProfile(
                (response) =>
                {
                    Debug.Log($"Player Profile: {response.data.username}");
                    Debug.Log($"Email: {response.data.email}");
                },
                (error) =>
                {
                    Debug.LogError($"Failed to get profile: {error}");
                }
            );
        }

        IEnumerator UpdatePlayerDataExample()
        {
            var data = new PlayerDataItem[]
            {
                new PlayerDataItem { key = "level", value = "10" },
                new PlayerDataItem { key = "lastLoginDate", value = System.DateTime.UtcNow.ToString() }
            };

            yield return NullStackClient.Instance.Player.UpdatePlayerData(
                data,
                (response) =>
                {
                    Debug.Log("Player data updated successfully!");
                },
                (error) =>
                {
                    Debug.LogError($"Failed to update player data: {error}");
                }
            );
        }

        IEnumerator ExecuteCloudScriptExample()
        {
            var parameters = new Dictionary<string, object>
            {
                { "itemId", "sword_001" },
                { "quantity", 1 }
            };

            yield return NullStackClient.Instance.CloudScript.ExecuteFunction(
                "GrantReward",
                parameters,
                (response) =>
                {
                    if (response.success)
                    {
                        Debug.Log("CloudScript executed successfully!");
                        Debug.Log($"Result: {response.data.result}");
                    }
                },
                (error) =>
                {
                    Debug.LogError($"CloudScript execution failed: {error}");
                }
            );
        }

        IEnumerator GetLeaderboardExample()
        {
            yield return NullStackClient.Instance.Leaderboards.GetLeaderboard(
                "HighScores",
                startPosition: 0,
                maxResults: 10,
                (response) =>
                {
                    Debug.Log($"Leaderboard entries: {response.data.leaderboard.Length}");
                    foreach (var entry in response.data.leaderboard)
                    {
                        Debug.Log($"{entry.position}. {entry.displayName} - {entry.value}");
                    }
                },
                (error) =>
                {
                    Debug.LogError($"Failed to get leaderboard: {error}");
                }
            );
        }

        IEnumerator UpdateLeaderboardExample()
        {
            yield return NullStackClient.Instance.Leaderboards.UpdatePlayerStatistic(
                "HighScore",
                1000,
                (response) =>
                {
                    Debug.Log("Leaderboard updated!");
                },
                (error) =>
                {
                    Debug.LogError($"Failed to update leaderboard: {error}");
                }
            );
        }

        IEnumerator GetPlayerCurrencyExample()
        {
            yield return NullStackClient.Instance.Economy.GetPlayerCurrency(
                (response) =>
                {
                    Debug.Log("Player Currency:");
                    foreach (var currency in response.data.currencies)
                    {
                        Debug.Log($"{currency.currencyCode}: {currency.amount}");
                    }
                },
                (error) =>
                {
                    Debug.LogError($"Failed to get currency: {error}");
                }
            );
        }

        IEnumerator PurchaseItemExample()
        {
            yield return NullStackClient.Instance.Economy.PurchaseItem(
                "potion_health_001",
                "GOLD",
                50,
                (response) =>
                {
                    Debug.Log("Item purchased successfully!");
                    Debug.Log($"Instance ID: {response.data.instanceId}");
                },
                (error) =>
                {
                    Debug.LogError($"Purchase failed: {error}");
                }
            );
        }

        IEnumerator GetInventoryExample()
        {
            yield return NullStackClient.Instance.Economy.GetPlayerInventory(
                (response) =>
                {
                    Debug.Log($"Inventory items: {response.data.items.Length}");
                    foreach (var item in response.data.items)
                    {
                        Debug.Log($"{item.itemId} x{item.quantity}");
                    }
                },
                (error) =>
                {
                    Debug.LogError($"Failed to get inventory: {error}");
                }
            );
        }

        IEnumerator CreateMatchmakingTicketExample()
        {
            var attributes = new Dictionary<string, object>
            {
                { "skill", 1200 },
                { "region", "us-west" }
            };

            yield return NullStackClient.Instance.Matchmaking.CreateMatchmakingTicket(
                "casual",
                attributes,
                (response) =>
                {
                    Debug.Log($"Matchmaking ticket created: {response.data.ticketId}");
                    Debug.Log($"Status: {response.data.status}");

                    // Poll for match status
                    StartCoroutine(PollMatchmakingStatus(response.data.ticketId));
                },
                (error) =>
                {
                    Debug.LogError($"Failed to create ticket: {error}");
                }
            );
        }

        IEnumerator PollMatchmakingStatus(string ticketId)
        {
            bool matchFound = false;
            int maxAttempts = 30;
            int attempts = 0;

            while (!matchFound && attempts < maxAttempts)
            {
                yield return new WaitForSeconds(2f);

                yield return NullStackClient.Instance.Matchmaking.GetTicketStatus(
                    ticketId,
                    (response) =>
                    {
                        Debug.Log($"Ticket status: {response.data.status}");

                        if (response.data.status == "matched")
                        {
                            matchFound = true;
                            Debug.Log($"Match found! Match ID: {response.data.matchId}");
                        }
                        else if (response.data.status == "cancelled" || response.data.status == "failed")
                        {
                            matchFound = true;
                            Debug.Log("Matchmaking cancelled or failed");
                        }
                    },
                    (error) =>
                    {
                        Debug.LogError($"Failed to get ticket status: {error}");
                        matchFound = true;
                    }
                );

                attempts++;
            }

            if (!matchFound)
            {
                Debug.Log("Matchmaking timeout - cancelling ticket");
                StartCoroutine(NullStackClient.Instance.Matchmaking.CancelTicket(
                    ticketId,
                    (response) => Debug.Log("Ticket cancelled"),
                    (error) => Debug.LogError($"Failed to cancel: {error}")
                ));
            }
        }

        IEnumerator TrackEventExample()
        {
            var eventData = new Dictionary<string, object>
            {
                { "level", 5 },
                { "score", 1000 },
                { "timeSpent", 120 }
            };

            yield return NullStackClient.Instance.Analytics.TrackEvent(
                "LevelCompleted",
                eventData,
                (response) =>
                {
                    Debug.Log("Event tracked successfully!");
                },
                (error) =>
                {
                    Debug.LogError($"Failed to track event: {error}");
                }
            );
        }
    }
}
