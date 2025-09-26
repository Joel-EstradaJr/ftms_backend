// Simple client-side singleton cache for frequently reused data in the Revenue module
// Avoids redundant API calls across Add/Edit/View flows

type CacheEntry<T> = { value: Promise<T>; expiresAt: number };
const store = new Map<string, CacheEntry<any>>();

function now() { return Date.now(); }
function ttlMs(defaultSeconds = 300) {
  const seconds = Number(process.env.NEXT_PUBLIC_CLIENT_CACHE_TTL || 0) || defaultSeconds;
  return Math.max(30, seconds) * 1000;
}

async function getOrFetch<T>(key: string, fetcher: () => Promise<T>, seconds?: number): Promise<T> {
  if (typeof window === 'undefined') {
    // Don’t client-cache on server; just fetch directly
    return fetcher();
  }
  const entry = store.get(key);
  if (entry && entry.expiresAt > now()) return entry.value;
  const p = fetcher();
  store.set(key, { value: p, expiresAt: now() + (seconds ? seconds * 1000 : ttlMs()) });
  return p;
}

export type RevenueGlobals = {
  categories: Array<{ category_id: string; name: string; applicable_modules: string[]; is_deleted?: boolean }>;
  payment_statuses: Array<{ id: string; name: string }>;
  payment_methods: Array<{ id: string; name: string }>;
};

export async function getRevenueGlobalsCached(): Promise<RevenueGlobals> {
  return getOrFetch('revenue:globals', async () => {
    const res = await fetch('/api/globals/batch?module=revenue', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load revenue globals');
    const data = await res.json();
    return {
      categories: data.categories || [],
      payment_statuses: data.payment_statuses || [],
      payment_methods: data.payment_methods || [],
    } as RevenueGlobals;
  });
}

export async function getEmployeesCached(): Promise<Array<{ employee_id: string; name: string; job_title: string; department: string; phone?: string }>> {
  return getOrFetch('employees:all', async () => {
    const res = await fetch('/api/employees', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load employees');
    return res.json();
  });
}

export type Assignment = {
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string;
  assignment_value: number;
  payment_method: string;
  driver_name: string | null;
  conductor_name: string | null;
  bus_plate_number: string | null;
  bus_type: string | null;
  body_number: string | null;
};

export async function getAssignmentsCached(): Promise<Assignment[]> {
  return getOrFetch('assignments:all', async () => {
    const res = await fetch('/api/assignments?RequestType=revenue', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load assignments');
    return res.json();
  });
}

export function invalidateClientStore(prefix?: string) {
  if (!prefix) { store.clear(); return; }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
