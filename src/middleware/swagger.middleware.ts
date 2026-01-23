import { Request, Response, NextFunction, Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * Swagger Middleware Configuration
 * S
 * Configures and sets up Swagger UI with security and environment-based access control.
 * Only exposes Swagger UI when ENABLE_API_DOCS environment variable is set to true.
 */

/**
 * Custom Swagger UI options
 * Configures the appearance and behavior of Swagger UI
 */
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true, // Enable API explorer
  swaggerOptions: {
    persistAuthorization: true, // Persist authorization data in browser storage
    displayRequestDuration: true, // Show request duration
    filter: true, // Enable filtering
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
    tryItOutEnabled: true, // Enable "Try it out" by default
    requestSnippetsEnabled: true, // Enable request snippets
    defaultModelsExpandDepth: 3, // Expand models depth
    defaultModelExpandDepth: 3,
    docExpansion: 'list', // 'list', 'full', or 'none'
    operationsSorter: 'alpha', // Sort operations alphabetically within tags
    // Tags are ordered as defined in the OpenAPI spec (swagger.ts tags array)
    // Order: General → Admin → Staff
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { 
      background: #fafafa; 
      padding: 20px; 
      border-radius: 4px;
      margin: 20px 0;
    }
    /* Enhanced tag hierarchy styling */
    .swagger-ui .opblock-tag-section {
      margin-bottom: 8px;
    }
    .swagger-ui .opblock-tag {
      font-weight: 600;
    }
  `,
  customSiteTitle: 'FTMS Backend API Documentation',
  customfavIcon: '/favicon.ico',
};

/**
 * Setup Swagger documentation endpoints
 * 
 * This function conditionally sets up Swagger UI and related endpoints
 * based on the ENABLE_API_DOCS environment variable.
 * 
 * @param app - Express application instance
 */
export const setupSwagger = (app: Application): void => {
  // Get API docs configuration from environment
  const enableApiDocs = process.env.ENABLE_API_DOCS === 'true';
  const apiDocsPath = process.env.API_DOCS_PATH || '/docs';

  if (!enableApiDocs) {
    logger.info('📚 API Documentation is DISABLED (ENABLE_API_DOCS=false)');
    
    // Add a handler to return 404 for docs endpoints when disabled
    app.get([apiDocsPath, `${apiDocsPath}/{*path}`, '/api-docs.json'], (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'API documentation is not available in this environment',
        hint: 'Set ENABLE_API_DOCS=true to enable documentation',
      });
    });
    
    return;
  }

  logger.info(`📚 Setting up API Documentation at ${apiDocsPath}`);

  try {
    // Serve OpenAPI JSON specification
    app.get('/api-docs.json', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      
      // Dynamically set the server URL based on the request
      const protocol = req.protocol;
      const host = req.get('host');
      const serverUrl = `${protocol}://${host}`;
      
      // Clone the spec and update the server URL
      const dynamicSpec = {
        ...swaggerSpec,
        servers: [
          {
            url: serverUrl,
            description: 'Current server (auto-detected)',
          },
        ],
      };
      
      res.send(dynamicSpec);
    });

    // Serve Swagger UI with dynamic server URL
    app.use(
      apiDocsPath,
      (req: Request, res: Response, next: NextFunction) => {
        // Dynamically set the server URL for each request
        const protocol = req.protocol;
        const host = req.get('host');
        const serverUrl = `${protocol}://${host}`;
        
        // Update swagger spec with current server URL
        (req as any).swaggerDoc = {
          ...swaggerSpec,
          servers: [
            {
              url: serverUrl,
              description: 'Current server (auto-detected)',
            },
          ],
        };
        next();
      },
      swaggerUi.serve,
      (req: Request, res: Response) => {
        res.send(
          swaggerUi.generateHTML((req as any).swaggerDoc || swaggerSpec, swaggerUiOptions)
        );
      }
    );

    // Add redirect from /docs to configured path if different
    if (apiDocsPath !== '/docs') {
      app.get('/docs', (req: Request, res: Response) => {
        res.redirect(apiDocsPath);
      });
    }

    logger.info(`✅ Swagger UI available at: http://localhost:${config.port}${apiDocsPath}`);
    logger.info(`✅ OpenAPI JSON available at: http://localhost:${config.port}/api-docs.json`);
  } catch (error) {
    logger.error('❌ Failed to setup Swagger documentation:', error);
    throw error;
  }
};

/**
 * Middleware to add API documentation links to health check
 * This helps developers discover the documentation endpoint
 */
export const addDocsInfoToHealth = (req: Request, res: Response, next: NextFunction): void => {
  const enableApiDocs = process.env.ENABLE_API_DOCS === 'true';
  const apiDocsPath = process.env.API_DOCS_PATH || '/docs';

  // Store docs info in res.locals for use in route handlers
  res.locals.docsInfo = {
    enabled: enableApiDocs,
    path: enableApiDocs ? apiDocsPath : null,
    openApiSpec: enableApiDocs ? '/api-docs.json' : null,
  };

  next();
};

/**
 * Validate Swagger specification on startup
 * Helps catch configuration errors early
 */
export const validateSwaggerSpec = (): boolean => {
  try {
    if (!swaggerSpec || typeof swaggerSpec !== 'object') {
      throw new Error('Invalid Swagger specification');
    }

    const spec = swaggerSpec as any;

    if (!spec.openapi) {
      throw new Error('Missing OpenAPI version in specification');
    }

    if (!spec.info) {
      throw new Error('Missing info section in specification');
    }

    if (!spec.paths) {
      logger.warn('⚠️  No API paths defined in Swagger specification');
    }

    logger.info('✅ Swagger specification validated successfully');
    return true;
  } catch (error) {
    logger.error('❌ Swagger specification validation failed:', error);
    return false;
  }
};
