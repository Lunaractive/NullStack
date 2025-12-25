import { Router } from 'express';
import { z } from 'zod';
import { CloudScriptFunction } from '@nullstack/database';
import { ERROR_CODES, MAX_CLOUDSCRIPT_TIMEOUT_SECONDS, MAX_CLOUDSCRIPT_MEMORY_MB } from '@nullstack/shared';
import { authenticateDeveloper, authenticateTitle, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate-request';

const router = Router();

const createFunctionSchema = z.object({
  functionName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_]+$/),
  code: z.string().min(1),
  runtime: z.enum(['nodejs18', 'nodejs20']).optional(),
  timeoutSeconds: z.number().min(1).max(MAX_CLOUDSCRIPT_TIMEOUT_SECONDS).optional(),
  memoryMB: z.number().min(128).max(MAX_CLOUDSCRIPT_MEMORY_MB).optional(),
});

// Create or update a CloudScript function (Developer only)
router.post(
  '/functions',
  authenticateDeveloper,
  authenticateTitle,
  validateRequest(createFunctionSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { functionName, code, runtime, timeoutSeconds, memoryMB } = req.body;
      const { titleId } = req;

      if (!titleId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Title ID required',
          },
        });
      }

      // Check if function exists
      const existingFunction = await CloudScriptFunction.findOne({
        titleId,
        functionName,
      });

      let cloudFunction;

      if (existingFunction) {
        // Update existing function (increment version, unpublish)
        existingFunction.code = code;
        existingFunction.runtime = runtime || existingFunction.runtime;
        existingFunction.timeoutSeconds = timeoutSeconds || existingFunction.timeoutSeconds;
        existingFunction.memoryMB = memoryMB || existingFunction.memoryMB;
        existingFunction.version += 1;
        existingFunction.published = false;
        existingFunction.updatedAt = new Date();

        cloudFunction = await existingFunction.save();
      } else {
        // Create new function
        cloudFunction = await CloudScriptFunction.create({
          titleId,
          functionName,
          code,
          runtime: runtime || 'nodejs20',
          timeoutSeconds: timeoutSeconds || 10,
          memoryMB: memoryMB || 128,
          version: 1,
          published: false,
        });
      }

      res.status(existingFunction ? 200 : 201).json({
        success: true,
        data: {
          functionName: cloudFunction.functionName,
          version: cloudFunction.version,
          runtime: cloudFunction.runtime,
          timeoutSeconds: cloudFunction.timeoutSeconds,
          memoryMB: cloudFunction.memoryMB,
          published: cloudFunction.published,
          createdAt: cloudFunction.createdAt,
          updatedAt: cloudFunction.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// List all CloudScript functions
router.get(
  '/functions',
  authenticateDeveloper,
  authenticateTitle,
  async (req: AuthRequest, res, next) => {
    try {
      const { titleId } = req;

      if (!titleId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Title ID required',
          },
        });
      }

      const functions = await CloudScriptFunction.find({ titleId }).sort({ functionName: 1 });

      res.json({
        success: true,
        data: {
          functions: functions.map((fn) => ({
            functionName: fn.functionName,
            version: fn.version,
            runtime: fn.runtime,
            timeoutSeconds: fn.timeoutSeconds,
            memoryMB: fn.memoryMB,
            published: fn.published,
            createdAt: fn.createdAt,
            updatedAt: fn.updatedAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get specific CloudScript function details
router.get(
  '/functions/:name',
  authenticateDeveloper,
  authenticateTitle,
  async (req: AuthRequest, res, next) => {
    try {
      const { name } = req.params;
      const { titleId } = req;

      if (!titleId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Title ID required',
          },
        });
      }

      const cloudFunction = await CloudScriptFunction.findOne({
        titleId,
        functionName: name,
      });

      if (!cloudFunction) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.FUNCTION_NOT_FOUND,
            message: 'Function not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          functionName: cloudFunction.functionName,
          code: cloudFunction.code,
          version: cloudFunction.version,
          runtime: cloudFunction.runtime,
          timeoutSeconds: cloudFunction.timeoutSeconds,
          memoryMB: cloudFunction.memoryMB,
          published: cloudFunction.published,
          createdAt: cloudFunction.createdAt,
          updatedAt: cloudFunction.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete CloudScript function
router.delete(
  '/functions/:name',
  authenticateDeveloper,
  authenticateTitle,
  async (req: AuthRequest, res, next) => {
    try {
      const { name } = req.params;
      const { titleId } = req;

      if (!titleId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Title ID required',
          },
        });
      }

      const result = await CloudScriptFunction.findOneAndDelete({
        titleId,
        functionName: name,
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.FUNCTION_NOT_FOUND,
            message: 'Function not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Function deleted successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Publish CloudScript function version
router.post(
  '/functions/:name/publish',
  authenticateDeveloper,
  authenticateTitle,
  async (req: AuthRequest, res, next) => {
    try {
      const { name } = req.params;
      const { titleId } = req;

      if (!titleId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Title ID required',
          },
        });
      }

      const cloudFunction = await CloudScriptFunction.findOne({
        titleId,
        functionName: name,
      });

      if (!cloudFunction) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.FUNCTION_NOT_FOUND,
            message: 'Function not found',
          },
        });
      }

      cloudFunction.published = true;
      cloudFunction.updatedAt = new Date();
      await cloudFunction.save();

      res.json({
        success: true,
        data: {
          functionName: cloudFunction.functionName,
          version: cloudFunction.version,
          published: cloudFunction.published,
          message: 'Function published successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const functionsRouter = router;
