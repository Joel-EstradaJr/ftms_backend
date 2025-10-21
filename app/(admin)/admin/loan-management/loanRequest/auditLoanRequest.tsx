'use client';

import React, { useState } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import { formatDate, formatDateTime } from '../../../../utils/formatting';
import { showSuccess, showError } from '../../../../utils/Alerts';

//@ts-ignore
import '../../../../styles/loan-management/auditLoanRequest.css';

interface AuditTrailEntry {
  id: string;
  action: string;
  action_type: 'created' | 'updated' | 'approved' | 'rejected' | 'disbursed' | 'closed' | 'cancelled';
  performed_by: string;
  performed_at: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  comments?: string;
  ip_address?: string;
  user_agent?: string;
}

interface Employee {
  employee_id?: string; // Made optional for compatibility
  name: string;
  employee_number: string;
  job_title: string;
  department: string;
  monthly_salary?: number; // Changed to optional
  hire_date: string;
}

interface LoanRequest {
  id: string;
  loan_request_id: string;
  employee: Employee;
  loan_type: string;
  requested_amount: number;
  approved_amount?: number;
  purpose: string;
  justification: string;
  repayment_terms: number;
  status: string;
  application_date: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
  audit_trail?: AuditTrailEntry[]; // Made optional for compatibility
}

interface AuditLoanRequestProps {
  loan: LoanRequest;
  onClose: () => void;
  onAddAuditEntry?: (loanId: string, auditData: any) => Promise<void>;
  onExportAudit?: (loanId: string) => void;
  readOnly?: boolean;
}

