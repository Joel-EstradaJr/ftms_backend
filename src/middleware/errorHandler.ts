import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // Prisma errors
  if (error.constructor.name.includes('Prisma')) {
    logger.error('Prisma error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
    });
  }

  // Unexpected errors
  logger.error('Unexpected error:', error);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
