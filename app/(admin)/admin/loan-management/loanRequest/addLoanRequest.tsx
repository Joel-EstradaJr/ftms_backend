'use client';

import React, { useState, useEffect } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import { showSuccess, showError } from '../../../../utility/Alerts';
import {
  PaymentScheduleType,
  PaymentAmountType,
  PaymentMode,
  PaymentEntry,
  PaymentStatus,
  PaymentConfiguration
} from '../../../../types/loanPaymentTypes';
import {
  generatePaymentSchedule,
  calculateTotalPeso,
  calculateTotalPercentage,
  validatePayments,
  convertPercentageToPeso,
  convertPesoToPercentage,
  formatCurrency,
  formatPercentage
} from '../../../../utility/paymentCalculations';

//@ts-ignore
import '../../../../styles/loan-management/addLoanRequest.css';
//@ts-ignore
import '../../../../styles/components/modal.css';

/**
 * Custom hook for debouncing values
 * Delays update until user stops typing for specified milliseconds
 */
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export enum LoanType {
  EMERGENCY = 'emergency',
  EDUCATIONAL = 'educational',
  MEDICAL = 'medical',
  HOUSING = 'housing',
  PERSONAL = 'personal',
  SALARY_ADVANCE = 'salary_advance'
}

export enum Department {
  OPERATIONS = 'operations',
  MAINTENANCE = 'maintenance',
  ADMINISTRATION = 'administration',
  FINANCE = 'finance',
  HR = 'hr'
}

export interface Employee {
  employee_id: string;
  name: string;
  job_title: string;
  department: string;
  employee_number: string;
  monthly_salary?: number; // Changed to optional
  hire_date: string;
}

export interface LoanRequest {
  id?: string;
  loan_request_id?: string;
  employee_id: string;
  employee: Employee;
  loan_type: string;
  requested_amount: number;
  purpose: string;
  justification: string;
  repayment_terms: number;
  monthly_deduction: number;
  status?: string;
  
  // Emergency contact fields
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  
  // Audit fields
  application_date?: string;
  submitted_by?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  is_deleted?: boolean;
}

interface AddLoanRequestProps {
  onClose: () => void;
  onSubmit: (loanData: any) => Promise<void>;
  employees?: Employee[];
  editData?: any;
  isEditMode?: boolean;
}

const AddLoanRequestModal: React.FC<AddLoanRequestProps> = ({ 
  onClose, 
  onSubmit, 
  employees = [],
  editData,
  isEditMode = false
}) => {
  const [formData, setFormData] = useState({
    employee_id: editData?.employee_id || '',
    loan_type: editData?.loan_type || LoanType.PERSONAL,
    requested_amount: editData?.requested_amount?.toString() || '',
    purpose: editData?.purpose || '',
    justification: editData?.justification || '',
    emergency_contact_name: editData?.emergency_contact_name || '',
    emergency_contact_phone: editData?.emergency_contact_phone || '',
    emergency_contact_relationship: editData?.emergency_contact_relationship || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Configuration State (now mandatory)
  const [paymentScheduleType, setPaymentScheduleType] = useState<PaymentScheduleType>(PaymentScheduleType.MONTHLY);
  const [paymentAmountType, setPaymentAmountType] = useState<PaymentAmountType>(PaymentAmountType.FIXED);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.PESO);
  const [fixedPaymentAmount, setFixedPaymentAmount] = useState<string>('');
  const [paymentStartDate, setPaymentStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentDuration, setPaymentDuration] = useState<string>('');
  const [manualDuration, setManualDuration] = useState<string>(''); // User-entered duration when locked
  const [customPayments, setCustomPayments] = useState<PaymentEntry[]>([]);
  const [generatedPayments, setGeneratedPayments] = useState<PaymentEntry[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Track which field was last edited for smart auto-calculation
  const [lastEditedField, setLastEditedField] = useState<'amount' | 'duration'>('amount');
  
  // Debounced values to prevent lag during typing
  const debouncedPaymentAmount = useDebounce(fixedPaymentAmount, 2000);
  const debouncedStartDate = useDebounce(paymentStartDate, 500);
  const debouncedManualDuration = useDebounce(manualDuration, 1500);

  // Sample employees if none provided
  const sampleEmployees: Employee[] = employees.length > 0 ? employees : [
    {
      employee_id: "EMP-001",
      name: "Juan Dela Cruz",
      job_title: "Bus Driver",
      department: Department.OPERATIONS,
      employee_number: "20240001",
      monthly_salary: 25000.00,
      hire_date: "2022-03-15"
    },
    {
      employee_id: "EMP-002",
      name: "Maria Santos",
      job_title: "Administrative Assistant",
      department: Department.ADMINISTRATION,
      employee_number: "20240002",
      monthly_salary: 22000.00,
      hire_date: "2021-08-20"
    },
    {
      employee_id: "EMP-003",
      name: "Carlos Rodriguez",
      job_title: "Mechanic",
      department: Department.MAINTENANCE,
      employee_number: "20240003",
      monthly_salary: 28000.00,
      hire_date: "2020-11-10"
    }
  ];

  const selectedEmployee = sampleEmployees.find(emp => emp.employee_id === formData.employee_id);

  /**
   * Calculate duration from amount (when amount is locked)
   * Returns 0 if inputs are invalid
   */
  const calculateDurationFromAmount = (): number => {
    const loanAmount = parseFloat(formData.requested_amount);
    const paymentAmount = parseFloat(debouncedPaymentAmount);
    
    if (!loanAmount || !paymentAmount || paymentAmount <= 0) {
      return 0;
    }
    
    // Convert percentage to peso if needed
    const amountInPeso = paymentMode === PaymentMode.PERCENTAGE
      ? convertPercentageToPeso(paymentAmount, loanAmount)
      : paymentAmount;
    
    // Round up to ensure full loan coverage
    return Math.ceil(loanAmount / amountInPeso);
  };

  /**
   * Calculate amount from duration (when duration is locked)
   * Returns 0 if inputs are invalid
   */
  const calculateAmountFromDuration = (): number => {
    const loanAmount = parseFloat(formData.requested_amount);
    const duration = parseInt(debouncedManualDuration);
    
    if (!loanAmount || !duration || duration <= 0) {
      return 0;
    }
    
    // Divide loan evenly across duration
    const amountInPeso = loanAmount / duration;
    
    // Convert to percentage if in percentage mode
    return paymentMode === PaymentMode.PERCENTAGE
      ? convertPesoToPercentage(amountInPeso, loanAmount)
      : amountInPeso;
  };

  /**
   * Generate balanced payment schedule that auto-adjusts final payment
   * Always stores amounts in PESO internally for accuracy
   * Percentage mode is for display only
   */
  const generateBalancedSchedule = (): PaymentEntry[] => {
    const loanAmount = parseFloat(formData.requested_amount);
    let paymentAmountInput: number;
    let duration: number;
    
    // Determine calculation direction based on last edited field
    if (lastEditedField === 'amount') {
      paymentAmountInput = parseFloat(debouncedPaymentAmount);
      duration = calculateDurationFromAmount();
    } else {
      duration = parseInt(debouncedManualDuration);
      paymentAmountInput = calculateAmountFromDuration();
    }
    
    if (!loanAmount || !paymentAmountInput || duration === 0) {
      return [];
    }
    
    // Convert to peso for internal calculations (always store in peso)
    const paymentAmountInPeso = paymentMode === PaymentMode.PERCENTAGE
      ? convertPercentageToPeso(paymentAmountInput, loanAmount)
      : paymentAmountInput;
    
    const payments: PaymentEntry[] = [];
    let remainingBalance = loanAmount;
    
    for (let i = 0; i < duration; i++) {
      const isLastPayment = i === duration - 1;
      
      // Calculate amount in peso (always)
      let amountInPeso: number;
      if (isLastPayment) {
        // Final payment takes exact remaining balance
        amountInPeso = remainingBalance;
      } else {
        // Regular payment, but don't exceed remaining balance
        amountInPeso = Math.min(paymentAmountInPeso, remainingBalance);
      }
      
      // Calculate payment date based on schedule type
      let paymentDate = new Date(debouncedStartDate);
      if (paymentScheduleType === PaymentScheduleType.DAILY) {
        paymentDate.setDate(paymentDate.getDate() + i);
      } else if (paymentScheduleType === PaymentScheduleType.WEEKLY) {
        paymentDate.setDate(paymentDate.getDate() + (i * 7));
      } else if (paymentScheduleType === PaymentScheduleType.MONTHLY) {
        paymentDate.setMonth(paymentDate.getMonth() + i);
      }
      
      // ✅ ALWAYS store in peso for accuracy (convert percentage to peso)
      // Display mode is handled separately in the UI
      payments.push({
        id: `payment-${i + 1}`,
        payment_date: paymentDate.toISOString().split('T')[0],
        amount: parseFloat(amountInPeso.toFixed(2)), // ✅ Store in peso always
        mode: paymentMode, // ✅ Store display mode for reference
        status: PaymentStatus.PENDING
      });
      
      remainingBalance -= amountInPeso;
    }
    
    return payments;
  };

  // Auto-generate balanced payments when debounced values change
  useEffect(() => {
    if (paymentScheduleType !== PaymentScheduleType.CUSTOM && 
        paymentAmountType === PaymentAmountType.FIXED &&
        formData.requested_amount) {
      
      const loanAmount = parseFloat(formData.requested_amount);
      
      if (!isNaN(loanAmount) && loanAmount > 0) {
        
        // If amount was last edited, calculate duration
        if (lastEditedField === 'amount' && debouncedPaymentAmount) {
          const amount = parseFloat(debouncedPaymentAmount);
          if (!isNaN(amount) && amount > 0) {
            const calculatedDuration = calculateDurationFromAmount();
            setPaymentDuration(calculatedDuration.toString());
            setManualDuration(calculatedDuration.toString());
            
            if (debouncedStartDate) {
              const balancedPayments = generateBalancedSchedule();
              setGeneratedPayments(balancedPayments);
              if (balancedPayments.length > 0) {
                setValidationErrors([]);
              }
            }
          }
        }
        
        // If duration was last edited, calculate amount
        else if (lastEditedField === 'duration' && debouncedManualDuration) {
          const duration = parseInt(debouncedManualDuration);
          if (!isNaN(duration) && duration > 0) {
            const calculatedAmount = calculateAmountFromDuration();
            setFixedPaymentAmount(calculatedAmount.toFixed(2));
            
            if (debouncedStartDate) {
              const balancedPayments = generateBalancedSchedule();
              setGeneratedPayments(balancedPayments);
              if (balancedPayments.length > 0) {
                setValidationErrors([]);
              }
            }
          }
        }
      }
    }
  }, [
    lastEditedField,
    debouncedPaymentAmount,
    debouncedManualDuration,
    debouncedStartDate,
    paymentScheduleType,
    paymentAmountType,
    paymentMode,
    formData.requested_amount
  ]);

  /**
   * Get current active payment schedule
   */
  const getCurrentPayments = (): PaymentEntry[] => {
    if (paymentScheduleType === PaymentScheduleType.CUSTOM || paymentAmountType === PaymentAmountType.CUSTOM) {
      return customPayments;
    }
    return generatedPayments;
  };

  /**
   * Calculate remaining balance for custom schedules
   */
  const getRemainingBalance = (): number => {
    const loanAmount = parseFloat(formData.requested_amount) || 0;
    // ✅ Amounts are ALWAYS stored in peso, just sum them directly
    const totalPaid = customPayments.reduce((sum, p) => sum + p.amount, 0);
    return loanAmount - totalPaid;
  };

  /**
   * Validate payment configuration with enhanced checks
   */
  const validatePaymentConfiguration = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const loanAmount = parseFloat(formData.requested_amount);
    
    if (!loanAmount || loanAmount <= 0) {
      errors.push('Please enter a valid loan amount first');
      return { valid: false, errors };
    }

    // For fixed schedules
    if (paymentScheduleType !== PaymentScheduleType.CUSTOM && paymentAmountType === PaymentAmountType.FIXED) {
      const paymentAmount = parseFloat(fixedPaymentAmount);
      
      if (!paymentAmount || paymentAmount <= 0) {
        errors.push('Payment amount must be greater than zero');
      } else {
        const duration = calculateDurationFromAmount();
        
        // Check for excessive payments
        const maxPayments = paymentScheduleType === PaymentScheduleType.DAILY ? 365 
          : paymentScheduleType === PaymentScheduleType.WEEKLY ? 104 
          : 60; // monthly max
        
        if (duration > maxPayments) {
          errors.push(`Payment amount too small. Would create ${duration} payments (max: ${maxPayments})`);
        }
        
        if (duration === 0) {
          errors.push('Invalid payment configuration');
        }
      }
      
      if (!paymentStartDate) {
        errors.push('Please select a start date');
      }
    }

    // For custom schedules
    if (paymentScheduleType === PaymentScheduleType.CUSTOM || paymentAmountType === PaymentAmountType.CUSTOM) {
      if (customPayments.length === 0) {
        errors.push('Please add at least one payment entry');
      } else {
        const remaining = getRemainingBalance();
        if (Math.abs(remaining) > 0.01) { // Allow 1 cent tolerance
          if (remaining > 0) {
            errors.push(`Payment total is insufficient. Remaining: ${formatCurrency(remaining)}`);
          } else {
            errors.push(`Payment total exceeds loan amount by ${formatCurrency(Math.abs(remaining))}`);
          }
        }
        
        // Check for invalid amounts
        const invalidPayments = customPayments.filter(p => p.amount <= 0);
        if (invalidPayments.length > 0) {
          errors.push('All payment amounts must be greater than zero');
        }
        
        // Check for duplicate dates
        const dates = customPayments.map(p => p.payment_date);
        const hasDuplicates = dates.some((date, index) => dates.indexOf(date) !== index);
        if (hasDuplicates) {
          errors.push('Duplicate payment dates found');
        }
      }
    }

    return { valid: errors.length === 0, errors };
  };

  // Payment handlers
  const handleTogglePaymentMode = () => {
    const newMode = paymentMode === PaymentMode.PESO ? PaymentMode.PERCENTAGE : PaymentMode.PESO;
    setPaymentMode(newMode);
    
    const principal = parseFloat(formData.requested_amount) || 0;
    
    // Convert fixed amount
    if (fixedPaymentAmount) {
      const amount = parseFloat(fixedPaymentAmount);
      if (!isNaN(amount) && principal > 0) {
        const converted = newMode === PaymentMode.PERCENTAGE
          ? convertPesoToPercentage(amount, principal)
          : convertPercentageToPeso(amount, principal);
        setFixedPaymentAmount(converted.toFixed(2));
      }
    }
    
    // Convert custom payments
    setCustomPayments(customPayments.map(p => ({
      ...p,
      mode: newMode,
      amount: principal > 0
        ? (newMode === PaymentMode.PERCENTAGE
          ? convertPesoToPercentage(p.amount, principal)
          : convertPercentageToPeso(p.amount, principal))
        : p.amount
    })));
  };

  const handleAddCustomPayment = () => {
    const newPayment: PaymentEntry = {
      id: `custom-${Date.now()}`,
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0,
      mode: paymentMode,
      status: PaymentStatus.PENDING
    };
    setCustomPayments([...customPayments, newPayment]);
  };

  const handleRemoveCustomPayment = (id: string) => {
    setCustomPayments(customPayments.filter(p => p.id !== id));
  };

  const handleUpdateCustomPayment = (id: string, field: keyof PaymentEntry, value: any) => {
    setCustomPayments(customPayments.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }

    if (!formData.requested_amount || parseFloat(formData.requested_amount) <= 0) {
      newErrors.requested_amount = 'Please enter a valid amount';
    } 

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }

    if (!formData.justification.trim()) {
      newErrors.justification = 'Justification is required';
    }

    // Emergency contact validation for emergency loans
    if (formData.loan_type === LoanType.EMERGENCY) {
      if (!formData.emergency_contact_name.trim()) {
        newErrors.emergency_contact_name = 'Emergency contact name is required';
      }
      if (!formData.emergency_contact_phone.trim()) {
        newErrors.emergency_contact_phone = 'Emergency contact phone is required';
      }
      if (!formData.emergency_contact_relationship.trim()) {
        newErrors.emergency_contact_relationship = 'Emergency contact relationship is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Validate payment configuration (now mandatory)
    const paymentValidation = validatePaymentConfiguration();
    if (!paymentValidation.valid) {
      setValidationErrors(paymentValidation.errors);
      showError(
        `Payment configuration errors:\n${paymentValidation.errors.join('\n')}`, 
        'Validation Error'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      
      const currentPayments = getCurrentPayments();
      const principal = parseFloat(formData.requested_amount) || 0;
      // ✅ Amounts are ALWAYS stored in peso, just sum them directly
      const totalAmount = currentPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalPercentage = principal > 0 ? (totalAmount / principal) * 100 : 0;
      
      // Calculate repayment terms based on payment schedule
      const repaymentTermsMonths = paymentScheduleType === PaymentScheduleType.MONTHLY
        ? currentPayments.length
        : Math.ceil(currentPayments.length / (paymentScheduleType === PaymentScheduleType.WEEKLY ? 4 : 30));
      
      const paymentConfig: PaymentConfiguration = {
        schedule_type: paymentScheduleType,
        amount_type: paymentAmountType,
        payment_mode: paymentMode,
        fixed_amount: fixedPaymentAmount ? parseFloat(fixedPaymentAmount) : undefined,
        start_date: paymentStartDate || undefined,
        duration: paymentDuration ? parseInt(paymentDuration) : undefined,
        custom_payments: paymentScheduleType === PaymentScheduleType.CUSTOM || paymentAmountType === PaymentAmountType.CUSTOM
          ? customPayments
          : undefined,
        total_amount: totalAmount,
        total_percentage: totalPercentage
      };
      
      // Calculate monthly deduction (average payment per month)
      const monthlyDeduction = repaymentTermsMonths > 0 
        ? totalAmount / repaymentTermsMonths 
        : 0;

      const loanData: any = {
        ...formData,
        requested_amount: parseFloat(formData.requested_amount),
        repayment_terms: repaymentTermsMonths, // Derived from payment schedule
        monthly_deduction: parseFloat(monthlyDeduction.toFixed(2)),
        employee: selectedEmployee,
        application_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        paymentConfiguration: paymentConfig,
        paymentSchedule: currentPayments
      };

      console.log('📋 Submitting Loan Data:', loanData);
      console.log('💰 Payment Configuration:', loanData.paymentConfiguration);
      console.log('📅 Payment Schedule:', loanData.paymentSchedule);
      
      await onSubmit(loanData);
      showSuccess('Loan request has been created successfully', 'Success');
      onClose();
    } catch (error) {
      console.error('Error creating loan request:', error);
      showError('Failed to create loan request. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContainer addLoanModal">
        <ModalHeader 
          title={isEditMode ? "Edit Loan Request" : "Add New Loan Request"} 
          onClose={onClose} 
          showDateTime={true} 
        />

        <div className="modalContent">
          <form onSubmit={handleSubmit}>
            <div className="formFieldsHorizontal">
              <div className="formInputs">
                
                {/* Employee Selection */}
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="employee_id">
                      Employee <span className="requiredTags">*</span>
                    </label>
                    <select
                      id="employee_id"
                      name="employee_id"
                      value={formData.employee_id}
                      onChange={handleInputChange}
                      className={errors.employee_id ? 'input-error' : ''}
                    >
                      <option value="">Select Employee</option>
                      {sampleEmployees.map(employee => (
                        <option key={employee.employee_id} value={employee.employee_id}>
                          {employee.name} - {employee.employee_number} ({employee.job_title})
                        </option>
                      ))}
                    </select>
                    {errors.employee_id && <div className="error-message">{errors.employee_id}</div>}
                  </div>

                  <div className="formField">
                    <label htmlFor="loan_type">
                      Loan Type <span className="requiredTags">*</span>
                    </label>
                    <select
                      id="loan_type"
                      name="loan_type"
                      value={formData.loan_type}
                      onChange={handleInputChange}
                    >
                      <option value={LoanType.PERSONAL}>Personal</option>
                      <option value={LoanType.EMERGENCY}>Emergency</option>
                      <option value={LoanType.EDUCATIONAL}>Educational</option>
                      <option value={LoanType.MEDICAL}>Medical</option>
                      <option value={LoanType.HOUSING}>Housing</option>
                      <option value={LoanType.SALARY_ADVANCE}>Salary Advance</option>
                    </select>
                  </div>
                </div>

                {/* Employee Details Display */}
                {selectedEmployee && (
                  <div className="employee-details-box">
                    <h4>Employee Details</h4>
                    <div className="employee-details">
                      <div className="detail-item">
                        <strong>Department:</strong> {selectedEmployee.department.charAt(0).toUpperCase() + selectedEmployee.department.slice(1)}
                      </div>
                      <div className="detail-item">
                        <strong>Monthly Salary:</strong> ₱{(selectedEmployee.monthly_salary ?? 0).toLocaleString()}
                      </div>
                      <div className="detail-item">
                        <strong>Hire Date:</strong> {new Date(selectedEmployee.hire_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Loan Details */}
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="requested_amount">
                      Requested Amount <span className="requiredTags">*</span>
                    </label>
                    <input
                      type="number"
                      id="requested_amount"
                      name="requested_amount"
                      value={formData.requested_amount}
                      onChange={handleInputChange}
                      placeholder="Enter amount"
                      min="1"
                      className={errors.requested_amount ? 'input-error' : ''}
                    />
                    {errors.requested_amount && <div className="error-message">{errors.requested_amount}</div>}
                  </div>
                </div>

                

                {/* Payment Schedule Configuration (Mandatory) - Only show if loan amount is entered */}
                {formData.requested_amount && parseFloat(formData.requested_amount) > 0 ? (
                  <div className="payment-configuration-section">
                    <h4>Payment Schedule Configuration</h4>

                    {/* Mode Toggle */}
                    <div className="mode-toggle-container">
                      <span className="mode-label">Amount Mode:</span>
                      <div className="mode-toggle">
                        <button
                          type="button"
                          className={`mode-button ${paymentMode === PaymentMode.PESO ? 'active' : ''}`}
                          onClick={() => paymentMode !== PaymentMode.PESO && handleTogglePaymentMode()}
                        >
                          Peso (₱)
                        </button>
                        <button
                          type="button"
                          className={`mode-button ${paymentMode === PaymentMode.PERCENTAGE ? 'active' : ''}`}
                          onClick={() => paymentMode !== PaymentMode.PERCENTAGE && handleTogglePaymentMode()}
                        >
                          Percentage (%)
                        </button>
                      </div>
                    </div>

                    {/* Schedule Configuration */}
                    <div className="formRow">
                      <div className="formField">
                        <label htmlFor="paymentScheduleType">Schedule Type</label>
                        <select
                          id="paymentScheduleType"
                          value={paymentScheduleType}
                          onChange={(e) => setPaymentScheduleType(e.target.value as PaymentScheduleType)}
                        >
                          <option value={PaymentScheduleType.DAILY}>Daily</option>
                          <option value={PaymentScheduleType.WEEKLY}>Weekly</option>
                          <option value={PaymentScheduleType.MONTHLY}>Monthly</option>
                          <option value={PaymentScheduleType.CUSTOM}>Custom</option>
                        </select>
                      </div>

                      <div className="formField">
                        <label htmlFor="paymentAmountType">Amount Type</label>
                        <select
                          id="paymentAmountType"
                          value={paymentAmountType}
                          onChange={(e) => setPaymentAmountType(e.target.value as PaymentAmountType)}
                        >
                          <option value={PaymentAmountType.FIXED}>Fixed Amount</option>
                          <option value={PaymentAmountType.CUSTOM}>Custom Amounts</option>
                        </select>
                      </div>
                    </div>

                    {/* Fixed Schedule Inputs */}
                    {paymentScheduleType !== PaymentScheduleType.CUSTOM && paymentAmountType === PaymentAmountType.FIXED && (
                      <div className="fixed-schedule-inputs">
                        <div className="formRow">
                          <div className="formField">
                            <label htmlFor="fixedPaymentAmount">
                              Payment Amount {paymentMode === PaymentMode.PERCENTAGE && '(%)'} <span className="requiredTags">*</span>
                              {fixedPaymentAmount !== debouncedPaymentAmount && (
                                <span className="calculating-indicator"> Calculating...</span>
                              )}
                            </label>
                            <input
                              type="number"
                              id="fixedPaymentAmount"
                              value={fixedPaymentAmount}
                              onChange={(e) => {
                                setFixedPaymentAmount(e.target.value);
                                setLastEditedField('amount');
                                if (validationErrors.length > 0) {
                                  setValidationErrors([]);
                                }
                              }}
                              onFocus={() => setLastEditedField('amount')}
                              placeholder={paymentMode === PaymentMode.PESO ? "e.g., 5000" : "e.g., 10"}
                              step={paymentMode === PaymentMode.PESO ? "0.01" : "0.1"}
                              min="0"
                              className={validationErrors.some(e => e.includes('Payment amount')) ? 'payment-validation-error' : ''}
                            />
                            {validationErrors.some(e => e.includes('Payment amount')) && (
                              <div className="payment-validation-message">
                                {validationErrors.find(e => e.includes('Payment amount'))}
                              </div>
                            )}
                          </div>

                          <div className="formField">
                            <label htmlFor="paymentStartDate">Start Date <span className="requiredTags">*</span></label>
                            <input
                              type="date"
                              id="paymentStartDate"
                              value={paymentStartDate}
                              onChange={(e) => {
                                setPaymentStartDate(e.target.value);
                                if (validationErrors.length > 0) {
                                  setValidationErrors([]);
                                }
                              }}
                              className={validationErrors.some(e => e.includes('start date')) ? 'payment-validation-error' : ''}
                            />
                          </div>

                          <div className="formField">
                            <label htmlFor="paymentDuration">
                              Duration ({paymentScheduleType === PaymentScheduleType.DAILY ? 'days' : 
                                         paymentScheduleType === PaymentScheduleType.WEEKLY ? 'weeks' : 'months'})
                              <span className="requiredTags">*</span>
                              {manualDuration !== debouncedManualDuration && (
                                <span className="calculating-indicator"> Calculating...</span>
                              )}
                            </label>
                            <input
                              type="number"
                              id="paymentDuration"
                              value={lastEditedField === 'duration' ? manualDuration : paymentDuration}
                              onChange={(e) => {
                                setManualDuration(e.target.value);
                                setPaymentDuration(e.target.value);
                                setLastEditedField('duration');
                                if (validationErrors.length > 0) {
                                  setValidationErrors([]);
                                }
                              }}
                              onFocus={() => setLastEditedField('duration')}
                              placeholder="Enter duration"
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Payment Entries */}
                    {(paymentScheduleType === PaymentScheduleType.CUSTOM || paymentAmountType === PaymentAmountType.CUSTOM) && (
                      <div className="custom-payments-section">
                        <div className="custom-payments-header">
                          <h5>Custom Payment Entries</h5>
                          <button 
                            type="button" 
                            className="add-payment-button"
                            onClick={handleAddCustomPayment}
                          >
                            + Add Payment
                          </button>
                        </div>

                        <div className="custom-payments-list">
                          {customPayments.map((payment, index) => (
                            <div key={payment.id} className="custom-payment-entry">
                              <span className="payment-number">{index + 1}</span>
                              <input
                                type="date"
                                value={payment.payment_date}
                                onChange={(e) => handleUpdateCustomPayment(payment.id, 'payment_date', e.target.value)}
                              />
                              <input
                                type="number"
                                value={payment.amount}
                                onChange={(e) => handleUpdateCustomPayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder={paymentMode === PaymentMode.PESO ? "Amount (₱)" : "Percentage (%)"}
                                step={paymentMode === PaymentMode.PESO ? "0.01" : "0.1"}
                                min="0"
                              />
                              <button
                                type="button"
                                className="remove-payment-button"
                                onClick={() => handleRemoveCustomPayment(payment.id)}
                                title="Remove payment"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {customPayments.length === 0 && (
                            <div className="no-payments-message">
                              No custom payments added. Click "Add Payment" to start.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment Summary Table */}
                    {getCurrentPayments().length > 0 && (
                      <div className="payment-summary-section">
                        <h5>Payment Summary</h5>
                        <div className="payment-summary-table">
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Payment Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getCurrentPayments().map((payment, index) => {
                                const principal = parseFloat(formData.requested_amount) || 0;
                                
                                // ✅ Payment amount is always stored in peso
                                // Convert to percentage for display only
                                const amountInPeso = payment.amount;
                                const amountInPercentage = principal > 0 
                                  ? (amountInPeso / principal * 100).toFixed(2)
                                  : '0.00';
                                
                                return (
                                  <tr key={payment.id}>
                                    <td>{index + 1}</td>
                                    <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                                    <td>
                                      {paymentMode === PaymentMode.PESO 
                                        ? formatCurrency(amountInPeso)
                                        : `${amountInPercentage}% (${formatCurrency(amountInPeso)})`
                                      }
                                    </td>
                                    <td>
                                      <span className={`status-badge status-${payment.status.toLowerCase()}`}>
                                        {payment.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={2}><strong>Total</strong></td>
                                <td>
                                  <strong>
                                    {(() => {
                                      const principal = parseFloat(formData.requested_amount) || 0;
                                      // ✅ Amounts are ALWAYS stored in peso, just sum them directly
                                      const totalPeso = getCurrentPayments().reduce((sum, p) => sum + p.amount, 0);
                                      
                                      if (paymentMode === PaymentMode.PESO) {
                                        return formatCurrency(totalPeso);
                                      } else {
                                        // ✅ Calculate percentage correctly from peso total
                                        const totalPercentage = principal > 0 
                                          ? (totalPeso / principal * 100).toFixed(2)
                                          : '0.00';
                                        return `${totalPercentage}% (${formatCurrency(totalPeso)})`;
                                      }
                                    })()}
                                  </strong>
                                </td>
                                <td></td>
                              </tr>
                              {formData.requested_amount && (
                                <tr>
                                  <td colSpan={2}><strong>Loan Principal</strong></td>
                                  <td><strong>{formatCurrency(parseFloat(formData.requested_amount))}</strong></td>
                                  <td></td>
                                </tr>
                              )}
                            </tfoot>
                          </table>
                        </div>

                        {/* Remaining Balance for Custom Schedules */}
                        {(paymentScheduleType === PaymentScheduleType.CUSTOM || paymentAmountType === PaymentAmountType.CUSTOM) && (
                          <div className={`remaining-balance-display ${
                            Math.abs(getRemainingBalance()) < 0.01 ? 'balanced' : 
                            getRemainingBalance() < 0 ? 'over' : ''
                          }`}>
                            {Math.abs(getRemainingBalance()) < 0.01 ? (
                              <>✓ Balanced: Total matches loan amount</>
                            ) : getRemainingBalance() > 0 ? (
                              <>⚠ Remaining Balance: {formatCurrency(getRemainingBalance())}</>
                            ) : (
                              <>⚠ Over Payment: {formatCurrency(Math.abs(getRemainingBalance()))}</>
                            )}
                          </div>
                        )}

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                          <div className="validation-warning">
                            <strong>⚠ Validation Issues:</strong>
                            <ul>
                              {validationErrors.map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="payment-config-info-box" style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: 'var(--primary-color)',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem'
                  }}>
                    <p style={{margin: 0, color: '#000000'}}>
                      <strong style={{color: 'var(--primary-color)'}}>ℹ️ Payment Schedule Configuration</strong><br/>
                      Please enter the requested loan amount above to configure the payment schedule.
                    </p>
                  </div>
                )}

                {/* Purpose and Justification */}
                <div className="formField full-width">
                  <label htmlFor="purpose">
                    Purpose <span className="requiredTags">*</span>
                  </label>
                  <input
                    type="text"
                    id="purpose"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    placeholder="Brief description of loan purpose"
                    className={errors.purpose ? 'input-error' : ''}
                  />
                  {errors.purpose && <div className="error-message">{errors.purpose}</div>}
                </div>

                <div className="formField full-width">
                  <label htmlFor="justification">
                    Detailed Justification <span className="requiredTags">*</span>
                  </label>
                  <textarea
                    id="justification"
                    name="justification"
                    value={formData.justification}
                    onChange={handleInputChange}
                    placeholder="Provide detailed justification for the loan request..."
                    rows={4}
                    className={errors.justification ? 'input-error' : ''}
                  />
                  {errors.justification && <div className="error-message">{errors.justification}</div>}
                </div>

                {/* Emergency Contact (only for emergency loans) */}
                {formData.loan_type === LoanType.EMERGENCY && (
                  <div className="emergency-contact-section">
                    <h4>Emergency Contact Information</h4>
                    <div className="formRow">
                      <div className="formField">
                        <label htmlFor="emergency_contact_name">
                          Contact Name <span className="requiredTags">*</span>
                        </label>
                        <input
                          type="text"
                          id="emergency_contact_name"
                          name="emergency_contact_name"
                          value={formData.emergency_contact_name}
                          onChange={handleInputChange}
                          placeholder="Emergency contact name"
                          className={errors.emergency_contact_name ? 'input-error' : ''}
                        />
                        {errors.emergency_contact_name && <div className="error-message">{errors.emergency_contact_name}</div>}
                      </div>

                      <div className="formField">
                        <label htmlFor="emergency_contact_phone">
                          Contact Phone <span className="requiredTags">*</span>
                        </label>
                        <input
                          type="tel"
                          id="emergency_contact_phone"
                          name="emergency_contact_phone"
                          value={formData.emergency_contact_phone}
                          onChange={handleInputChange}
                          placeholder="Emergency contact phone"
                          className={errors.emergency_contact_phone ? 'input-error' : ''}
                        />
                        {errors.emergency_contact_phone && <div className="error-message">{errors.emergency_contact_phone}</div>}
                      </div>
                    </div>

                    <div className="formField">
                      <label htmlFor="emergency_contact_relationship">
                        Relationship <span className="requiredTags">*</span>
                      </label>
                      <select
                        id="emergency_contact_relationship"
                        name="emergency_contact_relationship"
                        value={formData.emergency_contact_relationship}
                        onChange={handleInputChange}
                        className={errors.emergency_contact_relationship ? 'input-error' : ''}
                      >
                        <option value="">Select Relationship</option>
                        <option value="spouse">Spouse</option>
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                        <option value="sibling">Sibling</option>
                        <option value="relative">Relative</option>
                        <option value="friend">Friend</option>
                      </select>
                      {errors.emergency_contact_relationship && <div className="error-message">{errors.emergency_contact_relationship}</div>}
                    </div>
                  </div>
                )}

                {/* Terms and Conditions */}
                <div className="info-box">
                  <h4>Loan Terms and Conditions</h4>
                  <ul>
                    <li>Maximum loan amount is 6 times the monthly salary</li>
                    <li>Monthly deductions will be automatically processed from payroll</li>
                    <li>Early payment is allowed without penalty</li>
                    <li>Approval is subject to company policy and financial assessment</li>
                    <li>Interest rates and processing fees may apply as per company policy</li>
                  </ul>
                </div>

              </div>
            </div>

            <div className="modalButtons">
              <button 
                type="button" 
                className="cancelButton"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="addButton"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <i className={isEditMode ? "ri-save-line" : "ri-add-line"}></i>
                    {isEditMode ? 'Update Request' : 'Create Loan Request'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddLoanRequestModal;