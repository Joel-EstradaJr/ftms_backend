'use client';

import React, { useState } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import { showSuccess, showError } from '../../../../utils/Alerts';
import { formatDate, formatDateTime } from '../../../../utils/formatting';

//@ts-ignore
import '../../../../styles/loan-management/closeLoanRequest.css';

interface PaymentRecord {
  id: string;
  payment_date: string;
  amount_paid: number;
  payment_method: string;
  reference_number?: string;
  processed_by: string;
  notes?: string;
}

interface LoanRequest {
  id: string;
  loan_request_id: string;
  employee: {
    name: string;
    employee_number: string;
    job_title: string;
    department: string;
    monthly_salary?: number; // Changed to optional
  };
  loan_type: string;
  approved_amount?: number; // Made optional for compatibility
  repayment_terms: number;
  monthly_deduction: number;
  interest_rate?: number; // Made optional for compatibility
  processing_fee?: number; // Made optional for compatibility
  disbursed_date?: string; // Made optional for compatibility
  disbursed_amount?: number; // Made optional for compatibility
  status: string;
  
  // Payment tracking
  total_paid?: number;
  remaining_balance?: number;
  payment_records?: PaymentRecord[];
  
  // Closure details
  closure_reason?: string;
  closure_type?: 'completed' | 'early_settlement' | 'write_off' | 'transfer';
  closure_date?: string;
  closed_by?: string;
  closure_notes?: string;
}

interface CloseLoanRequestProps {
  loan: LoanRequest;
  onClose: () => void;
  onCloseLoan: (loanId: string, closureData: any) => Promise<void>;
  readOnly?: boolean;
}

