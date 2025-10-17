# Revenue API - Quick Testing Guide

## 🚀 Quick Start

### Prerequisites
1. ✅ Prisma client regenerated (`npx prisma generate` - already done)
2. ✅ Database migrated with Revenue model
3. ✅ Revenue sources seeded (BUS_TRIP, RENTAL, etc.)
4. ✅ Payment methods seeded (CASH, BANK_TRANSFER, etc.)
5. Development server running (`npm run dev`)

---

## 📡 API Endpoints Quick Reference

### Base URL: `http://localhost:3000/api`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/revenue` | List revenues (paginated, filterable) |
| POST | `/revenue` | Create new revenue |
| GET | `/revenue/{id}` | Get single revenue with all details |
| PUT | `/revenue/{id}` | Update revenue |
| DELETE | `/revenue/{id}` | Delete revenue |
| GET | `/revenue/bus-trips` | List available bus trips |
| POST | `/revenue/bus-trips` | Create revenue from bus trip |

---

## 🧪 Test Scenarios

### Scenario 1: Create Basic Revenue ✅

**Request:**
```http
POST /api/revenue
Content-Type: application/json

{
  "sourceId": 1,
  "description": "Miscellaneous income from office rental",
  "amount": 5000.00,
  "transactionDate": "2025-10-17T08:00:00Z",
  "paymentMethodId": 1,
  "createdBy": "admin@example.com"
}
```

**Expected Response (201):**
```json
{
  "message": "Revenue created successfully",
  "revenue": {
    "id": 1,
    "revenueCode": "clxxx...",
    "sourceId": 1,
    "source": {
      "id": 1,
      "sourceCode": "MISC",
      "name": "Miscellaneous"
    },
    "description": "Miscellaneous income from office rental",
    "amount": "5000.00",
    "transactionDate": "2025-10-17T08:00:00.000Z",
    "paymentMethodId": 1,
    "paymentMethod": {
      "id": 1,
      "methodCode": "CASH",
      "methodName": "Cash"
    },
    "createdBy": "admin@example.com",
    "createdAt": "2025-10-17T...",
    ...
  }
}
```

---

### Scenario 2: Create Revenue with Accounts Receivable ✅

**Request:**
```http
POST /api/revenue
Content-Type: application/json

{
  "sourceId": 2,
  "description": "Equipment rental - ABC Company",
  "amount": 15000.00,
  "transactionDate": "2025-10-17T08:00:00Z",
  "paymentMethodId": 2,
  "isAccountsReceivable": true,
  "arDueDate": "2025-11-30T23:59:59Z",
  "arStatus": "PENDING",
  "externalRefType": "RENTAL",
  "externalRefId": "RENT-2025-001",
  "createdBy": "finance@example.com"
}
```

**Expected Response (201):**
```json
{
  "message": "Revenue created successfully",
  "revenue": {
    "id": 2,
    "revenueCode": "clxxx...",
    "amount": "15000.00",
    "isAccountsReceivable": true,
    "arDueDate": "2025-11-30T23:59:59.000Z",
    "arStatus": "PENDING",
    "externalRefType": "RENTAL",
    "externalRefId": "RENT-2025-001",
    ...
  }
}
```

---

### Scenario 3: Create Revenue with Installment Plan ✅

**Request:**
```http
POST /api/revenue
Content-Type: application/json

{
  "sourceId": 3,
  "description": "Vehicle disposal - installment payment",
  "amount": 120000.00,
  "transactionDate": "2025-10-17T08:00:00Z",
  "paymentMethodId": 1,
  "isInstallment": true,
  "installmentSchedule": {
    "numberOfPayments": 12,
    "paymentAmount": 10000.00,
    "frequency": "MONTHLY",
    "startDate": "2025-11-01T00:00:00Z",
    "interestRate": 0
  },
  "externalRefType": "DISPOSAL",
  "externalRefId": "DISP-2025-BUS-042",
  "createdBy": "admin@example.com"
}
```

**Expected Response (201):**
```json
{
  "message": "Revenue created successfully",
  "revenue": {
    "id": 3,
    "amount": "120000.00",
    "isInstallment": true,
    "installmentScheduleId": 1,
    "installmentSchedule": {
      "id": 1,
      "scheduleCode": "clxxx...",
      "type": "REVENUE",
      "totalAmount": "120000.00",
      "numberOfPayments": 12,
      "paymentAmount": "10000.00",
      "frequency": "MONTHLY",
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2026-10-31T00:00:00.000Z",
      "status": "ACTIVE"
    },
    ...
  }
}
```

---

