import { Response, NextFunction } from 'express';
import { JournalEntryAutoService } from '../services/journalEntryAuto.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

/**
 * Journal Entry Auto Controller
 * 
 * Handles all journal entry operations for the automated JE system:
 * - Auto-generated entries (from any module)
 * - Adjustments (linked to original POSTED JE)
 * - Reversals (linked to original POSTED JE)
 * - CRUD operations (edit/delete only for DRAFT)
 */
export class JournalEntryAutoController {
  private service = new JournalEntryAutoService();

  // --------------------------------------------------------------------------
  // CREATE AUTO-GENERATED JOURNAL ENTRY
  // POST /api/journal-entry/auto
  // --------------------------------------------------------------------------
  createAuto = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { module, reference_id, description, date, entries } = req.body;

      // Validation
      if (!module || typeof module !== 'string') {
        throw new ValidationError('Missing required field: module (string)');
      }
      if (!reference_id || typeof reference_id !== 'string') {
        throw new ValidationError('Missing required field: reference_id (string)');
      }
      if (!description || typeof description !== 'string') {
        throw new ValidationError('Missing required field: description (string)');
      }
      if (!date || typeof date !== 'string') {
        throw new ValidationError('Missing required field: date (string in YYYY-MM-DD format)');
      }
      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        throw new ValidationError('Missing required field: entries (array of journal entry lines)');
      }

      // Validate each entry line
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.account_code || typeof entry.account_code !== 'string') {
          throw new ValidationError(`Entry ${i + 1}: Missing required field account_code (string)`);
        }
        if (typeof entry.debit !== 'number' || entry.debit < 0) {
          throw new ValidationError(`Entry ${i + 1}: debit must be a non-negative number`);
        }
        if (typeof entry.credit !== 'number' || entry.credit < 0) {
          throw new ValidationError(`Entry ${i + 1}: credit must be a non-negative number`);
        }
      }

      const result = await this.service.createAutoJournalEntry(
        { module, reference_id, description, date, entries },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({
        success: true,
        message: 'Auto-generated journal entry created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // CREATE ADJUSTMENT JOURNAL ENTRY
  // POST /api/journal-entry/adjustment
  // --------------------------------------------------------------------------
  createAdjustment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { adjustment_of_id, module, reference_id, description, date, entries } = req.body;

      // Validation
      if (!adjustment_of_id || typeof adjustment_of_id !== 'number') {
        throw new ValidationError('Missing required field: adjustment_of_id (number - ID of original POSTED JE)');
      }
      if (!module || typeof module !== 'string') {
        throw new ValidationError('Missing required field: module (string)');
      }
      if (!reference_id || typeof reference_id !== 'string') {
        throw new ValidationError('Missing required field: reference_id (string)');
      }
      if (!description || typeof description !== 'string') {
        throw new ValidationError('Missing required field: description (string)');
      }
      if (!date || typeof date !== 'string') {
        throw new ValidationError('Missing required field: date (string in YYYY-MM-DD format)');
      }
      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        throw new ValidationError('Missing required field: entries (array of journal entry lines)');
      }

      // Validate each entry line
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.account_code || typeof entry.account_code !== 'string') {
          throw new ValidationError(`Entry ${i + 1}: Missing required field account_code (string)`);
        }
        if (typeof entry.debit !== 'number' || entry.debit < 0) {
          throw new ValidationError(`Entry ${i + 1}: debit must be a non-negative number`);
        }
        if (typeof entry.credit !== 'number' || entry.credit < 0) {
          throw new ValidationError(`Entry ${i + 1}: credit must be a non-negative number`);
        }
      }

      const result = await this.service.createAdjustmentJournalEntry(
        { adjustment_of_id, module, reference_id, description, date, entries },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({
        success: true,
        message: 'Adjustment journal entry created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // CREATE REVERSAL JOURNAL ENTRY
  // POST /api/journal-entry/reversal
  // --------------------------------------------------------------------------
  createReversal = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reversal_of_id, reason, date } = req.body;

      // Validation
      if (!reversal_of_id || typeof reversal_of_id !== 'number') {
        throw new ValidationError('Missing required field: reversal_of_id (number - ID of original POSTED JE)');
      }
      if (!reason || typeof reason !== 'string') {
        throw new ValidationError('Missing required field: reason (string - reason for reversal)');
      }

      const result = await this.service.createReversalJournalEntry(
        { reversal_of_id, reason, date },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({
        success: true,
        message: 'Reversal journal entry created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // POST JOURNAL ENTRY (DRAFT -> POSTED)
  // POST /api/journal-entry/:id/post
  // --------------------------------------------------------------------------
  postEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid journal entry ID');
      }

      const result = await this.service.postJournalEntry(
        id,
        req.user!.sub,
        req.user,
        req
      );

      res.json({
        success: true,
        message: 'Journal entry posted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // UPDATE DRAFT JOURNAL ENTRY
  // PATCH /api/journal-entry/:id
  // --------------------------------------------------------------------------
  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid journal entry ID');
      }

      const { description, date, entries } = req.body;

      // Validate entries if provided
      if (entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
          throw new ValidationError('entries must be a non-empty array of journal entry lines');
        }

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          if (!entry.account_code || typeof entry.account_code !== 'string') {
            throw new ValidationError(`Entry ${i + 1}: Missing required field account_code (string)`);
          }
          if (typeof entry.debit !== 'number' || entry.debit < 0) {
            throw new ValidationError(`Entry ${i + 1}: debit must be a non-negative number`);
          }
          if (typeof entry.credit !== 'number' || entry.credit < 0) {
            throw new ValidationError(`Entry ${i + 1}: credit must be a non-negative number`);
          }
        }
      }

      const result = await this.service.updateDraftJournalEntry(
        id,
        { description, date, entries },
        req.user!.sub,
        req.user,
        req
      );

      res.json({
        success: true,
        message: 'Journal entry updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // DELETE DRAFT JOURNAL ENTRY (SOFT DELETE)
  // DELETE /api/journal-entry/:id
  // --------------------------------------------------------------------------
  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid journal entry ID');
      }

      const { reason } = req.body;
      if (!reason || typeof reason !== 'string') {
        throw new ValidationError('Missing required field: reason (string - reason for deletion)');
      }

      const result = await this.service.deleteJournalEntry(
        id,
        reason,
        req.user!.sub,
        req.user,
        req
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // GET JOURNAL ENTRY BY ID
  // GET /api/journal-entry/:id
  // --------------------------------------------------------------------------
  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid journal entry ID');
      }

      const result = await this.service.getJournalEntryById(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // LIST JOURNAL ENTRIES
  // GET /api/journal-entry
  // --------------------------------------------------------------------------
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters = {
        status: req.query.status as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        module: req.query.module as string,
        reference: req.query.reference as string,
        code: req.query.code as string,
        includeDeleted: req.query.includeDeleted === 'true',
      };

      const result = await this.service.listJournalEntries(filters, page, limit);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };
}
