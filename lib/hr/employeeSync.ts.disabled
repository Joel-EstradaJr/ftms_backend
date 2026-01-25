/**
 * EMPLOYEE SYNCHRONIZATION UTILITY (HR System)
 * 
 * Syncs employee data from external HR system to Finance database
 * Endpoint: https://api.agilabuscorp.me/inventory/employees
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Employee Data Interface (from External HR System)
 */
interface ExternalEmployeePayload {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  position: string;
  barangay?: string;
  zipCode?: string;
  departmentId: number;
  department: string;
}

/**
 * HR API Response Structure
 */
interface HREmployeesResponse {
  employees: ExternalEmployeePayload[];
}

/**
 * Sync single employee from HR system
 */
export async function syncEmployee(employeeData: ExternalEmployeePayload) {
  try {
    const result = await prisma.employees_cache.upsert({
      where: {
        employee_number: employeeData.employeeNumber,
      },
      update: {
        first_name: employeeData.firstName,
        middle_name: employeeData.middleName || null,
        last_name: employeeData.lastName,
        phone_number: employeeData.phone,
        position_name: employeeData.position,
        position_id: null, // HR doesn't provide position_id
        department_id: employeeData.departmentId,
        department_name: employeeData.department,
        barangay: employeeData.barangay || null,
        zip_code: employeeData.zipCode || null,
        last_synced_at: new Date(),
        is_deleted: false,
      },
      create: {
        employee_number: employeeData.employeeNumber,
        first_name: employeeData.firstName,
        middle_name: employeeData.middleName || null,
        last_name: employeeData.lastName,
        suffix: null, // HR doesn't provide suffix
        phone_number: employeeData.phone,
        position_name: employeeData.position,
        position_id: null,
        department_id: employeeData.departmentId,
        department_name: employeeData.department,
        barangay: employeeData.barangay || null,
        zip_code: employeeData.zipCode || null,
        last_synced_at: new Date(),
      },
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error syncing employee:', error);
    return { success: false, error };
  }
}

/**
 * Sync multiple employees in bulk
 */
export async function syncEmployeesBulk(employees: ExternalEmployeePayload[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (const employee of employees) {
    const result = await syncEmployee(employee);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        employeeNumber: employee.employeeNumber,
        error: result.error,
      });
    }
  }

  return results;
}

/**
 * Fetch and sync employees from HR API
 */
export async function fetchAndSyncEmployeesFromHR(apiUrl?: string) {
  try {
    const baseUrl = apiUrl || `${process.env.HR_API_BASE_URL}${process.env.HR_EMPLOYEES_ENDPOINT}`;
    
    if (!baseUrl || baseUrl.includes('undefined')) {
      throw new Error('HR API URL not configured. Please set HR_API_BASE_URL and HR_EMPLOYEES_ENDPOINT in .env');
    }
    
    const response = await fetch(baseUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as HREmployeesResponse;
    
    if (!data.employees || !Array.isArray(data.employees)) {
      throw new Error('Invalid response format from HR API');
    }

    const result = await syncEmployeesBulk(data.employees);
    
    return {
      success: true,
      total: data.employees.length,
      synced: result.success,
      failed: result.failed,
      errors: result.errors,
    };
  } catch (error) {
    console.error('Error fetching from HR API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark employees as deleted if they no longer exist in HR system
 */
export async function markDeletedEmployees(currentEmployeeNumbers: string[]) {
  try {
    const result = await prisma.employees_cache.updateMany({
      where: {
        employee_number: {
          notIn: currentEmployeeNumbers,
        },
        is_deleted: false,
      },
      data: {
        is_deleted: true,
      },
    });

    return { success: true, deletedCount: result.count };
  } catch (error) {
    console.error('Error marking deleted employees:', error);
    return { success: false, error };
  }
}

/**
 * Get employees by department
 */
export async function getEmployeesByDepartment(departmentId: number) {
  return await prisma.employees_cache.findMany({
    where: {
      department_id: departmentId,
      is_deleted: false,
    },
    orderBy: {
      last_name: 'asc',
    },
  });
}

/**
 * Get employees by position
 */
export async function getEmployeesByPosition(positionName: string) {
  return await prisma.employees_cache.findMany({
    where: {
      position_name: {
        contains: positionName,
        mode: 'insensitive',
      },
      is_deleted: false,
    },
    orderBy: {
      last_name: 'asc',
    },
  });
}

/**
 * Example Usage:
 * 
 * // Manual sync with payload
 * await syncEmployee(employeeData);
 * 
 * // Bulk sync
 * await syncEmployeesBulk(employeesArray);
 * 
 * // Fetch from HR API and sync automatically
 * await fetchAndSyncEmployeesFromHR();
 * 
 * // Get employees by department
 * const hrEmployees = await getEmployeesByDepartment(1); // HR Department
 */
