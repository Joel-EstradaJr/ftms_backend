// app\Components\addRevenue.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/revenue/addRevenue.css';
import {
  showEmptyFieldWarning,
  showAddConfirmation,
  showAddSuccess,
  showInvalidAmountAlert,
  showError
} from '../../utility/Alerts';
import { isValidAmount } from '../../utility/validation';
import { formatDate } from '../../utility/dateFormatter';
import { computeAutoAmount, getBoundaryLossInfo, formatPeso } from '@/app/utils/revenueCalc';
import { formatDisplayText } from '../../utils/formatting';
import { Assignment } from '@/lib/operations/assignments';
import { getRevenueGlobalsCached } from '@/lib/clientStore';
import RevenueSourceSelector from '../../Components/revenueBusSelector';
import ModalHeader from '@/app/Components/ModalHeader';

type GlobalCategory = {
  category_id: string; // server provides both id and category_id as same
  name: string;
  applicable_modules: string[];
};

type AddRevenueProps = {
  onClose: () => void;
  onAddRevenue: (formData: {
    category_id: string;
    assignment_id?: string;
    bus_trip_id?: string;
    total_amount: number;
    collection_date: string;
    created_by: string;
    payment_status_id: string;
    payment_method_id?: string;
    remarks: string;
    // Optional AR fields
    is_receivable?: boolean;
    payer_name?: string;
    due_date?: string;
    interest_rate?: number;
    installments?: { installment_number: number; due_date: string; amount_due: number }[];
    // Optional attachments
    attachments?: File[];
  }) => void;
  assignments: Assignment[];
  currentUser: string;
};

type ExistingRevenue = {
  assignment_id?: string;
  bus_trip_id?: string;
  category_id: string;
  total_amount: number;
  collection_date: string;
};

const AddRevenue: React.FC<AddRevenueProps & { existingRevenues: ExistingRevenue[] }> = ({ 
  onClose, 
  onAddRevenue,
  assignments,
  currentUser,
  existingRevenues
}) => {
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<{ id: string; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
  
  // Track original auto-filled values for deviation calculation
  const [originalAutoFilledAmount, setOriginalAutoFilledAmount] = useState<number | null>(null);
  const [originalAutoFilledDate, setOriginalAutoFilledDate] = useState<string>('');
  
  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [formData, setFormData] = useState({
    category_id: '',
    assignment_id: '',
    bus_trip_id: '',
    total_amount: 0,
    collection_date: getCurrentDateTimeLocal(), // Changed to include current datetime
    created_by: currentUser,
    payment_status_id: '',
    payment_method_id: '',
    remarks: '',
    // AR fields
    is_receivable: false,
    payer_name: '',
    due_date: '', // yyyy-MM-dd
    interest_rate: 0,
  });

  // Simple installments list for AR
  type InstallmentRow = { id: string; installment_number: number; due_date: string; amount_due: number };
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  // Attachments state
  const [attachments, setAttachments] = useState<File[]>([]);
  const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.jfif', '.pdf', '.docx', '.csv', '.xlsx'];
  const ALLOWED_MIME = new Set([
    'image/png','image/jpeg','image/jpg','image/pjpeg',
    'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]);
  const MAX_TOTAL = 50 * 1024 * 1024; // 50MB
  const onSelectFiles = (fileList: FileList | null) => {
    if (!fileList) { setAttachments([]); return; }
    const files = Array.from(fileList);
    // Client-side validation
    let total = 0;
    for (const f of files) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const dotExt = `.${ext}`;
      if (!ALLOWED_EXT.includes(dotExt) || !ALLOWED_MIME.has(f.type)) {
        showError(`Unsupported file: ${f.name}`, 'Attachment Error');
        return;
      }
      total += f.size;
    }
    if (total > MAX_TOTAL) {
      showError('Total attachments exceed 50MB limit.', 'Attachment Error');
      return;
    }
    setAttachments(files);
  };
  const addInstallment = () => {
    const nextNum = (installments[installments.length - 1]?.installment_number || 0) + 1;
    const newId = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}_${Math.random()}`;
    setInstallments(prev => [...prev, { id: newId, installment_number: nextNum, due_date: '', amount_due: 0 }]);
  };
  const updateInstallment = (id: string, patch: Partial<InstallmentRow>) => {
    setInstallments(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };
  const removeInstallment = (id: string) => setInstallments(prev => prev.filter(r => r.id !== id));

  // Fetch categories and payment options on mount (client-side cached)
  useEffect(() => {
    console.log('[EFFECT] Loading globals (cached)');
    const load = async () => {
      try {
        const batch = await getRevenueGlobalsCached();
        const categoriesData = batch.categories || [];
        const statusesData = batch.payment_statuses || [];
        const methodsData = batch.payment_methods || [];

        setCategories(categoriesData);
        // Prefer Boundary, then Percentage, then Bus Rental, else first
        if (categoriesData.length > 0) {
          const normalize = (s: string) => s.replace(/_/g, ' ').trim();
          const pick =
            categoriesData.find((c: GlobalCategory) => normalize(c.name).toLowerCase() === 'boundary') ||
            categoriesData.find((c: GlobalCategory) => normalize(c.name).toLowerCase() === 'percentage') ||
            categoriesData.find((c: GlobalCategory) => normalize(c.name).toLowerCase() === 'bus rental') ||
            categoriesData[0];
          if (pick) {
            setFormData(prev => ({ ...prev, category_id: pick.category_id }));
          }
        }
        console.log('[DATA] Categories loaded:', categoriesData.length);

        setPaymentStatuses(statusesData);
        const pending = statusesData.find((s: any) => /^pending$/i.test(s.name)) || statusesData[0];
        if (pending) {
          setFormData(prev => ({ ...prev, payment_status_id: pending.id }));
        }

        setPaymentMethods(methodsData);
      } catch (error) {
        console.error('Error loading globals:', error);
        showError('Error', 'Failed to load dropdown values');
      }
    };
    load();
  }, []);

  const normalizeCategoryName = (name?: string) => (name || '').replace(/_/g, ' ').trim();
  const filteredAssignments = useMemo(() => {
    // Normalize by removing all non-alphanumeric characters and lowercasing.
    // Examples: 'Bus Rental' / 'bus_rental' / 'BUSRENTAL' -> 'busrental'
    const normalizeKey = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    return assignments
      .filter(a => {
        if (!formData.category_id) return false;
        const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
        if (!selectedCategory) return false;
        const selectedKey = normalizeKey(selectedCategory.name);
        const assignKey = normalizeKey(a.assignment_type);
        if (selectedKey === 'boundary') return assignKey === 'boundary';
        if (selectedKey === 'percentage') return assignKey === 'percentage';
        // For Bus Rental, include trips not Boundary/Percentage
        if (selectedKey === 'busrental') return assignKey === 'busrental' || !a.assignment_type;
        // For other categories, allow manual/non-trip entries (no assignment)
        return false;
      })
      .sort((a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime());
  }, [formData.category_id, categories, assignments]);

  // When assignment changes, auto-fill fields
  useEffect(() => {
    console.log('[EFFECT] Assignment effect triggered:', {
      assignment_id: formData.assignment_id,
      category_id: formData.category_id,
      assignmentsLength: assignments.length,
      categoriesLength: categories.length
    });
    if (formData.assignment_id && formData.assignment_id !== '') {
      const selectedAssignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      console.log('[EFFECT] Selected assignment found:', Boolean(selectedAssignment));
      if (selectedAssignment) {
        const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
        console.log('[EFFECT] Selected category:', selectedCategory?.name);
        // Always store total_amount as Operations.Sales (trip_revenue)
        const calculatedAmount = Number(selectedAssignment.trip_revenue) || 0;
        console.log('[EFFECT] Updating form with calculated amount:', calculatedAmount);
        
        // Convert assignment date to datetime-local format with current time
        const assignmentDate = new Date(selectedAssignment.date_assigned);
        const now = new Date();
        assignmentDate.setHours(now.getHours(), now.getMinutes());
        const year = assignmentDate.getFullYear();
        const month = String(assignmentDate.getMonth() + 1).padStart(2, '0');
        const day = String(assignmentDate.getDate()).padStart(2, '0');
        const hours = String(assignmentDate.getHours()).padStart(2, '0');
        const minutes = String(assignmentDate.getMinutes()).padStart(2, '0');
        const dateTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // Store original auto-filled values for deviation tracking
        setOriginalAutoFilledAmount(calculatedAmount);
        setOriginalAutoFilledDate(dateTimeLocal);
        
        setFormData(prev => ({
          ...prev,
          bus_trip_id: selectedAssignment.bus_trip_id || '',
          total_amount: calculatedAmount,
          collection_date: dateTimeLocal,
        }));
      }
    } else {
      // Reset original values when no assignment is selected
      setOriginalAutoFilledAmount(null);
      setOriginalAutoFilledDate('');
      setFormData(prev => ({ ...prev, bus_trip_id: '' }));
    }
  }, [formData.assignment_id, formData.category_id, assignments, categories]);


  // Calculate amount deviation
  const getAmountDeviation = () => {
    if (originalAutoFilledAmount === null || originalAutoFilledAmount === 0) return null;
    
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
      formattedPercentage: `${percentageChange.toFixed(1)}%`
    };
  };

  // Calculate date deviation
    const getDateDeviation = () => {
      if (!originalAutoFilledDate || !formData.collection_date) return null;
      
      const originalDate = new Date(originalAutoFilledDate);
      const currentDate = new Date(formData.collection_date);
      
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

  // Reset form when category changes

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('[EVENT] Input changed:', name, value);
    let newValue: string | number = value;
    if (name === 'total_amount') {
      // Ensure we handle the amount field correctly - convert to number but allow empty string for editing
      newValue = value === '' ? 0 : parseFloat(value) || 0;
    }
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[EVENT] Form submit:', formData);

    const { category_id, assignment_id, total_amount, collection_date, payment_status_id, payment_method_id, remarks, is_receivable, payer_name, due_date, interest_rate } = formData;

    if (!category_id || !collection_date || !currentUser) {
      await showEmptyFieldWarning();
      return;
    }

    if (!is_receivable) {
      if (!isValidAmount(total_amount)) {
        await showInvalidAmountAlert();
        return;
      }
    }

    // Remarks validation (5-500 characters)
    const trimmedRemarks = (remarks || '').trim();
    if (trimmedRemarks.length < 5 || trimmedRemarks.length > 500) {
      showError('Remarks must be between 5 and 500 characters.', 'Invalid Remarks');
      return;
    }

    // Payment status required; if Paid, then method required
    if (!payment_status_id) {
      showError('Payment status is required.', 'Missing Field');
      return;
    }
    // AR validations
    if (is_receivable) {
      if (!payer_name || payer_name.trim().length === 0) {
        showError('Payer name is required for receivables.', 'Missing Field');
        return;
      }
      if (!due_date) {
        showError('Due date is required for receivables.', 'Missing Field');
        return;
      }
      if (interest_rate < 0) {
        showError('Interest rate must be a non-negative number.', 'Invalid Field');
        return;
      }
      // Validate installments (optional but if provided they must be valid)
      for (const row of installments) {
        if (!row.due_date || Number(row.amount_due) <= 0) {
          showError('Each installment must have a due date and positive amount.', 'Invalid Installment');
          return;
        }
      }
    }
    const selStatus = paymentStatuses.find(s => s.id === payment_status_id);
    const isPaid = selStatus ? /^paid$/i.test(selStatus.name) : false;
    if (isPaid && !payment_method_id) {
      showError('Payment method is required when status is Paid.', 'Missing Field');
      return;
    }

    // --- ANTI-DUPLICATE CHECK (frontend) ---
    let duplicate = false;
    const selectedCategory = categories.find(cat => cat.category_id === category_id)?.name;
    if (formData.bus_trip_id && (selectedCategory === 'Boundary' || selectedCategory === 'Percentage' || selectedCategory === 'Bus Rental')) {
      duplicate = existingRevenues.some(r => r.bus_trip_id === formData.bus_trip_id && r.category_id === category_id);
    } else if (assignment_id) {
      duplicate = existingRevenues.some(r => r.assignment_id === assignment_id && r.collection_date === collection_date && r.category_id === category_id);
    } else {
      duplicate = existingRevenues.some(r => !r.assignment_id && r.category_id === category_id && r.total_amount === total_amount && r.collection_date === collection_date);
    }
    if (duplicate) {
      showError('Duplicate revenue record for this assignment/category and date already exists.', 'Error');
      return;
    }

    const result = await showAddConfirmation();

    if (result.isConfirmed) {
      try {
        await onAddRevenue({
          category_id,
          assignment_id,
          bus_trip_id: formData.bus_trip_id || undefined,
          total_amount,
          collection_date,
          created_by: currentUser,
          payment_status_id,
          payment_method_id: payment_method_id || undefined,
          remarks: trimmedRemarks,
          // AR
          ...(is_receivable ? {
            is_receivable: true,
            payer_name: payer_name.trim(),
            due_date,
            interest_rate,
            installments: installments.map((r, idx) => ({
              installment_number: r.installment_number || (idx + 1),
              due_date: r.due_date,
              amount_due: Number(r.amount_due)
            }))
          } : {}),
          // Attachments (optional)
          attachments: attachments.length > 0 ? attachments : undefined,
        });

        await showAddSuccess();
        onClose();
      } catch (error: unknown) {
        console.error('Error adding revenue:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showError('Failed to add revenue: ' + errorMessage, 'Error');
      }
    }
  };

  // Format assignment for display - similar to expense module
  const formatAssignment = (assignment: Assignment) => {
    // Defensive: handle undefined assignment
    if (!assignment) return '';
    let busType = 'N/A';
    if (assignment.bus_type) {
      if (assignment.bus_type === 'Aircon' || assignment.bus_type === 'Airconditioned') busType = 'A';
      else if (assignment.bus_type === 'Ordinary') busType = 'O';
      else busType = assignment.bus_type;
    }
    // Use driver_name and conductor_name directly from assignment
    const driverName = assignment.driver_name || 'N/A';
    const conductorName = assignment.conductor_name || 'N/A';
    // Calculate display amount based on selected category (Boundary/Percentage)
  const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
  // normalize by removing punctuation/spacing before passing to computeAutoAmount if it expects clean names
  const normalizedName = selectedCategory?.name ? selectedCategory.name.replace(/[^A-Za-z0-9]+/g, ' ').trim() : undefined;
    const displayAmount = computeAutoAmount(normalizedName, assignment);
    return `${formatDate(assignment.date_assigned)} | ₱ ${displayAmount.toLocaleString()} | ${assignment.bus_plate_number || 'N/A'} (${busType}) - ${assignment.bus_route} | ${driverName} & ${conductorName}`;
  };

  return (
    <div className="modalOverlay">
      <div className="addRevenueModal">
        <ModalHeader title="Add Revenue" onClose={onClose} />

        <form onSubmit={handleSubmit}>
          <div className="addRevenue_modalContent">
            <div className="formFieldsHorizontal">
              <div className="formInputs">

                <div className="formRow">
                  {/* CATEGORY */}
                  <div className="formField">
                    <label htmlFor="category_id">Category<span className='requiredTags'> *</span></label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('[EVENT] Category changed to:', value);
                        setFormData(prev => ({
                          ...prev,
                          category_id: value,
                          assignment_id: '',
                          total_amount: 0,
                          collection_date: getCurrentDateTimeLocal(), // Reset to current datetime
                        }));
                      }}
                      required
                      className="formSelect"
                    >
                      <option value="">Select Category</option>
                      {categories
                        .map((category) => (
                          <option key={category.category_id} value={category.category_id}>
                            {formatDisplayText(category.name)}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* ASSIGNMENT (required for all categories) */}
                  <div className="formField">
                    <label htmlFor="assignment_id">Source<span className='requiredTags'> *</span></label>
                    <button
                      type="button"
                      className="formSelect"
                      id='busSelector'
                      style={{ textAlign: "left", width: "100%" }}
                      onClick={() => { console.log('[EVENT] Open assignment selector modal'); setShowSourceSelector(true); }}
                      disabled={filteredAssignments.length === 0}
                    >
                      {formData.assignment_id
                        ? formatAssignment(assignments.find(a => a.assignment_id === formData.assignment_id)!)
                        : "Select Assignment"}
                    </button>
                    {filteredAssignments.length === 0 && formData.category_id && (
                      <div className="noAssignments">No assignments available for selected category</div>
                    )}
                    
                    {/* Add the modal */}
                    {showSourceSelector && (
                      <RevenueSourceSelector
                        assignments={assignments}
                        employees={[]}
                        categories={categories}
                        selectedCategoryId={formData.category_id}
                        onSelect={assignment => {
                          console.log('[MODAL] Assignment selected:', assignment.assignment_id);
                          // Auto-calc based on category: Boundary or Percentage; else trip_revenue
                          const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
                          const calculatedAmount = computeAutoAmount(selectedCategory?.name, assignment);
                          console.log('[MODAL] Setting form with amount:', calculatedAmount);
                          
                          // Convert assignment date to datetime-local format with current time
                          const assignmentDate = new Date(assignment.date_assigned);
                          const now = new Date();
                          assignmentDate.setHours(now.getHours(), now.getMinutes());
                          const year = assignmentDate.getFullYear();
                          const month = String(assignmentDate.getMonth() + 1).padStart(2, '0');
                          const day = String(assignmentDate.getDate()).padStart(2, '0');
                          const hours = String(assignmentDate.getHours()).padStart(2, '0');
                          const minutes = String(assignmentDate.getMinutes()).padStart(2, '0');
                          const dateTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
                          
                          setFormData(prev => ({
                            ...prev,
                            assignment_id: assignment.assignment_id,
                            bus_trip_id: assignment.bus_trip_id || '',
                            total_amount: calculatedAmount,
                            collection_date: dateTimeLocal,
                          }));
                        }}

                        onClose={() => { console.log('[EVENT] Close assignment selector modal'); setShowSourceSelector(false); }}
                        isOpen={showSourceSelector}
                      />
                    )}
                  </div>
                </div>

                <div className="formRow">
                  {/* AMOUNT - Make editable with auto-fill */}
                  <div className="formField">
                    <label htmlFor="amount">Total Amount<span className='requiredTags'> *</span></label>
                    <input
                      type="number"
                      id="total_amount"
                      name="total_amount"
                      value={formData.total_amount || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                      disabled={formData.is_receivable}
                      className="formInput"
                      placeholder="Enter amount"
                    />
                    {formData.assignment_id && (
                      <span className="autofill-note">Auto-calculated from assignment (editable)</span>
                    )}
                    {(() => {
                      if (!formData.assignment_id) return null;
                      const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
                      const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
                      if (!assignment) return null;
                      const { isLoss, lossAmount } = getBoundaryLossInfo(selectedCategory?.name, assignment);
                      if (!isLoss) return null;
                      return (
                        <div style={{ color: '#b02a37', marginTop: 6, fontSize: 12 }}>
                          Loss detected: assignment quota was not met. Trip revenue is {formatPeso(lossAmount)} less than assignment value.
                        </div>
                      );
                    })()}
                    {(() => {
                      const amountDeviation = getAmountDeviation();
                      return amountDeviation && (
                        <div className="deviation-note" style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                          <i className="ri-error-warning-line"></i> 
                          {amountDeviation.isIncrease ? '+' : '-'}{amountDeviation.formattedDifference} 
                          ({amountDeviation.isIncrease ? '+' : '-'}{amountDeviation.formattedPercentage}) 
                          from auto-filled amount
                        </div>
                      );
                    })()}
                  </div>

                  {/* DATE - Now includes time */}
                  <div className="formField">
                    <label htmlFor="collection_date">Collection Date & Time <span className='requiredTags'> *</span></label>
                    <input
                      type="datetime-local"
                      id="collection_date"
                      name="collection_date"
                      value={formData.collection_date}
                      onChange={handleInputChange}
                      required
                      className="formInput"
                      max={new Date().toISOString().slice(0, 16)} // Current datetime limit
                    />
                    {formData.assignment_id && (
                      <span className="autofill-note">Auto-filled from assignment date with current time (editable)</span>
                    )}
                    {(() => {
                      const dateDeviation = getDateDeviation();
                      return dateDeviation && (
                        <div className="deviation-note" style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                          <i className="ri-time-line"></i> 
                          {dateDeviation.deviationText} {dateDeviation.isLater ? 'after' : 'before'} auto-filled date
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* PAYMENT AND REMARKS */}
                <div className="formRow">
                  {/* PAYMENT STATUS */}
                  <div className="formField">
                    <label htmlFor="payment_status_id">Payment Status<span className='requiredTags'> *</span></label>
                    <select
                      id="payment_status_id"
                      name="payment_status_id"
                      value={formData.payment_status_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_status_id: e.target.value }))}
                      required
                      className="formSelect"
                    >
                      <option value="">Select Status</option>
                      {paymentStatuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {/* ACCOUNTS RECEIVABLE SECTION (moved out of select to avoid invalid DOM nesting) */}
                    <div className="formRow" style={{ marginTop: 8 }}>
                      <div className="formField">
                        <label htmlFor="is_receivable">Is Receivable?</label>
                        <input
                          type="checkbox"
                          id="is_receivable"
                          name="is_receivable"
                          checked={formData.is_receivable}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_receivable: e.target.checked }))}
                        />
                      </div>
                    </div>

                    {formData.is_receivable && (
                      <>
                        <div className="formRow">
                          <div className="formField">
                            <label htmlFor="payer_name">Payer Name<span className='requiredTags'> *</span></label>
                            <input
                              type="text"
                              id="payer_name"
                              name="payer_name"
                              value={formData.payer_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, payer_name: e.target.value }))}
                              className="formInput"
                              placeholder="Enter payer name"
                            />
                          </div>
                          <div className="formField">
                            <label htmlFor="due_date">Due Date<span className='requiredTags'> *</span></label>
                            <input
                              type="date"
                              id="due_date"
                              name="due_date"
                              value={formData.due_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                              className="formInput"
                            />
                          </div>
                        </div>

                        <div className="formRow">
                          <div className="formField">
                            <label htmlFor="interest_rate">Interest Rate (%)</label>
                            <input
                              type="number"
                              id="interest_rate"
                              name="interest_rate"
                              min={0}
                              step={0.01}
                              value={formData.interest_rate}
                              onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || 0 }))}
                              className="formInput"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="formField">
                            <label>Installments</label>
                            <div>
                              <button type="button" className="addButton" onClick={addInstallment}><i className="ri-add-line" /> Add Installment</button>
                            </div>
                          </div>
                        </div>

                        {installments.length > 0 && (
                          <div className="formRow">
                            <div className="formField" style={{ width: '100%' }}>
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Due Date</th>
                                    <th>Amount Due</th>
                                    <th>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {installments.map((row, idx) => (
                                    <tr key={row.id}>
                                      <td>
                                        <input type="number" min={1} step={1} value={row.installment_number}
                                          onChange={(e) => updateInstallment(row.id, { installment_number: parseInt(e.target.value) || idx + 1 })}
                                          className="formInput" style={{ maxWidth: 90 }} />
                                      </td>
                                      <td>
                                        <input type="date" value={row.due_date}
                                          onChange={(e) => updateInstallment(row.id, { due_date: e.target.value })}
                                          className="formInput" />
                                      </td>
                                      <td>
                                        <input type="number" min={0.01} step={0.01} value={row.amount_due || ''}
                                          onChange={(e) => updateInstallment(row.id, { amount_due: parseFloat(e.target.value) || 0 })}
                                          className="formInput" />
                                      </td>
                                      <td>
                                        <button type="button" className="deleteBtn" onClick={() => removeInstallment(row.id)} title="Remove"><i className="ri-delete-bin-line" /></button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* PAYMENT METHOD (required when Paid) */}
                  <div className="formField">
                    <label htmlFor="payment_method_id">Payment Method{(() => {
                      const sel = paymentStatuses.find(s => s.id === formData.payment_status_id);
                      return sel && /^paid$/i.test(sel.name) ? <span className='requiredTags'> *</span> : null;
                    })()}</label>
                    <select
                      id="payment_method_id"
                      name="payment_method_id"
                      value={formData.payment_method_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_method_id: e.target.value }))}
                      className="formSelect"
                    >
                      <option value="">Select Method</option>
                      {paymentMethods.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Attachments (optional) */}
                <div className="formRow">
                  <div className="formField" style={{ width: '100%' }}>
                    <label>Attachments (optional)</label>
                    <input type="file" multiple onChange={(e) => onSelectFiles(e.target.files)} />
                    {attachments.length > 0 && (
                      <div style={{ fontSize: 12, color: '#6c757d', marginTop: 6 }}>
                        {attachments.length} file(s) selected, total {attachments.reduce((s, f) => s + f.size, 0).toLocaleString()} bytes
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                      Allowed: PNG, JPG, JPEG, JFIF, PDF, DOCX, CSV, XLSX. Max total 50MB.
                    </div>
                  </div>
                </div>

                <div className="formRow">
                  {/* REMARKS */}
                  <div className="formField" style={{ width: '100%' }}>
                    <label htmlFor="remarks">Remarks<span className='requiredTags'> *</span></label>
                    <textarea
                      id="remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                      className="formInput"
                      placeholder="Enter remarks (5-500 characters)"
                      rows={3}
                    />
                    <div style={{ fontSize: 12, color: formData.remarks.trim().length < 5 || formData.remarks.trim().length > 500 ? '#b02a37' : '#6c757d' }}>
                      {formData.remarks.trim().length}/500
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="submit" className="addButton">
              <i className="ri-add-line" /> Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRevenue;