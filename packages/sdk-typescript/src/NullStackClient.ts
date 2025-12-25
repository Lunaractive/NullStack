import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  NullStackConfig,
  LoginWithEmailRequest,
  RegisterRequest,
  LoginAnonymousRequest,
  AuthResponse,
  PlayerProfile,
  UpdateProfileRequest,
  GetDataRequest,
  SetDataRequest,
  PlayerData,
  PlayerCurrency,
  PurchaseItemRequest,
  PurchaseItemResponse,
  InventoryItem,
  ConsumeItemRequest,
  ConsumeItemResponse,
  GetLeaderboardRequest,
  GetLeaderboardResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
  ExecuteCloudScriptRequest,
  ExecuteCloudScriptResponse,
  TrackEventRequest,
  NullStackError,
  ApiResponse,
} from './types';

/**
 * Main NullStack SDK Client
 *
 * @example
 * ```typescript
 * const client = new NullStackClient({
 *   titleId: 'your-title-id',
 *   apiUrl: 'https://api.nullstack.com'
 * });
 *
 * // Login
 * const auth = await client.loginWithEmail({
 *   email: 'player@example.com',
 *   password: 'password123'
 * });
 *
 * // Get player data
 * const profile = await client.getProfile();
 * ```
 */
export class NullStackClient {
  private readonly config: Required<NullStackConfig>;
  private client: AxiosInstance;
  private sessionToken: string | null = null;
  private entityToken: string | null = null;
  private playerId: string | null = null;

