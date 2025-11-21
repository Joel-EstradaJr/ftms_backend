import { prisma } from "../prisma";
import { clearCache } from "../serverCache";

// Simple retry helper
async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      console.error(`[cache] attempt ${i + 1} failed:`, e);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function refreshCaches(baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000") {
  // Prefer explicit external endpoints from env; fall back to legacy internal routes if not provided
  const opsUrl =
    process.env.OP_API_BUSTRIP_URL ||
    process.env.NEXT_PUBLIC_OP_API_BUSTRIP_URL ||
    `${process.env.OPERATIONS_BASE_URL || baseUrl}/api/operations/bus-trips`;
  const hrEmpUrl =
    process.env.HR_API_EMPLOYEES_URL ||
    `${process.env.HR_BASE_URL || baseUrl}/api/hr/employees`;
  const hrPayrollUrl =
    process.env.HR_API_PAYROLL_URL ||
    `${process.env.HR_BASE_URL || baseUrl}/api/hr/payroll`;

  console.log("[cache] Refresh started");

  // Fetch in parallel with retry
  const [busTrips, employees, payroll] = await Promise.all([
    retry(() => fetchJson<any[]>(opsUrl)),
    retry(() => fetchJson<any[]>(hrEmpUrl)),
    retry(() => fetchJson<any[]>(hrPayrollUrl)),
  ]);

  const now = new Date();

  // Replace datasets transactionally per table to avoid partial states
  await prisma.$transaction(async (tx) => {
    const anyTx = tx as any;
    // BusTripCache: replace all rows
    await anyTx.busTripCache.deleteMany({});
    if (busTrips.length) {
      // Deduplicate by bus_trip_id then by assignment_id to satisfy both unique constraints
      const byTrip = new Map<string, any>();
      for (const t of busTrips) {
        const key = String(t.bus_trip_id || '');
        if (!key) continue;
        if (!byTrip.has(key)) byTrip.set(key, t);
      }
      const byAssign = new Map<string, any>();
      for (const t of byTrip.values()) {
        const key = String(t.assignment_id || '');
        if (!key) continue;
        if (!byAssign.has(key)) byAssign.set(key, t);
      }
      const uniqueTrips = Array.from(byAssign.values());

      await anyTx.busTripCache.createMany({
        data: uniqueTrips.map((t) => ({
          assignmentId: t.assignment_id,
          busTripId: t.bus_trip_id,
          busRoute: t.bus_route,
          isRevenueRecorded: Boolean(t.is_revenue_recorded),
          isExpenseRecorded: Boolean(t.is_expense_recorded),
          dateAssigned: new Date(t.date_assigned),
          tripFuelExpense: String(t.trip_fuel_expense ?? 0),
          tripRevenue: String(t.trip_revenue ?? 0),
          assignmentType: String(t.assignment_type ?? ""),
          assignmentValue: String(t.assignment_value ?? 0),
          paymentMethod: String(t.payment_method ?? ""),
          driverName: String(t.driver_name ?? ""),
          conductorName: String(t.conductor_name ?? ""),
          busPlateNumber: String(t.bus_plate_number ?? ""),
          busType: String(t.bus_type ?? ""),
          bodyNumber: String(t.body_number ?? ""),
          lastSynced: now,
        })
      ) as any,
        skipDuplicates: true as any,
      });
    }

    // EmployeeCache: replace all rows
    await anyTx.employeeCache.deleteMany({});
    if (employees.length) {
      await anyTx.employeeCache.createMany({
        data: employees.map((e) => ({
          employeeNumber: e.employeeNumber,
          firstName: e.firstName,
          middleName: e.middleName || null,
          lastName: e.lastName,
          phone: e.phone || null,
          position: e.position,
          departmentId: Number(e.departmentId ?? 0),
          department: e.department,
          lastSynced: now,
        })) as any
      });
    }

    // PayrollCache: replace all rows
    await anyTx.payrollCache.deleteMany({});
    if (payroll.length) {
      await anyTx.payrollCache.createMany({
        data: payroll.map((p) => ({
          employeeNumber: p.employeeNumber,
          firstName: p.firstName,
          middleName: p.middleName || null,
          lastName: p.lastName,
          suffix: p.suffix || null,
          employeeStatus: String(p.employeeStatus ?? ""),
          hiredate: new Date(p.hiredate),
          terminationDate: p.terminationDate ? new Date(p.terminationDate) : null,
          basicRate: String(p.basicRate ?? 0),
          positionName: p.position?.positionName ?? "",
          departmentName: p.position?.department?.departmentName ?? "",
          attendanceData: p.attendances ?? null,
          benefitsData: p.benefits ?? null,
          deductionsData: p.deductions ?? null,
          lastSynced: now,
        })) as any
      });
    }
  });

  // Clear memoized globals so subsequent requests see fresh values immediately
  try {
    clearCache("globals:");
  } catch (e) {
    console.error("[cache] failed to clear memoized globals", e);
  }

  console.log("[cache] Refresh completed");
}

export default refreshCaches;
