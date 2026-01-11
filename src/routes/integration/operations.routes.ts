/**
 * OPERATIONS INTEGRATION ROUTES
 * Handles bus trip and rental trip data synchronization from external Operations system
 */

import { Router } from 'express';
import { OperationsTripController } from '@/controllers/integration/operations.controller';

const router = Router();
const controller = new OperationsTripController();

// Bus Trips (Operational Trips)
router.post('/sync-trips', (req, res) => controller.syncTrips(req, res));
router.post('/fetch-and-sync-bus-trips', (req, res) => controller.fetchAndSyncBusTrips(req, res));
router.get('/unrecorded-trips', (req, res) => controller.getUnrecordedTrips(req, res));

// Rental Trips
router.post('/sync-rental-trips', (req, res) => controller.syncRentalTrips(req, res));
router.post('/fetch-and-sync-rental-trips', (req, res) => controller.fetchAndSyncRentalTrips(req, res));
router.get('/unrecorded-rental-trips', (req, res) => controller.getUnrecordedRentalTrips(req, res));
router.get('/rental-trips/by-status', (req, res) => controller.getRentalTripsByStatus(req, res));

export default router;
