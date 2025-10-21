/* ──────────────────────────────────────────────────────────────
   File: app/Components/editExpense.tsx
   Desc: Edit-Expense modal – mirrors Add-Expense UI/logic
   ──────────────────────────────────────────────────────────── */
'use client';

import React, { useState, useEffect} from 'react';
import '../../../styles/expense/editExpense.css';
import { getAssignmentById } from '@/lib/operations/assignments';
import { validateField, ValidationRule, isValidAmount } from "../../../utils/validation";
import type { Assignment } from '@/lib/operations/assignments';
import ModalHeader from '../../../Components/ModalHeader';
import Swal from "sweetalert2";
import { showSuccess, showError, showConfirmation } from '../../../utils/Alerts';
import ReimbursementBreakdownForm from '../../../Components/ReimbursementBreakdownForm';

/* ───── types ──────────────────────────────────────────────── */
export type ExpenseData = {
  expense_id: string;
  date: string;
  department_from: string;
  category: string;
  total_amount: number;
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
    id: string;
    expense_id: string;
    expenseCode?: string;
    description?: string;
    amount: number;
    transactionDate: string;
    expense_date: string;
    category: {
      category_id: string;
      id: string;
      name: string;
    };
    total_amount: number;
    paymentMethod?: {
      id: string;
      name: string;
      methodName?: string;
    };
    payment_method: {
      id: string;
      name: string;
    };
    vendorName?: string;
    vendorId?: string;
    busTripCache?: {
      id: number;
      assignmentId: string;
      busPlateNumber: string;
      busRoute: string;
      busType: string;
      driverName: string;
      driverEmployeeNumber: string;
      conductorName: string;
      conductorEmployeeNumber: string;
    };
    assignment_id?: string;
    assignment?: Assignment;
    source?: { source_id?: string; name: string };
    reimbursements?: Reimbursement[];
    isReimbursement?: boolean;
    isPayable?: boolean;
    payableDueDate?: string;
    accountsPayable?: {
      status: string;
      dueDate?: string;
      paidDate?: string;
    };
  };
  onClose: () => void;
  onSave: (updatedRecord: any) => void;
};

