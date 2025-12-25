import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    req.body = value;
    next();
  };
};

// Webhook validation schemas
export const createWebhookSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri().required(),
  events: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one event must be specified',
    }),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  retryCount: Joi.number().integer().min(0).max(10).default(3),
  timeout: Joi.number().integer().min(1000).max(60000).default(30000),
});

export const updateWebhookSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  url: Joi.string().uri().optional(),
  events: Joi.array().items(Joi.string()).min(1).optional(),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  retryCount: Joi.number().integer().min(0).max(10).optional(),
  timeout: Joi.number().integer().min(1000).max(60000).optional(),
  isActive: Joi.boolean().optional(),
});

// Scheduled task validation schemas
export const createTaskSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  cronExpression: Joi.string()
    .required()
    .custom((value, helpers) => {
      // Basic cron validation (5 or 6 fields)
      const parts = value.trim().split(/\s+/);
      if (parts.length < 5 || parts.length > 6) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'Invalid cron expression format',
    }),
  functionName: Joi.string().min(1).max(255).required(),
  parameters: Joi.object().optional().default({}),
  timezone: Joi.string().default('UTC'),
});

export const updateTaskSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  cronExpression: Joi.string()
    .optional()
    .custom((value, helpers) => {
      const parts = value.trim().split(/\s+/);
      if (parts.length < 5 || parts.length > 6) {
        return helpers.error('any.invalid');
      }
      return value;
    }),
  functionName: Joi.string().min(1).max(255).optional(),
  parameters: Joi.object().optional(),
  timezone: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});
