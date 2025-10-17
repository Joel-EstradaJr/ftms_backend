# Webhook Quick Reference

## Endpoints

### Real-time Updates
```
POST /api/webhooks/data-sync
```

### Bulk Sync
```
POST /api/webhooks/data-sync/bulk-sync
```

### Health Check
```
GET /api/webhooks/data-sync
```

---

## Quick Test (PowerShell)

### 1. Start Dev Server
```powershell
npm run dev
```

### 2. Run Test Script
```powershell
cd docs
.\webhook-test-script.ps1
```

### 3. Or Test Manually
```powershell
# Employee INSERT
$payload = @{
    source = "hr_employees"
    action = "INSERT"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    data = @{
        employeeNumber = "TEST-001"
        firstName = "John"
        lastName = "Smith"
        position = "Driver"
        departmentId = 1
        department = "Operations"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks/data-sync" `
    -Method Post `
    -Body $payload `
    -ContentType "application/json"
```

---

## Payload Templates

### Employee
```json
{
  "source": "hr_employees",
  "action": "INSERT|UPDATE|DELETE",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "employeeNumber": "EMP-0001",
    "firstName": "John",
    "middleName": "Doe",
    "lastName": "Smith",
    "phone": "0999-123-4567",
    "position": "Driver",
    "departmentId": 1,
    "department": "Operations"
  }
}
```

### Payroll
```json
{
  "source": "hr_payroll",
  "action": "INSERT|UPDATE|DELETE",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "employeeNumber": "EMP-0001",
    "firstName": "John",
    "lastName": "Smith",
    "employeeStatus": "ACTIVE",
    "basicRate": "12000.00",
    "position": {
      "positionName": "Driver",
      "department": {
        "departmentName": "Operations"
      }
    },
    "attendances": [
      {"date": "2025-01-15", "status": "PRESENT"}
    ],
    "benefits": [],
    "deductions": []
  }
}
```

### Bus Trip
```json
{
  "source": "op_bus_trips",
  "action": "INSERT|UPDATE|DELETE",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "assignment_id": 1234,
    "bus_trip_id": 5678,
    "bus_route": "Cebu-Manila",
    "is_revenue_recorded": false,
    "is_expense_recorded": false,
    "date_assigned": "2025-01-17",
    "trip_fuel_expense": "5000.00",
    "trip_revenue": "25000.00",
    "assignment_type": "BOUNDARY",
    "assignment_value": "8000.00",
    "payment_method": "CASH",
    "driver_name": "John Smith",
    "conductor_name": "Jane Doe",
    "bus_plate_number": "ABC-1234",
    "bus_type": "REGULAR",
    "body_number": "BUS-001"
  }
}
```

---

## Verify in Database

```sql
-- Check Employee Cache
SELECT * FROM "EmployeeCache" 
WHERE "employeeNumber" = 'TEST-001';

-- Check Payroll Cache
SELECT * FROM "PayrollCache" 
WHERE "employeeNumber" = 'TEST-001';

-- Check Bus Trip Cache
SELECT * FROM "BusTripCache" 
WHERE "assignmentId" = 1234;

-- Check Audit Logs
SELECT * FROM "AuditLog" 
WHERE "module" = 'WEBHOOK' 
ORDER BY "timestamp" DESC 
LIMIT 10;
```

---

## Bulk Sync Example

```powershell
# Fetch from external API
$employees = Invoke-RestMethod -Uri "https://backends-blue.vercel.app/api/clean/hr_employees"

# Bulk sync to local cache
$bulkPayload = @{
    source = "hr_employees"
    clearExisting = $true
    data = $employees
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks/data-sync/bulk-sync" `
    -Method Post `
    -Body $bulkPayload `
    -ContentType "application/json"
```

---

## Cleanup Test Data

```sql
-- Cleanup after testing
DELETE FROM "EmployeeCache" 
WHERE "employeeNumber" LIKE 'TEST-%' 
   OR "employeeNumber" LIKE 'BULK-%';

DELETE FROM "PayrollCache" 
WHERE "employeeNumber" LIKE 'TEST-%' 
   OR "employeeNumber" LIKE 'BULK-%';

DELETE FROM "BusTripCache" 
WHERE "assignmentId" >= 10000;
```

---

## Expected Responses

### Success
```json
{
  "success": true,
  "message": "Cache updated successfully",
  "source": "hr_employees",
  "action": "INSERT",
  "recordId": "EMP-0001",
  "processingTime": "23ms"
}
```

### Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "Missing required field: firstName"
}
```

---

## Common Errors

### Missing Fields
```
Validation failed: Missing required field: firstName
```
**Fix:** Include all required fields in data object

### Invalid Source
```
Unknown source: invalid_source
```
**Fix:** Use hr_employees, hr_payroll, or op_bus_trips

### Invalid Action
```
Invalid action: INVALID_ACTION
```
**Fix:** Use INSERT, UPDATE, or DELETE

### Duplicate Key
```
Unique constraint failed
```
**Fix:** Use UPDATE action instead of INSERT for existing records

---

## Security (Optional)

### 1. Set Secret
```env
WEBHOOK_SECRET=your-secret-key-here
```

### 2. Generate Signature (External System)
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');
```

### 3. Send with Header
```
x-webhook-signature: {signature}
```

---

## Full Documentation

- **Implementation Guide**: `docs/webhook-implementation.md`
- **Test Payloads**: `docs/webhook-test-payloads.http`
- **Test Script**: `docs/webhook-test-script.ps1`

---

## Support

Check audit logs for webhook activity:
```sql
SELECT 
  "userId",
  "action",
  "recordType",
  "description",
  "timestamp"
FROM "AuditLog" 
WHERE "module" = 'WEBHOOK' 
ORDER BY "timestamp" DESC 
LIMIT 20;
```

Console logs show processing time:
```
[Webhook] hr_employees - INSERT - EMP-0021 - 23ms
[Webhook] hr_payroll - UPDATE - EMP-0021 - 45ms
[Bulk Sync] hr_employees - 150 records - 1234ms
```
