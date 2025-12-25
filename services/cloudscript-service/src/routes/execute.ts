import { Router } from 'express';
import { z } from 'zod';
import { CloudScriptFunction } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { authenticateTitle, authenticatePlayer, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate-request';
import { cloudScriptExecutor } from '../executor';

const router = Router();

const executeSchema = z.object({
  args: z.record(z.any()).optional(),
});

// Execute a CloudScript function
router.post(
  '/execute/:functionName',
  authenticateTitle,
  authenticatePlayer,
  validateRequest(executeSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { functionName } = req.params;
      const { args = {} } = req.body;
      const { titleId, playerId } = req;

      if (!titleId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Title ID required',
          },
        });
      }

      // Find the CloudScript function
      const cloudFunction = await CloudScriptFunction.findOne({
        titleId,
        functionName,
        published: true, // Only execute published functions
      });

      if (!cloudFunction) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.FUNCTION_NOT_FOUND,
            message: 'Function not found or not published',
          },
        });
      }

      // Execute the function in a sandboxed environment
      const result = await cloudScriptExecutor.execute(
        cloudFunction.code,
        {
          titleId,
          playerId,
          functionName,
          args,
        },
        cloudFunction.timeoutSeconds * 1000,
        cloudFunction.memoryMB
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: ERROR_CODES.FUNCTION_ERROR,
            message: result.error || 'Function execution failed',
            details: {
              executionTimeMs: result.executionTimeMs,
              logs: result.logs,
            },
          },
        });
      }

      res.json({
        success: true,
        data: {
          result: result.result,
          executionTimeMs: result.executionTimeMs,
          logs: result.logs,
        },
      });
    } catch (error: any) {
      // Handle timeout errors
      if (error.message?.includes('timeout')) {
        return res.status(408).json({
          success: false,
          error: {
            code: ERROR_CODES.FUNCTION_TIMEOUT,
            message: 'Function execution timed out',
          },
        });
      }

      next(error);
    }
  }
);

// Execute a CloudScript function (developer testing - no player auth required)
router.post(
  '/test/:functionName',
  authenticateTitle,
  validateRequest(executeSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { functionName } = req.params;
      const { args = {} } = req.body;
      const { titleId } = req;
      const testPlayerId = req.body.testPlayerId || 'test-player';

      if (!titleId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Title ID required',
          },
        });
      }

      // Find the CloudScript function (allow unpublished for testing)
      const cloudFunction = await CloudScriptFunction.findOne({
        titleId,
        functionName,
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

      // Execute the function in a sandboxed environment
      const result = await cloudScriptExecutor.execute(
        cloudFunction.code,
        {
          titleId,
          playerId: testPlayerId,
          functionName,
          args,
        },
        cloudFunction.timeoutSeconds * 1000,
        cloudFunction.memoryMB
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: ERROR_CODES.FUNCTION_ERROR,
            message: result.error || 'Function execution failed',
            details: {
              executionTimeMs: result.executionTimeMs,
              logs: result.logs,
            },
          },
        });
      }

      res.json({
        success: true,
        data: {
          result: result.result,
          executionTimeMs: result.executionTimeMs,
          logs: result.logs,
          testMode: true,
        },
      });
    } catch (error: any) {
      // Handle timeout errors
      if (error.message?.includes('timeout')) {
        return res.status(408).json({
          success: false,
          error: {
            code: ERROR_CODES.FUNCTION_TIMEOUT,
            message: 'Function execution timed out',
          },
        });
      }

      next(error);
    }
  }
);

export const executeRouter = router;
