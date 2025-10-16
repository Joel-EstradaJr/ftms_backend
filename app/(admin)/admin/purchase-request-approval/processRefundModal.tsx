"use client";

import React, { useState } from 'react';
import { PurchaseRequestApproval } from "../../../types/purchaseRequestApproval";
import { showSuccess, showError } from "../../../utility/Alerts";
import ModalHeader from '../../../Components/ModalHeader';
//@ts-ignore
import "../../../styles/purchase-approval/processRefund.css";

interface ProcessRefundModalProps {
  request: PurchaseRequestApproval;
  onClose: () => void;
  onRefundProcessed: (requestId: string, refundAmount: number, reason: string) => void;
}

const ProcessRefundModal: React.FC<ProcessRefundModalProps> = ({
  request,
  onClose,
  onRefundProcessed,
}) => {
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [accountDetails, setAccountDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const paymentMethods = [
    { id: "cash", label: "Cash" },
    { id: "bank-transfer", label: "Bank Transfer" },
    { id: "check", label: "Check" },
    { id: "petty-cash", label: "Petty Cash" }
  ];

  const handleAmountChange = (amount: number) => {
    setRefundAmount(amount);
    if (errors.refundAmount) {
      setErrors(prev => ({ ...prev, refundAmount: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (refundAmount <= 0) {
      newErrors.refundAmount = "Refund amount must be greater than 0";
    } else if (refundAmount > request.total_amount) {
      newErrors.refundAmount = `Refund amount cannot exceed ₱${request.total_amount.toLocaleString()}`;
    }

    if (!refundReason.trim()) {
      newErrors.refundReason = "Please provide a reason for the refund";
    } else if (refundReason.trim().length < 10) {
      newErrors.refundReason = "Refund reason must be at least 10 characters";
    }

    if ((paymentMethod === "bank-transfer" || paymentMethod === "check") && !accountDetails.trim()) {
      newErrors.accountDetails = "Account details are required for this payment method";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProcessRefund = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // TODO: Implement actual API call to process refund
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      const refundData = {
        request_id: request.request_id,
        refund_amount: refundAmount,
        refund_reason: refundReason,
        payment_method: paymentMethod,
        account_details: paymentMethod === "cash" || paymentMethod === "petty-cash" ? null : accountDetails,
        processed_by: "Current User", // TODO: Get from auth context
        processed_at: new Date()
      };

      console.log("Processing refund:", refundData);

      showSuccess(
        `Refund of ₱${refundAmount.toLocaleString()} has been processed successfully`,
        "Refund Processed"
      );

      onRefundProcessed(request.request_id, refundAmount, refundReason);
      onClose();
    } catch (error) {
      console.error("Error processing refund:", error);
      showError("Failed to process refund", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="addExpenseModal" onClick={(e) => e.stopPropagation()}>
        <ModalHeader title="Process Refund" onClose={onClose} />
        
        <form onSubmit={(e) => { e.preventDefault(); handleProcessRefund(); }}>
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
                      <strong>Order Number:</strong> {request.order_number || 'N/A'}
                    </div>
                    <div style={{ marginBottom: '0' }}>
                      <strong>Total Paid:</strong> ₱{request.total_amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Refund Amount */}
                <div className="formField">
                  <label>
                    Refund Amount <span className="requiredTags">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--secondary-text-color)'
                    }}>₱</span>
                    <input
                      type="number"
                      min="0"
                      max={request.total_amount}
                      step="0.01"
                      value={refundAmount}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                      className={`formInput ${errors.refundAmount ? "input-error" : ""}`}
                      style={{ paddingLeft: '30px' }}
                    />
                  </div>
                  {errors.refundAmount && <div className="error-message">{errors.refundAmount}</div>}
                  <small style={{ color: 'var(--secondary-text-color)', fontSize: '12px' }}>
                    Maximum refundable: ₱{request.total_amount.toLocaleString()}
                  </small>
                </div>

                {/* Refund Reason */}
                <div className="formField">
                  <label>
                    Refund Reason <span className="requiredTags">*</span>
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => {
                      setRefundReason(e.target.value);
                      if (errors.refundReason) {
                        setErrors(prev => ({ ...prev, refundReason: "" }));
                      }
                    }}
                    placeholder="Explain the reason for this refund..."
                    rows={3}
                    className={`formInput ${errors.refundReason ? "input-error" : ""}`}
                    style={{ resize: 'vertical' }}
                  />
                  {errors.refundReason && <div className="error-message">{errors.refundReason}</div>}
                </div>

                {/* Payment Method */}
                <div className="formField">
                  <label>
                    Payment Method <span className="requiredTags">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (errors.accountDetails) {
                        setErrors(prev => ({ ...prev, accountDetails: "" }));
                      }
                    }}
                    className="formInput"
                  >
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.id}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Details (conditional) */}
                {(paymentMethod === "bank-transfer" || paymentMethod === "check") && (
                  <div className="formField">
                    <label>
                      {paymentMethod === "bank-transfer" ? "Bank Account Details" : "Check Details"} 
                      <span className="requiredTags">*</span>
                    </label>
                    <textarea
                      value={accountDetails}
                      onChange={(e) => {
                        setAccountDetails(e.target.value);
                        if (errors.accountDetails) {
                          setErrors(prev => ({ ...prev, accountDetails: "" }));
                        }
                      }}
                      placeholder={
                        paymentMethod === "bank-transfer" 
                          ? "Bank name, account number, account holder name..."
                          : "Payee name, address, and other check details..."
                      }
                      rows={3}
                      className={`formInput ${errors.accountDetails ? "input-error" : ""}`}
                      style={{ resize: 'vertical' }}
                    />
                    {errors.accountDetails && <div className="error-message">{errors.accountDetails}</div>}
                  </div>
                )}

                {/* Refund Summary */}
                <div style={{
                  backgroundColor: 'var(--info-chip-bg-color)',
                  border: '1px solid var(--info-color)',
                  borderRadius: '4px',
                  padding: '1rem',
                  margin: '1.5rem 0'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--info-chip-text-color)' }}>
                    <i className="ri-information-line" style={{ marginRight: '0.5rem' }}></i>
                    Refund Summary
                  </h4>
                  <div style={{ color: 'var(--info-chip-text-color)' }}>
                    <p><strong>Refund Amount:</strong> ₱{refundAmount.toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> {paymentMethods.find(m => m.id === paymentMethod)?.label}</p>
                    <p><strong>Processing Time:</strong> 3-5 business days</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button
              type="submit"
              className="addButton"
              disabled={isSubmitting}
              style={{ minWidth: '140px' }}
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }}></i>
                  Processing...
                </>
              ) : (
                <>
                  <i className="ri-refund-line"></i>
                  Process Refund
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProcessRefundModal;