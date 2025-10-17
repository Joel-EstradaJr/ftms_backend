import { AccountType, NormalBalance, ChartOfAccount } from '@/app/types/jev';


/**
 * Derives normal balance from account type
 * Assets & Expenses = DEBIT
 * Liabilities, Equity & Revenue = CREDIT
 */
export function getNormalBalance(accountType: AccountType): NormalBalance {
  switch (accountType) {
    case AccountType.ASSET:
    case AccountType.EXPENSE:
      return NormalBalance.DEBIT;
    
    case AccountType.LIABILITY:
    case AccountType.EQUITY:
    case AccountType.REVENUE:
      return NormalBalance.CREDIT;
  }
}

/**
 * Gets CSS class for account type chip
 */
export function getAccountTypeClass(accountType: AccountType): string {
  switch (accountType) {
    case AccountType.ASSET:
      return 'active'; // Blue chip
    case AccountType.LIABILITY:
      return 'Rejected'; // Red chip
    case AccountType.EQUITY:
      return 'Draft'; // Gray chip
    case AccountType.REVENUE:
      return 'approved'; // Green chip
    case AccountType.EXPENSE:
      return 'Rejected'; // Red chip
    default:
      return '';
  }
}

/**
 * Checks if account can be archived
 */
export function canArchiveAccount(account: ChartOfAccount): boolean {
  // System accounts cannot be archived
  if (account.is_system_account) {
    return false;
  }
  
  // Already archived
  if (!account.is_active) {
    return false;
  }
  
  return true;
}

/**
 * Gets account status info for display
 */
export function getAccountStatusInfo(account: ChartOfAccount): {
  label: string;
  chipClass: string;
} {
  if (!account.is_active) {
    return { label: 'Archived', chipClass: 'closed' };
  }
  
  return { label: 'Active', chipClass: 'active' };
}

/**
 * Checks if account is a parent (has children)
 */
export function isParentAccount(account: ChartOfAccount, allAccounts: ChartOfAccount[]): boolean {
  return allAccounts.some(acc => acc.parent_account_id === account.account_id);
}

/**
 * Gets all child accounts for a parent
 */
export function getChildAccounts(parentId: string, allAccounts: ChartOfAccount[]): ChartOfAccount[] {
  return allAccounts.filter(acc => acc.parent_account_id === parentId);
}

/**
 * Gets count of child accounts
 */
export function getChildCount(parentId: string, allAccounts: ChartOfAccount[]): number {
  return allAccounts.filter(acc => acc.parent_account_id === parentId).length;
}

/**
 * Checks if account can have children (must not be a child itself)
 */
export function canHaveChildren(account: ChartOfAccount): boolean {
  return !account.parent_account_id; // Only root-level accounts can be parents
}

/**
 * Gets available parent accounts (only root-level, same type, not self)
 */
export function getAvailableParentAccounts(
  accounts: ChartOfAccount[],
  accountType: AccountType,
  excludeAccountId?: string
): ChartOfAccount[] {
  return accounts.filter(acc => 
    acc.account_type === accountType &&    // Same type
    !acc.parent_account_id &&              // Root level only
    acc.account_id !== excludeAccountId && // Not self
    acc.is_active                          // Active only
  );
}

/**
 * Calculates account level (1 = parent, 2 = child, 3 = grandchild, etc.)
 */
export function calculateAccountLevel(account: ChartOfAccount): number {
  if (!account.parent_account_id) return 1; // Root level
  return 2; // Child level (can extend for grandchild later)
}

/**
 * Formats account display with indentation for hierarchy
 */
export function formatAccountDisplay(account: ChartOfAccount): string {
  const indent = account.parent_account_id ? '└─ ' : '';
  return `${indent}${account.account_code} - ${account.account_name}`;
}

/**
 * Validates that parent account exists and is valid
 */
export function validateParentAccount(
  parentId: string,
  accounts: ChartOfAccount[],
  childAccountType: AccountType
): { valid: boolean; error?: string } {
  const parent = accounts.find(acc => acc.account_id === parentId);
  
  if (!parent) {
    return { valid: false, error: 'Parent account not found' };
  }
  
  if (!parent.is_active) {
    return { valid: false, error: 'Parent account is archived' };
  }
  
  if (parent.account_type !== childAccountType) {
    return { valid: false, error: 'Parent account must be of the same type' };
  }
  
  if (parent.parent_account_id) {
    return { valid: false, error: 'Cannot nest more than 2 levels deep' };
  }
  
  return { valid: true };
}

/**
 * Checks if account fields can be edited
 */
export function canEditAccount(account: ChartOfAccount): boolean {
  // System accounts cannot be edited
  if (account.is_system_account) {
    return false;
  }
  
  // Archived accounts cannot be edited
  if (!account.is_active) {
    return false;
  }
  
  return true;
}

/**
 * Formats account balance for display
 */
export function formatAccountBalance(balance: number | undefined): string {
  if (balance === undefined || balance === null) {
    return '₱0.00';
  }
  
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(balance);
}

/**
 * Gets account hierarchy display (for showing parent chain)
 */
export function getAccountHierarchyDisplay(account: ChartOfAccount): string {
  if (!account.parent_account_id) {
    return account.account_code + ' - ' + account.account_name;
  }
  
  return `${account.parent_account_code} - ${account.parent_account_name} → ${account.account_code} - ${account.account_name}`;
}