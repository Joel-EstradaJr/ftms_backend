import { Request, Response, NextFunction } from 'express';
import { DashboardService, DateFilter } from '../services/dashboard.service';
import { logger } from '../config/logger';

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard summary and forecast data endpoints
 */

/**
 * @swagger
 * /api/v1/dashboard/summary:
 *   get:
 *     summary: Get dashboard summary with revenue and expense totals
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: dateFilter
 *         schema:
 *           type: string
 *           enum: [Day, Month, Year, Custom, '']
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Dashboard summary
 */
export async function getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
        const filter: DateFilter = {
            dateFilter: req.query.dateFilter as DateFilter['dateFilter'],
            dateFrom: req.query.dateFrom as string,
            dateTo: req.query.dateTo as string,
        };

        const summary = await DashboardService.getDashboardSummary(filter);

        res.json({
            success: true,
            data: summary,
        });
    } catch (error) {
        logger.error('Error fetching dashboard summary:', error);
        next(error);
    }
}

/**
 * @swagger
 * /api/v1/dashboard/forecast-data:
 *   get:
 *     summary: Get monthly aggregates for predictive analytics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of months of historical data
 *     responses:
 *       200:
 *         description: Forecast data with monthly aggregates
 */
export async function getForecastData(req: Request, res: Response, next: NextFunction) {
    try {
        const months = parseInt(req.query.months as string) || 12;
        const data = await DashboardService.getForecastData(months);

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        logger.error('Error fetching forecast data:', error);
        next(error);
    }
}
