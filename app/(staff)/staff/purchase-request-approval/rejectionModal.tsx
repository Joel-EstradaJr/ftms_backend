"use client";

import React, { useState } from "react";
import ModalHeader from "../../../Components/ModalHeader";
import { showSuccess, showError } from "../../../utils/Alerts";
//@ts-ignore
import "../../../styles/purchase-approval/rejectionModal.css";

interface RejectionModalProps {
  request: {
    request_id: string;
    title: string;
    requester_name: string;
    total_amount: number;
    department: string;
  };
  onReject: (reason: string) => Promise<void>;
  onClose: () => void;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ request, onReject, onClose }) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common rejection reasons as clickable chips
  const commonReasons = [
    "Budget allocation exceeded",
    "Insufficient funds",
    "Requires additional approval",
    "Incomplete documentation",
    "Policy violation",
    "Alternative supplier required",
    "Timing not appropriate",
    "Duplicate request"
  ];

  const handleReasonChipClick = (reason: string) => {
    setRejectionReason(reason);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rejectionReason.trim()) {
      showError("Please provide a rejection reason", "Error");
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onReject(rejectionReason.trim());
      onClose();
    } catch (error) {
      console.error("Error rejecting request:", error);
      showError("Failed to reject request", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        <ModalHeader 
          title="Reject Purchase Request" 
          onClose={onClose} 
          showDateTime={true} 
        />

        <form onSubmit={handleSubmit}>
          <div className="modalContent">
            <div className="formFieldsHorizontal">
              <div className="formInputs">
                
                {/* Request Details */}
                <div className="formField">
                  <label>Request Details</label>
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    marginBottom: '15px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Request ID:</strong> {request.request_id}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Title:</strong> {request.title}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Requester:</strong> {request.requester_name}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Department:</strong> {request.department}
                    </div>
                    <div style={{ marginBottom: '0' }}>
                      <strong>Total Amount:</strong> ₱{request.total_amount.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </div>
                  </div>
                </div>

                {/* Common Rejection Reasons */}
                <div className="formField">
                  <label>Common Rejection Reasons</label>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px', 
                    marginBottom: '15px' 
                  }}>
                    {commonReasons.map((reason, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleReasonChipClick(reason)}
                        style={{
                          background: rejectionReason === reason ? '#dc3545' : '#f8f9fa',
                          color: rejectionReason === reason ? 'white' : '#6c757d',
                          border: `1px solid ${rejectionReason === reason ? '#dc3545' : '#dee2e6'}`,
                          borderRadius: '20px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rejection Reason */}
                <div className="formField">
                  <label htmlFor="rejectionReason">
                    Rejection Reason <span className="requiredTags"> *</span>
                  </label>
                  <textarea
                    id="rejectionReason"
                    name="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a detailed reason for rejecting this request..."
                    className="formInput"
                    rows={4}
                    required
                    style={{ resize: 'vertical', minHeight: '100px' }}
                  />
                  <small style={{ color: '#6c757d', fontSize: '12px' }}>
                    This reason will be sent to the requester and recorded in the audit trail.
                  </small>
                </div>

                {/* Confirmation Message */}
                <div style={{ 
                  background: '#f8d7da', 
                  border: '1px solid #f5c6cb', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  marginTop: '15px',
                  color: '#721c24'
                }}>
                  <i className="ri-error-warning-line" style={{ marginRight: '8px' }}></i>
                  <strong>Confirm Rejection:</strong> This will reject the purchase request and notify the requester.
                </div>
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button 
              type="submit" 
              className="addButton"
              disabled={isSubmitting}
              style={{ 
                background: '#dc3545', 
                color: 'white'
              }}
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-line" style={{ animation: 'spin 1s linear infinite' }}></i> 
                  Rejecting...
                </>
              ) : (
                <>
                  <i className="ri-close-line"></i> 
                  Reject Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionModal;