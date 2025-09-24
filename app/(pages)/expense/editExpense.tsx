/* ──────────────────────────────────────────────────────────────
   File: app/Components/editExpense.tsx
   Desc: Edit-Expense modal – mirrors Add-Expense UI/logic
   ──────────────────────────────────────────────────────────── */
'use client';

import React, { useState, useEffect } from 'react';
import '../../styles/expense/editExpense.css';
import { getAssignmentById } from '@/lib/operations/assignments';
import { formatDate } from '../../utility/dateFormatter';
import { validateField, ValidationRule, isValidAmount } from "../../utility/validation";
import type { Assignment } from '@/lib/operations/assignments';
import ModalHeader from '../../Components/ModalHeader';
import Swal from "sweetalert2";

/* ───── types ──────────────────────────────────────────────── */
export type ExpenseData = {
  expense_id: string;
  date: string;
  department_from: string;
  category: string;
  total_amount: number;
  // receipt removed
  // Updated to match schema structure
  payment_method?: {
    id: string;
    name: string;
  };
};

type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  assignment_id?: string;
  employee_id: string;
  employee_name: string;
  job_title?: string;
  amount: number;
  status: {
    id: string;
    name: string;
  };
  requested_date?: string;
  approved_by?: string;
  approved_date?: string;
  rejection_reason?: string;
  paid_by?: string;
  paid_date?: string;
  payment_reference?: string;
  payment_method?: string;
  created_by: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  is_deleted?: boolean;
};

type EditExpenseModalProps = {
  record: {
    expense_id: string;
    expense_date: string;
    category: {
      category_id: string;
      name: string;
    };
    total_amount: number;
    assignment_id?: string;
    assignment?: Assignment;
    // receipt removed
    // Updated to match schema structure
    payment_method: {
      id: string;
      name: string;
    };
    reimbursements?: Reimbursement[];
  };
  onClose: () => void;
  onSave: (updatedRecord: {
    expense_id: string;
    expense_date: string;
    total_amount: number;
  }) => void;
};

