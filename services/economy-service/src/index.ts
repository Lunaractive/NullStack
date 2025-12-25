import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { currencyRouter } from './routes/currency';
import { catalogRouter } from './routes/catalog';
import { inventoryRouter } from './routes/inventory';
import { errorHandler } from './middleware/error-handler';
import { postgres } from '@nullstack/database';
import { connectMongoDB, mongoHealthCheck } from '@nullstack/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  const postgresHealthy = await postgres.healthCheck();
  const mongoHealthy = await mongoHealthCheck();

  const healthy = postgresHealthy && mongoHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'economy-service',
    timestamp: new Date().toISOString(),
    databases: {
      postgres: postgresHealthy ? 'healthy' : 'unhealthy',
      mongodb: mongoHealthy ? 'healthy' : 'unhealthy',
    },
  });
});

// Currency routes
app.use('/api/v1/economy/currency', currencyRouter);

// Catalog routes
app.use('/api/v1/economy/catalog', catalogRouter);

// Inventory routes (note: inventory endpoints use /player/:playerId prefix)
app.use('/api/v1', inventoryRouter);

app.use(errorHandler);

async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Economy service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
