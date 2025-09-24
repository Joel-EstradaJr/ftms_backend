interface AuditLogParams {
  action: string;
  table_affected: 'RevenueRecord' | 'ExpenseRecord' | 'Revenue AND Expense' | 'Reimbursement';
  record_id: string;
  performed_by: string;
  details: string;
}

export async function logAuditToServer(params: AuditLogParams): Promise<void> {
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}