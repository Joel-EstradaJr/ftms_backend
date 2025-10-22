import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../config/logger';

export interface JWTPayload {
  sub: string;        // User ID
  username: string;   // Username
  role: string;       // User role (admin, staff, etc.)
  iat: number;        // Issued at
  exp: number;        // Expires at
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Authentication middleware - validates JWT token
 * 
 * IMPORTANT: FTMS does NOT handle passwords or user login.
 * The HR Auth Microservice handles all authentication.
 * This middleware ONLY validates JWT tokens.
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token with shared JWT secret
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    // Attach user to request
    req.user = decoded;

    logger.debug(`✅ User authenticated: ${decoded.username} (${decoded.role})`);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};
