// app\Components\editRevenue.tsx
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../../styles/revenue/editRevenue.css";
import { getAssignmentById } from '@/lib/operations/assignments';
import { formatDate } from '../../utility/dateFormatter';
import { getBoundaryLossInfo, computeAutoAmount } from '@/app/utils/revenueCalc';
import { validateField, ValidationRule, isValidAmount } from "../../utility/validation";
import ModalHeader from '@/app/Components/ModalHeader';

type EditProps = {
  record: {
    revenue_id: string;
    collection_date: string;
    category: string;
    amount: number;
    assignment_id?: string;
    category_id: string;
    source?: string;
  };
  onClose: () => void;
  onSave: (updatedRecord: {
    revenue_id: string;
    collection_date: string;
    total_amount: number;
    category_id: string;
    source?: string;
  }) => void;
};

// Define a minimal Assignment type
interface AssignmentDisplay {
  assignment_id: string;
  bus_type?: string;
  date_assigned?: string;
  trip_revenue?: number;
  assignment_value?: number;
  bus_plate_number?: string;
  bus_route?: string;
  driver_name?: string;
  conductor_name?: string;
}

const EditRevenueModal: React.FC<EditProps> = ({ record, onClose, onSave }) => {
  // Convert collection_date to datetime-local format for input
  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [collection_date, setDate] = useState(formatDateTimeLocal(record.collection_date));
  const [amount, setAmount] = useState(record.amount);
  const [originalTripRevenue, setOriginalTripRevenue] = useState<number | null>(null);
  const [deviationPercentage, setDeviationPercentage] = useState<number>(0);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({
    amount: [],
    collection_date: []
  });

  // Add state for categories and selectedCategoryId
  const [categories, setCategories] = useState<{category_id: string; name: string;}[]>([]);
  const selectedCategoryId = record.category_id;

  // Add state for assignment details
  const [assignment, setAssignment] = useState<AssignmentDisplay | null>(null);

  // 1. Store original initial amount and date for deviation calculation
  const [originalAutoFilledAmount, setOriginalAutoFilledAmount] = useState<number | null>(null);
  const [originalAutoFilledDate, setOriginalAutoFilledDate] = useState<string>('');

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/globals/categories?module=revenue');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const categoriesData = await response.json();
        setCategories(categoriesData);
      } catch {
        // handle error
      }
    };
    fetchCategories();
  }, []);

  // 2. On mount, fetch assignment and set original initial values
  useEffect(() => {
    const fetchAssignment = async () => {
      if (record.assignment_id) {
        try {
          const res = await fetch(`/api/assignments/${record.assignment_id}`);
          if (res.ok) {
            const data = await res.json();
            setAssignment(data);
            
            // total_amount is stored as Operations.Sales; default reference amount is trip_revenue
            let calculatedAmount = data.trip_revenue || 0;
            setOriginalAutoFilledAmount(calculatedAmount);
            
            // Set original date to assignment date with current time (like AddRevenue)
            if (data.date_assigned) {
              const assignmentDate = new Date(data.date_assigned);
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
      } else {
        setAssignment(null);
      }
    };
    fetchAssignment();
  }, [record.assignment_id, selectedCategoryId, categories]);

  // Fix: Update validation rules to match ValidationRule type signature and schema
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
    collection_date: { 
      required: true, 
      label: "Collection Date & Time",
      custom: (value: unknown) => {
        if (typeof value === 'string' && value) {
          const selectedDateTime = new Date(value);
          const now = new Date();
          if (selectedDateTime > now) {
            return "Collection date and time cannot be in the future";
          }
        }
        return null;
      }
    }
  };

  useEffect(() => {
    const fetchAssignmentData = async () => {
      if (record.assignment_id) {
        try {
          const assignmentData = await getAssignmentById(record.assignment_id);
          if (assignmentData?.trip_revenue) {
            setOriginalTripRevenue(Number(assignmentData.trip_revenue));
            // Calculate initial deviation
            const deviation = Math.abs((record.amount - Number(assignmentData.trip_revenue)) / Number(assignmentData.trip_revenue) * 100);
            setDeviationPercentage(deviation);
            setShowDeviationWarning(deviation > 10);
          }
        } catch {
          // handle error
        }
      }
    };

    fetchAssignmentData();
  }, [record.assignment_id, record.amount]);

  const handleAmountChange = (newAmount: number) => {
    // Fix: Handle NaN case properly
    if (isNaN(newAmount)) {
      setErrors(prev => ({
        ...prev,
        amount: ['Amount is required.']
      }));
      setAmount(0);
      return;
    }

    setAmount(newAmount);
    
    // Validate the amount using the validation utility
    setErrors(prev => ({
      ...prev,
      amount: validateField(newAmount, validationRules.amount)
    }));

    // Calculate deviation if original trip revenue exists
    if (originalTripRevenue && originalTripRevenue > 0) {
      const deviation = Math.abs((newAmount - originalTripRevenue) / originalTripRevenue * 100);
      setDeviationPercentage(deviation);
      setShowDeviationWarning(deviation > 10);
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setErrors(prev => ({
      ...prev,
      collection_date: validateField(newDate, validationRules.collection_date)
    }));
  };

  const handleSave = async () => {
    // Validate all fields using the validation utility
    const newErrors: Record<string, string[]> = {};
    Object.keys(validationRules).forEach(fieldName => {
      const value = fieldName === 'amount' ? amount :
                    fieldName === 'collection_date' ? collection_date : null;
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

    let confirmMessage = 'Do you want to save the changes to this record?';
    if (showDeviationWarning) {
      confirmMessage = `Warning: The amount deviates by ${deviationPercentage.toFixed(2)}% from the original trip revenue. Do you want to proceed?`;
    }

    const result = await Swal.fire({
      title: 'Save Changes?',
      text: confirmMessage,
      icon: showDeviationWarning ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, save it!',
      cancelButtonText: 'Cancel',
      background: 'white',
    });

    if (result.isConfirmed) {
      onSave({
        revenue_id: record.revenue_id,
        collection_date, // This will be in datetime-local format
        total_amount: amount,
        category_id: selectedCategoryId,
        source: record.source,
      });
    }
  };

  // Add a formatAssignment function (copy from AddRevenue or similar)
  const formatAssignment = (assignment: AssignmentDisplay | null) => {
    if (!assignment) return 'N/A';
    let busType = 'N/A';
    if (assignment.bus_type) {
      if (assignment.bus_type === 'Aircon' || assignment.bus_type === 'Airconditioned') busType = 'A';
      else if (assignment.bus_type === 'Ordinary') busType = 'O';
      else busType = assignment.bus_type;
    }
    const driverName = assignment.driver_name || 'N/A';
    const conductorName = assignment.conductor_name || 'N/A';
    
    // Calculate display amount based on category type (matching page.tsx logic)
    const selectedCategory = categories.find(cat => cat.category_id === selectedCategoryId);
    const displayAmount = computeAutoAmount(selectedCategory?.name, assignment as any);
    
    return `${assignment.date_assigned ? assignment.date_assigned.split('T')[0] : 'N/A'} | ₱ ${displayAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'} | ${assignment.bus_plate_number || 'N/A'} (${busType}) - ${assignment.bus_route || 'N/A'} | ${driverName} & ${conductorName}`;
  };

  // 3. Amount deviation calculation (same as AddRevenue)
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

  // 4. Date deviation calculation (same as AddRevenue)
  const getDateDeviation = () => {
    if (!originalAutoFilledDate || !collection_date) return null;
    const originalDate = new Date(originalAutoFilledDate);
    const currentDate = new Date(collection_date);
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
      <div className="editRevenueModal">
        <ModalHeader title="Edit Revenue" onClose={onClose} />

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="editRevenue_modalContent">
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
                      value={categories.find(cat => cat.category_id === selectedCategoryId)?.name || record.category || ''}
                      readOnly
                      className="formInput"
                    />
                  </div>
                  {/* ASSIGNMENT (read-only) */}
                  <div className="formField">
                    <label htmlFor="assignment_id">Assignment</label>
                    <input
                      type="text"
                      id="assignment_id"
                      name="assignment_id"
                      value={formatAssignment(assignment)}
                      readOnly
                      className="formInput"
                    />
                  </div>
                </div>

                <div className="formRow">
                  {/* COLLECTION DATE & TIME */}
                  <div className="formField">
                    <label htmlFor="collection_date">Collection Date & Time <span className='requiredTags'> *</span></label>
                    <input
                      type="datetime-local"
                      id="collection_date"
                      name="collection_date"
                      value={collection_date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      required
                      className={`formInput${errors.collection_date?.length ? ' input-error' : ''}`}
                      max={new Date().toISOString().slice(0, 16)} // Current datetime limit
                    />
                    {errors.collection_date?.map((msg, i) => (
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
                    <label htmlFor="amount">Remitted Amount<span className='requiredTags'> *</span></label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={amount || ''}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.0001" // Align with schema Decimal(20,4)
                      required
                      className={`formInput${errors.amount?.length ? ' input-error' : ''}`}
                    />
                    {errors.amount?.map((msg, i) => (
                      <div key={i} className="error-message">{msg}</div>
                    ))}
                    {assignment ? (
                      <span className="autofill-note">Auto-calculated from assignment (editable)</span>
                    ) : null}
                    {(() => {
                      if (!assignment) return null;
                      const selectedCategory = categories.find(cat => cat.category_id === selectedCategoryId);
                      const { isLoss, lossAmount } = getBoundaryLossInfo(selectedCategory?.name, assignment as any);
                      if (!isLoss) return null;
                      return (
                        <div className="deviation-note" style={{ color: '#b02a37', fontSize: '12px', marginTop: '4px' }}>
                          <i className="ri-error-warning-line"></i>
                          Loss detected: assignment quota was not met. Trip revenue is ₱{lossAmount.toLocaleString()} less than assignment value.
                        </div>
                      );
                    })()}
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

                {/* Source */}
                {record.source && (
                  <div className="sourceSection">
                    <div className="sourceBox">
                      <span className="sourceLabel">Source:</span>
                      <span className="sourceValue">{record.source}</span>
                    </div>
                  </div>
                )}

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

export default EditRevenueModal;