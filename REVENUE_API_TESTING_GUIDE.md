# Revenue API Testing Guide

## 🚀 Quick Start

The Express server is running at: **http://localhost:3000**

## 📋 Prerequisites

1. Server is running: `npm run dev`
2. Database connected: PostgreSQL at `localhost:5432/final_schema`
3. JWT token required for all endpoints (from HR Auth microservice)

## 🔑 Authentication

All revenue endpoints require authentication:
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Role required: `admin`

### Get JWT Token (from HR Auth)
```bash
# Login to HR Auth service (http://localhost:3002)
# Use your admin credentials
# Copy the JWT token from response
```

## 📍 API Endpoints

### 1. Health Check (No Auth Required)
```bash
curl http://localhost:3000/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T12:52:48.283Z",
  "uptime": 7.3,
  "environment": "development"
}
```

### 2. List Revenues
```bash
curl -X GET "http://localhost:3000/api/admin/revenue?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters (All Optional):**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `revenueType` - Filter by: `TRIP`, `RENTAL`, `OTHER`
- `department` - Filter by department name
- `startDate` - Start date (ISO format)
- `endDate` - End date (ISO format)
- `minAmount` - Minimum amount
- `maxAmount` - Maximum amount
- `sourceRefNo` - Filter by source reference
- `isVerified` - Filter by verification status (true/false)
- `isDeleted` - Include deleted records (true/false, default: false)
- `search` - Search in code, remarks, sourceRefNo
- `sortBy` - Sort field: `code`, `amount`, `dateRecorded`, `createdAt` (default: `dateRecorded`)
- `sortOrder` - Sort direction: `asc`, `desc` (default: `desc`)

**Example with Filters:**
```bash
curl -X GET "http://localhost:3000/api/admin/revenue?revenueType=TRIP&startDate=2025-01-01&endDate=2025-12-31&minAmount=1000&sortBy=amount&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "REV-20251022-0001",
      "revenueType": "TRIP",
      "amount": "15000.00",
      "dateRecorded": "2025-10-22T00:00:00.000Z",
      "remarks": "Trip revenue from Route 1",
      "sourceRefNo": "TRIP-001",
      "department": "Operations",
      "createdBy": "user123",
      "createdAt": "2025-10-22T12:00:00.000Z",
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

### 3. Create Revenue (TRIP)
```bash
curl -X POST "http://localhost:3000/api/admin/revenue" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "revenueType": "TRIP",
    "amount": 15000,
    "dateRecorded": "2025-10-22",
    "remarks": "Trip revenue from Route 1",
    "sourceRefNo": "TRIP-001",
    "department": "Operations"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "code": "REV-20251022-0001",
  "revenueType": "TRIP",
  "amount": "15000.00",
  "dateRecorded": "2025-10-22T00:00:00.000Z",
  "remarks": "Trip revenue from Route 1",
  "sourceRefNo": "TRIP-001",
  "department": "Operations",
  "isVerified": false,
  "isDeleted": false,
  "createdBy": "user123",
  "createdAt": "2025-10-22T12:00:00.000Z",
  "updatedAt": "2025-10-22T12:00:00.000Z",
  ...
}
```

### 4. Create Revenue (RENTAL)
```bash
curl -X POST "http://localhost:3000/api/admin/revenue" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "revenueType": "RENTAL",
    "amount": 50000,
    "dateRecorded": "2025-10-22",
    "remarks": "Bus rental for company event",
    "sourceRefNo": "RENTAL-001",
    "department": "Operations",
    "rentalDownpayment": 20000,
    "rentalBalance": 30000,
    "downpaymentReceivedAt": "2025-10-22",
    "isDownpaymentRefundable": true
  }'
```

**Validation:**
- Downpayment + Balance must equal Amount
- If validation fails: HTTP 400 Bad Request

### 5. Create Revenue (OTHER)
```bash
curl -X POST "http://localhost:3000/api/admin/revenue" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "revenueType": "OTHER",
    "amount": 8000,
    "dateRecorded": "2025-10-22",
    "remarks": "Sale of old equipment",
    "department": "Finance",
    "otherRevenueCategory": "asset_sale",
    "receiptUrl": "https://example.com/receipt.pdf"
  }'
```

### 6. Get Revenue by ID
```bash
curl -X GET "http://localhost:3000/api/admin/revenue/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:** (Same structure as create response)

**Error Cases:**
- HTTP 404 if ID not found
- HTTP 401 if token invalid/missing
- HTTP 403 if not admin role

### 7. Update Revenue
```bash
curl -X PUT "http://localhost:3000/api/admin/revenue/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remarks": "Updated remarks",
    "isVerified": true
  }'
```

**Notes:**
- Cannot update if already approved
- Cannot update if deleted
- Only provided fields will be updated

**Expected Response:** (Updated revenue object)

### 8. Delete Revenue (Soft Delete)
```bash
curl -X DELETE "http://localhost:3000/api/admin/revenue/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Notes:**
- Soft delete only (sets `isDeleted = true`, `deletedAt`, `deletedBy`)
- Cannot delete if already approved
- Cannot delete if already deleted

