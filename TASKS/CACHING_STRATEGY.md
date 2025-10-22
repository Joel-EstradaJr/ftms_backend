# 🗄️ FTMS Caching Strategy & Recommendations

**Date:** October 22, 2025  
**Purpose:** Define caching strategy for external data models and internal data optimization

---

## 📊 External Data Models Analysis

Based on your Prisma schema, here are the **4 external data cache models**:

### 1. **CachedEmployee** (HR Employee Data)
```prisma
Source: HR Microservice - /api/clean/hr_employees
Update Frequency: Medium (employees change occasionally)
Data Size: ~1KB per record
Typical Count: 50-200 employees
```

### 2. **CachedPayrollData** (HR Payroll Data)
```prisma
Source: HR Microservice - /api/clean/hr_payroll
Update Frequency: High (daily attendance, monthly benefits/deductions)
Data Size: ~3-5KB per record (includes JSON arrays)
Typical Count: 50-200 payroll records
```

### 3. **CachedTrip** (Operations Bus Trip Data)
```prisma
Source: Operations Microservice - /api/clean/op_bus-trip-details
Update Frequency: Very High (multiple trips per day)
Data Size: ~2KB per record
Typical Count: 100-500 trips per month
```

### 4. **CachedInventoryItem** (Inventory Item Data)
```prisma
Source: Inventory Microservice - TBD
Update Frequency: Medium-Low (items change occasionally)
Data Size: ~500 bytes per record
Typical Count: 200-1000 items
```

---

## 🎯 Caching Strategy Recommendations

### ✅ **Redis Cache (Recommended)**

**Use Redis for:**
1. ✅ **CachedEmployee** - Frequently accessed for payroll, loan, expense validation
2. ✅ **CachedPayrollData** - High read frequency for salary calculations
3. ✅ **CachedTrip** (Recent trips only) - Frequently queried for revenue/expense sync
4. ✅ **Lookup Tables** - ExpenseCategory, RevenueSource, PaymentMethod, etc.

**Redis Caching Benefits:**
- ⚡ Sub-millisecond read performance
- 🔄 Easy invalidation when data updates
- 📦 Low memory footprint (compared to database queries)
- 🚀 Reduces database load by 70-80%
- 🌐 Can be shared across multiple backend instances

### ✅ **Database Cache (PostgreSQL)**

**Use Database for:**
1. ✅ **CachedInventoryItem** - Low update frequency, complex queries with filters
2. ✅ **CachedTrip** (Historical trips) - Archive old trips for reporting
3. ✅ **ExternalSyncLog** - Already in database, no need to duplicate

**Database Caching Benefits:**
- 🔍 Complex queries with JOINs, filters, aggregations
- 📊 Historical data analysis
- 💾 No memory pressure
- 🔒 ACID compliance for critical data

---

## 🔧 Redis Cache Implementation Strategy

### Cache Keys Structure

```typescript
// Employee Cache
"cache:employee:{employeeNumber}"        // Individual employee
"cache:employees:all"                    // All employees list
"cache:employees:department:{dept}"      // By department

// Payroll Cache
"cache:payroll:{employeeNumber}"         // Individual payroll
"cache:payroll:active"                   // Active employees payroll

// Trip Cache (Recent Only - Last 30 days)
"cache:trip:{busTripId}"                 // Individual trip
"cache:trips:unprocessed"                // Trips not yet synced to Finance
"cache:trips:date:{YYYY-MM-DD}"          // Trips by date

// Lookup Tables
"cache:lookup:expense_categories"
"cache:lookup:revenue_sources"
"cache:lookup:payment_methods"
"cache:lookup:budget_periods"
```

### Cache TTL (Time-To-Live)

| Data Type | TTL | Reason |
|-----------|-----|--------|
| **CachedEmployee** | 1 hour | Employees rarely change during work hours |
| **CachedPayrollData** | 30 minutes | Benefits/deductions may update |
| **CachedTrip (Recent)** | 15 minutes | Trips update frequently during operational hours |
| **Lookup Tables** | 24 hours | Rarely change, can be manually invalidated |

### Cache Invalidation Strategy

```typescript
// Invalidate on:
1. External API sync completes
2. Manual admin action (e.g., force refresh)
3. TTL expiration
4. Specific record update detected
```

---

## 📝 Updated Prisma Schema Recommendations

### Add Redis Cache Metadata Fields

```prisma
// Add to each Cached* model:
model CachedEmployee {
  // ... existing fields ...
  
  // Redis Caching Metadata
  isCachedInRedis   Boolean    @default(false)
  redisCacheKey     String?    // "cache:employee:EMP-0001"
  redisCachedAt     DateTime?
  redisTTL          Int?       // TTL in seconds
  
  @@index([isCachedInRedis])
  @@index([redisCacheKey])
}

// Repeat for CachedPayrollData, CachedTrip
```

### Add Cache Statistics Table

```prisma
model CacheStatistics {
  id                Int        @id @default(autoincrement())
  
  // Cache Identification
  cacheType         String     // "employee" | "payroll" | "trip" | "lookup"
  cacheKey          String?    // Specific key or "all"
  
  // Performance Metrics
  hitCount          Int        @default(0)
  missCount         Int        @default(0)
  hitRate           Decimal?   @db.Decimal(5, 2) // Percentage
  
  // Timing Metrics
  avgResponseTime   Int?       // Milliseconds
  maxResponseTime   Int?
  minResponseTime   Int?
  
  // Date Range
  periodStart       DateTime
  periodEnd         DateTime
  
  // Metadata
  recordedAt        DateTime   @default(now())
  
  @@index([cacheType, periodStart])
  @@index([recordedAt])
}
```

---

## 🚀 Implementation Code Examples

### Redis Cache Service

**src/cache/redis.service.ts** (Already in Implementation Guide)
```typescript
export class RedisCache {
  static async get<T>(key: string): Promise<T | null>
  static async set(key: string, value: any, ttlSeconds: number): Promise<void>
  static async del(key: string): Promise<void>
  static async delPattern(pattern: string): Promise<void>
}
```

### Employee Cache Service

**src/services/cache/employee.cache.ts**
```typescript
import { RedisCache } from '../../cache/redis.service';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

export class EmployeeCacheService {
  private static TTL = 3600; // 1 hour

  /**
   * Get employee by number (Redis first, then DB, then sync from HR)
   */
  static async getEmployee(employeeNumber: string) {
    const cacheKey = `cache:employee:${employeeNumber}`;

    // 1. Try Redis cache
    const cached = await RedisCache.get(cacheKey);
    if (cached) {
      logger.debug(`Employee cache hit: ${employeeNumber}`);
      return cached;
    }

    // 2. Try database cache
    const dbCache = await prisma.cachedEmployee.findUnique({
      where: { employeeNumber },
    });

    if (dbCache && !dbCache.isStale) {
      // Store in Redis for future requests
      await RedisCache.set(cacheKey, dbCache, this.TTL);
      logger.debug(`Employee loaded from DB cache: ${employeeNumber}`);
      return dbCache;
    }

    // 3. Fetch from HR API and update both caches
    logger.info(`Employee cache miss, fetching from HR: ${employeeNumber}`);
    return this.syncEmployeeFromHR(employeeNumber);
  }

  /**
   * Sync employee from HR API
   */
  private static async syncEmployeeFromHR(employeeNumber: string) {
    const response = await fetch(
      `${process.env.HR_API_EMPLOYEES_URL}/${employeeNumber}`
    );
    const employee = await response.json();

    // Update database cache
    const cached = await prisma.cachedEmployee.upsert({
      where: { employeeNumber },
      update: {
        ...employee,
        lastSyncedAt: new Date(),
        isStale: false,
        isCachedInRedis: true,
        redisCacheKey: `cache:employee:${employeeNumber}`,
        redisCachedAt: new Date(),
        redisTTL: this.TTL,
      },
      create: {
        ...employee,
        lastSyncedAt: new Date(),
        isStale: false,
        isCachedInRedis: true,
        redisCacheKey: `cache:employee:${employeeNumber}`,
        redisCachedAt: new Date(),
        redisTTL: this.TTL,
      },
    });

    // Store in Redis
    await RedisCache.set(
      `cache:employee:${employeeNumber}`,
      cached,
      this.TTL
    );

    return cached;
  }

  /**
   * Invalidate employee cache
   */
  static async invalidateEmployee(employeeNumber: string) {
    await RedisCache.del(`cache:employee:${employeeNumber}`);
    await prisma.cachedEmployee.update({
      where: { employeeNumber },
      data: {
        isStale: true,
        isCachedInRedis: false,
      },
    });
  }

  /**
   * Sync all employees from HR
   */
  static async syncAllEmployees() {
    const response = await fetch(process.env.HR_API_EMPLOYEES_URL);
    const employees = await response.json();

    for (const emp of employees) {
      await this.syncEmployeeFromHR(emp.employeeNumber);
    }

    logger.info(`Synced ${employees.length} employees`);
  }
}
```

### Trip Cache Service (Recent Trips in Redis, Old in DB)

