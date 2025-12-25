/**
 * WebSocket Server
 * Handles real-time bidirectional communication
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface WebSocketClient extends WebSocket {
  id: string;
  isAlive: boolean;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

export class NullStackWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient>;
  private heartbeatInterval: NodeJS.Timeout | null;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      clientTracking: false,
    });
    this.clients = new Map();
    this.heartbeatInterval = null;

    this.initialize();
  }

  private initialize(): void {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();

    logger.info('WebSocket server initialized on path: /ws');
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const client = ws as WebSocketClient;
    client.id = uuidv4();
    client.isAlive = true;

    // Store client
    this.clients.set(client.id, client);

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info(`WebSocket client connected:`, {
      clientId: client.id,
      ip,
      totalClients: this.clients.size,
    });

    // Setup event handlers
    client.on('pong', () => {
      client.isAlive = true;
    });

    client.on('message', (data: Buffer) => {
      this.handleMessage(client, data);
    });

    client.on('error', (error: Error) => {
      logger.error(`WebSocket error for client ${client.id}:`, error);
    });

    client.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(client, code, reason.toString());
    });

    // Send welcome message
    this.sendToClient(client, {
      type: 'connected',
      data: {
        clientId: client.id,
        timestamp: Date.now(),
      },
    });
  }

  private handleMessage(client: WebSocketClient, data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      logger.debug(`WebSocket message from ${client.id}:`, {
        type: message.type,
      });

      // Handle different message types
      switch (message.type) {
        case 'ping':
          this.sendToClient(client, { type: 'pong', timestamp: Date.now() });
          break;

        case 'auth':
          this.handleAuth(client, message.data);
          break;

        case 'subscribe':
          this.handleSubscribe(client, message.data);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(client, message.data);
          break;

        case 'broadcast':
          this.handleBroadcast(client, message.data);
          break;

        default:
          logger.warn(`Unknown WebSocket message type: ${message.type}`);
          this.sendToClient(client, {
            type: 'error',
            data: { message: 'Unknown message type' },
          });
      }
    } catch (error) {
      logger.error(`Failed to parse WebSocket message from ${client.id}:`, error);
      this.sendToClient(client, {
        type: 'error',
        data: { message: 'Invalid message format' },
      });
    }
  }

  private handleAuth(client: WebSocketClient, data: any): void {
    // Simple authentication - should be replaced with proper token validation
    const { userId, token } = data;

    // TODO: Validate token with auth service
    if (userId && token) {
      client.userId = userId;
      client.metadata = { ...client.metadata, authenticated: true };

      logger.info(`WebSocket client authenticated:`, {
        clientId: client.id,
        userId,
      });

      this.sendToClient(client, {
        type: 'auth_success',
        data: { userId },
      });
    } else {
      this.sendToClient(client, {
        type: 'auth_failed',
        data: { message: 'Invalid credentials' },
      });
    }
  }

  private handleSubscribe(client: WebSocketClient, data: any): void {
    const { channel } = data;

    if (!channel) {
      return this.sendToClient(client, {
        type: 'error',
        data: { message: 'Channel name required' },
      });
    }

    // Store subscription
    if (!client.metadata) {
      client.metadata = {};
    }
    if (!client.metadata.subscriptions) {
      client.metadata.subscriptions = new Set();
    }
    client.metadata.subscriptions.add(channel);

    logger.debug(`Client ${client.id} subscribed to channel: ${channel}`);

    this.sendToClient(client, {
      type: 'subscribed',
      data: { channel },
    });
  }

  private handleUnsubscribe(client: WebSocketClient, data: any): void {
    const { channel } = data;

    if (client.metadata?.subscriptions) {
      client.metadata.subscriptions.delete(channel);

      logger.debug(`Client ${client.id} unsubscribed from channel: ${channel}`);

      this.sendToClient(client, {
        type: 'unsubscribed',
        data: { channel },
      });
    }
  }

  private handleBroadcast(client: WebSocketClient, data: any): void {
    const { channel, message } = data;

    if (!channel || !message) {
      return this.sendToClient(client, {
        type: 'error',
        data: { message: 'Channel and message required' },
      });
    }

    this.broadcastToChannel(channel, {
      type: 'message',
      data: {
        channel,
        message,
        from: client.userId || client.id,
        timestamp: Date.now(),
      },
    });
  }

  private handleDisconnection(client: WebSocketClient, code: number, reason: string): void {
    this.clients.delete(client.id);

    logger.info(`WebSocket client disconnected:`, {
      clientId: client.id,
      userId: client.userId,
      code,
      reason: reason || 'No reason provided',
      totalClients: this.clients.size,
    });
  }

  private sendToClient(client: WebSocketClient, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || Date.now(),
      }));
    }
  }

  public broadcastToAll(message: WebSocketMessage, excludeClientId?: string): void {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId) {
        this.sendToClient(client, message);
      }
    });
  }

  public broadcastToChannel(channel: string, message: WebSocketMessage): void {
    this.clients.forEach((client) => {
      if (client.metadata?.subscriptions?.has(channel)) {
        this.sendToClient(client, message);
      }
    });
  }

  public sendToUser(userId: string, message: WebSocketMessage): void {
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        this.sendToClient(client, message);
      }
    });
  }

  private startHeartbeat(): void {
    // Ping clients every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.isAlive === false) {
          logger.debug(`Terminating inactive client: ${clientId}`);
          this.clients.delete(clientId);
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    logger.info('WebSocket heartbeat started');
  }

  public getStats() {
    return {
      totalConnections: this.clients.size,
      authenticatedUsers: Array.from(this.clients.values()).filter(c => c.userId).length,
    };
  }

  public shutdown(): void {
    logger.info('Shutting down WebSocket server...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    this.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });

    this.wss.close(() => {
      logger.info('WebSocket server closed');
    });
  }
}

export default NullStackWebSocketServer;
