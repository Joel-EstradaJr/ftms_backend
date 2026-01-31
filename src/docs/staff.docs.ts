/**
 * STAFF ENDPOINTS DOCUMENTATION
 * All endpoints require Staff role authentication
 */

// ============================================================================
// JOURNAL ENTRIES - MIGRATED TO ADMIN NAMESPACE
// ============================================================================
// Staff Journal Entry endpoints have been removed.
// All Journal Entry operations are now under Admin namespace:
// 
// New endpoints at /api/v1/admin/journal-entry:
//   GET    /api/v1/admin/journal-entry          - List all journal entries
//   GET    /api/v1/admin/journal-entry/:id      - Get journal entry by ID
//   PATCH  /api/v1/admin/journal-entry/:id      - Update draft journal entry
//   DELETE /api/v1/admin/journal-entry/:id      - Soft delete draft journal entry
//   POST   /api/v1/admin/journal-entry/auto     - Create auto-generated journal entry
//   POST   /api/v1/admin/journal-entry/adjustment - Create adjustment journal entry
//   POST   /api/v1/admin/journal-entry/reversal - Create reversal journal entry
//   POST   /api/v1/admin/journal-entry/:id/post - Post draft journal entry
// ============================================================================

