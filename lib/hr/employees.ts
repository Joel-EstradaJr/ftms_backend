// lib/hr/employees.ts

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
 * Backend should only depend on HR API.
 */
export async function fetchEmployeesForReimbursement(): Promise<Employee[]> {
  try {
    const hrApiUrl = process.env.HR_API_EMPLOYEES_URL;
    if (!hrApiUrl) {
      throw new Error('HR_API_EMPLOYEES_URL is not configured');
    }

    // Retry with timeout to mitigate transient timeouts
    const maxRetries = 3;
    const timeoutMs = 15000; // 15s

    const fetchWithRetry = async (url: string): Promise<Response> => {
      let lastErr: unknown = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              // Some servers are sensitive to headers; Accept is sufficient
              'Accept': 'application/json',
            },
            signal: controller.signal,
          });
          clearTimeout(timer);
          return res;
        } catch (err) {
          clearTimeout(timer);
          lastErr = err;
          // Basic backoff: 500ms, 1000ms between attempts
          const backoff = 500 * attempt;
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error('Unknown HR API fetch error');
    };

    const response = await fetchWithRetry(hrApiUrl);

    if (!response.ok) {
      throw new Error(`HR API request failed: ${response.status} ${response.statusText}`);
    }

    const hrEmployees: HREmployee[] = await response.json();

    // Transform HR API data to match our Employee interface
    const employees: Employee[] = hrEmployees.map((hrEmp) => ({
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
 * Fetch all employees from HR API (replaces the old getAllEmployees function)
 */
export async function getAllEmployees(): Promise<Employee[]> {
  return fetchEmployeesForReimbursement();
}
