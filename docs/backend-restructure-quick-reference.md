# Backend Restructure Quick Reference

## 🚀 New API Endpoints

### Admin Revenue Routes (Production-Ready)
```
GET    /api/admin/revenue              - List all revenues (paginated + filtered)
POST   /api/admin/revenue              - Create new revenue
GET    /api/admin/revenue/[id]         - Get single revenue
PUT    /api/admin/revenue/[id]         - Update revenue (blocked if posted)
DELETE /api/admin/revenue/[id]         - Delete revenue (with safeguards)
GET    /api/admin/revenue/bus-trips    - List available bus trips
POST   /api/admin/revenue/bus-trips    - Create revenue from bus trip
```

### Staff Revenue Routes (Placeholder - Not Implemented)
```
GET    /api/staff/revenue              - HTTP 501 Not Implemented
POST   /api/staff/revenue              - HTTP 501 Not Implemented
GET    /api/staff/revenue/[id]         - HTTP 501 Not Implemented
PUT    /api/staff/revenue/[id]         - HTTP 403 Forbidden
DELETE /api/staff/revenue/[id]         - HTTP 403 Forbidden
```

---

## 📦 Import Paths Reference

### Shared Utilities
```typescript
// OLD: import { getClientIp } from '@/lib/auditLogger';
// NEW:
import { getClientIp, auditLogger } from '@/lib/shared/auditLogger';
import { handleApiError, ApiError, createValidationError } from '@/lib/shared/errorHandler';
import { formatSuccessResponse, formatPaginatedResponse } from '@/lib/shared/responseFormatter';
```

### Admin Revenue Helpers
```typescript
// OLD: import { validateRevenueData } from '@/lib/revenues/validation';
// NEW:
import { validateRevenueData } from '@/lib/admin/revenues/validation';
import { createRevenueFromBusTrip } from '@/lib/admin/revenues/busTripRevenue';
import { createInstallmentSchedule } from '@/lib/admin/revenues/installments';
import { createRevenueJournalEntry } from '@/lib/admin/revenues/journalEntry';
```

### Staff Revenue Helpers (Placeholder)
```typescript
// NOT YET IMPLEMENTED
import { validateStaffAccess } from '@/lib/staff/revenues/helpers';
```

---

## 🗂️ File Locations

### API Routes
```
Admin:  app/api/admin/revenue/
Staff:  app/api/staff/revenue/
```

### Shared Utilities
```
lib/shared/auditLogger.ts           - Audit logging
lib/shared/errorHandler.ts          - Error handling
lib/shared/responseFormatter.ts     - Response formatting
```

### Admin Helpers
```
lib/admin/revenues/validation.ts      - Revenue validation
lib/admin/revenues/busTripRevenue.ts  - Bus trip helpers
lib/admin/revenues/installments.ts    - Installment helpers
lib/admin/revenues/journalEntry.ts    - Journal entry helpers
```

### Staff Helpers
```
lib/staff/revenues/helpers.ts         - Staff helpers (PLACEHOLDER)
```

---

## 🔑 Key Changes Summary

1. **Admin Routes:** Migrated to `app/api/admin/revenue/`
2. **Staff Routes:** Created as placeholders in `app/api/staff/revenue/`
3. **Shared Utilities:** Centralized in `lib/shared/`
4. **Admin Helpers:** Organized in `lib/admin/revenues/`
5. **Old Routes:** Deleted (non-Revenue modules + old Revenue folder)
6. **Import Paths:** Updated to reflect new structure

---

## ✅ Testing Quick Start

### Test Admin Routes
```bash
# List revenues
curl http://localhost:3000/api/admin/revenue?page=1&limit=20

# Get single revenue
curl http://localhost:3000/api/admin/revenue/1

# List bus trips
curl http://localhost:3000/api/admin/revenue/bus-trips
```

### Test Staff Routes (Expect HTTP 501/403)
```bash
# Should return HTTP 501
curl http://localhost:3000/api/staff/revenue

# Should return HTTP 403
curl -X DELETE http://localhost:3000/api/staff/revenue/1
```

---

## 🐛 Troubleshooting

### TypeScript Errors
1. Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Regenerate Prisma client: `npx prisma generate`
3. Clear VS Code cache: Close and reopen VS Code

### Import Path Errors
- Ensure using `@/lib/shared/auditLogger` (not `@/lib/auditLogger`)
- Ensure using `@/lib/admin/revenues/validation` (not `@/lib/revenues/validation`)

### Missing Files
- Verify files exist in new locations using `list_dir` tool
- Check `docs/backend-restructure-COMPLETE.md` for full structure

---

## 📚 Documentation
- **Full Details:** `docs/backend-restructure-COMPLETE.md`
- **API Implementation:** `docs/revenue-api-implementation-summary.md`
- **Helper Functions:** `docs/revenue-helper-functions-COMPLETE.md`

---

**Quick Reference v1.0 - Backend Restructure Complete**
