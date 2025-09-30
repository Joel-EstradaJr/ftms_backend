import { prisma } from "@/lib/prisma";
import { clearCache } from "@/lib/serverCache";

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
          assignment_id: t.assignment_id,
          bus_trip_id: t.bus_trip_id,
          bus_route: t.bus_route,
          is_revenue_recorded: Boolean(t.is_revenue_recorded),
          is_expense_recorded: Boolean(t.is_expense_recorded),
          date_assigned: new Date(t.date_assigned),
          trip_fuel_expense: String(t.trip_fuel_expense ?? 0),
          trip_revenue: String(t.trip_revenue ?? 0),
          assignment_type: String(t.assignment_type ?? ""),
          assignment_value: String(t.assignment_value ?? 0),
          payment_method: String(t.payment_method ?? ""),
          driver_name: String(t.driver_name ?? ""),
          conductor_name: String(t.conductor_name ?? ""),
          bus_plate_number: String(t.bus_plate_number ?? ""),
          bus_type: String(t.bus_type ?? ""),
          body_number: String(t.body_number ?? ""),
          last_synced_at: now,
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
          employee_number: e.employeeNumber,
          first_name: e.firstName,
          middle_name: e.middleName || null,
          last_name: e.lastName,
          phone: e.phone || null,
          position: e.position,
          department_id: Number(e.departmentId ?? 0),
          department: e.department,
          last_synced_at: now,
        })) as any
      });
    }

    // PayrollCache: replace all rows
    await anyTx.payrollCache.deleteMany({});
    if (payroll.length) {
      await anyTx.payrollCache.createMany({
        data: payroll.map((p) => ({
          employee_number: p.employeeNumber,
          first_name: p.firstName,
          middle_name: p.middleName || null,
          last_name: p.lastName,
          suffix: p.suffix || null,
          employee_status: String(p.employeeStatus ?? ""),
          hire_date: new Date(p.hiredate),
          termination_date: p.terminationDate ? new Date(p.terminationDate) : null,
          basic_rate: String(p.basicRate ?? 0),
          position_name: p.position?.positionName ?? "",
          department_name: p.position?.department?.departmentName ?? "",
          attendances: p.attendances ?? null,
          benefits: p.benefits ?? null,
          deductions: p.deductions ?? null,
          last_synced_at: now,
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
