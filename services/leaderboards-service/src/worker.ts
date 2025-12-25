import cron from 'node-cron';
import dotenv from 'dotenv';
import { postgres } from '@nullstack/database';
import { redis } from '@nullstack/database';
import { connectMongoDB } from '@nullstack/database';
import { calculateNextReset, shouldReset } from './utils/reset-scheduler';
import { ResetFrequency } from './types/leaderboard';

dotenv.config();

async function checkAndResetLeaderboards() {
  try {
    console.log('Checking for leaderboards that need to be reset...');

    // Get all leaderboards that need to be reset
    const result = await postgres.query(
      `SELECT id, reset_frequency, next_reset_at
       FROM leaderboards
       WHERE reset_frequency != 'never'
       AND next_reset_at IS NOT NULL
       AND next_reset_at <= NOW()`
    );

    if (result.rows.length === 0) {
      console.log('No leaderboards need to be reset at this time');
      return;
    }

    console.log(`Found ${result.rows.length} leaderboards to reset`);

    for (const leaderboard of result.rows) {
      try {
        console.log(`Resetting leaderboard ${leaderboard.id}...`);

        // Clear leaderboard entries in Redis
        const redisKey = `leaderboard:${leaderboard.id}:scores`;
        await redis.delete(redisKey);

        // Clear all cache for this leaderboard
        await redis.deletePattern(`leaderboard:${leaderboard.id}:*`);

        // Calculate next reset time
        const now = new Date();
        const nextResetAt = calculateNextReset(
          leaderboard.reset_frequency as ResetFrequency,
          now
        );

        // Update leaderboard reset times
        await postgres.query(
          `UPDATE leaderboards
           SET last_reset_at = $1, next_reset_at = $2, updated_at = $3
           WHERE id = $4`,
          [now, nextResetAt, now, leaderboard.id]
        );

        console.log(
          `Leaderboard ${leaderboard.id} reset successfully. Next reset: ${nextResetAt}`
        );
      } catch (error) {
        console.error(`Error resetting leaderboard ${leaderboard.id}:`, error);
      }
    }

    console.log('Leaderboard reset check completed');
  } catch (error) {
    console.error('Error in checkAndResetLeaderboards:', error);
  }
}

async function startWorker() {
  try {
    // Connect to MongoDB (if needed)
    await connectMongoDB();
    console.log('Connected to MongoDB');

    console.log('Leaderboards reset worker started');

    // Run every minute
    cron.schedule('* * * * *', async () => {
      await checkAndResetLeaderboards();
    });

    console.log('Scheduled task registered - checking every minute');

    // Also run immediately on startup
    await checkAndResetLeaderboards();
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await redis.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await redis.close();
  process.exit(0);
});

startWorker();
