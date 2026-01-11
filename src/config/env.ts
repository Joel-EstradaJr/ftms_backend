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
    inventory: string;
    budgetRequests: string;
  };

  // Security
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;

  // Authentication
  enableAuth: boolean;

  // API Documentation
  enableApiDocs: boolean;
  apiDocsPath: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  databaseUrl: process.env.DATABASE_URL!,

  jwtSecret: process.env.JWT_SECRET || '8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  auditLogsApiKey: process.env.AUDIT_LOGS_API_KEY || 'FINANCE_DEFAULT_KEY',

  externalApis: {
    hrAuth: `${process.env.HR_API_BASE_URL}/auth`,
    hrEmployees: `${process.env.HR_API_BASE_URL}/hr_employees`,
    hrPayroll: `${process.env.HR_API_BASE_URL}/hr_payroll`,
    operations: `${process.env.OP_API_BASE_URL}/bus_trip`,
    auditLogs: `${process.env.AUDIT_LOGS_MICRO_BASE_API_URL}`,
    inventory: `${process.env.INV_API_BASE_URL}`,
    budgetRequests: `${process.env.BUDGET_REQUEST_MICRO_BASE_API_URL}`,
  },

  corsOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:4003,http://localhost:4000').split(','),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  enableAuth: process.env.ENABLE_AUTH !== 'false',

  enableApiDocs: process.env.ENABLE_API_DOCS === 'true',
  apiDocsPath: process.env.API_DOCS_PATH || '/docs',
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'HR_API_BASE_URL',
  'OP_API_BASE_URL',
  'INV_API_BASE_URL',
  'BUDGET_REQUEST_MICRO_BASE_API_URL',
  'AUDIT_LOGS_MICRO_BASE_API_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log('✅ Environment configuration loaded successfully');
