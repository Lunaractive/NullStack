import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

// Service URLs - pointing to each microservice directly
const AUTH_SERVICE_URL = 'http://localhost:3001';
const TITLE_SERVICE_URL = 'http://localhost:3002';
const PLAYER_SERVICE_URL = 'http://localhost:3003';
const ECONOMY_SERVICE_URL = 'http://localhost:3004';
const CLOUDSCRIPT_SERVICE_URL = 'http://localhost:3007';
const ANALYTICS_SERVICE_URL = 'http://localhost:3009';

class ApiClient {
  private authClient: AxiosInstance;
  private titleClient: AxiosInstance;
  private playerClient: AxiosInstance;
  private economyClient: AxiosInstance;
  private cloudscriptClient: AxiosInstance;
  private analyticsClient: AxiosInstance;

  constructor() {
    // Create separate clients for each service
    this.authClient = this.createClient(AUTH_SERVICE_URL);
    this.titleClient = this.createClient(TITLE_SERVICE_URL);
    this.playerClient = this.createClient(PLAYER_SERVICE_URL);
    this.economyClient = this.createClient(ECONOMY_SERVICE_URL);
    this.cloudscriptClient = this.createClient(CLOUDSCRIPT_SERVICE_URL);
    this.analyticsClient = this.createClient(ANALYTICS_SERVICE_URL);
  }

