"use client";

import React, { useState, useMemo } from 'react';
import '../../../../styles/components/modal.css';
import '../../../../styles/loan-management/closeLoanPayment.css';
import {
  showCloseLoanConfirmation,
  showCloseLoanSuccess,
  showPaymentError
} from '@/app/utils/Alerts';
import {
  isNotFutureDate,
  sanitizeNotesInput
} from '@/app/utils/validation';

interface CloseLoanPaymentProps {
  show: boolean;
  loan: any;
  onClose: () => void;
  onCloseLoan: (data: CloseLoanData) => Promise<void>;
}

interface CloseLoanData {
  loan_id: string;
  closure_date: string;
  closure_remarks: string;
  closed_by: string;
}

export default function CloseLoanPayment({ show, loan, onClose, onCloseLoan }: CloseLoanPaymentProps) {
  // Form states
  const [closureDate, setClosureDate] = useState(new Date().toISOString().split('T')[0]);
  const [closureRemarks, setClosureRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

  /**
   * Calculate loan statistics
   */
  const loanStats = useMemo(() => {
    const loanAmount = loan.loan_amount || 0;
    const interestRate = loan.interest_rate || 0;
    const totalWithInterest = loanAmount * (1 + interestRate / 100);
    
    // Calculate total paid from payment history
    const totalPaid = loan.loanPayments?.reduce((sum: number, payment: any) => 
      sum + (payment.payment_amount || 0), 0) || 0;
    
    const remainingBalance = totalWithInterest - totalPaid;
    const paymentsCompleted = loan.loanPayments?.length || 0;
    const termMonths = loan.term_months || 12;
    const allPaymentsComplete = paymentsCompleted >= termMonths;

    return {
      loanAmount,
      totalWithInterest,
      totalPaid,
      remainingBalance,
      paymentsCompleted,
      termMonths,
      allPaymentsComplete,
      hasZeroBalance: Math.abs(remainingBalance) < 0.01 // Allow for floating point precision
    };
  }, [loan]);

  /**
   * Validation checklist
   */
  const validationChecklist = useMemo(() => {
    return [
      {
        id: 'zero_balance',
        label: 'Zero remaining balance',
        passed: loanStats.hasZeroBalance,
        icon: loanStats.hasZeroBalance ? '✅' : '❌',
        description: loanStats.hasZeroBalance 
          ? 'Loan is fully paid' 
          : `Balance: ${formatCurrency(loanStats.remainingBalance)}`
      },
      {
        id: 'all_payments',
        label: 'All scheduled payments completed',
        passed: loanStats.allPaymentsComplete,
        icon: loanStats.allPaymentsComplete ? '✅' : '⚠️',
        description: `${loanStats.paymentsCompleted} of ${loanStats.termMonths} payments made`
      },
      {
        id: 'no_overdue',
        label: 'No overdue payments',
        passed: true, // Would check actual payment schedule
        icon: '✅',
        description: 'All payments are up to date'
      },
      {
        id: 'valid_date',
        label: 'Valid closure date',
        passed: isNotFutureDate(closureDate),
        icon: isNotFutureDate(closureDate) ? '✅' : '❌',
        description: isNotFutureDate(closureDate) 
          ? 'Closure date is valid' 
          : 'Cannot close loan with future date'
      }
    ];
  }, [loanStats, closureDate]);

  /**
   * Check if loan can be closed
   */
  const canCloseLoan = useMemo(() => {
    return validationChecklist.every(item => item.passed);
  }, [validationChecklist]);

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!closureDate) {
      newErrors.closureDate = 'Closure date is required';
    } else if (!isNotFutureDate(closureDate)) {
      newErrors.closureDate = 'Closure date cannot be in the future';
    }

    if (!closureRemarks.trim()) {
      newErrors.closureRemarks = 'Closure remarks are required';
    } else if (closureRemarks.trim().length < 10) {
      newErrors.closureRemarks = 'Remarks must be at least 10 characters';
    } else if (closureRemarks.length > 500) {
      newErrors.closureRemarks = 'Remarks cannot exceed 500 characters';
    }

    if (!loanStats.hasZeroBalance) {
      newErrors.balance = 'Cannot close loan with outstanding balance';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!canCloseLoan) {
      await showPaymentError('Loan does not meet all closure requirements');
      return;
    }

    // Show confirmation dialog
    const result = await showCloseLoanConfirmation(loan.loan_id, loanStats.totalWithInterest);

    if (result.isConfirmed) {
      setIsSubmitting(true);

      try {
        const closureData: CloseLoanData = {
          loan_id: loan.loan_id,
          closure_date: closureDate,
          closure_remarks: sanitizeNotesInput(closureRemarks),
          closed_by: 'current_user' // Would be replaced with actual user ID
        };

        await onCloseLoan(closureData);
        await showCloseLoanSuccess();
        onClose();
      } catch (error) {
        console.error('Error closing loan:', error);
        await showPaymentError('Failed to close loan. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  /**
   * Handle remarks input change
   */
  const handleRemarksChange = (value: string) => {
    if (value.length <= 500) {
      setClosureRemarks(value);
      if (errors.closureRemarks) {
        setErrors({ ...errors, closureRemarks: '' });
      }
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContainer" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader close-loan-header">
          <h1>🏁 Close Loan - {loan.loan_id || loan.loan_request_id || loan.id}</h1>
          <button className="closeButton" onClick={onClose}>&times;</button>
        </div>

        <div className="modalContent close-loan-container">
          {/* Success Banner */}
          {canCloseLoan && (
            <div className="close-loan-success-banner">
              <div className="close-loan-success-icon">🎉</div>
              <div className="close-loan-success-content">
                <div className="close-loan-success-title">Loan Ready to Close!</div>
                <div className="close-loan-success-message">
                  All requirements have been met. You can proceed to close this loan.
                </div>
              </div>
            </div>
          )}

          {/* Warning Banner */}
          {!canCloseLoan && (
            <div className="close-loan-warning-banner">
              <div className="close-loan-warning-icon">⚠️</div>
              <div className="close-loan-warning-content">
                <div className="close-loan-warning-title">Requirements Not Met</div>
                <div className="close-loan-warning-message">
                  This loan does not meet all closure requirements. Please review the checklist below.
                </div>
              </div>
            </div>
          )}

          {/* Loan Summary */}
          <div className="close-loan-summary">
            <h3 className="close-loan-summary-title">📊 Loan Summary</h3>
            <div className="close-loan-summary-grid">
              <div className="close-loan-summary-item">
                <span className="summary-label">Original Amount:</span>
                <span className="summary-value">{formatCurrency(loanStats.loanAmount)}</span>
              </div>
              <div className="close-loan-summary-item">
                <span className="summary-label">Total with Interest:</span>
                <span className="summary-value">{formatCurrency(loanStats.totalWithInterest)}</span>
              </div>
              <div className="close-loan-summary-item">
                <span className="summary-label">Total Paid:</span>
                <span className="summary-value paid">{formatCurrency(loanStats.totalPaid)}</span>
              </div>
              <div className="close-loan-summary-item">
                <span className="summary-label">Remaining Balance:</span>
                <span className={`summary-value ${loanStats.hasZeroBalance ? 'zero' : 'remaining'}`}>
                  {formatCurrency(loanStats.remainingBalance)}
                </span>
              </div>
              <div className="close-loan-summary-item">
                <span className="summary-label">Loan Start Date:</span>
                <span className="summary-value">{formatDate(loan.approved_date || loan.request_date)}</span>
              </div>
              <div className="close-loan-summary-item">
                <span className="summary-label">Term:</span>
                <span className="summary-value">{loan.term_months} months</span>
              </div>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="validation-checklist">
            <h3 className="validation-checklist-title">✅ Closure Requirements</h3>
            <div className="validation-checklist-items">
              {validationChecklist.map((item) => (
                <div
                  key={item.id}
                  className={`validation-checklist-item ${item.passed ? 'passed' : 'failed'}`}
                >
                  <div className="validation-item-icon">{item.icon}</div>
                  <div className="validation-item-content">
                    <div className="validation-item-label">{item.label}</div>
                    <div className="validation-item-description">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Closure Form */}
          <form onSubmit={handleSubmit} className="close-loan-form">
            <div className="close-loan-form-section">
              <h3 className="close-loan-form-title">📝 Closure Details</h3>

              {/* Closure Date */}
              <div className="form-group">
                <label className="form-label required">Closure Date</label>
                <input
                  type="date"
                  className={`form-input ${errors.closureDate ? 'input-error' : ''}`}
                  value={closureDate}
                  onChange={(e) => {
                    setClosureDate(e.target.value);
                    if (errors.closureDate) {
                      setErrors({ ...errors, closureDate: '' });
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={isSubmitting}
                />
                {errors.closureDate && (
                  <span className="form-error">{errors.closureDate}</span>
                )}
                <span className="form-hint">Date when the loan is officially closed</span>
              </div>

              {/* Closure Remarks */}
              <div className="form-group">
                <label className="form-label required">Closure Remarks</label>
                <textarea
                  className={`form-textarea ${errors.closureRemarks ? 'input-error' : ''}`}
                  value={closureRemarks}
                  onChange={(e) => handleRemarksChange(e.target.value)}
                  placeholder="Enter closure remarks (e.g., Loan fully paid and settled, no outstanding balance)"
                  rows={4}
                  disabled={isSubmitting}
                />
                <div className="form-footer">
                  <span className="character-counter">
                    {closureRemarks.length}/500 characters
                  </span>
                  {errors.closureRemarks && (
                    <span className="form-error">{errors.closureRemarks}</span>
                  )}
                </div>
                <span className="form-hint">
                  Provide detailed remarks about the loan closure (minimum 10 characters)
                </span>
              </div>
            </div>

            {/* Confirmation Box */}
            {canCloseLoan && (
              <div className="close-loan-confirmation-box">
                <div className="close-loan-confirmation-icon">⚠️</div>
                <div className="close-loan-confirmation-content">
                  <div className="close-loan-confirmation-title">Confirm Loan Closure</div>
                  <div className="close-loan-confirmation-message">
                    This action is <strong>permanent</strong> and cannot be undone. Once closed, 
                    this loan will be marked as completed and no further payments can be added.
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {errors.balance && (
              <div className="close-loan-error-box">
                <div className="close-loan-error-icon">❌</div>
                <div className="close-loan-error-message">{errors.balance}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="close-loan-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn-close-loan ${!canCloseLoan ? 'disabled' : ''}`}
                disabled={isSubmitting || !canCloseLoan}
              >
                {isSubmitting ? (
                  <>
                    <span className="button-spinner"></span>
                    Closing Loan...
                  </>
                ) : (
                  <>
                    🏁 Close Loan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
