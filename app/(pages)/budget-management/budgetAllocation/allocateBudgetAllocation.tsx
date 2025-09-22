'use client';

import React, { useState, useEffect } from 'react';
import '../../../styles/budget-management/allocateBudgetAllocation.css';
import ModalHeader from '../../../Components/ModalHeader';
import { showSuccess, showError, showConfirmation } from '../../../utility/Alerts';

// Types
interface DepartmentBudget {
  department_id: string;
  department_name: string;
  allocated_budget: number;
  used_budget: number;
  remaining_budget: number;
  budget_requests_count: number;
  last_allocation_date: string;
  budget_period: string;
  status: 'Active' | 'Inactive' | 'Exceeded';
}

interface AllocateBudgetAllocationProps {
  department: DepartmentBudget;
  budgetPeriod: string;
  onClose: () => void;
  onSubmit: (data: BudgetAllocationData) => void;
  showHeader?: boolean;
}

interface BudgetAllocationData {
  allocation_id: string;
  department_id: string;
  department_name: string;
  amount: number;
  allocated_date: string;
  allocated_by: string;
  period: string;
  notes: string;
}

const AllocateBudgetAllocation: React.FC<AllocateBudgetAllocationProps> = ({
  department,
  budgetPeriod,
  onClose,
  onSubmit,
  showHeader = true
}) => {
  const [allocationAmount, setAllocationAmount] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format budget period for display
  const formatBudgetPeriod = () => {
    if (!budgetPeriod) return 'Current Period';
    const [year, month] = budgetPeriod.split('-').map(Number);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  // Calculate budget utilization percentage
  const getBudgetUtilization = () => {
    if (department.allocated_budget === 0) return 0;
    return Math.round((department.used_budget / department.allocated_budget) * 100);
  };

  // Get utilization status
  const getUtilizationStatus = () => {
    const utilization = getBudgetUtilization();
    if (utilization >= 100) return { text: 'Exceeded', class: 'status-exceeded' };
    if (utilization >= 80) return { text: 'High Usage', class: 'status-warning' };
    if (utilization >= 60) return { text: 'Moderate Usage', class: 'status-active' };
    return { text: 'Low Usage', class: 'status-good' };
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validate allocation amount
    if (!allocationAmount || allocationAmount.trim() === '') {
      newErrors.allocationAmount = 'Allocation amount is required';
    } else {
      const amount = parseFloat(allocationAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.allocationAmount = 'Please enter a valid amount greater than 0';
      } else if (amount > 10000000) { // 10M limit
        newErrors.allocationAmount = 'Allocation amount cannot exceed ₱10,000,000';
      }
    }

    // Notes validation (optional but limited length)
    if (allocationNotes && allocationNotes.length > 500) {
      newErrors.allocationNotes = 'Notes cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Show confirmation dialog first
    const confirmResult = await showConfirmation(
      `<p>Are you sure you want to <b>ALLOCATE</b> ₱${parseFloat(allocationAmount).toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} to <b>${department.department_name}</b>?</p>
      <p><small>This action will update the department's budget allocation for ${formatBudgetPeriod()}.</small></p>`,
      'Confirm Budget Allocation'
    );

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const allocationData: BudgetAllocationData = {
        allocation_id: `alloc_${Date.now()}_${department.department_id}`, // Generate unique ID
        department_id: department.department_id,
        department_name: department.department_name,
        amount: parseFloat(allocationAmount),
        allocated_date: new Date().toISOString(),
        allocated_by: 'Current User', // Replace with actual user context
        period: budgetPeriod, // Changed from budget_period to period
        notes: allocationNotes.trim(),
      };

      await onSubmit(allocationData);
      
      // Show success message
      showSuccess(
        `Successfully allocated ₱${parseFloat(allocationAmount).toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })} to ${department.department_name} for ${formatBudgetPeriod()}.`,
        'Budget Allocated!'
      );
      
      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 2100); // Slightly longer than the success timer
      
    } catch (error) {
      console.error('Error submitting allocation:', error);
      showError(
        'Failed to allocate budget. Please check your connection and try again.',
        'Allocation Failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate preview values
  const getPreviewValues = () => {
    const amount = parseFloat(allocationAmount) || 0;
    return {
      newAllocated: department.allocated_budget + amount,
      newRemaining: department.remaining_budget + amount,
      newUtilization: department.allocated_budget + amount === 0 ? 0 : 
        Math.round((department.used_budget / (department.allocated_budget + amount)) * 100)
    };
  };

  const preview = getPreviewValues();
  const utilizationStatus = getUtilizationStatus();

  return (
    <div className="modalOverlay">
      <div className="allocateBudgetModal">
        {showHeader && (
          <ModalHeader
            title={`Allocate Budget - ${department.department_name}`}
            onClose={onClose}
            showDateTime={true}
          />
        )}

        <div className="modalContent">
          <div className="allocationInputs">
            
            {/* Department Information Section */}
            <div className="sectionHeader">Department Information</div>
            
            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Department Name</label>
                <div className="displayValue highlightValue">{department.department_name}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Department Status</label>
                <div className="displayValue">
                  <span className={`chip ${department.status.toLowerCase()}`}>
                    {department.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Budget Utilization</label>
                <div className="displayValue">
                  <span className={`chip ${utilizationStatus.class}`}>
                    {getBudgetUtilization()}% - {utilizationStatus.text}
                  </span>
                </div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Budget Requests</label>
                <div className="displayValue">{department.budget_requests_count} pending requests</div>
              </div>
            </div>

            {/* Current Budget Status Section */}
            <div className="sectionHeader">Current Budget Status</div>
            
            <div className="currentBudgetGrid">
              <div className="budgetStatusCard allocated">
                <div className="budgetStatusIcon">
                  <i className="ri-money-dollar-circle-line" />
                </div>
                <div className="budgetStatusContent">
                  <label>Current Allocated</label>
                  <div className="budgetStatusValue">
                    ₱{department.allocated_budget.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>

              <div className="budgetStatusCard used">
                <div className="budgetStatusIcon">
                  <i className="ri-shopping-cart-line" />
                </div>
                <div className="budgetStatusContent">
                  <label>Current Used</label>
                  <div className="budgetStatusValue">
                    ₱{department.used_budget.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>

              <div className="budgetStatusCard remaining">
                <div className="budgetStatusIcon">
                  <i className="ri-wallet-line" />
                </div>
                <div className="budgetStatusContent">
                  <label>Current Remaining</label>
                  <div className={`budgetStatusValue ${department.remaining_budget < 0 ? 'negative' : 'positive'}`}>
                    ₱{department.remaining_budget.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Allocation Details Section */}
            <div className="sectionHeader">Allocation Details</div>
            
            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Budget Period <span className="requiredTags">*</span></label>
                <div className="displayValue highlightValue">{formatBudgetPeriod()}</div>
              </div>
              
              <div className="inputField displayFieldHalf">
                <label>Allocation Amount <span className="requiredTags">*</span></label>
                <input
                  type="number"
                  value={allocationAmount}
                  onChange={(e) => setAllocationAmount(e.target.value)}
                  placeholder="Enter allocation amount"
                  min="0"
                  step="0.01"
                  className={`allocationInput ${errors.allocationAmount ? 'input-error' : ''}`}
                />
                {errors.allocationAmount && (
                  <div className="error-message">{errors.allocationAmount}</div>
                )}
              </div>
            </div>

            <div className="inputField">
                <label>Allocation Notes</label>
                <textarea
                    value={allocationNotes}
                    onChange={(e) => setAllocationNotes(e.target.value)}
                    placeholder="Enter allocation notes or justification (optional)"
                    rows={4}
                    maxLength={500}
                    className={`allocationTextarea ${errors.allocationNotes ? 'input-error' : ''}`}
                />
                <div className="characterCount">
                    {allocationNotes.length}/500 characters
                </div>
                {errors.allocationNotes && (
                    <div className="error-message">{errors.allocationNotes}</div>
                )}
            </div>

            {/* Allocation Preview Section */}
            {allocationAmount && !errors.allocationAmount && (
              <div className="allocationPreviewSection">
                <div className="sectionHeader">After Allocation Preview</div>
                
                <div className="previewBudgetGrid">
                  <div className="budgetPreviewCard allocated">
                    <div className="budgetPreviewIcon">
                      <i className="ri-arrow-up-circle-line" />
                    </div>
                    <div className="budgetPreviewContent">
                      <label>New Allocated Budget</label>
                      <div className="budgetPreviewValue positive">
                        ₱{preview.newAllocated.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                      <div className="budgetPreviewChange">
                        +₱{parseFloat(allocationAmount).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="budgetPreviewCard remaining">
                    <div className="budgetPreviewIcon">
                      <i className="ri-wallet-3-line" />
                    </div>
                    <div className="budgetPreviewContent">
                      <label>New Remaining Budget</label>
                      <div className={`budgetPreviewValue ${preview.newRemaining < 0 ? 'negative' : 'positive'}`}>
                        ₱{preview.newRemaining.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                      <div className="budgetPreviewChange">
                        +₱{parseFloat(allocationAmount).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="budgetPreviewCard utilization">
                    <div className="budgetPreviewIcon">
                      <i className="ri-pie-chart-line" />
                    </div>
                    <div className="budgetPreviewContent">
                      <label>New Utilization Rate</label>
                      <div className="budgetPreviewValue">
                        {preview.newUtilization}%
                      </div>
                      <div className="budgetPreviewChange">
                        {preview.newUtilization < getBudgetUtilization() ? 'Decreased' : 'Improved'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="submitErrorMessage">
                <i className="ri-error-warning-line" />
                {errors.submit}
              </div>
            )}
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="modalButtons">
          <button 
            type="button"
            className="cancelButton"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <i className="ri-close-line" /> Cancel
          </button>
          
          <button 
            type="button"
            className="submitButton"
            onClick={handleSubmit}
            disabled={!allocationAmount || parseFloat(allocationAmount) <= 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="ri-loader-4-line spin" /> Allocating...
              </>
            ) : (
              <>
                <i className="ri-check-line" /> Allocate Budget
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllocateBudgetAllocation;