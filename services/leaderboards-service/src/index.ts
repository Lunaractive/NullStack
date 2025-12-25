import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { leaderboardsRouter } from './routes/leaderboards';
import { statisticsRouter } from './routes/statistics';
import { errorHandler } from './middleware/error-handler';
import { postgres } from '@nullstack/database';
import { redis } from '@nullstack/database';
import { connectMongoDB, mongoHealthCheck } from '@nullstack/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  const postgresHealthy = await postgres.healthCheck();
  const redisHealthy = await redis.healthCheck();
  const mongoHealthy = await mongoHealthCheck();

  const healthy = postgresHealthy && redisHealthy && mongoHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'leaderboards-service',
    timestamp: new Date().toISOString(),
    databases: {
      postgres: postgresHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy ? 'healthy' : 'unhealthy',
      mongodb: mongoHealthy ? 'healthy' : 'unhealthy',
    },
  });
});

// Leaderboards routes
app.use('/api/v1/leaderboards', leaderboardsRouter);

// Statistics routes
app.use('/api/v1/statistics', statisticsRouter);

app.use(errorHandler);

async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Leaderboards service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
