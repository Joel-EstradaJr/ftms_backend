/**
 * EMPLOYEE API CLIENT
 * Integration with external HR Employee API for employee details
 * Provides employee name mapping for payroll display
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// API URL from environment variable
const EMPLOYEE_API_URL = process.env.EMPLOYEE_API_URL ||
    'https://api.agilabuscorp.me/inventory/employees';

// ============================================================================
// TYPES
// ============================================================================

export interface ExternalEmployee {
    employeeNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    suffix?: string | null;
    position?: string;
    department?: string;
    status?: string;
}

export interface EmployeeNameInfo {
    employee_number: string;
    full_name: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    department: string | null;
    position: string | null;
}

// In-memory cache for employee data (refreshed on each sync)
let employeeCache: Map<string, ExternalEmployee> = new Map();
let cacheLastUpdated: Date | null = null;

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch all employees from external Employee API
 */
export async function fetchEmployeesFromAPI(): Promise<ExternalEmployee[]> {
    console.log(`🔄 Fetching employees from: ${EMPLOYEE_API_URL}`);

    try {
        const response = await fetch(EMPLOYEE_API_URL);

        if (!response.ok) {
            throw new Error(`Employee API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as ExternalEmployee[] | { employees: ExternalEmployee[] };

        // Handle both array response and { employees: [...] } format
        const employees: ExternalEmployee[] = Array.isArray(data) ? data : data.employees || [];

        console.log(`✅ Fetched ${employees.length} employees from API`);
        return employees;
    } catch (error) {
        console.error('❌ Error fetching employees from API:', error);
        throw error;
    }
}

/**
 * Refresh the employee cache from API
 */
export async function refreshEmployeeCache(): Promise<void> {
    try {
        const employees = await fetchEmployeesFromAPI();

        employeeCache.clear();
        for (const emp of employees) {
            employeeCache.set(emp.employeeNumber, emp);
        }

        cacheLastUpdated = new Date();
        console.log(`✅ Employee cache refreshed with ${employees.length} employees`);
    } catch (error) {
        console.error('❌ Failed to refresh employee cache:', error);
        throw error;
    }
}

/**
 * Get employee by employee number (from cache)
 */
export function getEmployeeFromCache(employeeNumber: string): ExternalEmployee | undefined {
    return employeeCache.get(employeeNumber);
}

/**
 * Build full name from employee data
 * Format: firstName + middleName + lastName
 */
export function buildFullName(employee: ExternalEmployee): string {
    const parts: string[] = [];

    if (employee.firstName) parts.push(employee.firstName);
    if (employee.middleName) parts.push(employee.middleName);
    if (employee.lastName) parts.push(employee.lastName);

    return parts.join(' ').trim() || employee.employeeNumber;
}

/**
 * Get employee name info with full name construction
 */
export function getEmployeeNameInfo(employeeNumber: string): EmployeeNameInfo | null {
    const employee = employeeCache.get(employeeNumber);

    if (!employee) {
        return null;
    }

    return {
        employee_number: employee.employeeNumber,
        full_name: buildFullName(employee),
        first_name: employee.firstName,
        middle_name: employee.middleName,
        last_name: employee.lastName,
        department: employee.department || null,
        position: employee.position || null,
    };
}

/**
 * Get all employee name infos from cache
 */
export function getAllEmployeeNames(): Map<string, EmployeeNameInfo> {
    const result = new Map<string, EmployeeNameInfo>();

    for (const [empNum, emp] of employeeCache) {
        result.set(empNum, {
            employee_number: emp.employeeNumber,
            full_name: buildFullName(emp),
            first_name: emp.firstName,
            middle_name: emp.middleName,
            last_name: emp.lastName,
            department: emp.department || null,
            position: emp.position || null,
        });
    }

    return result;
}

/**
 * Ensure cache is loaded (call at startup or before first use)
 */
export async function ensureEmployeeCacheLoaded(): Promise<void> {
    // Refresh cache if not loaded or older than 1 hour
    if (!cacheLastUpdated || (Date.now() - cacheLastUpdated.getTime()) > 3600000) {
        await refreshEmployeeCache();
    }
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats(): { size: number; lastUpdated: Date | null } {
    return {
        size: employeeCache.size,
        lastUpdated: cacheLastUpdated,
    };
}
