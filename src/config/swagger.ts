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
- Development: \`http://localhost:${config.port}\`
- Production: Configure via environment variables
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
  servers: [
    {
      url: '',
      description: 'Current server (auto-detected from request)',
    },
  ],
  tags: [
    {
      name: 'General',
      description: 'Public endpoints accessible to all users without authentication',
    },
    {
      name: 'Admin',
      description: 'Administrative endpoints - requires Admin role authentication',
    },
    {
      name: 'Staff',
      description: 'Staff endpoints - requires Staff role authentication',
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
