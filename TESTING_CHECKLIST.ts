/**
 * Manual Testing Checklist for Swagger/OpenAPI Implementation
 * 
 * Use this checklist to verify the implementation is working correctly.
 */

export const testingChecklist = {
  "1. Environment Configuration": {
    description: "Test environment-based access control",
    tests: [
      {
        name: "Documentation Enabled",
        steps: [
          "1. Set ENABLE_API_DOCS=true in .env",
          "2. Restart server (pnpm dev)",
          "3. Visit http://localhost:3000/docs",
          "4. Expected: Swagger UI should load successfully",
        ],
        expected: "✅ Swagger UI visible with all endpoints",
      },
      {
        name: "Documentation Disabled",
        steps: [
          "1. Set ENABLE_API_DOCS=false in .env (or remove variable)",
          "2. Restart server",
          "3. Visit http://localhost:3000/docs",
          "4. Expected: 404 error with message about documentation not available",
        ],
        expected: "✅ 404 error returned, documentation hidden",
      },
      {
        name: "Custom Path",
        steps: [
          "1. Set ENABLE_API_DOCS=true and API_DOCS_PATH=/api-docs",
          "2. Restart server",
          "3. Visit http://localhost:3000/api-docs",
          "4. Expected: Swagger UI loads at custom path",
        ],
        expected: "✅ Swagger UI accessible at custom path",
      },
    ],
  },

  "2. Swagger UI Functionality": {
    description: "Test interactive Swagger UI features",
    tests: [
      {
        name: "UI Loads Correctly",
        steps: [
          "1. Open http://localhost:3000/docs",
          "2. Verify page title is 'FTMS Backend API Documentation'",
          "3. Check that API title and description are displayed",
          "4. Verify tags are grouped (Health, Finance Integration, etc.)",
        ],
        expected: "✅ UI loads with proper branding and organization",
      },
      {
        name: "Authorize Button",
        steps: [
          "1. Look for green 'Authorize' button at top right",
          "2. Click it",
          "3. Verify JWT Bearer auth input field appears",
          "4. Enter 'Bearer test-token' and click Authorize",
          "5. Close dialog",
        ],
        expected: "✅ Authorization modal works, token can be set",
      },
      {
        name: "Try It Out",
        steps: [
          "1. Expand GET /health endpoint",
          "2. Click 'Try it out' button",
          "3. Click 'Execute'",
          "4. Verify response appears below",
          "5. Check that response code, body, and headers are shown",
        ],
        expected: "✅ Can execute requests and see responses",
      },
    ],
  },

  "3. Finance Endpoint": {
    description: "Test finance payroll integration endpoint",
    tests: [
      {
        name: "Valid Request",
        steps: [
          "1. Navigate to Finance Integration section",
          "2. Expand GET /finance/v2/payroll-integration",
          "3. Click 'Try it out'",
          "4. Enter: payroll_period_start = 2026-01-01",
          "5. Enter: payroll_period_end = 2026-01-15",
          "6. Enter: employee_number = EMP-2024-001",
          "7. Click Execute",
        ],
        expected: "✅ 200 response with employee payroll data",
        sampleResponse: {
          success: true,
          data: {
            payroll_period: { start_date: "2026-01-01", end_date: "2026-01-15" },
            employees: [
              {
                employee_number: "EMP-2024-001",
                employee_name: "John Doe",
                gross_pay: 75000.0,
              },
            ],
          },
        },
      },
      {
        name: "Invalid Date Format",
        steps: [
          "1. Same endpoint",
          "2. Enter: payroll_period_start = invalid-date",
          "3. Enter: payroll_period_end = 2026-01-15",
          "4. Click Execute",
        ],
        expected: "✅ 400 response with validation error",
        sampleResponse: {
          success: false,
          message: "Validation failed",
          errors: [
            {
              field: "payroll_period_start",
              message: "Invalid date format. Expected YYYY-MM-DD",
            },
          ],
        },
      },
      {
        name: "Missing Required Parameters",
        steps: [
          "1. Same endpoint",
          "2. Leave payroll_period_start empty",
          "3. Leave payroll_period_end empty",
          "4. Click Execute",
        ],
        expected: "✅ 400 response with validation errors for both fields",
      },
      {
        name: "Invalid Employee Number",
        steps: [
          "1. Same endpoint",
          "2. Enter valid dates",
          "3. Enter: employee_number = INVALID",
          "4. Click Execute",
        ],
        expected: "✅ 400 response with employee number format error",
      },
      {
        name: "All Employees",
        steps: [
          "1. Same endpoint",
          "2. Enter valid dates",
          "3. Leave employee_number empty",
          "4. Click Execute",
        ],
        expected: "✅ 200 response with all employees (5 employees in mock data)",
      },
    ],
  },

  "4. OpenAPI Specification": {
    description: "Test OpenAPI JSON endpoint",
    tests: [
      {
        name: "Specification Endpoint",
        steps: [
          "1. Visit http://localhost:3000/api-docs.json",
          "2. Verify valid JSON is returned",
          "3. Check openapi: '3.0.0' field exists",
          "4. Check info section with title and version",
          "5. Check paths section contains endpoints",
        ],
        expected: "✅ Valid OpenAPI 3.0 JSON specification returned",
      },
      {
        name: "Import to Postman",
        steps: [
          "1. Open Postman",
          "2. Import > Link",
          "3. Enter: http://localhost:3000/api-docs.json",
          "4. Click Continue and Import",
        ],
        expected: "✅ Collection imported successfully into Postman",
      },
    ],
  },

  "5. Health Endpoint": {
    description: "Test enhanced health endpoint",
    tests: [
      {
        name: "Health with Docs Enabled",
        steps: [
          "1. Ensure ENABLE_API_DOCS=true",
          "2. Visit http://localhost:3000/health",
          "3. Check response includes 'documentation' field",
          "4. Verify documentation.swagger_ui = '/docs'",
          "5. Verify documentation.openapi_spec = '/api-docs.json'",
        ],
        expected: "✅ Health response includes documentation links",
      },
      {
        name: "Health with Docs Disabled",
        steps: [
          "1. Set ENABLE_API_DOCS=false",
          "2. Restart server",
          "3. Visit http://localhost:3000/health",
          "4. Verify 'documentation' field is NOT present",
        ],
        expected: "✅ Health response excludes documentation links",
      },
    ],
  },

  "6. API Info Endpoint": {
    description: "Test enhanced root endpoint",
    tests: [
      {
        name: "Root with Docs Enabled",
        steps: [
          "1. Ensure ENABLE_API_DOCS=true",
          "2. Visit http://localhost:3000/",
          "3. Check response includes 'documentation' field",
          "4. Verify documentation value = '/docs'",
        ],
        expected: "✅ Root response includes documentation link",
      },
      {
        name: "Root with Docs Disabled",
        steps: [
          "1. Set ENABLE_API_DOCS=false",
          "2. Restart server",
          "3. Visit http://localhost:3000/",
          "4. Verify 'documentation' field is NOT present",
        ],
        expected: "✅ Root response excludes documentation link",
      },
    ],
  },

  "7. Authentication Flow": {
    description: "Test JWT Bearer authentication",
    tests: [
      {
        name: "Without Token",
        steps: [
          "1. In Swagger UI, click 'Authorize'",
          "2. Clear any existing token",
          "3. Click 'Logout'",
          "4. Try finance endpoint",
        ],
        expected: "✅ Should work (JWT middleware not yet implemented)",
        note: "When JWT middleware is added, this should return 401",
      },
      {
        name: "With Token",
        steps: [
          "1. Click 'Authorize'",
          "2. Enter: Bearer your-test-token",
          "3. Click Authorize",
          "4. Execute finance endpoint",
          "5. Check request headers in response",
        ],
        expected: "✅ Authorization header included in request",
      },
    ],
  },

  "8. Validation Testing": {
    description: "Test comprehensive validation",
    tests: [
      {
        name: "Date Validation",
        testCases: [
          { input: "2026-01-01", expected: "✅ Valid" },
          { input: "01-01-2026", expected: "❌ Invalid format" },
          { input: "2026/01/01", expected: "❌ Invalid format" },
          { input: "invalid", expected: "❌ Invalid format" },
          { input: "2027-01-01", expected: "❌ Future date" },
        ],
      },
      {
        name: "Date Range Validation",
        testCases: [
          {
            start: "2026-01-01",
            end: "2026-01-15",
            expected: "✅ Valid range",
          },
          {
            start: "2026-01-15",
            end: "2026-01-01",
            expected: "❌ End before start",
          },
        ],
      },
      {
        name: "Employee Number Validation",
        testCases: [
          { input: "EMP-2024-001", expected: "✅ Valid" },
          { input: "EMP-2025-999", expected: "✅ Valid" },
          { input: "EMP-001", expected: "❌ Invalid format" },
          { input: "2024-001", expected: "❌ Invalid format" },
          { input: "INVALID", expected: "❌ Invalid format" },
        ],
      },
    ],
  },

  "9. Documentation Quality": {
    description: "Verify documentation completeness",
    tests: [
      {
        name: "Endpoint Documentation",
        checks: [
          "✅ Summary is clear and concise",
          "✅ Description provides detailed information",
          "✅ All parameters are documented",
          "✅ Parameter types are correct",
          "✅ Required vs optional is marked",
          "✅ Examples are provided",
          "✅ All response codes documented (200, 400, 401, 403, 500)",
          "✅ Response schemas are complete",
          "✅ Response examples are realistic",
        ],
      },
      {
        name: "Schema Documentation",
        checks: [
          "✅ PayrollIntegrationData schema exists",
          "✅ All fields have descriptions",
          "✅ Data types are correct",
          "✅ Examples are realistic",
        ],
      },
    ],
  },

  "10. Performance & Security": {
    description: "Test performance and security aspects",
    tests: [
      {
        name: "Docs Disabled Performance",
        steps: [
          "1. Set ENABLE_API_DOCS=false",
          "2. Restart server",
          "3. Test /health endpoint response time",
          "4. Test /finance/v2/payroll-integration response time",
          "5. Compare with docs enabled",
        ],
        expected: "✅ No performance difference (routes not registered)",
      },
      {
        name: "Security Headers",
        steps: [
          "1. Enable docs",
          "2. Open browser dev tools",
          "3. Visit /docs",
          "4. Check response headers",
          "5. Verify helmet security headers present",
        ],
        expected: "✅ Security headers present (X-Content-Type-Options, etc.)",
      },
    ],
  },
};

