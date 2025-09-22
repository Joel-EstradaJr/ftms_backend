'use client';

import React, { useState, useEffect } from 'react';
import styles from '../../../styles/budget-management/deductBudgetAllocation.module.css';
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

interface DeductBudgetAllocationProps {
  department: DepartmentBudget;
  budgetPeriod: string;
  onClose: () => void;
  onSubmit: (data: BudgetDeductionData) => void;
  showHeader?: boolean;
}

interface BudgetDeductionData {
  deduction_id: string;
  department_id: string;
  department_name: string;
  amount: number;
  deducted_date: string;
  deducted_by: string;
  period: string;
  notes: string;
}

const DeductBudgetAllocation: React.FC<DeductBudgetAllocationProps> = ({
  department,
  budgetPeriod,
  onClose,
  onSubmit,
  showHeader = true
}) => {
  const [deductionAmount, setDeductionAmount] = useState('');
  const [deductionNotes, setDeductionNotes] = useState('');
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

    // Validate deduction amount
    if (!deductionAmount || deductionAmount.trim() === '') {
      newErrors.deductionAmount = 'Deduction amount is required';
    } else {
      const amount = parseFloat(deductionAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.deductionAmount = 'Please enter a valid amount greater than 0';
      } else if (amount > department.allocated_budget) {
        newErrors.deductionAmount = 'Deduction amount cannot exceed current allocated budget';
      } else if (amount > 10000000) { // 10M limit
        newErrors.deductionAmount = 'Deduction amount cannot exceed ₱10,000,000';
      }
    }

    // Notes validation (optional but limited length)
    if (deductionNotes && deductionNotes.length > 500) {
      newErrors.deductionNotes = 'Notes cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Show confirmation dialog first
    const confirmResult = await showConfirmation(
      `<p>Are you sure you want to <b>DEDUCT</b> ₱${parseFloat(deductionAmount).toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} from <b>${department.department_name}</b>?</p>
      <p><small>This action will reduce the department's budget allocation for ${formatBudgetPeriod()}.</small></p>`,
      'Confirm Budget Deduction'
    );

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const deductionData: BudgetDeductionData = {
        deduction_id: `deduct_${Date.now()}_${department.department_id}`, // Generate unique ID
        department_id: department.department_id,
        department_name: department.department_name,
        amount: parseFloat(deductionAmount),
        deducted_date: new Date().toISOString(),
        deducted_by: 'Current User', // Replace with actual user context
        period: budgetPeriod, // Changed from budget_period to period
        notes: deductionNotes.trim(),
      };

      await onSubmit(deductionData);
      
      // Show success message
      showSuccess(
        `Successfully deducted ₱${parseFloat(deductionAmount).toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })} from ${department.department_name} for ${formatBudgetPeriod()}.`,
        'Budget Deducted!'
      );
      
      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 2100); // Slightly longer than the success timer
      
    } catch (error) {
      console.error('Error submitting deduction:', error);
      showError(
        'Failed to deduct budget. Please check your connection and try again.',
        'Deduction Failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate preview values
  const getPreviewValues = () => {
    const amount = parseFloat(deductionAmount) || 0;
    return {
      newAllocated: department.allocated_budget - amount,
      newRemaining: department.remaining_budget - amount,
      newUtilization: department.allocated_budget - amount === 0 ? 0 : 
        Math.round((department.used_budget / (department.allocated_budget - amount)) * 100)
    };
  };

  const preview = getPreviewValues();
  const utilizationStatus = getUtilizationStatus();

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.deductBudgetModal}>
        {showHeader && (
          <ModalHeader
            title={`Deduct Budget - ${department.department_name}`}
            onClose={onClose}
            showDateTime={true}
          />
        )}

        <div className={styles.modalContent}>
          <div className={styles.deductionInputs}>
            
            {/* Department Information Section */}
            <div className={styles.sectionHeader}>Department Information</div>
            
            <div className={styles.displayRow}>
              <div className={`${styles.displayField} ${styles.displayFieldHalf}`}>
                <label>Department Name</label>
                <div className={`${styles.displayValue} ${styles.highlightValue}`}>{department.department_name}</div>
              </div>
              
              <div className={`${styles.displayField} ${styles.displayFieldHalf}`}>
                <label>Department Status</label>
                <div className={styles.displayValue}>
                  <span className={`chip ${department.status.toLowerCase()}`}>
                    {department.status}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.displayRow}>
              <div className={`${styles.displayField} ${styles.displayFieldHalf}`}>
                <label>Budget Utilization</label>
                <div className={styles.displayValue}>
                  <span className={`chip ${utilizationStatus.class}`}>
                    {getBudgetUtilization()}% - {utilizationStatus.text}
                  </span>
                </div>
              </div>
              
              <div className={`${styles.displayField} ${styles.displayFieldHalf}`}>
                <label>Budget Requests</label>
                <div className={styles.displayValue}>{department.budget_requests_count} pending requests</div>
              </div>
            </div>

            {/* Current Budget Status Section */}
            <div className={styles.sectionHeader}>Current Budget Status</div>
            
            <div className={styles.currentBudgetGrid}>
              <div className={`${styles.budgetStatusCard} ${styles.allocated}`}>
                <div className={styles.budgetStatusIcon}>
                  <i className="ri-money-dollar-circle-line" />
                </div>
                <div className={styles.budgetStatusContent}>
                  <label>Current Allocated</label>
                  <div className={styles.budgetStatusValue}>
                    ₱{department.allocated_budget.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>

              <div className={`${styles.budgetStatusCard} ${styles.used}`}>
                <div className={styles.budgetStatusIcon}>
                  <i className="ri-shopping-cart-line" />
                </div>
                <div className={styles.budgetStatusContent}>
                  <label>Current Used</label>
                  <div className={styles.budgetStatusValue}>
                    ₱{department.used_budget.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>

              <div className={`${styles.budgetStatusCard} ${styles.remaining}`}>
                <div className={styles.budgetStatusIcon}>
                  <i className="ri-wallet-line" />
                </div>
                <div className={styles.budgetStatusContent}>
                  <label>Current Remaining</label>
                  <div className={`${styles.budgetStatusValue} ${department.remaining_budget < 0 ? styles.negative : styles.positive}`}>
                    ₱{department.remaining_budget.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Deduction Details Section */}
            <div className={styles.sectionHeader}>Deduction Details</div>
            
            <div className={styles.displayRow}>
              <div className={`${styles.displayField} ${styles.displayFieldHalf}`}>
                <label>Budget Period <span className={styles.requiredTags}>*</span></label>
                <div className={`${styles.displayValue} ${styles.highlightValue}`}>{formatBudgetPeriod()}</div>
              </div>
              
              <div className={`${styles.inputField} ${styles.displayFieldHalf}`}>
                <label>Deduction Amount <span className={styles.requiredTags}>*</span></label>
                <input
                  type="number"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  placeholder="Enter deduction amount"
                  min="0"
                  max={department.allocated_budget}
                  step="0.01"
                  className={`${styles.deductionInput} ${errors.deductionAmount ? styles.inputError : ''}`}
                />
                {errors.deductionAmount && (
                  <div className={styles.errorMessage}>{errors.deductionAmount}</div>
                )}
              </div>
            </div>

            <div className={styles.inputField}>
                <label>Deduction Notes</label>
                <textarea
                    value={deductionNotes}
                    onChange={(e) => setDeductionNotes(e.target.value)}
                    placeholder="Enter deduction notes or justification (optional)"
                    rows={4}
                    maxLength={500}
                    className={`${styles.deductionTextarea} ${errors.deductionNotes ? styles.inputError : ''}`}
                />
                <div className={styles.characterCount}>
                    {deductionNotes.length}/500 characters
                </div>
                {errors.deductionNotes && (
                    <div className={styles.errorMessage}>{errors.deductionNotes}</div>
                )}
            </div>

            {/* Deduction Preview Section */}
            {deductionAmount && !errors.deductionAmount && (
              <div className={styles.deductionPreviewSection}>
                <div className={styles.sectionHeader}>After Deduction Preview</div>
                
                <div className={styles.previewBudgetGrid}>
                  <div className={`${styles.budgetPreviewCard} ${styles.allocated}`}>
                    <div className={styles.budgetPreviewIcon}>
                      <i className="ri-arrow-down-circle-line" />
                    </div>
                    <div className={styles.budgetPreviewContent}>
                      <label>New Allocated Budget</label>
                      <div className={`${styles.budgetPreviewValue} ${styles.negative}`}>
                        ₱{preview.newAllocated.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                      <div className={styles.budgetPreviewChangeNegative}>
                        -₱{parseFloat(deductionAmount).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.budgetPreviewCard} ${styles.remaining}`}>
                    <div className={styles.budgetPreviewIcon}>
                      <i className="ri-wallet-3-line" />
                    </div>
                    <div className={styles.budgetPreviewContent}>
                      <label>New Remaining Budget</label>
                      <div className={`${styles.budgetPreviewValue} ${preview.newRemaining < 0 ? styles.negative : styles.positive}`}>
                        ₱{preview.newRemaining.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                      <div className={styles.budgetPreviewChangeNegative}>
                        -₱{parseFloat(deductionAmount).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.budgetPreviewCard} ${styles.utilization}`}>
                    <div className={styles.budgetPreviewIcon}>
                      <i className="ri-pie-chart-line" />
                    </div>
                    <div className={styles.budgetPreviewContent}>
                      <label>New Utilization Rate</label>
                      <div className={styles.budgetPreviewValue}>
                        {preview.newUtilization}%
                      </div>
                      <div className={styles.budgetPreviewChange}>
                        {preview.newUtilization > getBudgetUtilization() ? 'Increased' : 'Decreased'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className={styles.submitErrorMessage}>
                <i className="ri-error-warning-line" />
                {errors.submit}
              </div>
            )}
          </div>
        </div>

        {/* Modal Buttons */}
        <div className={styles.modalButtons}>
          <button 
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            <i className="ri-close-line" /> Cancel
          </button>
          
          <button 
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!deductionAmount || parseFloat(deductionAmount) <= 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="ri-loader-4-line spin" /> Deducting...
              </>
            ) : (
              <>
                <i className="ri-subtract-line" /> Deduct Budget
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeductBudgetAllocation;
