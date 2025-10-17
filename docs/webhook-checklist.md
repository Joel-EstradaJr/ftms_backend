# Webhook Implementation Checklist

## ✅ Implementation Phase (COMPLETE)

### Core Files Created
- [x] `/app/api/webhooks/data-sync/route.ts` (540 lines)
  - Real-time webhook receiver
  - INSERT/UPDATE/DELETE support for 3 data sources
  - Type guards and validation
  - Optional signature verification
  - Audit logging
  - Error handling
  
- [x] `/app/api/webhooks/data-sync/bulk-sync/route.ts` (360 lines)
  - Bulk sync endpoint
  - Batch processing
  - Progress tracking
  - Error logging

### Documentation Created
- [x] `/docs/webhook-implementation.md` (Complete implementation guide)
- [x] `/docs/webhook-quick-reference.md` (Quick reference & cheat sheet)
- [x] `/docs/webhook-summary.md` (Implementation summary)
- [x] `/docs/webhook-test-payloads.http` (17 HTTP test cases)
- [x] `/docs/webhook-test-script.ps1` (12 automated tests)

### Code Quality
- [x] TypeScript type safety (all type errors resolved)
- [x] Comprehensive error handling
- [x] Input validation with type guards
- [x] Audit logging integration
- [x] Processing time tracking
- [x] Console logging for debugging

---

## 🧪 Testing Phase (NEXT STEP)

### Pre-Testing Setup
- [ ] Start development server
  ```powershell
  cd c:\capstone\ftms
  npm run dev
  ```
- [ ] Verify server is running at `http://localhost:3000`
- [ ] Verify database connection is working

### Automated Testing
- [ ] Run PowerShell test script
  ```powershell
  cd docs
  .\webhook-test-script.ps1
  ```
- [ ] Verify 12/12 tests pass
- [ ] Check test output for errors
- [ ] Review created test records in database

### Manual Testing (VS Code REST Client)
- [ ] Install REST Client extension (if not installed)
- [ ] Open `/docs/webhook-test-payloads.http`
- [ ] Test #1: Health Check
- [ ] Test #2-3: Employee INSERT/UPDATE
- [ ] Test #4-6: Payroll INSERT/UPDATE/DELETE (complex JSON)
- [ ] Test #7-9: Bus Trip INSERT/UPDATE/DELETE
- [ ] Test #10-12: Bulk Sync (all 3 sources)
- [ ] Test #13-16: Error handling tests

### Database Verification
- [ ] Check EmployeeCache table
  ```sql
  SELECT * FROM "EmployeeCache" WHERE "employeeNumber" LIKE 'TEST-%';
  ```
- [ ] Check PayrollCache table
  ```sql
  SELECT * FROM "PayrollCache" WHERE "employeeNumber" LIKE 'TEST-%';
  ```
- [ ] Check BusTripCache table
  ```sql
  SELECT * FROM "BusTripCache" WHERE "assignmentId" >= 10000;
  ```
- [ ] Check Audit Logs
  ```sql
  SELECT * FROM "AuditLog" 
  WHERE "module" = 'WEBHOOK' 
  ORDER BY "timestamp" DESC 
  LIMIT 20;
  ```

### Cleanup After Testing
- [ ] Delete test records from EmployeeCache
- [ ] Delete test records from PayrollCache
- [ ] Delete test records from BusTripCache
- [ ] Optionally clear test audit logs

---

## 🔄 Integration Phase (AFTER TESTING)

### Initial Data Sync
- [ ] Fetch current data from external HR Employees API
  ```powershell
  $employees = Invoke-RestMethod -Uri "https://backends-blue.vercel.app/api/clean/hr_employees"
  ```
- [ ] Fetch current data from external HR Payroll API
  ```powershell
  $payroll = Invoke-RestMethod -Uri "https://backends-blue.vercel.app/api/clean/hr_payroll"
  ```
- [ ] Fetch current data from external Operations Bus Trips API
  ```powershell
  $trips = Invoke-RestMethod -Uri "https://backends-blue.vercel.app/api/clean/op_bus-trip-details"
  ```
- [ ] Perform bulk sync for hr_employees (clear existing data)
- [ ] Perform bulk sync for hr_payroll (clear existing data)
- [ ] Perform bulk sync for op_bus_trips (clear existing data)
- [ ] Verify all records imported correctly
- [ ] Check record counts match external APIs

### External System Configuration
- [ ] Identify external system administrators
- [ ] Schedule integration meeting
- [ ] Share webhook documentation
  - Webhook URL (production and development)
  - Payload structure examples
  - Error handling guidelines
  - Retry logic recommendations
- [ ] Provide test webhook endpoint for external system testing
- [ ] Configure webhook secret (optional but recommended)
  ```env
  WEBHOOK_SECRET=generate-secure-random-string
  ```
- [ ] External systems configure webhook POST on data changes
- [ ] External systems implement retry logic
- [ ] External systems implement signature generation (if using secret)

### Webhook Verification
- [ ] Monitor webhook activity in audit logs
- [ ] Verify INSERT webhooks create cache records
- [ ] Verify UPDATE webhooks modify existing records
- [ ] Verify DELETE webhooks remove records
- [ ] Check processing times are acceptable (<100ms)
- [ ] Monitor for webhook failures
- [ ] Verify signature validation (if enabled)

---

## 📊 Monitoring Phase (ONGOING)

### Daily Checks (First Week)
- [ ] Review audit logs for webhook activity
  ```sql
  SELECT 
    DATE("timestamp") as date,
    COUNT(*) as webhook_count,
    SUBSTRING("description", POSITION(': ' IN "description") + 2, 
      POSITION(' - ' IN "description") - POSITION(': ' IN "description") - 2) as source
  FROM "AuditLog"
  WHERE "module" = 'WEBHOOK' AND "timestamp" >= NOW() - INTERVAL '7 days'
  GROUP BY DATE("timestamp"), source
  ORDER BY date DESC;
  ```
- [ ] Check for failed webhooks
- [ ] Verify cache data is up-to-date
- [ ] Monitor webhook processing times
- [ ] Review error logs

### Weekly Checks (Ongoing)
- [ ] Review webhook performance metrics
- [ ] Check database storage growth
- [ ] Verify external systems sending webhooks reliably
- [ ] Review and optimize slow queries (if any)

### Monthly Checks
- [ ] Review overall webhook reliability
- [ ] Analyze webhook patterns and usage
- [ ] Consider optimizations if needed
- [ ] Update documentation if processes change

---

## 🔧 Migration Phase (AFTER INTEGRATION VERIFIED)

### Find and Disable Old Polling Code
- [ ] Search codebase for polling mechanism
  ```powershell
  # Search for setInterval, setTimeout, cron jobs
  grep -r "setInterval" c:\capstone\ftms --include="*.ts" --include="*.tsx"
  grep -r "setTimeout" c:\capstone\ftms --include="*.ts" --include="*.tsx"
  grep -r "cron" c:\capstone\ftms --include="*.ts" --include="*.tsx"
  grep -r "refetch" c:\capstone\ftms --include="*.ts" --include="*.tsx"
  ```
- [ ] Identify polling code location(s)
- [ ] Review polling code to understand impact
- [ ] Comment out or remove polling code
- [ ] Test that cache still updates via webhooks
- [ ] Verify no data is missing after polling disabled
- [ ] Commit and deploy changes

### Update System Documentation
- [ ] Document webhook URLs for operations team
- [ ] Create runbook for webhook troubleshooting
- [ ] Update system architecture diagrams
- [ ] Document data flow (webhooks → cache → application)
- [ ] Create alerting rules for webhook failures

---

## 🚨 Troubleshooting Checklist

### Webhook Not Received
- [ ] Verify dev server is running
- [ ] Check webhook endpoint responds to GET (health check)
- [ ] Verify external system sent webhook (check their logs)
- [ ] Check network connectivity
- [ ] Verify webhook URL is correct
- [ ] Check firewall/security rules

### Webhook Returns Error
- [ ] Check webhook payload structure matches documentation
- [ ] Verify all required fields are present
- [ ] Check data types match expected types
- [ ] Review audit logs for detailed error message
- [ ] Check console logs for stack trace
- [ ] Verify signature is correct (if enabled)

### Cache Not Updating
- [ ] Verify webhook endpoint returns 200 OK
- [ ] Check database connection
- [ ] Verify unique constraint keys (employeeNumber, assignmentId)
- [ ] Check for database errors in console logs
- [ ] Review audit logs for errors
- [ ] Verify Prisma schema matches database

### Performance Issues
- [ ] Check processing time in webhook response
- [ ] Monitor database query performance
- [ ] Check database connection pool
- [ ] Consider using bulk sync for large datasets
- [ ] Review database indexes

---

## 📈 Success Metrics

### Technical Metrics
- [ ] Webhook success rate > 99%
- [ ] Average processing time < 100ms
- [ ] Cache update latency < 1 second
- [ ] Zero data inconsistencies

### Business Metrics
- [ ] Real-time data synchronization achieved
- [ ] Eliminated 5-minute polling overhead
- [ ] Reduced server load
- [ ] Improved user experience (fresher data)

---

## 🎯 Final Checklist

### Before Going to Production
- [ ] All automated tests pass (12/12)
- [ ] Manual testing completed successfully
- [ ] Database verification confirms data integrity
- [ ] External systems configured and tested
- [ ] Initial bulk sync completed
- [ ] Webhook monitoring in place
- [ ] Old polling code disabled
- [ ] Documentation complete
- [ ] Team trained on new system
- [ ] Rollback plan prepared

### Production Deployment
- [ ] Deploy webhook endpoints to production
- [ ] Update external systems with production webhook URL
- [ ] Perform production bulk sync
- [ ] Monitor webhooks for 24 hours
- [ ] Verify cache updates in real-time
- [ ] Disable old polling in production
- [ ] Update runbook and documentation

---

## 📝 Notes

### Known Limitations
- Webhook receiver is synchronous (processes one webhook at a time)
- Large bulk syncs (>1000 records) may take 10-15 seconds
- No built-in webhook retry mechanism (external systems must retry)

### Future Enhancements
- Add async processing for bulk operations
- Implement webhook queue for high-volume scenarios
- Add metrics dashboard for webhook monitoring
- Add webhook rate limiting
- Add webhook authentication beyond signature verification
- Support webhook batching (multiple records in one webhook)

---

## ✅ Sign-Off

- [ ] Developer tested and verified
- [ ] Documentation reviewed
- [ ] External team notified
- [ ] Stakeholders informed
- [ ] Production deployment approved

---

**Last Updated**: January 17, 2025  
**Status**: Ready for Testing  
**Next Action**: Run `.\docs\webhook-test-script.ps1`
