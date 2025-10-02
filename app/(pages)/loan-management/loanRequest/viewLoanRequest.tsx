'use client';

import React from 'react';
import ModalHeader from '../../../Components/ModalHeader';
import { formatDate, formatDateTime } from '../../../utility/dateFormatter';

//@ts-ignore
import '../../../styles/loan-management/viewLoanRequest.css';

interface LoanRequest {
  id: string;
  loan_request_id: string;
  employee: {
    name: string;
    employee_number: string;
    job_title: string;
    department: string;
    monthly_salary?: number; // Changed to optional
    hire_date: string;
  };
  loan_type: string;
  requested_amount: number;
  purpose: string;
  justification: string;
  repayment_terms: number;
  monthly_deduction: number;
  application_date: string;
  status: string;
  
  // Application details
  submitted_by?: string;
  submitted_date?: string;
  
  // Approval workflow
  reviewed_by?: string;
  reviewed_date?: string;
  approved_by?: string;
  approved_date?: string;
  approval_comments?: string;
  approved_amount?: number;
  adjusted_terms?: number;
  interest_rate?: number;
  processing_fee?: number;
  
  rejected_by?: string;
  rejected_date?: string;
  rejection_reason?: string;
  
  // Disbursement details
  disbursed_by?: string;
  disbursed_date?: string;
  disbursement_method?: string;
  disbursement_reference?: string;
  disbursement_attachment?: string;
  
  // Emergency contact (for emergency loans)
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  
  // Audit fields
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
}

interface ViewLoanRequestProps {
  loan: LoanRequest;
  onClose: () => void;
  onEdit?: (loan: LoanRequest) => void;
  onDelete?: (loan: LoanRequest) => void;
  onApprove?: (loan: LoanRequest) => void;
  onReject?: (loan: LoanRequest) => void;
  onDisburse?: (loan: LoanRequest) => void;
  readOnly?: boolean;
}

const ViewLoanRequestModal: React.FC<ViewLoanRequestProps> = ({ 
  loan, 
  onClose, 
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onDisburse,
  readOnly = false
}) => {

  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'draft': 'Draft',
      'pending_approval': 'Pending Approval',
      'approved': 'Approved',
      'disbursed': 'Disbursed',
      'rejected': 'Rejected',
      'closed': 'Closed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  const formatLoanType = (loanType: string): string => {
    const typeMap: Record<string, string> = {
      'emergency': 'Emergency',
      'educational': 'Educational',
      'medical': 'Medical',
      'housing': 'Housing',
      'personal': 'Personal',
      'salary_advance': 'Salary Advance'
    };
    return typeMap[loanType] || loanType;
  };

  const formatDepartment = (department: string): string => {
    const departmentMap: Record<string, string> = {
      'operations': 'Operations',
      'maintenance': 'Maintenance',
      'administration': 'Administration',
      'finance': 'Finance',
      'hr': 'HR'
    };
    return departmentMap[department] || department;
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'draft': 'status-draft',
      'pending_approval': 'status-pending',
      'approved': 'status-approved',
      'disbursed': 'status-disbursed',
      'rejected': 'status-rejected',
      'closed': 'status-closed',
      'cancelled': 'status-cancelled'
    };
    return colorMap[status] || 'status-default';
  };

  const calculateTotalRepayment = (): number => {
    if (loan.approved_amount && loan.interest_rate && loan.adjusted_terms) {
      const principal = loan.approved_amount;
      const interestAmount = (principal * loan.interest_rate / 100) * (loan.adjusted_terms / 12);
      const processingFee = loan.processing_fee || 0;
      return principal + interestAmount + processingFee;
    }
    return loan.requested_amount;
  };

  const getActionButtons = () => {
    if (readOnly) return null;

    const baseActions = [];

    switch (loan.status) {
      case 'draft':
        if (onEdit) baseActions.push(
          <button key="edit" className="editBtn" onClick={() => onEdit(loan)}>
            <i className="ri-edit-line"></i> Edit
          </button>
        );
        if (onDelete) baseActions.push(
          <button key="delete" className="deleteBtn" onClick={() => onDelete(loan)}>
            <i className="ri-delete-bin-line"></i> Delete
          </button>
        );
        break;

      case 'pending_approval':
        if (onApprove) baseActions.push(
          <button key="approve" className="approveBtn" onClick={() => onApprove(loan)}>
            <i className="ri-check-line"></i> Approve
          </button>
        );
        if (onReject) baseActions.push(
          <button key="reject" className="rejectBtn" onClick={() => onReject(loan)}>
            <i className="ri-close-line"></i> Reject
          </button>
        );
        break;

      case 'approved':
        if (onDisburse) baseActions.push(
          <button key="disburse" className="disburseBtn" onClick={() => onDisburse(loan)}>
            <i className="ri-money-dollar-circle-line"></i> Disburse
          </button>
        );
        break;
    }

    return baseActions.length > 0 ? (
      <div className="actionButtons">
        {baseActions}
      </div>
    ) : null;
  };

  return (
    <div className="modalOverlay">
      <div className="modalContainer viewLoanModal">
        <ModalHeader 
          title="Loan Request Details" 
          onClose={onClose} 
          showDateTime={false}
        />

        <div className="modalContent">
          <div className="viewLoanContent">
            
            {/* Header with Status */}
            <div className="loan-header">
              <div className="loan-id-section">
                <h2>{loan.loan_request_id}</h2>
                <div className={`status-badge ${getStatusColor(loan.status)}`}>
                  {formatStatus(loan.status)}
                </div>
              </div>
              <div className="loan-amount-section">
                <div className="amount-display">
                  <span className="amount-label">
                    {loan.approved_amount ? 'Approved Amount' : 'Requested Amount'}
                  </span>
                  <span className="amount-value">
                    ₱{(loan.approved_amount || loan.requested_amount).toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Employee Information */}
            <div className="info-section">
              <h3><i className="ri-user-line"></i> Employee Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{loan.employee.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Employee Number:</span>
                  <span className="info-value">{loan.employee.employee_number}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Job Title:</span>
                  <span className="info-value">{loan.employee.job_title}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Department:</span>
                  <span className="info-value">{formatDepartment(loan.employee.department)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Monthly Salary:</span>
                  <span className="info-value">₱{(loan.employee.monthly_salary || 0).toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Hire Date:</span>
                  <span className="info-value">{formatDate(loan.employee.hire_date)}</span>
                </div>
              </div>
            </div>

            {/* Loan Details */}
            <div className="info-section">
              <h3><i className="ri-money-dollar-circle-line"></i> Loan Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Loan Type:</span>
                  <span className="info-value">{formatLoanType(loan.loan_type)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Requested Amount:</span>
                  <span className="info-value">₱{loan.requested_amount.toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Repayment Terms:</span>
                  <span className="info-value">{loan.repayment_terms} months</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Monthly Deduction:</span>
                  <span className="info-value">₱{loan.monthly_deduction.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Application Date:</span>
                  <span className="info-value">{formatDate(loan.application_date)}</span>
                </div>
              </div>
            </div>

            {/* Purpose and Justification */}
            <div className="info-section">
              <h3><i className="ri-file-text-line"></i> Purpose & Justification</h3>
              <div className="purpose-content">
                <div className="purpose-item">
                  <h4>Purpose:</h4>
                  <p className="purpose-text">{loan.purpose}</p>
                </div>
                <div className="purpose-item">
                  <h4>Detailed Justification:</h4>
                  <p className="justification-text">{loan.justification}</p>
                </div>
              </div>
            </div>

            {/* Emergency Contact (for emergency loans) */}
            {loan.loan_type === 'emergency' && (loan.emergency_contact_name || loan.emergency_contact_phone) && (
              <div className="info-section emergency-section">
                <h3><i className="ri-phone-line"></i> Emergency Contact</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Contact Name:</span>
                    <span className="info-value">{loan.emergency_contact_name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Contact Phone:</span>
                    <span className="info-value">{loan.emergency_contact_phone || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Relationship:</span>
                    <span className="info-value">{loan.emergency_contact_relationship || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Approval Details (if approved) */}
            {(loan.status === 'approved' || loan.status === 'disbursed' || loan.status === 'closed') && loan.approved_by && (
              <div className="info-section approval-section">
                <h3><i className="ri-check-double-line"></i> Approval Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Approved By:</span>
                    <span className="info-value">{loan.approved_by}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Approval Date:</span>
                    <span className="info-value">{loan.approved_date ? formatDate(loan.approved_date) : 'N/A'}</span>
                  </div>
                  {loan.approved_amount && (
                    <div className="info-item">
                      <span className="info-label">Approved Amount:</span>
                      <span className="info-value approved-amount">₱{loan.approved_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {loan.adjusted_terms && (
                    <div className="info-item">
                      <span className="info-label">Adjusted Terms:</span>
                      <span className="info-value">{loan.adjusted_terms} months</span>
                    </div>
                  )}
                  {loan.interest_rate && (
                    <div className="info-item">
                      <span className="info-label">Interest Rate:</span>
                      <span className="info-value">{loan.interest_rate}% per annum</span>
                    </div>
                  )}
                  {loan.processing_fee && (
                    <div className="info-item">
                      <span className="info-label">Processing Fee:</span>
                      <span className="info-value">₱{loan.processing_fee.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                {loan.approval_comments && (
                  <div className="comments-section">
                    <h4>Approval Comments:</h4>
                    <p className="comments-text">{loan.approval_comments}</p>
                  </div>
                )}

                {/* Total Repayment Calculation */}
                {loan.approved_amount && loan.interest_rate && (
                  <div className="repayment-summary">
                    <h4>Repayment Summary</h4>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Principal Amount:</span>
                        <span className="summary-value">₱{loan.approved_amount.toLocaleString()}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Interest ({loan.interest_rate}%):</span>
                        <span className="summary-value">
                          ₱{((loan.approved_amount * loan.interest_rate / 100) * (loan.adjusted_terms! / 12)).toLocaleString()}
                        </span>
                      </div>
                      {loan.processing_fee && (
                        <div className="summary-item">
                          <span className="summary-label">Processing Fee:</span>
                          <span className="summary-value">₱{loan.processing_fee.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="summary-item total">
                        <span className="summary-label">Total Repayment:</span>
                        <span className="summary-value">₱{calculateTotalRepayment().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rejection Details (if rejected) */}
            {loan.status === 'rejected' && loan.rejected_by && (
              <div className="info-section rejection-section">
                <h3><i className="ri-close-circle-line"></i> Rejection Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Rejected By:</span>
                    <span className="info-value">{loan.rejected_by}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Rejection Date:</span>
                    <span className="info-value">{loan.rejected_date ? formatDate(loan.rejected_date) : 'N/A'}</span>
                  </div>
                  <div className="info-item full-width">
                    <span className="info-label">Rejection Reason:</span>
                    <span className="info-value">{loan.rejection_reason || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Disbursement Details (if disbursed) */}
            {(loan.status === 'disbursed' || loan.status === 'closed') && loan.disbursed_by && (
              <div className="info-section disbursement-section">
                <h3><i className="ri-bank-line"></i> Disbursement Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Disbursed By:</span>
                    <span className="info-value">{loan.disbursed_by}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Disbursement Date:</span>
                    <span className="info-value">{loan.disbursed_date ? formatDate(loan.disbursed_date) : 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Method:</span>
                    <span className="info-value">{loan.disbursement_method || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Reference:</span>
                    <span className="info-value">{loan.disbursement_reference || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Trail */}
            <div className="info-section audit-section">
              <h3><i className="ri-history-line"></i> Audit Trail</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Created By:</span>
                  <span className="info-value">{loan.created_by}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Created Date:</span>
                  <span className="info-value">{formatDateTime(loan.created_at)}</span>
                </div>
                {loan.updated_by && (
                  <>
                    <div className="info-item">
                      <span className="info-label">Last Updated By:</span>
                      <span className="info-value">{loan.updated_by}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Last Updated:</span>
                      <span className="info-value">{loan.updated_at ? formatDateTime(loan.updated_at) : 'N/A'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="modalButtons">
          {getActionButtons()}
          <button 
            type="button" 
            className="closeButton"
            onClick={onClose}
          >
            <i className="ri-close-line"></i>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewLoanRequestModal;