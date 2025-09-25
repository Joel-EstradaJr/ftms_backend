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
    source_ref?: string; // free-form source for non-ops categories
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
    source_ref: '',
  });

  // Fetch categories on component mount
  useEffect(() => {
    console.log('[EFFECT] Fetching categories');
    const fetchGlobals = async () => {
      try {
        const categoriesResponse = await fetch('/api/globals/categories?module=revenue');

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
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
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        showError('Error', 'Failed to load categories');
      }
    };

    fetchGlobals();
  }, []);

  const normalizeCategoryName = (name?: string) => (name || '').replace(/_/g, ' ').trim();

  // Filter assignments based on selected category
  const filteredAssignments = useMemo(() => {
    return assignments
      .filter(a => {
        if (!formData.category_id) return false;
  const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
        if (!selectedCategory) return false;
        const selectedName = normalizeCategoryName(selectedCategory.name);
        if (selectedName === 'Boundary') return a.assignment_type === 'Boundary';
        if (selectedName === 'Percentage') return a.assignment_type === 'Percentage';
        // For Bus Rental, include trips not Boundary/Percentage
        if (selectedName === 'Bus Rental') return a.assignment_type === 'Bus Rental' || !a.assignment_type;
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

    const { category_id, assignment_id, total_amount, collection_date } = formData;

    if (!category_id || !collection_date || !currentUser) {
      await showEmptyFieldWarning();
      return;
    }

    if (!isValidAmount(total_amount)) {
      await showInvalidAmountAlert();
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
          source_ref: !formData.bus_trip_id ? formData.source_ref || undefined : undefined,
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
    const displayAmount = computeAutoAmount(selectedCategory?.name, assignment);
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