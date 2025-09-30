'use client';

import React from 'react';
//@ts-ignore
import "../../styles/budget-management/addBudgetRequest.css";
import { formatDate } from '../../utility/dateFormatter';
import ModalHeader from '../../Components/ModalHeader';
import ItemsTable, { Item } from '../../Components/itemTable';

// Types
interface ViewPurchaseRequestProps {
  purchaseRequest: any; // The purchase request data from the table
  onClose: () => void;
}

const ViewPurchaseRequest: React.FC<ViewPurchaseRequestProps> = ({
  purchaseRequest,
  onClose
}) => {
  // Helper function to format status
  const formatStatus = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending Approval";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "completed":
        return "Completed";
      case "partially-completed":
        return "Partially Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Helper function to format request type
  const formatRequestType = (type: string) => {
    switch (type) {
      case "normal":
        return "Normal Request";
      case "urgent":
        return "Urgent Request";
      default:
        return type;
    }
  };

  // Mock form data based on purchase request
  const formData = {
    title: purchaseRequest.itemName || 'Purchase Request',
    description: purchaseRequest.requestPurpose || 'No description provided',
    department: 'Operations',
    requester_name: 'Admin User',
    requester_position: 'Administrator',
    request_date: '2024-03-22',
    budget_period: purchaseRequest.requestType || 'normal',
    total_amount: (purchaseRequest.quantity * purchaseRequest.unitPrice) || 0,
    start_date: '2024-03-22',
    end_date: '2024-03-30',
    created_by: 'Admin User'
  };

  // Mock items array based on purchase request data
  const items: Item[] = [
    {
      item_name: purchaseRequest.itemName || 'Sample Item',
      quantity: purchaseRequest.quantity || 1,
      unit_measure: purchaseRequest.unitMeasure || 'pcs',
      unit_cost: purchaseRequest.unitPrice || 0,
      supplier: purchaseRequest.vendor || 'Unknown Supplier',
      subtotal: (purchaseRequest.quantity * purchaseRequest.unitPrice) || 0,
      type: 'supply' // Required property for Item interface
    }
  ];

  // Mock supporting documents
  const supportingDocuments = [
    { name: 'purchase-justification.pdf', size: 245760 },
    { name: 'vendor-quotation.xlsx', size: 129024 }
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="modalOverlay">
      <div className="addBudgetRequestModal" style={{ display: 'flex', flexDirection: 'column', height: 'auto', maxHeight: '90vh' }}>
        <ModalHeader 
          title="View Purchase Request" 
          onClose={onClose} 
          showDateTime={true} 
        />

        <div className="modalContent">
          <div className="formInputs">
            
            {/* Basic Information Section */}
            <div className="sectionHeader">Request Information</div>
            
            <div className="formRow">
              <div className="formField formFieldHalf">
                <label htmlFor="department">Department</label>
                <div className="viewOnlyField">{formData.department}</div>
                <span className="autofill-note">Auto-filled based on current user</span>
              </div>
              
              <div className="formField formFieldHalf">
                <label htmlFor="requester_name">Requester Name</label>
                <div className="viewOnlyField">{formData.requester_name}</div>
                <span className="autofill-note">Auto-filled based on current user</span>
              </div>
            </div>

            <div className="formRow">
              <div className="formField formFieldHalf">
                <label htmlFor="requester_position">Requester Position</label>
                <div className="viewOnlyField">{formData.requester_position}</div>
                <span className="autofill-note">Auto-filled based on current user</span>
              </div>
              
              <div className="formField formFieldHalf">
                <label htmlFor="request_date">Date of Request</label>
                <div className="viewOnlyField">{formatDate(formData.request_date)}</div>
                <span className="autofill-note">Auto-filled with current date</span>
              </div>
            </div>

            {/* Purchase Details Section */}
            <div className="sectionHeader">Purchase Details</div>
            
            <div className="formRow">
              <div className="formField formFieldHalf">
                <label htmlFor="budget_period">Request Type</label>
                <div className="viewOnlyField">
                  <span className={`chip ${formData.budget_period}`}>
                    {formatRequestType(formData.budget_period)}
                  </span>
                </div>
              </div>
              
              <div className="formField formFieldHalf">
                <label htmlFor="total_amount">Total Amount</label>
                <div className="viewOnlyField">{formatCurrency(formData.total_amount)}</div>
                <span className="autofill-note">Auto-calculated from items below</span>
              </div>
            </div>

            <div className="formField">
              <label htmlFor="title">Purchase Request Title</label>
              <div className="viewOnlyField">{formData.title}</div>
            </div>

            <div className="formField">
              <label htmlFor="description">Request Purpose</label>
              <div className="viewOnlyField multiline">{formData.description}</div>
            </div>

            <div className="formRow">
              <div className="formField formFieldHalf">
                <label htmlFor="start_date">Request Date</label>
                <div className="viewOnlyField">{formatDate(formData.start_date)}</div>
                <span className="autofill-note">Auto-filled with today's date</span>
              </div>
              
              <div className="formField formFieldHalf">
                <label htmlFor="end_date">Needed By Date</label>
                <div className="viewOnlyField">{formatDate(formData.end_date)}</div>
              </div>
            </div>

            {/* Items Section - Using ItemsTable component in read-only mode */}
            <ItemsTable
              items={items}
              onItemsChange={() => {}} // No-op function since it's read-only
              showItems={true}
              onToggleItems={() => {}} // No-op function since it's read-only
              readOnly={true}
              title="Purchase Items"
            />

            {/* Supporting Documents Section */}
            <div className="sectionHeader">Supporting Documents</div>
            
            <div className="documentsViewSection">
              {supportingDocuments.length > 0 ? (
                <div className="documentsList">
                  {supportingDocuments.map((doc, index) => (
                    <div key={index} className="documentItem">
                      <div className="documentIcon">
                        <i className="ri-file-text-line" />
                      </div>
                      <div className="documentInfo">
                        <div className="documentName">{doc.name}</div>
                        <div className="documentSize">{formatFileSize(doc.size)}</div>
                      </div>
                      <button className="downloadBtn" type="button">
                        <i className="ri-download-line" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="noDocuments">
                  <i className="ri-file-line" />
                  <span>No supporting documents uploaded</span>
                </div>
              )}
            </div>

            {/* Request Status Section */}
            <div className="sectionHeader">Request Status</div>
            
            <div className="formRow">
              <div className="formField formFieldHalf">
                <label htmlFor="current_status">Current Status</label>
                <div className="viewOnlyField">
                  <span className={`chip ${purchaseRequest.requestStatus}`}>
                    {formatStatus(purchaseRequest.requestStatus)}
                  </span>
                </div>
              </div>
              
              <div className="formField formFieldHalf">
                <label htmlFor="created_by">Created By</label>
                <div className="viewOnlyField">{formData.created_by}</div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="sectionHeader">Additional Information</div>
            
            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Request ID</label>
                <div className="viewOnlyField">PR-{String(purchaseRequest.id).padStart(4, '0')}</div>
              </div>
              
              <div className="formField formFieldHalf">
                <label>Priority Level</label>
                <div className="viewOnlyField">
                  <span className={`chip ${formData.budget_period}`}>
                    {formData.budget_period === 'urgent' ? 'High Priority' : 'Normal Priority'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            <div className="sectionHeader">Vendor Information</div>
            
            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Primary Vendor</label>
                <div className="viewOnlyField">{purchaseRequest.vendor || 'Not specified'}</div>
              </div>
              
              <div className="formField formFieldHalf">
                <label>Estimated Delivery</label>
                <div className="viewOnlyField">2-5 business days</div>
              </div>
            </div>

            <div className="formField">
              <label>Vendor Notes</label>
              <div className="viewOnlyField multiline">
                This vendor has been verified and approved for procurement. 
                Standard delivery terms apply. Quality assurance completed.
              </div>
            </div>
          </div>
        </div>

        <div className="modalButtons">
          <button type="button" className="secondaryButton" onClick={onClose}>
            <i className="ri-close-line" /> Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPurchaseRequest;