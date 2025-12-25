import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '@nullstack/database';
import { Match, MatchmakingTicket } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { validateRequest } from '../middleware/validate-request';
import { verifyPlayerToken, AuthRequest } from '../middleware/auth';

const router = Router();

const createTicketSchema = z.object({
  queueName: z.string().min(1),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  giveUpAfterSeconds: z.number().min(10).max(600).optional(),
});

// POST /api/v1/matchmaking/ticket - Create matchmaking ticket
router.post(
  '/ticket',
  verifyPlayerToken,
  validateRequest(createTicketSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { queueName, attributes, giveUpAfterSeconds } = req.body;
      const { playerId, titleId } = req;

      if (!playerId || !titleId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      // Check if queue exists
      const queueConfig = await redis.get(`queue:${titleId}:${queueName}`);
      if (!queueConfig) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Queue not found',
          },
        });
      }

      // Check if player already has an active ticket
      const existingTicket = await MatchmakingTicket.findOne({
        titleId,
        playerId,
        status: 'waiting',
      });

      if (existingTicket) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.CONFLICT,
            message: 'Player already has an active matchmaking ticket',
          },
        });
      }

      // Create new ticket
      const ticketId = uuidv4();
      const ticket = await MatchmakingTicket.create({
        _id: ticketId,
        titleId,
        playerId,
        queueName,
        attributes: attributes || {},
        status: 'waiting',
        createdAt: new Date(),
      });

      // Add ticket to Redis waiting queue for fast matching
      const ticketData = {
        ticketId,
        playerId,
        attributes: attributes || {},
        createdAt: Date.now(),
        giveUpAfter: giveUpAfterSeconds
          ? Date.now() + giveUpAfterSeconds * 1000
          : null,
      };

      await redis.zadd(
        `waiting:${titleId}:${queueName}`,
        Date.now(),
        JSON.stringify(ticketData)
      );

      // Set expiration on ticket
      const ttl = giveUpAfterSeconds || 300;
      await redis.set(
        `ticket:${ticketId}`,
        JSON.stringify(ticketData),
        ttl
      );

      res.status(201).json({
        success: true,
        data: {
          ticketId: ticket._id,
          status: ticket.status,
          queueName: ticket.queueName,
          createdAt: ticket.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/matchmaking/ticket/:ticketId - Get ticket status
router.get(
  '/ticket/:ticketId',
  verifyPlayerToken,
  async (req: AuthRequest, res, next) => {
    try {
      const { ticketId } = req.params;
      const { playerId, titleId } = req;

      if (!playerId || !titleId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      const ticket = await MatchmakingTicket.findById(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Ticket not found',
          },
        });
      }

      // Verify ticket belongs to player
      if (ticket.playerId !== playerId) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Not authorized to view this ticket',
          },
        });
      }

      const response: any = {
        ticketId: ticket._id,
        status: ticket.status,
        queueName: ticket.queueName,
        createdAt: ticket.createdAt,
      };

      if (ticket.status === 'matched' && ticket.matchId) {
        response.matchId = ticket.matchId;
      }

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/matchmaking/ticket/:ticketId - Cancel ticket
router.delete(
  '/ticket/:ticketId',
  verifyPlayerToken,
  async (req: AuthRequest, res, next) => {
    try {
      const { ticketId } = req.params;
      const { playerId, titleId } = req;

      if (!playerId || !titleId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      const ticket = await MatchmakingTicket.findById(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Ticket not found',
          },
        });
      }

      // Verify ticket belongs to player
      if (ticket.playerId !== playerId) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Not authorized to cancel this ticket',
          },
        });
      }

      // Can only cancel waiting tickets
      if (ticket.status !== 'waiting') {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Can only cancel waiting tickets',
          },
        });
      }

      // Update ticket status
      ticket.status = 'cancelled';
      await ticket.save();

      // Remove from Redis waiting queue
      const allTickets = await redis.zrange(
        `waiting:${titleId}:${ticket.queueName}`,
        0,
        -1
      );

      for (const ticketStr of allTickets) {
        const ticketData = JSON.parse(ticketStr);
        if (ticketData.ticketId === ticketId) {
          await redis.zrem(
            `waiting:${titleId}:${ticket.queueName}`,
            ticketStr
          );
          break;
        }
      }

      // Remove ticket from Redis
      await redis.delete(`ticket:${ticketId}`);

      res.json({
        success: true,
        data: {
          message: 'Ticket cancelled successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/matchmaking/match/:matchId - Get match details
router.get(
  '/match/:matchId',
  verifyPlayerToken,
  async (req: AuthRequest, res, next) => {
    try {
      const { matchId } = req.params;
      const { playerId, titleId } = req;

      if (!playerId || !titleId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      const match = await Match.findById(matchId);

      if (!match) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Match not found',
          },
        });
      }

      // Verify player is in the match
      const playerInMatch = match.players.some(p => p.playerId === playerId);
      if (!playerInMatch) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Not authorized to view this match',
          },
        });
      }

      res.json({
        success: true,
        data: {
          matchId: match._id,
          queueName: match.queueName,
          players: match.players.map(p => ({
            playerId: p.playerId,
            teamId: p.teamId,
            attributes: p.attributes,
          })),
          serverInfo: match.serverInfo,
          createdAt: match.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const matchmakingRouter = router;
