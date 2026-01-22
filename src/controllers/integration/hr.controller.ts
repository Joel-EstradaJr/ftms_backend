/**
 * HR INTEGRATION CONTROLLER
 * Handles employee data synchronization from external HR system
 */

import { Request, Response } from 'express';
import { 
  syncEmployeesBulk, 
  fetchAndSyncEmployeesFromHR,
  getEmployeesByDepartment,
  getEmployeesByPosition
} from '../../../lib/hr/employeeSync';

export class HRIntegrationController {
  /**
   * POST /api/integration/hr/sync-employees
   * Sync employees from external HR system (manual payload)
   * 
   * Request Body: { employees: ExternalEmployeePayload[] }
   */
  async syncEmployees(req: Request, res: Response): Promise<void> {
    try {
      const { employees } = req.body;

      if (!Array.isArray(employees) || employees.length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Request body must contain a non-empty employees array',
        });
        return;
      }

      const result = await syncEmployeesBulk(employees);

      res.status(200).json({
        message: 'Employee sync completed',
        summary: {
          total: employees.length,
          success: result.success,
          failed: result.failed,
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      console.error('Error in syncEmployees:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/integration/hr/fetch-and-sync
   * Fetch employees from HR API and sync automatically
   */
  async fetchAndSync(req: Request, res: Response): Promise<void> {
    try {
      const result = await fetchAndSyncEmployeesFromHR();

      if (!result.success) {
        res.status(500).json({
          error: 'Sync failed',
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        message: 'Employees fetched and synced successfully',
        summary: {
          total: result.total,
          synced: result.synced,
          failed: result.failed,
        },
        errors: result.errors && result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      console.error('Error in fetchAndSync:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/integration/hr/employees/by-department/:departmentId
   * Get employees by department
   */
  async getByDepartment(req: Request, res: Response): Promise<void> {
    try {
      const departmentId = parseInt(req.params.departmentId);

      if (isNaN(departmentId)) {
        res.status(400).json({
          error: 'Invalid department ID',
          message: 'Department ID must be a number',
        });
        return;
      }

      const employees = await getEmployeesByDepartment(departmentId);

      res.status(200).json({
        message: 'Employees retrieved',
        count: employees.length,
        data: employees,
      });
    } catch (error) {
      console.error('Error in getByDepartment:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/integration/hr/employees/by-position
   * Get employees by position
   * Query param: position (string)
   */
  async getByPosition(req: Request, res: Response): Promise<void> {
    try {
      const { position } = req.query;

      if (!position || typeof position !== 'string') {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Position query parameter is required',
        });
        return;
      }

      const employees = await getEmployeesByPosition(position);

      res.status(200).json({
        message: 'Employees retrieved',
        count: employees.length,
        data: employees,
      });
    } catch (error) {
      console.error('Error in getByPosition:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
