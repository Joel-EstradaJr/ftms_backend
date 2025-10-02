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