/* ───── component ──────────────────────────────────────────── */
const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  record,
  onClose,
  onSave
}) => {
  // Convert expense_date to datetime-local format for input
  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [expense_date, setDate] = useState(formatDateTimeLocal(record.expense_date));
  const [amount, setAmount] = useState(record.total_amount);
  const [errors, setErrors] = useState<Record<string, string[]>>({
    amount: [],
    expense_date: []
  });

  // Add state for assignment details
  const [assignment, setAssignment] = useState<Assignment | null>(record.assignment || null);

  // Store original initial amount and date for deviation calculation
  const [originalAutoFilledAmount, setOriginalAutoFilledAmount] = useState<number | null>(null);
  const [originalAutoFilledDate, setOriginalAutoFilledDate] = useState<string>('');

  // Receipt-based expenses removed
  const isReceiptBasedExpense = false;

  // On mount, set original initial values from assignment or receipt data
  useEffect(() => {
    if (record.assignment) {
      // For assignment-based expenses, use assignment data
      setAssignment(record.assignment);
      setOriginalAutoFilledAmount(record.assignment.trip_fuel_expense);
      
      // Set original date to assignment date with current time
      if (record.assignment.date_assigned) {
        const assignmentDate = new Date(record.assignment.date_assigned);
        const now = new Date();
        assignmentDate.setHours(now.getHours(), now.getMinutes());
        const year = assignmentDate.getFullYear();
        const month = String(assignmentDate.getMonth() + 1).padStart(2, '0');
        const day = String(assignmentDate.getDate()).padStart(2, '0');
        const hours = String(assignmentDate.getHours()).padStart(2, '0');
        const minutes = String(assignmentDate.getMinutes()).padStart(2, '0');
        setOriginalAutoFilledDate(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
    } else if (record.assignment_id) {
      // Fallback: fetch assignment if not provided in record
      const fetchAssignment = async () => {
        try {
          const assignmentData = await getAssignmentById(record.assignment_id!);
          if (assignmentData) {
            setAssignment(assignmentData);
            setOriginalAutoFilledAmount(assignmentData.trip_fuel_expense);
            
            // Set original date to assignment date with current time
            if (assignmentData.date_assigned) {
              const assignmentDate = new Date(assignmentData.date_assigned);
              const now = new Date();
              assignmentDate.setHours(now.getHours(), now.getMinutes());
              const year = assignmentDate.getFullYear();
              const month = String(assignmentDate.getMonth() + 1).padStart(2, '0');
              const day = String(assignmentDate.getDate()).padStart(2, '0');
              const hours = String(assignmentDate.getHours()).padStart(2, '0');
              const minutes = String(assignmentDate.getMinutes()).padStart(2, '0');
              setOriginalAutoFilledDate(`${year}-${month}-${day}T${hours}:${minutes}`);
            }
          } else {
            setAssignment(null);
          }
        } catch {
          setAssignment(null);
        }
      };
      fetchAssignment();
    } else {
      setAssignment(null);
    }
  }, [record.assignment, record.assignment_id, isReceiptBasedExpense]);

  const validationRules: Record<string, ValidationRule> = {
    amount: { 
      required: true, 
      min: 0.01, 
      label: "Amount",
      custom: (value: unknown) => {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return "Amount must be a valid number";
        }
        if (!isValidAmount(numValue)) {
          return "Amount must be greater than 0";
        }
        if (numValue > 9999999999999999.9999) {
          return "Amount exceeds maximum allowed value";
        }
        return null;
      }
    },
    expense_date: { 
      required: true, 
      label: "Expense Date & Time",
      custom: (value: unknown) => {
        if (typeof value === 'string' && value) {
          const selectedDateTime = new Date(value);
          const now = new Date();
          if (selectedDateTime > now) {
            return "Expense date and time cannot be in the future";
          }
        }
        return null;
      }
    }
  };

  const handleAmountChange = (newAmount: number) => {
    if (isNaN(newAmount)) {
      setErrors(prev => ({
        ...prev,
        amount: ['Amount is required.']
      }));
      setAmount(0);
      return;
    }

    setAmount(newAmount);
    
    setErrors(prev => ({
      ...prev,
      amount: validateField(newAmount, validationRules.amount)
    }));
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setErrors(prev => ({
      ...prev,
      expense_date: validateField(newDate, validationRules.expense_date)
    }));
  };

  const handleSave = async () => {
    // Validate all fields
    const newErrors: Record<string, string[]> = {};
    Object.keys(validationRules).forEach(fieldName => {
      const value = fieldName === 'amount' ? amount :
                    fieldName === 'expense_date' ? expense_date : null;
      newErrors[fieldName] = validateField(value, validationRules[fieldName]);
    });

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some(fieldErrors => fieldErrors.length > 0);
    if (hasErrors) {
      await Swal.fire({
        title: 'Validation Error',
        text: 'Please correct all errors before saving',
        icon: 'error',
        confirmButtonColor: '#961C1E',
        background: 'white',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Save Changes?',
      text: 'Do you want to save the changes to this record?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, save it!',
      cancelButtonText: 'Cancel',
      background: 'white',
    });

    if (result.isConfirmed) {
      onSave({
        expense_id: record.expense_id,
        expense_date,
        total_amount: amount,
      });
    }
  };

  // Format assignment for display
  const formatAssignment = (assignment: Assignment | null) => {
    if (!assignment) return 'N/A';
    
    // Helper to format bus type correctly
    const formatBusType = (busType: string | null): string => {
      if (!busType) return 'N/A';
      const normalizedType = busType.toLowerCase();
      if (normalizedType === 'aircon' || normalizedType === 'airconditioned') {
        return 'A';
      } else if (normalizedType === 'ordinary' || normalizedType === 'non-aircon') {
        return 'O';
      } else {
        return busType.charAt(0).toUpperCase();
      }
    };

    const busType = formatBusType(assignment.bus_type);
    const driverName = assignment.driver_name || 'N/A';
    const conductorName = assignment.conductor_name || 'N/A';
    
    const formatted = `${assignment.date_assigned ? assignment.date_assigned.split('T')[0] : 'N/A'} | ₱ ${assignment.trip_fuel_expense?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'} | ${assignment.bus_plate_number || 'N/A'} (${busType}) - ${assignment.bus_route || 'N/A'} | ${driverName} & ${conductorName}`;
    return formatted;
  };

  // Get the appropriate reference display based on expense type
  const getReferenceDisplay = () => {
    if (assignment) {
      return formatAssignment(assignment);
    } else {
      return 'N/A';
    }
  };

  // Get the appropriate reference label based on expense type
  const getReferenceLabel = () => {
    return 'Assignment';
  };

  // Amount deviation calculation
  const getAmountDeviation = () => {
    if (originalAutoFilledAmount === null || originalAutoFilledAmount === 0) return null;
    if (Number(amount) === originalAutoFilledAmount) return null;
    const difference = Number(amount) - originalAutoFilledAmount;
    const percentageChange = Math.abs((difference / originalAutoFilledAmount) * 100);
    const isIncrease = difference > 0;
    return {
      difference: Math.abs(difference),
      percentage: percentageChange,
      isIncrease,
      formattedDifference: `₱${Math.abs(difference).toLocaleString()}`,
      formattedPercentage: `${percentageChange.toFixed(1)}%`
    };
  };

  // Date deviation calculation
  const getDateDeviation = () => {
    if (!originalAutoFilledDate || !expense_date) return null;
    const originalDate = new Date(originalAutoFilledDate);
    const currentDate = new Date(expense_date);
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
      minutesDifference
    };
  };

  return (
    <div className="modalOverlay">
      <div className="editExpenseModal">
        <ModalHeader 
          title="Edit Expense" 
          onClose={onClose} 
          showDateTime={true} 
        />

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="editExpense_modalContent">
            <div className="formFieldsHorizontal">
              <div className="formInputs">

                <div className="formRow">
                  {/* CATEGORY */}
                  <div className="formField">
                    <label htmlFor="category">Category<span className='requiredTags'> *</span></label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={record.category.name}
                      readOnly
                      className="formInput"
                    />
                  </div>
                  {/* REFERENCE (read-only) - shows Assignment or Receipt based on expense type */}
                  <div className="formField">
                    <label htmlFor="reference">{getReferenceLabel()}</label>
                    <input
                      type="text"
                      id="reference"
                      name="reference"
                      value={getReferenceDisplay()}
                      readOnly
                      className="formInput"
                    />
                  </div>
                </div>

                <div className="formRow">
                  {/* EXPENSE DATE & TIME */}
                  <div className="formField">
                    <label htmlFor="expense_date">Expense Date & Time <span className='requiredTags'> *</span></label>
                    <input
                      type="datetime-local"
                      id="expense_date"
                      name="expense_date"
                      value={expense_date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      required
                      className={`formInput${errors.expense_date?.length ? ' input-error' : ''}`}
                      max={new Date().toISOString().slice(0, 16)}
                    />
                    {errors.expense_date?.map((msg, i) => (
                      <div key={i} className="error-message">{msg}</div>
                    ))}
                    {(() => {
                      const dateDeviation = getDateDeviation();
                      return dateDeviation ? (
                        <div className="deviation-note" style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                          <i className="ri-time-line"></i>
                          {dateDeviation.deviationText} {dateDeviation.isLater ? 'after' : 'before'} initial date
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* AMOUNT */}
                  <div className="formField">
                    <label htmlFor="amount">Expense Amount<span className='requiredTags'> *</span></label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={amount || ''}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.0001"
                      required
                      className={`formInput${errors.amount?.length ? ' input-error' : ''}`}
                    />
                    {errors.amount?.map((msg, i) => (
                      <div key={i} className="error-message">{msg}</div>
                    ))}
                    {(() => {
                      const amountDeviation = getAmountDeviation();
                      return amountDeviation ? (
                        <div className="deviation-note" style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                          <i className="ri-error-warning-line"></i>
                          {amountDeviation.isIncrease ? '+' : '-'}{amountDeviation.formattedDifference}
                          ({amountDeviation.isIncrease ? '+' : '-'}{amountDeviation.formattedPercentage})
                          from initial amount
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="button" onClick={onClose} className="cancelButton">
              <i className="ri-close-line" /> Cancel
            </button>
            <button type="submit" className="saveButton">
              <i className="ri-save-line" /> Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseModal;