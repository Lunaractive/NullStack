export interface TitleInfo {
  id: string;
  name: string;
  developerId: string;
  secretKey: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'suspended' | 'deleted';
  settings: TitleSettings;
}

export interface TitleSettings {
  allowAnonymousLogin: boolean;
  requireEmailVerification: boolean;
  maxPlayersPerTitle: number;
  dataRetentionDays: number;
  allowCrossPlay: boolean;
}

export interface DeveloperAccount {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  companyName?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles: DeveloperRole[];
}

export type DeveloperRole = 'owner' | 'admin' | 'developer' | 'analyst' | 'support';

export interface PlayerAccount {
  id: string;
  titleId: string;
  username?: string;
  email?: string;
  linkedAccounts: LinkedAccount[];
  createdAt: Date;
  lastLoginAt: Date;
  banned: boolean;
  banExpires?: Date;
}

export interface LinkedAccount {
  platform: 'email' | 'google' | 'facebook' | 'steam' | 'apple' | 'custom' | 'anonymous';
  platformUserId: string;
  linkedAt: Date;
}

export interface PlayerProfile {
  playerId: string;
  titleId: string;
  displayName: string;
  avatarUrl?: string;
  level: number;
  experience: number;
  tags: string[];
  customData: Record<string, any>;
  statistics: Record<string, number>;
}

export interface VirtualCurrency {
  id: string;
  titleId: string;
  code: string;
  name: string;
  initialDeposit: number;
  rechargeRate?: number;
  rechargeMax?: number;
}

export interface PlayerInventory {
  playerId: string;
  titleId: string;
  items: InventoryItem[];
}

export interface InventoryItem {
  itemInstanceId: string;
  itemId: string;
  catalogVersion: string;
  purchaseDate: Date;
  expiration?: Date;
  remainingUses?: number;
  customData?: Record<string, any>;
}

export interface CatalogItem {
  id: string;
  titleId: string;
  catalogVersion: string;
  itemClass: string;
  displayName: string;
  description: string;
  virtualCurrencyPrices: Record<string, number>;
  realMoneyPrices?: Record<string, number>;
  tags: string[];
  customData?: Record<string, any>;
  consumable?: {
    usageCount: number;
    usagePeriod?: number;
  };
  container?: {
    items: string[];
    resultTableId?: string;
  };
  bundle?: {
    bundledItems: string[];
    bundledVirtualCurrencies: Record<string, number>;
  };
}

export interface Leaderboard {
  id: string;
  titleId: string;
  statisticName: string;
  resetFrequency: 'never' | 'hour' | 'day' | 'week' | 'month';
  aggregationMethod: 'last' | 'min' | 'max' | 'sum';
  lastResetAt?: Date;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  statisticValue: number;
  position: number;
  updatedAt: Date;
}

export interface CloudScriptFunction {
  id: string;
  titleId: string;
  functionName: string;
  code: string;
  runtime: 'nodejs18' | 'nodejs20';
  timeoutSeconds: number;
  memoryMB: number;
  version: number;
  published: boolean;
}

export interface CloudScriptExecution {
  id: string;
  titleId: string;
  functionName: string;
  playerId?: string;
  args: Record<string, any>;
  result?: any;
  error?: string;
  executionTimeMs: number;
  createdAt: Date;
}

export interface MatchmakingTicket {
  id: string;
  titleId: string;
  playerId: string;
  queueName: string;
  attributes: Record<string, any>;
  createdAt: Date;
  status: 'waiting' | 'matched' | 'cancelled' | 'expired';
  matchId?: string;
}

export interface Match {
  id: string;
  titleId: string;
  queueName: string;
  players: MatchPlayer[];
  createdAt: Date;
  serverInfo?: {
    host: string;
    port: number;
    region: string;
  };
}

export interface MatchPlayer {
  playerId: string;
  teamId?: string;
  attributes: Record<string, any>;
}

export interface EventData {
  id: string;
  titleId: string;
  playerId?: string;
  eventName: string;
  eventNamespace: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  source: string;
}

export interface Segment {
  id: string;
  titleId: string;
  name: string;
  description: string;
  filters: SegmentFilter[];
  playerCount?: number;
  updatedAt: Date;
}

export interface SegmentFilter {
  property: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'in';
  value: any;
}

export interface ABTest {
  id: string;
  titleId: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  status: 'draft' | 'running' | 'completed';
  startDate?: Date;
  endDate?: Date;
  targetSegmentId?: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number;
  variables: Record<string, any>;
  playerCount: number;
  conversionRate: number;
}

export interface ScheduledTask {
  id: string;
  titleId: string;
  name: string;
  description: string;
  schedule: string;
  functionName: string;
  parameters: Record<string, any>;
  enabled: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'failure';
}

export interface Webhook {
  id: string;
  titleId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdAt: Date;
}

export interface PushNotification {
  id: string;
  titleId: string;
  targetSegmentId?: string;
  targetPlayerIds?: string[];
  title: string;
  message: string;
  data?: Record<string, any>;
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  sentCount: number;
  failedCount: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
