"use client";

import React, { useState } from 'react';
import '../../../../styles/components/modal.css';
import '../../../../styles/loan-management/viewLoanPayment.css';

interface ViewLoanPaymentModalProps {
  show: boolean;
  onClose: () => void;
  loan: any;
}

export default function ViewLoanPaymentModal({ show, onClose, loan }: ViewLoanPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'schedule'>('info');
  
  if (!show || !loan) return null;

  /**
   * Formats number as Philippine Peso currency
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  /**
   * Formats date to readable format
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatLoanType = (type: string) => {
    const types: { [key: string]: string } = {
      'PERSONAL': 'Personal',
      'EMERGENCY': 'Emergency',
      'EDUCATIONAL': 'Educational',
      'HOUSING': 'Housing',
      'MEDICAL': 'Medical',
      'BUSINESS': 'Business',
      'VEHICLE': 'Vehicle',
      'CONSUMER': 'Consumer'
    };
    return types[type] || type;
  };

  const formatPaymentType = (type: string) => {
    const types: { [key: string]: string } = {
      'REGULAR': 'Regular',
      'PARTIAL': 'Partial',
      'FULL': 'Full Payment',
      'IRREGULAR': 'Irregular'
    };
    return types[type] || type;
  };

  const formatPaymentMethod = (method: string) => {
    const methods: { [key: string]: string } = {
      'CASH': 'Cash',
      'CHECK': 'Check',
      'BANK_TRANSFER': 'Bank Transfer',
      'SALARY_DEDUCTION': 'Salary Deduction'
    };
    return methods[method] || method;
  };

  const formatStatus = (status: string) => {
    const statuses: { [key: string]: string } = {
      'ACTIVE': 'Active',
      'OVERDUE': 'Overdue',
      'CLOSED': 'Closed'
    };
    return statuses[status] || status;
  };

  const getStatusChipClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'ACTIVE': 'active',
      'OVERDUE': 'overdue',
      'CLOSED': 'closed'
    };
    return statusMap[status] || 'pending';
  };

  // Handle multiple field name variations and null values
  const totalPaid = loan.total_amount_paid || loan.total_paid || 0;
  const principalAmount = loan.principal_amount || loan.approved_amount || loan.disbursed_amount || 0;
  const remainingBalance = loan.remaining_balance ?? (principalAmount - totalPaid);
  const paymentProgress = principalAmount > 0 
    ? ((totalPaid / principalAmount) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContainer viewLoanPaymentModal" onClick={(e) => e.stopPropagation()}>
        {/* Header with Loan ID */}
        <div className="modalHeader">
          <h1>Loan Payment Details</h1>
          <button className="closeButton" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modalContent">
          {/* Summary Cards */}
          <div className="payment-summary-cards">
            <div className="summary-card primary">
              <div className="summary-card-icon">💰</div>
              <div className="summary-card-label">Principal Amount</div>
              <div className="summary-card-value">{formatCurrency(principalAmount)}</div>
            </div>

            <div className="summary-card success">
              <div className="summary-card-icon">✓</div>
              <div className="summary-card-label">Total Paid</div>
              <div className="summary-card-value">{formatCurrency(totalPaid)}</div>
              <div className="summary-card-subtext">{paymentProgress}% Complete</div>
            </div>

            <div className="summary-card warning">
              <div className="summary-card-icon">⏳</div>
              <div className="summary-card-label">Remaining Balance</div>
              <div className="summary-card-value">{formatCurrency(remainingBalance)}</div>
            </div>

            <div className="summary-card info">
              <div className="summary-card-icon">📊</div>
              <div className="summary-card-label">Total Payments</div>
              <div className="summary-card-value">{loan.number_of_payments || loan.payments_made || 0}</div>
            </div>
          </div>

          {/* Loan Information Section */}
          <div className="loan-info-section">
            <h4>Loan Information</h4>
            <div className="loan-info-grid">
              <div className="loan-info-item">
                <div className="loan-info-label">Employee Name</div>
                <div className="loan-info-value">{loan.employee?.full_name || loan.employee?.name || 'N/A'}</div>
              </div>
              <div className="loan-info-item">
                <div className="loan-info-label">Department</div>
                <div className="loan-info-value">{loan.employee?.department || 'N/A'}</div>
              </div>
              <div className="loan-info-item">
                <div className="loan-info-label">Loan Type</div>
                <div className="loan-info-value">{formatLoanType(loan.loan_type)}</div>
              </div>
              <div className="loan-info-item">
                <div className="loan-info-label">Status</div>
                <div className="loan-info-value">
                  <span className={`payment-status-chip ${getStatusChipClass(loan.status)}`}>
                    {formatStatus(loan.status)}
                  </span>
                </div>
              </div>
              <div className="loan-info-item">
                <div className="loan-info-label">Disbursement Date</div>
                <div className="loan-info-value">{formatDate(loan.disbursement_date || loan.disbursed_date)}</div>
              </div>
              <div className="loan-info-item">
                <div className="loan-info-label">Interest Rate</div>
                <div className="loan-info-value">{loan.interest_rate || 0}%</div>
              </div>
            </div>
          </div>

          {/* Payment Schedule Section */}
          <div className="payment-schedule-section">
            <div className="payment-schedule-header">
              <h4>📅 Payment Schedule</h4>
              <span className="schedule-subtitle">Track all scheduled installments and payment history</span>
            </div>
            
            {loan.paymentSchedule && loan.paymentSchedule.length > 0 ? (
              <div className="payment-table-container">
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>Due Date</th>
                      <th>Scheduled Amount</th>
                      <th>Amount Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Payment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.paymentSchedule.map((schedule: any, index: number) => {
                      const isPaid = schedule.status === 'PAID';
                      const isPartial = schedule.status === 'PARTIAL';
                      const isOverdue = schedule.status === 'OVERDUE';
                      const isPending = schedule.status === 'PENDING';
                      
                      return (
                        <tr key={index} className={isOverdue ? 'overdue-row' : isPartial ? 'partial-row' : ''}>
                          <td>{formatDate(schedule.payment_date || schedule.due_date)}</td>
                          <td style={{ fontWeight: 600 }}>
                            {formatCurrency(schedule.amount || schedule.scheduled_amount)}
                          </td>
                          <td style={{ color: isPaid ? '#166534' : '#6b7280', fontWeight: 600 }}>
                            {formatCurrency(schedule.paid_amount || 0)}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {formatCurrency(schedule.balance || schedule.amount)}
                          </td>
                          <td>
                            <span className={`chip ${isPaid ? 'paid' : isPartial ? 'partial' : isOverdue ? 'overdue' : 'pending'}`}>
                              {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : isOverdue ? 'OVERDUE' : 'PENDING'}
                            </span>
                          </td>
                          <td style={{ color: '#6b7280', fontStyle: isPaid ? 'normal' : 'italic' }}>
                            {isPaid && schedule.payment_records && schedule.payment_records.length > 0
                              ? formatDate(schedule.payment_records[schedule.payment_records.length - 1].payment_date)
                              : isPaid 
                                ? formatDate(schedule.paid_date)
                                : 'Not yet paid'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-message">No payment schedule available</div>
              </div>
            )}
          </div>

          {/* Payment History Section */}
          <div className="payment-history-section">
            <div className="payment-history-header">
              <h4>💳 Payment Transaction History</h4>
              {loan.loanPayments && loan.loanPayments.length > 0 && (
                <button className="export-button" onClick={() => alert('Export functionality')}>
                  📥 Export History
                </button>
              )}
            </div>
            
            {loan.loanPayments && loan.loanPayments.length > 0 ? (
              <>
                <div className="payment-table-container">
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>Payment Date</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loan.loanPayments.slice(0, 5).map((payment: any, index: number) => (
                        <tr key={index}>
                          <td>{formatDate(payment.payment_date)}</td>
                          <td style={{ fontWeight: 700, color: '#166534' }}>
                            {formatCurrency(payment.payment_amount)}
                          </td>
                          <td>{formatPaymentType(payment.payment_type)}</td>
                          <td>{formatPaymentMethod(payment.payment_method)}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                            {payment.reference_number || payment.receipt_number || 'N/A'}
                          </td>
                          <td>
                            <span className="payment-status-chip completed">Paid</span>
                          </td>
                          <td>
                            <div className="payment-action-buttons">
                              <button className="payment-action-btn view" title="View Details">
                                👁️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {loan.loanPayments.length > 5 && (
                  <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', marginTop: '1rem' }}>
                    Showing 5 of {loan.loanPayments.length} payments
                  </p>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">💳</div>
                <div className="empty-state-message">No payment history available</div>
              </div>
            )}
          </div>

          {/* Next Payment Card */}
          {loan.status === 'ACTIVE' && remainingBalance > 0 && loan.next_payment_date && (
            <div className={`next-payment-card ${loan.days_overdue && loan.days_overdue > 0 ? 'overdue' : ''}`}>
              <div className="next-payment-label">
                {loan.days_overdue && loan.days_overdue > 0 ? '⚠️ Overdue Payment' : '📅 Next Payment Due'}
              </div>
              <div className="next-payment-info">
                <div className="next-payment-amount">
                  {formatCurrency(loan.installment_amount || 0)}
                </div>
                <div className="next-payment-date">
                  Due: {formatDate(loan.next_payment_date)}
                </div>
              </div>
              {loan.days_overdue && loan.days_overdue > 0 && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                  {loan.days_overdue} days overdue
                </p>
              )}
            </div>
          )}

          {/* Notes Section */}
          {loan.notes && (
            <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '6px', marginTop: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', fontSize: '1rem' }}>
                📝 Notes
              </h4>
              <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>{loan.notes}</p>
            </div>
          )}
        </div>

        <div className="modalFooter" style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
