import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ERROR_CODES } from '@nullstack/shared';

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
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
