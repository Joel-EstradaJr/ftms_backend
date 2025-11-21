import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

import { config } from '../config/env';

/**
 * Authorization middleware - enforces role-based access control
 * 
 * Usage: authorize('admin', 'finance_admin')
 * Can be disabled via ENABLE_AUTH=false environment variable for testing.
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Skip authorization if auth is disabled (for testing only)
    if (config.enableAuth === false) {
      return next();
    }
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};
