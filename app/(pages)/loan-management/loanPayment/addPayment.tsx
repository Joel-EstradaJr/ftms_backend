"use client";

import React, { useState, useEffect } from 'react';
import '../../../styles/components/modal.css';
import '../../../styles/loan-management/addLoanPayment.css';
import {
  showPaymentConfirmation,
  showPartialPaymentWarning,
  showOverpaymentWarning,
  showPaymentSuccess,
  showPaymentError
} from '@/app/utility/Alerts';
import {
  validatePaymentAmount,
  validatePartialPayment,
  isNotFutureDate,
  isValidPaymentMethod,
  isValidReceiptNumber,
  isValidReferenceNumber,
  isValidPaymentNotes,
  sanitizeNotesInput,
  normalizeCurrencyAmount,
  PAYMENT_METHODS
} from '@/app/utility/validation';

interface AddPaymentModalProps {
  show: boolean;
  loan: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function AddPaymentModal({ show, loan, onClose, onSubmit }: AddPaymentModalProps) {
  const [formData, setFormData] = useState({
    payment_amount: '',
    payment_type: 'REGULAR',
    payment_method: 'CASH',
    payment_date: new Date().toISOString().split('T')[0],
    receipt_number: '',
    reference_number: '',
    notes: ''
  });

  const [remainingBalance, setRemainingBalance] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (loan) {
      const totalPaid = loan.total_amount_paid || loan.total_paid || 0;
      const principalAmount = loan.principal_amount || loan.approved_amount || loan.disbursed_amount || 0;
      const balance = principalAmount - totalPaid;
      setRemainingBalance(balance);
    }
  }, [loan]);

  // Real-time validation for payment amount using our validation utilities
  useEffect(() => {
    if (formData.payment_amount) {
      const amount = normalizeCurrencyAmount(formData.payment_amount);
      
      if (isNaN(amount)) {
        setErrors(prev => ({
          ...prev,
          payment_amount: 'Please enter a valid payment amount'
        }));
        return;
      }

      // Validate payment amount using our utility function
      const amountError = validatePaymentAmount(amount, remainingBalance, {
        allowOverpayment: false,
        minimumAmount: 0.01
      });

      if (amountError) {
        setErrors(prev => ({
          ...prev,
          payment_amount: amountError
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.payment_amount;
          return newErrors;
        });
      }
    }
  }, [formData.payment_amount, remainingBalance]);

  if (!show || !loan) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Validates the payment form using our centralized validation utilities
   * @returns {boolean} - True if form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validate payment amount
    const amount = normalizeCurrencyAmount(formData.payment_amount);
    if (isNaN(amount) || !formData.payment_amount) {
      newErrors.payment_amount = 'Payment amount is required and must be a valid number';
    } else {
      const amountError = validatePaymentAmount(amount, remainingBalance, {
        allowOverpayment: false,
        minimumAmount: 0.01
      });
      if (amountError) {
        newErrors.payment_amount = amountError;
      }
    }

    // Validate payment date
    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
    } else if (!isNotFutureDate(formData.payment_date)) {
      newErrors.payment_date = 'Payment date cannot be in the future';
    }

    // Validate payment method
    if (!isValidPaymentMethod(formData.payment_method)) {
      newErrors.payment_method = 'Please select a valid payment method';
    }

    // Validate receipt number (optional but must be valid if provided)
    if (formData.receipt_number && !isValidReceiptNumber(formData.receipt_number)) {
      newErrors.receipt_number = 'Receipt number must be 5-20 alphanumeric characters (A-Z, 0-9, -)';
    }

    // Validate reference number (required for certain payment methods)
    if (formData.payment_method === 'CHECK' || formData.payment_method === 'BANK_TRANSFER') {
      if (!formData.reference_number) {
        newErrors.reference_number = `Reference number is required for ${formData.payment_method.toLowerCase().replace('_', ' ')} payments`;
      } else if (!isValidReferenceNumber(formData.reference_number)) {
        newErrors.reference_number = 'Reference number must be 6-30 alphanumeric characters';
      }
    }

    // Validate notes (optional but must be valid if provided)
    if (formData.notes && !isValidPaymentNotes(formData.notes)) {
      newErrors.notes = 'Notes must be between 2 and 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission with validation and confirmation
   * Uses our centralized alert utilities for user feedback
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      await showPaymentError('Please fix all validation errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const amount = normalizeCurrencyAmount(formData.payment_amount);
      const newBalance = remainingBalance - amount;

      // Sanitize notes input
      const sanitizedNotes = formData.notes ? sanitizeNotesInput(formData.notes) : '';

      // Check for partial payment warning
      const partialPaymentCheck = validatePartialPayment(amount, remainingBalance);
      if (partialPaymentCheck.isPartial) {
        const partialResult = await showPartialPaymentWarning(amount, newBalance);
        if (!partialResult.isConfirmed) {
          setIsSubmitting(false);
          return;
        }
      }

      // Show payment confirmation
      const loanId = loan.loan_id || loan.loan_request_id || loan.id;
      const confirmResult = await showPaymentConfirmation(amount, loanId);
      
      if (confirmResult.isConfirmed) {
        const paymentData = {
          ...formData,
          payment_amount: amount,
          loan_id: loanId,
          remaining_balance: newBalance,
          notes: sanitizedNotes
        };

        // Submit payment
        await onSubmit(paymentData);

        // Show success message
        await showPaymentSuccess(formData.receipt_number || undefined);

        // Reset form
        setFormData({
          payment_amount: '',
          payment_type: 'REGULAR',
          payment_method: 'CASH',
          payment_date: new Date().toISOString().split('T')[0],
          receipt_number: '',
          reference_number: '',
          notes: ''
        });
        setErrors({});
        
        // Close modal
        onClose();
      }
    } catch (error) {
      console.error('Payment submission error:', error);
      await showPaymentError(
        error instanceof Error ? error.message : 'An error occurred while processing the payment.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const newBalance = remainingBalance - (parseFloat(formData.payment_amount) || 0);

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContainer addLoanPaymentModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h1>Add Loan Payment</h1>
          <button className="closeButton" onClick={onClose} disabled={isSubmitting}>&times;</button>
        </div>

        <div className="modalContent">
          <form onSubmit={handleSubmit} className={isSubmitting ? 'payment-form-loading' : ''}>
            {/* Loan Summary Box */}
            <div className="loan-summary-box">
              <h4>Loan Information</h4>
              <div className="loan-summary-grid">
                <div className="loan-summary-item">
                  <strong>Employee:</strong> {loan.employee?.full_name || 'N/A'}
                </div>
                <div className="loan-summary-item">
                  <strong>Loan ID:</strong> {loan.loan_id || loan.loan_request_id || loan.id}
                </div>
                <div className="loan-summary-item">
                  <strong>Principal Amount:</strong> {formatCurrency(loan.principal_amount || loan.approved_amount || loan.disbursed_amount || 0)}
                </div>
                <div className="loan-summary-item">
                  <strong>Total Paid:</strong> {formatCurrency(loan.total_amount_paid || loan.total_paid || 0)}
                </div>
                <div className="loan-summary-item highlight">
                  <strong>Remaining Balance:</strong> {formatCurrency(remainingBalance)}
                </div>
              </div>
            </div>

            {/* Payment Amount Section */}
            <div className="payment-amount-section">
              <h4>Payment Amount</h4>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="payment_amount">Payment Amount <span className="required">*</span></label>
                  <input
                    type="number"
                    id="payment_amount"
                    name="payment_amount"
                    value={formData.payment_amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={remainingBalance}
                    required
                    className={errors.payment_amount ? 'error' : ''}
                  />
                  {errors.payment_amount && (
                    <span className="error-message">{errors.payment_amount}</span>
                  )}
                  {formData.payment_amount && !errors.payment_amount && (
                    <span className="helper-text">
                      New balance: {formatCurrency(newBalance >= 0 ? newBalance : 0)}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="payment_date">Payment Date <span className="required">*</span></label>
                  <input
                    type="date"
                    id="payment_date"
                    name="payment_date"
                    value={formData.payment_date}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className={errors.payment_date ? 'error' : ''}
                  />
                  {errors.payment_date && (
                    <span className="error-message">{errors.payment_date}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="payment-details-section">
              <h4>Payment Details</h4>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="payment_type">Payment Type <span className="required">*</span></label>
                  <select
                    id="payment_type"
                    name="payment_type"
                    value={formData.payment_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="REGULAR">Regular Payment</option>
                    <option value="PARTIAL">Partial Payment</option>
                    <option value="FULL">Full Payment</option>
                    <option value="IRREGULAR">Irregular Payment</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="payment_method">Payment Method <span className="required">*</span></label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    required
                  >
                    <option value="CASH">Cash</option>
                    <option value="CHECK">Check</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="SALARY_DEDUCTION">Salary Deduction</option>
                  </select>
                </div>
              </div>

              {/* Receipt Number Field */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="receipt_number">Receipt Number</label>
                  <input
                    type="text"
                    id="receipt_number"
                    name="receipt_number"
                    value={formData.receipt_number}
                    onChange={handleChange}
                    placeholder="e.g., REC-2025-0001"
                    className={errors.receipt_number ? 'input-error' : ''}
                    maxLength={20}
                  />
                  {errors.receipt_number && (
                    <span className="error-message">{errors.receipt_number}</span>
                  )}
                  <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    Optional: 5-20 alphanumeric characters (A-Z, 0-9, -)
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="reference_number">
                    Reference Number
                    {(formData.payment_method === 'CHECK' || formData.payment_method === 'BANK_TRANSFER') && (
                      <span className="required">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    id="reference_number"
                    name="reference_number"
                    value={formData.reference_number}
                    onChange={handleChange}
                    placeholder="Enter check number or transaction reference"
                    className={errors.reference_number ? 'input-error' : ''}
                    maxLength={30}
                  />
                  {errors.reference_number && (
                    <span className="error-message">{errors.reference_number}</span>
                  )}
                </div>
              </div>

              {/* Notes Field */}
              <div className="form-group">
                <label htmlFor="notes">Notes / Remarks</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Add any additional notes about this payment (optional)"
                  rows={3}
                  className={errors.notes ? 'input-error' : ''}
                  maxLength={500}
                />
                {errors.notes && (
                  <span className="error-message">{errors.notes}</span>
                )}
                <div className="remarks-counter">
                  {formData.notes.length} / 500 characters
                </div>
              </div>
            </div>

            {/* Remaining Balance Display */}
            {formData.payment_amount && !errors.payment_amount && (
              <div className={`remaining-balance-box ${newBalance > 0 && newBalance < remainingBalance ? 'partial-payment' : ''} ${newBalance === 0 ? '' : ''}`}>
                <div className="remaining-balance-label">
                  {newBalance === 0 ? '✓ Loan Will Be Fully Paid' : 'Remaining Balance After Payment'}
                </div>
                <div className="remaining-balance-amount">
                  {formatCurrency(newBalance >= 0 ? newBalance : 0)}
                </div>
                {newBalance > 0 && newBalance < remainingBalance && (
                  <small style={{ fontSize: '0.85rem', color: '#856404', marginTop: '0.5rem', display: 'block' }}>
                    This is a partial payment
                  </small>
                )}
              </div>
            )}

            {/* Payment Summary Card */}
            {formData.payment_amount && !errors.payment_amount && (
              <div className="payment-summary-card">
                <h4>Payment Summary</h4>
                <div className="payment-summary-grid">
                  <div className="payment-summary-item">
                    <div className="payment-summary-item-label">Current Balance</div>
                    <div className="payment-summary-item-value">{formatCurrency(remainingBalance)}</div>
                  </div>
                  <div className="payment-summary-item">
                    <div className="payment-summary-item-label">Payment Amount</div>
                    <div className="payment-summary-item-value" style={{ color: '#22c55e' }}>
                      -{formatCurrency(parseFloat(formData.payment_amount))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="modalFooter">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || Object.keys(errors).length > 0}
              >
                {isSubmitting ? 'Processing...' : '✓ Add Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
