/**
 * API Gateway Client Example
 * Demonstrates how to interact with the NullStack API Gateway
 */

import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';

// Configuration
const API_BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:8080';
const WS_URL = process.env.WS_GATEWAY_URL || 'ws://localhost:8080/ws';

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[Request Error]', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[Response Error]', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// Example: Health Check
async function checkHealth() {
  console.log('\n=== Health Check ===');
  try {
    const response = await apiClient.get('/health');
    console.log('Basic Health:', response.data);

    const detailedResponse = await apiClient.get('/health/detailed');
    console.log('Detailed Health:', detailedResponse.data);
  } catch (error) {
    console.error('Health check failed:', error);
  }
}

// Example: Get API Gateway Info
async function getGatewayInfo() {
  console.log('\n=== Gateway Info ===');
  try {
    const response = await apiClient.get('/');
    console.log('Gateway Info:', response.data);
  } catch (error) {
    console.error('Failed to get gateway info:', error);
  }
}

// Example: Get Metrics
async function getMetrics() {
  console.log('\n=== Metrics ===');
  try {
    const response = await apiClient.get('/metrics');
    console.log('Metrics:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Failed to get metrics:', error);
  }
}

// Example: Auth Service - Login
async function login(email: string, password: string) {
  console.log('\n=== Login ===');
  try {
    const response = await apiClient.post('/api/v1/auth/login', {
      email,
      password,
    });
    console.log('Login successful:', response.data);
    return response.data.token;
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message);
    return null;
  }
}

// Example: Player Service - Get Player Profile
async function getPlayerProfile(token: string, playerId: string) {
  console.log('\n=== Get Player Profile ===');
  try {
    const response = await apiClient.get(`/api/v1/player/${playerId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Player Profile:', response.data);
  } catch (error: any) {
    console.error('Failed to get player profile:', error.response?.data || error.message);
  }
}

// Example: Economy Service - Get Virtual Currency
async function getVirtualCurrency(token: string) {
  console.log('\n=== Get Virtual Currency ===');
  try {
    const response = await apiClient.get('/api/v1/economy/currency', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Virtual Currency:', response.data);
  } catch (error: any) {
    console.error('Failed to get virtual currency:', error.response?.data || error.message);
  }
}

// Example: CloudScript - Execute Function
async function executeCloudScript(token: string, functionName: string, params: any) {
  console.log('\n=== Execute CloudScript ===');
  try {
    const response = await apiClient.post(
      '/api/v1/cloudscript/execute',
      {
        functionName,
        params,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('CloudScript Result:', response.data);
  } catch (error: any) {
    console.error('CloudScript execution failed:', error.response?.data || error.message);
  }
}

// Example: WebSocket Connection
function connectWebSocket() {
  console.log('\n=== WebSocket Connection ===');

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('WebSocket connected');

    // Authenticate
    ws.send(
      JSON.stringify({
        type: 'auth',
        data: {
          userId: 'user123',
          token: 'your-token-here',
        },
      })
    );

    // Subscribe to a channel
    ws.send(
      JSON.stringify({
        type: 'subscribe',
        data: {
          channel: 'game-updates',
        },
      })
    );

    // Send ping every 30 seconds
    setInterval(() => {
      ws.send(JSON.stringify({ type: 'ping' }));
    }, 30000);
  });

  ws.on('message', (data: Buffer) => {
    const message = JSON.parse(data.toString());
    console.log('WebSocket message received:', message);
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', (code: number, reason: Buffer) => {
    console.log('WebSocket disconnected:', code, reason.toString());
  });

  return ws;
}

// Example: Rate Limiting Test
async function testRateLimiting() {
  console.log('\n=== Rate Limiting Test ===');
  const requests = [];

  for (let i = 0; i < 10; i++) {
    requests.push(
      apiClient.get('/health').catch((error) => ({
        error: true,
        status: error.response?.status,
        message: error.message,
      }))
    );
  }

  const results = await Promise.all(requests);
  console.log('Rate limiting results:', results);
}

// Main execution
async function main() {
  console.log('NullStack API Gateway Client Example\n');

  // Basic tests
  await getGatewayInfo();
  await checkHealth();
  await getMetrics();

  // Auth flow example (will fail without actual auth service)
  const token = await login('user@example.com', 'password');
  if (token) {
    await getPlayerProfile(token, 'player123');
    await getVirtualCurrency(token);
    await executeCloudScript(token, 'dailyReward', { day: 1 });
  }

  // WebSocket example
  const ws = connectWebSocket();

  // Keep the process running for WebSocket
  setTimeout(() => {
    console.log('\nClosing WebSocket connection...');
    ws.close();
    process.exit(0);
  }, 10000);
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}

export {
  apiClient,
  checkHealth,
  getGatewayInfo,
  getMetrics,
  login,
  getPlayerProfile,
  getVirtualCurrency,
  executeCloudScript,
  connectWebSocket,
};
