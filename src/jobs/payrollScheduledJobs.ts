/**
 * Payroll Scheduled Jobs
 * 
 * Handles automatic payroll data fetching from EMS (Employee Management System)
 * Runs every Saturday at 11:00 PM to fetch weekly payroll data
 */

import cron from 'node-cron';
import { logger } from '../config/logger';
import {
    fetchAndSyncPayrollFromHR,
    getCurrentWeeklyPeriod,
} from '../../lib/hr/payrollSync';

/**
 * Initialize payroll scheduled jobs
 * Should be called after the server starts
 */
export function initPayrollScheduledJobs(): void {
    logger.info('📅 Initializing payroll scheduled jobs...');

    /**
     * Weekly Payroll Fetch Job
     * 
     * Schedule: Every Saturday at 11:00 PM (23:00)
     * Cron Expression: '0 23 * * 6'
     *   - 0: minute 0
     *   - 23: hour 23 (11 PM)
     *   - *: every day of month
     *   - *: every month
     *   - 6: Saturday (0 = Sunday, 6 = Saturday)
     * 
     * This job:
     * 1. Fetches payroll data from the EMS API Gateway
     * 2. Creates/updates payroll batch records in the database
     * 3. Calculates net pay for each employee using the formula:
     *    Net Pay = (Basic Rate × Present Days) + Benefits - Deductions
     */
    const payrollFetchJob = cron.schedule('0 23 * * 6', async () => {
        logger.info('🔄 Starting weekly payroll fetch job...');

        try {
            const { start, end } = getCurrentWeeklyPeriod();

            logger.info(`📆 Fetching payroll for period: ${start} to ${end}`);

            const result = await fetchAndSyncPayrollFromHR(start, end);

            if (result.success) {
                logger.info(`✅ Payroll fetch completed successfully`);
                logger.info(`   - Synced: ${result.synced} employees`);
                logger.info(`   - Period ID: ${result.periodId}`);
            } else {
                logger.warn(`⚠️ Payroll fetch completed with errors`);
                logger.warn(`   - Synced: ${result.synced} employees`);
                logger.warn(`   - Errors: ${result.errors.length}`);
                result.errors.forEach((err, idx) => {
                    logger.error(`   Error ${idx + 1}: ${err}`);
                });
            }
        } catch (error) {
            logger.error('❌ Payroll fetch job failed:', error);
        }
    }, {
        timezone: 'Asia/Manila' // Philippine timezone
    });

    // Start the scheduled job
    payrollFetchJob.start();

    logger.info('✅ Payroll fetch job scheduled: Every Saturday at 11:00 PM (Asia/Manila)');
}

/**
 * Manually trigger the payroll fetch job
 * Useful for testing or manual intervention
 * 
 * @param periodStart Optional custom period start (YYYY-MM-DD)
 * @param periodEnd Optional custom period end (YYYY-MM-DD)
 */
export async function triggerPayrollFetchManually(
    periodStart?: string,
    periodEnd?: string
): Promise<{ success: boolean; synced: number; errors: string[]; periodId: number }> {
    logger.info('🔧 Manually triggering payroll fetch...');

    let start: string;
    let end: string;

    if (periodStart && periodEnd) {
        start = periodStart;
        end = periodEnd;
    } else {
        const currentPeriod = getCurrentWeeklyPeriod();
        start = currentPeriod.start;
        end = currentPeriod.end;
    }

    logger.info(`📆 Fetching payroll for period: ${start} to ${end}`);

    const result = await fetchAndSyncPayrollFromHR(start, end);

    if (result.success) {
        logger.info(`✅ Manual payroll fetch completed successfully`);
    } else {
        logger.warn(`⚠️ Manual payroll fetch completed with ${result.errors.length} errors`);
    }

    return result;
}