**src/services/cache/trip.cache.ts**
```typescript
export class TripCacheService {
  private static RECENT_DAYS = 30; // Cache last 30 days in Redis
  private static TTL = 900; // 15 minutes

  /**
   * Get trip by ID (Redis for recent, DB for old)
   */
  static async getTrip(busTripId: string) {
    const cacheKey = `cache:trip:${busTripId}`;

    // Try Redis first
    const cached = await RedisCache.get(cacheKey);
    if (cached) return cached;

    // Get from database
    const trip = await prisma.cachedTrip.findUnique({
      where: { busTripId },
    });

    if (!trip) return null;

    // Only cache recent trips in Redis
    const tripAge = Date.now() - trip.dateAssigned.getTime();
    const daysOld = tripAge / (1000 * 60 * 60 * 24);

    if (daysOld <= this.RECENT_DAYS) {
      await RedisCache.set(cacheKey, trip, this.TTL);
    }

    return trip;
  }

  /**
   * Get unprocessed trips (always from DB, cached list in Redis)
   */
  static async getUnprocessedTrips() {
    const cacheKey = 'cache:trips:unprocessed';

    const cached = await RedisCache.get<any[]>(cacheKey);
    if (cached) return cached;

    const trips = await prisma.cachedTrip.findMany({
      where: {
        OR: [
          { isRevenueRecorded: false },
          { isExpenseRecorded: false },
        ],
      },
      orderBy: { dateAssigned: 'desc' },
    });

    await RedisCache.set(cacheKey, trips, 300); // 5 minutes
    return trips;
  }
}
```

---

## 📊 Caching Decision Matrix

| Model | Redis | PostgreSQL | Reason |
|-------|-------|------------|--------|
| **CachedEmployee** | ✅ Primary | ✅ Backup | Frequently read, rarely updated |
| **CachedPayrollData** | ✅ Primary | ✅ Backup | High read frequency, moderate update |
| **CachedTrip (Recent)** | ✅ Primary | ✅ Backup | Very high read for recent trips |
| **CachedTrip (Old)** | ❌ No | ✅ Primary | Historical, complex queries |
| **CachedInventoryItem** | ⚠️ Optional | ✅ Primary | Complex queries, low update frequency |
| **Lookup Tables** | ✅ Yes | ✅ Yes | Read-heavy, rarely change |
| **Revenue/Expense** | ❌ No | ✅ Primary | Transactional data, ACID required |
| **Loans/Payroll** | ❌ No | ✅ Primary | Financial data, audit trail required |

---

## 🔄 Cache Refresh Strategy

### Automatic Refresh

```typescript
// Scheduled refresh every 30 minutes (configurable)
import cron from 'node-cron';

// Refresh employees cache daily at 6 AM
cron.schedule('0 6 * * *', async () => {
  await EmployeeCacheService.syncAllEmployees();
});

// Refresh trips cache every 15 minutes during work hours (7 AM - 7 PM)
cron.schedule('*/15 7-19 * * *', async () => {
  await TripCacheService.syncRecentTrips();
});
```

### Manual Refresh Endpoint

```typescript
// Admin endpoint to force cache refresh
router.post('/api/admin/cache/refresh', authenticate, authorize('admin'), async (req, res) => {
  const { cacheType } = req.body;

  switch (cacheType) {
    case 'employees':
      await EmployeeCacheService.syncAllEmployees();
      await RedisCache.delPattern('cache:employee:*');
      break;
    case 'trips':
      await TripCacheService.syncAllTrips();
      await RedisCache.delPattern('cache:trip:*');
      break;
    case 'all':
      await RedisCache.delPattern('cache:*');
      break;
  }

  res.json({ success: true, message: `${cacheType} cache refreshed` });
});
```

---

## 📈 Performance Expectations

### Before Redis Caching
- Employee lookup: ~50-100ms (database query)
- Payroll calculation: ~200-500ms (multiple queries + JSON parsing)
- Trip validation: ~100-200ms

### After Redis Caching
- Employee lookup: ~1-5ms (Redis cache hit)
- Payroll calculation: ~10-30ms (Redis cache + computation)
- Trip validation: ~2-10ms (Redis cache hit)

**Expected Performance Improvement:** 80-90% reduction in read latency

---

## 🎯 Implementation Priority

### Phase 1 (High Priority)
1. ✅ Implement Redis cache for **CachedEmployee**
2. ✅ Implement Redis cache for **CachedPayrollData**
3. ✅ Add cache statistics tracking

### Phase 2 (Medium Priority)
1. ✅ Implement Redis cache for **CachedTrip** (recent only)
2. ✅ Add automatic cache refresh jobs
3. ✅ Add admin cache management endpoints

### Phase 3 (Low Priority)
1. ⚠️ Optional Redis cache for **CachedInventoryItem**
2. ✅ Advanced cache analytics dashboard
3. ✅ Cache warming on server startup

---

## 🔍 Monitoring & Alerts

### Cache Health Metrics
```typescript
// Monitor cache hit rate
if (cache.hitRate < 70%) {
  logger.warn('Cache hit rate below 70%, consider increasing TTL');
}

// Monitor stale data
const staleCount = await prisma.cachedEmployee.count({
  where: { isStale: true }
});

if (staleCount > 10) {
  logger.warn(`${staleCount} stale employee records detected`);
}
```

---

**Recommendation:** Start with Phase 1 (Employee + Payroll Redis caching) as these are the most frequently accessed external data sources in your Finance system.
