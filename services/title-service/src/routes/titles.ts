import { Router } from 'express';
import { z } from 'zod';
import { postgres } from '@nullstack/database';
import { ERROR_CODES, DEFAULT_TITLE_SETTINGS } from '@nullstack/shared';
import { authenticateDeveloper, AuthenticatedRequest } from '../middleware/authenticate-developer';
import { generateTitleSecretKey } from '../utils/crypto';

const router = Router();

// Validation schemas
const createTitleSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateTitleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// Validation middleware
function validateRequest(schema: z.ZodSchema) {
  return (req: AuthenticatedRequest, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Validation failed',
            details: error.errors,
          },
        });
      }
      next(error);
    }
  };
}

/**
 * POST /api/v1/titles
 * Create a new title
 */
router.post(
  '/',
  authenticateDeveloper,
  validateRequest(createTitleSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { name } = req.body;
      const developerId = req.developerId!;

      // Generate secret key (let database generate UUID for id)
      const secretKey = generateTitleSecretKey();

      // Insert into database
      const result = await postgres.query(
        `INSERT INTO titles
         (name, developer_id, secret_key, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, name, developer_id, created_at, updated_at, status`,
        [
          name,
          developerId,
          secretKey,
          'active',
        ]
      );

      const title = result.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: title.id,
          name: title.name,
          developerId: title.developer_id,
          secretKey: secretKey,
          status: title.status,
          createdAt: title.created_at,
          updatedAt: title.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/titles
 * List all titles for the authenticated developer
 */
router.get(
  '/',
  authenticateDeveloper,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const developerId = req.developerId!;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
      const offset = (page - 1) * pageSize;

      // Get total count
      const countResult = await postgres.query(
        `SELECT COUNT(*) as total
         FROM titles
         WHERE developer_id = $1 AND status != 'deleted'`,
        [developerId]
      );

      const total = parseInt(countResult.rows[0].total);

      // Get titles
      const result = await postgres.query(
        `SELECT id, name, developer_id, status, created_at, updated_at
         FROM titles
         WHERE developer_id = $1 AND status != 'deleted'
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [developerId, pageSize, offset]
      );

      const titles = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        developerId: row.developer_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      res.json({
        success: true,
        data: {
          items: titles,
          total,
          page,
          pageSize,
          hasMore: offset + pageSize < total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/titles/:id
 * Get details for a specific title
 */
router.get(
  '/:id',
  authenticateDeveloper,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const developerId = req.developerId!;

      const result = await postgres.query(
        `SELECT id, name, developer_id, secret_key, status, created_at, updated_at
         FROM titles
         WHERE id = $1 AND developer_id = $2 AND status != 'deleted'`,
        [id, developerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.TITLE_NOT_FOUND,
            message: 'Title not found',
          },
        });
      }

      const title = result.rows[0];

      res.json({
        success: true,
        data: {
          id: title.id,
          name: title.name,
          developerId: title.developer_id,
          secretKey: title.secret_key,
          status: title.status,
          createdAt: title.created_at,
          updatedAt: title.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/titles/:id
 * Update title settings
 */
router.patch(
  '/:id',
  authenticateDeveloper,
  validateRequest(updateTitleSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const developerId = req.developerId!;

      // Check if title exists and belongs to developer
      const checkResult = await postgres.query(
        `SELECT id FROM titles
         WHERE id = $1 AND developer_id = $2 AND status != 'deleted'`,
        [id, developerId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.TITLE_NOT_FOUND,
            message: 'Title not found',
          },
        });
      }

      if (!name) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'No valid updates provided',
          },
        });
      }

      const result = await postgres.query(
        `UPDATE titles
         SET name = $1, updated_at = NOW()
         WHERE id = $2 AND developer_id = $3
         RETURNING id, name, developer_id, secret_key, status, created_at, updated_at`,
        [name, id, developerId]
      );

      const title = result.rows[0];

      res.json({
        success: true,
        data: {
          id: title.id,
          name: title.name,
          developerId: title.developer_id,
          secretKey: title.secret_key,
          status: title.status,
          createdAt: title.created_at,
          updatedAt: title.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/titles/:id
 * Delete or suspend a title
 */
router.delete(
  '/:id',
  authenticateDeveloper,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const developerId = req.developerId!;
      const { suspend } = req.query; // ?suspend=true to suspend instead of delete

      // Check if title exists and belongs to developer
      const checkResult = await postgres.query(
        `SELECT id FROM titles
         WHERE id = $1 AND developer_id = $2 AND status != 'deleted'`,
        [id, developerId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.TITLE_NOT_FOUND,
            message: 'Title not found',
          },
        });
      }

      const newStatus = suspend === 'true' ? 'suspended' : 'deleted';

      await postgres.query(
        `UPDATE titles
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND developer_id = $3`,
        [newStatus, id, developerId]
      );

      res.json({
        success: true,
        data: {
          message: suspend === 'true'
            ? 'Title suspended successfully'
            : 'Title deleted successfully',
          status: newStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/titles/:id/regenerate-key
 * Regenerate the secret key for a title
 */
router.post(
  '/:id/regenerate-key',
  authenticateDeveloper,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const developerId = req.developerId!;

      // Check if title exists and belongs to developer
      const checkResult = await postgres.query(
        `SELECT id, status FROM titles
         WHERE id = $1 AND developer_id = $2 AND status != 'deleted'`,
        [id, developerId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.TITLE_NOT_FOUND,
            message: 'Title not found',
          },
        });
      }

      const title = checkResult.rows[0];

      if (title.status === 'suspended') {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.TITLE_SUSPENDED,
            message: 'Cannot regenerate key for suspended title',
          },
        });
      }

      // Generate new secret key
      const newSecretKey = generateTitleSecretKey();

      await postgres.query(
        `UPDATE titles
         SET secret_key = $1, updated_at = NOW()
         WHERE id = $2 AND developer_id = $3`,
        [newSecretKey, id, developerId]
      );

      res.json({
        success: true,
        data: {
          id,
          secretKey: newSecretKey,
          message: 'Secret key regenerated successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const titlesRouter = router;
