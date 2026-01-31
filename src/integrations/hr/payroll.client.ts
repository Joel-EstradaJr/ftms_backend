/**
 * HR Integration Client for Payroll
 * INTEGRATION LAYER: Clients/adapters for external HR microservice API
 * 
 * Responsibilities:
 * - HTTP communication with HR microservice
 * - Handle auth headers (API key)
 * - Error handling for network/API failures
 * - Request/response mapping
 * 
 * Does NOT:
 * - Contain business logic (calculations, validations)
 * - Process or transform data (done in services)
 */

import axios from 'axios';
import { HREmployeeData } from '../../types/payroll.types';
import { logger } from '../../config/logger';

export class HRPayrollClient {
  private static readonly HR_BASE_URL = process.env.HR_API_BASE_URL || 'http://localhost:3002';
  private static readonly HR_API_KEY = process.env.HR_API_KEY;

  /**
   * Get axios config with headers
   */
  private static getConfig(params?: any) {
    return {
      params,
      headers: this.HR_API_KEY ? {
        'X-API-Key': this.HR_API_KEY,
      } : undefined,
    };
  }

  /**
   * Fetch all active employees with payroll data for a specific period
   */
  static async getEmployeesForPayroll(
    periodStart: Date,
    periodEnd: Date
  ): Promise<HREmployeeData[]> {
    try {
      const response = await axios.get<HREmployeeData[]>(
        `${this.HR_BASE_URL}/api/integration/payroll/employees`,
        this.getConfig({
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        })
      );

      logger.info(`Fetched ${response.data.length} employees from HR for payroll period ${periodStart} to ${periodEnd}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching employees from HR:', error);
      throw new Error(`Failed to fetch employee data from HR: ${error}`);
    }
  }

  /**
   * Fetch specific employee payroll data
   */
  static async getEmployeePayrollData(
    employeeNumber: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<HREmployeeData> {
    try {
      const response = await axios.get<HREmployeeData>(
        `${this.HR_BASE_URL}/api/integration/payroll/employees/${employeeNumber}`,
        this.getConfig({
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        })
      );

      logger.info(`Fetched employee ${employeeNumber} data from HR for payroll`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching employee ${employeeNumber} from HR:`, error);
      throw new Error(`Failed to fetch employee ${employeeNumber} data from HR: ${error}`);
    }
  }

  /**
   * Validate if employee exists and is active
   */
  static async validateEmployee(employeeNumber: string): Promise<boolean> {
    try {
      const response = await axios.get<{ exists: boolean; isActive: boolean }>(
        `${this.HR_BASE_URL}/api/integration/employees/${employeeNumber}/validate`,
        this.getConfig()
      );

      return response.data.exists && response.data.isActive;
    } catch (error) {
      logger.error(`Error validating employee ${employeeNumber}:`, error);
      return false;
    }
  }

  /**
   * Send payroll distribution webhook to HR
   */
  static async sendPayrollDistribution(payload: any): Promise<boolean> {
    try {
      await axios.post(
        `${this.HR_BASE_URL}/finance/webhooks/payroll/distribution`,
        payload,
        this.getConfig()
      );

      logger.info(`Sent payroll distribution webhook to HR for period ${payload.payroll_period_code}`);
      return true;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      logger.error(`Error sending payroll distribution webhook to HR: ${errorMessage}`);
      // Don't throw - allow release to succeed even if webhook fails
      return false;
    }
  }
}
