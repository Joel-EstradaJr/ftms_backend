"use client";

import React, { useState } from "react";
import ModalHeader from "../../../Components/ModalHeader";
import { showSuccess, showError } from "../../../utils/Alerts";
//@ts-ignore
import "../../../styles/purchase-approval/approvalModal.css";

interface ApprovalModalProps {
  request: {
    request_id: string;
    title: string;
    requester_name: string;
    total_amount: number;
    department: string;
  };
  onApprove: (comments?: string) => Promise<void>;
  onClose: () => void;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ request, onApprove, onClose }) => {
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      await onApprove(comments.trim() || undefined);
      onClose();
    } catch (error) {
      console.error("Error approving request:", error);
      showError("Failed to approve request", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        <ModalHeader 
          title="Approve Purchase Request" 
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

                {/* Approval Comments */}
                <div className="formField">
                  <label htmlFor="comments">Approval Comments (Optional)</label>
                  <textarea
                    id="comments"
                    name="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add any comments about this approval..."
                    className="formInput"
                    rows={4}
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>

                {/* Confirmation Message */}
                <div style={{ 
                  background: '#d4edda', 
                  border: '1px solid #c3e6cb', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  marginTop: '15px',
                  color: '#155724'
                }}>
                  <i className="ri-check-line" style={{ marginRight: '8px' }}></i>
                  <strong>Confirm Approval:</strong> This will approve the purchase request and allow it to proceed to ordering.
                </div>
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button 
              type="submit" 
              className="addButton"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-line" style={{ animation: 'spin 1s linear infinite' }}></i> 
                  Approving...
                </>
              ) : (
                <>
                  <i className="ri-check-line"></i> 
                  Approve Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalModal;