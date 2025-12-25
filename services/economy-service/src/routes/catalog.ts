import { Router } from 'express';
import { z } from 'zod';
import { postgres } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { validateRequest } from '../middleware/validate-request';
import { validateDeveloperAuth, validateTitleKey } from '../middleware/auth';

const router = Router();

const createCatalogItemSchema = z.object({
  itemId: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  itemClass: z.string().max(50).optional(),
  prices: z.array(z.object({
    currencyCode: z.string(),
    amount: z.number().int().min(0),
  })).optional(),
  virtualCurrencyPrices: z.record(z.number().int().min(0)).optional(),
  tags: z.array(z.string()).optional(),
  customData: z.record(z.any()).optional(),
  isStackable: z.boolean().optional(),
  isLimitedEdition: z.boolean().optional(),
  limitedEditionCount: z.number().int().min(1).optional(),
  consumable: z.object({
    usageCount: z.number().int().min(1).optional(),
    usagePeriod: z.number().int().min(0).optional(),
  }).optional(),
});

const updateCatalogItemSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  itemClass: z.string().max(50).optional(),
  prices: z.array(z.object({
    currencyCode: z.string(),
    amount: z.number().int().min(0),
  })).optional(),
  virtualCurrencyPrices: z.record(z.number().int().min(0)).optional(),
  tags: z.array(z.string()).optional(),
  customData: z.record(z.any()).optional(),
  isStackable: z.boolean().optional(),
  isLimitedEdition: z.boolean().optional(),
  limitedEditionCount: z.number().int().min(1).optional(),
  consumable: z.object({
    usageCount: z.number().int().min(1).optional(),
    usagePeriod: z.number().int().min(0).optional(),
  }).optional(),
});

// POST /api/v1/economy/catalog/items - Create catalog item (developer)
router.post(
  '/items',
  validateDeveloperAuth,
  validateRequest(createCatalogItemSchema),
  async (req, res, next) => {
    try {
      const {
        itemId,
        displayName,
        description,
        itemClass,
        prices,
        virtualCurrencyPrices,
        tags,
        customData,
        isStackable,
        isLimitedEdition,
        limitedEditionCount,
        consumable,
      } = req.body;

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

      // Check if item already exists
      const existingItem = await postgres.query(
        'SELECT id FROM catalog_items WHERE title_id = $1 AND item_id = $2',
        [titleId, itemId]
      );

      if (existingItem.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.CONFLICT,
            message: 'Item ID already exists',
          },
        });
      }

      // Merge prices and virtualCurrencyPrices
      const allPrices = [...(prices || [])];
      if (virtualCurrencyPrices) {
        for (const [currencyCode, amount] of Object.entries(virtualCurrencyPrices)) {
          allPrices.push({ currencyCode, amount });
        }
      }

      // Create catalog item
      const result = await postgres.query(
        `INSERT INTO catalog_items
         (title_id, item_id, display_name, description, item_class, prices, tags, custom_data,
          is_stackable, is_limited_edition, limited_edition_count, consumable)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          titleId,
          itemId,
          displayName,
          description || null,
          itemClass || null,
          JSON.stringify(allPrices),
          tags || [],
          customData ? JSON.stringify(customData) : null,
          isStackable || false,
          isLimitedEdition || false,
          limitedEditionCount || null,
          consumable ? JSON.stringify(consumable) : null,
        ]
      );

      const item = result.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: item.id,
          itemId: item.item_id,
          displayName: item.display_name,
          description: item.description,
          itemClass: item.item_class,
          prices: typeof item.prices === 'string' ? JSON.parse(item.prices) : item.prices,
          tags: item.tags,
          customData: item.custom_data ? (typeof item.custom_data === 'string' ? JSON.parse(item.custom_data) : item.custom_data) : null,
          isStackable: item.is_stackable,
          isLimitedEdition: item.is_limited_edition,
          limitedEditionCount: item.limited_edition_count,
          consumable: item.consumable ? (typeof item.consumable === 'string' ? JSON.parse(item.consumable) : item.consumable) : null,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/economy/catalog/items - Get catalog
router.get(
  '/items',
  validateTitleKey,
  async (req, res, next) => {
    try {
      const titleId = req.titleId;
      const { itemClass, tags, limit = 100, offset = 0 } = req.query;

      let query = `
        SELECT *
        FROM catalog_items
        WHERE title_id = $1
      `;
      const params: any[] = [titleId];
      let paramIndex = 2;

      if (itemClass) {
        query += ` AND item_class = $${paramIndex}`;
        params.push(itemClass);
        paramIndex++;
      }

      if (tags && typeof tags === 'string') {
        const tagArray = tags.split(',');
        query += ` AND tags && $${paramIndex}`;
        params.push(tagArray);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(Number(limit), Number(offset));

      const result = await postgres.query(query, params);

      res.json({
        success: true,
        data: {
          items: result.rows.map(item => ({
            id: item.id,
            itemId: item.item_id,
            displayName: item.display_name,
            description: item.description,
            itemClass: item.item_class,
            prices: typeof item.prices === 'string' ? JSON.parse(item.prices) : item.prices,
            tags: item.tags,
            customData: item.custom_data ? (typeof item.custom_data === 'string' ? JSON.parse(item.custom_data) : item.custom_data) : null,
            isStackable: item.is_stackable,
            isLimitedEdition: item.is_limited_edition,
            limitedEditionCount: item.limited_edition_count,
            consumable: item.consumable ? (typeof item.consumable === 'string' ? JSON.parse(item.consumable) : item.consumable) : null,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          })),
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/economy/catalog/items/:itemId - Update item
router.put(
  '/items/:itemId',
  validateDeveloperAuth,
  validateRequest(updateCatalogItemSchema),
  async (req, res, next) => {
    try {
      const { itemId } = req.params;
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

      // Check if item exists
      const existingItem = await postgres.query(
        'SELECT id FROM catalog_items WHERE title_id = $1 AND item_id = $2',
        [titleId, itemId]
      );

      if (existingItem.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Item not found',
          },
        });
      }

      const {
        displayName,
        description,
        itemClass,
        prices,
        virtualCurrencyPrices,
        tags,
        customData,
        isStackable,
        isLimitedEdition,
        limitedEditionCount,
        consumable,
      } = req.body;

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (displayName !== undefined) {
        updates.push(`display_name = $${paramIndex}`);
        values.push(displayName);
        paramIndex++;
      }

      if (description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(description);
        paramIndex++;
      }

      if (itemClass !== undefined) {
        updates.push(`item_class = $${paramIndex}`);
        values.push(itemClass);
        paramIndex++;
      }

      if (prices !== undefined || virtualCurrencyPrices !== undefined) {
        const allPrices = [...(prices || [])];
        if (virtualCurrencyPrices) {
          for (const [currencyCode, amount] of Object.entries(virtualCurrencyPrices)) {
            allPrices.push({ currencyCode, amount });
          }
        }
        updates.push(`prices = $${paramIndex}`);
        values.push(JSON.stringify(allPrices));
        paramIndex++;
      }

      if (tags !== undefined) {
        updates.push(`tags = $${paramIndex}`);
        values.push(tags);
        paramIndex++;
      }

      if (customData !== undefined) {
        updates.push(`custom_data = $${paramIndex}`);
        values.push(JSON.stringify(customData));
        paramIndex++;
      }

      if (isStackable !== undefined) {
        updates.push(`is_stackable = $${paramIndex}`);
        values.push(isStackable);
        paramIndex++;
      }

      if (isLimitedEdition !== undefined) {
        updates.push(`is_limited_edition = $${paramIndex}`);
        values.push(isLimitedEdition);
        paramIndex++;
      }

      if (limitedEditionCount !== undefined) {
        updates.push(`limited_edition_count = $${paramIndex}`);
        values.push(limitedEditionCount);
        paramIndex++;
      }

      if (consumable !== undefined) {
        updates.push(`consumable = $${paramIndex}`);
        values.push(JSON.stringify(consumable));
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'No fields to update',
          },
        });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(titleId, itemId);

      const query = `
        UPDATE catalog_items
        SET ${updates.join(', ')}
        WHERE title_id = $${paramIndex} AND item_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await postgres.query(query, values);
      const item = result.rows[0];

      res.json({
        success: true,
        data: {
          id: item.id,
          itemId: item.item_id,
          displayName: item.display_name,
          description: item.description,
          itemClass: item.item_class,
          prices: typeof item.prices === 'string' ? JSON.parse(item.prices) : item.prices,
          tags: item.tags,
          customData: item.custom_data ? (typeof item.custom_data === 'string' ? JSON.parse(item.custom_data) : item.custom_data) : null,
          isStackable: item.is_stackable,
          isLimitedEdition: item.is_limited_edition,
          limitedEditionCount: item.limited_edition_count,
          consumable: item.consumable ? (typeof item.consumable === 'string' ? JSON.parse(item.consumable) : item.consumable) : null,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/economy/catalog/items/:itemId - Delete item
router.delete(
  '/items/:itemId',
  validateDeveloperAuth,
  async (req, res, next) => {
    try {
      const { itemId } = req.params;
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

      // Delete item
      const result = await postgres.query(
        'DELETE FROM catalog_items WHERE title_id = $1 AND item_id = $2 RETURNING id',
        [titleId, itemId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Item not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Item deleted successfully',
          itemId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const catalogRouter = router;
