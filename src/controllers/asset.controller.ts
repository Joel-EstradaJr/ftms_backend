import { Response, NextFunction } from 'express';
import { AssetService } from '../services/asset.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class AssetController {
  private service = new AssetService();

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { assetCode, assetName, category, acquisitionDate, acquisitionCost, depreciationRate, salvageValue } =
        req.body;

      // Validation
      if (!assetCode || !assetName || !category || !acquisitionDate || !acquisitionCost) {
        throw new ValidationError(
          'Missing required fields: assetCode, assetName, category, acquisitionDate, acquisitionCost'
        );
      }

      const result = await this.service.createAsset(
        { assetCode, assetName, category, acquisitionDate, acquisitionCost, depreciationRate, salvageValue },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({ success: true, message: 'Asset created successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.service.listAssets(req.query, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid asset ID');

      const result = await this.service.getAssetById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid asset ID');

      const result = await this.service.updateAsset(id, req.body, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Asset updated successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) throw new ValidationError('Invalid asset ID');
      if (!reason) throw new ValidationError('Deletion reason is required');

      await this.service.deleteAsset(id, req.user!.sub, reason, req.user, req);
      res.json({ success: true, message: 'Asset deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  calculateDepreciation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid asset ID');

      const result = await this.service.calculateDepreciation(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
