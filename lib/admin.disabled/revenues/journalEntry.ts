// lib/revenues/journalEntry.ts
// Business logic for creating and managing journal entries for revenues

import { prisma } from '@/lib/prisma';

/**
 * Create a journal entry for a revenue record
 * 
 * @param revenueId - ID of the revenue record
 * @param userId - User creating the journal entry
 * @returns The created journal entry with line items
 */
export async function createRevenueJournalEntry(revenueId: number, userId: string) {
  // Fetch the revenue with source and payment method
  const revenue = await prisma.revenue.findUnique({
    where: { id: revenueId },
    include: {
      source: true,
      paymentMethod: true,
    },
  });

  if (!revenue) {
    throw new Error('Revenue not found');
  }

  // Check if journal entry already exists
  if (revenue.journalEntryId) {
    throw new Error('Journal entry already exists for this revenue');
  }

  // Determine revenue account code
  let revenueAccountCode = revenue.source.accountCode;
  if (!revenueAccountCode) {
    // Use default revenue account (you might want to fetch this from settings/config)
    revenueAccountCode = '4000'; // Example: default revenue account
  }

  // Fetch revenue account from Chart of Accounts
  const revenueAccount = await prisma.chartOfAccount.findFirst({
    where: { accountCode: revenueAccountCode },
  });

  if (!revenueAccount) {
    throw new Error(`Revenue account ${revenueAccountCode} not found in Chart of Accounts`);
  }

  // Determine cash/bank account based on payment method
  let cashAccountCode = '1010'; // Default: Cash account
  if (revenue.paymentMethod.methodCode === 'BANK_TRANSFER' || revenue.paymentMethod.methodCode === 'CHECK') {
    cashAccountCode = '1020'; // Bank account
  }

  // Fetch cash/bank account
  const cashAccount = await prisma.chartOfAccount.findFirst({
    where: { accountCode: cashAccountCode },
  });

  if (!cashAccount) {
    throw new Error(`Cash/Bank account ${cashAccountCode} not found in Chart of Accounts`);
  }

  // Create the journal entry
  const journalEntry = await prisma.journalEntry.create({
    data: {
      entryDate: revenue.transactionDate,
      description: `Revenue recognition - ${revenue.description}`,
      sourceModule: 'REVENUE',
      sourceRefId: revenue.revenueCode,
      status: 'DRAFT',
      preparedBy: userId,
      lineItems: {
        create: [
          // Debit: Cash/Bank (Asset increases)
          {
            accountId: cashAccount.id,
            description: `Cash received - ${revenue.description}`,
            debitAmount: revenue.amount,
            creditAmount: 0,
            entityType: 'Revenue',
            entityId: revenue.revenueCode,
          },
          // Credit: Revenue (Revenue increases)
          {
            accountId: revenueAccount.id,
            description: `Revenue earned - ${revenue.description}`,
            debitAmount: 0,
            creditAmount: revenue.amount,
            entityType: 'Revenue',
            entityId: revenue.revenueCode,
          },
        ],
      },
    },
    include: {
      lineItems: {
        include: {
          account: true,
        },
      },
    },
  });

  // Link the journal entry to the revenue
  await prisma.revenue.update({
    where: { id: revenueId },
    data: { journalEntryId: journalEntry.id },
  });

  // Log audit trail
  await prisma.auditLog.create({
    data: {
      userId,
      userName: userId,
      action: 'CREATE',
      module: 'JOURNAL_ENTRY',
      recordId: journalEntry.id,
      recordType: 'JournalEntry',
      description: `Created draft journal entry ${journalEntry.journalCode} for revenue ${revenue.revenueCode}`,
      afterData: {
        journalCode: journalEntry.journalCode,
        revenueCode: revenue.revenueCode,
        amount: revenue.amount.toString(),
        status: 'DRAFT',
      },
      journalEntryId: journalEntry.id,
      revenueId: revenue.id,
    },
  });

  return journalEntry;
}

/**
 * Post a revenue's journal entry to the General Ledger
 * 
 * @param revenueId - ID of the revenue record
 * @param userId - User posting the entry
 * @returns The posted journal entry
 */
export async function postRevenueToGL(revenueId: number, userId: string) {
  // Fetch the revenue with journal entry
  const revenue = await prisma.revenue.findUnique({
    where: { id: revenueId },
    include: {
      journalEntry: {
        include: {
          lineItems: true,
        },
      },
    },
  });

  if (!revenue) {
    throw new Error('Revenue not found');
  }

  // If no journal entry exists, create it first
  let journalEntry = revenue.journalEntry;
  if (!journalEntry) {
    journalEntry = await createRevenueJournalEntry(revenueId, userId);
  }

  // Check if already posted
  if (journalEntry.status === 'POSTED' || journalEntry.status === 'APPROVED') {
    throw new Error('Journal entry is already posted');
  }

  // Validate that the journal entry is balanced
  const totalDebits = journalEntry.lineItems.reduce(
    (sum, item) => sum + parseFloat(item.debitAmount.toString()),
    0
  );
  const totalCredits = journalEntry.lineItems.reduce(
    (sum, item) => sum + parseFloat(item.creditAmount.toString()),
    0
  );

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Journal entry is not balanced: Debits ${totalDebits} !== Credits ${totalCredits}`);
  }

  // Update journal entry status to POSTED
  const postedEntry = await prisma.journalEntry.update({
    where: { id: journalEntry.id },
    data: {
      status: 'POSTED',
      postedBy: userId,
    },
    include: {
      lineItems: {
        include: {
          account: true,
        },
      },
    },
  });

  // Log audit trail
  await prisma.auditLog.create({
    data: {
      userId,
      userName: userId,
      action: 'APPROVE',
      module: 'JOURNAL_ENTRY',
      recordId: journalEntry.id,
      recordType: 'JournalEntry',
      description: `Posted journal entry ${journalEntry.journalCode} to General Ledger for revenue ${revenue.revenueCode}`,
      beforeData: { status: 'DRAFT' },
      afterData: { status: 'POSTED', postedBy: userId },
      journalEntryId: journalEntry.id,
      revenueId: revenue.id,
    },
  });

  return postedEntry;
}

/**
 * Create a reversal journal entry for a revenue
 * 
 * @param revenueId - ID of the revenue to reverse
 * @param userId - User creating the reversal
 * @param reason - Reason for reversal
 * @returns The reversal journal entry
 */
export async function reverseRevenue(revenueId: number, userId: string, reason: string) {
  // Fetch the revenue with journal entry
  const revenue = await prisma.revenue.findUnique({
    where: { id: revenueId },
    include: {
      journalEntry: {
        include: {
          lineItems: {
            include: {
              account: true,
            },
          },
        },
      },
    },
  });

  if (!revenue) {
    throw new Error('Revenue not found');
  }

  if (!revenue.journalEntry) {
    throw new Error('No journal entry found for this revenue');
  }

  const originalEntry = revenue.journalEntry;

  // Check if revenue is posted
  if (originalEntry.status !== 'POSTED' && originalEntry.status !== 'APPROVED') {
    throw new Error('Cannot reverse a journal entry that is not posted');
  }

  // Create the reversal journal entry
  const reversalEntry = await prisma.journalEntry.create({
    data: {
      entryDate: new Date(),
      description: `REVERSAL - ${originalEntry.description} - Reason: ${reason}`,
      sourceModule: 'REVENUE',
      sourceRefId: revenue.revenueCode,
      status: 'POSTED',
      isReversingEntry: true,
      preparedBy: userId,
      postedBy: userId,
      remarks: `Reversal of JE ${originalEntry.journalCode}. Reason: ${reason}`,
      lineItems: {
        create: originalEntry.lineItems.map((item) => ({
          accountId: item.accountId,
          description: `REVERSAL - ${item.description}`,
          // Swap debits and credits
          debitAmount: item.creditAmount,
          creditAmount: item.debitAmount,
          entityType: 'Revenue',
          entityId: revenue.revenueCode,
        })),
      },
    },
    include: {
      lineItems: {
        include: {
          account: true,
        },
      },
    },
  });

  // Mark the original journal entry as VOID
  await prisma.journalEntry.update({
    where: { id: originalEntry.id },
    data: {
      status: 'VOID',
      remarks: `Voided by reversal entry ${reversalEntry.journalCode}`,
    },
  });

  // Log audit trail for reversal
  await prisma.auditLog.create({
    data: {
      userId,
      userName: userId,
      action: 'REVERSE',
      module: 'JOURNAL_ENTRY',
      recordId: reversalEntry.id,
      recordType: 'JournalEntry',
      description: `Created reversal entry ${reversalEntry.journalCode} for revenue ${revenue.revenueCode}. Reason: ${reason}`,
      beforeData: {
        originalJournalCode: originalEntry.journalCode,
        originalStatus: originalEntry.status,
      },
      afterData: {
        reversalJournalCode: reversalEntry.journalCode,
        originalStatus: 'VOID',
        reason,
      },
      journalEntryId: reversalEntry.id,
      revenueId: revenue.id,
    },
  });

  // Log audit trail for voided entry
  await prisma.auditLog.create({
    data: {
      userId,
      userName: userId,
      action: 'UPDATE',
      module: 'JOURNAL_ENTRY',
      recordId: originalEntry.id,
      recordType: 'JournalEntry',
      description: `Voided journal entry ${originalEntry.journalCode} via reversal`,
      beforeData: { status: originalEntry.status },
      afterData: { status: 'VOID' },
      journalEntryId: originalEntry.id,
      revenueId: revenue.id,
    },
  });

  return reversalEntry;
}

/**
 * Check if a revenue's journal entry is posted
 * 
 * @param revenueId - ID of the revenue
 * @returns True if posted, false otherwise
 */
export async function isRevenuePosted(revenueId: number): Promise<boolean> {
  const revenue = await prisma.revenue.findUnique({
    where: { id: revenueId },
    include: {
      journalEntry: {
        select: { status: true },
      },
    },
  });

  if (!revenue || !revenue.journalEntry) {
    return false;
  }

  return revenue.journalEntry.status === 'POSTED' || revenue.journalEntry.status === 'APPROVED';
}
