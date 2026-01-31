// ============================================================================
// EMPLOYEE SERVICE - External HR API Integration
// Fetches employee data from HR system for reimbursement processing
// ============================================================================

import axios from 'axios';
import { logger } from '../config/logger';

// Environment configuration
const HR_API_BASE_URL = process.env.HR_API_BASE_URL || 'https://api.agilabuscorp.me';
const HR_EMPLOYEES_ENDPOINT = process.env.HR_EMPLOYEES_ENDPOINT || '/inventory/employees';

export interface HREmployee {
    employeeNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    phone?: string;
    position?: string;
    barangay?: string;
    zipCode?: string;
    departmentId?: number;
    department?: string;
}

export interface FormattedEmployee extends HREmployee {
    formatted_names: {
        full: string;
        formal: string;
    };
}

export interface EmployeeServiceResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

class EmployeeService {
    private baseUrl: string;
    private endpoint: string;

    constructor() {
        this.baseUrl = HR_API_BASE_URL;
        this.endpoint = HR_EMPLOYEES_ENDPOINT;
    }

    /**
     * Get full employees URL
     */
    getEmployeesUrl(): string {
        return `${this.baseUrl}${this.endpoint}`;
    }

    /**
     * Fetch all employees or search
     * @param searchQuery - Optional search term
     */
    async getEmployees(searchQuery?: string): Promise<EmployeeServiceResult<HREmployee[]>> {
        try {
            const url = this.getEmployeesUrl();
            const params: Record<string, string> = {};

            if (searchQuery) {
                params.search = searchQuery;
            }

            logger.info(`[EmployeeService] Fetching employees from ${url}`);

            const response = await axios.get(url, {
                params,
                timeout: 10000 // 10 second timeout
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error: any) {
            logger.error('[EmployeeService] Error fetching employees:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Fetch single employee by employee number
     * @param employeeNumber - Employee number (e.g., "EMP-2024-NKFN57")
     */
    async getEmployeeByNumber(employeeNumber: string): Promise<EmployeeServiceResult<HREmployee>> {
        try {
            const url = this.getEmployeesUrl();

            logger.info(`[EmployeeService] Fetching employee ${employeeNumber} from ${url}`);

            const response = await axios.get(url, {
                params: { employeeNumber },
                timeout: 10000,
            });

            // Handle array response (API may return array)
            const data = Array.isArray(response.data) ? response.data : [response.data];

            if (data && data.length > 0) {
                // Find exact match
                const employee = data.find((emp: HREmployee) => emp.employeeNumber === employeeNumber);
                if (employee) {
                    return {
                        success: true,
                        data: employee,
                    };
                }
            }

            return {
                success: false,
                error: 'Employee not found',
            };
        } catch (error: any) {
            logger.error(`[EmployeeService] Error fetching employee ${employeeNumber}:`, error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Format employee name for display
     * @param employee - Employee object from API
     * @param format - "full" or "formal"
     */
    formatEmployeeName(employee: HREmployee, format: 'full' | 'formal' = 'full'): string {
        const { firstName, middleName, lastName } = employee;

        if (format === 'formal') {
            // Last, First Middle
            const middlePart = middleName ? ` ${middleName}` : '';
            return `${lastName}, ${firstName}${middlePart}`.trim();
        }

        // First Middle Last
        const middlePart = middleName ? ` ${middleName}` : '';
        return `${firstName}${middlePart} ${lastName}`.trim();
    }

    /**
     * Format employee for payable creditor_name
     * @param employee - Employee object from API
     */
    formatCreditorName(employee: HREmployee): string {
        return this.formatEmployeeName(employee, 'formal');
    }

    /**
     * Format employee with both name formats
     * @param employee - Employee object from API
     */
    formatEmployeeWithNames(employee: HREmployee): FormattedEmployee {
        return {
            ...employee,
            formatted_names: {
                full: this.formatEmployeeName(employee, 'full'),
                formal: this.formatEmployeeName(employee, 'formal'),
            },
        };
    }

    /**
     * Fetch and format employees for frontend
     * @param searchQuery - Optional search term
     * @param employeeNumber - Optional specific employee number
     */
    async getFormattedEmployees(
        searchQuery?: string,
        employeeNumber?: string
    ): Promise<EmployeeServiceResult<FormattedEmployee[]>> {
        try {
            let result: EmployeeServiceResult<HREmployee | HREmployee[]>;

            if (employeeNumber) {
                result = await this.getEmployeeByNumber(employeeNumber);
                if (!result.success || !result.data) {
                    return { success: false, error: result.error || 'Employee not found' };
                }
                return {
                    success: true,
                    data: [this.formatEmployeeWithNames(result.data as HREmployee)],
                };
            } else {
                result = await this.getEmployees(searchQuery);
                if (!result.success || !result.data) {
                    return { success: false, error: result.error || 'Failed to fetch employees' };
                }
                const employees = Array.isArray(result.data) ? result.data : [result.data];
                return {
                    success: true,
                    data: employees.map((emp) => this.formatEmployeeWithNames(emp)),
                };
            }
        } catch (error: any) {
            logger.error('[EmployeeService] Error in getFormattedEmployees:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

export const employeeService = new EmployeeService();
export default employeeService;
