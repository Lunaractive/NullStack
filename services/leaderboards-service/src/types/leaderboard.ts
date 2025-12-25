export type ResetFrequency = 'never' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export type SortOrder = 'ascending' | 'descending';

export interface Leaderboard {
  id: string;
  titleId: string;
  leaderboardName: string;
  displayName: string;
  statisticName: string;
  sortOrder: SortOrder;
  resetFrequency: ResetFrequency;
  maxEntries: number;
  lastResetAt: Date;
  nextResetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaderboardEntry {
  leaderboardId: string;
  playerId: string;
  value: number;
  rank: number;
  updatedAt: Date;
}

export interface PlayerStatistic {
  titleId: string;
  playerId: string;
  statisticName: string;
  value: number;
  updatedAt: Date;
}
