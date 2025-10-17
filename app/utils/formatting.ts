// ============================================================================
// app/utils/formatting.ts
// Unified formatting utilities for dates, times, money, and display text
// ============================================================================

/**
 * Format text by replacing underscores with spaces.
 * Returns empty string for null/undefined values.
 */
export const formatDisplayText = (text: unknown): string => {
  if (typeof text !== 'string') {
    if (text === null || text === undefined) return '';
    return String(text).replace(/_/g, ' ');
  }
  return text.replace(/_/g, ' ');
};

/**
 * Format a date-like input into `MonthName D, YYYY`, e.g., `October 17, 2024`.
 * Accepts Date, numeric timestamp, or date string. Returns empty string for invalid/empty input.
 */
export function formatDate(dateInput: Date | string | number | null | undefined): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput as any);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time as `HH:MM:SS AM/PM`, e.g., `12:30:59 PM`.
 */
export function formatTime(dateInput: Date | string | number | null | undefined): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput as any);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Format datetime as `MonthName D, YYYY (HH:MM:SS AM/PM)`.
 */
export function formatDateTime(dateInput: Date | string | number | null | undefined): string {
  const date = formatDate(dateInput);
  const time = formatTime(dateInput);
  return date && time ? `${date} (${time})` : '';
}

/**
 * Convert a Date object to ISO string suitable for input[type="date"] fields.
 */
export const toISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Format money values with a currency symbol and space-separated thousands.
 * Example: 49339.28 -> "₱ 49 339.28"
 * Accepts number or numeric string (optionally containing currency symbols). Returns empty string for invalid/empty input.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currencySymbol = '₱'
): string {
  if (amount === null || amount === undefined || amount === '') return '';

  const raw = typeof amount === 'string' ? amount.replace(/[^^\d.\-]/g, '') : String(amount);
  const num = Number(raw);
  if (Number.isNaN(num)) return '';

  const fixed = Math.abs(num).toFixed(2); // string like "49339.28"
  const [intPartRaw, decPart] = fixed.split('.');

  // Insert spaces as thousands separators
  const intPart = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const sign = num < 0 ? '-' : '';

  return `${currencySymbol} ${sign}${intPart}.${decPart}`;
}
