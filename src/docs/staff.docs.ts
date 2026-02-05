/**
 * STAFF ENDPOINTS DOCUMENTATION
 * 
 * Staff endpoints provide FULL FEATURE PARITY with Admin endpoints.
 * The staff-side uses identical business logic, database operations,
 * audit logging, and journal entry creation as the admin side.
 * 
 * This is intentional - staff performs the same operations as admin.
 * Role-based access control will be implemented separately.
 */

// ============================================================================
// STAFF REVENUE MODULES
// ============================================================================
// 
// All revenue modules have full CRUD operations, identical to admin:
//
// BUS TRIP REVENUE - /api/v1/staff/bus-trip-revenue
//   GET    /                        - List all bus trip revenues with filters
//   POST   /                        - Record new bus trip revenue
//   GET    /:id                     - Get bus trip revenue details
//   PATCH  /:id                     - Update bus trip revenue
//   DELETE /:id                     - Soft delete bus trip revenue
//   GET    /unsynced                - List unsynced trips from external system
//   POST   /process-unsynced        - Process all unsynced trips
//   POST   /receivable-payment      - Record receivable payment
//   GET    /config                  - Get system configuration
//   PUT    /config                  - Update system configuration
//   POST   /trigger-status-check    - Manually trigger revenue status check
//
// RENTAL REVENUE - /api/v1/staff/rental-revenue
//   GET    /                        - List all rental revenues with filters
//   POST   /                        - Record new rental revenue
//   GET    /:id                     - Get rental revenue details
//   PATCH  /:id                     - Update rental revenue
//   DELETE /:id                     - Soft delete rental revenue
//   GET    /analytics               - Get rental revenue analytics
//   GET    /unrecorded              - Get unrecorded rentals
//   POST   /:id/pay-balance         - Pay balance for rental
//   POST   /:id/cancel              - Cancel rental
//
// OTHER REVENUE - /api/v1/staff/other-revenue
//   GET    /                        - List other revenue records
//   POST   /                        - Create other revenue record
//   GET    /:id                     - Get other revenue details
//   PATCH  /:id                     - Update other revenue record
//   DELETE /:id                     - Soft delete other revenue record
//   GET    /types                   - Get other revenue types
//   GET    /departments             - Get departments for dropdown
//   GET    /schedule-frequencies    - Get schedule frequency options
//   POST   /payment                 - Record payment for installment
//   PATCH  /:id/approve             - Approve other revenue
//   PATCH  /:id/reject              - Reject other revenue
//
// ============================================================================

// ============================================================================
// STAFF EXPENSE MODULES
// ============================================================================
//
// All expense modules have full CRUD operations, identical to admin:
//
// OPERATIONAL EXPENSES - /api/v1/staff/operational-expenses
//   GET    /                        - List operational expenses with filters
//   POST   /                        - Create operational expense
//   GET    /:id                     - Get operational expense details
//   PATCH  /:id                     - Update operational expense
//   DELETE /:id                     - Soft delete operational expense
//   PATCH  /:id/approve             - Approve operational expense
//   PATCH  /:id/reject              - Reject operational expense
//   GET    /expense-types           - Get expense types for dropdown
//   GET    /payment-methods         - Get payment methods for dropdown
//   GET    /employees               - Get employees for reimbursement selection
//   GET    /operational-trips       - Get bus trips for expense recording
//   GET    /rental-trips            - Get rental trips for expense recording
//
// OTHER EXPENSE (Administrative) - /api/v1/staff/other-expense
//   GET    /                        - List administrative expenses with filters
//   POST   /                        - Create administrative expense
//   GET    /:id                     - Get administrative expense details
//   PATCH  /:id                     - Update administrative expense
//   DELETE /:id                     - Soft delete administrative expense
//   PATCH  /:id/approve             - Approve administrative expense
//   PATCH  /:id/reject              - Reject administrative expense
//   GET    /expense-types           - Get admin expense types for dropdown
//   GET    /payment-methods         - Get payment methods for dropdown
//   GET    /vendors                 - Get vendors for dropdown
//   GET    /schedule-frequencies    - Get schedule frequencies for installments
//
// ============================================================================

// ============================================================================
// STAFF DASHBOARD MODULE
// ============================================================================
//
// DASHBOARD - /api/v1/staff/dashboard
//   GET    /summary                 - Get dashboard summary data
//   GET    /forecast-data           - Get forecast data for predictive analytics
//
// ============================================================================

// ============================================================================
// JOURNAL ENTRIES - SHARED WITH ADMIN
// ============================================================================
// Staff and Admin share the same Journal Entry endpoints:
// 
// Endpoints at /api/v1/admin/journal-entry:
//   GET    /api/v1/admin/journal-entry          - List all journal entries
//   GET    /api/v1/admin/journal-entry/:id      - Get journal entry by ID
//   PATCH  /api/v1/admin/journal-entry/:id      - Update draft journal entry
//   DELETE /api/v1/admin/journal-entry/:id      - Soft delete draft journal entry
//   POST   /api/v1/admin/journal-entry/auto     - Create auto-generated journal entry
//   POST   /api/v1/admin/journal-entry/adjustment - Create adjustment journal entry
//   POST   /api/v1/admin/journal-entry/reversal - Create reversal journal entry
//   POST   /api/v1/admin/journal-entry/:id/post - Post draft journal entry
// ============================================================================

// ============================================================================
// FEATURE PARITY NOTES
// ============================================================================
//
// Staff endpoints implement the EXACT SAME:
// - Business logic (same services and controllers as admin)
// - Database operations (same Prisma queries)
// - Audit logging (all actions logged via AuditLogClient)
// - Journal entry creation (same JournalEntryAutoService)
// - COA mapping (same account code mappings)
// - Validation rules (same input validation)
// - Response formats (same API contracts)
//
// The only differences are:
// - Route namespace: /api/v1/staff/* instead of /api/v1/admin/*
// - Swagger tags: "Staff | ..." instead of "Admin | ..."
//
// Role-based access control (RBAC) will be implemented separately
// and is NOT part of this parity implementation.
// ============================================================================