/**
 * CURL Test Commands
 */
export const curlCommands = {
  "Health Check": 'curl http://localhost:3000/health',

  "API Info": 'curl http://localhost:3000/',

  "OpenAPI Spec": 'curl http://localhost:3000/api-docs.json',

  "Finance - Valid Request":
    'curl "http://localhost:3000/finance/v2/payroll-integration?payroll_period_start=2026-01-01&payroll_period_end=2026-01-15&employee_number=EMP-2024-001"',

  "Finance - All Employees":
    'curl "http://localhost:3000/finance/v2/payroll-integration?payroll_period_start=2026-01-01&payroll_period_end=2026-01-15"',

  "Finance - Invalid Date":
    'curl "http://localhost:3000/finance/v2/payroll-integration?payroll_period_start=invalid&payroll_period_end=2026-01-15"',

  "Finance - Missing Parameters":
    'curl "http://localhost:3000/finance/v2/payroll-integration"',

  "Finance - With Auth Header":
    'curl "http://localhost:3000/finance/v2/payroll-integration?payroll_period_start=2026-01-01&payroll_period_end=2026-01-15" -H "Authorization: Bearer test-token"',
};

/**
 * Expected Results Summary
 */
export const expectedResults = {
  "Total Tests": "40+",
  "Required Tests to Pass": "35+",

  "Critical Paths": [
    "✅ Documentation can be enabled/disabled via environment",
    "✅ Swagger UI loads and is interactive",
    "✅ Finance endpoint returns correct data",
    "✅ Validation works for all edge cases",
    "✅ OpenAPI spec is valid and can be imported",
    "✅ No performance impact when disabled",
  ],

  "Known Limitations": [
    "⚠️  JWT middleware not yet implemented (returns data without auth)",
    "⚠️  Finance endpoint uses mock data (needs database integration)",
    "⚠️  Only finance endpoint fully documented (others need JSDoc comments)",
  ],

  "Next Steps After Testing": [
    "1. Implement JWT authentication middleware",
    "2. Integrate finance controller with database",
    "3. Add JSDoc documentation to other endpoints",
    "4. Test with real production data",
    "5. Deploy to staging environment",
    "6. Disable documentation in production",
  ],
};

console.log("Testing checklist loaded. Use this as a guide for manual testing.");
