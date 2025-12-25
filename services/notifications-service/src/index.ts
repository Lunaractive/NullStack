import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { notificationsRouter } from './routes/notifications';
import { deviceTokensRouter } from './routes/device-tokens';
import { errorHandler } from './middleware/error-handler';
import { fcmProvider } from './providers/fcm';
import { apnsProvider } from './providers/apns';
import { notificationScheduler } from './scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const mongoHealthy = mongoose.connection.readyState === 1;
  const fcmHealthy = fcmProvider.isInitialized();
  const apnsHealthy = apnsProvider.isInitialized();

  const healthy = mongoHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'notifications-service',
    timestamp: new Date().toISOString(),
    providers: {
      mongodb: mongoHealthy,
      fcm: fcmHealthy,
      apns: apnsHealthy,
    },
  });
});

// API routes
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/devices', deviceTokensRouter);

// Error handling
app.use(errorHandler);

// Database connection and server startup
async function start() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nullstack';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Initialize push notification providers
    fcmProvider.initialize();
    apnsProvider.initialize();

    // Start notification scheduler
    notificationScheduler.start();

    // Start server
    app.listen(PORT, () => {
      console.log(`Notifications service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  notificationScheduler.stop();
  await apnsProvider.shutdown();
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  notificationScheduler.stop();
  await apnsProvider.shutdown();
  await mongoose.disconnect();
  process.exit(0);
});

start();

export default app;
