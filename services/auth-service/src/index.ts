import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { developerAuthRouter } from './routes/developer-auth';
import { playerAuthRouter } from './routes/player-auth';
import { errorHandler } from './middleware/error-handler';
import { postgres } from '@nullstack/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  const dbHealthy = await postgres.healthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/developer/auth', developerAuthRouter);
app.use('/api/v1/player/auth', playerAuthRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Auth service listening on port ${PORT}`);
});

export default app;
