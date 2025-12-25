export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // Title errors
  TITLE_NOT_FOUND: 'TITLE_NOT_FOUND',
  INVALID_TITLE_KEY: 'INVALID_TITLE_KEY',
  TITLE_SUSPENDED: 'TITLE_SUSPENDED',

  // Player errors
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  PLAYER_BANNED: 'PLAYER_BANNED',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  ACCOUNT_ALREADY_LINKED: 'ACCOUNT_ALREADY_LINKED',

  // Economy errors
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  INVALID_PURCHASE: 'INVALID_PURCHASE',
  INVENTORY_FULL: 'INVENTORY_FULL',

  // CloudScript errors
  FUNCTION_NOT_FOUND: 'FUNCTION_NOT_FOUND',
  FUNCTION_TIMEOUT: 'FUNCTION_TIMEOUT',
  FUNCTION_ERROR: 'FUNCTION_ERROR',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
} as const;

export const PLAYER_DATA_KEYS = {
  CUSTOM_DATA: 'CustomData',
  READ_ONLY_DATA: 'ReadOnlyData',
  INTERNAL_DATA: 'InternalData',
} as const;

export const DEFAULT_TITLE_SETTINGS = {
  allowAnonymousLogin: true,
  requireEmailVerification: false,
  maxPlayersPerTitle: 1000000,
  dataRetentionDays: 365,
  allowCrossPlay: true,
};

export const RATE_LIMITS = {
  AUTH_LOGIN_PER_IP: { windowMs: 15 * 60 * 1000, max: 5 },
  API_PER_TITLE: { windowMs: 60 * 1000, max: 1000 },
  API_PER_PLAYER: { windowMs: 60 * 1000, max: 100 },
  CLOUDSCRIPT_PER_PLAYER: { windowMs: 60 * 1000, max: 60 },
} as const;

export const SUPPORTED_PLATFORMS = [
  'email',
  'google',
  'facebook',
  'steam',
  'apple',
  'custom',
  'anonymous',
] as const;

export const LEADERBOARD_RESET_FREQUENCIES = [
  'never',
  'hour',
  'day',
  'week',
  'month',
] as const;

export const LEADERBOARD_AGGREGATION_METHODS = [
  'last',
  'min',
  'max',
  'sum',
] as const;

export const CLOUDSCRIPT_RUNTIMES = ['nodejs18', 'nodejs20'] as const;

export const MAX_LEADERBOARD_ENTRIES = 100;
export const MAX_INVENTORY_ITEMS = 10000;
export const MAX_CATALOG_ITEMS_PER_PAGE = 100;
export const MAX_PLAYER_DATA_SIZE_KB = 1024;
export const MAX_CLOUDSCRIPT_TIMEOUT_SECONDS = 30;
export const MAX_CLOUDSCRIPT_MEMORY_MB = 512;

export const EVENT_TYPES = {
  PLAYER_LOGGED_IN: 'player.logged_in',
  PLAYER_REGISTERED: 'player.registered',
  PLAYER_UPDATED: 'player.updated',
  PLAYER_BANNED: 'player.banned',

  CURRENCY_GRANTED: 'economy.currency_granted',
  CURRENCY_CONSUMED: 'economy.currency_consumed',
  ITEM_PURCHASED: 'economy.item_purchased',
  ITEM_CONSUMED: 'economy.item_consumed',

  STATISTIC_UPDATED: 'statistics.updated',
  ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',

  MATCH_CREATED: 'matchmaking.match_created',
  MATCH_JOINED: 'matchmaking.match_joined',

  CLOUDSCRIPT_EXECUTED: 'cloudscript.executed',
  CLOUDSCRIPT_ERROR: 'cloudscript.error',
} as const;