**Expected Response:**
```json
{
  "id": 1,
  "code": "REV-20251022-0001",
  "isDeleted": true,
  "deletedBy": "user123",
  "deletedAt": "2025-10-22T12:30:00.000Z",
  ...
}
```

## 🧪 Testing Scenarios

### Scenario 1: Create Trip Revenue
1. POST revenue with `revenueType: TRIP`
2. Verify `code` is auto-generated (REV-YYYYMMDD-NNNN)
3. GET the revenue to confirm creation
4. Check audit logs (if audit service is running)

### Scenario 2: Rental Revenue with Validation
1. POST rental with downpayment + balance = amount ✅
2. POST rental with downpayment + balance ≠ amount ❌ (should fail)
3. Verify error message is clear

### Scenario 3: Update and Soft Delete
1. POST new revenue
2. PUT to update remarks
3. DELETE to soft delete
4. GET should still return it (if `isDeleted=true` in query)
5. Verify cannot update after deletion

### Scenario 4: Pagination and Filtering
1. Create 25 revenues
2. GET with `limit=10` (should return page 1)
3. GET with `page=2&limit=10` (should return page 2)
4. GET with `revenueType=TRIP` (should filter)
5. GET with `search=REV-20251022` (should search)

### Scenario 5: Approval Workflow (Future)
1. POST new revenue
2. Admin approves (future endpoint)
3. Attempt to update ❌ (should fail)
4. Attempt to delete ❌ (should fail)

## ⚠️ Common Errors

### 401 Unauthorized
```json
{
  "error": "No token provided" 
}
```
**Fix:** Add `Authorization: Bearer <token>` header

### 403 Forbidden
```json
{
  "error": "Insufficient permissions. Required roles: admin"
}
```
**Fix:** Use admin account for JWT token

### 400 Bad Request
```json
{
  "error": "Amount must be greater than 0"
}
```
**Fix:** Validate input data before sending

### 404 Not Found
```json
{
  "error": "Revenue not found"
}
```
**Fix:** Verify revenue ID exists

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```
**Fix:** Check server logs in terminal

## 📊 Database Verification

### Check Created Revenue Directly in DB
```sql
-- Connect to PostgreSQL
psql -U postgres -d final_schema

-- List all revenues
SELECT id, code, "revenueType", amount, "dateRecorded", "isDeleted"
FROM "Revenue"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check audit fields
SELECT id, code, "createdBy", "createdAt", "updatedBy", "updatedAt", 
       "approvedBy", "approvedAt", "deletedBy", "deletedAt"
FROM "Revenue"
WHERE id = 1;

-- Count by type
SELECT "revenueType", COUNT(*), SUM(amount) as total
FROM "Revenue"
WHERE "isDeleted" = false
GROUP BY "revenueType";
```

## 🔍 Debugging Tips

### 1. Check Server Logs
The terminal running `npm run dev` shows:
- All HTTP requests (Morgan logging)
- Database queries (if enabled)
- Error stack traces
- Audit log attempts

### 2. Check Audit Logs
If audit service is running (http://localhost:4004):
```bash
curl "http://localhost:4004/api/audit-logs?moduleName=REVENUE&limit=20"
```

### 3. Inspect JWT Token
Visit https://jwt.io and paste your token to see:
- User ID
- Roles
- Expiry time

### 4. Test Without Auth (Should Fail)
```bash
curl -X GET "http://localhost:3000/api/admin/revenue"
# Should return 401 Unauthorized
```

## 📝 Notes

### Revenue Code Format
- Automatically generated
- Format: `REV-YYYYMMDD-NNNN`
- Example: `REV-20251022-0001`
- Sequence resets daily

### Date Formats
- Input: ISO 8601 (YYYY-MM-DD or full ISO)
- Output: ISO 8601 with time (YYYY-MM-DDTHH:mm:ss.sssZ)

### Decimal Precision
- Amount stored as: Decimal(12, 2)
- Supports up to: 9,999,999,999.99
- Returns as string in JSON to preserve precision

### Soft Delete Behavior
- `isDeleted = true` means record is deleted
- Record still exists in database
- Can be restored by setting `isDeleted = false`
- Default queries exclude deleted records

## 🎯 Success Criteria

✅ **API is working if:**
1. Health check returns 200 OK
2. Can create revenue with valid JWT
3. Revenue code is auto-generated
4. Pagination works correctly
5. Filters return correct results
6. Update works (before approval)
7. Soft delete works
8. Cannot edit/delete approved revenue
9. Audit logs are created (if service running)
10. Validation errors are clear

## 🚀 Next Steps After Testing

1. **If all tests pass:**
   - Delete old Next.js routes (`app/api/admin/revenue/`)
   - Proceed with Expense service migration
   
2. **If issues found:**
   - Check server logs for errors
   - Verify database schema matches
   - Confirm JWT token is valid
   - Test with Postman/Insomnia for detailed errors

---

**Ready to test?** Start with the health check, then try creating your first revenue! 🎉
