// ============================================================================
// SERVICE API KEY MIDDLEWARE - Machine-to-Machine Authentication
// ============================================================================

import { Request, Response, NextFunction } from 'express';

// Extended request with service context
export interface ServiceAuthRequest extends Request {
  serviceName?: string;
  serviceApiKey?: string;
  canWrite?: boolean;
}

// Service API keys configuration (load from env or database)
const SERVICE_API_KEYS = new Map<string, { name: string; canWrite: boolean }>([
  [process.env.BUDGET_SERVICE_API_KEY || 'BUDGET_SERVICE_SECRET_KEY', { name: 'budget', canWrite: true }],
  [process.env.AUDIT_SERVICE_API_KEY || 'AUDIT_SERVICE_SECRET_KEY', { name: 'audit', canWrite: false }],
]);

/**
 * Middleware to validate service API key from x-api-key header
 * Attaches service context to request object
 */
export const validateServiceApiKey = (
  req: ServiceAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'x-api-key header is required for service authentication',
        },
      });
      return;
    }

    const serviceConfig = SERVICE_API_KEYS.get(apiKey);

    if (!serviceConfig) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key provided',
        },
      });
      return;
    }

    // Attach service context to request
    req.serviceName = serviceConfig.name;
    req.serviceApiKey = apiKey;
    req.canWrite = serviceConfig.canWrite;

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'API_KEY_VALIDATION_ERROR',
        message: 'Failed to validate API key',
      },
    });
  }
};

/**
 * Middleware to require write permission for service
 */
export const requireWritePermission = (
  req: ServiceAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.canWrite) {
    res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Service does not have write permission',
      },
    });
    return;
  }

  next();
};

/**
 * Combined middleware: validate API key and require write permission
 */
export const validateServiceApiKeyWithWrite = [
  validateServiceApiKey,
  requireWritePermission,
];