  constructor(config: NullStackConfig) {
    this.config = {
      titleId: config.titleId,
      apiUrl: config.apiUrl || 'https://api.nullstack.com',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Title-Id': this.config.titleId,
      },
    });

    // Request interceptor to add auth tokens
    this.client.interceptors.request.use((config) => {
      if (this.sessionToken) {
        config.headers['X-Session-Token'] = this.sessionToken;
      }
      if (this.entityToken) {
        config.headers['X-Entity-Token'] = this.entityToken;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * Handle API errors and throw formatted errors
   */
  private async handleError(error: AxiosError): Promise<never> {
    const nullStackError: NullStackError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      status: error.response?.status || 500,
    };

    if (error.response?.data) {
      const data = error.response.data as any;
      nullStackError.code = data.code || data.errorCode || 'API_ERROR';
      nullStackError.message = data.message || data.errorMessage || error.message;
      nullStackError.details = data.details || data.errorDetails;
    } else if (error.request) {
      nullStackError.code = 'NETWORK_ERROR';
      nullStackError.message = 'Network error - could not reach the server';
    } else {
      nullStackError.message = error.message;
    }

    throw nullStackError;
  }

  /**
   * Make API request with retry logic
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    attempt: number = 1
  ): Promise<T> {
    try {
      const response = await this.client.request<ApiResponse<T>>({
        method,
        url: endpoint,
        data,
      });
      return response.data.data;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay * attempt);
        return this.request<T>(method, endpoint, data, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Login with email and password
   *
   * @example
   * ```typescript
   * const auth = await client.loginWithEmail({
   *   email: 'player@example.com',
   *   password: 'password123'
   * });
   * console.log('Player ID:', auth.playerId);
   * ```
   */
  async loginWithEmail(request: LoginWithEmailRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      'POST',
      '/client/auth/login/email',
      request
    );
    this.setAuthTokens(response);
    return response;
  }

  /**
   * Register a new account with email and password
   *
   * @example
   * ```typescript
   * const auth = await client.register({
   *   email: 'newplayer@example.com',
   *   password: 'securepass123',
   *   username: 'newplayer',
   *   displayName: 'New Player'
   * });
   * ```
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      'POST',
      '/client/auth/register',
      request
    );
    this.setAuthTokens(response);
    return response;
  }

  /**
   * Login anonymously with a device ID
   *
   * @example
   * ```typescript
   * const auth = await client.loginAnonymous({
   *   deviceId: 'device-123',
   *   createAccount: true
   * });
   * ```
   */
  async loginAnonymous(request: LoginAnonymousRequest = {}): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      'POST',
      '/client/auth/login/anonymous',
      request
    );
    this.setAuthTokens(response);
    return response;
  }

  /**
   * Store authentication tokens from login response
   */
  private setAuthTokens(auth: AuthResponse): void {
    this.sessionToken = auth.sessionToken;
    this.entityToken = auth.entityToken;
    this.playerId = auth.playerId;
  }

  /**
   * Clear all authentication tokens
   */
  logout(): void {
    this.sessionToken = null;
    this.entityToken = null;
    this.playerId = null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionToken !== null && this.entityToken !== null;
  }

  /**
   * Get current player ID
   */
  getPlayerId(): string | null {
    return this.playerId;
  }

  // ============================================================================
  // PLAYER DATA
  // ============================================================================

  /**
   * Get the current player's profile
   *
   * @example
   * ```typescript
   * const profile = await client.getProfile();
   * console.log('Display Name:', profile.displayName);
   * ```
   */
  async getProfile(): Promise<PlayerProfile> {
    return this.request<PlayerProfile>('GET', '/client/player/profile');
  }

  /**
   * Update the current player's profile
   *
   * @example
   * ```typescript
   * await client.updateProfile({
   *   displayName: 'Pro Gamer',
   *   avatarUrl: 'https://example.com/avatar.png'
   * });
   * ```
   */
  async updateProfile(request: UpdateProfileRequest): Promise<PlayerProfile> {
    return this.request<PlayerProfile>('PUT', '/client/player/profile', request);
  }

  /**
   * Get player data (key-value storage)
   *
   * @example
   * ```typescript
   * const data = await client.getData({ keys: ['level', 'experience'] });
   * console.log('Level:', data.data.level.value);
   * ```
   */
  async getData(request: GetDataRequest = {}): Promise<PlayerData> {
    const params = request.keys ? { keys: request.keys.join(',') } : {};
    return this.request<PlayerData>('GET', '/client/player/data', params);
  }

  /**
   * Set player data (key-value storage)
   *
   * @example
   * ```typescript
   * await client.setData({
   *   data: {
   *     level: 10,
   *     experience: 5000,
   *     settings: { soundEnabled: true }
   *   },
   *   permission: 'Private'
   * });
   * ```
   */
  async setData(request: SetDataRequest): Promise<void> {
    await this.request<void>('PUT', '/client/player/data', request);
  }

  // ============================================================================
  // ECONOMY
  // ============================================================================

  /**
   * Get player's virtual currencies
   *
   * @example
   * ```typescript
   * const currencies = await client.getCurrencies();
   * currencies.forEach(c => console.log(`${c.currencyCode}: ${c.amount}`));
   * ```
   */
  async getCurrencies(): Promise<PlayerCurrency[]> {
    return this.request<PlayerCurrency[]>('GET', '/client/economy/currencies');
  }

  /**
   * Purchase an item from the catalog
   *
   * @example
   * ```typescript
   * const result = await client.purchaseItem({
   *   itemId: 'sword_legendary',
   *   currencyCode: 'GO',
   *   price: 1000
   * });
   * console.log('Item Instance ID:', result.itemInstanceId);
   * ```
   */
  async purchaseItem(request: PurchaseItemRequest): Promise<PurchaseItemResponse> {
    return this.request<PurchaseItemResponse>(
      'POST',
      '/client/economy/purchase',
      request
    );
  }

  /**
   * Get player's inventory
   *
   * @example
   * ```typescript
   * const inventory = await client.getInventory();
   * console.log(`You have ${inventory.length} items`);
   * ```
   */
  async getInventory(): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>('GET', '/client/economy/inventory');
  }

  /**
   * Consume an inventory item
   *
   * @example
   * ```typescript
   * const result = await client.consumeItem({
   *   itemInstanceId: 'item-instance-123',
   *   consumeCount: 1
   * });
   * console.log('Remaining uses:', result.remainingUses);
   * ```
   */
  async consumeItem(request: ConsumeItemRequest): Promise<ConsumeItemResponse> {
    return this.request<ConsumeItemResponse>(
      'POST',
      '/client/economy/consume',
      request
    );
  }

  // ============================================================================
  // LEADERBOARDS
  // ============================================================================

  /**
   * Get a leaderboard
   *
   * @example
   * ```typescript
   * const leaderboard = await client.getLeaderboard({
   *   statisticName: 'HighScore',
   *   startPosition: 0,
   *   maxResults: 100
   * });
   * leaderboard.leaderboard.forEach(entry => {
   *   console.log(`${entry.position}. ${entry.displayName}: ${entry.score}`);
   * });
   * ```
   */
  async getLeaderboard(request: GetLeaderboardRequest): Promise<GetLeaderboardResponse> {
    const params = {
      startPosition: request.startPosition || 0,
      maxResults: request.maxResults || 100,
    };
    return this.request<GetLeaderboardResponse>(
      'GET',
      `/client/leaderboard/${request.statisticName}`,
      params
    );
  }

  /**
   * Submit a score to a leaderboard
   *
   * @example
   * ```typescript
   * const result = await client.submitScore({
   *   statisticName: 'HighScore',
   *   value: 10000,
   *   metadata: { level: 'hard', time: 120 }
   * });
   * console.log('Your position:', result.position);
   * ```
   */
  async submitScore(request: SubmitScoreRequest): Promise<SubmitScoreResponse> {
    return this.request<SubmitScoreResponse>(
      'POST',
      `/client/leaderboard/${request.statisticName}`,
      {
        value: request.value,
        metadata: request.metadata,
      }
    );
  }

  // ============================================================================
  // CLOUDSCRIPT
  // ============================================================================

  /**
   * Execute a CloudScript function
   *
   * @example
   * ```typescript
   * const result = await client.execute({
   *   functionName: 'grantDailyReward',
   *   functionParameter: { day: 7 }
   * });
   * console.log('Result:', result.functionResult);
   * ```
   */
  async execute(request: ExecuteCloudScriptRequest): Promise<ExecuteCloudScriptResponse> {
    return this.request<ExecuteCloudScriptResponse>(
      'POST',
      '/client/cloudscript/execute',
      request
    );
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Track a custom analytics event
   *
   * @example
   * ```typescript
   * await client.trackEvent({
   *   eventName: 'level_completed',
   *   properties: {
   *     level: 5,
   *     score: 1000,
   *     duration: 120
   *   }
   * });
   * ```
   */
  async trackEvent(request: TrackEventRequest): Promise<void> {
    await this.request<void>('POST', '/client/analytics/event', {
      ...request,
      timestamp: request.timestamp || new Date().toISOString(),
    });
  }
}
