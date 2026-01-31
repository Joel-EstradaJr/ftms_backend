import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Finance Controller
 * Handles finance system integration endpoints
 */

/**
 * Get Payroll Integration Data
 * 
 * Returns employee payroll data formatted for external Finance system integration
 * 
 * @route GET /finance/v2/payroll-integration
 * @access Protected (JWT required)
 */
export const getPayrollIntegrationData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and validate query parameters
    const {
      payroll_period_start,
      payroll_period_end,
      employee_number,
    } = req.query;

    // Validation
    const errors: Array<{ field: string; message: string }> = [];

    // Validate required parameters
    if (!payroll_period_start) {
      errors.push({
        field: 'payroll_period_start',
        message: 'This field is required',
      });
    }

    if (!payroll_period_end) {
      errors.push({
        field: 'payroll_period_end',
        message: 'This field is required',
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (payroll_period_start && !dateRegex.test(payroll_period_start as string)) {
      errors.push({
        field: 'payroll_period_start',
        message: 'Invalid date format. Expected YYYY-MM-DD',
      });
    }

    if (payroll_period_end && !dateRegex.test(payroll_period_end as string)) {
      errors.push({
        field: 'payroll_period_end',
        message: 'Invalid date format. Expected YYYY-MM-DD',
      });
    }

    // Validate date range
    if (
      payroll_period_start &&
      payroll_period_end &&
      dateRegex.test(payroll_period_start as string) &&
      dateRegex.test(payroll_period_end as string)
    ) {
      const startDate = new Date(payroll_period_start as string);
      const endDate = new Date(payroll_period_end as string);

      if (endDate <= startDate) {
        errors.push({
          field: 'payroll_period_end',
          message: 'End date must be after start date',
        });
      }

      // Check if dates are not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate > today) {
        errors.push({
          field: 'payroll_period_start',
          message: 'Start date cannot be in the future',
        });
      }

      if (endDate > today) {
        errors.push({
          field: 'payroll_period_end',
          message: 'End date cannot be in the future',
        });
      }
    }

    // Validate employee number format (if provided)
    if (employee_number) {
      const empNumberRegex = /^EMP-\d{4}-\d{3}$/;
      if (!empNumberRegex.test(employee_number as string)) {
        errors.push({
          field: 'employee_number',
          message: 'Invalid employee number format. Expected EMP-YYYY-XXX',
        });
      }
    }

    // Return validation errors if any
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Log the request
    logger.info('Payroll integration data requested', {
      payroll_period_start,
      payroll_period_end,
      employee_number,
    });

    // TODO: Replace with actual database query
    // For now, return mock data
    const mockData = generateMockPayrollData(
      payroll_period_start as string,
      payroll_period_end as string,
      employee_number as string | undefined
    );

    // Return success response
    res.status(200).json(mockData);
  } catch (error) {
    logger.error('Error fetching payroll integration data:', error);
    next(error);
  }
};

/**
 * Generate mock payroll data
 * TODO: Replace with actual database query
 */
const generateMockPayrollData = (
  startDate: string,
  endDate: string,
  employeeNumber?: string
) => {
  const mockEmployees = [
    {
      employee_number: 'EMP-2024-001',
      employee_name: 'John Doe',
      department: 'Engineering',
      gross_pay: 75000.0,
      deductions: 15000.0,
      net_pay: 60000.0,
      tax_withheld: 10000.0,
      benefits: 5000.0,
    },
    {
      employee_number: 'EMP-2024-002',
      employee_name: 'Jane Smith',
      department: 'Finance',
      gross_pay: 80000.0,
      deductions: 16000.0,
      net_pay: 64000.0,
      tax_withheld: 11000.0,
      benefits: 5000.0,
    },
    {
      employee_number: 'EMP-2024-003',
      employee_name: 'Bob Johnson',
      department: 'Operations',
      gross_pay: 70000.0,
      deductions: 14000.0,
      net_pay: 56000.0,
      tax_withheld: 9000.0,
      benefits: 5000.0,
    },
    {
      employee_number: 'EMP-2024-004',
      employee_name: 'Alice Williams',
      department: 'HR',
      gross_pay: 72000.0,
      deductions: 14400.0,
      net_pay: 57600.0,
      tax_withheld: 9600.0,
      benefits: 4800.0,
    },
    {
      employee_number: 'EMP-2024-005',
      employee_name: 'Charlie Brown',
      department: 'Marketing',
      gross_pay: 68000.0,
      deductions: 13600.0,
      net_pay: 54400.0,
      tax_withheld: 9000.0,
      benefits: 4600.0,
    },
  ];

  // Filter by employee number if provided
  const filteredEmployees = employeeNumber
    ? mockEmployees.filter((emp) => emp.employee_number === employeeNumber)
    : mockEmployees;

  // Calculate summary
  const summary = {
    total_employees: filteredEmployees.length,
    total_gross_pay: filteredEmployees.reduce((sum, emp) => sum + emp.gross_pay, 0),
    total_deductions: filteredEmployees.reduce((sum, emp) => sum + emp.deductions, 0),
    total_net_pay: filteredEmployees.reduce((sum, emp) => sum + emp.net_pay, 0),
  };

  return {
    success: true,
    data: {
      payroll_period: {
        start_date: startDate,
        end_date: endDate,
      },
      employees: filteredEmployees,
      summary,
    },
    metadata: {
      generated_at: new Date().toISOString(),
      generated_by: 'FTMS System',
      record_count: filteredEmployees.length,
    },
  };
};
