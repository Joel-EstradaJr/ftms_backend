// ============================================================================
// AUDIT PAYLOAD FORMATTERS
// ============================================================================
// Utility functions for formatting values in audit payloads.
// These functions convert raw database values into human-readable formats.
// ============================================================================

/**
 * Format a number as currency (Philippine Peso by default)
 * @param value - Number or string to format
 * @param locale - Locale for formatting (default: 'en-PH')
 * @returns Formatted currency string (e.g., "₱1,234.56")
 */
export function formatCurrency(
  value: number | string | null | undefined,
  locale: string = 'en-PH'
): string {
  if (value === null || value === undefined) return '—';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return String(value);
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format a date for display
 * @param date - Date to format
 * @param style - Format style
 * @returns Formatted date string (e.g., "January 15, 2026")
 */
export function formatDate(
  date: Date | string | null | undefined,
  style: 'short' | 'medium' | 'long' | 'full' = 'long'
): string {
  if (!date) return '—';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return String(date);
  
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: style,
  }).format(dateObj);
}

/**
 * Format a datetime for display
 * @param date - Date to format
 * @returns Formatted datetime string (e.g., "January 15, 2026 at 2:30 PM")
 */
export function formatDateTime(
  date: Date | string | null | undefined
): string {
  if (!date) return '—';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return String(date);
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
}

/**
 * Format a status enum value for display
 * Converts SNAKE_CASE to Title Case
 * @param status - Status value
 * @returns Formatted status (e.g., "PARTIALLY_PAID" → "Partially Paid")
 */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return '—';
  
  return status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format an enum value for display
 * Converts SNAKE_CASE/camelCase to Title Case
 * @param value - Enum value
 * @returns Formatted value
 */
export function formatEnumValue(value: string | null | undefined): string {
  if (!value) return '—';
  
  return value
    .replace(/([A-Z])/g, ' $1')  // Add space before capitals
    .replace(/_/g, ' ')          // Replace underscores with spaces
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a file size for display
 * @param bytes - Size in bytes
 * @returns Formatted size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format a payment method for display
 * @param method - Payment method enum value
 * @returns Human-readable payment method
 */
export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return '—';
  
  const methodMap: Record<string, string> = {
    'CASH': 'Cash',
    'BANK_TRANSFER': 'Bank Transfer',
    'E_WALLET': 'E-Wallet (GCash/PayMaya)',
    'REIMBURSEMENT': 'Reimbursement',
    'CHECK': 'Check',
  };
  
  return methodMap[method.toUpperCase()] || formatEnumValue(method);
}

/**
 * Format a frequency for display
 * @param frequency - Frequency enum value
 * @returns Human-readable frequency
 */
export function formatFrequency(frequency: string | null | undefined): string {
  if (!frequency) return '—';
  
  const frequencyMap: Record<string, string> = {
    'DAILY': 'Daily',
    'WEEKLY': 'Weekly',
    'BIWEEKLY': 'Bi-weekly',
    'MONTHLY': 'Monthly',
    'QUARTERLY': 'Quarterly',
    'ANNUALLY': 'Annually',
    'ONE_TIME': 'One-time',
  };
  
  return frequencyMap[frequency.toUpperCase()] || formatEnumValue(frequency);
}

/**
 * Format a boolean value for display
 * @param value - Boolean value
 * @param trueLabel - Label for true (default: "Yes")
 * @param falseLabel - Label for false (default: "No")
 * @returns Human-readable boolean
 */
export function formatBoolean(
  value: boolean | null | undefined,
  trueLabel: string = 'Yes',
  falseLabel: string = 'No'
): string {
  if (value === null || value === undefined) return '—';
  return value ? trueLabel : falseLabel;
}

/**
 * Format a phone number for display
 * @param phone - Phone number
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—';
  
  // Basic formatting for Philippine numbers
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
}

/**
 * Truncate long text for display
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 100)
 * @returns Truncated text with ellipsis
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number = 100
): string {
  if (!text) return '—';
  
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format a field label from snake_case/camelCase
 * @param field - Field name
 * @returns Human-readable label
 */
export function formatFieldLabel(field: string): string {
  // Custom label mappings
  const labelMap: Record<string, string> = {
    'id': 'ID',
    'code': 'Code',
    'amount': 'Amount',
    'total_amount': 'Total Amount',
    'paid_amount': 'Paid Amount',
    'balance': 'Balance',
    'status': 'Status',
    'created_at': 'Created At',
    'updated_at': 'Updated At',
    'date_recorded': 'Date Recorded',
    'date_expected': 'Expected Date',
    'due_date': 'Due Date',
    'payment_method': 'Payment Method',
    'payment_reference': 'Payment Reference',
    'revenue_type_id': 'Revenue Type',
    'department_id': 'Department',
    'account_type_id': 'Account Type',
    'vendor_id': 'Vendor',
    'employee_number': 'Employee',
    'debtor_name': 'Debtor',
    'creditor_name': 'Creditor',
    'description': 'Description',
    'remarks': 'Remarks',
    'approval_remarks': 'Approval Remarks',
    'rejection_reason': 'Rejection Reason',
    'journal_entry_id': 'Journal Entry',
    'receivable_id': 'Receivable',
    'total_debit': 'Total Debit',
    'total_credit': 'Total Credit',
    'normal_balance': 'Normal Balance',
    'account_code': 'Account Code',
    'account_name': 'Account Name',
  };
  
  if (labelMap[field]) return labelMap[field];
  
  // Auto-format from snake_case or camelCase
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format any value based on its type
 * @param value - Value to format
 * @param fieldName - Field name (for context)
 * @returns Formatted value
 */
export function formatValue(value: any, fieldName?: string): string {
  if (value === null || value === undefined) return '—';
  
  // Handle based on field name hints
  if (fieldName) {
    const lowerField = fieldName.toLowerCase();
    
    if (lowerField.includes('amount') || lowerField.includes('total') ||
        lowerField.includes('debit') || lowerField.includes('credit') ||
        lowerField.includes('balance') || lowerField.includes('payment')) {
      return formatCurrency(value);
    }
    
    if (lowerField.includes('date') && !lowerField.includes('update')) {
      return formatDate(value);
    }
    
    if (lowerField.includes('status')) {
      return formatStatus(value);
    }
    
    if (lowerField.includes('method')) {
      return formatPaymentMethod(value);
    }
    
    if (lowerField.includes('frequency')) {
      return formatFrequency(value);
    }
  }
  
  // Handle based on type
  if (typeof value === 'boolean') {
    return formatBoolean(value);
  }
  
  if (value instanceof Date) {
    return formatDateTime(value);
  }
  
  if (typeof value === 'object') {
    // Handle Prisma Decimal
    if (value.toNumber) {
      return formatCurrency(value.toNumber());
    }
    return JSON.stringify(value);
  }
  
  return String(value);
}

/**
 * Compare two values and determine if they are different
 * @param oldValue - Previous value
 * @param newValue - New value
 * @returns true if values are different
 */
export function valuesAreDifferent(oldValue: any, newValue: any): boolean {
  // Handle null/undefined
  if (oldValue === null && newValue === null) return false;
  if (oldValue === undefined && newValue === undefined) return false;
  if (oldValue === null || oldValue === undefined) return true;
  if (newValue === null || newValue === undefined) return true;
  
  // Handle Prisma Decimal
  if (oldValue?.toNumber && newValue?.toNumber) {
    return oldValue.toNumber() !== newValue.toNumber();
  }
  
  // Handle Date
  if (oldValue instanceof Date && newValue instanceof Date) {
    return oldValue.getTime() !== newValue.getTime();
  }
  
  // Handle Date strings
  if (typeof oldValue === 'string' && typeof newValue === 'string') {
    const oldDate = new Date(oldValue);
    const newDate = new Date(newValue);
    if (!isNaN(oldDate.getTime()) && !isNaN(newDate.getTime())) {
      // Check if the dates are actually equal (within 1 second tolerance for timestamps)
      if (Math.abs(oldDate.getTime() - newDate.getTime()) < 1000) {
        return false;
      }
    }
  }
  
  // Handle objects (deep comparison)
  if (typeof oldValue === 'object' && typeof newValue === 'object') {
    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
  }
  
  // Simple comparison
  return oldValue !== newValue;
}
