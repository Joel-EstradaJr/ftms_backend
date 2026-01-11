/**
 * OPERATIONAL TRIP SYNC API ENDPOINT
 * 
 * Receives bus trip data from external Operations system
 * Endpoint: POST /api/integration/operations/sync-trips
 */

import { Request, Response } from 'express';
import { 
  syncOperationalTripsBulk, 
  getUnrecordedTrips,
  fetchAndSyncBusTripsFromOperations
} from '@/lib/operations/operationalTripSync';
import {
  syncRentalTripsBulk,
  getUnrecordedRentalTrips,
  getRentalTripsByStatus,
  fetchAndSyncRentalTripsFromOperations
} from '@/lib/operations/rentalTripSync';

export class OperationsTripController {
  /**
   * POST /api/integration/operations/sync-trips
   * Sync bus trips from external Operations system
   * 
   * Request Body: Array of trip objects
   * [
   *   {
   *     assignment_id: "BA-xyz",
   *     bus_trip_id: "BT-abc",
   *     bus_route: "Sapang Palay - PITX",
   *     is_revenue_recorded: false,
   *     is_expense_recorded: false,
   *     date_assigned: "2026-01-11T02:00:00.000Z",
   *     trip_fuel_expense: 320,
   *     trip_revenue: 2200,
   *     assignment_type: "PERCENTAGE",
   *     assignment_value: 0.22,
   *     payment_method: "Reimbursement",
   *     employee_driver: null,
   *     employee_conductor: null,
   *     bus_plate_number: "MPH 7643",
   *     bus_type: "Aircon",
   *     body_number: null
   *   }
   * ]
   */
  async syncTrips(req: Request, res: Response): Promise<void> {
    try {
      const trips = req.body;

      // Validate input
      if (!Array.isArray(trips) || trips.length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Request body must be a non-empty array of trip objects',
        });
        return;
      }

      // Validate required fields
      for (const trip of trips) {
        if (!trip.assignment_id || !trip.bus_trip_id) {
          res.status(400).json({
            error: 'Validation error',
            message: 'Each trip must have assignment_id and bus_trip_id',
          });
          return;
        }
      }

      // Sync trips
      const result = await syncOperationalTripsBulk(trips);

      // Return results
      res.status(200).json({
        message: 'Trip sync completed',
        summary: {
          total: trips.length,
          success: result.success,
          failed: result.failed,
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      console.error('Error in syncTrips:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/integration/operations/unrecorded-trips
   * Get trips that haven't been recorded as revenue/expense yet
   * 
   * Query Parameters:
   * - type: 'revenue' | 'expense' | 'all' (default: 'all')
   */
  async getUnrecordedTrips(req: Request, res: Response): Promise<void> {
    try {
      const { type = 'all' } = req.query;

      const trips = await getUnrecordedTrips();

      // Filter based on type
      let filteredTrips = trips;
      if (type === 'revenue') {
        filteredTrips = trips.filter(t => !t.is_revenue_recorded);
      } else if (type === 'expense') {
        filteredTrips = trips.filter(t => !t.is_expense_recorded);
      }

      res.status(200).json({
        message: 'Unrecorded trips retrieved',
        count: filteredTrips.length,
        data: filteredTrips,
      });
    } catch (error) {
      console.error('Error in getUnrecordedTrips:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/integration/operations/fetch-and-sync-bus-trips
   * Fetch bus trips from Operations API and sync automatically
   */
  async fetchAndSyncBusTrips(req: Request, res: Response): Promise<void> {
    try {
      const result = await fetchAndSyncBusTripsFromOperations();

      if (!result.success) {
        res.status(500).json({
          error: 'Sync failed',
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        message: 'Bus trips fetched and synced successfully',
        summary: {
          total: result.total,
          synced: result.synced,
          failed: result.failed,
        },
        errors: result.errors && result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      console.error('Error in fetchAndSyncBusTrips:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/integration/operations/sync-rental-trips
   * Sync rental trips from external Operations system
   */
  async syncRentalTrips(req: Request, res: Response): Promise<void> {
    try {
      const trips = req.body;

      if (!Array.isArray(trips) || trips.length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Request body must be a non-empty array of rental trip objects',
        });
        return;
      }

      const result = await syncRentalTripsBulk(trips);

      res.status(200).json({
        message: 'Rental trip sync completed',
        summary: {
          total: trips.length,
          success: result.success,
          failed: result.failed,
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      console.error('Error in syncRentalTrips:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/integration/operations/fetch-and-sync-rental-trips
   * Fetch rental trips from Operations API and sync automatically
   */
  async fetchAndSyncRentalTrips(req: Request, res: Response): Promise<void> {
    try {
      const result = await fetchAndSyncRentalTripsFromOperations();

      if (!result.success) {
        res.status(500).json({
          error: 'Sync failed',
          message: result.error,
        });
        return;
      }

      res.status(200).json({
        message: 'Rental trips fetched and synced successfully',
        summary: {
          total: result.total,
          synced: result.synced,
          failed: result.failed,
        },
        errors: result.errors && result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      console.error('Error in fetchAndSyncRentalTrips:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/integration/operations/unrecorded-rental-trips
   * Get rental trips that haven't been recorded as revenue/expense yet
   */
  async getUnrecordedRentalTrips(req: Request, res: Response): Promise<void> {
    try {
      const { type = 'all' } = req.query;

      const trips = await getUnrecordedRentalTrips();

      let filteredTrips = trips;
      if (type === 'revenue') {
        filteredTrips = trips.filter(t => !t.is_revenue_recorded);
      } else if (type === 'expense') {
        filteredTrips = trips.filter(t => !t.is_expense_recorded);
      }

      res.status(200).json({
        message: 'Unrecorded rental trips retrieved',
        count: filteredTrips.length,
        data: filteredTrips,
      });
    } catch (error) {
      console.error('Error in getUnrecordedRentalTrips:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/integration/operations/rental-trips/by-status
   * Get rental trips by status
   * Query param: status (string)
   */
  async getRentalTripsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;

      if (!status || typeof status !== 'string') {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Status query parameter is required',
        });
        return;
      }

      const trips = await getRentalTripsByStatus(status);

      res.status(200).json({
        message: 'Rental trips retrieved',
        count: trips.length,
        data: trips,
      });
    } catch (error) {
      console.error('Error in getRentalTripsByStatus:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Example cURL requests:
 * 
 * 1. Sync trips from Operations system:
 * curl -X POST http://localhost:3000/api/integration/operations/sync-trips \
 *   -H "Content-Type: application/json" \
 *   -d '[
 *     {
 *       "assignment_id": "BA-xyz123",
 *       "bus_trip_id": "BT-abc456",
 *       "bus_route": "Sapang Palay - PITX",
 *       "is_revenue_recorded": false,
 *       "is_expense_recorded": false,
 *       "date_assigned": "2026-01-11T02:00:00.000Z",
 *       "trip_fuel_expense": 320,
 *       "trip_revenue": 2200,
 *       "assignment_type": "PERCENTAGE",
 *       "assignment_value": 0.22,
 *       "payment_method": "Reimbursement",
 *       "employee_driver": null,
 *       "employee_conductor": null,
 *       "bus_plate_number": "MPH 7643",
 *       "bus_type": "Aircon",
 *       "body_number": null
 *     }
 *   ]'
 * 
 * 2. Get unrecorded trips:
 * curl http://localhost:3000/api/integration/operations/unrecorded-trips?type=all
 */
