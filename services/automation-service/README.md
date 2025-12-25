# NullStack Automation Service

The Automation Service handles webhooks, scheduled tasks, and automation rules for the NullStack platform. It provides a comprehensive event-driven automation system with webhook delivery, cron-based task scheduling, and rule-based automation.

## Features

### Webhooks
- Create and manage webhooks with HMAC signature verification
- Subscribe to system events (deployments, function executions, database changes, etc.)
- Automatic retry logic with exponential backoff
- Delivery tracking and logging
- Test webhook endpoints before going live

### Scheduled Tasks
- Cron-based task scheduling
- Execute CloudScript functions on a schedule
- Support for different timezones
- Manual task triggering
- Execution history and logging

### Automation Rules
- Event-driven automation with conditions
- Multiple action types (webhooks, functions, notifications)
- Condition evaluation engine
- Execution tracking and analytics

### Event Processing
- Subscribe to RabbitMQ events from across the platform
- Parallel webhook dispatching
- Automatic rule processing based on event types

## API Endpoints

### Webhooks

#### Create Webhook
```http
POST /api/v1/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Deployment Notifications",
  "url": "https://example.com/webhooks/deployments",
  "events": ["deployment.started", "deployment.completed", "deployment.failed"],
  "headers": {
    "X-Custom-Header": "value"
  },
  "retryCount": 3,
  "timeout": 30000
}
```

#### List Webhooks
```http
GET /api/v1/webhooks?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Webhook
```http
GET /api/v1/webhooks/:id
Authorization: Bearer <token>
```

#### Update Webhook
```http
PUT /api/v1/webhooks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Webhook Name",
  "isActive": true
}
```

#### Delete Webhook
```http
DELETE /api/v1/webhooks/:id
Authorization: Bearer <token>
```

#### Test Webhook
```http
POST /api/v1/webhooks/:id/test
Authorization: Bearer <token>
```

#### Get Webhook Deliveries
```http
GET /api/v1/webhooks/:id/deliveries?page=1&limit=50
Authorization: Bearer <token>
```

### Scheduled Tasks

#### Create Scheduled Task
```http
POST /api/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Daily Backup",
  "description": "Run backup function every day at midnight",
  "cronExpression": "0 0 * * *",
  "functionName": "backupDatabase",
  "parameters": {
    "includeUploads": true
  },
  "timezone": "America/New_York"
}
```

#### List Scheduled Tasks
```http
GET /api/v1/tasks?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Scheduled Task
```http
GET /api/v1/tasks/:id
Authorization: Bearer <token>
```

#### Update Scheduled Task
```http
PUT /api/v1/tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "cronExpression": "0 */6 * * *",
  "isActive": true
}
```

#### Delete Scheduled Task
```http
DELETE /api/v1/tasks/:id
Authorization: Bearer <token>
```

#### Manually Trigger Task
```http
POST /api/v1/tasks/:id/run
Authorization: Bearer <token>
```

#### Get Task Executions
```http
GET /api/v1/tasks/:id/executions?page=1&limit=50
Authorization: Bearer <token>
```

## Webhook Signature Verification

All webhook deliveries include an HMAC signature in the `X-NullStack-Signature` header. Verify the signature to ensure the webhook came from NullStack:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Webhook Headers

All webhook deliveries include these headers:
- `X-NullStack-Event`: Event type (e.g., "deployment.completed")
- `X-NullStack-Signature`: HMAC signature for verification
- `X-NullStack-Delivery`: Unique delivery ID
- `X-NullStack-Timestamp`: ISO 8601 timestamp
- `User-Agent`: "NullStack-Webhooks/1.0"

## Available Events

The following events can trigger webhooks:

### Project Events
- `project.created`
- `project.updated`
- `project.deleted`

### Deployment Events
- `deployment.started`
- `deployment.completed`
- `deployment.failed`

### Function Events
- `function.created`
- `function.updated`
- `function.deleted`
- `function.executed`

### Database Events
- `database.query.executed`
- `database.migration.completed`

### Storage Events
- `storage.file.uploaded`
- `storage.file.deleted`

### User Events
- `user.created`
- `user.updated`
- `user.deleted`

### API Events
- `api.request`
- `api.error`

## Cron Expression Format

Scheduled tasks use standard cron expression format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Examples
- `0 0 * * *` - Daily at midnight
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1-5` - Weekdays at 9 AM
- `*/15 * * * *` - Every 15 minutes
- `0 0 1 * *` - First day of every month at midnight

## Environment Variables

```env
# Server Configuration
PORT=3005
NODE_ENV=production

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nullstack_automation
DB_USER=nullstack
DB_PASSWORD=your_secure_password

# RabbitMQ Configuration
RABBITMQ_URL=amqp://nullstack:password@rabbitmq:5672
RABBITMQ_EXCHANGE=nullstack.events
RABBITMQ_QUEUE=automation.events

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Webhook Configuration
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY=5000
WEBHOOK_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Database Schema

The service uses the following PostgreSQL tables:

- `webhooks` - Webhook configurations
- `webhook_deliveries` - Webhook delivery logs
- `scheduled_tasks` - Scheduled task configurations
- `task_executions` - Task execution logs
- `automation_rules` - Automation rule configurations

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- RabbitMQ 3.12+

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Run in development mode:
```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

### Docker

Build the image:
```bash
docker build -t nullstack/automation-service .
```

Run the container:
```bash
docker run -p 3005:3005 --env-file .env nullstack/automation-service
```

## Architecture

### Components

1. **Webhook Dispatcher** - Handles webhook delivery with retry logic and HMAC signatures
2. **Task Scheduler** - Manages cron-based task scheduling using node-cron
3. **Event Handler** - Processes events from RabbitMQ and triggers automations
4. **Database Layer** - PostgreSQL for storing configurations and logs
5. **Message Queue** - RabbitMQ for event-driven architecture

### Flow

1. Events are published to RabbitMQ by other services
2. Automation service subscribes to relevant events
3. Event handler processes each event:
   - Finds matching webhooks and dispatches them
   - Evaluates automation rules and executes actions
4. Task scheduler runs scheduled tasks based on cron expressions
5. All executions and deliveries are logged to the database

## Security

- JWT authentication for all API endpoints
- Developer role required for creating/modifying webhooks and tasks
- HMAC signature verification for webhooks
- Rate limiting to prevent abuse
- Helmet.js for security headers
- Input validation with Joi

## Monitoring

Health check endpoint:
```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "rabbitmq": "connected",
    "taskScheduler": "running"
  },
  "tasks": {
    "scheduled": 5
  }
}
```

## License

MIT
