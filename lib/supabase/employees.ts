// ftms_deployed\lib\supabase\employees.ts

export interface HREmployee {
  employeeNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  position: string;
  departmentId: number;
  department: string;
}

export interface Employee {
  employee_id: string;
  name: string;
  job_title: string;
  department: string;
  phone?: string;
}

/**
 * Fetch employees from HR API for reimbursement purposes (server-side)
 * @returns Promise<Employee[]> Array of employees formatted for reimbursement
 */
export async function fetchEmployeesForReimbursement(): Promise<Employee[]> {
  try {
    const hrApiUrl = process.env.HR_API_EMPLOYEES_URL || 'https://hr-api.agilabuscorp.me/employees/inv';
    
    const response = await fetch(hrApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HR API request failed: ${response.status} ${response.statusText}`);
    }

    const hrEmployees: HREmployee[] = await response.json();

    // Transform HR API data to match our Employee interface
    const employees: Employee[] = hrEmployees.map(hrEmp => ({
      employee_id: hrEmp.employeeNumber,
      name: `${hrEmp.firstName} ${hrEmp.middleName ? hrEmp.middleName + ' ' : ''}${hrEmp.lastName}`.trim(),
      job_title: hrEmp.position,
      department: hrEmp.department,
      phone: hrEmp.phone,
    }));

    return employees;
  } catch (error) {
    console.error('Error fetching employees from HR API:', error);
    throw new Error('Failed to fetch employees from HR API');
  }
}

/**
 * Fetch employees from HR API (client-side version)
 * @returns Promise<Employee[]> Array of employees formatted for reimbursement
 */
// Client-side HR helper removed. Use `/api/employees` via fetch in pages if needed.

/**
 * Fetch all employees from HR API (replaces the old getAllEmployees function)
 * @returns Promise<Employee[]> Array of all employees
 */
export async function getAllEmployees(): Promise<Employee[]> {
  return fetchEmployeesForReimbursement();
} 