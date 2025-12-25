import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { postgres } from '@nullstack/database';
import { PlayerInventory, PlayerCurrency } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { validateRequest } from '../middleware/validate-request';
import { validateTitleKey, validateServerAuth } from '../middleware/auth';

const router = Router();

const purchaseItemSchema = z.object({
  itemId: z.string(),
  currencyCode: z.string(),
  expectedPrice: z.number().int().min(0),
});

const grantItemSchema = z.object({
  itemId: z.string(),
  customData: z.record(z.any()).optional(),
});

const consumeItemSchema = z.object({
  itemInstanceId: z.string(),
  consumeCount: z.number().int().min(1).optional(),
});

// GET /api/v1/player/:playerId/inventory - Get player inventory
router.get(
  '/player/:playerId',
  validateTitleKey,
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const titleId = req.titleId;

      // Get player inventory
      let inventory = await PlayerInventory.findOne({
        titleId,
        playerId,
      });

      // If no inventory exists, create empty one
      if (!inventory) {
        inventory = await PlayerInventory.create({
          titleId,
          playerId,
          items: [],
        });
      }

      res.json({
        success: true,
        data: {
          playerId: inventory.playerId,
          items: inventory.items.map(item => ({
            itemInstanceId: item.itemInstanceId,
            itemId: item.itemId,
            catalogVersion: item.catalogVersion,
            purchaseDate: item.purchaseDate,
            expiration: item.expiration,
            remainingUses: item.remainingUses,
            customData: item.customData,
          })),
          updatedAt: inventory.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/player/:playerId/inventory/purchase - Purchase item
router.post(
  '/player/:playerId/purchase',
  validateTitleKey,
  validateRequest(purchaseItemSchema),
  async (req, res, next) => {
    const client = await postgres.getClient();

    try {
      const { playerId } = req.params;
      const { itemId, currencyCode, expectedPrice } = req.body;
      const titleId = req.titleId;

      // Start transaction
      await client.query('BEGIN');

      // Lock the catalog item to prevent race conditions
      const catalogResult = await client.query(
        `SELECT * FROM catalog_items
         WHERE title_id = $1 AND item_id = $2
         FOR UPDATE`,
        [titleId, itemId]
      );

      if (catalogResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Item not found in catalog',
          },
        });
      }

      const catalogItem = catalogResult.rows[0];
      const prices = typeof catalogItem.prices === 'string'
        ? JSON.parse(catalogItem.prices)
        : catalogItem.prices;

      // Find the price for the specified currency
      const price = prices.find((p: any) => p.currencyCode === currencyCode);

      if (!price) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_PURCHASE,
            message: `Item cannot be purchased with ${currencyCode}`,
          },
        });
      }

      // Verify price matches expected price (prevent price manipulation)
      if (price.amount !== expectedPrice) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_PURCHASE,
            message: 'Price mismatch',
            details: {
              expectedPrice,
              actualPrice: price.amount,
            },
          },
        });
      }

      // Check limited edition availability
      if (catalogItem.is_limited_edition && catalogItem.limited_edition_count) {
        const soldCount = await client.query(
          `SELECT COUNT(*) as count FROM purchase_history
           WHERE title_id = $1 AND item_id = $2`,
          [titleId, itemId]
        );

        const sold = parseInt(soldCount.rows[0].count);

        if (sold >= catalogItem.limited_edition_count) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: {
              code: ERROR_CODES.INVALID_PURCHASE,
              message: 'Item sold out',
            },
          });
        }
      }

      // Get player currency (use MongoDB for currency balances)
      const playerCurrency = await PlayerCurrency.findOne({
        titleId,
        playerId,
      });

      if (!playerCurrency) {
        await client.query('ROLLBACK');
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
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_FUNDS,
            message: 'Player does not have this currency',
          },
        });
      }

      const currentBalance = playerCurrency.balances[balanceIndex].amount;

      if (currentBalance < price.amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_FUNDS,
            message: 'Insufficient funds',
            details: {
              currentBalance,
              requiredAmount: price.amount,
            },
          },
        });
      }

      // Deduct currency
      playerCurrency.balances[balanceIndex].amount -= price.amount;
      playerCurrency.updatedAt = new Date();
      await playerCurrency.save();

      // Log currency transaction
      await client.query(
        `INSERT INTO currency_transactions
         (title_id, player_id, currency_code, amount, transaction_type, reason)
         VALUES ($1, $2, $3, $4, 'purchase', $5)`,
        [titleId, playerId, currencyCode, price.amount, `Purchased ${itemId}`]
      );

      // Create item instance
      const itemInstanceId = uuidv4();
      const consumable = catalogItem.consumable
        ? (typeof catalogItem.consumable === 'string'
          ? JSON.parse(catalogItem.consumable)
          : catalogItem.consumable)
        : null;

      const newItem = {
        itemInstanceId,
        itemId: catalogItem.item_id,
        catalogVersion: '1.0',
        purchaseDate: new Date(),
        expiration: consumable?.usagePeriod
          ? new Date(Date.now() + consumable.usagePeriod * 1000)
          : undefined,
        remainingUses: consumable?.usageCount || undefined,
        customData: {},
      };

      // Get or create player inventory
      let inventory = await PlayerInventory.findOne({
        titleId,
        playerId,
      });

      if (!inventory) {
        inventory = await PlayerInventory.create({
          titleId,
          playerId,
          items: [newItem],
        });
      } else {
        inventory.items.push(newItem as any);
        inventory.updatedAt = new Date();
        await inventory.save();
      }

      // Log purchase
      await client.query(
        `INSERT INTO purchase_history
         (title_id, player_id, item_id, item_instance_id, currency_code, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [titleId, playerId, itemId, itemInstanceId, currencyCode, price.amount]
      );

      // Commit transaction
      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          itemInstanceId,
          itemId: newItem.itemId,
          remainingBalance: playerCurrency.balances[balanceIndex].amount,
          purchaseDate: newItem.purchaseDate,
          expiration: newItem.expiration,
          remainingUses: newItem.remainingUses,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

// POST /api/v1/player/:playerId/inventory/grant - Grant item (developer/server)
router.post(
  '/player/:playerId/grant',
  validateServerAuth,
  validateRequest(grantItemSchema),
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const { itemId, customData } = req.body;
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

      // Get catalog item
      const catalogResult = await postgres.query(
        'SELECT * FROM catalog_items WHERE title_id = $1 AND item_id = $2',
        [titleId, itemId]
      );

      if (catalogResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Item not found in catalog',
          },
        });
      }

      const catalogItem = catalogResult.rows[0];
      const consumable = catalogItem.consumable
        ? (typeof catalogItem.consumable === 'string'
          ? JSON.parse(catalogItem.consumable)
          : catalogItem.consumable)
        : null;

      // Create item instance
      const itemInstanceId = uuidv4();
      const newItem = {
        itemInstanceId,
        itemId: catalogItem.item_id,
        catalogVersion: '1.0',
        purchaseDate: new Date(),
        expiration: consumable?.usagePeriod
          ? new Date(Date.now() + consumable.usagePeriod * 1000)
          : undefined,
        remainingUses: consumable?.usageCount || undefined,
        customData: customData || {},
      };

      // Get or create player inventory
      let inventory = await PlayerInventory.findOne({
        titleId,
        playerId,
      });

      if (!inventory) {
        inventory = await PlayerInventory.create({
          titleId,
          playerId,
          items: [newItem],
        });
      } else {
        inventory.items.push(newItem as any);
        inventory.updatedAt = new Date();
        await inventory.save();
      }

      res.status(201).json({
        success: true,
        data: {
          itemInstanceId,
          itemId: newItem.itemId,
          purchaseDate: newItem.purchaseDate,
          expiration: newItem.expiration,
          remainingUses: newItem.remainingUses,
          customData: newItem.customData,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/player/:playerId/inventory/consume - Consume item
router.post(
  '/player/:playerId/consume',
  validateTitleKey,
  validateRequest(consumeItemSchema),
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const { itemInstanceId, consumeCount = 1 } = req.body;
      const titleId = req.titleId;

      // Get player inventory
      const inventory = await PlayerInventory.findOne({
        titleId,
        playerId,
      });

      if (!inventory) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Player has no inventory',
          },
        });
      }

      // Find item in inventory
      const itemIndex = inventory.items.findIndex(
        item => item.itemInstanceId === itemInstanceId
      );

      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Item not found in inventory',
          },
        });
      }

      const item = inventory.items[itemIndex];

      // Check if item has expired
      if (item.expiration && new Date(item.expiration) < new Date()) {
        // Remove expired item
        inventory.items.splice(itemIndex, 1);
        inventory.updatedAt = new Date();
        await inventory.save();

        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_PURCHASE,
            message: 'Item has expired',
          },
        });
      }

      // Handle consumable items
      if (item.remainingUses !== undefined && item.remainingUses !== null) {
        if (item.remainingUses < consumeCount) {
          return res.status(400).json({
            success: false,
            error: {
              code: ERROR_CODES.INVALID_PURCHASE,
              message: 'Insufficient remaining uses',
              details: {
                remainingUses: item.remainingUses,
                requestedCount: consumeCount,
              },
            },
          });
        }

        item.remainingUses -= consumeCount;

        // Remove item if no uses left
        if (item.remainingUses <= 0) {
          inventory.items.splice(itemIndex, 1);
        }
      } else {
        // Non-consumable or stackable items - remove one instance
        inventory.items.splice(itemIndex, 1);
      }

      inventory.updatedAt = new Date();
      await inventory.save();

      res.json({
        success: true,
        data: {
          itemInstanceId,
          consumed: true,
          remainingUses: item.remainingUses > 0 ? item.remainingUses : 0,
          removed: item.remainingUses <= 0 || item.remainingUses === undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const inventoryRouter = router;
