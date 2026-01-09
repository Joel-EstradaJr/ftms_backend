/**
 * Revenue Controller
 * Handles HTTP request/response for revenue management endpoints
 * Schema-aligned with actual database structure
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { revenueService } from '../services/revenue.service';
import type { RevenueCreateData, RevenueUpdateData, RevenueListFilters } from '../services/revenue.service';

export class RevenueController {
  /**
   * GET /api/v1/admin/revenues
   * List revenues with pagination, filtering, and search
   */
  async listRevenues(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      logger.info('[RevenueController] List revenues request', {
        query: req.query,
        user: req.user,
      });

      const filters: RevenueListFilters = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        revenueType: req.query.revenueType as any,
        department: req.query.department as string,
        sourceRefNo: req.query.sourceRefNo as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        isVerified: req.query.isVerified === 'true' ? true : req.query.isVerified === 'false' ? false : undefined,
        isDeleted: req.query.isDeleted === 'true' ? true : false,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await revenueService.listRevenues(filters);

      res.json(result);
    } catch (error) {
      logger.error('[RevenueController] Error listing revenues:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/revenues/:id
   * Get a single revenue by ID
   */
  async getRevenueById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid revenue ID' });
      }

      logger.info(`[RevenueController] Get revenue by ID: ${id}`);

      const revenue = await revenueService.getRevenueById(id);
      res.json({ revenue });
    } catch (error) {
      logger.error(`[RevenueController] Error getting revenue:`, error);
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/revenues
   * Create a new revenue
   */
  async createRevenue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      logger.info('[RevenueController] Create revenue request', {
        body: req.body,
        user: req.user,
      });

      const userId = req.user?.sub || 'system';
      const ipAddress = req.ip || req.socket.remoteAddress;
      
      const data: RevenueCreateData = req.body;
      const revenue = await revenueService.createRevenue(data, userId, ipAddress);

      res.status(201).json({
        message: 'Revenue created successfully',
        revenue,
      });
    } catch (error) {
      logger.error('[RevenueController] Error creating revenue:', error);
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/revenues/:id
   * Update an existing revenue
   */
  async updateRevenue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid revenue ID' });
      }

      logger.info(`[RevenueController] Update revenue ${id}`, {
        body: req.body,
        user: req.user,
      });

      const userId = req.user?.sub || 'system';
      const ipAddress = req.ip || req.socket.remoteAddress;
      
      const data: RevenueUpdateData = req.body;
      const revenue = await revenueService.updateRevenue(id, data, userId, ipAddress);

      res.json({
        message: 'Revenue updated successfully',
        revenue,
      });
    } catch (error) {
      logger.error(`[RevenueController] Error updating revenue:`, error);
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/revenues/:id
   * Delete a revenue (soft delete)
   */
  async deleteRevenue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid revenue ID' });
      }

      logger.info(`[RevenueController] Delete revenue ${id}`, {
        user: req.user,
      });

      const userId = req.user?.sub || 'system';
      const ipAddress = req.ip || req.socket.remoteAddress;
      
      const deletedRevenue = await revenueService.deleteRevenue(id, userId, ipAddress);

      res.json({
        message: 'Revenue deleted successfully',
        revenue: deletedRevenue,
      });
    } catch (error) {
      logger.error(`[RevenueController] Error deleting revenue:`, error);
      next(error);
    }
  }
}

// Export singleton instance
export const revenueController = new RevenueController();
