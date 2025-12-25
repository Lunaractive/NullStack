import { ResetFrequency } from '../types/leaderboard';

export function calculateNextReset(
  frequency: ResetFrequency,
  fromDate: Date = new Date()
): Date | null {
  if (frequency === 'never') {
    return null;
  }

  const nextReset = new Date(fromDate);

  switch (frequency) {
    case 'hourly':
      nextReset.setHours(nextReset.getHours() + 1, 0, 0, 0);
      break;

    case 'daily':
      nextReset.setDate(nextReset.getDate() + 1);
      nextReset.setHours(0, 0, 0, 0);
      break;

    case 'weekly':
      // Reset on Monday at midnight
      const daysUntilMonday = (8 - nextReset.getDay()) % 7 || 7;
      nextReset.setDate(nextReset.getDate() + daysUntilMonday);
      nextReset.setHours(0, 0, 0, 0);
      break;

    case 'monthly':
      // Reset on 1st of next month at midnight
      nextReset.setMonth(nextReset.getMonth() + 1, 1);
      nextReset.setHours(0, 0, 0, 0);
      break;
  }

  return nextReset;
}

export function shouldReset(nextResetAt: Date | null): boolean {
  if (!nextResetAt) {
    return false;
  }
  return new Date() >= nextResetAt;
}
