"use client";

import React, { useState, useEffect } from 'react';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';
import '../../../../styles/loan-management/addLoanPayment.css';
import {
  showPaymentConfirmation,
  showPartialPaymentWarning,
  showPaymentSuccess,
  showPaymentError
} from '@/app/utils/Alerts';
import {
  validatePaymentAmount,
  isNotFutureDate,
  isValidPaymentMethod,
  isValidPaymentNotes,
  sanitizeNotesInput,
  normalizeCurrencyAmount
} from '@/app/utils/validation';

interface AddPaymentModalProps {
  show: boolean;
  loan: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface ScheduledPayment {
  id: string;
  installment_number: number;
  payment_date: string;
  amount: number;
  paid_amount: number;
  balance: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  payment_records?: PaymentRecord[];
}

interface PaymentRecord {
  receipt_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  notes?: string;
}

export default function AddPaymentModal({ show, loan, onClose, onSubmit }: AddPaymentModalProps) {
  const [paymentSchedule, setPaymentSchedule] = useState<ScheduledPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<ScheduledPayment | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate auto-receipt number based on current timestamp
  const generateReceiptNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `REC-${year}${month}${day}-${hours}${minutes}${seconds}`;
  };

  // Generate auto-reference number based on payment method and timestamp
  const generateReferenceNumber = (paymentMethod: string) => {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-8);
    const prefix = paymentMethod === 'CHECK' ? 'CHK' : 
                   paymentMethod === 'BANK_TRANSFER' ? 'BTR' : 
                   paymentMethod === 'SALARY_DEDUCTION' ? 'SAL' : 'REF';
    return `${prefix}-${timestamp}`;
  };

  const [formData, setFormData] = useState({
    payment_amount: '',
    payment_type: 'REGULAR',
    payment_method: 'CASH',
    payment_date: new Date().toISOString().split('T')[0],
    receipt_number: generateReceiptNumber(),
    reference_number: generateReferenceNumber('CASH'),
    notes: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load or generate payment schedule
  useEffect(() => {
    if (loan) {
      if (loan.paymentSchedule && Array.isArray(loan.paymentSchedule)) {
        setPaymentSchedule(loan.paymentSchedule);
      } else {
        const schedule = generatePaymentSchedule(loan);
        setPaymentSchedule(schedule);
      }
    }
  }, [loan]);

  /**
   * Generate payment schedule based on loan terms
   */
  const generatePaymentSchedule = (loanData: any): ScheduledPayment[] => {
    const schedule: ScheduledPayment[] = [];
    const principalAmount = loanData.principal_amount || loanData.approved_amount || loanData.disbursed_amount || 0;
    const termMonths = loanData.term_months || loanData.repayment_terms || 12;
    const startDate = new Date(loanData.disbursement_date || loanData.disbursed_date || loanData.approved_date || new Date());
    const monthlyPayment = principalAmount / termMonths;

    for (let i = 0; i < termMonths; i++) {
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + i + 1);

      const status = checkPaymentStatus(paymentDate);

      schedule.push({
        id: `payment-${i + 1}`,
        installment_number: i + 1,
        payment_date: paymentDate.toISOString().split('T')[0],
        amount: monthlyPayment,
        paid_amount: 0,
        balance: monthlyPayment,
        status: status,
        payment_records: []
      });
    }

    return schedule;
  };

  /**
   * Check payment status based on due date
   */
  const checkPaymentStatus = (dueDate: Date): 'PENDING' | 'OVERDUE' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate < today ? 'OVERDUE' : 'PENDING';
  };

  /**
   * Calculate days until/overdue
   */
  const calculateDaysUntil = (dueDate: string): { days: number; isOverdue: boolean } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      days: Math.abs(diffDays),
      isOverdue: diffDays < 0
    };
  };

  /**
   * Check if payment can be made based on sequential payment rule
   */
  const canPayInstallment = (
    payment: ScheduledPayment, 
    allPayments: ScheduledPayment[]
  ): { canPay: boolean; reason?: string } => {
    
    // Find the index of current payment
    const currentIndex = allPayments.findIndex(p => p.id === payment.id);
    
    // Check if any previous payments are not fully paid
    const unpaidPrevious = allPayments
      .slice(0, currentIndex)
      .filter(p => p.status !== 'PAID');
    
    if (unpaidPrevious.length > 0) {
      const firstUnpaid = unpaidPrevious[0];
      return {
        canPay: false,
        reason: `Please pay Installment #${firstUnpaid.installment_number} (${formatDate(firstUnpaid.payment_date)}) first`
      };
    }
    
    // If already fully paid, cannot pay more
    if (payment.status === 'PAID') {
      return {
        canPay: false,
        reason: 'This installment is already fully paid'
      };
    }
    
    return { canPay: true };
  };

  if (!show || !loan) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Handle "Pay" button click - open payment form
   */
  const handlePayClick = async (payment: ScheduledPayment) => {
    const paymentCheck = canPayInstallment(payment, paymentSchedule);
    
    if (!paymentCheck.canPay) {
      await showPaymentError(paymentCheck.reason || 'Cannot process payment');
      return;
    }

    setSelectedPayment(payment);
    setFormData({
      ...formData,
      payment_amount: payment.balance.toString(),
      receipt_number: generateReceiptNumber(),
      reference_number: generateReferenceNumber(formData.payment_method)
    });
    setShowPaymentForm(true);
  };

  /**
   * Handle "View Receipt" button click
   */
  const handleViewReceipt = (payment: ScheduledPayment) => {
    // TODO: Open receipt viewer modal
    console.log('View receipt:', payment.payment_records);
  };

  /**
   * Handle back to schedule
   */
  const handleBackToSchedule = () => {
    setShowPaymentForm(false);
    setSelectedPayment(null);
    setFormData({
      payment_amount: '',
      payment_type: 'REGULAR',
      payment_method: 'CASH',
      payment_date: new Date().toISOString().split('T')[0],
      receipt_number: generateReceiptNumber(),
      reference_number: generateReferenceNumber('CASH'),
      notes: ''
    });
    setErrors({});
  };

  /**
   * Auto-detect payment type based on payment amount
   */
  const detectPaymentType = (amount: number, balance: number): string => {
    if (amount <= 0 || isNaN(amount)) {
      return 'REGULAR';
    }
    
    const difference = Math.abs(balance - amount);
    
    // If payment equals balance (within 1 peso tolerance)
    if (difference <= 1) {
      return 'FULL';
    }
    
    // If payment is less than balance
    if (amount < balance) {
      return 'PARTIAL';
    }
    
    // If payment is more than balance (overpayment)
    if (amount > balance) {
      return 'IRREGULAR';
    }
    
    return 'REGULAR';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'payment_method') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        reference_number: generateReferenceNumber(value)
      }));
    } else if (name === 'payment_amount' && selectedPayment) {
      // Auto-detect payment type based on amount
      const amount = parseFloat(value) || 0;
      const detectedType = detectPaymentType(amount, selectedPayment.balance);
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        payment_type: detectedType
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Validate payment form
   */
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    const amount = normalizeCurrencyAmount(formData.payment_amount);
    if (isNaN(amount) || !formData.payment_amount) {
      newErrors.payment_amount = 'Payment amount is required and must be a valid number';
    } else if (selectedPayment && amount > selectedPayment.balance) {
      newErrors.payment_amount = `Payment amount cannot exceed remaining balance of ${formatCurrency(selectedPayment.balance)}`;
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
    } else if (!isNotFutureDate(formData.payment_date)) {
      newErrors.payment_date = 'Payment date cannot be in the future';
    }

    if (!isValidPaymentMethod(formData.payment_method)) {
      newErrors.payment_method = 'Please select a valid payment method';
    }

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

    if (!validateForm() || !selectedPayment) {
      await showPaymentError('Please fix all validation errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const amount = normalizeCurrencyAmount(formData.payment_amount);
      const sanitizedNotes = formData.notes ? sanitizeNotesInput(formData.notes) : '';

      // Partial payment warning
      if (amount < selectedPayment.balance) {
        const remaining = selectedPayment.balance - amount;
        const partialResult = await showPartialPaymentWarning(amount, remaining);
        if (!partialResult.isConfirmed) {
          setIsSubmitting(false);
          return;
        }
      }

      // Payment confirmation
      const loanId = loan.loan_id || loan.loan_request_id || loan.id;
      const confirmResult = await showPaymentConfirmation(amount, loanId);
      
      if (confirmResult.isConfirmed) {
        // Create new payment record
        const newPaymentRecord: PaymentRecord = {
          receipt_number: formData.receipt_number,
          payment_date: formData.payment_date,
          amount,
          payment_method: formData.payment_method,
          reference_number: formData.reference_number,
          notes: sanitizedNotes
        };

        // Update selected payment
        const newPaidAmount = selectedPayment.paid_amount + amount;
        const newBalance = selectedPayment.amount - newPaidAmount;
        const newStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' = 
          newBalance <= 0.01 ? 'PAID' : 
          newPaidAmount > 0 ? 'PARTIAL' : 
          selectedPayment.status;

        const updatedPayment: ScheduledPayment = {
          ...selectedPayment,
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          payment_records: [...(selectedPayment.payment_records || []), newPaymentRecord]
        };

        // Update payment schedule
        const updatedSchedule = paymentSchedule.map(p => 
          p.id === selectedPayment.id ? updatedPayment : p
        );
        setPaymentSchedule(updatedSchedule);

        // Submit payment data
        const paymentData = {
          ...formData,
          payment_amount: amount,
          loan_id: loanId,
          installment_number: selectedPayment.installment_number,
          notes: sanitizedNotes
        };
        await onSubmit(paymentData);

        // Success
        await showPaymentSuccess(formData.receipt_number || undefined);

        // Return to schedule view
        handleBackToSchedule();
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

  // Calculate summary
  const totalScheduled = paymentSchedule.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = paymentSchedule.reduce((sum, p) => sum + p.paid_amount, 0);
  const totalRemaining = totalScheduled - totalPaid;
  const overdueCount = paymentSchedule.filter(p => p.status === 'OVERDUE').length;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContainer addLoanPaymentModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h1>{showPaymentForm ? 'Record Payment' : 'Payment Schedule'}</h1>
          <button className="closeButton" onClick={onClose} disabled={isSubmitting}>&times;</button>
        </div>

        <div className="modalContent">
          {!showPaymentForm ? (
            /* SCHEDULE TABLE VIEW */
            <>
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
                    <strong>Term:</strong> {loan.term_months || 0} months
                  </div>
                </div>
              </div>

              {/* Payment Summary Cards */}
              <div className="payment-summary-cards">
                <div className="summary-card total">
                  <div className="summary-card-label">Total Scheduled</div>
                  <div className="summary-card-value">{formatCurrency(totalScheduled)}</div>
                </div>
                <div className="summary-card paid">
                  <div className="summary-card-label">Total Paid</div>
                  <div className="summary-card-value">{formatCurrency(totalPaid)}</div>
                </div>
                <div className="summary-card pending">
                  <div className="summary-card-label">Remaining</div>
                  <div className="summary-card-value">{formatCurrency(totalRemaining)}</div>
                </div>
                <div className="summary-card overdue">
                  <div className="summary-card-label">Overdue</div>
                  <div className="summary-card-value">{overdueCount}</div>
                </div>
              </div>

              {/* Payment Schedule Table */}
              <div className="payment-summary-section">
                <h5>Payment Schedule</h5>
                <div className="table-wrapper">
                  <div className="tableContainer">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Due Date</th>
                          <th>Scheduled</th>
                          <th>Paid</th>
                          <th>Balance</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentSchedule.map((payment) => {
                          const { canPay, reason } = canPayInstallment(payment, paymentSchedule);
                          const { days, isOverdue } = calculateDaysUntil(payment.payment_date);
                          
                          return (
                            <tr
                              key={payment.id}
                              className={
                                payment.status === 'OVERDUE' ? 'overdue-row' :
                                payment.status === 'PARTIAL' ? 'partial-row' :
                                !canPay ? 'locked-row' : ''
                              }
                            >
                              <td>{formatDate(payment.payment_date)}</td>
                              <td><strong>{formatCurrency(payment.amount)}</strong></td>
                              <td>{formatCurrency(payment.paid_amount)}</td>
                              <td><strong>{formatCurrency(payment.balance)}</strong></td>
                              <td>
                                {payment.status === 'PAID' ? (
                                  <span className="chip paid">PAID</span>
                                ) : payment.status === 'PARTIAL' ? (
                                  <span className="chip partial">
                                    PARTIAL
                                    <small style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px' }}>
                                      {isOverdue ? `${days} days overdue` : days === 0 ? 'Due today' : `${days} days left`}
                                    </small>
                                  </span>
                                ) : isOverdue ? (
                                  <span className="chip overdue">
                                    OVERDUE
                                    <small style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px' }}>
                                      {days} {days === 1 ? 'day' : 'days'}
                                    </small>
                                  </span>
                                ) : days === 0 ? (
                                  <span className="chip pending" style={{ background: '#fef3c7', color: '#d97706' }}>
                                    DUE TODAY
                                  </span>
                                ) : (
                                  <span className="chip pending">
                                    PENDING
                                    <small style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px' }}>
                                      {days} {days === 1 ? 'day' : 'days'}
                                    </small>
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="actionButtons">
                                  {payment.status === 'PAID' ? (
                                    <button
                                      type="button"
                                      className="viewBtn"
                                      onClick={() => handleViewReceipt(payment)}
                                      title="View receipt"
                                    >
                                      📄
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className={canPay ? 'payBtn' : 'lockedBtn'}
                                      onClick={() => canPay && handlePayClick(payment)}
                                      disabled={!canPay}
                                      title={canPay ? 'Record payment' : reason}
                                    >
                                      {canPay ? '💵' : '🔒'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* PAYMENT FORM VIEW */
            <form onSubmit={handleSubmit} className={isSubmitting ? 'payment-form-loading' : ''}>
              {/* Back Button */}
              <button 
                type="button" 
                className="back-button" 
                onClick={handleBackToSchedule}
                disabled={isSubmitting}
                title="Back to Schedule"
              >
                ← Back
              </button>

              {/* Selected Payment Info */}
              {selectedPayment && (
                <div className="selected-payment-info">
                  <h4>Installment #{selectedPayment.installment_number}</h4>
                  <div className="payment-info-grid">
                    <div className="info-item">
                      <strong>Due Date:</strong> {formatDate(selectedPayment.payment_date)}
                    </div>
                    <div className="info-item">
                      <strong>Scheduled Amount:</strong> {formatCurrency(selectedPayment.amount)}
                    </div>
                    <div className="info-item">
                      <strong>Already Paid:</strong> {formatCurrency(selectedPayment.paid_amount)}
                    </div>
                    <div className="info-item">
                      <strong>Remaining Balance:</strong> {formatCurrency(selectedPayment.balance)}
                    </div>
                    <div className="info-item">
                      <strong>Status:</strong> <span className={`chip ${selectedPayment.status.toLowerCase()}`}>{selectedPayment.status}</span>
                    </div>
                  </div>
                </div>
              )}

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
                      max={selectedPayment?.balance || 0}
                      required
                      className={errors.payment_amount ? 'error' : ''}
                    />
                    {errors.payment_amount && (
                      <span className="error-message">{errors.payment_amount}</span>
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
                  <label htmlFor="payment_type">Payment Type (Auto-Detected)</label>
                  <select
                    id="payment_type"
                    name="payment_type"
                    value={formData.payment_type}
                    onChange={handleChange}
                    disabled
                    style={{ 
                      backgroundColor: '#f5f5f5', 
                      cursor: 'not-allowed',
                      color: '#666'
                    }}
                  >
                    <option value="REGULAR">Regular Payment</option>
                    <option value="PARTIAL">Partial Payment</option>
                    <option value="FULL">Full Payment</option>
                    <option value="IRREGULAR">Irregular Payment</option>
                  </select>
                  <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    {formData.payment_type === 'FULL' && '✓ Full payment of installment'}
                    {formData.payment_type === 'PARTIAL' && '⚠ Partial payment detected'}
                    {formData.payment_type === 'IRREGULAR' && '⚠ Amount exceeds balance'}
                    {formData.payment_type === 'REGULAR' && 'Enter amount to auto-detect'}
                  </small>
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

              {/* Auto-Generated Receipt Number and Reference Number */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="receipt_number">Receipt Number (Auto-Generated)</label>
                  <input
                    type="text"
                    id="receipt_number"
                    name="receipt_number"
                    value={formData.receipt_number}
                    readOnly
                    disabled
                    style={{ 
                      backgroundColor: '#f5f5f5', 
                      cursor: 'not-allowed',
                      color: '#666'
                    }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    Automatically generated when payment is recorded
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="reference_number">
                    Reference Number (Auto-Generated)
                  </label>
                  <input
                    type="text"
                    id="reference_number"
                    name="reference_number"
                    value={formData.reference_number}
                    readOnly
                    disabled
                    style={{ 
                      backgroundColor: '#f5f5f5', 
                      cursor: 'not-allowed',
                      color: '#666'
                    }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    Updates automatically based on payment method
                  </small>
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

              {/* Payment Summary */}
              {formData.payment_amount && !errors.payment_amount && selectedPayment && (
                <div className="payment-summary-card">
                  <h4>Payment Summary</h4>
                  <div className="payment-summary-grid">
                    <div className="payment-summary-item">
                      <div className="payment-summary-item-label">Current Balance</div>
                      <div className="payment-summary-item-value">{formatCurrency(selectedPayment.balance)}</div>
                    </div>
                    <div className="payment-summary-item">
                      <div className="payment-summary-item-label">Payment Amount</div>
                      <div className="payment-summary-item-value" style={{ color: '#22c55e' }}>
                        -{formatCurrency(parseFloat(formData.payment_amount))}
                      </div>
                    </div>
                    <div className="payment-summary-item">
                      <div className="payment-summary-item-label">Remaining After</div>
                      <div className="payment-summary-item-value">
                        {formatCurrency(Math.max(0, selectedPayment.balance - parseFloat(formData.payment_amount)))}
                      </div>
                    </div>
                  </div>
                  {parseFloat(formData.payment_amount) < selectedPayment.balance && (
                    <small style={{ fontSize: '0.85rem', color: '#856404', marginTop: '0.5rem', display: 'block' }}>
                      ⚠ This is a partial payment
                    </small>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="modalButtons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBackToSchedule}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                >
                  {isSubmitting ? 'Processing...' : '✓ Record Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
