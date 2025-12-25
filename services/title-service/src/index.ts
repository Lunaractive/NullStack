import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { postgres } from '@nullstack/database';
import { titlesRouter } from './routes/titles';
import { errorHandler } from './middleware/error-handler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security and parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealthy = await postgres.healthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    service: 'title-service',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1/titles', titlesRouter);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Title service listening on port ${PORT}`);
});

export default app;
