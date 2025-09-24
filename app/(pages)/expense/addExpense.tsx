// AddExpenseModal.tsx
'use client';

//---------------------IMPORTS HERE----------------------//
import React, { useState, useEffect } from 'react';
import '../../styles/expense/addExpense.css';
import { formatDate } from '../../utility/dateFormatter';
import { showSuccess, showError, showConfirmation } from '../../utility/Alerts';
import { validateField, isValidAmount, ValidationRule } from "../../utility/validation";
import { formatDisplayText } from '../../utils/formatting';
import BusSelector from '../../Components/busSelector';
import ModalHeader from '../../Components/ModalHeader';
import type { Assignment } from '@/lib/operations/assignments';
import { fetchEmployeesForReimbursementClient } from '@/lib/supabase/employees';

//---------------------DECLARATIONS HERE----------------------//
// Uncomment and use these types
// type ExpenseData = {
//   expense_id: string;
//   date: string;
//   department_from: string;
//   category: string;
//   total_amount: number;
// };

// Employee types based on Supabase tables
type Employee = {
  employee_id: string;
  name: string;
  job_title: string;
  department?: string;
  phone?: string;
};

type AddExpenseProps = {
  onClose: () => void;
  onAddExpense: (formData: {
    category?: string;
    category_id?: string;
    assignment_id?: string;
    total_amount: number;
    expense_date: string;
    created_by: string;
    payment_method: string;
    employee_id?: string;
    employee_name?: string;
    driver_reimbursement?: number;
    conductor_reimbursement?: number;
  }) => void;
  assignments: Assignment[];
  currentUser: string;
};

type FieldName = 'category' | 'assignment_id' | 'total_amount' | 'expense_date';

const AddExpense: React.FC<AddExpenseProps> = ({ 
  onClose, 
  onAddExpense,
  assignments,
  currentUser 
}) => {
  const [showBusSelector, setShowBusSelector] = useState(false);
  const [source] = useState<'operations'>('operations');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [errors, setErrors] = useState<Record<FieldName, string[]>>({
    category: [],
    assignment_id: [],
    total_amount: [],
    expense_date: [],
  });

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'REIMBURSEMENT'>('CASH');

  const [formData, setFormData] = useState({
    category: 'Fuel',
    category_id: '',
    assignment_id: '',
    total_amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    created_by: currentUser,
  });

  // New state for driver/conductor reimbursement amounts
  const [driverReimb, setDriverReimb] = useState('');
  const [conductorReimb, setConductorReimb] = useState('');
  const [reimbError, setReimbError] = useState('');

  // --- Reimbursement rows (receipt-sourced UI removed, kept for future use) ---
  type ReimbursementEntry = {
    employee_id: string;
    job_title: string;
    amount: string;
    error?: string;
  };
  const [reimbursementRows, setReimbursementRows] = useState<ReimbursementEntry[]>([{
    employee_id: '',
    job_title: '',
    amount: '',
    error: '',
  }]);

  // Receipt autofill removed

  // Add state for original auto-filled values
  const [originalAutoFilledAmount, setOriginalAutoFilledAmount] = useState<number | null>(null);
  const [originalAutoFilledDate, setOriginalAutoFilledDate] = useState<string>('');

  // Helper: get available employees for a row (exclude already selected)
  const getAvailableEmployees = (rowIdx: number) => {
    const selectedIds = reimbursementRows.map((row, idx) => idx === rowIdx ? null : row.employee_id).filter(Boolean);
    return allEmployees.filter(emp => !selectedIds.includes(emp.employee_id));
  };

  // Handler: update a reimbursement row
  const handleReimbRowChange = (idx: number, field: 'employee_id' | 'amount') => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setReimbursementRows(prev => {
      const updated = [...prev];
      if (field === 'employee_id') {
        const emp = allEmployees.find(emp => emp.employee_id === value);
        updated[idx] = {
          ...updated[idx],
          employee_id: value,
          job_title: emp ? emp.job_title : '',
          error: '',
        };
      } else if (field === 'amount') {
        updated[idx] = {
          ...updated[idx],
          amount: value,
          error: '',
        };
      }
      return updated;
    });
  };

  // Handler: add a new reimbursement row
  const handleAddReimbRow = () => {
    setReimbursementRows(prev => ([...prev, { employee_id: '', job_title: '', amount: '', error: '' }]));
  };

  // Handler: remove a reimbursement row
  const handleRemoveReimbRow = (idx: number) => {
    setReimbursementRows(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  };

  // Validation for reimbursement rows
  const validateReimbRows = () => {
    let valid = true;
    setReimbursementRows(prev => prev.map(row => {
      let error = '';
      if (!row.employee_id) error = 'Select employee';
      else if (!row.job_title) error = 'Job title missing';
      else if (!row.amount || isNaN(Number(row.amount)) || Number(row.amount) <= 0) error = 'Enter positive amount';
      if (error) valid = false;
      return { ...row, error };
    }));
    return valid;
  };

  // Prevent adding new row if any current row is invalid
  const canAddRow = reimbursementRows.every(row => row.employee_id && row.job_title && row.amount && !isNaN(Number(row.amount)) && Number(row.amount) > 0);

  // Prevent duplicate employees
  const hasDuplicateEmployees = () => {
    const ids = reimbursementRows.map(r => r.employee_id).filter(Boolean);
    return new Set(ids).size !== ids.length;
  };

  const validationRules: Record<FieldName, ValidationRule> = {
    category: { required: true, label: "Category"},
    assignment_id: { required: source === 'operations', label: "Assignment" },
    total_amount: { 
      required: true, 
      min: 0.01, 
      label: "Amount", 
      custom: (v: unknown) => {
        // Type guard to ensure v is a number
        const numValue = typeof v === 'number' ? v : Number(v);
        return isValidAmount(numValue) ? null : "Amount must be greater than 0.";
      }
    },
    expense_date: { required: true, label: "Expense Date" },
  };

  // Helper to get current datetime-local string
  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Fetch all employees from the new endpoint
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // For operations-based reimbursements, use the existing employee API
        // For receipt-based reimbursements, we'll fetch from HR API when needed
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Failed to fetch employees');
        const data = await response.json();
        setAllEmployees(data);
      } catch (error) {
        console.error('Error fetching employees:', error);
        showError('Error', 'Failed to load employees list');
      }
    };
    fetchEmployees();
  }, []);

  // Fetch employees from HR API when needed
  useEffect(() => {
    const fetchHREmployees = async () => {
  if (paymentMethod === 'REIMBURSEMENT') {
        try {
          const hrEmployees = await fetchEmployeesForReimbursementClient();
          setAllEmployees(hrEmployees);
        } catch (error) {
          console.error('Error fetching HR employees:', error);
          showError('Error', 'Failed to load employees from HR system');
        }
      }
    };
    fetchHREmployees();
  }, [source, paymentMethod]);

  // Receipt fetching removed

  useEffect(() => {
    // Reset form when source changes
    setFormData(prev => ({
      ...prev,
      assignment_id: '',
      total_amount: 0,
      category: 'Fuel',
      expense_date: new Date().toISOString().split('T')[0],
    }));
    setPaymentMethod('CASH');
  }, []);

  useEffect(() => {
    if (formData.assignment_id) {
      const selectedAssignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (selectedAssignment) {
        // Set original auto-filled values
        setOriginalAutoFilledAmount(selectedAssignment.trip_fuel_expense);
        // Set date to assignment date with current time
        const assignmentDate = new Date(selectedAssignment.date_assigned);
        const now = new Date();
        assignmentDate.setHours(now.getHours(), now.getMinutes());
        const year = assignmentDate.getFullYear();
        const month = String(assignmentDate.getMonth() + 1).padStart(2, '0');
        const day = String(assignmentDate.getDate()).padStart(2, '0');
        const hours = String(assignmentDate.getHours()).padStart(2, '0');
        const minutes = String(assignmentDate.getMinutes()).padStart(2, '0');
        const dateTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
        setOriginalAutoFilledDate(dateTimeLocal);
        
        // Normalize payment_method from assignment to match form values
        let normalizedPaymentMethod = 'CASH';
        if (selectedAssignment.payment_method && selectedAssignment.payment_method.toUpperCase() === 'REIMBURSEMENT') {
          normalizedPaymentMethod = 'REIMBURSEMENT';
        }
        
        setFormData(prev => ({
          ...prev,
          total_amount: selectedAssignment.trip_fuel_expense,
          expense_date: dateTimeLocal, // Always force update on assignment change
          payment_method: normalizedPaymentMethod,
        }));
        
        // Update payment method state
        setPaymentMethod(normalizedPaymentMethod as 'CASH' | 'REIMBURSEMENT');
      }
    } else {
      setOriginalAutoFilledAmount(null);
      setOriginalAutoFilledDate('');
    }
  }, [formData.assignment_id, assignments]);

  // Receipt autofill removed

  // Calculate amount deviation
  const getAmountDeviation = () => {
    // Check for assignment autofill first
    if (originalAutoFilledAmount !== null && originalAutoFilledAmount !== 0) {
      const currentAmount = Number(formData.total_amount);
      if (currentAmount === originalAutoFilledAmount) return null;
      const difference = currentAmount - originalAutoFilledAmount;
      const percentageChange = Math.abs((difference / originalAutoFilledAmount) * 100);
      const isIncrease = difference > 0;
      return {
        difference: Math.abs(difference),
        percentage: percentageChange,
        isIncrease,
        formattedDifference: `₱${Math.abs(difference).toLocaleString()}`,
        formattedPercentage: `${percentageChange.toFixed(1)}%`,
        source: 'assignment'
      };
    }
    
    // Receipt autofill removed
    
    return null;
  };

  // Calculate date deviation
  const getDateDeviation = () => {
    // Check for assignment autofill first
    if (originalAutoFilledDate && formData.expense_date) {
      const originalDate = new Date(originalAutoFilledDate);
      const currentDate = new Date(formData.expense_date);
      if (originalDate.getTime() === currentDate.getTime()) return null;
      const timeDifference = Math.abs(currentDate.getTime() - originalDate.getTime());
      const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
      const hoursDifference = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesDifference = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
      let deviationText = '';
      if (daysDifference > 0) {
        deviationText = `${daysDifference} day${daysDifference !== 1 ? 's' : ''}`;
        if (hoursDifference > 0) {
          deviationText += `, ${hoursDifference}h`;
        }
      } else if (hoursDifference > 0) {
        deviationText = `${hoursDifference}h`;
        if (minutesDifference > 0) {
          deviationText += ` ${minutesDifference}m`;
        }
      } else if (minutesDifference > 0) {
        deviationText = `${minutesDifference}m`;
      } else {
        deviationText = 'few seconds';
      }
      const isLater = currentDate.getTime() > originalDate.getTime();
      return {
        deviationText,
        isLater,
        daysDifference,
        hoursDifference,
        minutesDifference,
        source: 'assignment'
      };
    }
    
    // Receipt autofill removed
    
    return null;
  };

  // Filter assignments based on is_expense_recorded
  const filteredAssignments = assignments
    .filter(a => !a.is_expense_recorded)
    .sort((a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime());

  // Update reimbursement validation logic
  useEffect(() => {
    if (paymentMethod === 'REIMBURSEMENT') {
      const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (assignment) {
        const total = parseFloat(driverReimb || '0') + parseFloat(conductorReimb || '0');
        const max = Number(assignment.trip_fuel_expense);
        if (total < 1) {
          setReimbError('The total reimbursement must be at least 1.');
        } else if (total > max) {
          setReimbError('The total reimbursement must not exceed the trip fuel expense.');
        } else {
          setReimbError('');
        }
      }
    } else {
      setReimbError('');
    }
  }, [driverReimb, conductorReimb, paymentMethod, source, formData.assignment_id, assignments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'category' && value === '__add_new__') {
      return;
    }

    // Prepare the new value for formData
    let newValue: string | number = value;

    // source is fixed to 'operations'

    if (name === 'total_amount') {
      newValue = parseFloat(value) || 0;
    }

    // Special handling for category "Other"
    if (name === 'category' && value === 'Other') {
      setFormData(prev => ({
        ...prev,
        category: value,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: newValue,
      }));
    }

    // Validate this field immediately
    if (validationRules[name as FieldName]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(newValue, validationRules[name as FieldName]),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

  const { category, assignment_id, total_amount, expense_date } = formData;

    if (!category || !expense_date || !currentUser) {
      await showError('Please fill in all required fields', 'Error');
      return;
    }

    if (source === 'operations' && !assignment_id) {
      await showError('Please select an assignment', 'Error');
      return;
    }

    if (paymentMethod === 'REIMBURSEMENT' && source === 'operations') {
      const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (!assignment) {
        await showError('Please select an assignment', 'Error');
        return;
      }
      // Validate reimbursement amounts
      if (!driverReimb || isNaN(Number(driverReimb)) || Number(driverReimb) < 1) {
        await showError('Please enter a valid reimbursement amount for the driver.', 'Error');
        return;
      }
      if (!conductorReimb || isNaN(Number(conductorReimb)) || Number(conductorReimb) < 1) {
        await showError('Please enter a valid reimbursement amount for the conductor.', 'Error');
        return;
      }
    }

    // Receipt-based reimbursement path removed

    const result = await showConfirmation(
      'Are you sure you want to add this expense record?',
      'Confirm Add'
    );

    if (result.isConfirmed) {
      try {
        // Get assignment details for operations-sourced expenses
        const assignment = source === 'operations' && formData.assignment_id 
          ? assignments.find(a => a.assignment_id === formData.assignment_id)
          : null;

        const payload = {
          category: category,
          total_amount,
          expense_date,
          created_by: currentUser,
          ...(source === 'operations' ? { assignment_id } : {}),
          payment_method: paymentMethod,
          ...(paymentMethod === 'REIMBURSEMENT' && source === 'operations' ? {
            driver_reimbursement: Number(driverReimb),
            conductor_reimbursement: Number(conductorReimb),
            driver_name: assignment?.driver_name || 'Unknown Driver',
            conductor_name: assignment?.conductor_name || 'Unknown Conductor',
          } : {}),
          source,
        };
        console.log('Submitting expense payload:', payload);
        await onAddExpense(payload);
        await showSuccess('Expense added successfully', 'Success');
        onClose();
      } catch (error: unknown) {
        console.error('Error adding expense:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        await showError('Failed to add expense: ' + errorMessage, 'Error');
      }
    }
  };

  // Format assignment for display
  const formatAssignment = (assignment: Assignment) => {
    // Helper to format bus type correctly
    const formatBusType = (busType: string | null): string => {
      if (!busType) return 'N/A';
      
      // Normalize bus type values to display format
      const normalizedType = busType.toLowerCase();
      if (normalizedType === 'aircon' || normalizedType === 'airconditioned') {
        return 'A';
      } else if (normalizedType === 'ordinary' || normalizedType === 'non-aircon') {
        return 'O';
      } else {
        // For any other values, return the first letter capitalized
        return busType.charAt(0).toUpperCase();
      }
    };

    const busType = formatBusType(assignment.bus_type);
    const driverName = assignment.driver_name || 'N/A';
    const conductorName = assignment.conductor_name || 'N/A';
    return `${formatDate(assignment.date_assigned)} | ₱ ${assignment.trip_fuel_expense} | ${assignment.bus_plate_number || 'N/A'} (${busType}) - ${assignment.bus_route} | ${driverName} & ${conductorName}`;
  };

  // Receipt display removed

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        <ModalHeader 
          title="Add Expense" 
          onClose={onClose} 
          showDateTime={true} 
        />

      <form onSubmit={handleSubmit}>
        <div className="modalContent">
          
            <div className="formFieldsHorizontal">
              <div className="formInputs">

                {/* SOURCE TYPE */}
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="source">Source Type<span className='requiredTags'> *</span></label>
                  <select
                    id="source"
                    name="source"
                    value={source}
                    onChange={handleInputChange}
                    required
                    className='formSelect'
                  >
                    <option value="operations">{formatDisplayText('Operations')}</option>
                  </select>
                  </div>

                  {/* SOURCE */}
                  <div className="formField">
                    <label htmlFor="sourceDetail">Source<span className='requiredTags'> *</span></label>
                    <button
                      type="button"
                      className="formSelect"
                      id='busSelector'
                      style={{ textAlign: 'left', width: '100%' }}
                      onClick={() => setShowBusSelector(true)}
                    >
                      {formData.assignment_id
                        ? formatAssignment(assignments.find(a => a.assignment_id === formData.assignment_id)!)
                        : 'Select Assignment'}
                    </button>
                    {errors.assignment_id.map((msg, i) => (
                      <div className="error-message" key={i}>{msg}</div>
                    ))}
                    {showBusSelector && (
                      <BusSelector
                        assignments={filteredAssignments}
                        onSelect={assignment => {
                          setFormData(prev => ({ ...prev, assignment_id: assignment.assignment_id }));
                          setShowBusSelector(false);
                        }}
                        isOpen={showBusSelector}
                        allEmployees={allEmployees}
                        onClose={() => setShowBusSelector(false)}
                      />
                    )}
                  </div>
                </div>
                

                <div className="formRow">
                  {/* CATEGORY */}
                  <div className="formField">
                    <label htmlFor="category">Category<span className='requiredTags'> *</span></label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={formatDisplayText(formData.category)}
                      readOnly
                      className="formInput"
                    />
                  </div>

                  
                     {/* AMOUNT */}
                    <div className="formField">
                      <label htmlFor="amount">Amount<span className='requiredTags'> *</span></label>
                      <input
                        type="number"
                        id="amount"
                        name="total_amount"
                        value={formData.total_amount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        required
                        className="formInput"
                      />
                      {formData.assignment_id && (
                        <span className="autofill-note">Auto-calculated from assignment (editable)</span>
                      )}
                      {(() => {
                        const amountDeviation = getAmountDeviation();
                        return amountDeviation && (
                          <div className="deviation-note" style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                            <i className="ri-error-warning-line"></i> 
                            {amountDeviation.isIncrease ? '+' : '-'}{amountDeviation.formattedDifference} 
                            ({amountDeviation.isIncrease ? '+' : '-'}{amountDeviation.formattedPercentage}) 
                            from auto-filled assignment amount
                          </div>
                        );
                      })()}
                    </div>
                </div>

              
                {/* DATE */}
                <div className="formField">
                  <label htmlFor="expense_date">Expense Date & Time<span className='requiredTags'> *</span></label>
                  <input
                    type="datetime-local"
                    id="expense_date"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleInputChange}
                    required
                    className="formInput"
                    max={getCurrentDateTimeLocal()}
                  />
                  {formData.assignment_id && (
                    <span className="autofill-note">Auto-filled from assignment date with current time (editable)</span>
                  )}
                  {(() => {
                    const dateDeviation = getDateDeviation();
                    return dateDeviation && (
                      <div className="deviation-note" style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                        <i className="ri-time-line"></i> 
                        {dateDeviation.deviationText} {dateDeviation.isLater ? 'after' : 'before'} auto-filled assignment date
                      </div>
                    );
                  })()}
                </div>

                {/* PAYMENT METHOD */}
                <div className="formField">
                  <label htmlFor="payment_method">Payment Method<span className='requiredTags'> *</span></label>
                  {
                    <input
                      type="text"
                      id="payment_method"
                      name="payment_method"
                      value={paymentMethod}
                      readOnly
                      className="formInput"
                    />
                  }
                </div>

                {/* EMPLOYEE FIELDS for REIMBURSEMENT (Operations) */}
                {paymentMethod === 'REIMBURSEMENT' && source === 'operations' && formData.assignment_id && (() => {
                  const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
                  if (!assignment) return null;
                  // Use driver_name and conductor_name directly from assignment
                  const driverName = assignment.driver_name || 'N/A';
                  const conductorName = assignment.conductor_name || 'N/A';
                  return (
                    <div className="reimbBox">
                      <div className="reimbHeader">Reimbursement Breakdown</div>
                      <div className="reimbGrid">
                        <div className="reimbField">
                          <label>Driver Name</label>
                          <input type="text" value={driverName} readOnly className="formInput" />
                        </div>
                        <div className="reimbField">
                          <label>Job Title</label>
                          <input type="text" value="Driver" readOnly className="formInput" />
                        </div>
                        <div className="reimbField">
                          <label>Driver Reimbursement Amount<span className='requiredTags'> *</span></label>
                          <input type="number" value={driverReimb || ''} onChange={e => setDriverReimb(e.target.value)} min="1" max={assignment.trip_fuel_expense} className="formInput" required />
                        </div>
                        <div className="reimbField">
                          <label>Conductor Name</label>
                          <input type="text" value={conductorName} readOnly className="formInput" />
                        </div>
                        <div className="reimbField">
                          <label>Job Title</label>
                          <input type="text" value="Conductor" readOnly className="formInput" />
                        </div>
                        <div className="reimbField">
                          <label>Conductor Reimbursement Amount<span className='requiredTags'> *</span></label>
                          <input type="number" value={conductorReimb || ''} onChange={e => setConductorReimb(e.target.value)} min="1" max={assignment.trip_fuel_expense} className="formInput" required />
                        </div>
                      </div>
                      <div className="reimbHelper">The total reimbursement must be at least 1 and must not exceed the trip fuel expense (₱{assignment.trip_fuel_expense}).</div>
                      {reimbError && <div className="error-message">{reimbError}</div>}
                    </div>
                  );
                })()}

                {/* Receipt-sourced reimbursement UI removed */}
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="submit" className="addButton">
              <i className="ri-add-line" /> Add Expense
            </button>
          </div>
      </form>
    </div>
  </div>
  );
};

export default AddExpense;