### Scenario 4: Create Revenue from Bus Trip ✅

**Step 1: Get available bus trips**
```http
GET /api/revenue/bus-trips?limit=10
```

**Response:**
```json
{
  "busTrips": [
    {
      "id": 1,
      "assignmentId": "ASN-2025-001",
      "busTripId": "BT-001",
      "busRoute": "Manila - Baguio",
      "dateAssigned": "2025-10-17T06:00:00.000Z",
      "tripRevenue": "8500.00",
      "tripFuelExpense": "2500.00",
      "assignmentType": "Boundary",
      "driverName": "Juan Dela Cruz",
      "busPlateNumber": "ABC-1234",
      "isRevenueRecorded": false
    }
  ],
  "count": 1
}
```

**Step 2: Create revenue from selected bus trip**
```http
POST /api/revenue/bus-trips
Content-Type: application/json

{
  "busTripCacheId": 1,
  "userId": "admin@example.com",
  "remarks": "Bus trip revenue for ASN-2025-001"
}
```

**Expected Response (201):**
```json
{
  "message": "Revenue created from bus trip successfully",
  "revenue": {
    "id": 4,
    "revenueCode": "clxxx...",
    "description": "Bus Trip Revenue - Manila - Baguio on 10/17/2025",
    "amount": "8500.00",
    "transactionDate": "2025-10-17T06:00:00.000Z",
    "busTripCacheId": 1,
    "externalRefType": "BUS_TRIP",
    "externalRefId": "ASN-2025-001",
    "busTripCache": {
      "assignmentId": "ASN-2025-001",
      "busRoute": "Manila - Baguio",
      "isRevenueRecorded": true
    },
    ...
  }
}
```

---

### Scenario 5: List Revenues with Filters ✅

**Request:**
```http
GET /api/revenue?page=1&limit=20&sourceId=1&isAccountsReceivable=true&arStatus=PENDING&startDate=2025-10-01&endDate=2025-10-31&sort=desc
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": 2,
      "revenueCode": "clxxx...",
      "amount": "15000.00",
      "transactionDate": "2025-10-17T...",
      "source": { "name": "Rental Income" },
      "isAccountsReceivable": true,
      "arStatus": "PENDING",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

---

### Scenario 6: Get Single Revenue with All Details ✅

**Request:**
```http
GET /api/revenue/1
```

**Expected Response (200):**
```json
{
  "revenue": {
    "id": 1,
    "revenueCode": "clxxx...",
    "source": { ... },
    "paymentMethod": { ... },
    "busTripCache": null,
    "loanPayment": null,
    "accountsReceivable": null,
    "installmentSchedule": null,
    "journalEntry": null,
    "auditLogs": [
      {
        "id": 1,
        "action": "CREATE",
        "module": "REVENUE",
        "userName": "admin@example.com",
        "description": "Created revenue: clxxx...",
        "timestamp": "2025-10-17T..."
      }
    ]
  }
}
```

---

### Scenario 7: Update Revenue ✅

**Request:**
```http
PUT /api/revenue/1
Content-Type: application/json

{
  "sourceId": 1,
  "description": "Updated: Miscellaneous income from office rental",
  "amount": 5500.00,
  "paymentMethodId": 1,
  "createdBy": "admin@example.com"
}
```

**Expected Response (200):**
```json
{
  "message": "Revenue updated successfully",
  "revenue": {
    "id": 1,
    "description": "Updated: Miscellaneous income from office rental",
    "amount": "5500.00",
    "updatedAt": "2025-10-17T...",
    ...
  }
}
```

---

### Scenario 8: Delete Revenue ✅

**Request:**
```http
DELETE /api/revenue/1?userId=admin@example.com
```

**Expected Response (200):**
```json
{
  "message": "Revenue deleted successfully",
  "deletedRevenueCode": "clxxx..."
}
```

---

## ❌ Error Scenarios

### Error 1: Validation Failure (400)
```http
POST /api/revenue
Content-Type: application/json

{
  "sourceId": 999,
  "description": "Test",
  "amount": -100,
  "paymentMethodId": 1,
  "createdBy": "admin@example.com"
}
```

**Response (400):**
```json
{
  "error": "Validation failed",
  "validationErrors": [
    "Revenue source not found",
    "Amount must be greater than 0"
  ]
}
```

---

### Error 2: Resource Not Found (404)
```http
GET /api/revenue/99999
```

**Response (404):**
```json
{
  "error": "Revenue not found"
}
```

---

### Error 3: Cannot Edit Posted Revenue (400)
```http
PUT /api/revenue/5
Content-Type: application/json

{ "amount": 1000, ... }
```

**Response (400):**
```json
{
  "error": "Cannot edit posted revenue",
  "details": "This revenue has been posted to the General Ledger and cannot be modified. Please create a reversal entry instead."
}
```

---

### Error 4: Duplicate Bus Trip Revenue (400)
```http
POST /api/revenue/bus-trips
Content-Type: application/json

{
  "busTripCacheId": 1,
  "userId": "admin@example.com"
}
```

**Response (400):**
```json
{
  "error": "Revenue already recorded for this bus trip"
}
```

---

## 🔍 Testing Checklist

### Basic Operations
- [ ] Create basic revenue (no AR, no installment)
- [ ] List revenues (no filters)
- [ ] List revenues with pagination
- [ ] List revenues with filters (sourceId, dates, AR status)
- [ ] Search revenues by revenueCode
- [ ] Search revenues by description
- [ ] Get single revenue by ID
- [ ] Update revenue
- [ ] Delete revenue

### Revenue Types
- [ ] Create BUS_TRIP revenue via main endpoint
- [ ] Create BUS_TRIP revenue via bus-trips endpoint
- [ ] Create RENTAL revenue
- [ ] Create DISPOSAL revenue
- [ ] Create LOAN_REPAYMENT revenue
- [ ] Create FORFEITED_DEPOSIT revenue
- [ ] Create RENTER_DAMAGE revenue

### Advanced Features
- [ ] Create revenue with AR (due date, status)
- [ ] Create revenue with installment plan
- [ ] Create revenue with both AR and installment
- [ ] Update AR status (PENDING → PARTIAL → PAID)
- [ ] List revenues by AR status

### Business Rules
- [ ] Cannot create revenue for bus trip that already has revenue
- [ ] Cannot edit posted revenue
- [ ] Cannot delete posted revenue
- [ ] Cannot delete revenue with installment payments
- [ ] Amount must match bus trip revenue (for BUS_TRIP type)
- [ ] AR due date must be after transaction date
- [ ] Installment total must match revenue amount

### Audit Trail
- [ ] CREATE action logged
- [ ] UPDATE action logged with before/after data
- [ ] DELETE action logged with before data
- [ ] Audit logs include IP address
- [ ] Audit logs include user info

### Bus Trip Integration
- [ ] List available bus trips
- [ ] Filter bus trips by assignment type
- [ ] Filter bus trips by date range
- [ ] Create revenue from bus trip
- [ ] Bus trip flag updated after revenue creation
- [ ] Bus trip flag reset after revenue deletion

---

## 🐛 Troubleshooting

### Issue: TypeScript errors in editor
**Solution**: Restart TypeScript server
```
Ctrl+Shift+P → TypeScript: Restart TS Server
```

### Issue: "Revenue source not found"
**Solution**: Run seeder to populate revenue sources
```powershell
npx tsx prisma/seed_globals.ts
```

### Issue: "Property 'revenue' does not exist on PrismaClient"
**Solution**: Regenerate Prisma client
```powershell
npx prisma generate
```

### Issue: Database connection error
**Solution**: Check .env file and database credentials
```env
DATABASE_URL="postgresql://user:password@localhost:5432/rev_ftms_db"
```

---

## 📊 Expected Database State After Tests

After running all test scenarios successfully, your database should have:

- ✅ 4+ revenue records
- ✅ 1+ installment schedule
- ✅ Multiple audit log entries
- ✅ Bus trip cache records with `isRevenueRecorded = true`
- ✅ Revenue sources with records (e.g., BUS_TRIP, RENTAL, DISPOSAL)
- ✅ Payment methods with records (e.g., CASH, BANK_TRANSFER)

---

## 🎯 Next Actions

1. ✅ **Run these test scenarios** using Postman, Thunder Client, or curl
2. ✅ **Verify audit logs** are being created properly
3. ✅ **Check database** to ensure data integrity
4. 🔄 **Fix any validation errors** in validation.ts (documented in action plan)
5. 🔄 **Start Phase 2** - Frontend UI implementation

---

## 📚 Related Documentation

- **Implementation Summary**: `docs/revenue-api-implementation-summary.md`
- **Complete Action Plan**: `docs/revenue-action-plan.md`
- **API Route Code**: 
  - `app/api/revenue/route.ts`
  - `app/api/revenue/[id]/route.ts`
  - `app/api/revenue/bus-trips/route.ts`

---

**Happy Testing!** 🚀

If you encounter any issues not covered here, check the error message details in the response body - they're designed to be descriptive and actionable.
