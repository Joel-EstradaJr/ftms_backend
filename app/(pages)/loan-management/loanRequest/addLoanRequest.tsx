'use client';

import React, { useState } from 'react';
import ModalHeader from '../../../Components/ModalHeader';
import { showSuccess, showError } from '../../../utility/Alerts';

//@ts-ignore
import '../../../styles/loan-management/addLoanRequest.css';

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
    repayment_terms: editData?.repayment_terms?.toString() || '12',
    emergency_contact_name: editData?.emergency_contact_name || '',
    emergency_contact_phone: editData?.emergency_contact_phone || '',
    emergency_contact_relationship: editData?.emergency_contact_relationship || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const maxLoanAmount = selectedEmployee ? ((selectedEmployee.monthly_salary ?? 0) * 6) : 0; // 6 months salary max
  const monthlyDeduction = formData.requested_amount && formData.repayment_terms 
    ? parseFloat(formData.requested_amount) / parseInt(formData.repayment_terms)
    : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }

    if (!formData.requested_amount || parseFloat(formData.requested_amount) <= 0) {
      newErrors.requested_amount = 'Please enter a valid amount';
    } else if (selectedEmployee && parseFloat(formData.requested_amount) > maxLoanAmount) {
      newErrors.requested_amount = `Amount cannot exceed ₱${maxLoanAmount.toLocaleString()} (6 months salary)`;
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }

    if (!formData.justification.trim()) {
      newErrors.justification = 'Justification is required';
    }

    if (!formData.repayment_terms || parseInt(formData.repayment_terms) < 1) {
      newErrors.repayment_terms = 'Please select repayment terms';
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

    try {
      setIsSubmitting(true);
      
      const loanData = {
        ...formData,
        requested_amount: parseFloat(formData.requested_amount),
        repayment_terms: parseInt(formData.repayment_terms),
        monthly_deduction: monthlyDeduction,
        employee: selectedEmployee,
        application_date: new Date().toISOString().split('T')[0],
        status: 'draft'
      };

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

        <form onSubmit={handleSubmit}>
          <div className="modalContent">
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
                        <strong>Maximum Loan Amount:</strong> ₱{maxLoanAmount.toLocaleString()} (6 months salary)
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
                      max={maxLoanAmount}
                      step="0.01"
                      className={errors.requested_amount ? 'input-error' : ''}
                    />
                    {errors.requested_amount && <div className="error-message">{errors.requested_amount}</div>}
                  </div>

                  <div className="formField">
                    <label htmlFor="repayment_terms">
                      Repayment Terms <span className="requiredTags">*</span>
                    </label>
                    <select
                      id="repayment_terms"
                      name="repayment_terms"
                      value={formData.repayment_terms}
                      onChange={handleInputChange}
                      className={errors.repayment_terms ? 'input-error' : ''}
                    >
                      <option value="6">6 months</option>
                      <option value="12">12 months</option>
                      <option value="18">18 months</option>
                      <option value="24">24 months</option>
                      <option value="36">36 months</option>
                    </select>
                    {errors.repayment_terms && <div className="error-message">{errors.repayment_terms}</div>}
                  </div>
                </div>

                {/* Monthly Deduction Display */}
                {monthlyDeduction > 0 && (
                  <div className="calculation-box">
                    <strong>Monthly Deduction: ₱{monthlyDeduction.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}</strong>
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
  );
};

export default AddLoanRequestModal;