// ==================== JOURNAL ENTRY HELPER FUNCTIONS ====================

import { JournalEntry, JournalEntryLine, EntryType, JournalStatus } from '@/app/types/jev';

/**
 * Format journal number for display
 */
export const formatJournalNumber = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-4);
  
  return `JE-${year}-${month}-${timestamp}`;
};

/**
 * Format entry type for display
 */
export const formatEntryType = (type: EntryType): string => {
  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Get entry type color class
 */
export const getEntryTypeClass = (type: EntryType): string => {
  if (type === EntryType.MANUAL) return 'manual-entry';
  if (type.startsWith('AUTO_')) return 'auto-entry';
  if (type === EntryType.ADJUSTMENT) return 'adjustment-entry';
  if (type === EntryType.CLOSING) return 'closing-entry';
  return '';
};

/**
 * Get status color class
 */
export const getStatusClass = (status: JournalStatus): string => {
  switch (status) {
    case JournalStatus.DRAFT:
      return 'warning-chip';
    case JournalStatus.POSTED:
      return 'success-chip';
    case JournalStatus.REVERSED:
      return 'error-chip';
    default:
      return '';
  }
};

/**
 * Calculate totals from journal lines
 */
export const calculateJournalTotals = (
  lines: JournalEntryLine[]
): { totalDebit: number; totalCredit: number; difference: number; isBalanced: boolean } => {
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01; // Allow 1 cent tolerance

  return { totalDebit, totalCredit, difference, isBalanced };
};

/**
 * Format amount for display
 */
export const formatAmount = (amount?: number): string => {
  if (!amount || amount === 0) return '-';
  
  return `₱${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Create empty journal line
 */
export const createEmptyJournalLine = (lineNumber: number): JournalEntryLine => {
  return {
    account_id: '',
    line_number: lineNumber,
    description: '',
    debit_amount: undefined,
    credit_amount: undefined,
    department: '',
    responsibility_center: ''
  };
};

/**
 * Validate if entry can be edited
 */
export const canEditEntry = (entry: JournalEntry): { can: boolean; reason?: string } => {
  if (entry.status === JournalStatus.REVERSED) {
    return { can: false, reason: 'Cannot edit reversed entries' };
  }

  if (entry.entry_type !== EntryType.MANUAL && entry.status === JournalStatus.POSTED) {
    return { can: false, reason: 'Cannot edit auto-generated posted entries' };
  }

  return { can: true };
};

/**
 * Validate if entry can be deleted
 */
export const canDeleteEntry = (entry: JournalEntry): { can: boolean; reason?: string } => {
  if (entry.entry_type !== EntryType.MANUAL) {
    return { can: false, reason: 'Cannot delete auto-generated entries' };
  }

  if (entry.status === JournalStatus.POSTED) {
    return { can: false, reason: 'Cannot delete posted entries. Create a reversing entry instead.' };
  }

  if (entry.status === JournalStatus.REVERSED) {
    return { can: false, reason: 'Cannot delete reversed entries' };
  }

  return { can: true };
};

/**
 * Validate if entry can be reversed
 */
export const canReverseEntry = (entry: JournalEntry): { can: boolean; reason?: string } => {
  if (entry.status === JournalStatus.DRAFT) {
    return { can: false, reason: 'Cannot reverse draft entries. Delete the draft instead.' };
  }

  if (entry.status === JournalStatus.REVERSED) {
    return { can: false, reason: 'This entry has already been reversed' };
  }

  if (entry.reversed_by_id) {
    return { can: false, reason: 'This entry has already been reversed' };
  }

  return { can: true };
};

/**
 * Create reversal journal lines
 */
export const createReversalLines = (originalLines: JournalEntryLine[]): JournalEntryLine[] => {
  return originalLines.map((line, index) => ({
    account_id: line.account_id,
    line_number: index + 1,
    description: `Reversal: ${line.description || ''}`,
    // Swap debit and credit
    debit_amount: line.credit_amount,
    credit_amount: line.debit_amount,
    department: line.department,
    responsibility_center: line.responsibility_center
  }));
};

/**
 * Get source module display name
 */
export const getSourceModuleDisplay = (sourceModule?: string): string => {
  if (!sourceModule) return 'Manual Entry';

  const moduleNames: Record<string, string> = {
    revenue: 'Revenue',
    expense: 'Expense',
    payroll: 'Payroll',
    loan: 'Loan Management',
    purchase: 'Purchase Request',
    refund: 'Refund/Replacement'
  };

  return moduleNames[sourceModule] || sourceModule;
};

/**
 * Get entry status badges
 */
export const getEntryStatusBadges = (entry: JournalEntry): Array<{ text: string; class: string; title?: string }> => {
  const badges: Array<{ text: string; class: string; title?: string }> = [];

  // Status badge
  badges.push({
    text: entry.status,
    class: getStatusClass(entry.status)
  });

  // Entry type badge
  if (entry.entry_type !== EntryType.MANUAL) {
    badges.push({
      text: 'Auto',
      class: 'info-chip',
      title: 'Auto-generated entry'
    });
  }

  // Balance badge
  if (!entry.is_balanced) {
    badges.push({
      text: 'Unbalanced',
      class: 'error-chip',
      title: 'Debits do not equal credits'
    });
  }

  // Source module badge
  if (entry.source_module) {
    badges.push({
      text: getSourceModuleDisplay(entry.source_module),
      class: 'secondary-chip',
      title: `Linked to ${getSourceModuleDisplay(entry.source_module)}`
    });
  }

  return badges;
};

/**
 * Sort journal entries
 */
export const sortJournalEntries = (
  entries: JournalEntry[],
  sortBy: 'date' | 'number' | 'amount',
  order: 'asc' | 'desc' = 'desc'
): JournalEntry[] => {
  const sorted = [...entries].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        break;
      case 'number':
        comparison = a.journal_number.localeCompare(b.journal_number);
        break;
      case 'amount':
        comparison = a.total_debit - b.total_debit;
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
};

/**
 * Filter journal entries by date range
 */
export const filterByDateRange = (
  entries: JournalEntry[],
  startDate?: string,
  endDate?: string
): JournalEntry[] => {
  return entries.filter(entry => {
    const entryDate = new Date(entry.transaction_date);

    if (startDate && entryDate < new Date(startDate)) {
      return false;
    }

    if (endDate && entryDate > new Date(endDate)) {
      return false;
    }

    return true;
  });
};

/**
 * Get summary statistics for journal entries
 */
export const getJournalSummary = (entries: JournalEntry[]): {
  totalEntries: number;
  totalDebits: number;
  totalCredits: number;
  draftCount: number;
  postedCount: number;
  reversedCount: number;
  unbalancedCount: number;
} => {
  return {
    totalEntries: entries.length,
    totalDebits: entries.reduce((sum, entry) => sum + entry.total_debit, 0),
    totalCredits: entries.reduce((sum, entry) => sum + entry.total_credit, 0),
    draftCount: entries.filter(e => e.status === JournalStatus.DRAFT).length,
    postedCount: entries.filter(e => e.status === JournalStatus.POSTED).length,
    reversedCount: entries.filter(e => e.status === JournalStatus.REVERSED).length,
    unbalancedCount: entries.filter(e => !e.is_balanced).length
  };
};