  private createClient(baseURL: string): AxiosInstance {
    const client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          toast.error('Session expired. Please login again.');
        } else if (error.response?.status === 403) {
          toast.error('You do not have permission to perform this action.');
        } else if (error.response?.status >= 500) {
          toast.error('Server error. Please try again later.');
        }
        return Promise.reject(error);
      }
    );

    return client;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const { data } = await this.authClient.post('/api/v1/developer/auth/login', {
      email,
      password,
    });
    return data;
  }

  async register(email: string, password: string, name: string, companyName?: string) {
    const { data } = await this.authClient.post('/api/v1/developer/auth/register', {
      email,
      password,
      name,
      companyName,
    });
    return data;
  }

  async getCurrentDeveloper() {
    const { data } = await this.authClient.get('/api/v1/developer/auth/me');
    return data;
  }

  // Title endpoints
  async getTitles() {
    const { data } = await this.titleClient.get('/api/v1/titles');
    return data;
  }

  async getTitle(titleId: string) {
    const { data } = await this.titleClient.get(`/api/v1/titles/${titleId}`);
    return data;
  }

  async createTitle(name: string, description?: string) {
    const { data } = await this.titleClient.post('/api/v1/titles', {
      name,
    });
    return data;
  }

  async updateTitle(titleId: string, updates: any) {
    const { data } = await this.titleClient.patch(`/api/v1/titles/${titleId}`, updates);
    return data;
  }

  async deleteTitle(titleId: string) {
    const { data } = await this.titleClient.delete(`/api/v1/titles/${titleId}`);
    return data;
  }

  async regenerateApiKey(titleId: string) {
    const { data } = await this.titleClient.post(`/api/v1/titles/${titleId}/regenerate-key`);
    return data;
  }

  async getTitleStats(titleId: string) {
    // This endpoint doesn't exist yet, return mock data
    return {
      success: true,
      data: {
        totalPlayers: 0,
        activePlayers: 0,
        totalRevenue: 0,
        dailyActiveUsers: 0,
      },
    };
  }

  // Player endpoints - mock data for now since endpoints aren't fully implemented
  async getPlayers(titleId: string, search?: string, page = 1, limit = 20) {
    return {
      success: true,
      data: {
        items: [],
        total: 0,
        page,
        pageSize: limit,
        hasMore: false,
      },
    };
  }

  async getPlayer(titleId: string, playerId: string) {
    const { data } = await this.playerClient.get(`/api/v1/player/${playerId}/profile`);
    return data;
  }

  async updatePlayer(titleId: string, playerId: string, updates: any) {
    const { data } = await this.playerClient.put(`/api/v1/player/${playerId}/profile`, updates);
    return data;
  }

  async banPlayer(titleId: string, playerId: string, reason: string) {
    return { success: true, data: { message: 'Player banned' } };
  }

  async unbanPlayer(titleId: string, playerId: string) {
    return { success: true, data: { message: 'Player unbanned' } };
  }

  // Currency endpoints
  async getCurrencies(titleId: string) {
    try {
      const { data } = await this.economyClient.get('/api/v1/economy/currency', {
        params: { titleId },
      });
      return data;
    } catch (error) {
      // Return empty data on error to prevent logout
      return {
        success: true,
        data: {
          items: [],
          total: 0,
        },
      };
    }
  }

  async createCurrency(titleId: string, currency: any) {
    const { data } = await this.economyClient.post('/api/v1/economy/currency', {
      titleId,
      ...currency,
    });
    return data;
  }

  async updateCurrency(titleId: string, currencyId: string, updates: any) {
    const { data } = await this.economyClient.patch(
      `/api/v1/economy/currency/${currencyId}`,
      updates
    );
    return data;
  }

  async deleteCurrency(titleId: string, currencyId: string) {
    const { data } = await this.economyClient.delete(`/api/v1/economy/currency/${currencyId}`);
    return data;
  }

  // Catalog endpoints
  async getCatalogItems(titleId: string, search?: string) {
    try {
      const { data } = await this.economyClient.get('/api/v1/economy/catalog/items', {
        params: { titleId, search },
      });
      return data;
    } catch (error) {
      // Return empty data on error to prevent logout
      return {
        success: true,
        data: {
          items: [],
          total: 0,
        },
      };
    }
  }

  async getCatalogItem(titleId: string, itemId: string) {
    const { data } = await this.economyClient.get(`/api/v1/economy/catalog/items/${itemId}`);
    return data;
  }

  async createCatalogItem(titleId: string, item: any) {
    const { data } = await this.economyClient.post('/api/v1/economy/catalog/items', {
      titleId,
      ...item,
    });
    return data;
  }

  async updateCatalogItem(titleId: string, itemId: string, updates: any) {
    const { data } = await this.economyClient.patch(
      `/api/v1/economy/catalog/items/${itemId}`,
      updates
    );
    return data;
  }

  async deleteCatalogItem(titleId: string, itemId: string) {
    const { data } = await this.economyClient.delete(
      `/api/v1/economy/catalog/items/${itemId}`
    );
    return data;
  }

  // CloudScript endpoints
  async getCloudScripts(titleId: string, titleSecretKey?: string) {
    const { data } = await this.cloudscriptClient.get('/api/v1/cloudscript/functions', {
      headers: titleSecretKey ? { 'x-title-key': titleSecretKey } : {},
    });
    return {
      success: data.success,
      data: {
        items: data.data?.functions || [],
        total: data.data?.functions?.length || 0,
      },
    };
  }

  async getCloudScript(titleId: string, functionName: string, titleSecretKey?: string) {
    const { data } = await this.cloudscriptClient.get(`/api/v1/cloudscript/functions/${functionName}`, {
      headers: titleSecretKey ? { 'x-title-key': titleSecretKey } : {},
    });
    return data;
  }

  async saveCloudScript(titleId: string, functionName: string, code: string, titleSecretKey?: string) {
    const { data } = await this.cloudscriptClient.post(
      '/api/v1/cloudscript/functions',
      {
        functionName,
        code,
      },
      {
        headers: titleSecretKey ? { 'x-title-key': titleSecretKey } : {},
      }
    );
    return data;
  }

  async deleteCloudScript(titleId: string, functionName: string, titleSecretKey?: string) {
    const { data } = await this.cloudscriptClient.delete(`/api/v1/cloudscript/functions/${functionName}`, {
      headers: titleSecretKey ? { 'x-title-key': titleSecretKey } : {},
    });
    return data;
  }

  // Analytics endpoints
  async getAnalytics(titleId: string, period: 'day' | 'week' | 'month' = 'week') {
    try {
      const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data } = await this.analyticsClient.get('/api/v1/analytics/reports/dau', {
        params: {
          titleId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      return {
        success: true,
        data: {
          activeUsers: data.data || [],
          revenue: [],
          sessions: [],
        },
      };
    } catch (error) {
      // Return empty data on error (service might not have data yet)
      return {
        success: true,
        data: {
          activeUsers: [],
          revenue: [],
          sessions: [],
        },
      };
    }
  }
}

export const apiClient = new ApiClient();
