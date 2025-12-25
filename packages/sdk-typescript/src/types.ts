/**
 * NullStack SDK Type Definitions
 */

// Configuration
export interface NullStackConfig {
  titleId: string;
  apiUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// Authentication
export interface LoginWithEmailRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
}

export interface LoginAnonymousRequest {
  deviceId?: string;
  createAccount?: boolean;
}

export interface AuthResponse {
  playerId: string;
  sessionToken: string;
  entityToken: string;
  newlyCreated: boolean;
}

// Player Data
export interface PlayerProfile {
  playerId: string;
  displayName?: string;
  username?: string;
  email?: string;
  created: string;
  lastLogin: string;
  statistics?: Record<string, number>;
  tags?: string[];
}

export interface UpdateProfileRequest {
  displayName?: string;
  avatarUrl?: string;
}

export interface GetDataRequest {
  keys?: string[];
}

export interface SetDataRequest {
  data: Record<string, any>;
  permission?: 'Public' | 'Private';
}

export interface PlayerData {
  data: Record<string, PlayerDataValue>;
}

export interface PlayerDataValue {
  value: any;
  lastUpdated: string;
  permission: 'Public' | 'Private';
}

// Economy
export interface Currency {
  code: string;
  name: string;
  initialDeposit: number;
}

export interface PlayerCurrency {
  currencyCode: string;
  amount: number;
}

export interface CatalogItem {
  itemId: string;
  itemClass: string;
  displayName: string;
  description?: string;
  virtualCurrencyPrices?: Record<string, number>;
  realCurrencyPrices?: Record<string, number>;
  tags?: string[];
  customData?: Record<string, any>;
  isStackable: boolean;
  isLimitedEdition: boolean;
  initialLimitedEditionCount?: number;
}

export interface PurchaseItemRequest {
  itemId: string;
  currencyCode: string;
  price: number;
}

export interface PurchaseItemResponse {
  itemInstanceId: string;
  remainingUses?: number;
  purchaseDate: string;
}

export interface InventoryItem {
  itemInstanceId: string;
  itemId: string;
  itemClass: string;
  displayName: string;
  purchaseDate: string;
  remainingUses?: number;
  annotation?: string;
  customData?: Record<string, any>;
}

export interface ConsumeItemRequest {
  itemInstanceId: string;
  consumeCount?: number;
}

export interface ConsumeItemResponse {
  itemInstanceId: string;
  remainingUses: number;
}

// Leaderboards
export interface LeaderboardEntry {
  position: number;
  playerId: string;
  displayName?: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface GetLeaderboardRequest {
  statisticName: string;
  startPosition?: number;
  maxResults?: number;
}

export interface GetLeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  version: number;
  nextReset?: string;
}

export interface SubmitScoreRequest {
  statisticName: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface SubmitScoreResponse {
  position: number;
  value: number;
}

// CloudScript
export interface ExecuteCloudScriptRequest {
  functionName: string;
  functionParameter?: any;
  generatePlayStreamEvent?: boolean;
}

export interface ExecuteCloudScriptResponse {
  functionResult: any;
  logs?: CloudScriptLog[];
  executionTimeSeconds: number;
  processorTimeSeconds: number;
  memoryConsumedBytes: number;
  apiRequestsIssued: number;
  httpRequestsIssued: number;
  error?: CloudScriptError;
}

export interface CloudScriptLog {
  level: string;
  message: string;
}

export interface CloudScriptError {
  error: string;
  message: string;
  stackTrace?: string;
}

// Analytics
export interface TrackEventRequest {
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

// Error Handling
export interface NullStackError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  code: number;
}
