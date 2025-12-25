import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { playerDataRouter } from './routes/player-data';
import { statisticsRouter } from './routes/statistics';
import { errorHandler } from './middleware/error-handler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nullstack';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

async function mongoHealthCheck(): Promise<boolean> {
  try {
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}

app.get('/health', async (req, res) => {
  const dbHealthy = await mongoHealthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    service: 'player-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/player', playerDataRouter);
app.use('/api/v1/player', statisticsRouter);

app.use(errorHandler);

connectMongoDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Player service listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });

export default app;