/* ───── component ──────────────────────────────────────────── */
const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  record,
  onClose,
  onSave
}) => {
  // ─────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    description: record.description || '',
    amount: (record.amount || record.total_amount)?.toString() || '',
    transactionDate: record.transactionDate || record.expense_date ? new Date(record.transactionDate || record.expense_date).toISOString().slice(0, 16) : '',
    paymentMethodId: (record.paymentMethod?.id || record.payment_method?.id)?.toString() || '',
    vendorName: record.vendorName || '',
    vendorId: record.vendorId || '',
    payableDueDate: record.payableDueDate || record.accountsPayable?.dueDate ? new Date(record.payableDueDate || record.accountsPayable?.dueDate || '').toISOString().slice(0, 10) : '',
  });

  // Reimbursement state
  const [driverReimbursement, setDriverReimbursement] = useState('0');
  const [conductorReimbursement, setConductorReimbursement] = useState('0');
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPaymentMethods();
    initializeReimbursements();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/expense/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    }
  };

  const initializeReimbursements = () => {
    if (record.reimbursements && record.reimbursements.length > 0) {
      const driver = record.reimbursements.find((r: any) => 
        r.employee_name?.toLowerCase().includes('driver') || 
        r.employee_id === record.busTripCache?.driverEmployeeNumber
      );
      const conductor = record.reimbursements.find((r: any) => 
        r.employee_name?.toLowerCase().includes('conductor') || 
        r.employee_id === record.busTripCache?.conductorEmployeeNumber
      );
      
      if (driver) setDriverReimbursement(driver.amount?.toString() || '0');
      if (conductor) setConductorReimbursement(conductor.amount?.toString() || '0');
    }
  };

  // ─────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Description required
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    // Amount validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Transaction date required
    if (!formData.transactionDate) {
      newErrors.transactionDate = 'Transaction date is required';
    }

    // Check if date is in the future
    if (new Date(formData.transactionDate) > new Date()) {
      newErrors.transactionDate = 'Transaction date cannot be in the future';
    }

    // Payment method required
    if (!formData.paymentMethodId) {
      newErrors.paymentMethodId = 'Payment method is required';
    }

    // If has reimbursements, validate reimbursement amounts
    if (record.isReimbursement && record.reimbursements && record.reimbursements.length > 0) {
      const driver = parseFloat(driverReimbursement) || 0;
      const conductor = parseFloat(conductorReimbursement) || 0;
      const total = driver + conductor;
      const expenseAmount = parseFloat(formData.amount) || 0;

      if (Math.abs(total - expenseAmount) > 0.01) {
        newErrors.reimbursement = `Reimbursement total (₱${total.toFixed(2)}) must equal expense amount (₱${expenseAmount.toFixed(2)})`;
      }

      // Check if any reimbursement is disbursed
      const hasDisbursed = record.reimbursements.some((r: any) => r.status?.name === 'DISBURSED' || r.status?.id === 'DISBURSED');
      const currentAmount = record.amount || record.total_amount;
      if (hasDisbursed && parseFloat(formData.amount) !== currentAmount) {
        newErrors.amount = 'Cannot change amount - reimbursements have been disbursed';
      }
    }

    // If payable and paid, cannot edit amount
    if (record.isPayable && record.accountsPayable?.status === 'PAID') {
      const currentAmount = record.amount || record.total_amount;
      if (parseFloat(formData.amount) !== currentAmount) {
        newErrors.amount = 'Cannot change amount - payable has been paid';
      }
    }

    // If payable, due date required
    if (record.isPayable && !formData.payableDueDate) {
      newErrors.payableDueDate = 'Due date is required for accounts payable';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Please fix the errors in the form', 'Validation Error');
      return;
    }

    setLoading(true);

    try {
      // Build update payload
      const payload: any = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        transactionDate: new Date(formData.transactionDate).toISOString(),
        paymentMethodId: parseInt(formData.paymentMethodId),
      };

      // Add optional fields
      if (formData.vendorName) {
        payload.vendorName = formData.vendorName;
      }

      if (formData.vendorId) {
        payload.vendorId = formData.vendorId;
      }

      // Update reimbursements if applicable
      if (record.isReimbursement && record.busTripCache) {
        payload.reimbursements = [
          {
            employeeNumber: record.busTripCache.driverEmployeeNumber || 'UNKNOWN',
            employeeName: record.busTripCache.driverName || 'Driver',
            department: 'Operations',
            claimedAmount: parseFloat(driverReimbursement),
          },
          {
            employeeNumber: record.busTripCache.conductorEmployeeNumber || 'UNKNOWN',
            employeeName: record.busTripCache.conductorName || 'Conductor',
            department: 'Operations',
            claimedAmount: parseFloat(conductorReimbursement),
          },
        ];
      }

      // Update payable due date if applicable
      if (record.isPayable && formData.payableDueDate) {
        payload.payableDueDate = new Date(formData.payableDueDate).toISOString();
      }

      // Call parent handler with expense ID
      await onSave({
        ...payload,
        expense_id: record.id,
      });
      
    } catch (err: any) {
      console.error('Error updating expense:', err);
      showError(err.message, 'Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  // Format bus trip for display
  const formatBusTripDisplay = () => {
    if (!record.busTripCache) return 'N/A';
    
    const { busPlateNumber, busRoute, busType, driverName, conductorName } = record.busTripCache;
    const busTypeCode = busType?.toLowerCase() === 'aircon' || busType?.toLowerCase() === 'airconditioned' ? 'A' : 'O';
    
    return `${busPlateNumber} (${busTypeCode}) - ${busRoute} | ${driverName} & ${conductorName}`;
  };

  return (
    <div className="modalOverlay">
      <div className="editExpenseModal">
        <ModalHeader 
          title="Edit Expense" 
          onClose={onClose} 
          showDateTime={true} 
        />

        <form onSubmit={handleSubmit}>
          <div className="editExpense_modalContent">
            <div className="formFieldsHorizontal">
              <div className="formInputs">

                <div className="formRow">
                  {/* CATEGORY (read-only) */}
                  <div className="formField">
                    <label htmlFor="category">Category</label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={record.category?.name || 'N/A'}
                      readOnly
                      className="formInput"
                      style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                    />
                  </div>
                  {/* REFERENCE (read-only) */}
                  <div className="formField">
                    <label htmlFor="reference">Bus Trip Reference</label>
                    <input
                      type="text"
                      id="reference"
                      name="reference"
                      value={formatBusTripDisplay()}
                      readOnly
                      className="formInput"
                      style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div className="formField">
                  <label htmlFor="description">Description<span className='requiredTags'> *</span></label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    className={`formInput ${errors.description ? 'input-error' : ''}`}
                    rows={3}
                  />
                  {errors.description && <span className="error-message">{errors.description}</span>}
                </div>

                <div className="formRow">
                  {/* EXPENSE DATE & TIME */}
                  <div className="formField">
                    <label htmlFor="transactionDate">Transaction Date & Time <span className='requiredTags'> *</span></label>
                    <input
                      type="datetime-local"
                      id="transactionDate"
                      name="transactionDate"
                      value={formData.transactionDate}
                      onChange={handleInputChange}
                      required
                      className={`formInput ${errors.transactionDate ? 'input-error' : ''}`}
                    />
                    {errors.transactionDate && <span className="error-message">{errors.transactionDate}</span>}
                  </div>

                  {/* AMOUNT */}
                  <div className="formField">
                    <label htmlFor="amount">Amount<span className='requiredTags'> *</span></label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                      className={`formInput ${errors.amount ? 'input-error' : ''}`}
                    />
                    {errors.amount && <span className="error-message">{errors.amount}</span>}
                  </div>
                </div>

                {/* PAYMENT METHOD */}
                <div className="formField">
                  <label htmlFor="paymentMethodId">Payment Method<span className='requiredTags'> *</span></label>
                  <select
                    id="paymentMethodId"
                    name="paymentMethodId"
                    value={formData.paymentMethodId}
                    onChange={handleInputChange}
                    required
                    className={`formSelect ${errors.paymentMethodId ? 'input-error' : ''}`}
                  >
                    <option value="">Select Payment Method</option>
                    {paymentMethods.map(m => (
                      <option key={m.id} value={m.id}>{m.methodName}</option>
                    ))}
                  </select>
                  {errors.paymentMethodId && <span className="error-message">{errors.paymentMethodId}</span>}
                </div>

                {/* VENDOR INFORMATION (for non-bus trip expenses) */}
                {!record.busTripCache && (
                  <>
                    <div className="formField">
                      <label htmlFor="vendorName">Vendor Name</label>
                      <input
                        type="text"
                        id="vendorName"
                        name="vendorName"
                        value={formData.vendorName}
                        onChange={handleInputChange}
                        className="formInput"
                      />
                    </div>
                    <div className="formField">
                      <label htmlFor="vendorId">Vendor ID</label>
                      <input
                        type="text"
                        id="vendorId"
                        name="vendorId"
                        value={formData.vendorId}
                        onChange={handleInputChange}
                        className="formInput"
                      />
                    </div>
                  </>
                )}

                {/* REIMBURSEMENT BREAKDOWN (if applicable) */}
                {record.isReimbursement && record.busTripCache && (
                  <>
                    <h3 style={{ marginTop: '1rem' }}>Reimbursement Breakdown</h3>
                    <ReimbursementBreakdownForm
                      driverName={record.busTripCache.driverName || 'Driver'}
                      conductorName={record.busTripCache.conductorName || 'Conductor'}
                      driverAmount={driverReimbursement}
                      conductorAmount={conductorReimbursement}
                      totalAmount={parseFloat(formData.amount) || 0}
                      onDriverAmountChange={setDriverReimbursement}
                      onConductorAmountChange={setConductorReimbursement}
                    />
                    {errors.reimbursement && <span className="error-message">{errors.reimbursement}</span>}
                  </>
                )}

                {/* PAYABLE DUE DATE (if applicable) */}
                {record.isPayable && (
                  <div className="formField">
                    <label htmlFor="payableDueDate">Payable Due Date<span className='requiredTags'> *</span></label>
                    <input
                      type="date"
                      id="payableDueDate"
                      name="payableDueDate"
                      value={formData.payableDueDate}
                      onChange={handleInputChange}
                      className={`formInput ${errors.payableDueDate ? 'input-error' : ''}`}
                    />
                    {errors.payableDueDate && <span className="error-message">{errors.payableDueDate}</span>}
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="button" className="cancelButton" onClick={onClose}>
              <i className="ri-close-line" /> Cancel
            </button>
            <button type="submit" className="saveButton" disabled={loading}>
              <i className="ri-save-line" /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseModal;