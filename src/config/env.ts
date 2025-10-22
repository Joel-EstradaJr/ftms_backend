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
  
  jwtSecret: process.env.JWT_SECRET || '8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  
  auditLogsApiKey: process.env.AUDIT_LOGS_API_KEY || 'FINANCE_DEFAULT_KEY',
  
  externalApis: {
    hrAuth: process.env.HR_AUTH_API_URL || 'http://localhost:3002',
    hrEmployees: process.env.HR_API_EMPLOYEES_URL!,
    hrPayroll: process.env.HR_API_PAYROLL_URL!,
    operations: process.env.OP_API_BUSTRIP_URL!,
    auditLogs: process.env.AUDIT_LOGS_API_URL || 'http://localhost:4004',
  },
  
  corsOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:3002,http://localhost:4003,http://localhost:4004').split(','),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'HR_API_EMPLOYEES_URL',
  'HR_API_PAYROLL_URL',
  'OP_API_BUSTRIP_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log('✅ Environment configuration loaded successfully');
