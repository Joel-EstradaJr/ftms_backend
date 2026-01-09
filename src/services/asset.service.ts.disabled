import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';

export class AssetService {
  /**
   * Create a new asset
   */
  async createAsset(data: any, userId: string, userInfo?: any, req?: any) {
    try {
      const asset = await prisma.asset.create({
        data: {
          assetCode: data.assetCode,
          assetName: data.assetName,
          category: data.category,
          acquisitionDate: new Date(data.acquisitionDate),
          acquisitionCost: data.acquisitionCost.toString(),
          depreciationRate: data.depreciationRate?.toString(),
          salvageValue: data.salvageValue?.toString() || '0',
          currentValue: data.acquisitionCost.toString(),
          status: 'active',
          createdBy: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Asset Management',
        { id: asset.id, code: asset.assetCode },
        asset,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Asset created: ${asset.assetCode}`);
      return asset;
    } catch (error) {
      logger.error('Error creating asset:', error);
      throw error;
    }
  }

  /**
   * List assets with filtering and pagination
   */
  async listAssets(filters: any, page = 1, limit = 10) {
    try {
      const where: any = { isDeleted: false };

      if (filters.category) where.category = filters.category;
      if (filters.status) where.status = filters.status;

      const skip = (page - 1) * limit;
      const [assets, total] = await Promise.all([
        prisma.asset.findMany({
          where,
          skip,
          take: limit,
          orderBy: { acquisitionDate: 'desc' },
        }),
        prisma.asset.count({ where }),
      ]);

      return {
        data: assets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing assets:', error);
      throw error;
    }
  }

  /**
   * Get an asset by ID
   */
  async getAssetById(id: number) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.isDeleted) {
      throw new NotFoundError(`Asset ${id} not found`);
    }
    return asset;
  }

  /**
   * Update an asset
   */
  async updateAsset(id: number, updates: any, userId: string, userInfo?: any, req?: any) {
    try {
      const oldAsset = await this.getAssetById(id);

      const updateData: any = { ...updates, updatedBy: userId };
      if (updates.acquisitionCost) updateData.acquisitionCost = updates.acquisitionCost.toString();
      if (updates.currentValue) updateData.currentValue = updates.currentValue.toString();
      if (updates.depreciationRate) updateData.depreciationRate = updates.depreciationRate.toString();
      if (updates.salvageValue) updateData.salvageValue = updates.salvageValue.toString();
      if (updates.acquisitionDate) updateData.acquisitionDate = new Date(updates.acquisitionDate);

      const newAsset = await prisma.asset.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Asset Management',
        { id, code: newAsset.assetCode },
        oldAsset,
        newAsset,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Asset updated: ${newAsset.assetCode}`);
      return newAsset;
    } catch (error) {
      logger.error('Error updating asset:', error);
      throw error;
    }
  }

  /**
   * Soft delete an asset
   */
  async deleteAsset(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const asset = await this.getAssetById(id);

      await prisma.asset.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        },
      });

      await AuditLogClient.logDelete(
        'Asset Management',
        { id, code: asset.assetCode },
        asset,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        reason,
        req
      );

      logger.info(`Asset deleted: ${asset.assetCode}`);
    } catch (error) {
      logger.error('Error deleting asset:', error);
      throw error;
    }
  }

  /**
   * Calculate depreciation for an asset
   */
  async calculateDepreciation(id: number) {
    try {
      const asset = await this.getAssetById(id);

      // Simple straight-line depreciation
      const acquisitionCost = parseFloat(asset.acquisitionCost.toString());
      const salvageValue = parseFloat(asset.salvageValue?.toString() || '0');
      const depreciationRate = parseFloat(asset.depreciationRate?.toString() || '0');

      if (!depreciationRate || depreciationRate <= 0) {
        throw new ValidationError('Asset must have a valid depreciation rate');
      }

      const yearsSinceAcquisition =
        (new Date().getFullYear() - new Date(asset.acquisitionDate).getFullYear());
      const annualDepreciation = (acquisitionCost - salvageValue) * (depreciationRate / 100);
      const accumulatedDepreciation = Math.min(
        annualDepreciation * yearsSinceAcquisition,
        acquisitionCost - salvageValue
      );
      const currentValue = Math.max(acquisitionCost - accumulatedDepreciation, salvageValue);

      return {
        assetId: id,
        assetCode: asset.assetCode,
        acquisitionCost: asset.acquisitionCost,
        depreciationRate: asset.depreciationRate,
        annualDepreciation,
        accumulatedDepreciation,
        currentValue,
        salvageValue: asset.salvageValue,
        yearsSinceAcquisition,
      };
    } catch (error) {
      logger.error('Error calculating depreciation:', error);
      throw error;
    }
  }
}