const CloseLoanRequestModal: React.FC<CloseLoanRequestProps> = ({ 
  loan, 
  onClose, 
  onCloseLoan,
  readOnly = false
}) => {
  const [formData, setFormData] = useState({
    closure_type: 'completed' as const,
    closure_reason: '',
    final_payment_amount: '',
    payment_method: 'salary_deduction',
    reference_number: '',
    waiver_amount: '0',
    penalty_amount: '0',
    closure_notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Calculate loan summary
  const totalLoanAmount = (loan.approved_amount || 0) + (loan.processing_fee || 0);
  const totalInterest = ((loan.approved_amount || 0) * (loan.interest_rate || 0) / 100) * (loan.repayment_terms / 12);
  const totalRepayableAmount = totalLoanAmount + totalInterest;
  const totalPaid = loan.total_paid || 0;
  const remainingBalance = totalRepayableAmount - totalPaid;
  const finalPaymentAmount = parseFloat(formData.final_payment_amount) || 0;
  const waiverAmount = parseFloat(formData.waiver_amount) || 0;
  const penaltyAmount = parseFloat(formData.penalty_amount) || 0;
  const netClosureAmount = remainingBalance + penaltyAmount - waiverAmount;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.closure_reason.trim()) {
      newErrors.closure_reason = 'Closure reason is required';
    }

    if (formData.closure_type === 'completed' || formData.closure_type === 'early_settlement') {
      if (!formData.final_payment_amount || parseFloat(formData.final_payment_amount) < 0) {
        newErrors.final_payment_amount = 'Please enter a valid final payment amount';
      }

      if (formData.closure_type === 'completed' && Math.abs(finalPaymentAmount - netClosureAmount) > 0.01) {
        newErrors.final_payment_amount = `Final payment should be ₱${netClosureAmount.toLocaleString()} for complete closure`;
      }
    }

    if (waiverAmount > remainingBalance) {
      newErrors.waiver_amount = 'Waiver amount cannot exceed remaining balance';
    }

    if (!formData.closure_notes.trim()) {
      newErrors.closure_notes = 'Closure notes are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setShowConfirmation(true);
  };

  const confirmClosure = async () => {
    try {
      setIsSubmitting(true);
      
      const closureData = {
        closure_type: formData.closure_type,
        closure_reason: formData.closure_reason,
        final_payment_amount: finalPaymentAmount,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || null,
        waiver_amount: waiverAmount,
        penalty_amount: penaltyAmount,
        net_closure_amount: netClosureAmount,
        closure_notes: formData.closure_notes,
        closure_date: new Date().toISOString().split('T')[0],
        closed_by: 'Current User',
        final_status: 'closed'
      };

      await onCloseLoan(loan.id, closureData);
      showSuccess('Loan has been closed successfully', 'Loan Closed');
      onClose();
    } catch (error) {
      console.error('Error closing loan:', error);
      showError('Failed to close loan. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const getClosureTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'completed': 'success',
      'early_settlement': 'info',
      'write_off': 'warning',
      'transfer': 'secondary'
    };
    return colorMap[type] || 'default';
  };

  const formatClosureType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'completed': 'Completed (Full Payment)',
      'early_settlement': 'Early Settlement',
      'write_off': 'Write-off',
      'transfer': 'Transfer'
    };
    return typeMap[type] || type;
  };

  return (
    <div className="modalOverlay">
      <div className="modalContainer closeLoanModal">
        <ModalHeader 
          title="Close Loan Request" 
          onClose={onClose} 
          showDateTime={true}
        />

        <div className="modalContent">
          <div className="closeLoanContent">
            
            {/* Loan Summary Header */}
            <div className="loan-summary-header">
              <div className="summary-left">
                <h3>{loan.loan_request_id}</h3>
                <p>{loan.employee.name} - {loan.employee.employee_number}</p>
                <span className="loan-type">{loan.loan_type.toUpperCase()}</span>
              </div>
              <div className="summary-right">
                <div className="amount-summary">
                  <div className="amount-row">
                    <span className="amount-label">Original Amount:</span>
                    <span className="amount-value">₱{(loan.approved_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="amount-row">
                    <span className="amount-label">Total Repayable:</span>
                    <span className="amount-value">₱{totalRepayableAmount.toLocaleString()}</span>
                  </div>
                  <div className="amount-row">
                    <span className="amount-label">Total Paid:</span>
                    <span className="amount-value paid">₱{totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="amount-row balance">
                    <span className="amount-label">Remaining Balance:</span>
                    <span className="amount-value">₱{remainingBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Details */}
            <div className="loan-details-section">
              <h4><i className="ri-information-line"></i> Loan Details</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Disbursed Date:</span>
                  <span className="detail-value">{loan.disbursed_date ? formatDate(loan.disbursed_date) : 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Repayment Terms:</span>
                  <span className="detail-value">{loan.repayment_terms} months</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Monthly Deduction:</span>
                  <span className="detail-value">₱{loan.monthly_deduction.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Interest Rate:</span>
                  <span className="detail-value">{loan.interest_rate}% per annum</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Processing Fee:</span>
                  <span className="detail-value">₱{(loan.processing_fee || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {loan.payment_records && loan.payment_records.length > 0 && (
              <div className="payment-history-section">
                <h4><i className="ri-history-line"></i> Payment History</h4>
                <div className="payment-table">
                  <div className="table-header">
                    <div className="header-cell">Date</div>
                    <div className="header-cell">Amount</div>
                    <div className="header-cell">Method</div>
                    <div className="header-cell">Reference</div>
                    <div className="header-cell">Processed By</div>
                  </div>
                  <div className="table-body">
                    {loan.payment_records.slice(0, 5).map(payment => (
                      <div key={payment.id} className="table-row">
                        <div className="table-cell">{formatDate(payment.payment_date)}</div>
                        <div className="table-cell">₱{payment.amount_paid.toLocaleString()}</div>
                        <div className="table-cell">{payment.payment_method}</div>
                        <div className="table-cell">{payment.reference_number || 'N/A'}</div>
                        <div className="table-cell">{payment.processed_by}</div>
                      </div>
                    ))}
                  </div>
                  {loan.payment_records.length > 5 && (
                    <div className="table-footer">
                      <span>Showing last 5 payments of {loan.payment_records.length} total</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!readOnly && (
              <form onSubmit={handleSubmit}>
                {/* Closure Details */}
                <div className="closure-form-section">
                  <h4><i className="ri-close-circle-line"></i> Closure Details</h4>
                  
                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="closure_type">
                        Closure Type <span className="required">*</span>
                      </label>
                      <select
                        id="closure_type"
                        name="closure_type"
                        value={formData.closure_type}
                        onChange={handleInputChange}
                      >
                        <option value="completed">Completed (Full Payment)</option>
                        <option value="early_settlement">Early Settlement</option>
                        <option value="write_off">Write-off</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="closure_reason">
                        Closure Reason <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="closure_reason"
                        name="closure_reason"
                        value={formData.closure_reason}
                        onChange={handleInputChange}
                        placeholder="Brief reason for loan closure"
                        className={errors.closure_reason ? 'input-error' : ''}
                      />
                      {errors.closure_reason && <div className="error-message">{errors.closure_reason}</div>}
                    </div>
                  </div>

                  {/* Payment Details (for completed/early settlement) */}
                  {(formData.closure_type === 'completed' || formData.closure_type === 'early_settlement') && (
                    <>
                      <div className="form-row">
                        <div className="form-field">
                          <label htmlFor="final_payment_amount">
                            Final Payment Amount <span className="required">*</span>
                          </label>
                          <input
                            type="number"
                            id="final_payment_amount"
                            name="final_payment_amount"
                            value={formData.final_payment_amount}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={errors.final_payment_amount ? 'input-error' : ''}
                          />
                          {errors.final_payment_amount && <div className="error-message">{errors.final_payment_amount}</div>}
                        </div>

                        <div className="form-field">
                          <label htmlFor="payment_method">Payment Method</label>
                          <select
                            id="payment_method"
                            name="payment_method"
                            value={formData.payment_method}
                            onChange={handleInputChange}
                          >
                            <option value="salary_deduction">Salary Deduction</option>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="check">Check</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-field">
                        <label htmlFor="reference_number">Reference Number (Optional)</label>
                        <input
                          type="text"
                          id="reference_number"
                          name="reference_number"
                          value={formData.reference_number}
                          onChange={handleInputChange}
                          placeholder="Transaction reference number"
                        />
                      </div>
                    </>
                  )}

                  {/* Adjustments */}
                  <div className="adjustments-section">
                    <h5>Adjustments (Optional)</h5>
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="waiver_amount">Waiver Amount</label>
                        <input
                          type="number"
                          id="waiver_amount"
                          name="waiver_amount"
                          value={formData.waiver_amount}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className={errors.waiver_amount ? 'input-error' : ''}
                        />
                        {errors.waiver_amount && <div className="error-message">{errors.waiver_amount}</div>}
                        <small className="field-help">Amount to be waived from remaining balance</small>
                      </div>

                      <div className="form-field">
                        <label htmlFor="penalty_amount">Penalty Amount</label>
                        <input
                          type="number"
                          id="penalty_amount"
                          name="penalty_amount"
                          value={formData.penalty_amount}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                        <small className="field-help">Additional penalty charges</small>
                      </div>
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="closure_notes">
                      Closure Notes <span className="required">*</span>
                    </label>
                    <textarea
                      id="closure_notes"
                      name="closure_notes"
                      value={formData.closure_notes}
                      onChange={handleInputChange}
                      placeholder="Detailed notes about the loan closure..."
                      rows={4}
                      className={errors.closure_notes ? 'input-error' : ''}
                    />
                    {errors.closure_notes && <div className="error-message">{errors.closure_notes}</div>}
                  </div>
                </div>

                {/* Closure Summary */}
                <div className="closure-summary">
                  <h4>Closure Summary</h4>
                  <div className="summary-calculations">
                    <div className="calc-row">
                      <span className="calc-label">Remaining Balance:</span>
                      <span className="calc-value">₱{remainingBalance.toLocaleString()}</span>
                    </div>
                    {penaltyAmount > 0 && (
                      <div className="calc-row penalty">
                        <span className="calc-label">+ Penalty:</span>
                        <span className="calc-value">₱{penaltyAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {waiverAmount > 0 && (
                      <div className="calc-row waiver">
                        <span className="calc-label">- Waiver:</span>
                        <span className="calc-value">₱{waiverAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="calc-row total">
                      <span className="calc-label">Net Closure Amount:</span>
                      <span className="calc-value">₱{netClosureAmount.toLocaleString()}</span>
                    </div>
                    {finalPaymentAmount > 0 && (
                      <div className="calc-row payment">
                        <span className="calc-label">Final Payment:</span>
                        <span className="calc-value">₱{finalPaymentAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className={`closure-type-badge ${getClosureTypeColor(formData.closure_type)}`}>
                    {formatClosureType(formData.closure_type)}
                  </div>
                </div>

                <div className="modalButtons">
                  <button 
                    type="button" 
                    className="cancelButton"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="closeLoanButton"
                    disabled={isSubmitting}
                  >
                    <i className="ri-close-circle-line"></i>
                    Close Loan
                  </button>
                </div>
              </form>
            )}

            {/* Read-only view for already closed loans */}
            {readOnly && loan.closure_date && (
              <div className="closure-info-section">
                <h4><i className="ri-check-double-line"></i> Loan Closure Information</h4>
                <div className="closure-info-grid">
                  <div className="info-item">
                    <span className="info-label">Closure Date:</span>
                    <span className="info-value">{formatDate(loan.closure_date)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Closure Type:</span>
                    <span className="info-value">{formatClosureType(loan.closure_type!)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Closed By:</span>
                    <span className="info-value">{loan.closed_by}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Closure Reason:</span>
                    <span className="info-value">{loan.closure_reason}</span>
                  </div>
                </div>
                {loan.closure_notes && (
                  <div className="closure-notes">
                    <h5>Closure Notes:</h5>
                    <p>{loan.closure_notes}</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {!readOnly && (
          <div className="modalButtons">
            <button 
              type="button" 
              className="cancelButton"
              onClick={onClose}
            >
              <i className="ri-close-line"></i>
              Cancel
            </button>
          </div>
        )}

        {readOnly && (
          <div className="modalButtons">
            <button 
              type="button" 
              className="closeButton"
              onClick={onClose}
            >
              <i className="ri-close-line"></i>
              Close
            </button>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="confirmation-overlay">
            <div className="confirmation-modal">
              <div className="confirmation-header">
                <h3>Confirm Loan Closure</h3>
                <i className="ri-alert-line confirmation-icon"></i>
              </div>
              <div className="confirmation-content">
                <p><strong>Are you sure you want to close this loan?</strong></p>
                <p>This action cannot be undone. Please review the details:</p>
                <ul>
                  <li><strong>Loan:</strong> {loan.loan_request_id}</li>
                  <li><strong>Employee:</strong> {loan.employee.name}</li>
                  <li><strong>Closure Type:</strong> {formatClosureType(formData.closure_type)}</li>
                  <li><strong>Net Amount:</strong> ₱{netClosureAmount.toLocaleString()}</li>
                </ul>
              </div>
              <div className="confirmation-buttons">
                <button
                  type="button"
                  className="cancelConfirmButton"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="confirmCloseButton"
                  onClick={confirmClosure}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner"></span>
                      Closing...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line"></i>
                      Confirm Closure
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CloseLoanRequestModal;