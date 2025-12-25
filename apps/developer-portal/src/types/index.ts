export interface Developer {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Title {
  id: string;
  name: string;
  description?: string;
  developerId: string;
  apiKey: string;
  secretKey: string;
  createdAt: string;
  updatedAt: string;
  settings?: TitleSettings;
}

export interface TitleSettings {
  allowGuestLogins?: boolean;
  maxPlayersPerTitle?: number;
  sessionTicketExpiry?: number;
  enableAnalytics?: boolean;
}

export interface Player {
  id: string;
  titleId: string;
  displayName: string;
  email?: string;
  createdAt: string;
  lastLogin?: string;
  banned: boolean;
  banReason?: string;
  tags?: string[];
}

export interface Currency {
  id: string;
  titleId: string;
  code: string;
  name: string;
  initialDeposit?: number;
  rechargeRate?: number;
  rechargeMax?: number;
}

export interface CatalogItem {
  id: string;
  titleId: string;
  itemId: string;
  displayName: string;
  description?: string;
  itemClass?: string;
  tags?: string[];
  isStackable: boolean;
  isTradable: boolean;
  virtualCurrencyPrices?: Record<string, number>;
  realCurrencyPrices?: Record<string, number>;
}

export interface CloudScriptFunction {
  id: string;
  titleId: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  titleId: string;
  period: 'day' | 'week' | 'month';
  activeUsers: number;
  newUsers: number;
  totalLogins: number;
  avgSessionDuration: number;
  revenue?: number;
}

export interface Stats {
  totalPlayers: number;
  activePlayers: number;
  newPlayersToday: number;
  totalRevenue: number;
  apiCalls24h: number;
}

export interface AuthResponse {
  token: string;
  developer: Developer;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface CreateTitleRequest {
  name: string;
  description?: string;
}

export interface UpdatePlayerRequest {
  displayName?: string;
  banned?: boolean;
  banReason?: string;
  tags?: string[];
}

export interface CreateCurrencyRequest {
  code: string;
  name: string;
  initialDeposit?: number;
  rechargeRate?: number;
  rechargeMax?: number;
}

export interface CreateCatalogItemRequest {
  itemId: string;
  displayName: string;
  description?: string;
  itemClass?: string;
  tags?: string[];
  isStackable?: boolean;
  isTradable?: boolean;
  virtualCurrencyPrices?: Record<string, number>;
  realCurrencyPrices?: Record<string, number>;
}

export interface SaveCloudScriptRequest {
  name: string;
  code: string;
}
