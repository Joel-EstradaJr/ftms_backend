// ==================== JOURNAL ENTRY VALIDATION FUNCTIONS ====================

import { ValidationResult, JournalEntryLine, EntryType, JournalStatus, UserRole } from '@/app/types/jev';

/**
 * Validate double-entry bookkeeping (debits = credits)
 */
export const validateJournalBalance = (lines: JournalEntryLine[]): ValidationResult => {
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push('Journal entry must have at least 2 lines (debit and credit)');
  }

  const totalDebits = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

  const difference = Math.abs(totalDebits - totalCredits);
  if (difference > 0.01) {
    // Allow 1 cent tolerance for rounding
    errors.push(
      `Journal entry is not balanced. Total Debits: ₱${totalDebits.toFixed(2)}, Total Credits: ₱${totalCredits.toFixed(2)}, Difference: ₱${difference.toFixed(2)}`
    );
  }

  // Validate each line
  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Check account is selected
    if (!line.account_id) {
      errors.push(`Line ${lineNumber}: Account is required`);
    }

    // Check that line has either debit or credit (not both, not neither)
    const hasDebit = line.debit_amount !== undefined && line.debit_amount > 0;
    const hasCredit = line.credit_amount !== undefined && line.credit_amount > 0;

    if (hasDebit && hasCredit) {
      errors.push(`Line ${lineNumber}: Cannot have both debit and credit amounts`);
    } else if (!hasDebit && !hasCredit) {
      errors.push(`Line ${lineNumber}: Must have either debit or credit amount`);
    }

    // Check for negative amounts
    if ((line.debit_amount || 0) < 0) {
      errors.push(`Line ${lineNumber}: Debit amount cannot be negative`);
    }
    if ((line.credit_amount || 0) < 0) {
      errors.push(`Line ${lineNumber}: Credit amount cannot be negative`);
    }

    // Check for zero amounts
    if (line.debit_amount === 0 || line.credit_amount === 0) {
      errors.push(`Line ${lineNumber}: Amount must be greater than zero`);
    }
  });

  return { valid: errors.length === 0, errors };
};

/**
 * Validate journal entry description
 */
export const validateJournalDescription = (description: string): ValidationResult => {
  const errors: string[] = [];

  if (!description || description.trim() === '') {
    errors.push('Description is required');
  } else if (description.trim().length < 5) {
    errors.push('Description must be at least 5 characters');
  } else if (description.trim().length > 500) {
    errors.push('Description must not exceed 500 characters');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate transaction date
 */
export const validateTransactionDate = (date: string): ValidationResult => {
  const errors: string[] = [];

  if (!date) {
    errors.push('Transaction date is required');
  } else {
    const transactionDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (isNaN(transactionDate.getTime())) {
      errors.push('Invalid transaction date');
    } else if (transactionDate > today) {
      errors.push('Transaction date cannot be in the future');
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate journal entry edit permissions
 */
export const validateJournalEditPermission = (
  entryType: EntryType,
  status: JournalStatus,
  userRole: UserRole
): ValidationResult => {
  const errors: string[] = [];

  // Only Finance Admin can edit
  if (userRole !== UserRole.FINANCE_ADMIN) {
    errors.push('Insufficient permissions. Only Finance Administrators can edit journal entries.');
    return { valid: false, errors };
  }

  // Auto-generated entries cannot be edited if posted
  if (entryType !== EntryType.MANUAL && status === JournalStatus.POSTED) {
    errors.push('Cannot edit auto-generated posted entries. Create a reversing entry instead.');
  }

  // Reversed entries cannot be edited
  if (status === JournalStatus.REVERSED) {
    errors.push('Cannot edit reversed entries');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate journal entry deletion permissions
 */
export const validateJournalDeletePermission = (
  entryType: EntryType,
  status: JournalStatus,
  userRole: UserRole
): ValidationResult => {
  const errors: string[] = [];

  // Only Finance Admin can delete
  if (userRole !== UserRole.FINANCE_ADMIN) {
    errors.push('Insufficient permissions. Only Finance Administrators can delete journal entries.');
    return { valid: false, errors };
  }

  // Auto-generated entries cannot be deleted
  if (entryType !== EntryType.MANUAL) {
    errors.push('Cannot delete auto-generated entries. Create a reversing entry instead.');
  }

  // Posted entries cannot be deleted
  if (status === JournalStatus.POSTED) {
    errors.push('Cannot delete posted entries. Create a reversing entry instead.');
  }

  // Reversed entries cannot be deleted
  if (status === JournalStatus.REVERSED) {
    errors.push('Cannot delete reversed entries');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate complete journal entry form
 */
export const validateJournalEntryForm = (
  formData: {
    transaction_date: string;
    description: string;
    journal_lines: JournalEntryLine[];
  }
): ValidationResult => {
  const allErrors: string[] = [];

  // Validate transaction date
  const dateResult = validateTransactionDate(formData.transaction_date);
  allErrors.push(...dateResult.errors);

  // Validate description
  const descResult = validateJournalDescription(formData.description);
  allErrors.push(...descResult.errors);

  // Validate journal balance
  const balanceResult = validateJournalBalance(formData.journal_lines);
  allErrors.push(...balanceResult.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
};

/**
 * Check if user can create manual journal entries
 */
export const canCreateManualJE = (userRole: UserRole): boolean => {
  return userRole === UserRole.FINANCE_ADMIN;
};

/**
 * Check if user can view journal entries
 */
export const canViewJE = (userRole: UserRole): boolean => {
  return [UserRole.FINANCE_ADMIN, UserRole.FINANCE_STAFF, UserRole.DEPARTMENT_HEAD].includes(
    userRole
  );
};

/**
 * Validate reversal entry
 */
export const validateReversalEntry = (
  originalEntry: {
    status: JournalStatus;
    reversed_by_id?: string;
  }
): ValidationResult => {
  const errors: string[] = [];

  if (originalEntry.status === JournalStatus.DRAFT) {
    errors.push('Cannot reverse draft entries. Delete the draft instead.');
  }

  if (originalEntry.status === JournalStatus.REVERSED) {
    errors.push('This entry has already been reversed');
  }

  if (originalEntry.reversed_by_id) {
    errors.push('This entry has already been reversed');
  }

  return { valid: errors.length === 0, errors };
};
