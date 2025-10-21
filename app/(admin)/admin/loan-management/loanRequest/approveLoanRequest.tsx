'use client';

import React, { useState } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import { showSuccess, showError } from '../../../../utils/Alerts';

//@ts-ignore
import '../../../../styles/loan-management/approveLoanRequest.css';

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
  requested_amount: number;
  purpose: string;
  justification: string;
  repayment_terms: number;
  monthly_deduction: number;
  application_date: string;
  status: string;
}

interface ApproveLoanRequestProps {
  loan: LoanRequest;
  onClose: () => void;
  onApprove: (loanId: string, approvalData: any) => Promise<void>;
  onOpenRejectModal?: () => void;
}

const ApproveLoanRequestModal: React.FC<ApproveLoanRequestProps> = ({ 
  loan, 
  onClose, 
  onApprove, 
  onOpenRejectModal 
}) => {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [formData, setFormData] = useState({
    comments: '',
    approved_amount: loan.requested_amount.toString(),
    adjusted_terms: loan.repayment_terms.toString(),
    interest_rate: '5.0',
    processing_fee: '500'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adjustedMonthlyDeduction = formData.approved_amount && formData.adjusted_terms
    ? parseFloat(formData.approved_amount) / parseInt(formData.adjusted_terms)
    : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (action === 'approve') {
      if (!formData.approved_amount || parseFloat(formData.approved_amount) <= 0) {
        newErrors.approved_amount = 'Please enter a valid approved amount';
      }
      
      if (!formData.adjusted_terms || parseInt(formData.adjusted_terms) < 1) {
        newErrors.adjusted_terms = 'Please enter valid repayment terms';
      }

      if (!formData.interest_rate || parseFloat(formData.interest_rate) < 0) {
        newErrors.interest_rate = 'Please enter a valid interest rate';
      }

      if (!formData.processing_fee || parseFloat(formData.processing_fee) < 0) {
        newErrors.processing_fee = 'Please enter a valid processing fee';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!action || action !== 'approve' || !validateForm()) return;

    try {
      setIsSubmitting(true);
      
      const approvalData = {
        approved_amount: parseFloat(formData.approved_amount),
        adjusted_terms: parseInt(formData.adjusted_terms),
        monthly_deduction: adjustedMonthlyDeduction,
        interest_rate: parseFloat(formData.interest_rate),
        processing_fee: parseFloat(formData.processing_fee),
        approval_comments: formData.comments,
        approved_by: 'Current User',
        approved_date: new Date().toISOString().split('T')[0]
      };
      
      await onApprove(loan.id, approvalData);
      showSuccess('Loan request has been approved successfully', 'Approved');
      onClose();
    } catch (error) {
      console.error('Error approving loan request:', error);
      showError('Failed to approve loan request. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContainer approveLoanModal">
        <ModalHeader 
          title={`${action === 'approve' ? 'Approve' : 'Review'} Loan Request`}
          onClose={onClose} 
          showDateTime={true} 
        />

        <form onSubmit={handleSubmit}>
          <div className="modalContent">
            <div className="formFieldsHorizontal">
              <div className="formInputs">
                
                {/* Loan Request Details */}
                <div className="loan-details-section">
                  <h3>Loan Request Details</h3>
                  <div className="details-grid">
                    <div className="detail-row">
                      <span className="detail-label">Request ID:</span>
                      <span className="detail-value">{loan.loan_request_id}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Employee:</span>
                      <span className="detail-value">{loan.employee.name} ({loan.employee.employee_number})</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Department:</span>
                      <span className="detail-value">{loan.employee.department}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Job Title:</span>
                      <span className="detail-value">{loan.employee.job_title}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Monthly Salary:</span>
                      <span className="detail-value">
                        {loan.employee.monthly_salary !== undefined
                          ? `₱${loan.employee.monthly_salary.toLocaleString()}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Loan Type:</span>
                      <span className="detail-value">{loan.loan_type}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Requested Amount:</span>
                      <span className="detail-value requested-amount">₱{loan.requested_amount.toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Repayment Terms:</span>
                      <span className="detail-value">{loan.repayment_terms} months</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Monthly Deduction:</span>
                      <span className="detail-value">₱{loan.monthly_deduction.toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Application Date:</span>
                      <span className="detail-value">{new Date(loan.application_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Purpose and Justification */}
                <div className="purpose-section">
                  <h4>Purpose & Justification</h4>
                  <div className="purpose-content">
                    <div className="purpose-item">
                      <strong>Purpose:</strong>
                      <p>{loan.purpose}</p>
                    </div>
                    <div className="purpose-item">
                      <strong>Justification:</strong>
                      <p>{loan.justification}</p>
                    </div>
                  </div>
                </div>

                {/* Approval Form */}
                {action === 'approve' && (
                  <div className="approval-form-section">
                    <h4>Approval Details</h4>
                    
                    <div className="formRow">
                      <div className="formField">
                        <label htmlFor="approved_amount">
                          Approved Amount <span className="requiredTags">*</span>
                        </label>
                        <input
                          type="number"
                          id="approved_amount"
                          name="approved_amount"
                          value={formData.approved_amount}
                          onChange={handleInputChange}
                          min="1"
                          step="0.01"
                          className={errors.approved_amount ? 'input-error' : ''}
                        />
                        {errors.approved_amount && <div className="error-message">{errors.approved_amount}</div>}
                      </div>

                      <div className="formField">
                        <label htmlFor="adjusted_terms">
                          Repayment Terms (months) <span className="requiredTags">*</span>
                        </label>
                        <select
                          id="adjusted_terms"
                          name="adjusted_terms"
                          value={formData.adjusted_terms}
                          onChange={handleInputChange}
                          className={errors.adjusted_terms ? 'input-error' : ''}
                        >
                          <option value="6">6 months</option>
                          <option value="12">12 months</option>
                          <option value="18">18 months</option>
                          <option value="24">24 months</option>
                          <option value="36">36 months</option>
                        </select>
                        {errors.adjusted_terms && <div className="error-message">{errors.adjusted_terms}</div>}
                      </div>
                    </div>

                    <div className="formRow">
                      <div className="formField">
                        <label htmlFor="interest_rate">
                          Interest Rate (%) <span className="requiredTags">*</span>
                        </label>
                        <input
                          type="number"
                          id="interest_rate"
                          name="interest_rate"
                          value={formData.interest_rate}
                          onChange={handleInputChange}
                          min="0"
                          step="0.1"
                          className={errors.interest_rate ? 'input-error' : ''}
                        />
                        {errors.interest_rate && <div className="error-message">{errors.interest_rate}</div>}
                      </div>

                      <div className="formField">
                        <label htmlFor="processing_fee">
                          Processing Fee (₱) <span className="requiredTags">*</span>
                        </label>
                        <input
                          type="number"
                          id="processing_fee"
                          name="processing_fee"
                          value={formData.processing_fee}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className={errors.processing_fee ? 'input-error' : ''}
                        />
                        {errors.processing_fee && <div className="error-message">{errors.processing_fee}</div>}
                      </div>
                    </div>

                    {/* Adjusted Calculation */}
                    {adjustedMonthlyDeduction > 0 && (
                      <div className="calculation-summary">
                        <h5>Loan Summary</h5>
                        <div className="summary-grid">
                          <div className="summary-item">
                            <span className="summary-label">Approved Amount:</span>
                            <span className="summary-value">₱{parseFloat(formData.approved_amount).toLocaleString()}</span>
                          </div>
                          <div className="summary-item">
                            <span className="summary-label">Monthly Deduction:</span>
                            <span className="summary-value">₱{adjustedMonthlyDeduction.toLocaleString(undefined, { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}</span>
                          </div>
                          <div className="summary-item">
                            <span className="summary-label">Interest Rate:</span>
                            <span className="summary-value">{formData.interest_rate}% per annum</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="formField full-width">
                      <label htmlFor="comments">Approval Comments (Optional)</label>
                      <textarea
                        id="comments"
                        name="comments"
                        value={formData.comments}
                        onChange={handleInputChange}
                        placeholder="Add any comments about this approval..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modalButtons">
            {/* Action Selection */}
                {!action && (
                  <>
                    <button
                      type="button"
                      className="approve-action-btn"
                      onClick={() => setAction('approve')}
                    >
                      <i className="ri-check-line"></i>
                      Approve Loan Request
                    </button>
                    <button
                      type="button"
                      className="reject-action-btn"
                      onClick={() => {
                        onClose();
                        onOpenRejectModal?.();
                      }}
                    >
                      <i className="ri-close-line"></i>
                      Reject Loan Request
                    </button>
                  </>
                )}
            
            {action === 'approve' && (
              <button 
                type="submit" 
                className="approveButton"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    Approve Loan
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApproveLoanRequestModal;