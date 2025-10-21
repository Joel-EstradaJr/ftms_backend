// AddExpenseModal.tsx
'use client';

//---------------------IMPORTS HERE----------------------//
import React, { useState, useEffect, useMemo } from 'react';
//@ts-ignore
import '../../../styles/expense/addExpense.css';
import { formatDate } from '../../../utility/dateFormatter';
import { showSuccess, showError, showConfirmation } from '../../../utils/Alerts';
import { validateField, isValidAmount, ValidationRule } from "../../../utils/validation";
import { formatDisplayText } from '../../../utils/formatting';
import BusSelector from '../../../Components/busSelector';
import ModalHeader from '../../../Components/ModalHeader';
import ReimbursementBreakdownForm from '../../../Components/ReimbursementBreakdownForm';
import type { Assignment } from '@/lib/operations/assignments';
// Unified to use server-side `/api/employees` for all cases

//---------------------DECLARATIONS HERE----------------------//
// Uncomment and use these types
// type ExpenseData = {
//   expense_id: string;
//   date: string;
//   department_from: string;
//   category: string;
//   total_amount: number;
// };

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
    source?: string;
    source_id?: string;
    payment_method?: string;
    payment_method_id?: string;
    payment_status?: string;
    payment_status_id?: string;
    assignment_id?: string;
    bus_trip_id?: string;
    total_amount: number;
    expense_date: string;
    created_by: string;
    employee_id?: string;
    employee_name?: string;
    driver_reimbursement?: number;
    conductor_reimbursement?: number;
    is_linked_to_trip?: boolean;
    source_context?: 'operations' | 'manual';
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
  const [isLinkedToTrip, setIsLinkedToTrip] = useState<boolean>(true);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [errors, setErrors] = useState<Record<FieldName, string[]>>({
    category: [],
    assignment_id: [],
    total_amount: [],
    expense_date: [],
  });
  // Dynamic globals
  type NamedItem = { id: string; name: string };
  const [categories, setCategories] = useState<NamedItem[]>([]);
  const [sources, setSources] = useState<NamedItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<NamedItem[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<NamedItem[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Reimbursement'>('Cash');

  const [formData, setFormData] = useState({
    category: 'Fuel',
    category_id: '',
    source: '',
    source_id: '',
    payment_method: '',
    payment_method_id: '',
    payment_status: '',
    payment_status_id: '',
    assignment_id: '',
    bus_trip_id: '',
    total_amount: 0,
    expense_date: new Date().toISOString().slice(0, 16),
    created_by: currentUser,
  });

  // New state for driver/conductor reimbursement amounts
  const [driverReimb, setDriverReimb] = useState('');
  const [conductorReimb, setConductorReimb] = useState('');
  const [reimbError, setReimbError] = useState('');
  const [reimbValid, setReimbValid] = useState<boolean>(true);
  const [reimbSum, setReimbSum] = useState<number>(0);

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
    assignment_id: { required: isLinkedToTrip, label: "Assignment" },
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

  // Removed: client-side HR fetch. We consistently use `/api/employees`.

  // Fetch dynamic globals
  useEffect(() => {
    const fetchGlobals = async () => {
      try {
        const [catRes, srcRes, pmRes, psRes] = await Promise.all([
          fetch('/api/globals/categories?module=expense'),
          fetch('/api/globals/sources'),
          fetch('/api/globals/payment-methods'),
          fetch('/api/globals/payment-statuses'),
        ]);
        if (!catRes.ok) throw new Error('Failed loading categories');
        if (!srcRes.ok) throw new Error('Failed loading sources');
        if (!pmRes.ok) throw new Error('Failed loading payment methods');
        if (!psRes.ok) throw new Error('Failed loading payment statuses');
        const [catData, srcData, pmData, psData] = await Promise.all([
          catRes.json(), srcRes.json(), pmRes.json(), psRes.json()
        ]);

        type AnyItem = { id?: string; name: string; category_id?: string };
        const norm = (arr: AnyItem[], idKey: keyof AnyItem = 'id'): { id: string; name: string }[] =>
          (Array.isArray(arr) ? arr : []).map((x: AnyItem) => ({ id: (x[idKey] as string) ?? (x.id as string), name: x.name }))
            .filter((x) => x && x.id && x.name);

        const cats = norm(catData as AnyItem[], 'category_id');
        const srcs = norm(srcData as AnyItem[], 'id');
        const pms = norm(pmData as AnyItem[], 'id');
        const pss = norm(psData as AnyItem[], 'id');

        const byName = (a: { id: string; name: string }, b: { id: string; name: string }) => a.name.localeCompare(b.name);
        setCategories(cats.sort(byName));
        setSources(srcs.sort(byName));
        setPaymentMethods(pms.sort(byName));
        setPaymentStatuses(pss.sort(byName));

        setFormData(prev => {
          const next = { ...prev } as any;
          if (!prev.category_id) {
            const fuel = cats.find(c => c.name.toLowerCase() === 'fuel');
            if (fuel) { next.category_id = fuel.id; next.category = fuel.name; }
            else if (cats[0]) { next.category_id = cats[0].id; next.category = cats[0].name; }
          }
          if (!prev.source_id && srcs[0]) { next.source_id = srcs[0].id; next.source = srcs[0].name; }
          if (!prev.payment_method_id && pms[0]) { next.payment_method_id = pms[0].id; next.payment_method = pms[0].name; }
          if (!prev.payment_status_id) {
            const pending = pss.find(s => s.name.toLowerCase() === 'pending');
            next.payment_status_id = (pending || pss[0])?.id || '';
            next.payment_status = (pending || pss[0])?.name || '';
          }
          return next;
        });
      } catch (err) {
        console.error('Failed fetching globals', err);
        showError('Error', 'Failed to load dropdown values');
      }
    };
    fetchGlobals();
  }, []);

  // Selected items
  const selectedCategory = useMemo(() => categories.find(c => c.id === formData.category_id), [categories, formData.category_id]);
  const selectedSource = useMemo(() => sources.find(s => s.id === formData.source_id), [sources, formData.source_id]);
  const selectedPaymentMethod = useMemo(() => paymentMethods.find(p => p.id === formData.payment_method_id), [paymentMethods, formData.payment_method_id]);
  const selectedPaymentStatus = useMemo(() => paymentStatuses.find(s => s.id === formData.payment_status_id), [paymentStatuses, formData.payment_status_id]);

  // Keep names in sync when IDs change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      category: selectedCategory?.name || prev.category,
      source: selectedSource?.name || prev.source,
      payment_method: selectedPaymentMethod?.name || prev.payment_method,
      payment_status: selectedPaymentStatus?.name || prev.payment_status,
    }));
  }, [selectedCategory, selectedSource, selectedPaymentMethod, selectedPaymentStatus]);

  // Receipt fetching removed

  // Initialize date to now once
  useEffect(() => {
    setFormData(prev => ({ ...prev, expense_date: new Date().toISOString().slice(0, 16) }));
  }, []);

  useEffect(() => {
    if (isLinkedToTrip && formData.assignment_id) {
      const selectedAssignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (selectedAssignment) {
        // Set date to now and derive amount: Fuel -> trip_fuel_expense else assignment_value
        const now = new Date();
        const dateTimeLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

        const isFuel = (selectedCategory?.name || formData.category || '').toLowerCase() === 'fuel';
        const autoAmount = isFuel ? Number(selectedAssignment.trip_fuel_expense || 0) : Number(selectedAssignment.assignment_value || 0);

        setOriginalAutoFilledAmount(autoAmount);
        setOriginalAutoFilledDate(dateTimeLocal);

        setFormData(prev => ({
          ...prev,
          total_amount: autoAmount,
          expense_date: dateTimeLocal,
          bus_trip_id: selectedAssignment.bus_trip_id,
        }));
      }
    } else {
      setOriginalAutoFilledAmount(null);
      setOriginalAutoFilledDate('');
    }
  }, [isLinkedToTrip, formData.assignment_id, assignments, selectedCategory, formData.category]);

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

  // Helper to match assignments by selected source's payment method
  const matchesSourcePaymentMethod = (assignmentMethod: string | null | undefined, sourceName: string | undefined) => {
    const am = (assignmentMethod || '').toLowerCase();
    const sn = (sourceName || '').toLowerCase();
    if (!sn) return true;
    if (sn.includes('reimb')) return am.includes('reimb');
    if (sn.includes('cash')) return am.includes('cash') || am.includes('company');
    // Default to case-insensitive equality
    return am === sn;
  };

  // Filter assignments based on recorded + optionally by source when linked
  const filteredAssignments = assignments
    .filter(a => !a.is_expense_recorded)
    .filter(a => !isLinkedToTrip || matchesSourcePaymentMethod(a.payment_method, selectedSource?.name))
    .sort((a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime());

  // Reimbursement validation handled by shared component; track validity and message

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

    if (isLinkedToTrip && !assignment_id) {
      await showError('Please select an assignment', 'Error');
      return;
    }

  const isReimbSource = (selectedSource?.name || '').toLowerCase().includes('reimb');
  if (isReimbSource && isLinkedToTrip) {
      const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (!assignment) {
        await showError('Please select an assignment', 'Error');
        return;
      }
      // Shared component validity must pass and total must be >= sum
      if (!reimbValid) {
        await showError(reimbError || 'Please fix reimbursement amounts.', 'Error');
        return;
      }
      const total = Number(formData.total_amount) || 0;
      if (reimbSum > total) {
        await showError('Sum of reimbursements cannot exceed total expense amount.', 'Error');
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
        const assignment = isLinkedToTrip && formData.assignment_id 
          ? assignments.find(a => a.assignment_id === formData.assignment_id)
          : null;

        const payload = {
          // Prefer IDs; include names as fallback/context
          category_id: formData.category_id,
          category: category,
          source_id: formData.source_id || undefined,
          source: formData.source || undefined,
          payment_method_id: formData.payment_method_id,
          payment_method: formData.payment_method || paymentMethod,
          payment_status_id: formData.payment_status_id,
          payment_status: formData.payment_status || undefined,
          total_amount,
          expense_date,
          created_by: currentUser,
          ...(isLinkedToTrip ? { assignment_id, bus_trip_id: formData.bus_trip_id } : {}),
          ...(((selectedSource?.name || '').toLowerCase().includes('reimb')) && isLinkedToTrip ? {
            driver_reimbursement: Number(driverReimb),
            conductor_reimbursement: Number(conductorReimb),
            driver_name: assignment?.driver_name || 'Unknown Driver',
            conductor_name: assignment?.conductor_name || 'Unknown Conductor',
          } : {}),
          is_linked_to_trip: isLinkedToTrip,
          source_context: (isLinkedToTrip ? 'operations' : 'manual') as 'operations' | 'manual',
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
    return `${formatDate(assignment.date_assigned)} | ₱ ${assignment.assignment_value} | ${assignment.bus_plate_number || 'N/A'} (${busType}) - ${assignment.bus_route} | ${driverName} & ${conductorName}`;
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

                {/* LINK TO TRIP + SOURCE + TRIP SELECTOR */}
                <div className="formRow">
                  {/* Link toggle (checkbox switch) */}
                  <div className="formField">
                    <label htmlFor="is_linked">Is this linked to a Bus Trip?<span className='requiredTags'> *</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        id="is_linked"
                        type="checkbox"
                        role="switch"
                        checked={isLinkedToTrip}
                        onChange={(e) => {
                          const linked = e.target.checked;
                          setIsLinkedToTrip(linked);
                          if (!linked) {
                            setFormData(prev => ({ ...prev, assignment_id: '', bus_trip_id: '' }));
                            setOriginalAutoFilledAmount(null);
                            setOriginalAutoFilledDate('');
                          } else {
                            // When turning ON, default category to Fuel (editable)
                            const fuel = categories.find(c => c.name.toLowerCase() === 'fuel');
                            if (fuel) {
                              setFormData(prev => ({ ...prev, category_id: fuel.id, category: fuel.name }));
                            }
                          }
                        }}
                      />
                      <span>{isLinkedToTrip ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  {/* Source select */}
                  <div className="formField">
                    <label htmlFor="source_id">Source<span className='requiredTags'> *</span></label>
                    <select
                      id="source_id"
                      name="source_id"
                      value={formData.source_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const src = sources.find(s => s.id === id);
                        setFormData(prev => ({ ...prev, source_id: id, source: src?.name || '' }));
                      }}
                      required
                      className='formSelect'
                    >
                      {sources.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Trip selector */}
                  <div className="formField">
                    <label htmlFor="sourceDetail">Trip Assignment{isLinkedToTrip ? <span className='requiredTags'> *</span> : null}</label>
                    {isLinkedToTrip ? (
                      <>
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
                              setFormData(prev => ({ ...prev, assignment_id: assignment.assignment_id, bus_trip_id: assignment.bus_trip_id }));
                              setShowBusSelector(false);
                            }}
                            isOpen={showBusSelector}
                            allEmployees={allEmployees}
                            onClose={() => setShowBusSelector(false)}
                          />
                        )}
                      </>
                    ) : (
                      <input type="text" value="Manual entry" readOnly className="formInput" />
                    )}
                  </div>
                </div>
                

                <div className="formRow">
                  {/* CATEGORY */}
                  <div className="formField">
                    <label htmlFor="category_id">Category<span className='requiredTags'> *</span></label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const cat = categories.find(c => c.id === id);
                        setFormData(prev => ({ ...prev, category_id: id, category: cat?.name || '' }));
                        // also clear any validation error for category if present
                        setErrors(prev => ({ ...prev, category: [] }));
                      }}
                      required
                      className='formSelect'
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
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
                  <select
                    id="payment_method_id"
                    name="payment_method_id"
                    value={formData.payment_method_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const pm = paymentMethods.find(p => p.id === id);
                      setFormData(prev => ({ ...prev, payment_method_id: id, payment_method: pm?.name || '' }));
                      setPaymentMethod((pm?.name || '').toLowerCase().includes('reimb') ? 'Reimbursement' : 'Cash');
                    }}
                    required
                    className='formSelect'
                  >
                    {paymentMethods.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* PAYMENT STATUS */}
                <div className="formField">
                  <label htmlFor="payment_status_id">Payment Status<span className='requiredTags'> *</span></label>
                  <select
                    id="payment_status_id"
                    name="payment_status_id"
                    value={formData.payment_status_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const ps = paymentStatuses.find(p => p.id === id);
                      setFormData(prev => ({ ...prev, payment_status_id: id, payment_status: ps?.name || '' }));
                    }}
                    required
                    className='formSelect'
                  >
                    {paymentStatuses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Reimbursement Breakdown (shared component) */}
                {(() => {
                  const isReimbSource = (selectedSource?.name || '').toLowerCase().includes('reimb');
                  if (!(isReimbSource && isLinkedToTrip && formData.assignment_id)) return null;
                  const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
                  if (!assignment) return null;
                  return (
                    <ReimbursementBreakdownForm
                      driverName={assignment.driver_name || 'N/A'}
                      conductorName={assignment.conductor_name || 'N/A'}
                      driverAmount={driverReimb}
                      conductorAmount={conductorReimb}
                      totalAmount={Number(formData.total_amount) || 0}
                      onDriverAmountChange={(v) => setDriverReimb(v)}
                      onConductorAmountChange={(v) => setConductorReimb(v)}
                      onValidityChange={(ok, msg, sum) => { setReimbValid(ok); setReimbError(msg || ''); setReimbSum(sum); }}
                    />
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