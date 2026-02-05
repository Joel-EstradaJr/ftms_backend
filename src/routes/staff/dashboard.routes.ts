/**
 * STAFF DASHBOARD ROUTES
 * 
 * Staff-side dashboard routes - identical to admin dashboard
 * Base URL: /api/v1/staff/dashboard
 */
import { Router } from 'express';
import { getDashboardSummary, getForecastData } from '../../controllers/dashboard.controller';

const router = Router();

// GET /api/v1/staff/dashboard/summary - Get dashboard summary
router.get('/summary', getDashboardSummary);

// GET /api/v1/staff/dashboard/forecast-data - Get forecast data for predictive analytics
router.get('/forecast-data', getForecastData);

export default router;
