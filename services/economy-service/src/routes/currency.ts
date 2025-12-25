import { Router } from 'express';
import { z } from 'zod';
import { postgres } from '@nullstack/database';
import { PlayerCurrency } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { validateRequest } from '../middleware/validate-request';
import { validateDeveloperAuth, validateTitleKey } from '../middleware/auth';

const router = Router();

const createCurrencySchema = z.object({
  currencyCode: z.string().min(2).max(10).regex(/^[A-Z0-9_]+$/),
  displayName: z.string().min(1).max(100),
  initialDeposit: z.number().int().min(0).optional(),
  rechargeRate: z.number().int().min(0).optional(),
  rechargeMax: z.number().int().min(0).optional(),
});

const addCurrencySchema = z.object({
  currencyCode: z.string(),
  amount: z.number().int().min(1),
  reason: z.string().optional(),
});

const subtractCurrencySchema = z.object({
  currencyCode: z.string(),
  amount: z.number().int().min(1),
  reason: z.string().optional(),
});

// POST /api/v1/economy/currency - Create virtual currency (developer only)
router.post(
  '/',
  validateDeveloperAuth,
  validateRequest(createCurrencySchema),
  async (req, res, next) => {
    try {
      const { currencyCode, displayName, initialDeposit, rechargeRate, rechargeMax } = req.body;
      const titleKey = req.headers['x-title-key'] as string;

      if (!titleKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Title key required',
          },
        });
      }

      // Get title ID from title key
      const titleResult = await postgres.query(
        'SELECT id FROM titles WHERE secret_key = $1',
        [titleKey]
      );

      if (titleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.TITLE_NOT_FOUND,
            message: 'Title not found',
          },
        });
      }

      const titleId = titleResult.rows[0].id;

      // Check if currency already exists
      const existingCurrency = await postgres.query(
        'SELECT id FROM virtual_currencies WHERE title_id = $1 AND currency_code = $2',
        [titleId, currencyCode]
      );

      if (existingCurrency.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.CONFLICT,
            message: 'Currency code already exists',
          },
        });
      }

      // Create currency
      const result = await postgres.query(
        `INSERT INTO virtual_currencies
         (title_id, currency_code, display_name, initial_deposit, recharge_rate, recharge_max)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [titleId, currencyCode, displayName, initialDeposit || 0, rechargeRate || 0, rechargeMax || 0]
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.rows[0].id,
          currencyCode: result.rows[0].currency_code,
          displayName: result.rows[0].display_name,
          initialDeposit: result.rows[0].initial_deposit,
          rechargeRate: result.rows[0].recharge_rate,
          rechargeMax: result.rows[0].recharge_max,
          createdAt: result.rows[0].created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/economy/currency - List currencies
router.get(
  '/',
  validateTitleKey,
  async (req, res, next) => {
    try {
      const titleId = req.titleId;

      const result = await postgres.query(
        `SELECT id, currency_code, display_name, initial_deposit, recharge_rate, recharge_max, created_at
         FROM virtual_currencies
         WHERE title_id = $1
         ORDER BY created_at DESC`,
        [titleId]
      );

      res.json({
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          currencyCode: row.currency_code,
          displayName: row.display_name,
          initialDeposit: row.initial_deposit,
          rechargeRate: row.recharge_rate,
          rechargeMax: row.recharge_max,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/player/:playerId/currency - Get player balances
router.get(
  '/player/:playerId',
  validateTitleKey,
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const titleId = req.titleId;

      // Get player currency balances
      let playerCurrency = await PlayerCurrency.findOne({
        titleId,
        playerId,
      });

      // If no balances exist, initialize with default currencies
      if (!playerCurrency) {
        const currencies = await postgres.query(
          `SELECT currency_code, initial_deposit
           FROM virtual_currencies
           WHERE title_id = $1`,
          [titleId]
        );

        const balances = currencies.rows.map(currency => ({
          currencyCode: currency.currency_code,
          amount: currency.initial_deposit || 0,
        }));

        playerCurrency = await PlayerCurrency.create({
          titleId,
          playerId,
          balances,
        });
      }

      res.json({
        success: true,
        data: {
          playerId: playerCurrency.playerId,
          balances: playerCurrency.balances.map(balance => ({
            currencyCode: balance.currencyCode,
            amount: balance.amount,
          })),
          updatedAt: playerCurrency.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/player/:playerId/currency/add - Add currency
router.post(
  '/player/:playerId/add',
  validateTitleKey,
  validateRequest(addCurrencySchema),
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const { currencyCode, amount, reason } = req.body;
      const titleId = req.titleId;

      // Verify currency exists
      const currencyResult = await postgres.query(
        'SELECT id FROM virtual_currencies WHERE title_id = $1 AND currency_code = $2',
        [titleId, currencyCode]
      );

      if (currencyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Currency not found',
          },
        });
      }

      // Get or create player currency
      let playerCurrency = await PlayerCurrency.findOne({
        titleId,
        playerId,
      });

      if (!playerCurrency) {
        // Initialize with all currencies
        const currencies = await postgres.query(
          `SELECT currency_code, initial_deposit
           FROM virtual_currencies
           WHERE title_id = $1`,
          [titleId]
        );

        const balances = currencies.rows.map(currency => ({
          currencyCode: currency.currency_code,
          amount: currency.initial_deposit || 0,
        }));

        playerCurrency = await PlayerCurrency.create({
          titleId,
          playerId,
          balances,
        });
      }

      // Find currency balance
      const balanceIndex = playerCurrency.balances.findIndex(
        b => b.currencyCode === currencyCode
      );

      if (balanceIndex === -1) {
        // Add new currency to player
        playerCurrency.balances.push({
          currencyCode,
          amount,
        } as any);
      } else {
        // Update existing balance
        playerCurrency.balances[balanceIndex].amount += amount;
      }

      playerCurrency.updatedAt = new Date();
      await playerCurrency.save();

      // Log the transaction
      await postgres.query(
        `INSERT INTO currency_transactions
         (title_id, player_id, currency_code, amount, transaction_type, reason)
         VALUES ($1, $2, $3, $4, 'add', $5)`,
        [titleId, playerId, currencyCode, amount, reason || 'Manual add']
      );

      res.json({
        success: true,
        data: {
          playerId,
          currencyCode,
          newBalance: playerCurrency.balances.find(b => b.currencyCode === currencyCode)?.amount || 0,
          amountAdded: amount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/player/:playerId/currency/subtract - Subtract currency
router.post(
  '/player/:playerId/subtract',
  validateTitleKey,
  validateRequest(subtractCurrencySchema),
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const { currencyCode, amount, reason } = req.body;
      const titleId = req.titleId;

      // Verify currency exists
      const currencyResult = await postgres.query(
        'SELECT id FROM virtual_currencies WHERE title_id = $1 AND currency_code = $2',
        [titleId, currencyCode]
      );

      if (currencyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Currency not found',
          },
        });
      }

      // Get player currency
      const playerCurrency = await PlayerCurrency.findOne({
        titleId,
        playerId,
      });

      if (!playerCurrency) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_FUNDS,
            message: 'Player has no currency balances',
          },
        });
      }

      // Find currency balance
      const balanceIndex = playerCurrency.balances.findIndex(
        b => b.currencyCode === currencyCode
      );

      if (balanceIndex === -1) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_FUNDS,
            message: 'Player does not have this currency',
          },
        });
      }

      const currentBalance = playerCurrency.balances[balanceIndex].amount;

      if (currentBalance < amount) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_FUNDS,
            message: 'Insufficient funds',
            details: {
              currentBalance,
              requestedAmount: amount,
            },
          },
        });
      }

      // Subtract currency
      playerCurrency.balances[balanceIndex].amount -= amount;
      playerCurrency.updatedAt = new Date();
      await playerCurrency.save();

      // Log the transaction
      await postgres.query(
        `INSERT INTO currency_transactions
         (title_id, player_id, currency_code, amount, transaction_type, reason)
         VALUES ($1, $2, $3, $4, 'subtract', $5)`,
        [titleId, playerId, currencyCode, amount, reason || 'Manual subtract']
      );

      res.json({
        success: true,
        data: {
          playerId,
          currencyCode,
          newBalance: playerCurrency.balances[balanceIndex].amount,
          amountSubtracted: amount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const currencyRouter = router;
