# Notifications Service

The Notifications Service handles push notifications for mobile devices using Firebase Cloud Messaging (FCM) for Android and Apple Push Notification Service (APNS) for iOS.

## Features

- Send push notifications to iOS and Android devices
- Support for broadcast, segment-based, and player-targeted notifications
- Scheduled notification delivery
- Device token management
- Automatic retry and failure tracking
- Delivery statistics and reporting

## API Endpoints

### Notifications (Developer)

#### Create Notification
```http
POST /api/v1/notifications
Authorization: Bearer <developer-token>

{
  "title": "Welcome to the Game!",
  "message": "Your daily rewards are ready",
  "data": {
    "rewardId": "123",
    "type": "daily_reward"
  },
  "imageUrl": "https://example.com/image.jpg",
  "targetType": "broadcast",
  "scheduledFor": "2025-12-25T10:00:00Z"
}
```

**Target Types:**
- `broadcast` - Send to all registered devices for the title
- `segment` - Send to devices belonging to a specific player segment
- `players` - Send to specific player IDs

#### List Notifications
```http
GET /api/v1/notifications?page=1&limit=20&status=sent
Authorization: Bearer <developer-token>
```

#### Get Notification Details
```http
GET /api/v1/notifications/:id
Authorization: Bearer <developer-token>
```

#### Send Notification Immediately
```http
POST /api/v1/notifications/:id/send
Authorization: Bearer <developer-token>
```

#### Cancel Scheduled Notification
```http
DELETE /api/v1/notifications/:id
Authorization: Bearer <developer-token>
```

### Device Tokens (Player)

#### Register Device Token
```http
POST /api/v1/devices/register
Authorization: Bearer <player-token>

{
  "token": "device-fcm-or-apns-token",
  "platform": "ios",
  "appVersion": "1.0.0",
  "deviceModel": "iPhone 14 Pro",
  "osVersion": "17.0"
}
```

#### Unregister Device
```http
DELETE /api/v1/devices/:token
Authorization: Bearer <player-token>
```

#### List Player Devices
```http
GET /api/v1/devices
Authorization: Bearer <player-token>
```

## Configuration

### Environment Variables

```bash
# Server
PORT=3009

# MongoDB
MONGODB_URI=mongodb://localhost:27017/nullstack

# JWT Secret
JWT_SECRET=your-secret-key

# Firebase Cloud Messaging (Android)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Apple Push Notification Service (iOS)
APNS_KEY_PATH=/path/to/apns-key.p8
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apns-team-id
APNS_BUNDLE_ID=com.yourapp.bundleid
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or select your project
3. Navigate to Project Settings > Service Accounts
4. Generate new private key
5. Save the JSON file and configure `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_PATH`

### APNS Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to Certificates, Identifiers & Profiles
3. Create an APNs Key
4. Download the .p8 file
5. Configure environment variables with key details

## MongoDB Collections

### DeviceToken
Stores registered device tokens for push notifications.

```typescript
{
  playerId: string;
  titleId: string;
  token: string;
  platform: 'ios' | 'android';
  appVersion?: string;
  deviceModel?: string;
  osVersion?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Notification
Stores notification configurations and delivery status.

```typescript
{
  titleId: string;
  notificationId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  imageUrl?: string;
  targetType: 'broadcast' | 'segment' | 'players';
  targetSegmentId?: string;
  targetPlayerIds?: string[];
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}
```

## Notification Scheduler

The service includes a background scheduler that runs every minute to process scheduled notifications. It:

1. Finds notifications scheduled for the current time or earlier
2. Retrieves device tokens based on target type
3. Sends notifications via FCM (Android) and APNS (iOS)
4. Tracks delivery statistics
5. Disables invalid or expired tokens

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Docker

```bash
# Build image
docker build -t notifications-service .

# Run container
docker run -p 3009:3009 \
  -e MONGODB_URI=mongodb://mongo:27017/nullstack \
  -e FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' \
  notifications-service
```

## Testing

Send a test notification:

```bash
curl -X POST http://localhost:3009/api/v1/notifications \
  -H "Authorization: Bearer <developer-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test",
    "targetType": "broadcast"
  }'
```

## Integration with Other Services

### Player Service
The notifications service integrates with the player service to:
- Validate player IDs
- Retrieve segment information for targeted notifications
- Track notification engagement metrics

### Analytics Service
Notification events are tracked for:
- Delivery rates
- Open rates
- Engagement analytics
- A/B testing capabilities

## Best Practices

1. **Token Management**: Automatically disable invalid tokens to maintain clean device lists
2. **Batch Processing**: Send notifications in batches to optimize performance
3. **Scheduling**: Use scheduled notifications for timed campaigns
4. **Segmentation**: Target specific player segments for personalized messaging
5. **Rich Notifications**: Include images and custom data for enhanced engagement
6. **Error Handling**: Monitor failed deliveries and adjust retry strategies

## Limitations

- FCM batch size: 500 messages per request
- APNS batch size: 100 messages per batch (configurable)
- Scheduler runs every minute
- Maximum notification data size: Limited by FCM/APNS specifications

## Security

- All endpoints require JWT authentication
- Developer endpoints require developer token
- Player endpoints require player token
- Tokens are validated against the configured JWT secret
- Device tokens are scoped to specific players and titles
