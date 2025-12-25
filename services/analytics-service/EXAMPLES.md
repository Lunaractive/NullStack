# Analytics Service - Usage Examples

## Table of Contents
- [Event Submission Examples](#event-submission-examples)
- [Analytics Query Examples](#analytics-query-examples)
- [Integration Examples](#integration-examples)

## Event Submission Examples

### Example 1: Track Player Session

```bash
# Session Start
curl -X POST http://localhost:3005/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "my-awesome-game",
    "playerId": "player_12345",
    "sessionId": "session_67890",
    "eventName": "session_start",
    "platform": "ios",
    "version": "1.2.0",
    "country": "US",
    "deviceType": "mobile"
  }'

# Session End
curl -X POST http://localhost:3005/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "my-awesome-game",
    "playerId": "player_12345",
    "sessionId": "session_67890",
    "eventName": "session_end",
    "eventData": {
      "duration": 1200,
      "levelsPlayed": 5
    }
  }'
```

### Example 2: Track Game Progression

```bash
# Level Started
curl -X POST http://localhost:3005/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "my-awesome-game",
    "playerId": "player_12345",
    "sessionId": "session_67890",
    "eventName": "level_started",
    "eventData": {
      "levelId": "level_5",
      "difficulty": "hard",
      "character": "warrior"
    }
  }'

# Level Completed
curl -X POST http://localhost:3005/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "my-awesome-game",
    "playerId": "player_12345",
    "sessionId": "session_67890",
    "eventName": "level_completed",
    "eventData": {
      "levelId": "level_5",
      "score": 9500,
      "stars": 3,
      "duration": 240,
      "attempts": 2
    }
  }'
```

### Example 3: Track In-Game Purchases

```bash
curl -X POST http://localhost:3005/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "my-awesome-game",
    "playerId": "player_12345",
    "sessionId": "session_67890",
    "eventName": "purchase",
    "eventData": {
      "itemId": "sword_legendary",
      "itemName": "Sword of Destiny",
      "category": "weapon",
      "price": 500,
      "currency": "gold",
      "source": "shop"
    }
  }'
```

### Example 4: Track Custom Events

```bash
# Achievement Unlocked
curl -X POST http://localhost:3005/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "my-awesome-game",
    "playerId": "player_12345",
    "eventName": "achievement_unlocked",
    "eventData": {
      "achievementId": "first_blood",
      "achievementName": "First Kill",
      "rarity": "common"
    }
  }'

# Social Interaction
curl -X POST http://localhost:3005/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "my-awesome-game",
    "playerId": "player_12345",
    "eventName": "friend_invited",
    "eventData": {
      "invitedPlayerId": "player_99999",
      "method": "email"
    }
  }'
```

### Example 5: Batch Event Submission

```bash
curl -X POST http://localhost:3005/api/v1/analytics/events/batch \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "titleId": "my-awesome-game",
        "playerId": "player_12345",
        "eventName": "button_click",
        "eventData": { "button": "play" }
      },
      {
        "titleId": "my-awesome-game",
        "playerId": "player_12345",
        "eventName": "screen_view",
        "eventData": { "screen": "main_menu" }
      },
      {
        "titleId": "my-awesome-game",
        "playerId": "player_12345",
        "eventName": "tutorial_started",
        "eventData": { "tutorialId": "basic_controls" }
      }
    ]
  }'
```

## Analytics Query Examples

### Example 6: Get Daily Active Users

```bash
# Last 7 days
curl "http://localhost:3005/api/v1/analytics/reports/dau?titleId=my-awesome-game"

# Specific date range
curl "http://localhost:3005/api/v1/analytics/reports/dau?titleId=my-awesome-game&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "activeUsers": 1250,
      "newUsers": 150,
      "returningUsers": 1100,
      "sessions": 2800,
      "avgSessionDuration": 420
    }
  ],
  "cached": false
}
```

### Example 7: Get Retention Report

```bash
curl "http://localhost:3005/api/v1/analytics/reports/retention?titleId=my-awesome-game&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "cohortDate": "2024-01-15",
      "cohortSize": 500,
      "day1": 42.5,
      "day3": 28.3,
      "day7": 18.2,
      "day14": 12.5,
      "day30": 8.7
    }
  ]
}
```

### Example 8: Get Event Analytics

```bash
# Daily aggregation
curl "http://localhost:3005/api/v1/analytics/reports/events/level_completed?titleId=my-awesome-game&groupBy=day"

# Hourly aggregation
curl "http://localhost:3005/api/v1/analytics/reports/events/purchase?titleId=my-awesome-game&groupBy=hour&startDate=2024-01-15T00:00:00Z"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventName": "level_completed",
    "totalCount": 5420,
    "uniqueUsers": 892,
    "avgPerUser": 6.08,
    "topValues": [],
    "timeline": [
      {
        "date": "2024-01-15",
        "count": 850
      },
      {
        "date": "2024-01-16",
        "count": 920
      }
    ]
  }
}
```

### Example 9: Funnel Analysis

```bash
curl -X GET "http://localhost:3005/api/v1/analytics/reports/funnel" \
  -H "Content-Type: application/json" \
  -G \
  --data-urlencode "titleId=my-awesome-game" \
  --data-urlencode 'steps=[{"stepName":"Install","eventName":"session_start"},{"stepName":"Tutorial","eventName":"tutorial_complete"},{"stepName":"First Level","eventName":"level_completed"},{"stepName":"First Purchase","eventName":"purchase"}]'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 10000,
    "steps": [
      {
        "stepName": "Install",
        "users": 10000,
        "dropoff": 0,
        "conversionRate": 100
      },
      {
        "stepName": "Tutorial",
        "users": 7500,
        "dropoff": 2500,
        "conversionRate": 75
      },
      {
        "stepName": "First Level",
        "users": 5000,
        "dropoff": 2500,
        "conversionRate": 50
      },
      {
        "stepName": "First Purchase",
        "users": 500,
        "dropoff": 4500,
        "conversionRate": 5
      }
    ]
  }
}
```

### Example 10: Query Raw Events

```bash
# Get all events for a player
curl "http://localhost:3005/api/v1/analytics/events?titleId=my-awesome-game&playerId=player_12345&limit=50"

# Get specific event type
curl "http://localhost:3005/api/v1/analytics/events?titleId=my-awesome-game&eventName=purchase&startDate=2024-01-01T00:00:00Z"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "...",
        "eventId": "uuid-...",
        "titleId": "my-awesome-game",
        "playerId": "player_12345",
        "eventName": "purchase",
        "eventData": {
          "itemId": "sword_legendary",
          "price": 500
        },
        "timestamp": "2024-01-15T14:30:00.000Z",
        "createdAt": "2024-01-15T14:30:01.234Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

## Integration Examples

### Unity (C#) Integration

```csharp
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.Networking;

public class AnalyticsClient : MonoBehaviour
{
    private const string API_URL = "http://localhost:3005/api/v1/analytics/events";
    private string titleId = "my-awesome-game";
    private string sessionId;

    void Start()
    {
        sessionId = System.Guid.NewGuid().ToString();
        TrackEvent("session_start");
    }

    public void TrackEvent(string eventName, Dictionary<string, object> eventData = null)
    {
        StartCoroutine(SendEvent(eventName, eventData));
    }

    private IEnumerator SendEvent(string eventName, Dictionary<string, object> eventData)
    {
        var data = new Dictionary<string, object>
        {
            { "titleId", titleId },
            { "playerId", SystemInfo.deviceUniqueIdentifier },
            { "sessionId", sessionId },
            { "eventName", eventName },
            { "eventData", eventData ?? new Dictionary<string, object>() },
            { "platform", Application.platform.ToString() },
            { "version", Application.version }
        };

        string json = JsonUtility.ToJson(data);

        using (UnityWebRequest request = UnityWebRequest.Post(API_URL, json, "application/json"))
        {
            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError($"Analytics error: {request.error}");
            }
        }
    }

    // Example usage
    public void OnLevelComplete(int level, int score)
    {
        var data = new Dictionary<string, object>
        {
            { "level", level },
            { "score", score },
            { "timestamp", System.DateTime.UtcNow.ToString("o") }
        };

        TrackEvent("level_completed", data);
    }
}
```

### JavaScript/TypeScript Integration

```typescript
class AnalyticsClient {
  private apiUrl = 'http://localhost:3005/api/v1/analytics/events';
  private titleId: string;
  private sessionId: string;
  private playerId: string;

  constructor(titleId: string) {
    this.titleId = titleId;
    this.sessionId = this.generateUUID();
    this.playerId = this.getOrCreatePlayerId();
    this.trackEvent('session_start');
  }

  async trackEvent(eventName: string, eventData: Record<string, any> = {}) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titleId: this.titleId,
          playerId: this.playerId,
          sessionId: this.sessionId,
          eventName,
          eventData,
          platform: this.getPlatform(),
          deviceType: this.getDeviceType(),
        }),
      });

      if (!response.ok) {
        console.error('Analytics tracking failed:', await response.text());
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  async trackBatch(events: Array<{ eventName: string; eventData?: Record<string, any> }>) {
    const formattedEvents = events.map(e => ({
      titleId: this.titleId,
      playerId: this.playerId,
      sessionId: this.sessionId,
      eventName: e.eventName,
      eventData: e.eventData || {},
    }));

    try {
      const response = await fetch(`${this.apiUrl}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: formattedEvents }),
      });

      if (!response.ok) {
        console.error('Batch tracking failed:', await response.text());
      }
    } catch (error) {
      console.error('Analytics batch error:', error);
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private getOrCreatePlayerId(): string {
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
      playerId = this.generateUUID();
      localStorage.setItem('playerId', playerId);
    }
    return playerId;
  }

  private getPlatform(): string {
    return navigator.platform;
  }

  private getDeviceType(): string {
    return /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  }
}

// Usage
const analytics = new AnalyticsClient('my-awesome-game');

// Track button click
analytics.trackEvent('button_click', { button: 'play' });

// Track level complete
analytics.trackEvent('level_completed', {
  level: 5,
  score: 9500,
  duration: 240,
});

// Track batch of events
analytics.trackBatch([
  { eventName: 'screen_view', eventData: { screen: 'settings' } },
  { eventName: 'setting_changed', eventData: { setting: 'volume', value: 0.8 } },
  { eventName: 'screen_view', eventData: { screen: 'main_menu' } },
]);
```

### Python Integration

```python
import requests
import uuid
from typing import Dict, Any, List
from datetime import datetime

class AnalyticsClient:
    def __init__(self, title_id: str, api_url: str = "http://localhost:3005/api/v1/analytics/events"):
        self.title_id = title_id
        self.api_url = api_url
        self.session_id = str(uuid.uuid4())

    def track_event(self, event_name: str, player_id: str = None, event_data: Dict[str, Any] = None, **kwargs):
        """Track a single analytics event"""
        payload = {
            "titleId": self.title_id,
            "sessionId": self.session_id,
            "eventName": event_name,
            "eventData": event_data or {},
            **kwargs
        }

        if player_id:
            payload["playerId"] = player_id

        try:
            response = requests.post(self.api_url, json=payload, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Analytics error: {e}")
            return None

    def track_batch(self, events: List[Dict[str, Any]]):
        """Track multiple events in a single request"""
        formatted_events = []
        for event in events:
            formatted_events.append({
                "titleId": self.title_id,
                "sessionId": self.session_id,
                "eventName": event["eventName"],
                "playerId": event.get("playerId"),
                "eventData": event.get("eventData", {}),
            })

        try:
            response = requests.post(
                f"{self.api_url}/batch",
                json={"events": formatted_events},
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Analytics batch error: {e}")
            return None

# Usage
analytics = AnalyticsClient("my-awesome-game")

# Track event
analytics.track_event(
    "level_completed",
    player_id="player_12345",
    event_data={
        "level": 5,
        "score": 9500,
        "duration": 240
    },
    platform="pc",
    version="1.0.0"
)

# Track batch
analytics.track_batch([
    {
        "eventName": "session_start",
        "playerId": "player_12345"
    },
    {
        "eventName": "tutorial_started",
        "playerId": "player_12345",
        "eventData": {"tutorialId": "basics"}
    }
])
```
