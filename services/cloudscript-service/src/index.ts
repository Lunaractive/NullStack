import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { functionsRouter } from './routes/functions';
import { executeRouter } from './routes/execute';
import { errorHandler } from './middleware/error-handler';
import { connectMongoDB, mongoHealthCheck } from '@nullstack/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const mongoHealthy = await mongoHealthCheck();

  res.status(mongoHealthy ? 200 : 503).json({
    status: mongoHealthy ? 'healthy' : 'unhealthy',
    service: 'cloudscript-service',
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: mongoHealthy,
    },
  });
});

// Routes
app.use('/api/v1/cloudscript', functionsRouter);
app.use('/api/v1/cloudscript', executeRouter);

// Error handler
app.use(errorHandler);

// Start server and connect to MongoDB
async function start() {
  try {
    // Try to connect to MongoDB
    try {
      await connectMongoDB();
      console.log('Connected to MongoDB');
    } catch (mongoError) {
      console.error('Failed to connect to MongoDB:', mongoError);
      console.log('CloudScript service will start without MongoDB (limited functionality)');
    }

    app.listen(PORT, () => {
      console.log(`CloudScript service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start CloudScript service:', error);
    process.exit(1);
  }
}

start();

export default app;
