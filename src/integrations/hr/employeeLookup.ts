/**
 * HR Employee Lookup Integration
 * Fetches employee details from HR microservice for debtor reference
 */

import { logger } from '../../config/logger';

// HR API configuration
const HR_API_BASE_URL = process.env.HR_API_BASE_URL || 'https://api.agilabuscorp.me';
const HR_EMPLOYEES_ENDPOINT = '/inventory/employees';

export interface HREmployeeResponse {
  employeeNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  position: string;
  barangay: string;
  zipCode: string;
  departmentId: number;
  department: string;
}

export interface EmployeeLookupResult {
  success: boolean;
  employeeNumber?: string;
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  position?: string;
  department?: string;
  error?: string;
}

/**
 * Format employee full name from HR API response
 * Format: "LastName, FirstName M." (e.g., "Dela Cruz, Juan R.")
 */
function formatEmployeeName(employee: HREmployeeResponse): string {
  const middleInitial = employee.middleName ? ` ${employee.middleName.charAt(0)}.` : '';
  return `${employee.lastName}, ${employee.firstName}${middleInitial}`;
}

/**
 * Fetch employee by employee number from HR API
 */
export async function fetchEmployeeByNumber(employeeNumber: string): Promise<EmployeeLookupResult> {
  try {
    const url = `${HR_API_BASE_URL}${HR_EMPLOYEES_ENDPOINT}?employeeNumber=${encodeURIComponent(employeeNumber)}`;
    
    logger.info(`[HR Integration] Fetching employee: ${employeeNumber}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.warn(`[HR Integration] API returned status ${response.status} for employee ${employeeNumber}`);
      return {
        success: false,
        error: `HR API returned status ${response.status}`,
      };
    }

    const data: any = await response.json();

    // Handle different response structures
    let employee: HREmployeeResponse | null = null;

    if (Array.isArray(data)) {
      // Response is an array - find matching employee
      employee = data.find((emp: HREmployeeResponse) => emp.employeeNumber === employeeNumber) || null;
    } else if (data && data.employeeNumber) {
      // Response is a single employee object
      employee = data as HREmployeeResponse;
    } else if (data && data.data) {
      // Response wrapped in data property
      if (Array.isArray(data.data)) {
        employee = data.data.find((emp: HREmployeeResponse) => emp.employeeNumber === employeeNumber) || null;
      } else {
        employee = data.data as HREmployeeResponse;
      }
    }

    if (!employee) {
      logger.warn(`[HR Integration] Employee not found: ${employeeNumber}`);
      return {
        success: false,
        error: 'Employee not found',
      };
    }

    const fullName = formatEmployeeName(employee);

    logger.info(`[HR Integration] Found employee: ${employeeNumber} -> ${fullName}`);

    return {
      success: true,
      employeeNumber: employee.employeeNumber,
      fullName,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      position: employee.position,
      department: employee.department,
    };
  } catch (error) {
    logger.error(`[HR Integration] Error fetching employee ${employeeNumber}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Lookup employee and return formatted name or fallback
 * Returns "Unknown - Pending Sync" if HR API fails
 */
export async function lookupEmployeeName(employeeNumber: string): Promise<string> {
  const result = await fetchEmployeeByNumber(employeeNumber);
  
  if (result.success && result.fullName) {
    return result.fullName;
  }
  
  return 'Unknown - Pending Sync';
}

/**
 * Batch lookup multiple employees
 */
export async function batchLookupEmployees(
  employeeNumbers: string[]
): Promise<Map<string, EmployeeLookupResult>> {
  const results = new Map<string, EmployeeLookupResult>();

  // Process in parallel with concurrency limit
  const BATCH_SIZE = 5;
  for (let i = 0; i < employeeNumbers.length; i += BATCH_SIZE) {
    const batch = employeeNumbers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (empNum) => ({
        employeeNumber: empNum,
        result: await fetchEmployeeByNumber(empNum),
      }))
    );

    for (const { employeeNumber, result } of batchResults) {
      results.set(employeeNumber, result);
    }
  }

  return results;
}
