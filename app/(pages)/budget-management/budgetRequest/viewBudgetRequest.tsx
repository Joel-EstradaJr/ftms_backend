'use client';

import React from 'react';
import "../../../styles/budget-management/viewBudgetRequest.css";
import { formatDate, formatDateTime } from '../../../utility/dateFormatter';
import ModalHeader from '../../../Components/ModalHeader';

// Types - using the same as your existing BudgetRequest interface
interface BudgetItem {
  item_name: string;
  quantity: number;
  unit_measure: string;
  unit_cost: number;
  supplier: string;
  subtotal: number;
}

interface BudgetRequest {
  request_id: string;
  title: string;
  description: string;
  requested_amount: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Closed';
  category: string;
  requested_by: string;
  request_date: string;
  approval_date?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  // Extended fields that would come from your database
  department?: string;
  requester_position?: string;
  budget_period?: string;
  start_date?: string;
  end_date?: string;
  items?: BudgetItem[];
  supporting_documents?: File[] | string[]; // Could be File objects or file URLs
}

interface ViewBudgetRequestProps {
  request: BudgetRequest;
  onClose: () => void;
  onEdit?: (request: BudgetRequest) => void;
  onExport?: (request: BudgetRequest) => void;
  showActions?: boolean;
}

const ViewBudgetRequest: React.FC<ViewBudgetRequestProps> = ({ 
  request, 
  onClose, 
  onEdit, 
  onExport,
  showActions = true 
}) => {
  
  // Status badge component (reuse from your main page)
  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusClass = (status: string) => {
      switch (status) {
        case 'Draft': return 'Draft';
        case 'Pending Approval': return 'pending-approval';
        case 'Approved': return 'Approved';
        case 'Rejected': return 'Rejected';
        case 'Closed': return 'Closed';
        default: return 'Draft';
      }
    };

    return (
      <span className={`chip ${getStatusClass(status)}`}>
        {status}
      </span>
    );
  };

  // Calculate total from items if available
  const calculateItemsTotal = () => {
    if (!request.items || request.items.length === 0) return 0;
    return request.items.reduce((total, item) => total + item.subtotal, 0);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file download (placeholder)
  const handleFileDownload = (file: File | string, index: number) => {
    console.log('Download file:', file);
    // Implement actual download logic here
  };

  // Generate action history based on request status
  const getActionHistory = () => {
    const history = [
      {
        action: 'Request Created',
        user: request.requested_by,
        date: request.created_at,
        details: `Created as ${request.status}`
      }
    ];

    if (request.status === 'Approved' && request.approval_date && request.approved_by) {
      history.push({
        action: 'Request Approved',
        user: request.approved_by,
        date: request.approval_date,
        details: 'Budget request approved and funds allocated'
      });
    }

    if (request.status === 'Rejected' && request.approved_by) {
      history.push({
        action: 'Request Rejected',
        user: request.approved_by,
        date: request.approval_date || request.updated_at || '',
        details: request.rejection_reason || 'No reason provided'
      });
    }

    if (request.status === 'Closed') {
      history.push({
        action: 'Request Closed',
        user: request.approved_by || 'System',
        date: request.updated_at || '',
        details: 'Budget request completed and closed'
      });
    }

    return history;
  };

  return (
    <div className="modalOverlay">
      <div className="viewBudgetRequestModal">
        {/* Use ModalHeader component with custom content */}
        <div className="modalHeader">
          <div className="header-left">
            <h1>Budget Request Details</h1>
            <div className="statusBadgeHeader">
              <span className="statusLabel">Status:</span>
              <StatusBadge status={request.status} />
            </div>

            <div className="header-right">
                <button type="button" className="closeButton" onClick={onClose}>
                    <i className="ri-close-line"></i>
                </button>
            </div>
          </div>
          
          
        </div>

        <div className="modalContent">
          <div className="displayInputs">
            
            {/* Request Information Section */}
            <div className="sectionHeader">Request Information</div>
            
            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Request ID</label>
                <div className="displayValue highlightValue">{request.request_id}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Date of Request</label>
                <div className="displayValue">{formatDate(request.request_date)}</div>
              </div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Department</label>
                <div className="displayValue">{request.department || 'Operations'}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Requester Name</label>
                <div className="displayValue">{request.requested_by}</div>
              </div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Requester Position</label>
                <div className="displayValue">{request.requester_position || 'Not specified'}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Category</label>
                <div className="displayValue">{request.category}</div>
              </div>
            </div>

            {/* Budget Details Section */}
            <div className="sectionHeader">Budget Details</div>
            
            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Budget Period</label>
                <div className="displayValue">{request.budget_period || 'One Time Use'}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Requested Amount</label>
                <div className="displayValue highlightValue">
                  ₱{request.requested_amount.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
            </div>

            <div className="displayField">
              <label>Budget Title / Project Name</label>
              <div className="displayValue highlightValue">{request.title}</div>
            </div>

            <div className="displayField">
              <label>Description</label>
              <div className="displayValue displayValueTextarea">{request.description}</div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Start Date</label>
                <div className="displayValue">
                  {request.start_date ? formatDate(request.start_date) : 
                   <span className="displayValueEmpty">Not specified</span>}
                </div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>End Date</label>
                <div className="displayValue">
                  {request.end_date ? formatDate(request.end_date) : 
                   <span className="displayValueEmpty">Not specified</span>}
                </div>
              </div>
            </div>

            {/* Items Section */}
            {request.items && request.items.length > 0 && (
              <div className="itemsDisplaySection">
                <div className="itemsDisplayHeader">
                  <h3>Budget Items</h3>
                  <div className="itemsCount">{request.items.length} item{request.items.length !== 1 ? 's' : ''}</div>
                </div>

                {request.items.map((item, index) => (
                  <div key={index} className="itemDisplayContainer">
                    <div className="itemDisplayGrid">
                      <div className="itemDisplayField">
                        <label>Item Name</label>
                        <div className="itemDisplayValue">{item.item_name}</div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Quantity</label>
                        <div className="itemDisplayValue">{item.quantity}</div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Unit</label>
                        <div className="itemDisplayValue">{item.unit_measure}</div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Unit Cost</label>
                        <div className="itemDisplayValue">
                          ₱{item.unit_cost.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Supplier</label>
                        <div className="itemDisplayValue">{item.supplier}</div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Subtotal</label>
                        <div className="subtotalDisplayField">
                          ₱{item.subtotal.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="totalAmountDisplayView">
                  <h3>Total Amount from Items</h3>
                  <div className="totalAmountValueView">
                    ₱{calculateItemsTotal().toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Supporting Documents Section */}
            <div className="sectionHeader">Supporting Documents</div>
            
            <div className="fileDisplaySection">
              {request.supporting_documents && request.supporting_documents.length > 0 ? (
                <div className="fileDisplayList">
                  {request.supporting_documents.map((file, index) => (
                    <div key={index} className="fileDisplayItem">
                      <div>
                        <div className="fileDisplayName">
                          {typeof file === 'string' ? file : file.name}
                        </div>
                        {typeof file !== 'string' && (
                          <div className="fileDisplaySize">{formatFileSize(file.size)}</div>
                        )}
                      </div>
                      <button
                        className="downloadFileBtn"
                        onClick={() => handleFileDownload(file, index)}
                        title="Download File"
                      >
                        <i className="ri-download-line" /> Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="fileDisplayIcon">
                    <i className="ri-file-line" />
                  </div>
                  <div className="noFilesMessage">No supporting documents attached</div>
                </>
              )}
            </div>

            {/* Approval Information */}
            {(request.status === 'Approved' || request.status === 'Rejected') && (
              <>
                <div className="sectionHeader">Approval Information</div>
                <div className="displayRow">
                  <div className="displayField displayFieldHalf">
                    <label>{request.status === 'Approved' ? 'Approved By' : 'Rejected By'}</label>
                    <div className="displayValue">{request.approved_by || 'Not specified'}</div>
                  </div>
                  
                  <div className="displayField displayFieldHalf">
                    <label>{request.status === 'Approved' ? 'Approval Date' : 'Rejection Date'}</label>
                    <div className="displayValue">
                      {request.approval_date ? formatDate(request.approval_date) : 
                       <span className="displayValueEmpty">Not specified</span>}
                    </div>
                  </div>
                </div>

                {request.status === 'Rejected' && request.rejection_reason && (
                  <div className="displayField">
                    <label>Rejection Reason</label>
                    <div className="displayValue displayValueTextarea">{request.rejection_reason}</div>
                  </div>
                )}
              </>
            )}

            {/* Action History */}
            <div className="actionHistorySection">
              <div className="actionHistoryHeader">
                <h3>Action History</h3>
              </div>
              {getActionHistory().map((action, index) => (
                <div key={index} className="actionHistoryItem">
                  <div className="actionHistoryDetails">
                    <div className="actionHistoryAction">{action.action}</div>
                    <div className="actionHistoryMeta">
                      by {action.user} - {action.details}
                    </div>
                  </div>
                  <div className="actionHistoryDate">
                    {formatDateTime(action.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="modalButtons">
            {onExport && (
              <button className="exportButton" onClick={() => onExport(request)}>
                <i className="ri-download-line" /> Export
              </button>
            )}
            {onEdit && request.status === 'Draft' && (
              <button className="editButton" onClick={() => onEdit(request)}>
                <i className="ri-edit-line" /> Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewBudgetRequest;