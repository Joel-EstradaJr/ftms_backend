// app\Components\editRevenue.tsx
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../../../styles/revenue/editRevenue.css";
import { getAssignmentById } from '@/lib/operations/assignments';
import { formatDate } from '../../../utility/dateFormatter';
import { getBoundaryLossInfo, computeAutoAmount } from '@/app/utils/revenueCalc';
import { validateField, ValidationRule, isValidAmount } from "../../../utility/validation";
import { getRevenueGlobalsCached } from '@/lib/clientStore';
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
    payment_status_name?: string;
    payment_method_name?: string;
    remarks?: string;
  };
  onClose: () => void;
  onSave: (updatedRecord: {
    revenue_id: string;
    collection_date: string;
    total_amount: number;
    category_id: string;
    source?: string;
    payment_status_id: string;
    payment_method_id?: string;
    remarks: string;
    // AR fields
    is_receivable?: boolean;
    payer_name?: string;
    due_date?: string;
    interest_rate?: number;
  }) => void;
  // Notify parent to refresh row's attachment count
  onAttachmentsChanged?: (delta: number) => void;
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

const EditRevenueModal: React.FC<EditProps> = ({ record, onClose, onSave, onAttachmentsChanged }) => {
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
  const [remarks, setRemarks] = useState<string>(record.remarks || '');
  const [originalTripRevenue, setOriginalTripRevenue] = useState<number | null>(null);
  const [deviationPercentage, setDeviationPercentage] = useState<number>(0);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({
    amount: [],
    collection_date: [],
    payment: [],
    remarks: [],
  });

  // Add state for categories and selectedCategoryId
  const [categories, setCategories] = useState<{category_id: string; name: string;}[]>([]);
  const selectedCategoryId = record.category_id;

  // Add state for assignment details
  const [assignment, setAssignment] = useState<AssignmentDisplay | null>(null);
  // Payment options
  const [paymentStatuses, setPaymentStatuses] = useState<{ id: string; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
  const [payment_status_id, setPaymentStatusId] = useState<string>('');
  const [payment_method_id, setPaymentMethodId] = useState<string>('');
  // Accounts Receivable (AR) state
  const [isReceivable, setIsReceivable] = useState<boolean>(false);
  const [payerName, setPayerName] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(''); // yyyy-MM-dd
  const [interestRate, setInterestRate] = useState<number>(0);
  const [installments, setInstallments] = useState<Array<{
    installment_id: string;
    installment_number: number;
    due_date: string;
    amount_due: number;
    amount_paid: number;
    payment_status?: { id: string; name: string } | null;
    payment_method?: { id: string; name: string } | null;
    paid_date?: string | null;
  }>>([]);
  // Attachments state
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    file_id?: string | null;
    path?: string | null;
    original_name: string;
    uploaded_at?: string;
    size_bytes?: number;
    mime_type?: string;
  }>>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  // 1. Store original initial amount and date for deviation calculation
  const [originalAutoFilledAmount, setOriginalAutoFilledAmount] = useState<number | null>(null);
  const [originalAutoFilledDate, setOriginalAutoFilledDate] = useState<string>('');

  // Fetch categories on mount (cached)
  useEffect(() => {
    const load = async () => {
      try {
        const g = await getRevenueGlobalsCached();
        setCategories(g.categories || []);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  // Fetch payment options on mount (cached) and initialize by names
  useEffect(() => {
    const load = async () => {
      try {
        const g = await getRevenueGlobalsCached();
        const statuses = g.payment_statuses || [];
        const methods = g.payment_methods || [];
        setPaymentStatuses(statuses);
        setPaymentMethods(methods);
        const byStatus = statuses.find((s: any) => s.name?.toLowerCase() === (record.payment_status_name || '').toLowerCase());
        const pending = statuses.find((s: any) => /^pending$/i.test(s.name));
        setPaymentStatusId(byStatus?.id || pending?.id || '');
        const byMethod = methods.find((m: any) => m.name?.toLowerCase() === (record.payment_method_name || '').toLowerCase());
        setPaymentMethodId(byMethod?.id || '');
      } catch {
        // ignore
      }
    };
    load();
  }, [record.payment_status_name, record.payment_method_name]);

  // Fetch full revenue details to populate AR fields and installments
  useEffect(() => {
    const fetchRevenueDetails = async () => {
      try {
        const res = await fetch(`/api/revenues/${record.revenue_id}`);
        if (!res.ok) return; // optional
        const data = await res.json();
        if (typeof data.is_receivable === 'boolean') setIsReceivable(!!data.is_receivable);
        if (typeof data.payer_name === 'string') setPayerName(data.payer_name || '');
        if (data.due_date) {
          // Convert to yyyy-MM-dd for input=date
          const d = new Date(data.due_date);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setDueDate(ym);
        }
        if (data.interest_rate !== undefined && data.interest_rate !== null) setInterestRate(Number(data.interest_rate) || 0);
        if (Array.isArray(data.installments)) {
          setInstallments(
            data.installments.map((it: any) => ({
              installment_id: it.installment_id || `${it.revenue_id}-${it.installment_number}`,
              installment_number: it.installment_number,
              due_date: it.due_date,
              amount_due: Number(it.amount_due) || 0,
              amount_paid: Number(it.amount_paid) || 0,
              payment_status: it.payment_status || null,
              payment_method: it.payment_method || null,
              paid_date: it.paid_date || null,
            }))
          );
        }
      } catch {
        // ignore
      }
    };
    fetchRevenueDetails();
  }, [record.revenue_id]);

  // Fetch attachments for this revenue
  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const res = await fetch(`/api/revenues/${encodeURIComponent(record.revenue_id)}/attachments`);
        if (!res.ok) return;
        const items = await res.json();
        setAttachments(Array.isArray(items) ? items : []);
      } catch {
        setAttachments([]);
      }
    };
    fetchAttachments();
  }, [record.revenue_id]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      Array.from(files).forEach(f => form.append('files', f));
      const res = await fetch(`/api/revenues/${encodeURIComponent(record.revenue_id)}/attachments`, { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
  const data = await res.json();
  const created = Array.isArray(data.attachments) ? data.attachments : [];
  setAttachments(prev => [...created, ...prev]);
  if (onAttachmentsChanged && created.length > 0) onAttachmentsChanged(created.length);
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    try {
      const res = await fetch(`/api/revenues/attachments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
  setAttachments(prev => prev.filter(a => a.id !== id));
  if (onAttachmentsChanged) onAttachmentsChanged(-1);
    } catch {
      // simple alert; keep UX minimal here
      alert('Failed to delete attachment');
    }
  };

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
            const calculatedAmount = data.trip_revenue || 0;
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
    // If AR, amount editing is disabled; guard just in case
    if (isReceivable) return;
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

  const validatePaymentAndRemarks = (): boolean => {
    // Remarks 5-500
    const trimmed = (remarks || '').trim();
    const errs: string[] = [];
    if (trimmed.length < 5 || trimmed.length > 500) {
      errs.push('Remarks must be between 5 and 500 characters.');
    }
    // Status required
    if (!payment_status_id) {
      errs.push('Payment status is required.');
    }
    // If Paid, method required
    const sel = paymentStatuses.find(s => s.id === payment_status_id);
    const isPaid = sel ? /^paid$/i.test(sel.name) : false;
    if (isPaid && !payment_method_id) {
      errs.push('Payment method is required when status is Paid.');
    }
    // AR validations
    if (isReceivable) {
      if (!payerName || payerName.trim().length < 2) {
        errs.push('Payer name must be at least 2 characters when marked as Accounts Receivable.');
      }
      if (!dueDate) {
        errs.push('Due date is required when marked as Accounts Receivable.');
      }
      if (interestRate < 0 || interestRate > 100) {
        errs.push('Interest rate must be between 0 and 100.');
      }
    }
    setErrors(prev => ({ ...prev, payment: errs, remarks: trimmed.length < 5 || trimmed.length > 500 ? ['Invalid remarks'] : [] }));
    return errs.length === 0;
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

    if (!validatePaymentAndRemarks()) {
      await Swal.fire({
        title: 'Validation Error',
        text: 'Please correct payment and remarks before saving',
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
        payment_status_id,
        payment_method_id: payment_method_id || undefined,
        remarks: (remarks || '').trim(),
        // AR fields
        ...(isReceivable ? {
          is_receivable: true,
          payer_name: payerName.trim(),
          due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
          interest_rate: Number(interestRate) || 0,
        } : { is_receivable: false })
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
                      disabled={isReceivable}
                    />
                    {errors.amount?.map((msg, i) => (
                      <div key={i} className="error-message">{msg}</div>
                    ))}
                    {assignment ? (
                      <span className="autofill-note">Auto-calculated from assignment (editable)</span>
                    ) : null}
                    {isReceivable ? (
                      <div className="deviation-note" style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px' }}>
                        Amount is managed via installments for Accounts Receivable records.
                      </div>
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

                {/* PAYMENT AND REMARKS */}
                <div className="formRow">
                  {/* PAYMENT STATUS */}
                  <div className="formField">
                    <label htmlFor="payment_status_id">Payment Status<span className='requiredTags'> *</span></label>
                    <select
                      id="payment_status_id"
                      name="payment_status_id"
                      value={payment_status_id}
                      onChange={(e) => setPaymentStatusId(e.target.value)}
                      className="formSelect"
                      required
                    >
                      <option value="">Select Status</option>
                      {paymentStatuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {errors.payment?.map((msg, i) => (
                      <div key={i} className="error-message">{msg}</div>
                    ))}
                  </div>

                  {/* PAYMENT METHOD (conditional req) */}
                  <div className="formField">
                    <label htmlFor="payment_method_id">Payment Method{(() => {
                      const sel = paymentStatuses.find(s => s.id === payment_status_id);
                      return sel && /^paid$/i.test(sel.name) ? <span className='requiredTags'> *</span> : null;
                    })()}</label>
                    <select
                      id="payment_method_id"
                      name="payment_method_id"
                      value={payment_method_id}
                      onChange={(e) => setPaymentMethodId(e.target.value)}
                      className="formSelect"
                      disabled={!paymentStatuses.find(s => s.id === payment_status_id) || !/^paid$/i.test(paymentStatuses.find(s => s.id === payment_status_id)?.name || '')}
                    >
                      <option value="">Select Method</option>
                      {paymentMethods.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Accounts Receivable Section */}
                <div className="formRow">
                  <div className="formField" style={{ width: '100%' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={isReceivable}
                        onChange={(e) => setIsReceivable(e.target.checked)}
                        disabled={installments.length > 0}
                        style={{ marginRight: 8 }}
                      />
                      Mark as Accounts Receivable
                    </label>
                    {installments.length > 0 && (
                      <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                        Installments exist; toggle is locked. Edit installments in a dedicated screen.
                      </div>
                    )}
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="formRow">
                  <div className="formField" style={{ width: '100%' }}>
                    <label>Attachments</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                      <input type="file" multiple onChange={(e) => handleUpload(e.target.files)} />
                      {uploading ? <span style={{ color: '#6c757d' }}>Uploading...</span> : null}
                      {uploadError ? <span style={{ color: '#b02a37' }}>{uploadError}</span> : null}
                    </div>
                    {attachments.length === 0 ? (
                      <div style={{ color: '#6c757d' }}>No attachments uploaded.</div>
                    ) : (
                      <ul>
                        {attachments.map(att => (
                          <li key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {att.file_id ? (
                              <a href={`/api/revenues/attachments/${att.id}/download`} target="_blank" rel="noreferrer">{att.original_name}</a>
                            ) : (
                              <a href={att.path || '#'} target="_blank" rel="noreferrer">{att.original_name || att.path}</a>
                            )}
                            <button type="button" className="deleteBtn" title="Delete" onClick={() => handleDeleteAttachment(att.id)}>
                              <i className="ri-delete-bin-line" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {isReceivable && (
                  <>
                    <div className="formRow">
                      <div className="formField">
                        <label htmlFor="payer_name">Payer Name<span className='requiredTags'> *</span></label>
                        <input
                          type="text"
                          id="payer_name"
                          name="payer_name"
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                          className="formInput"
                          placeholder="Enter payer name"
                        />
                      </div>
                      <div className="formField">
                        <label htmlFor="due_date">Overall Due Date<span className='requiredTags'> *</span></label>
                        <input
                          type="date"
                          id="due_date"
                          name="due_date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="formInput"
                        />
                      </div>
                      <div className="formField">
                        <label htmlFor="interest_rate">Interest Rate (%)</label>
                        <input
                          type="number"
                          id="interest_rate"
                          name="interest_rate"
                          value={interestRate}
                          onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                          step="0.01"
                          className="formInput"
                        />
                      </div>
                    </div>

                    {/* Installments (read-only) */}
                    {installments.length > 0 && (
                      <div className="formRow">
                        <div className="formField" style={{ width: '100%' }}>
                          <label>Installments</label>
                          <div className="tableWrapper">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Due Date</th>
                                  <th>Amount Due</th>
                                  <th>Amount Paid</th>
                                  <th>Status</th>
                                  <th>Method</th>
                                  <th>Paid Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {installments.map((inst) => (
                                  <tr key={inst.installment_id}>
                                    <td>{inst.installment_number}</td>
                                    <td>{formatDate(inst.due_date)}</td>
                                    <td>₱ {Number(inst.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>₱ {Number(inst.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{inst.payment_status?.name || '-'}</td>
                                    <td>{inst.payment_method?.name || '-'}</td>
                                    <td>{inst.paid_date ? formatDate(inst.paid_date) : '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="formRow">
                  {/* REMARKS */}
                  <div className="formField" style={{ width: '100%' }}>
                    <label htmlFor="remarks">Remarks<span className='requiredTags'> *</span></label>
                    <textarea
                      id="remarks"
                      name="remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="formInput"
                      placeholder="Enter remarks (5-500 characters)"
                      rows={3}
                    />
                    <div style={{ fontSize: 12, color: remarks.trim().length < 5 || remarks.trim().length > 500 ? '#b02a37' : '#6c757d' }}>
                      {remarks.trim().length}/500
                    </div>
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