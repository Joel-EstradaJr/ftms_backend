import Swal from 'sweetalert2';

//--------------------ADD REVENUE RECORD-------------------//
export const showEmptyFieldWarning = () => {
  return Swal.fire({
    icon: 'warning',
    text: 'Please fill out all fields.',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
};

export const showInvalidCategoryAlert = () => {
    return Swal.fire({
      icon: 'error',
      title: 'Invalid Category',
      text: 'Please select a valid category.',
      confirmButtonColor: '#961C1E',
      background: 'white',
      backdrop: false,
      customClass: {
    popup: 'swal-custom-popup'
  }
    });
  };
  
export const showInvalidSourceAlert = () => {
  return Swal.fire({
    icon: 'error',
    title: 'Invalid Source',
    text: 'Source must be 3-50 alphabetic characters.',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
};

export const showInvalidAmountAlert = () => {
  return Swal.fire({
    icon: 'error',
    title: 'Invalid Amount',
    text: 'Amount must be a positive number.',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
}

export const showAddConfirmation = () => {
  return Swal.fire({
    title: 'Confirmation',
    html: `<p>Are you sure you want to <b>ADD</b> this record?</p>`,
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    background: 'white',
    confirmButtonColor: '#961C1E',
    cancelButtonColor: '#ECECEC',
    backdrop: false,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
};

export const showAddSuccess = () => {
  return Swal.fire({
    icon: 'success',
    title: 'Added!',
    text: 'Your revenue record has been added.',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
};


//-----------------------ADD RECORD---------------------//
//SUCCESS
export const showSuccess = (message: string, title:string) => {
  Swal.fire({
    icon: 'success',
    title: title,
    text: message,
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
};

//FAILED/ERROR

export const showError = (message: string, title: string) => {
  Swal.fire({
    icon: 'error',
    title: title,
    text: message,
    confirmButtonColor: '#961C1E',
    background: 'white',
    timer: 3000,
    backdrop: false,
    timerProgressBar: true,
    showConfirmButton: false,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
};

//WARNING
export const showWarning = (message: string) => {
  return Swal.fire({
    icon: 'warning',
    text: message,
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
};

//Information
export const showInformation = (message: string, title: string) => {
  return Swal.fire({
    icon: 'info',
    title: title,
    text: message,
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
};

//confirmation
export const showConfirmation = (message: string, title: string) => {
  return Swal.fire({
    icon: 'question',
    title: title,
    html: message,
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    background: 'white',
    confirmButtonColor: '#961C1E',
    cancelButtonColor: '#FEB71F',
    reverseButtons: true,
    customClass: {
    popup: 'swal-custom-popup'
  }
  });
};

// Loan Rejection with dropdown
export const showLoanRejectionDialog = (loanRequestId: string) => {
  return Swal.fire({
    title: 'Reject Loan Request',
    html: `
      <div style="text-align: left; margin: 0; padding: 10%;">
        <p style="margin-bottom: 15px; color: #666;">
          <strong>Request ID:</strong> ${loanRequestId}
        </p>
        <label for="rejection-reason" style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
          Rejection Reason <span style="color: #dc3545;">*</span>
        </label>
        <select id="rejection-reason" class="swal2-input" style="width: 100%; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px; margin: 0 0 15px 0; box-sizing: border-box;">
          <option value="">Select rejection reason</option>
          <option value="insufficient_employment_tenure">Insufficient Employment Tenure</option>
          <option value="excessive_amount">Excessive Loan Amount</option>
          <option value="existing_loan_active">Existing Active Loan</option>
          <option value="inadequate_justification">Inadequate Justification</option>
          <option value="poor_credit_history">Poor Credit History</option>
          <option value="budget_constraints">Budget Constraints</option>
          <option value="policy_violation">Policy Violation</option>
          <option value="incomplete_documentation">Incomplete Documentation</option>
          <option value="salary_insufficient">Salary Insufficient for Repayment</option>
          <option value="emergency_funds_unavailable">Emergency Funds Unavailable</option>
          <option value="duplicate_request">Duplicate Request</option>
          <option value="other">Other (specify below)</option>
        </select>
        
        <label for="custom-reason" style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
          Additional Comments
        </label>
        <textarea id="custom-reason" placeholder="Enter additional details or custom reason if 'Other' is selected..." 
                  style="width: 100%; min-height: 80px; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px; resize: vertical; margin: 0; box-sizing: border-box; text-align: left; text-indent: 0;"></textarea>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Reject Request',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    background: 'white',
    backdrop: false,
    customClass: {
      popup: 'swal-custom-popup',
      confirmButton: 'swal-reject-button',
      cancelButton: 'swal-cancel-button'
    },
    preConfirm: () => {
      const reasonSelect = document.getElementById('rejection-reason') as HTMLSelectElement;
      const customReasonTextarea = document.getElementById('custom-reason') as HTMLTextAreaElement;
      
      const selectedReason = reasonSelect?.value;
      const customReason = customReasonTextarea?.value?.trim();
      
      if (!selectedReason) {
        Swal.showValidationMessage('Please select a rejection reason');
        return false;
      }
      
      if (selectedReason === 'other' && !customReason) {
        Swal.showValidationMessage('Please provide additional details when selecting "Other"');
        return false;
      }
      
      return {
        rejection_reason: selectedReason,
        custom_reason: customReason,
        rejection_comments: customReason || selectedReason
      };
    },
    didOpen: () => {
      // Add custom styling to fix textarea indentation and appearance
      const style = document.createElement('style');
      style.textContent = `
        .swal-reject-button {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3) !important;
        }
        .swal-reject-button:hover {
          background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%) !important;
          transform: translateY(-1px) !important;
        }
        .swal-cancel-button {
          background: #6c757d !important;
          border: none !important;
        }
        .swal-cancel-button:hover {
          background: #545b62 !important;
        }
        #rejection-reason:focus,
        #custom-reason:focus {
          border-color: #dc3545 !important;
          box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
          outline: none !important;
        }
        #custom-reason {
          margin: 0 !important;
          padding: 8px 12px !important;
          text-indent: 0 !important;
          text-align: left !important;
          box-sizing: border-box !important;
        }
        .swal2-popup .swal2-html-container {
          margin: 0 !important;
          padding: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }
  });
};

// ========================================================================================
// LOAN PAYMENT ALERTS
// ========================================================================================

/**
 * Shows confirmation dialog before adding a payment
 * @param amount - Payment amount to be added
 * @param loanId - ID of the loan being paid
 */
export const showPaymentConfirmation = (amount: number, loanId: string) => {
  return Swal.fire({
    title: 'Confirm Payment',
    html: `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 10px;"><strong>Loan ID:</strong> ${loanId}</p>
        <p style="margin-bottom: 10px;"><strong>Payment Amount:</strong> ₱${amount.toFixed(2)}</p>
        <p style="color: #666;">Are you sure you want to record this payment?</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirm Payment',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#961C1E',
    cancelButtonColor: '#6c757d',
    background: 'white',
    backdrop: false,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows warning when making a partial payment
 * @param amount - Payment amount
 * @param remaining - Remaining balance after payment
 */
export const showPartialPaymentWarning = (amount: number, remaining: number) => {
  return Swal.fire({
    title: 'Partial Payment',
    html: `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 10px;"><strong>Payment Amount:</strong> ₱${amount.toFixed(2)}</p>
        <p style="margin-bottom: 10px;"><strong>Remaining Balance:</strong> ₱${remaining.toFixed(2)}</p>
        <p style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 4px; border-left: 4px solid #ffc107;">
          ⚠️ This is a partial payment. The loan will remain active.
        </p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Continue',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#961C1E',
    cancelButtonColor: '#6c757d',
    background: 'white',
    backdrop: false,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows warning when payment exceeds remaining balance
 * @param amount - Payment amount
 * @param remaining - Current remaining balance
 */
export const showOverpaymentWarning = (amount: number, remaining: number) => {
  const overpayment = amount - remaining;
  return Swal.fire({
    title: 'Overpayment Detected',
    html: `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 10px;"><strong>Payment Amount:</strong> ₱${amount.toFixed(2)}</p>
        <p style="margin-bottom: 10px;"><strong>Remaining Balance:</strong> ₱${remaining.toFixed(2)}</p>
        <p style="margin-bottom: 10px;"><strong>Overpayment:</strong> ₱${overpayment.toFixed(2)}</p>
        <p style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 4px; border-left: 4px solid #dc3545;">
          ⚠️ Payment exceeds remaining balance. Please verify the amount.
        </p>
      </div>
    `,
    icon: 'error',
    confirmButtonText: 'OK',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows success message after payment is recorded
 * @param receiptNumber - Receipt number for the payment
 */
export const showPaymentSuccess = (receiptNumber?: string) => {
  return Swal.fire({
    icon: 'success',
    title: 'Payment Recorded',
    html: receiptNumber 
      ? `<p>Payment has been successfully recorded.</p><p><strong>Receipt #:</strong> ${receiptNumber}</p>`
      : '<p>Payment has been successfully recorded.</p>',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows error message when payment fails
 * @param message - Error message to display
 */
export const showPaymentError = (message: string) => {
  return Swal.fire({
    icon: 'error',
    title: 'Payment Failed',
    text: message || 'An error occurred while recording the payment. Please try again.',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows confirmation dialog before closing a loan
 * @param loanId - ID of the loan to be closed
 * @param finalAmount - Final payment amount (should be remaining balance)
 */
export const showCloseLoanConfirmation = (loanId: string, finalAmount: number) => {
  return Swal.fire({
    title: 'Close Loan',
    html: `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 10px;"><strong>Loan ID:</strong> ${loanId}</p>
        <p style="margin-bottom: 10px;"><strong>Final Payment:</strong> ₱${finalAmount.toFixed(2)}</p>
        <p style="color: #155724; background: #d4edda; padding: 10px; border-radius: 4px; border-left: 4px solid #28a745;">
          ✓ This will mark the loan as fully paid and closed.
        </p>
        <p style="margin-top: 10px; color: #666;">Are you sure you want to close this loan?</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Close Loan',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#6c757d',
    background: 'white',
    backdrop: false,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows success message after loan is closed
 */
export const showCloseLoanSuccess = () => {
  return Swal.fire({
    icon: 'success',
    title: 'Loan Closed',
    text: 'The loan has been successfully closed and marked as fully paid.',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows confirmation dialog before deleting a payment
 * @param paymentId - ID of the payment to be deleted
 * @param amount - Amount of the payment being deleted
 */
export const showDeletePaymentConfirmation = (paymentId: string, amount: number) => {
  return Swal.fire({
    title: 'Delete Payment',
    html: `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 10px;"><strong>Payment ID:</strong> ${paymentId}</p>
        <p style="margin-bottom: 10px;"><strong>Amount:</strong> ₱${amount.toFixed(2)}</p>
        <p style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 4px; border-left: 4px solid #dc3545;">
          ⚠️ Warning: This action cannot be undone. The loan balance will be adjusted.
        </p>
        <p style="margin-top: 10px; color: #666;">Are you sure you want to delete this payment?</p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete Payment',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    background: 'white',
    backdrop: false,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows success message after payment is deleted
 */
export const showDeletePaymentSuccess = () => {
  return Swal.fire({
    icon: 'success',
    title: 'Payment Deleted',
    text: 'The payment record has been successfully deleted.',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows confirmation dialog before performing audit
 */
export const showAuditConfirmation = () => {
  return Swal.fire({
    title: 'Generate Audit Report',
    text: 'This will generate a comprehensive audit report of all payment transactions. Continue?',
    icon: 'info',
    showCancelButton: true,
    confirmButtonText: 'Generate Report',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#961C1E',
    cancelButtonColor: '#6c757d',
    background: 'white',
    backdrop: false,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows success message after audit report is generated
 */
export const showAuditSuccess = () => {
  return Swal.fire({
    icon: 'success',
    title: 'Audit Report Generated',
    text: 'The audit report has been successfully generated.',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    timer: 2000,
    timerProgressBar: true,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows confirmation dialog before editing a payment
 * @param paymentId - ID of the payment to be edited
 */
export const showEditPaymentConfirmation = (paymentId: string) => {
  return Swal.fire({
    title: 'Edit Payment',
    html: `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 10px;"><strong>Payment ID:</strong> ${paymentId}</p>
        <p style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 4px; border-left: 4px solid #ffc107;">
          ℹ️ Editing this payment will update the loan balance and create an audit trail.
        </p>
        <p style="margin-top: 10px; color: #666;">Continue with editing?</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Continue',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#961C1E',
    cancelButtonColor: '#6c757d',
    background: 'white',
    backdrop: false,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};

/**
 * Shows success message after payment is updated
 */
export const showEditPaymentSuccess = () => {
  return Swal.fire({
    icon: 'success',
    title: 'Payment Updated',
    text: 'The payment record has been successfully updated.',
    confirmButtonColor: '#961C1E',
    background: 'white',
    backdrop: false,
    timer: 2000,
    timerProgressBar: true,
    customClass: {
      popup: 'swal-custom-popup'
    }
  });
};




