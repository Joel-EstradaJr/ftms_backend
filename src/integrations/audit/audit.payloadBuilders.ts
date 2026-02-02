// ============================================================================
// AUDIT PAYLOAD BUILDERS
// ============================================================================
// Entity-specific payload builders that create denormalized, human-readable
// audit data. Each builder knows how to resolve foreign keys to names and
// format fields appropriately for the entity type.
// ============================================================================

import { prisma } from '../../config/database';
import {
  AuditFieldValue,
  DenormalizedAuditData,
  DenormalizedChangeData,
  AuditFieldChange,
  DEFAULT_EXCLUDED_FIELDS,
  SENSITIVE_FIELDS,
  AuditPayloadOptions,
} from './audit.types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatStatus,
  formatPaymentMethod,
  formatFrequency,
  formatEnumValue,
  formatFieldLabel,
  formatValue,
  valuesAreDifferent,
} from './audit.formatters';

// ============================================================================
// GENERIC PAYLOAD BUILDER
// ============================================================================

/**
 * Build a generic denormalized audit data payload.
 * This extracts and formats fields from raw data into human-readable format.
 */
export function buildGenericAuditData(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): DenormalizedAuditData {
  const {
    excludeFields = DEFAULT_EXCLUDED_FIELDS,
    fieldLabels = {},
    includeRawData = false,
  } = options;

  const fields: AuditFieldValue[] = [];

  for (const [key, value] of Object.entries(data)) {
    // Skip excluded fields
    if (excludeFields.includes(key)) continue;

    // Skip null/undefined
    if (value === null || value === undefined) continue;

    // Skip nested objects (they should be denormalized separately)
    if (typeof value === 'object' && !value.toNumber && !(value instanceof Date)) {
      continue;
    }

    // Mask sensitive fields
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      fields.push({
        label: fieldLabels[key] || formatFieldLabel(key),
        value: '[REDACTED]',
        type: 'text',
      });
      continue;
    }

    // Format the value
    const formattedValue = formatValue(value, key);
    const fieldType = getFieldType(key, value);

    fields.push({
      label: fieldLabels[key] || formatFieldLabel(key),
      value: formattedValue,
      type: fieldType,
    });
  }

  // Build summary from key fields
  const summary = buildSummaryFromFields(fields, data);

  return {
    summary,
    fields,
    ...(includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build change data for UPDATE actions
 */
export function buildChangeData(
  previousData: Record<string, any>,
  newData: Record<string, any>,
  options: AuditPayloadOptions = {}
): DenormalizedChangeData {
  const {
    excludeFields = DEFAULT_EXCLUDED_FIELDS,
    fieldLabels = {},
  } = options;

  const changes: AuditFieldChange[] = [];
  const allKeys = new Set([...Object.keys(previousData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    // Skip excluded fields
    if (excludeFields.includes(key)) continue;

    const oldValue = previousData[key];
    const newValue = newData[key];

    // Skip if values are the same
    if (!valuesAreDifferent(oldValue, newValue)) continue;

    // Skip nested objects
    if (typeof oldValue === 'object' && oldValue !== null && !oldValue.toNumber && !(oldValue instanceof Date)) {
      continue;
    }
    if (typeof newValue === 'object' && newValue !== null && !newValue.toNumber && !(newValue instanceof Date)) {
      continue;
    }

    // Mask sensitive fields
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      changes.push({
        label: fieldLabels[key] || formatFieldLabel(key),
        from: '[REDACTED]',
        to: '[REDACTED]',
        type: 'text',
      });
      continue;
    }

    changes.push({
      label: fieldLabels[key] || formatFieldLabel(key),
      from: formatValue(oldValue, key),
      to: formatValue(newValue, key),
      type: getFieldType(key, newValue ?? oldValue),
    });
  }

  // Build summary of changes
  const summary = buildChangeSummary(changes);

  return {
    summary,
    changes,
    change_count: changes.length,
  };
}

// ============================================================================
// ENTITY-SPECIFIC PAYLOAD BUILDERS
// ============================================================================

/**
 * Build denormalized audit payload for Revenue (Other Revenue)
 */
export async function buildRevenueAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Revenue Code', value: data.code, type: 'text' });
  }

  // Revenue Type (denormalize from ID)
  if (data.revenue_type?.name) {
    fields.push({ label: 'Revenue Type', value: data.revenue_type.name, raw_id: data.revenue_type_id, type: 'reference' });
  } else if (data.revenue_type_id) {
    const revenueType = await resolveRevenueType(data.revenue_type_id);
    fields.push({ label: 'Revenue Type', value: revenueType, raw_id: data.revenue_type_id, type: 'reference' });
  }

  // Department (denormalize from ID)
  if (data.department?.department_name) {
    fields.push({ label: 'Department', value: data.department.department_name, raw_id: data.department_id, type: 'reference' });
  } else if (data.department_id) {
    const department = await resolveDepartment(data.department_id);
    fields.push({ label: 'Department', value: department, raw_id: data.department_id, type: 'reference' });
  }

  // Amount
  if (data.amount !== undefined) {
    fields.push({ label: 'Amount', value: formatCurrency(data.amount), type: 'currency' });
  }

  // Payment Method
  if (data.payment_method) {
    fields.push({ label: 'Payment Method', value: formatPaymentMethod(data.payment_method), type: 'text' });
  }

  // Payment Reference
  if (data.payment_reference) {
    fields.push({ label: 'Payment Reference', value: data.payment_reference, type: 'text' });
  }

  // Date Recorded
  if (data.date_recorded) {
    fields.push({ label: 'Date Recorded', value: formatDate(data.date_recorded), type: 'date' });
  }

  // Description
  if (data.description) {
    fields.push({ label: 'Description', value: data.description, type: 'text' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Remittance Status
  if (data.remittance_status) {
    fields.push({ label: 'Remittance Status', value: formatStatus(data.remittance_status), type: 'status' });
  }

  // Approval Remarks
  if (data.approval_remarks) {
    fields.push({ label: 'Approval Remarks', value: data.approval_remarks, type: 'text' });
  }

  // Build summary
  const revenueType = data.revenue_type?.name || (data.revenue_type_id ? await resolveRevenueType(data.revenue_type_id) : 'Revenue');
  const amount = formatCurrency(data.amount);
  const summary = `${revenueType} of ${amount}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Expenses
 */
export async function buildExpenseAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Expense Code', value: data.code, type: 'text' });
  }

  // Category
  if (data.category) {
    fields.push({ label: 'Category', value: formatEnumValue(data.category), type: 'text' });
  }

  // Subcategory
  if (data.subcategory) {
    fields.push({ label: 'Subcategory', value: formatEnumValue(data.subcategory), type: 'text' });
  }

  // Vendor (denormalize from ID)
  if (data.vendor?.name) {
    fields.push({ label: 'Vendor', value: data.vendor.name, raw_id: data.vendor_id, type: 'reference' });
  } else if (data.vendor_id) {
    const vendor = await resolveVendor(data.vendor_id);
    fields.push({ label: 'Vendor', value: vendor, raw_id: data.vendor_id, type: 'reference' });
  }

  // Department
  if (data.department) {
    fields.push({ label: 'Department', value: data.department, type: 'text' });
  }

  // Amount
  if (data.amount !== undefined) {
    fields.push({ label: 'Amount', value: formatCurrency(data.amount), type: 'currency' });
  }

  // Date Recorded
  if (data.date_recorded) {
    fields.push({ label: 'Date Recorded', value: formatDate(data.date_recorded), type: 'date' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Remarks
  if (data.remarks) {
    fields.push({ label: 'Remarks', value: data.remarks, type: 'text' });
  }

  // Build summary
  const category = formatEnumValue(data.category) || 'Expense';
  const amount = formatCurrency(data.amount);
  const summary = `${category} expense of ${amount}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Journal Entries
 */
export async function buildJournalEntryAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Journal Code', value: data.code, type: 'text' });
  }

  // Date
  if (data.date) {
    fields.push({ label: 'Date', value: formatDate(data.date), type: 'date' });
  }

  // Description
  if (data.description) {
    fields.push({ label: 'Description', value: data.description, type: 'text' });
  }

  // Reference
  if (data.reference) {
    fields.push({ label: 'Reference', value: data.reference, type: 'text' });
  }

  // Total Debit
  if (data.total_debit !== undefined) {
    fields.push({ label: 'Total Debit', value: formatCurrency(data.total_debit), type: 'currency' });
  }

  // Total Credit
  if (data.total_credit !== undefined) {
    fields.push({ label: 'Total Credit', value: formatCurrency(data.total_credit), type: 'currency' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Entry Type
  if (data.entry_type) {
    fields.push({ label: 'Entry Type', value: formatEnumValue(data.entry_type), type: 'text' });
  }

  // Journal Lines (summarized)
  if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
    const linesSummary = await buildJournalLinesSummary(data.lines);
    fields.push({ label: 'Journal Lines', value: linesSummary, type: 'text' });
  }

  // Build summary
  const totalDebit = formatCurrency(data.total_debit);
  const summary = `Journal Entry for ${totalDebit}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Receivables
 */
export async function buildReceivableAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Receivable Code', value: data.code, type: 'text' });
  }

  // Debtor Name
  if (data.debtor_name) {
    fields.push({ label: 'Debtor', value: data.debtor_name, type: 'text' });
  }

  // Employee (if linked)
  if (data.employee?.first_name && data.employee?.last_name) {
    const employeeName = `${data.employee.first_name} ${data.employee.last_name}`;
    fields.push({ label: 'Employee', value: employeeName, raw_id: data.employee_number, type: 'reference' });
  } else if (data.employee_number) {
    const employee = await resolveEmployee(data.employee_number);
    fields.push({ label: 'Employee', value: employee, raw_id: data.employee_number, type: 'reference' });
  }

  // Description
  if (data.description) {
    fields.push({ label: 'Description', value: data.description, type: 'text' });
  }

  // Total Amount
  if (data.total_amount !== undefined) {
    fields.push({ label: 'Total Amount', value: formatCurrency(data.total_amount), type: 'currency' });
  }

  // Paid Amount
  if (data.paid_amount !== undefined) {
    fields.push({ label: 'Paid Amount', value: formatCurrency(data.paid_amount), type: 'currency' });
  }

  // Balance
  if (data.balance !== undefined) {
    fields.push({ label: 'Balance', value: formatCurrency(data.balance), type: 'currency' });
  }

  // Due Date
  if (data.due_date) {
    fields.push({ label: 'Due Date', value: formatDate(data.due_date), type: 'date' });
  }

  // Frequency
  if (data.frequency) {
    fields.push({ label: 'Frequency', value: formatFrequency(data.frequency), type: 'text' });
  }

  // Number of Payments
  if (data.number_of_payments) {
    fields.push({ label: 'Number of Payments', value: String(data.number_of_payments), type: 'text' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Build summary
  const totalAmount = formatCurrency(data.total_amount);
  const debtor = data.debtor_name || 'Unknown';
  const summary = `Receivable of ${totalAmount} from ${debtor}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Payables
 */
export async function buildPayableAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Payable Code', value: data.code, type: 'text' });
  }

  // Creditor Name
  if (data.creditor_name) {
    fields.push({ label: 'Creditor', value: data.creditor_name, type: 'text' });
  }

  // Vendor (denormalize from ID)
  if (data.vendor?.name) {
    fields.push({ label: 'Vendor', value: data.vendor.name, raw_id: data.vendor_id, type: 'reference' });
  } else if (data.vendor_id) {
    const vendor = await resolveVendor(data.vendor_id);
    fields.push({ label: 'Vendor', value: vendor, raw_id: data.vendor_id, type: 'reference' });
  }

  // Description
  if (data.description) {
    fields.push({ label: 'Description', value: data.description, type: 'text' });
  }

  // Total Amount
  if (data.total_amount !== undefined) {
    fields.push({ label: 'Total Amount', value: formatCurrency(data.total_amount), type: 'currency' });
  }

  // Paid Amount
  if (data.paid_amount !== undefined) {
    fields.push({ label: 'Paid Amount', value: formatCurrency(data.paid_amount), type: 'currency' });
  }

  // Balance
  if (data.balance !== undefined) {
    fields.push({ label: 'Balance', value: formatCurrency(data.balance), type: 'currency' });
  }

  // Due Date
  if (data.due_date) {
    fields.push({ label: 'Due Date', value: formatDate(data.due_date), type: 'date' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Build summary
  const totalAmount = formatCurrency(data.total_amount);
  const creditor = data.creditor_name || data.vendor?.name || 'Unknown';
  const summary = `Payable of ${totalAmount} to ${creditor}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Payroll Periods
 */
export async function buildPayrollPeriodAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Payroll Code', value: data.code, type: 'text' });
  }

  // Period Name/Type
  if (data.period_type) {
    fields.push({ label: 'Period Type', value: formatEnumValue(data.period_type), type: 'text' });
  }

  // Start Date
  if (data.start_date) {
    fields.push({ label: 'Start Date', value: formatDate(data.start_date), type: 'date' });
  }

  // End Date
  if (data.end_date) {
    fields.push({ label: 'End Date', value: formatDate(data.end_date), type: 'date' });
  }

  // Pay Date
  if (data.pay_date) {
    fields.push({ label: 'Pay Date', value: formatDate(data.pay_date), type: 'date' });
  }

  // Total Gross
  if (data.total_gross !== undefined) {
    fields.push({ label: 'Total Gross', value: formatCurrency(data.total_gross), type: 'currency' });
  }

  // Total Net
  if (data.total_net !== undefined) {
    fields.push({ label: 'Total Net', value: formatCurrency(data.total_net), type: 'currency' });
  }

  // Employee Count
  if (data.employee_count !== undefined) {
    fields.push({ label: 'Employees', value: String(data.employee_count), type: 'text' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Build summary
  const startDate = formatDate(data.start_date, 'short');
  const endDate = formatDate(data.end_date, 'short');
  const totalNet = formatCurrency(data.total_net);
  const summary = `Payroll for ${startDate} - ${endDate}, Total: ${totalNet}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Chart of Accounts
 */
export async function buildChartOfAccountAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Account Code
  if (data.account_code) {
    fields.push({ label: 'Account Code', value: data.account_code, type: 'text' });
  }

  // Account Name
  if (data.account_name) {
    fields.push({ label: 'Account Name', value: data.account_name, type: 'text' });
  }

  // Account Type (denormalize from ID)
  if (data.account_type?.name) {
    fields.push({ label: 'Account Type', value: data.account_type.name, raw_id: data.account_type_id, type: 'reference' });
  } else if (data.account_type_id) {
    const accountType = await resolveAccountType(data.account_type_id);
    fields.push({ label: 'Account Type', value: accountType, raw_id: data.account_type_id, type: 'reference' });
  }

  // Normal Balance
  if (data.normal_balance) {
    fields.push({ label: 'Normal Balance', value: formatEnumValue(data.normal_balance), type: 'text' });
  }

  // Description
  if (data.description) {
    fields.push({ label: 'Description', value: data.description, type: 'text' });
  }

  // Build summary
  const summary = `${data.account_code} - ${data.account_name}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Account Types
 */
export async function buildAccountTypeAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Type Code', value: data.code, type: 'text' });
  }

  // Name
  if (data.name) {
    fields.push({ label: 'Type Name', value: data.name, type: 'text' });
  }

  // Description
  if (data.description) {
    fields.push({ label: 'Description', value: data.description, type: 'text' });
  }

  // Build summary
  const summary = `${data.code} - ${data.name}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Bus Trip Revenue
 */
export async function buildBusTripRevenueAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Revenue Code', value: data.code, type: 'text' });
  }

  // Bus Info
  if (data.bus_trip?.bus) {
    const bus = data.bus_trip.bus;
    const busInfo = `${bus.license_plate || 'N/A'} / Body #${bus.body_number || 'N/A'}`;
    fields.push({ label: 'Bus', value: busInfo, raw_id: data.bus_trip.bus_id, type: 'reference' });
  }

  // Route
  if (data.bus_trip?.bus_route) {
    fields.push({ label: 'Route', value: data.bus_trip.bus_route, type: 'text' });
  }

  // Date Assigned
  if (data.bus_trip?.date_assigned) {
    fields.push({ label: 'Date Assigned', value: formatDate(data.bus_trip.date_assigned), type: 'date' });
  }

  // Trip Revenue
  if (data.amount !== undefined) {
    fields.push({ label: 'Trip Revenue', value: formatCurrency(data.amount), type: 'currency' });
  }

  // Assignment Type
  if (data.bus_trip?.assignment_type) {
    fields.push({ label: 'Assignment Type', value: formatEnumValue(data.bus_trip.assignment_type), type: 'text' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Build summary
  const route = data.bus_trip?.bus_route || 'Unknown Route';
  const amount = formatCurrency(data.amount);
  const summary = `Bus Trip Revenue for ${route}: ${amount}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Rental Revenue
 */
export async function buildRentalRevenueAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Revenue Code', value: data.code, type: 'text' });
  }

  // Bus Info
  if (data.rental?.bus) {
    const bus = data.rental.bus;
    const busInfo = `${bus.license_plate || 'N/A'} / Body #${bus.body_number || 'N/A'}`;
    fields.push({ label: 'Bus', value: busInfo, raw_id: data.rental.bus_id, type: 'reference' });
  }

  // Rental Package
  if (data.rental?.rental_package) {
    fields.push({ label: 'Rental Package', value: data.rental.rental_package, type: 'text' });
  }

  // Rental Start Date
  if (data.rental?.rental_start_date) {
    fields.push({ label: 'Start Date', value: formatDate(data.rental.rental_start_date), type: 'date' });
  }

  // Rental End Date
  if (data.rental?.rental_end_date) {
    fields.push({ label: 'End Date', value: formatDate(data.rental.rental_end_date), type: 'date' });
  }

  // Total Amount
  if (data.amount !== undefined) {
    fields.push({ label: 'Total Amount', value: formatCurrency(data.amount), type: 'currency' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Build summary
  const rentalPackage = data.rental?.rental_package || 'Rental';
  const amount = formatCurrency(data.amount);
  const summary = `Rental Revenue for ${rentalPackage}: ${amount}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Attachments
 */
export async function buildAttachmentAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Filename
  if (data.filename || data.file_name) {
    fields.push({ label: 'Filename', value: data.filename || data.file_name, type: 'text' });
  }

  // File Type
  if (data.file_type || data.mime_type) {
    fields.push({ label: 'File Type', value: data.file_type || data.mime_type, type: 'text' });
  }

  // File Size
  if (data.file_size) {
    const formattedSize = typeof data.file_size === 'number' 
      ? `${(data.file_size / 1024 / 1024).toFixed(2)} MB`
      : data.file_size;
    fields.push({ label: 'File Size', value: formattedSize, type: 'text' });
  }

  // Related Entity
  if (data.entity_type) {
    fields.push({ label: 'Related To', value: formatEnumValue(data.entity_type), type: 'text' });
  }

  // Build summary
  const filename = data.filename || data.file_name || 'Attachment';
  const summary = `Attachment: ${filename}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Budget Allocations
 */
export async function buildBudgetAllocationAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Code
  if (data.code) {
    fields.push({ label: 'Allocation Code', value: data.code, type: 'text' });
  }

  // Department
  if (data.department?.department_name) {
    fields.push({ label: 'Department', value: data.department.department_name, raw_id: data.department_id, type: 'reference' });
  } else if (data.department_id) {
    const department = await resolveDepartment(data.department_id);
    fields.push({ label: 'Department', value: department, raw_id: data.department_id, type: 'reference' });
  }

  // Allocation Type
  if (data.allocation_type) {
    fields.push({ label: 'Allocation Type', value: formatEnumValue(data.allocation_type), type: 'text' });
  }

  // Amount
  if (data.amount !== undefined) {
    fields.push({ label: 'Amount', value: formatCurrency(data.amount), type: 'currency' });
  }

  // Fiscal Period
  if (data.fiscal_year || data.fiscal_month) {
    const period = `${data.fiscal_month || ''}/${data.fiscal_year || ''}`.replace(/^\/|\/$/g, '');
    fields.push({ label: 'Fiscal Period', value: period, type: 'text' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Remarks
  if (data.remarks) {
    fields.push({ label: 'Remarks', value: data.remarks, type: 'text' });
  }

  // Build summary
  const amount = formatCurrency(data.amount);
  const allocationType = formatEnumValue(data.allocation_type) || 'Budget';
  const summary = `${allocationType} of ${amount}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

/**
 * Build denormalized audit payload for Cash Advances
 */
export async function buildCashAdvanceAuditPayload(
  data: Record<string, any>,
  options: AuditPayloadOptions = {}
): Promise<DenormalizedAuditData> {
  const fields: AuditFieldValue[] = [];

  // Request Number
  if (data.request_number) {
    fields.push({ label: 'Request Number', value: data.request_number, type: 'text' });
  }

  // Employee
  if (data.employee?.first_name && data.employee?.last_name) {
    const employeeName = `${data.employee.first_name} ${data.employee.last_name}`;
    fields.push({ label: 'Employee', value: employeeName, raw_id: data.employee_number, type: 'reference' });
  } else if (data.employee_number) {
    const employee = await resolveEmployee(data.employee_number);
    fields.push({ label: 'Employee', value: employee, raw_id: data.employee_number, type: 'reference' });
  }

  // Department
  if (data.department) {
    fields.push({ label: 'Department', value: data.department, type: 'text' });
  }

  // Purpose
  if (data.purpose) {
    fields.push({ label: 'Purpose', value: data.purpose, type: 'text' });
  }

  // Requested Amount
  if (data.requested_amount !== undefined) {
    fields.push({ label: 'Requested Amount', value: formatCurrency(data.requested_amount), type: 'currency' });
  }

  // Approved Amount
  if (data.approved_amount !== undefined) {
    fields.push({ label: 'Approved Amount', value: formatCurrency(data.approved_amount), type: 'currency' });
  }

  // Request Date
  if (data.request_date) {
    fields.push({ label: 'Request Date', value: formatDate(data.request_date), type: 'date' });
  }

  // Status
  if (data.status) {
    fields.push({ label: 'Status', value: formatStatus(data.status), type: 'status' });
  }

  // Build summary
  const amount = formatCurrency(data.requested_amount);
  const employee = data.employee?.first_name 
    ? `${data.employee.first_name} ${data.employee.last_name}`
    : 'Employee';
  const summary = `Cash Advance request of ${amount} by ${employee}`;

  return {
    summary,
    fields,
    ...(options.includeRawData && { _raw: sanitizeRawData(data) }),
  };
}

// ============================================================================
// HELPER FUNCTIONS - RESOLVE FOREIGN KEYS
// ============================================================================

async function resolveRevenueType(id: number): Promise<string> {
  try {
    const type = await prisma.revenue_type.findUnique({
      where: { id },
      select: { name: true },
    });
    return type?.name || `Revenue Type #${id}`;
  } catch {
    return `Revenue Type #${id}`;
  }
}

async function resolveDepartment(id: number): Promise<string> {
  try {
    const dept = await prisma.department_local.findUnique({
      where: { id },
      select: { department_name: true },
    });
    return dept?.department_name || `Department #${id}`;
  } catch {
    return `Department #${id}`;
  }
}

async function resolveVendor(id: number): Promise<string> {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { name: true, supplier_local: { select: { supplier_name: true } } },
    });
    return vendor?.name || vendor?.supplier_local?.supplier_name || `Vendor #${id}`;
  } catch {
    return `Vendor #${id}`;
  }
}

async function resolveEmployee(employeeNumber: string): Promise<string> {
  try {
    const emp = await prisma.employee_local.findUnique({
      where: { employee_number: employeeNumber },
      select: { first_name: true, last_name: true },
    });
    if (emp?.first_name && emp?.last_name) {
      return `${emp.first_name} ${emp.last_name}`;
    }
    return employeeNumber;
  } catch {
    return employeeNumber;
  }
}

async function resolveAccountType(id: number): Promise<string> {
  try {
    const type = await prisma.account_type.findUnique({
      where: { id },
      select: { name: true },
    });
    return type?.name || `Account Type #${id}`;
  } catch {
    return `Account Type #${id}`;
  }
}

async function resolveAccount(id: number): Promise<string> {
  try {
    const account = await prisma.chart_of_account.findUnique({
      where: { id },
      select: { account_code: true, account_name: true },
    });
    if (account) {
      return `${account.account_code} - ${account.account_name}`;
    }
    return `Account #${id}`;
  } catch {
    return `Account #${id}`;
  }
}

async function buildJournalLinesSummary(lines: any[]): Promise<string> {
  const lineSummaries: string[] = [];
  
  for (const line of lines.slice(0, 5)) { // Limit to first 5 lines
    const account = line.account 
      ? `${line.account.account_code} - ${line.account.account_name}`
      : await resolveAccount(line.account_id);
    
    const debit = line.debit ? formatCurrency(line.debit) : null;
    const credit = line.credit ? formatCurrency(line.credit) : null;
    
    if (debit && parseFloat(debit.replace(/[^\d.-]/g, '')) > 0) {
      lineSummaries.push(`${account} (Dr: ${debit})`);
    } else if (credit && parseFloat(credit.replace(/[^\d.-]/g, '')) > 0) {
      lineSummaries.push(`${account} (Cr: ${credit})`);
    }
  }
  
  if (lines.length > 5) {
    lineSummaries.push(`... and ${lines.length - 5} more`);
  }
  
  return lineSummaries.join('; ');
}

// ============================================================================
// HELPER FUNCTIONS - UTILITIES
// ============================================================================

function getFieldType(key: string, value: any): 'text' | 'currency' | 'date' | 'datetime' | 'status' | 'reference' {
  const lowerKey = key.toLowerCase();
  
  if (lowerKey.includes('amount') || lowerKey.includes('total') ||
      lowerKey.includes('debit') || lowerKey.includes('credit') ||
      lowerKey.includes('balance') || lowerKey.includes('payment')) {
    return 'currency';
  }
  
  if (lowerKey.includes('_at') || lowerKey.endsWith('at')) {
    return 'datetime';
  }
  
  if (lowerKey.includes('date')) {
    return 'date';
  }
  
  if (lowerKey.includes('status')) {
    return 'status';
  }
  
  if (lowerKey.includes('_id') || lowerKey.includes('_number')) {
    return 'reference';
  }
  
  return 'text';
}

function buildSummaryFromFields(fields: AuditFieldValue[], data: Record<string, any>): string {
  // Try to build a summary from code + amount or name
  const code = data.code || data.account_code || data.request_number;
  const name = data.name || data.account_name || data.debtor_name || data.creditor_name;
  const amount = data.amount || data.total_amount;
  
  const parts: string[] = [];
  
  if (code) parts.push(code);
  if (name && !code) parts.push(name);
  if (amount) parts.push(formatCurrency(amount));
  
  if (parts.length === 0) {
    return 'Record';
  }
  
  return parts.join(' - ');
}

function buildChangeSummary(changes: AuditFieldChange[]): string {
  if (changes.length === 0) {
    return 'No changes detected';
  }
  
  if (changes.length === 1) {
    return `Changed ${changes[0].label}`;
  }
  
  if (changes.length <= 3) {
    return `Changed ${changes.map(c => c.label).join(', ')}`;
  }
  
  return `Changed ${changes.length} fields: ${changes.slice(0, 3).map(c => c.label).join(', ')}, and ${changes.length - 3} more`;
}

function sanitizeRawData(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Remove nested objects to keep raw data flat
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null && !value.toNumber && !(value instanceof Date)) {
      delete sanitized[key];
    }
  }
  
  return sanitized;
}

// ============================================================================
// ENTITY TYPE TO PAYLOAD BUILDER MAPPING
// ============================================================================

export const ENTITY_PAYLOAD_BUILDERS: Record<string, (data: any, options?: AuditPayloadOptions) => Promise<DenormalizedAuditData>> = {
  'other_revenue': buildRevenueAuditPayload,
  'revenue': buildRevenueAuditPayload,
  'expense': buildExpenseAuditPayload,
  'journal_entry': buildJournalEntryAuditPayload,
  'receivable': buildReceivableAuditPayload,
  'accounts_receivable': buildReceivableAuditPayload,
  'payable': buildPayableAuditPayload,
  'accounts_payable': buildPayableAuditPayload,
  'payroll_period': buildPayrollPeriodAuditPayload,
  'chart_of_account': buildChartOfAccountAuditPayload,
  'account_type': buildAccountTypeAuditPayload,
  'bus_trip_revenue': buildBusTripRevenueAuditPayload,
  'rental_revenue': buildRentalRevenueAuditPayload,
  'attachment': buildAttachmentAuditPayload,
  'budget_allocation': buildBudgetAllocationAuditPayload,
  'cash_advance': buildCashAdvanceAuditPayload,
};

/**
 * Get the appropriate payload builder for an entity type
 */
export function getPayloadBuilder(entityType: string): (data: any, options?: AuditPayloadOptions) => Promise<DenormalizedAuditData> {
  const normalizedType = entityType.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return ENTITY_PAYLOAD_BUILDERS[normalizedType] || (async (data, options) => buildGenericAuditData(data, options));
}
