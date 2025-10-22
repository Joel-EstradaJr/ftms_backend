import { Response, NextFunction } from 'express';
import { JournalEntryService } from '../services/journalEntry.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class JournalEntryController {
  private service = new JournalEntryService();

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { referenceNo, entryDate, description, debitAmount, creditAmount, accountCode, linkedEntityType, linkedEntityId } = req.body;

      // Validation
      if (!referenceNo || !entryDate || !description || !debitAmount || !creditAmount) {
        throw new ValidationError(
          'Missing required fields: referenceNo, entryDate, description, debitAmount, creditAmount'
        );
      }

      const result = await this.service.createJournalEntry(
        { referenceNo, entryDate, description, debitAmount, creditAmount, accountCode, linkedEntityType, linkedEntityId },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({ success: true, message: 'Journal entry created successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.service.listJournalEntries(req.query, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid journal entry ID');

      const result = await this.service.getJournalEntryById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid journal entry ID');

      const result = await this.service.updateJournalEntry(id, req.body, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Journal entry updated successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) throw new ValidationError('Invalid journal entry ID');
      if (!reason) throw new ValidationError('Deletion reason is required');

      await this.service.deleteJournalEntry(id, req.user!.sub, reason, req.user, req);
      res.json({ success: true, message: 'Journal entry deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}
