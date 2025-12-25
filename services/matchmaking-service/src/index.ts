import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { matchmakingRouter } from './routes/matchmaking';
import { queuesRouter } from './routes/queues';
import { errorHandler } from './middleware/error-handler';
import { postgres } from '@nullstack/database';
import { redis } from '@nullstack/database';
import { connectMongoDB, mongoHealthCheck } from '@nullstack/database';
import { matcher } from './matcher';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const postgresHealthy = await postgres.healthCheck();
  const redisHealthy = await redis.healthCheck();
  const mongoHealthy = await mongoHealthCheck();

  const allHealthy = postgresHealthy && redisHealthy && mongoHealthy;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    service: 'matchmaking-service',
    timestamp: new Date().toISOString(),
    dependencies: {
      postgres: postgresHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy ? 'healthy' : 'unhealthy',
      mongodb: mongoHealthy ? 'healthy' : 'unhealthy',
    },
  });
});

// Routes
app.use('/api/v1/matchmaking', matchmakingRouter);
app.use('/api/v1/matchmaking', queuesRouter);

// Error handler
app.use(errorHandler);

// Initialize database connections and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    console.log('Connected to MongoDB');

    // Ensure PostgreSQL table exists for queue persistence
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS matchmaking_queues (
        id SERIAL PRIMARY KEY,
        title_id UUID NOT NULL,
        queue_name VARCHAR(50) NOT NULL,
        config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(title_id, queue_name)
      )
    `);

    console.log('Database initialized');

    // Start the matchmaking matcher background process
    matcher.start();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Matchmaking service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  matcher.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  matcher.stop();
  process.exit(0);
});

startServer();

export default app;
