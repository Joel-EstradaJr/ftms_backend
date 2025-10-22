# 🚀 FTMS Backend Migration Implementation Guide

**Version:** 2.0  
**Date:** October 22, 2025  
**Purpose:** Complete migration from Next.js Full-Stack to Express.js Pure Backend

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 0: Preparation](#phase-0-preparation-day-1)
4. [Phase 1: Express Backend Setup](#phase-1-express-backend-setup-day-2-3)
5. [Phase 2: Authentication Integration (HR Auth)](#phase-2-authentication-integration-day-4)
6. [Phase 3: Core Services Migration](#phase-3-core-services-migration-day-5-7)
7. [Phase 4: External API Integration](#phase-4-external-api-integration-day-8)
8. [Phase 5: Caching Implementation](#phase-5-caching-implementation-day-9-10)
9. [Phase 6: Audit Logs Integration](#phase-6-audit-logs-integration-day-11)
10. [Phase 7: Testing](#phase-7-testing-day-12)
11. [Phase 8: Deployment Preparation](#phase-8-deployment-preparation-day-13)
12. [Phase 9: Migration & Monitoring](#phase-9-migration--monitoring-day-14)
13. [Reference Documents](#reference-documents)

---

## Overview

### Goals

1. ✅ **Pure Backend**: Remove all frontend dependencies (React, Next.js)
2. ✅ **Authentication**: Integrate with HR Auth Microservice (JWT validation only)
3. ✅ **Optimization**: Implement Redis caching for external data
4. ✅ **Compliance**: Integrate Audit Logs Microservice
5. ✅ **Security**: JWT validation, role-based access control
6. ✅ **Best Practices**: Standard Express.js architecture

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FTMS Frontend (React)                   │
│                     (Separate Repository)                   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────────┐
│              FTMS Backend (Express.js)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Routes → Middleware → Controllers → Services → DB     │ │
│  │  - Authentication Middleware (JWT validation)          │ │
│  │  - Authorization Middleware (role-based)               │ │
│  │  - Audit Logging Middleware                            │ │
│  └────────────────────────────────────────────────────────┘ │
└───┬──────────┬──────────┬──────────┬──────────┬────────────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
│  HR   │  │  HR   │  │  Ops  │  │ Audit │  │ Redis │
│ Auth  │  │  API  │  │  API  │  │ Logs  │  │ Cache │
└───────┘  └───────┘  └───────┘  └───────┘  └───────┘
                                               │
┌──────────────────────────────────────────────▼──────┐
│              PostgreSQL Database                    │
└─────────────────────────────────────────────────────┘
```

### Timeline

- **Total Duration**: 14 days
- **Team**: 2-3 developers + 1 DevOps
- **Testing**: 2 days
- **Deployment**: 1 day

---

## Prerequisites

### Required Knowledge

- TypeScript/Node.js
- Express.js framework
- Prisma ORM
- PostgreSQL
- JWT authentication
- Redis caching
- RESTful API design

### Tools & Services

```bash
# Node.js & Package Manager
Node.js v18+ 
npm or yarn

# Database
PostgreSQL 14+
Redis 7+

# Development Tools
VS Code / IntelliJ
Postman / Insomnia
Git

# External Services
HR Auth Microservice (localhost:3002)
HR API (localhost:3002)
Operations API (localhost:3004)
Audit Logs API (localhost:4004)
```

---

## Phase 0: Preparation (Day 1)

### Step 1: Backup Current System

```bash
# Create backup branch
git checkout -b backup/pre-backend-migration
git push origin backup/pre-backend-migration

# Backup database
pg_dump your_database > backup_$(date +%Y%m%d).sql

# Document current environment
cp .env .env.backup
```

### Step 2: Analysis

**Review existing code:**
```bash
# Count frontend files to remove
Get-ChildItem -Recurse -Include *.tsx,*.jsx,*.css | Measure-Object

# Identify API routes to migrate
Get-ChildItem -Recurse -Path .\app\api -Include route.ts
```

**Document:**
- [ ] All API endpoints (`app/api/**/route.ts`)
- [ ] Database models (`prisma/schema.prisma`)
- [ ] Environment variables (`.env`)
- [ ] External API integrations

### Step 3: Setup New Branch

```bash
# Create migration branch
git checkout -b feat/backend-migration
```

---

## Phase 1: Express Backend Setup (Day 2-3)

### Step 1: Install Dependencies

**Remove frontend dependencies:**
```bash
npm uninstall react react-dom next
npm uninstall @types/react @types/react-dom
npm uninstall tailwindcss postcss autoprefixer
```

**Install backend dependencies:**
```bash
# Core Express
npm install express cors helmet compression
npm install @types/express @types/cors -D

# Security & Authentication
npm install jsonwebtoken express-rate-limit express-validator
npm install @types/jsonwebtoken -D

# Caching
npm install redis ioredis

# Logging & Monitoring
npm install winston morgan

# Utilities
npm install dotenv axios
npm install nodemon ts-node -D
```

### Step 2: Project Structure

Create the following structure:

```
src/
├── config/
│   ├── env.ts                 # Environment configuration
│   ├── logger.ts              # Winston logger
│   ├── database.ts            # Prisma client
│   └── redis.ts               # Redis client
├── middleware/
│   ├── auth.ts                # JWT validation (HR Auth)
│   ├── authorize.ts           # Role-based access control
│   ├── errorHandler.ts        # Global error handler
│   ├── rateLimiter.ts         # Rate limiting
│   ├── validator.ts           # Request validation
│   └── auditLogger.ts         # Audit log middleware
├── routes/
│   ├── index.ts               # Route aggregator
│   ├── admin/
│   │   ├── revenue.routes.ts
│   │   ├── expense.routes.ts
│   │   ├── budget.routes.ts
│   │   └── reports.routes.ts
│   └── staff/
│       ├── loan.routes.ts
│       ├── reimbursement.routes.ts
│       └── profile.routes.ts
├── controllers/
│   ├── revenue.controller.ts
│   ├── expense.controller.ts
│   ├── loan.controller.ts
│   └── ...
├── services/
│   ├── revenue.service.ts
│   ├── expense.service.ts
│   ├── loan.service.ts
│   └── ...
├── integrations/
│   ├── hr/
│   │   ├── auth.client.ts     # HR Auth API client
│   │   ├── employee.client.ts # HR Employee API
│   │   └── payroll.client.ts  # HR Payroll API
│   ├── operations/
│   │   └── trip.client.ts     # Operations Bus Trip API
│   └── audit/
│       └── audit.client.ts    # Audit Logs API
├── cache/
│   ├── employee.cache.ts      # Employee caching
│   ├── payroll.cache.ts       # Payroll caching
│   ├── trip.cache.ts          # Trip caching
│   └── base.cache.ts          # Base cache service
├── types/
│   ├── express.d.ts           # Express type extensions
│   ├── auth.types.ts          # Auth types
│   └── api.types.ts           # API response types
├── utils/
│   ├── errors.ts              # Custom error classes
│   ├── validators.ts          # Validation helpers
│   └── helpers.ts             # Utility functions
├── app.ts                     # Express app setup
└── server.ts                  # Server entry point
```

### Step 3: Core Configuration Files

**src/config/env.ts**
```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  // Server
  port: number;
  nodeEnv: string;
  
  // Database
  databaseUrl: string;
  
  // Redis
  redisUrl: string;
  
  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // API Keys
  auditLogsApiKey: string;
  
  // External APIs
  externalApis: {
    hrAuth: string;
    hrEmployees: string;
    hrPayroll: string;
    operations: string;
    auditLogs: string;
  };
  
  // Security
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  
  auditLogsApiKey: process.env.AUDIT_LOGS_API_KEY || 'FINANCE_DEFAULT_KEY',
  
  externalApis: {
    hrAuth: process.env.HR_AUTH_API_URL!,
    hrEmployees: process.env.HR_API_EMPLOYEES_URL!,
    hrPayroll: process.env.HR_API_PAYROLL_URL!,
    operations: process.env.OP_API_BUSTRIP_URL!,
    auditLogs: process.env.AUDIT_LOGS_API_URL || 'http://localhost:4004',
  },
  
  corsOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(','),
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100,
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'HR_AUTH_API_URL',
  'HR_API_EMPLOYEES_URL',
  'HR_API_PAYROLL_URL',
  'OP_API_BUSTRIP_URL',
  'AUDIT_LOGS_API_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

**src/config/logger.ts**
```typescript
import winston from 'winston';
import { config } from './env';

const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
    }),
    
    // File logging
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

export { logger };
```

**src/config/database.ts**
```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e: any) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

prisma.$on('error', (e: any) => {
  logger.error('Prisma error:', e);
});

prisma.$on('warn', (e: any) => {
  logger.warn('Prisma warning:', e);
});

export { prisma };
```

**src/config/redis.ts**
```typescript
import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

export const redis = new Redis(config.redisUrl, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});
```

### Step 4: Main Application Files

**src/app.ts**
```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // HTTP request logging
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API routes
  app.use('/api/v1', routes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.path,
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};
```

**src/server.ts**
```typescript
import { createApp } from './app';
import { config } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';

const app = createApp();

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connected');

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

startServer();
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

**.env.example**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ftms

# Redis
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i
JWT_EXPIRES_IN=8h

# External APIs - HR
HR_AUTH_API_URL=http://localhost:3002
HR_API_EMPLOYEES_URL=http://localhost:3002/api/clean/hr_employees
HR_API_PAYROLL_URL=http://localhost:3002/api/clean/hr_payroll

# External APIs - Operations
OP_API_BUSTRIP_URL=http://localhost:3004/api/clean/op_bus-trip-details

# External APIs - Audit Logs
AUDIT_LOGS_API_URL=http://localhost:4004
AUDIT_LOGS_API_KEY=FINANCE_DEFAULT_KEY

# CORS
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:4003,http://localhost:4004

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## Phase 2: Authentication Integration (Day 4)

### Overview

**🔑 CRITICAL**: FTMS does NOT handle passwords or user login. The HR Auth Microservice handles all authentication. FTMS only:
1. Validates JWT tokens
2. Extracts user information
3. Enforces role-based access control

**JWT Secret**: `8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i` (shared across all microservices)

### Step 1: Authentication Middleware

**src/middleware/auth.ts**
```typescript
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

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

    // Attach user to request
    req.user = decoded;

    logger.debug(`User authenticated: ${decoded.username} (${decoded.role})`);
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
```

**src/middleware/authorize.ts**
```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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
```

### Step 2: Optional HR Auth Client

**src/integrations/hr/auth.client.ts**
```typescript
import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../config/logger';

export class HRAuthClient {
  private static baseUrl = config.externalApis.hrAuth;

  /**
   * Validate token with HR Auth service (optional additional validation)
   */
  static async validateToken(token: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/auth/validate`,
        { token },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.valid === true;
    } catch (error) {
      logger.error('Token validation failed:', error);
      return false;
    }
  }
}
```

### Step 3: Testing Authentication

**Example test with jwt.sign():**
```typescript
import jwt from 'jsonwebtoken';

describe('Authentication', () => {
  const JWT_SECRET = '8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i';

  it('should authenticate valid token', async () => {
    // Create test token
    const token = jwt.sign(
      {
        sub: '123',
        username: 'test.user',
        role: 'admin',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Test protected endpoint
    const response = await request(app)
      .get('/api/v1/admin/revenues')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('should reject invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/admin/revenues')
      .set('Authorization', 'Bearer invalid_token');

    expect(response.status).toBe(401);
  });
});
```

**📚 See AUTHENTICATION_README.md for complete documentation**

---

## Phase 3: Core Services Migration (Day 5-7)

### Step 1: Error Handling

**src/utils/errors.ts**
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}
```

**src/middleware/errorHandler.ts**
```typescript
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
```

### Step 2: Revenue Management Example

**src/services/revenue.service.ts**
```typescript
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { AuditLogClient } from '../integrations/audit/audit.client';

export class RevenueService {
  async createRevenue(data: any, userId: string, req?: any) {
    const revenue = await prisma.revenue.create({
      data: {
        ...data,
        createdBy: userId,
      },
    });

    // Log to Audit Logs
    await AuditLogClient.logCreate(
      'Revenue Management',
      { id: revenue.id, code: revenue.code },
      revenue,
      { id: userId, name: req?.user?.username, role: req?.user?.role },
      req
    );

    return revenue;
  }

  async listRevenues(filters: any, pagination: any) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [revenues, total] = await Promise.all([
      prisma.revenue.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.revenue.count({ where: filters }),
    ]);

    return {
      data: revenues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRevenueById(id: number) {
    const revenue = await prisma.revenue.findUnique({
      where: { id },
    });

    if (!revenue) {
      throw new NotFoundError('Revenue not found');
    }

    return revenue;
  }

  async updateRevenue(id: number, updates: any, userId: string, req?: any) {
    const oldRevenue = await this.getRevenueById(id);

    const newRevenue = await prisma.revenue.update({
      where: { id },
      data: {
        ...updates,
        updatedBy: userId,
      },
    });

    // Log to Audit Logs
    await AuditLogClient.logUpdate(
      'Revenue Management',
      { id, code: newRevenue.code },
      oldRevenue,
      newRevenue,
      { id: userId, name: req?.user?.username, role: req?.user?.role },
      req
    );

    return newRevenue;
  }

  async deleteRevenue(id: number, userId: string, reason: string, req?: any) {
    const revenue = await this.getRevenueById(id);

    await prisma.revenue.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date(),
      },
    });

    // Log to Audit Logs
    await AuditLogClient.logDelete(
      'Revenue Management',
      { id, code: revenue.code },
      revenue,
      { id: userId, name: req?.user?.username, role: req?.user?.role },
      reason,
      req
    );
  }
}
```

**src/controllers/revenue.controller.ts**
```typescript
import { Response, NextFunction } from 'express';
import { RevenueService } from '../services/revenue.service';
import { AuthRequest } from '../middleware/auth';

export class RevenueController {
  private service = new RevenueService();

  createRevenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const revenue = await this.service.createRevenue(
        req.body,
        req.user!.sub,
        req
      );

      res.status(201).json({
        success: true,
        data: revenue,
      });
    } catch (error) {
      next(error);
    }
  };

  listRevenues = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listRevenues(
        req.query,
        {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 10,
        }
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ... other methods
}
```

**src/routes/admin/revenue.routes.ts**
```typescript
import { Router } from 'router';
import { RevenueController } from '../../controllers/revenue.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { auditLogMiddleware } from '../../middleware/auditLogger';

const router = Router();
const controller = new RevenueController();

// Apply authentication & authorization
router.use(authenticate);
router.use(authorize('admin', 'finance_admin'));
router.use(auditLogMiddleware('Revenue Management'));

// Routes
router.get('/', controller.listRevenues);
router.post('/', controller.createRevenue);
router.get('/:id', controller.getRevenueById);
router.put('/:id', controller.updateRevenue);
router.delete('/:id', controller.deleteRevenue);

export default router;
```

### Step 3: Migrate Other Services

Apply the same pattern to:
- ✅ Expense Management
- ✅ Loan Management
- ✅ Budget Management
- ✅ Payroll Processing
- ✅ Purchase Orders
- ✅ Journal Entries
- ✅ Asset Management
- ✅ Reports & Analytics

---

## Phase 4: External API Integration (Day 8)

### Step 1: HR Employee API

**src/integrations/hr/employee.client.ts**
```typescript
import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../config/logger';

export interface HREmployee {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  email: string;
  phoneNumber: string;
  status: string;
}

export class HREmployeeClient {
  private static baseUrl = config.externalApis.hrEmployees;

  /**
   * Fetch all employees from HR API
   */
  static async getAllEmployees(): Promise<HREmployee[]> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch HR employees:', error);
      throw error;
    }
  }

  /**
   * Fetch employee by number
   */
  static async getEmployeeByNumber(employeeNumber: string): Promise<HREmployee | null> {
    try {
      const employees = await this.getAllEmployees();
      return employees.find((emp) => emp.employeeNumber === employeeNumber) || null;
    } catch (error) {
      logger.error(`Failed to fetch employee ${employeeNumber}:`, error);
      return null;
    }
  }
}
```

### Step 2: HR Payroll API

**src/integrations/hr/payroll.client.ts**
```typescript
import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../config/logger';

export interface HRPayrollData {
  employeeNumber: string;
  basicRate: number;
  totalMonthlyBenefits: number;
  totalMonthlyDeductions: number;
  netMonthlyRate: number;
  attendances: any[];
  benefits: any[];
  deductions: any[];
}

export class HRPayrollClient {
  private static baseUrl = config.externalApis.hrPayroll;

  /**
   * Fetch all payroll data from HR API
   */
  static async getAllPayrollData(): Promise<HRPayrollData[]> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch HR payroll:', error);
      throw error;
    }
  }

  /**
   * Fetch payroll by employee number
   */
  static async getPayrollByEmployee(employeeNumber: string): Promise<HRPayrollData | null> {
    try {
      const payrolls = await this.getAllPayrollData();
      return payrolls.find((pr) => pr.employeeNumber === employeeNumber) || null;
    } catch (error) {
      logger.error(`Failed to fetch payroll for ${employeeNumber}:`, error);
      return null;
    }
  }
}
```

### Step 3: Operations Bus Trip API

**src/integrations/operations/trip.client.ts**
```typescript
import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../config/logger';

export interface OperationsTrip {
  busTripId: string;
  assignmentId: string;
  assignmentType: string;
  assignmentValue: number;
  isRevenueRecorded: boolean;
  isExpenseRecorded: boolean;
  tripRevenue: number;
  tripFuelExpense: number;
  // ... other fields
}

export class OperationsTripClient {
  private static baseUrl = config.externalApis.operations;

  /**
   * Fetch all bus trips from Operations API
   */
  static async getAllTrips(): Promise<OperationsTrip[]> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch operations trips:', error);
      throw error;
    }
  }

  /**
   * Fetch trip by ID
   */
  static async getTripById(busTripId: string): Promise<OperationsTrip | null> {
    try {
      const trips = await this.getAllTrips();
      return trips.find((trip) => trip.busTripId === busTripId) || null;
    } catch (error) {
      logger.error(`Failed to fetch trip ${busTripId}:`, error);
      return null;
    }
  }
}
```

---

## Phase 5: Caching Implementation (Day 9-10)

### Overview

Implement Redis caching for frequently accessed external data. See **CACHING_STRATEGY.md** for complete details.

### Step 1: Base Cache Service

**src/cache/base.cache.ts**
```typescript
import { redis } from '../config/redis';
import { logger } from '../config/logger';

export class BaseCacheService {
  protected prefix: string;
  protected defaultTTL: number;

  constructor(prefix: string, ttlSeconds: number) {
    this.prefix = prefix;
    this.defaultTTL = ttlSeconds;
  }

  /**
   * Generate cache key
   */
  protected getCacheKey(identifier: string): string {
    return `${this.prefix}:${identifier}`;
  }

  /**
   * Get from cache
   */
  protected async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Cache get error (${key}):`, error);
      return null;
    }
  }

  /**
   * Set in cache
   */
  protected async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await redis.setex(
        key,
        ttl || this.defaultTTL,
        JSON.stringify(value)
      );
    } catch (error) {
      logger.error(`Cache set error (${key}):`, error);
    }
  }

  /**
   * Delete from cache
   */
  protected async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error (${key}):`, error);
    }
  }

  /**
   * Delete multiple keys
   */
  protected async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error (${pattern}):`, error);
    }
  }
}
```

### Step 2: Employee Cache Service

**src/cache/employee.cache.ts**
```typescript
import { BaseCacheService } from './base.cache';
import { prisma } from '../config/database';
import { HREmployeeClient } from '../integrations/hr/employee.client';
import { logger } from '../config/logger';

export class EmployeeCacheService extends BaseCacheService {
  constructor() {
    super('cache:employee', 3600); // 1 hour TTL
  }

  /**
   * Get employee with 3-tier lookup
   * 1. Redis cache
   * 2. PostgreSQL (CachedEmployee)
   * 3. HR API
   */
  async getEmployee(employeeNumber: string) {
    const cacheKey = this.getCacheKey(employeeNumber);

    // 1. Check Redis
    let employee = await this.get(cacheKey);
    if (employee) {
      logger.debug(`Employee ${employeeNumber} found in Redis`);
      return employee;
    }

    // 2. Check PostgreSQL
    const cached = await prisma.cachedEmployee.findUnique({
      where: { employeeNumber },
    });

    if (cached && !cached.isStale) {
      // Cache hit in database
      await this.set(cacheKey, cached);
      logger.debug(`Employee ${employeeNumber} found in database, cached in Redis`);
      return cached;
    }

    // 3. Fetch from HR API
    const freshData = await HREmployeeClient.getEmployeeByNumber(employeeNumber);
    if (freshData) {
      // Update database
      await prisma.cachedEmployee.upsert({
        where: { employeeNumber },
        update: {
          ...freshData,
          lastSyncedAt: new Date(),
          isStale: false,
        },
        create: {
          ...freshData,
          lastSyncedAt: new Date(),
          isStale: false,
          sourceSystem: 'HR',
        },
      });

      // Cache in Redis
      await this.set(cacheKey, freshData);
      logger.debug(`Employee ${employeeNumber} fetched from HR API and cached`);
      return freshData;
    }

    return null;
  }

  /**
   * Invalidate employee cache
   */
  async invalidate(employeeNumber: string) {
    const cacheKey = this.getCacheKey(employeeNumber);
    await this.delete(cacheKey);

    // Mark as stale in database
    await prisma.cachedEmployee.update({
      where: { employeeNumber },
      data: { isStale: true },
    });
  }

  /**
   * Sync all employees from HR API
   */
  async syncAll() {
    const employees = await HREmployeeClient.getAllEmployees();

    for (const emp of employees) {
      await prisma.cachedEmployee.upsert({
        where: { employeeNumber: emp.employeeNumber },
        update: {
          ...emp,
          lastSyncedAt: new Date(),
          isStale: false,
        },
        create: {
          ...emp,
          lastSyncedAt: new Date(),
          isStale: false,
          sourceSystem: 'HR',
        },
      });

      // Cache in Redis
      const cacheKey = this.getCacheKey(emp.employeeNumber);
      await this.set(cacheKey, emp);
    }

    logger.info(`Synced ${employees.length} employees from HR`);
  }
}
```

### Step 3: Payroll Cache Service

Apply similar pattern for payroll data with 30-minute TTL.

### Step 4: Scheduled Sync Jobs

**src/jobs/cache-sync.job.ts**
```typescript
import cron from 'node-cron';
import { EmployeeCacheService } from '../cache/employee.cache';
import { logger } from '../config/logger';

const employeeCache = new EmployeeCacheService();

// Sync employees every hour
cron.schedule('0 * * * *', async () => {
  logger.info('Starting scheduled employee cache sync');
  try {
    await employeeCache.syncAll();
    logger.info('Employee cache sync completed');
  } catch (error) {
    logger.error('Employee cache sync failed:', error);
  }
});
```

**📚 See CACHING_STRATEGY.md for complete implementation**

---

## Phase 6: Audit Logs Integration (Day 11)

### Overview

Integrate Audit Logs Microservice to track all critical financial operations.

### Step 1: Audit Log Client

See **AUDIT_LOGS_INTEGRATION.md** for complete `AuditLogClient` implementation.

### Step 2: Audit Logging Middleware

**src/middleware/auditLogger.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AuditLogClient } from '../integrations/audit/audit.client';

export const auditLogMiddleware = (moduleName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const action = {
            POST: 'CREATE',
            PUT: 'UPDATE',
            PATCH: 'UPDATE',
            DELETE: 'DELETE',
          }[req.method] || req.method;

          AuditLogClient.log({
            moduleName,
            action,
            performedBy: req.user?.sub || 'unknown',
            performedByName: req.user?.username,
            performedByRole: req.user?.role,
            recordId: data.id?.toString(),
            recordCode: data.code,
            newValues: data,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          }).catch((err) => {
            console.error('Audit log failed:', err);
          });
        }

        return originalJson(data);
      };
    }

    next();
  };
};
```

### Step 3: Integration in Services

All service methods should include audit logging:
```typescript
// CREATE
await AuditLogClient.logCreate(moduleName, record, data, user, req);

// UPDATE
await AuditLogClient.logUpdate(moduleName, record, oldData, newData, user, req);

// DELETE
await AuditLogClient.logDelete(moduleName, record, data, user, reason, req);

// APPROVE
await AuditLogClient.logApproval(moduleName, record, 'APPROVE', user, undefined, req);

// VIEW (sensitive data)
await AuditLogClient.logView(moduleName, record, user, req);

// EXPORT
await AuditLogClient.logExport(moduleName, exportType, user, metadata, req);
```

**📚 See AUDIT_LOGS_INTEGRATION.md for complete documentation**

---

## Phase 7: Testing (Day 12)

### Step 1: Unit Tests

**Example: Revenue Service Test**
```typescript
import { RevenueService } from '../services/revenue.service';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';

jest.mock('../config/database');
jest.mock('../integrations/audit/audit.client');

describe('RevenueService', () => {
  const JWT_SECRET = '8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i';
  const service = new RevenueService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRevenue', () => {
    it('should create revenue and log audit', async () => {
      const mockRevenue = {
        id: 1,
        code: 'REV-001',
        amount: 5000,
        createdBy: '123',
      };

      (prisma.revenue.create as jest.Mock).mockResolvedValue(mockRevenue);

      const result = await service.createRevenue(
        { amount: 5000 },
        '123'
      );

      expect(result).toEqual(mockRevenue);
      expect(prisma.revenue.create).toHaveBeenCalled();
    });
  });
});
```

### Step 2: Integration Tests

**Example: Revenue API Test**
```typescript
import request from 'supertest';
import { app } from '../app';
import jwt from 'jsonwebtoken';

describe('Revenue API', () => {
  const JWT_SECRET = '8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i';
  let token: string;

  beforeAll(() => {
    token = jwt.sign(
      {
        sub: '123',
        username: 'test.admin',
        role: 'admin',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/v1/admin/revenues', () => {
    it('should create revenue', async () => {
      const response = await request(app)
        .post('/api/v1/admin/revenues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          revenueType: 'TRIP',
          amount: 5000,
          dateRecorded: '2025-10-22',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should reject unauthorized request', async () => {
      const response = await request(app)
        .post('/api/v1/admin/revenues')
        .send({
          revenueType: 'TRIP',
          amount: 5000,
        });

      expect(response.status).toBe(401);
    });
  });
});
```

### Step 3: E2E Tests

Test complete workflows:
- ✅ User authentication flow
- ✅ Revenue creation → approval → recording
- ✅ Loan request → approval → disbursement → payment
- ✅ Budget allocation → expense approval → budget consumption
- ✅ Payroll processing → journal entry creation
- ✅ Report generation → audit log verification

### Step 4: Load Testing

```bash
# Install artillery
npm install -g artillery

# Create load test config
cat > load-test.yml <<EOF
config:
  target: http://localhost:3000
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: Revenue List
    flow:
      - get:
          url: /api/v1/admin/revenues
          headers:
            Authorization: Bearer YOUR_TOKEN
EOF

# Run load test
artillery run load-test.yml
```

---

## Phase 8: Deployment Preparation (Day 13)

### Step 1: Environment Configuration

**Production .env:**
```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://prod_user:prod_pass@prod-db:5432/ftms
REDIS_URL=redis://prod-redis:6379

JWT_SECRET=8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i
JWT_EXPIRES_IN=8h

HR_AUTH_API_URL=https://hr-auth.production.com
HR_API_EMPLOYEES_URL=https://hr-api.production.com/api/clean/hr_employees
HR_API_PAYROLL_URL=https://hr-api.production.com/api/clean/hr_payroll
OP_API_BUSTRIP_URL=https://operations-api.production.com/api/clean/op_bus-trip-details

AUDIT_LOGS_API_URL=https://audit-logs.production.com
AUDIT_LOGS_API_KEY=PRODUCTION_API_KEY

ALLOWED_ORIGINS=https://ftms-frontend.production.com

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Step 2: Docker Configuration

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=ftms_user
      - POSTGRES_PASSWORD=ftms_pass
      - POSTGRES_DB=ftms
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Step 3: Health Checks

**src/routes/health.routes.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    await redis.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      redis: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
```

### Step 4: Monitoring & Logging

**Production logging configuration:**
```typescript
// config/logger.ts (production)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

---

## Phase 9: Migration & Monitoring (Day 14)

### Step 1: Database Migration

```bash
# Run migrations
npx prisma migrate deploy

# Verify migration
npx prisma migrate status
```

### Step 2: Deployment

```bash
# Build Docker image
docker build -t ftms-backend:latest .

# Run with docker-compose
docker-compose up -d

# Verify deployment
curl http://localhost:3000/health
```

### Step 3: Smoke Tests

```bash
# Test authentication
curl -X POST http://localhost:3000/api/v1/auth/validate \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test revenue endpoint
curl http://localhost:3000/api/v1/admin/revenues \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test audit logs integration
curl http://localhost:4004/api/audit-logs?service=finance
```

### Step 4: Monitoring

- **Application Logs**: Monitor `logs/combined.log` and `logs/error.log`
- **Database Performance**: Monitor slow queries in PostgreSQL
- **Redis Performance**: Monitor `redis-cli INFO stats`
- **API Performance**: Monitor response times and error rates
- **Audit Logs**: Verify all critical operations are logged

---

## Reference Documents

1. **AUTHENTICATION_README.md** - Complete authentication architecture documentation
2. **AUTH_QUICK_REFERENCE.md** - Quick reference for JWT validation
3. **CACHING_STRATEGY.md** - Redis/PostgreSQL caching implementation guide
4. **AUDIT_LOGS_INTEGRATION.md** - Audit Logs Microservice integration guide

---

## ✅ Implementation Checklist

### Phase 0: Preparation
- [ ] Backup current system (database, code, .env)
- [ ] Document all API endpoints
- [ ] Create migration branch

### Phase 1: Express Setup
- [ ] Remove frontend dependencies
- [ ] Install backend dependencies
- [ ] Create project structure
- [ ] Setup core configuration (env, logger, database, redis)
- [ ] Create main app and server files
- [ ] Test health check endpoint

### Phase 2: Authentication
- [ ] Implement JWT validation middleware
- [ ] Implement authorization middleware
- [ ] Test authentication flow
- [ ] Update environment variables

### Phase 3: Core Services
- [ ] Migrate error handling
- [ ] Migrate Revenue Management
- [ ] Migrate Expense Management
- [ ] Migrate Loan Management
- [ ] Migrate Budget Management
- [ ] Migrate all other services

### Phase 4: External APIs
- [ ] Implement HR Employee API client
- [ ] Implement HR Payroll API client
- [ ] Implement Operations Bus Trip API client
- [ ] Test all external integrations

### Phase 5: Caching
- [ ] Implement base cache service
- [ ] Implement employee caching
- [ ] Implement payroll caching
- [ ] Implement trip caching
- [ ] Setup scheduled sync jobs
- [ ] Test cache hit/miss scenarios

### Phase 6: Audit Logs
- [ ] Implement Audit Log client
- [ ] Implement audit logging middleware
- [ ] Integrate audit logs in all services
- [ ] Test audit log creation
- [ ] Verify logs in Audit Logs UI

### Phase 7: Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Run load tests
- [ ] Achieve 80%+ code coverage

### Phase 8: Deployment
- [ ] Create production environment config
- [ ] Create Docker configuration
- [ ] Setup health checks
- [ ] Configure monitoring & logging
- [ ] Test deployment locally

### Phase 9: Migration
- [ ] Run database migrations
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Monitor application
- [ ] Verify audit logs

---

**🎉 Migration Complete!** FTMS is now a pure Express.js backend with HR Auth integration, Redis caching, and Audit Logs compliance.