const AuditLoanRequestModal: React.FC<AuditLoanRequestProps> = ({ 
  loan, 
  onClose, 
  onAddAuditEntry,
  onExportAudit,
  readOnly = true
}) => {
  const [showAddAuditForm, setShowAddAuditForm] = useState(false);
  const [auditFormData, setAuditFormData] = useState({
    action_type: 'updated' as const,
    comments: '',
    audit_reason: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sort audit trail by date (newest first)
  const sortedAuditTrail = loan.audit_trail?.sort((a, b) => 
    new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
  ) || [];

  // Filter audit trail based on type and search
  const filteredAuditTrail = sortedAuditTrail.filter(entry => {
    const matchesType = filterType === 'all' || entry.action_type === filterType;
    const matchesSearch = searchTerm === '' || 
      entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.performed_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.comments?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  const formatActionType = (actionType: string): string => {
    const typeMap: Record<string, string> = {
      'created': 'Created',
      'updated': 'Updated',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'disbursed': 'Disbursed',
      'closed': 'Closed',
      'cancelled': 'Cancelled'
    };
    return typeMap[actionType] || actionType;
  };

  const getActionIcon = (actionType: string): string => {
    const iconMap: Record<string, string> = {
      'created': 'ri-add-circle-line',
      'updated': 'ri-edit-circle-line',
      'approved': 'ri-check-circle-line',
      'rejected': 'ri-close-circle-line',
      'disbursed': 'ri-money-dollar-circle-line',
      'closed': 'ri-folder-close-line',
      'cancelled': 'ri-stop-circle-line'
    };
    return iconMap[actionType] || 'ri-information-circle-line';
  };

  const getActionColor = (actionType: string): string => {
    const colorMap: Record<string, string> = {
      'created': 'action-created',
      'updated': 'action-updated',
      'approved': 'action-approved',
      'rejected': 'action-rejected',
      'disbursed': 'action-disbursed',
      'closed': 'action-closed',
      'cancelled': 'action-cancelled'
    };
    return colorMap[actionType] || 'action-default';
  };

  const formatFieldChange = (field: string, oldValue: any, newValue: any): string => {
    const fieldLabels: Record<string, string> = {
      'status': 'Status',
      'approved_amount': 'Approved Amount',
      'repayment_terms': 'Repayment Terms',
      'interest_rate': 'Interest Rate',
      'processing_fee': 'Processing Fee',
      'rejection_reason': 'Rejection Reason',
      'disbursement_method': 'Disbursement Method',
      'disbursement_reference': 'Disbursement Reference'
    };

    const label = fieldLabels[field] || field;
    
    if (field.includes('amount') || field.includes('fee')) {
      return `${label}: ₱${oldValue?.toLocaleString() || 'N/A'} → ₱${newValue?.toLocaleString() || 'N/A'}`;
    }
    
    return `${label}: ${oldValue || 'N/A'} → ${newValue || 'N/A'}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAuditFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!auditFormData.audit_reason.trim()) {
      newErrors.audit_reason = 'Audit reason is required';
    }

    if (!auditFormData.comments.trim()) {
      newErrors.comments = 'Comments are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !onAddAuditEntry) return;

    try {
      setIsSubmitting(true);
      
      const auditData = {
        action_type: auditFormData.action_type,
        action: `Manual audit entry: ${auditFormData.audit_reason}`,
        comments: auditFormData.comments,
        performed_by: 'Current User',
        performed_at: new Date().toISOString()
      };

      await onAddAuditEntry(loan.id, auditData);
      showSuccess('Audit entry added successfully', 'Success');
      setShowAddAuditForm(false);
      setAuditFormData({
        action_type: 'updated',
        comments: '',
        audit_reason: ''
      });
    } catch (error) {
      console.error('Error adding audit entry:', error);
      showError('Failed to add audit entry. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    if (onExportAudit) {
      onExportAudit(loan.id);
      showSuccess('Audit report exported successfully', 'Export Complete');
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContainer auditLoanModal">
        <ModalHeader 
          title="Audit Trail - Loan Request" 
          onClose={onClose} 
          showDateTime={true}
        />

        <div className="modalContent">
          <div className="auditContent">
            
            {/* Loan Summary */}
            <div className="loan-summary-section">
              <div className="summary-header">
                <div className="summary-info">
                  <h3>{loan.loan_request_id}</h3>
                  <p>{loan.employee.name} - {loan.employee.employee_number}</p>
                </div>
                <div className="summary-amounts">
                  <div className="amount-item">
                    <span className="amount-label">Requested:</span>
                    <span className="amount-value">₱{loan.requested_amount.toLocaleString()}</span>
                  </div>
                  {loan.approved_amount && (
                    <div className="amount-item">
                      <span className="amount-label">Approved:</span>
                      <span className="amount-value approved">₱{loan.approved_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="amount-item">
                    <span className="amount-label">Status:</span>
                    <span className={`status-badge ${loan.status}`}>{loan.status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Controls */}
            <div className="audit-controls">
              <div className="controls-left">
                <div className="filter-group">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Actions</option>
                    <option value="created">Created</option>
                    <option value="updated">Updated</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="disbursed">Disbursed</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="search-group">
                  <input
                    type="text"
                    placeholder="Search audit trail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <i className="ri-search-line search-icon"></i>
                </div>
              </div>
              <div className="controls-right">
                {onExportAudit && (
                  <button
                    type="button"
                    className="exportBtn"
                    onClick={handleExport}
                  >
                    <i className="ri-download-line"></i>
                    Export Audit
                  </button>
                )}
                {!readOnly && onAddAuditEntry && (
                  <button
                    type="button"
                    className="addAuditBtn"
                    onClick={() => setShowAddAuditForm(true)}
                  >
                    <i className="ri-add-line"></i>
                    Add Entry
                  </button>
                )}
              </div>
            </div>

            {/* Add Audit Entry Form */}
            {showAddAuditForm && !readOnly && (
              <div className="add-audit-form">
                <h4>Add Manual Audit Entry</h4>
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="action_type">Action Type</label>
                      <select
                        id="action_type"
                        name="action_type"
                        value={auditFormData.action_type}
                        onChange={handleInputChange}
                      >
                        <option value="updated">Updated</option>
                        <option value="created">Created</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="disbursed">Disbursed</option>
                        <option value="closed">Closed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="audit_reason">
                        Audit Reason <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="audit_reason"
                        name="audit_reason"
                        value={auditFormData.audit_reason}
                        onChange={handleInputChange}
                        placeholder="Brief reason for this audit entry"
                        className={errors.audit_reason ? 'input-error' : ''}
                      />
                      {errors.audit_reason && <div className="error-message">{errors.audit_reason}</div>}
                    </div>
                  </div>
                  <div className="form-field">
                    <label htmlFor="comments">
                      Comments <span className="required">*</span>
                    </label>
                    <textarea
                      id="comments"
                      name="comments"
                      value={auditFormData.comments}
                      onChange={handleInputChange}
                      placeholder="Detailed comments about this audit entry..."
                      rows={3}
                      className={errors.comments ? 'input-error' : ''}
                    />
                    {errors.comments && <div className="error-message">{errors.comments}</div>}
                  </div>
                  <div className="form-buttons">
                    <button
                      type="button"
                      className="cancelBtn"
                      onClick={() => {
                        setShowAddAuditForm(false);
                        setErrors({});
                        setAuditFormData({
                          action_type: 'updated',
                          comments: '',
                          audit_reason: ''
                        });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="saveBtn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="loading-spinner"></span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line"></i>
                          Add Entry
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Audit Trail */}
            <div className="audit-trail-section">
              <div className="trail-header">
                <h4>
                  <i className="ri-history-line"></i>
                  Audit Trail ({filteredAuditTrail.length} entries)
                </h4>
                {filteredAuditTrail.length !== sortedAuditTrail.length && (
                  <span className="filter-indicator">
                    Filtered from {sortedAuditTrail.length} total entries
                  </span>
                )}
              </div>

              {filteredAuditTrail.length === 0 ? (
                <div className="no-entries">
                  <i className="ri-information-line"></i>
                  <p>No audit entries found matching the current filters.</p>
                </div>
              ) : (
                <div className="audit-timeline">
                  {filteredAuditTrail.map((entry, index) => (
                    <div key={entry.id} className={`audit-entry ${getActionColor(entry.action_type)}`}>
                      <div className="entry-icon">
                        <i className={getActionIcon(entry.action_type)}></i>
                      </div>
                      <div className="entry-content">
                        <div className="entry-header">
                          <div className="entry-info">
                            <h5>{entry.action}</h5>
                            <span className="entry-meta">
                              by {entry.performed_by} • {formatDateTime(entry.performed_at)}
                            </span>
                          </div>
                          <div className="entry-type">
                            <span className={`type-badge ${entry.action_type}`}>
                              {formatActionType(entry.action_type)}
                            </span>
                          </div>
                        </div>

                        {entry.comments && (
                          <div className="entry-comments">
                            <p>{entry.comments}</p>
                          </div>
                        )}

                        {/* Field Changes */}
                        {entry.old_values && entry.new_values && (
                          <div className="field-changes">
                            <h6>Changes:</h6>
                            <div className="changes-list">
                              {Object.keys(entry.new_values).map(field => (
                                entry.old_values![field] !== entry.new_values![field] && (
                                  <div key={field} className="change-item">
                                    <i className="ri-arrow-right-line"></i>
                                    {formatFieldChange(field, entry.old_values![field], entry.new_values![field])}
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Technical Details */}
                        {(entry.ip_address || entry.user_agent) && (
                          <div className="technical-details">
                            <details>
                              <summary>Technical Details</summary>
                              {entry.ip_address && (
                                <div className="tech-item">
                                  <strong>IP Address:</strong> {entry.ip_address}
                                </div>
                              )}
                              {entry.user_agent && (
                                <div className="tech-item">
                                  <strong>User Agent:</strong> {entry.user_agent}
                                </div>
                              )}
                            </details>
                          </div>
                        )}
                      </div>
                      {index < filteredAuditTrail.length - 1 && (
                        <div className="timeline-connector"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Summary Statistics */}
            <div className="audit-summary-stats">
              <h4>Audit Statistics</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Entries:</span>
                  <span className="stat-value">{sortedAuditTrail.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">First Entry:</span>
                  <span className="stat-value">
                    {sortedAuditTrail.length > 0 
                      ? formatDate(sortedAuditTrail[sortedAuditTrail.length - 1].performed_at)
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Last Entry:</span>
                  <span className="stat-value">
                    {sortedAuditTrail.length > 0 
                      ? formatDate(sortedAuditTrail[0].performed_at)
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Unique Users:</span>
                  <span className="stat-value">
                    {[...new Set(sortedAuditTrail.map(entry => entry.performed_by))].length}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

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
      </div>
    </div>
  );
};

export default AuditLoanRequestModal;