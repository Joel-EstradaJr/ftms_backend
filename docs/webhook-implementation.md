# Webhook Implementation Guide

## Overview

This document describes the webhook-based cache update system that replaces the inefficient 5-minute polling mechanism. The system receives real-time updates from external External Systems (HR, Operations, Inventory) systems.

---

## Architecture

### External Systems
1. **HR Employees API**: `https://backends-blue.vercel.app/api/clean/hr_employees`
2. **HR Payroll API**: `https://backends-blue.vercel.app/api/clean/hr_payroll`
3. **Operations Bus Trips API**: `https://backends-blue.vercel.app/api/clean/op_bus-trip-details`

### Webhook Endpoints
- **Real-time Updates**: `POST /api/webhooks/data-sync`
- **Bulk Sync**: `POST /api/webhooks/data-sync/bulk-sync`
- **Health Check**: `GET /api/webhooks/data-sync`

### Cache Tables (Prisma)
- `EmployeeCache` - Employee master data
- `PayrollCache` - Payroll records with nested benefits/deductions
- `BusTripCache` - Bus trip assignments and revenue/expense tracking

---

## Webhook Payload Structure

### Standard Webhook Format
```json
{
  "source": "hr_employees | hr_payroll | op_bus_trips",
  "action": "INSERT | UPDATE | DELETE",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": { /* Record data matching external API structure */ }
}
```

### Optional Security Header
```
x-webhook-signature: HMAC-SHA256 signature (if WEBHOOK_SECRET is configured)
```

---

## Supported Operations

### 1. HR Employees (`hr_employees`)

**INSERT/UPDATE Example:**
```json
{
  "source": "hr_employees",
  "action": "INSERT",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "employeeNumber": "EMP-0021",
    "firstName": "John",
    "middleName": "Doe",
    "lastName": "Smith",
    "phone": "0999-999-9999",
    "position": "Driver",
    "departmentId": 1,
    "department": "Operations"
  }
}
```

**DELETE Example:**
```json
{
  "source": "hr_employees",
  "action": "DELETE",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "employeeNumber": "EMP-0021"
  }
}
```

---

### 2. HR Payroll (`hr_payroll`)

**INSERT/UPDATE Example:**
```json
{
  "source": "hr_payroll",
  "action": "INSERT",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "employeeNumber": "EMP-0021",
    "firstName": "John",
    "middleName": "Doe",
    "lastName": "Smith",
    "suffix": null,
    "employeeStatus": "ACTIVE",
    "hiredate": "2024-01-15",
    "terminationDate": null,
    "basicRate": "12000.00",
    "position": {
      "positionName": "Driver",
      "department": {
        "departmentName": "Operations"
      }
    },
    "attendances": [
      {
        "date": "2025-01-15",
        "status": "PRESENT"
      }
    ],
    "benefits": [
      {
        "value": "2000.00",
        "frequency": "MONTHLY",
        "effectiveDate": "2024-01-15",
        "endDate": null,
        "isActive": true,
        "benefitType": {
          "name": "Transportation Allowance"
        }
      }
    ],
    "deductions": [
      {
        "type": "LOAN",
        "value": "500.00",
        "frequency": "MONTHLY",
        "effectiveDate": "2024-02-01",
        "endDate": null,
        "isActive": true,
        "deductionType": {
          "name": "Company Loan"
        }
      }
    ]
  }
}
```

**DELETE Example:**
```json
{
  "source": "hr_payroll",
  "action": "DELETE",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "employeeNumber": "EMP-0021"
  }
}
```

---

### 3. Operations Bus Trips (`op_bus_trips`)

**INSERT/UPDATE Example:**
```json
{
  "source": "op_bus_trips",
  "action": "INSERT",
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

**DELETE Example:**
```json
{
  "source": "op_bus_trips",
  "action": "DELETE",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "assignment_id": 1234
  }
}
```

---

## Bulk Sync Endpoint

### Purpose
Used for **initial cache population** or **full re-sync** when webhook history is lost or unreliable.

### Payload Structure
```json
{
  "source": "hr_employees | hr_payroll | op_bus_trips",
  "data": [
    { /* Record 1 */ },
    { /* Record 2 */ },
    { /* Record N */ }
  ],
  "clearExisting": false
}
```

### Example: Bulk Sync Employees
```bash
curl -X POST http://localhost:3000/api/webhooks/data-sync/bulk-sync \
  -H "Content-Type: application/json" \
  -d '{
    "source": "hr_employees",
    "clearExisting": true,
    "data": [
      {
        "employeeNumber": "EMP-0001",
        "firstName": "John",
        "lastName": "Smith",
        "position": "Driver",
        "departmentId": 1,
        "department": "Operations"
      },
      {
        "employeeNumber": "EMP-0002",
        "firstName": "Jane",
        "lastName": "Doe",
        "position": "Conductor",
        "departmentId": 1,
        "department": "Operations"
      }
    ]
  }'
```

### Response
```json
{
  "success": true,
  "message": "hr_employees bulk sync completed",
  "processed": 2,
  "created": 2,
  "updated": 0,
  "failed": 0,
  "errors": [],
  "processingTime": "45ms"
}
```

---

## Security (Optional)

### Webhook Signature Verification

#### 1. Set Environment Variable
```env
WEBHOOK_SECRET=your-secret-key-here
```

#### 2. External System Generates Signature
```javascript
// Node.js example
const crypto = require('crypto');

const payload = JSON.stringify({
  source: 'hr_employees',
  action: 'INSERT',
  data: { /* ... */ }
});

const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

// Send with header: x-webhook-signature: {signature}
```

#### 3. Our Endpoint Validates
```javascript
// Automatic validation in webhook endpoint
// Returns 401 if signature is invalid
```

---

## External System Configuration

### Requirements for External Systems

1. **POST to Webhook Endpoint**
   ```
   POST https://your-domain.com/api/webhooks/data-sync
   Content-Type: application/json
   x-webhook-signature: {optional-hmac-sha256}
   ```

2. **Trigger Webhook on Data Changes**
   - INSERT: New record created
   - UPDATE: Existing record modified
   - DELETE: Record deleted

3. **Retry Logic (Recommended)**
   - Retry on 5xx errors (3-5 attempts)
   - Exponential backoff (1s, 2s, 4s, 8s)
   - Log failed webhooks for manual review

4. **Payload Format**
   - Match existing API structure exactly
   - Use ISO 8601 timestamps
   - Include all required fields

---

## Testing

### Test Files
- `docs/webhook-test-payloads.http` - HTTP test file for VS Code REST Client
- `docs/webhook-test-script.ps1` - PowerShell test script

### Manual Testing with Postman/Thunder Client

**Example: Test Employee INSERT**
```http
POST http://localhost:3000/api/webhooks/data-sync
Content-Type: application/json

{
  "source": "hr_employees",
  "action": "INSERT",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "employeeNumber": "TEST-001",
    "firstName": "Test",
    "lastName": "Employee",
    "position": "Driver",
    "departmentId": 1,
    "department": "Operations"
  }
}
```

### Verify in Database
```sql
-- Check EmployeeCache
SELECT * FROM "EmployeeCache" WHERE "employeeNumber" = 'TEST-001';

-- Check PayrollCache
SELECT * FROM "PayrollCache" WHERE "employeeNumber" = 'TEST-001';

-- Check BusTripCache
SELECT * FROM "BusTripCache" WHERE "assignmentId" = 1234;

-- Check Audit Logs
SELECT * FROM "AuditLog" 
WHERE "module" = 'WEBHOOK' 
ORDER BY "timestamp" DESC 
LIMIT 10;
```

---

## Monitoring

### Health Check
```bash
curl http://localhost:3000/api/webhooks/data-sync
```

### Response
```json
{
  "service": "External Data Webhook Receiver",
  "version": "1.0.0",
  "status": "operational",
  "supportedSources": ["hr_employees", "hr_payroll", "op_bus_trips"],
  "supportedActions": ["INSERT", "UPDATE", "DELETE"]
}
```

### Audit Logs
All webhook operations are logged to `AuditLog` table:
- `userId`: `"webhook-system"`
- `module`: `"WEBHOOK"`
- `action`: `CREATE | UPDATE | DELETE`
- `recordType`: Source identifier (e.g., `hr_employees`)
- `description`: Operation summary with employeeNumber/assignmentId

### Console Logs
```
[Webhook] hr_employees - INSERT - EMP-0021 - 23ms
[Webhook] hr_payroll - UPDATE - EMP-0021 - 45ms
[Webhook] op_bus_trips - INSERT - 1234 - 18ms
[Bulk Sync] hr_employees - 150 records - 1234ms
```

---

## Migration from Polling

### Old System (5-minute polling)
```typescript
// Find and disable this code
setInterval(async () => {
  await fetchExternalData();
  await updateCache();
}, 5 * 60 * 1000);
```

### New System (Real-time webhooks)
1. External systems POST to `/api/webhooks/data-sync`
2. Cache updates happen instantly
3. No polling overhead

### Migration Steps

1. **Initial Bulk Sync**
   ```bash
   # Fetch all data from external APIs
   curl https://backends-blue.vercel.app/api/clean/hr_employees > employees.json
   curl https://backends-blue.vercel.app/api/clean/hr_payroll > payroll.json
   curl https://backends-blue.vercel.app/api/clean/op_bus-trip-details > trips.json
   
   # Bulk sync to local cache
   curl -X POST http://localhost:3000/api/webhooks/data-sync/bulk-sync \
     -H "Content-Type: application/json" \
     -d @bulk-sync-employees.json
   ```

2. **Configure External Systems**
   - Provide webhook URL to external system admins
   - Share payload structure and examples
   - Set up webhook signature (if using WEBHOOK_SECRET)

3. **Test Webhooks**
   - Send test payloads for INSERT/UPDATE/DELETE
   - Verify cache updates
   - Check audit logs

4. **Disable Polling**
   - Locate polling code in codebase
   - Comment out or remove
   - Deploy changes

5. **Monitor Webhooks**
   - Check audit logs daily
   - Monitor for failed webhooks
   - Set up alerts for errors

---

## Troubleshooting

### Webhook Not Received
- Check external system configuration
- Verify webhook URL is correct
- Check firewall/network settings
- Review external system logs

### Invalid Signature
- Verify WEBHOOK_SECRET matches in both systems
- Check signature generation algorithm (HMAC-SHA256)
- Ensure payload is stringified identically

### Cache Not Updating
- Check Prisma database connection
- Verify unique constraints (employeeNumber, assignmentId)
- Review audit logs for errors
- Check console logs for detailed error messages

### Performance Issues
- Monitor processing time in response
- Use bulk sync for large datasets (>100 records)
- Consider batching webhooks on external system

---

## API Reference

### POST /api/webhooks/data-sync
Real-time webhook receiver for individual record changes.

**Request:**
```json
{
  "source": "hr_employees | hr_payroll | op_bus_trips",
  "action": "INSERT | UPDATE | DELETE",
  "timestamp": "ISO 8601 timestamp",
  "data": { /* Record data */ }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Cache updated successfully",
  "source": "hr_employees",
  "action": "INSERT",
  "recordId": "EMP-0021",
  "processingTime": "23ms"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message"
}
```

---

### POST /api/webhooks/data-sync/bulk-sync
Bulk sync endpoint for initial cache population.

**Request:**
```json
{
  "source": "hr_employees | hr_payroll | op_bus_trips",
  "data": [ /* Array of records */ ],
  "clearExisting": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "hr_employees bulk sync completed",
  "processed": 150,
  "created": 120,
  "updated": 30,
  "failed": 0,
  "errors": [],
  "processingTime": "1234ms"
}
```

---

### GET /api/webhooks/data-sync
Health check and API documentation.

**Response:**
```json
{
  "service": "External Data Webhook Receiver",
  "version": "1.0.0",
  "status": "operational",
  "supportedSources": ["hr_employees", "hr_payroll", "op_bus_trips"],
  "supportedActions": ["INSERT", "UPDATE", "DELETE"]
}
```

---

## Appendix

### Field Mappings

#### EmployeeCache
| External Field | Database Field | Type | Notes |
|---------------|----------------|------|-------|
| employeeNumber | employeeNumber | String | Unique |
| firstName | firstName | String | Required |
| middleName | middleName | String? | Optional |
| lastName | lastName | String | Required |
| phone | phone | String? | Optional |
| position | position | String | Required |
| departmentId | departmentId | Int | Required |
| department | department | String | Required |

#### PayrollCache
| External Field | Database Field | Type | Notes |
|---------------|----------------|------|-------|
| employeeNumber | employeeNumber | String | Unique |
| attendances[] | attendanceData | JSON | Array of {date, status} |
| benefits[] | benefitsData | JSON | Transformed structure |
| deductions[] | deductionsData | JSON | Transformed structure |

#### BusTripCache
| External Field | Database Field | Type | Notes |
|---------------|----------------|------|-------|
| assignment_id | assignmentId | Int | Unique |
| bus_trip_id | busTripId | Int | Required |
| date_assigned | dateAssigned | DateTime | ISO 8601 |

---

## Support

For issues or questions:
1. Check audit logs: `SELECT * FROM "AuditLog" WHERE "module" = 'WEBHOOK'`
2. Review console logs for detailed error messages
3. Test with provided HTTP files in `docs/`
4. Contact system administrator

---

**Document Version:** 1.0.0  
**Last Updated:** January 17, 2025  
**Author:** GitHub Copilot
