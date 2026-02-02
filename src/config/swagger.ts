import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

/**
 * OpenAPI 3.0 Specification Configuration
 * 
 * This file defines the OpenAPI specification for the FTMS Backend API.
 * It includes security schemes, server configuration, and comprehensive
 * documentation structure.
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'FTMS Backend API',
    version: '1.0.0',
    description: `
# Financial Transaction Management System - API Documentation

This is the comprehensive API documentation for the FTMS Backend system. 
The API provides endpoints for managing financial transactions, payroll, 
chart of accounts, journal entries, and integration with external systems.

## Features
- Financial transaction management
- Payroll processing and integration
- Chart of accounts management
- Journal entry tracking
- External system integrations (HR, Operations, Audit)

## Authentication
Most endpoints require JWT Bearer token authentication. Use the "Authorize" button 
to set your token and test authenticated endpoints.

## Base URL
- Development: \`https://localhost:${config.port}\`
- Production: Configure via environment variables (API_BASE_URL)
    `,
    contact: {
      name: 'FTMS Development Team',
      email: 'dev@ftms.example.com',
    },
    license: {
      name: 'Proprietary',
      url: 'https://ftms.example.com/license',
    },
  },
  servers: (() => {
    const servers = [];
    
    // Detect if running in Railway/production environment
    // Railway sets PORT (usually 8080), and various RAILWAY_* vars
    const isRailway = !!(
      process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.RAILWAY_STATIC_URL ||
      process.env.RAILWAY_SERVICE_NAME ||
      (process.env.PORT && process.env.PORT !== '4000') // Railway uses different port
    );
    const isProduction = process.env.NODE_ENV === 'production' || isRailway;
    
    // Production server - ALWAYS add this for Railway deployments
    if (isProduction || isRailway) {
      const productionUrl = 
        process.env.API_BASE_URL || 
        (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
        'https://ftmsbackend-production.up.railway.app'; // Hardcoded fallback
      
      servers.push({
        url: productionUrl,
        description: 'Production Server',
      });
    }
    
    // Only add localhost in non-production/non-Railway
    if (!isProduction && !isRailway) {
      servers.push(
        {
          url: `http://localhost:${config.port}`,
          description: 'Local Development (HTTP)',
        },
        {
          url: `https://localhost:${config.port}`,
          description: 'Local Development (HTTPS)',
        }
      );
    }
    
    return servers;
  })(),
  tags: [
    // ===========================
    // GENERAL ENDPOINTS
    // ===========================
    {
      name: 'General | Health & Info',
      description: '🌐 Public endpoints accessible without authentication – System health checks and API information',
    },
    {
      name: 'General | Data Sync',
      description: '🔄 External data synchronization – Sync employees, buses, rentals, and bus trips from external systems (HR, Inventory, Operations)',
    },
    {
      name: 'General | Webhooks',
      description: '🔔 Webhook endpoints – Receive lifecycle events (is_active status) from external systems (HR, Inventory, Operations)',
    },

    // ===========================
    // ADMIN ENDPOINTS
    // ===========================
    {
      name: 'Admin | Account Types',
      description: '🔐 Admin – Manage account type definitions for the chart of accounts',
    },
    {
      name: 'Admin | Chart of Accounts',
      description: '🔐 Admin – Full CRUD operations for chart of accounts management',
    },
    {
      name: 'Admin | Journal Entries',
      description: '🔐 Admin – Create, update, and manage journal entries',
    },
    {
      name: 'Admin | Payroll Periods',
      description: '🔐 Admin – Manage payroll periods, processing, and payslips',
    },
    {
      name: 'Admin | Operational Trip Expenses',
      description: '🔐 Admin – Manage operational and rental trip expense records',
    },
    {
      name: 'Admin | Expense Reference Data',
      description: '🔐 Admin – Reference data for expense dropdowns (expense types, payment methods, trips, employees)',
    },
    {
      name: 'Admin | Administrative Expenses',
      description: '🔐 Admin – Manage administrative/other expense records (office supplies, utilities, rent, etc.)',
    },
    {
      name: 'Admin | Attachments',
      description: '🔐 Admin – File attachment management for expenses, payables, revenues, and other entities',
    },
    {
      name: 'Admin | Integration – HR',
      description: '🔐 Admin – HR system employee data synchronization',
    },
    {
      name: 'Admin | Integration – HR Payroll',
      description: '🔐 Admin – HR system payroll data synchronization',
    },
    {
      name: 'Admin | Integration – Operations',
      description: '🔐 Admin – Operations system trip data synchronization',
    },
    {
      name: 'Admin | Integration – Finance',
      description: '🔐 Admin – Finance system payroll data integration',
    },
    {
      name: 'Admin | Suppliers',
      description: '🔐 Admin – Manage suppliers and vendors for expense tracking',
    },
    {
      name: 'Admin | Dashboard',
      description: '🔐 Admin – Dashboard summary and forecast data for financial analytics',
    },
    {
      name: 'Admin | Budget Allocation',
      description: '🔐 Admin – Manage department budget allocations and deductions',
    },

    // ===========================
    // FINANCE INTEGRATION ENDPOINTS
    // ===========================
    {
      name: 'Finance | Budget Requests',
      description: '💰 Finance – Budget request management (list, view, approve, reject)',
    },
    {
      name: 'Finance | Purchase Requests',
      description: '💰 Finance – Purchase request management for finance approval',
    },
    {
      name: 'Finance | Payroll Integration',
      description: '💰 Finance – Payroll data integration for external systems',
    },

    // ===========================
    // STAFF ENDPOINTS
    // ===========================
    {
      name: 'Staff | Journal Entries',
      description: '👤 Staff – Read-only access to journal entries',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer {token}',
      },
    },
    schemas: {
      // Common response schemas
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully',
          },
          data: {
            type: 'object',
            description: 'Response data payload',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'An error occurred',
          },
          error: {
            type: 'string',
            example: 'Detailed error message',
          },
          statusCode: {
            type: 'integer',
            example: 400,
          },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'Validation failed',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'email',
                },
                message: {
                  type: 'string',
                  example: 'Invalid email format',
                },
              },
            },
          },
        },
      },
      UnauthorizedError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'Unauthorized - Invalid or missing token',
          },
        },
      },
      ForbiddenError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'Forbidden - Insufficient permissions',
          },
        },
      },
      // Sync-specific schemas
      SyncTableStats: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the sync for this table succeeded',
          },
          inserted: {
            type: 'integer',
            description: 'Number of new records inserted',
          },
          updated: {
            type: 'integer',
            description: 'Number of existing records updated',
          },
          softDeleted: {
            type: 'integer',
            description: 'Number of records marked as deleted',
          },
          errors: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'List of error messages if any',
          },
        },
      },
      SyncSuccessResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'success',
          },
          message: {
            type: 'string',
            example: 'External data synchronized successfully',
          },
          data: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: true,
              },
              startTime: {
                type: 'string',
                format: 'date-time',
              },
              endTime: {
                type: 'string',
                format: 'date-time',
              },
              totalDurationMs: {
                type: 'integer',
                description: 'Total sync duration in milliseconds',
              },
              tables: {
                type: 'object',
                properties: {
                  employee_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  bus_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  rental_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  rental_employee_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  bus_trip_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  bus_trip_employee_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                },
              },
            },
          },
        },
      },
      SyncPartialSuccessResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'partial_success',
          },
          message: {
            type: 'string',
            example: 'External data sync completed with some errors',
          },
          data: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: false,
              },
              startTime: {
                type: 'string',
                format: 'date-time',
              },
              endTime: {
                type: 'string',
                format: 'date-time',
              },
              totalDurationMs: {
                type: 'integer',
              },
              tables: {
                type: 'object',
                properties: {
                  employee_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  bus_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  rental_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  rental_employee_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  bus_trip_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                  bus_trip_employee_local: {
                    $ref: '#/components/schemas/SyncTableStats',
                  },
                },
              },
            },
          },
        },
      },
      // Webhook schemas
      WebhookSuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Employee EMP-001 activated via webhook',
          },
          data: {
            type: 'object',
            properties: {
              record_id: {
                oneOf: [
                  { type: 'string', example: 'EMP-001' },
                  {
                    type: 'object',
                    properties: {
                      assignment_id: { type: 'string' },
                      bus_trip_id: { type: 'string' },
                    },
                  },
                ],
              },
              is_active: {
                type: 'boolean',
                example: true,
              },
              last_synced_at: {
                type: 'string',
                format: 'date-time',
              },
            },
          },
        },
      },
      WebhookErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'Missing required field: employee_number',
          },
          error: {
            type: 'string',
            description: 'Detailed error message (optional)',
          },
        },
      },
      BatchWebhookResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Batch processed: 3 succeeded, 1 failed',
          },
          summary: {
            type: 'object',
            properties: {
              total: {
                type: 'integer',
                example: 4,
              },
              processed: {
                type: 'integer',
                example: 3,
              },
              failed: {
                type: 'integer',
                example: 1,
              },
            },
          },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                record_id: {
                  oneOf: [
                    { type: 'string' },
                    {
                      type: 'object',
                      properties: {
                        assignment_id: { type: 'string' },
                        bus_trip_id: { type: 'string' },
                      },
                    },
                  ],
                },
                success: {
                  type: 'boolean',
                },
                message: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      // Finance-specific schemas
      PayrollIntegrationData: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              payroll_period: {
                type: 'object',
                properties: {
                  start_date: {
                    type: 'string',
                    format: 'date',
                    example: '2026-01-01',
                  },
                  end_date: {
                    type: 'string',
                    format: 'date',
                    example: '2026-01-15',
                  },
                },
              },
              employees: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    employee_number: {
                      type: 'string',
                      example: 'EMP-2024-001',
                    },
                    employee_name: {
                      type: 'string',
                      example: 'John Doe',
                    },
                    department: {
                      type: 'string',
                      example: 'Engineering',
                    },
                    gross_pay: {
                      type: 'number',
                      format: 'decimal',
                      example: 75000.00,
                    },
                    deductions: {
                      type: 'number',
                      format: 'decimal',
                      example: 15000.00,
                    },
                    net_pay: {
                      type: 'number',
                      format: 'decimal',
                      example: 60000.00,
                    },
                    tax_withheld: {
                      type: 'number',
                      format: 'decimal',
                      example: 10000.00,
                    },
                    benefits: {
                      type: 'number',
                      format: 'decimal',
                      example: 5000.00,
                    },
                  },
                },
              },
              summary: {
                type: 'object',
                properties: {
                  total_employees: {
                    type: 'integer',
                    example: 150,
                  },
                  total_gross_pay: {
                    type: 'number',
                    format: 'decimal',
                    example: 11250000.00,
                  },
                  total_deductions: {
                    type: 'number',
                    format: 'decimal',
                    example: 2250000.00,
                  },
                  total_net_pay: {
                    type: 'number',
                    format: 'decimal',
                    example: 9000000.00,
                  },
                },
              },
            },
          },
          metadata: {
            type: 'object',
            properties: {
              generated_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-01-11T10:30:00Z',
              },
              generated_by: {
                type: 'string',
                example: 'FTMS System',
              },
            },
          },
        },
      },
      // Budget Request schema
      BudgetRequest: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          request_code: {
            type: 'string',
            example: 'BR-2026-001',
          },
          department_id: {
            type: 'string',
            example: 'DEPT-001',
          },
          department_name: {
            type: 'string',
            example: 'Finance Department',
          },
          requested_by: {
            type: 'string',
            example: 'John Doe',
          },
          requester_position: {
            type: 'string',
            example: 'Department Head',
          },
          requested_for: {
            type: 'string',
            nullable: true,
          },
          request_date: {
            type: 'string',
            format: 'date',
          },
          total_amount: {
            type: 'number',
            example: 50000,
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'ADJUSTED', 'CLOSED'],
            example: 'PENDING',
          },
          purpose: {
            type: 'string',
            nullable: true,
          },
          remarks: {
            type: 'string',
            nullable: true,
          },
          request_type: {
            type: 'string',
            enum: ['REGULAR', 'PROJECT_BASED', 'URGENT', 'EMERGENCY'],
            example: 'REGULAR',
          },
          pr_reference_code: {
            type: 'string',
            nullable: true,
          },
          approved_by: {
            type: 'string',
            nullable: true,
          },
          approved_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          rejected_by: {
            type: 'string',
            nullable: true,
          },
          rejected_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          rejection_reason: {
            type: 'string',
            nullable: true,
          },
          aggregated_requested_amount: {
            type: 'number',
            example: 50000,
          },
          aggregated_approved_amount: {
            type: 'number',
            example: 45000,
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                },
                description: {
                  type: 'string',
                },
                requested_amount: {
                  type: 'number',
                },
                approved_amount: {
                  type: 'number',
                },
                notes: {
                  type: 'string',
                  nullable: true,
                },
                category: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: {
                      type: 'integer',
                    },
                    code: {
                      type: 'string',
                    },
                    name: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      // Purchase Request schema
      PurchaseRequest: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          request_code: {
            type: 'string',
            example: 'PR-2026-001',
          },
          department_id: {
            type: 'string',
          },
          department_name: {
            type: 'string',
          },
          requested_by: {
            type: 'string',
          },
          request_date: {
            type: 'string',
            format: 'date',
          },
          total_amount: {
            type: 'number',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED'],
          },
          purpose: {
            type: 'string',
            nullable: true,
          },
          remarks: {
            type: 'string',
            nullable: true,
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                },
                description: {
                  type: 'string',
                },
                quantity: {
                  type: 'number',
                },
                unit_cost: {
                  type: 'number',
                },
                approved_quantity: {
                  type: 'number',
                  nullable: true,
                },
                approved_unit_cost: {
                  type: 'number',
                  nullable: true,
                },
              },
            },
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
    responses: {
      Success: {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SuccessResponse',
            },
          },
        },
      },
      BadRequest: {
        description: 'Bad request - Invalid input parameters',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UnauthorizedError',
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ForbiddenError',
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                message: {
                  type: 'string',
                  example: 'Resource not found',
                },
              },
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
    },
  },
  // Global security requirement (can be overridden per endpoint)
  security: [],
};

/**
 * Swagger JSDoc Options
 * Defines where to look for API documentation
 */
const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  // Path to the API routes where JSDoc comments are located
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
    './src/docs/**/*.ts',
  ],
};

/**
 * Generate OpenAPI specification
 */
export const swaggerSpec = swaggerJsdoc(options);

/**
 * Export configuration for use in other modules
 */
export const swaggerConfig = {
  definition: swaggerDefinition,
  options,
};
