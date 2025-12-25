/**
 * Swagger/OpenAPI Configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NullStack API Gateway',
      version: '1.0.0',
      description: `
        NullStack API Gateway provides a unified entry point for all NullStack microservices.

        ## Features
        - Centralized routing to microservices
        - Rate limiting and security
        - Request/response logging
        - Health monitoring
        - WebSocket support for real-time features

        ## Microservices
        - Auth Service: Authentication and authorization
        - Title Service: Game title management
        - Player Service: Player data and profiles
        - Economy Service: Virtual currency and transactions
        - CloudScript Service: Server-side game logic
        - Matchmaking Service: Player matchmaking
        - Analytics Service: Game analytics and metrics
      `,
      contact: {
        name: 'NullStack Support',
        email: 'support@nullstack.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_GATEWAY_URL || 'http://localhost:8080',
        description: 'API Gateway',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check and monitoring endpoints',
      },
      {
        name: 'Auth',
        description: 'Authentication and authorization',
      },
      {
        name: 'Titles',
        description: 'Game title management',
      },
      {
        name: 'Player',
        description: 'Player data and profiles',
      },
      {
        name: 'Economy',
        description: 'Virtual currency and transactions',
      },
      {
        name: 'CloudScript',
        description: 'Server-side game logic execution',
      },
      {
        name: 'Matchmaking',
        description: 'Player matchmaking and queues',
      },
      {
        name: 'Analytics',
        description: 'Game analytics and metrics',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Unauthorized',
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid or missing authentication token',
                  },
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Too Many Requests',
                  },
                  message: {
                    type: 'string',
                    example: 'Rate limit exceeded. Please try again later.',
                  },
                  retryAfter: {
                    type: 'number',
                    example: 60,
                  },
                },
              },
            },
          },
        },
        ServiceUnavailableError: {
          description: 'Service temporarily unavailable',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Service Unavailable',
                  },
                  message: {
                    type: 'string',
                    example: 'The requested service is temporarily unavailable',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
