// AddExpenseModal.tsx
'use client';

//---------------------IMPORTS HERE----------------------//
import React, { useState, useEffect } from 'react';
//@ts-ignore
import '../../../styles/components/modal.css';
//@ts-ignore
import '../../../styles/expense/addExpense.css';
//@ts-ignore
import { showSuccess, showError, showConfirmation } from '../../../utils/Alerts';
import { formatDate } from '../../../utils/formatting';
import BusSelector from '../../../Components/busSelector';
import ModalHeader from '../../../Components/ModalHeader';
import type { Assignment } from '@/lib/operations/assignments';

//---------------------DECLARATIONS HERE----------------------//
type AddExpenseProps = {
  onClose: () => void;
  onAddExpense: (formData: any) => void;
  assignments: Assignment[];
  currentUser: string;
};

const AddExpense: React.FC<AddExpenseProps> = ({ 
  onClose, 
  onAddExpense,
  assignments,
  currentUser 
}) => {
  // ─────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [isLinkedToTrip, setIsLinkedToTrip] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showBusSelector, setShowBusSelector] = useState(false);
  
  const [formData, setFormData] = useState({
    categoryId: '',
    description: '',
    amount: '',
    transactionDate: new Date().toISOString().slice(0, 16),
    paymentMethodId: '',
    busTripCacheId: null as number | null,
    vendorName: '',
    vendorId: '',
    isPayable: false,
    payableDueDate: '',
    documentIds: '',
    createdBy: currentUser,
  });
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Categories that auto-link to bus trips
  const AUTO_LINKED_CATEGORIES = ['FUEL', 'BUS_OPERATION', 'MAINTENANCE', 'TOLL_FEES'];

  // ─────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      // Fetch categories
      const categoriesRes = await fetch('/api/expense/categories');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: categoriesData[0].id.toString() }));
        }
      }

      // Fetch payment methods
      const paymentMethodsRes = await fetch('/api/expense/payment-methods');
      if (paymentMethodsRes.ok) {
        const paymentMethodsData = await paymentMethodsRes.json();
        setPaymentMethods(paymentMethodsData);
        if (paymentMethodsData.length > 0) {
          setFormData(prev => ({ ...prev, paymentMethodId: paymentMethodsData[0].id.toString() }));
        }
      }
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
      showError('Please try again', 'Failed to load form data');
    }
  };

  // ─────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = parseInt(e.target.value);
    const category = categories.find(c => c.id === categoryId);
    
    setFormData(prev => ({ ...prev, categoryId: e.target.value }));
    
    // Auto-activate trip selector if category requires it
    if (category && AUTO_LINKED_CATEGORIES.includes(category.categoryCode || category.code || '')) {
      setIsLinkedToTrip(true);
    } else {
      setIsLinkedToTrip(false);
      setSelectedAssignment(null);
    }

    // Clear error
    if (errors.categoryId) {
      setErrors(prev => ({ ...prev, categoryId: '' }));
    }
  };

  const handleAssignmentSelect = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowBusSelector(false);
    
    // Auto-fill amount with trip fuel expense if available
    if (assignment.trip_fuel_expense) {
      setFormData(prev => ({
        ...prev,
        amount: assignment.trip_fuel_expense.toString(),
        description: `Fuel expense for ${assignment.bus_route} - ${assignment.bus_plate_number}`
      }));
    }

    // Clear assignment error
    if (errors.assignment) {
      setErrors(prev => ({ ...prev, assignment: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Category required
    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

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

    // If linked to trip, assignment must be selected
    if (isLinkedToTrip && !selectedAssignment) {
      newErrors.assignment = 'Please select a bus trip assignment';
    }

    // If payable, due date required
    if (formData.isPayable && !formData.payableDueDate) {
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
      // Build request payload
      const payload: any = {
        categoryId: parseInt(formData.categoryId),
        description: formData.description,
        amount: parseFloat(formData.amount),
        transactionDate: new Date(formData.transactionDate).toISOString(),
        paymentMethodId: parseInt(formData.paymentMethodId),
        createdBy: formData.createdBy,
      };

      // Add optional fields
      if (selectedAssignment && selectedAssignment.assignment_id) {
        payload.busTripCacheId = selectedAssignment.assignment_id;
      }

      if (formData.vendorName) {
        payload.vendorName = formData.vendorName;
      }

      if (formData.vendorId) {
        payload.vendorId = formData.vendorId;
      }

      if (formData.documentIds) {
        payload.documentIds = formData.documentIds;
      }

      // Add accounts payable if applicable
      if (formData.isPayable) {
        payload.isPayable = true;
        payload.payableDueDate = new Date(formData.payableDueDate).toISOString();
      }

      // Call parent handler to submit
      await onAddExpense(payload);
      
      // Show success message
      showSuccess('The expense has been recorded in the system.', 'Expense Added Successfully!');
      
      // Close modal after success
      onClose();
      
    } catch (err: any) {
      console.error('Error submitting expense:', err);
      showError(err.message, 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel with confirmation
  const handleCancel = async () => {
    // Check if form has any data
    const hasData = formData.description || 
                    formData.amount || 
                    formData.vendorName || 
                    formData.vendorId || 
                    selectedAssignment;

    if (hasData) {
      const result = await showConfirmation(
        'Are you sure you want to cancel? All entered data will be lost.',
        'Discard Changes?'
      );
      
      if (result.isConfirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Format assignment for display
  const formatAssignment = (assignment: Assignment) => {
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
    return `${formatDate(assignment.date_assigned)} | ₱ ${assignment.assignment_value} | ${assignment.bus_plate_number || 'N/A'} (${busType}) - ${assignment.bus_route} | ${driverName} & ${conductorName}`;
  };

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        
        {/* Modal Header */}
        <ModalHeader 
          title="Add Expense" 
          onClose={onClose}
          showDateTime={true} 
        />

        <div className="modal">
          {/* Form */}
          <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Information */}
          <div className="modalContent">
            <section className="form-section">
              <h3>Expense Details</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Category <span className="requiredTags">*</span>
                  </label>
                  <select 
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleCategoryChange}
                    className={errors.categoryId ? 'input-error' : ''}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name || cat.categoryName}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <span className="error-message">{errors.categoryId}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    Amount <span className="requiredTags">*</span>
                  </label>
                  <input 
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={errors.amount ? 'input-error' : ''}
                  />
                  {errors.amount && (
                    <span className="error-message">{errors.amount}</span>
                  )}
                </div>
              </div>

              <div className="form-group full-width">
                <label>
                  Description <span className="requiredTags">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter expense description"
                  rows={3}
                  className={errors.description ? 'input-error' : ''}
                />
                {errors.description && (
                  <span className="error-message">{errors.description}</span>
                )}
              </div>
            </section>
          </div>

          {/* Section 2: Trip Assignment (conditional) */}
          {isLinkedToTrip && (
            <div className="modalContent">
              <section className="form-section trip-section">
                <h3>Bus Trip Assignment</h3>
                <button 
                  type="button" 
                  onClick={() => setShowBusSelector(true)}
                  className={errors.assignment ? 'input-error' : ''}
                >
                  <i className="ri-bus-line"></i>
                  {selectedAssignment 
                    ? formatAssignment(selectedAssignment) 
                    : '+ Select Bus Trip'}
                </button>
                {errors.assignment && (
                  <span className="error-message">{errors.assignment}</span>
                )}
              </section>
            </div>
          )}

          {/* Section 3: Payment Details */}
          <div className="modalContent">
            <section className="form-section">
              <h3>Payment Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Transaction Date & Time <span className="requiredTags">*</span>
                  </label>
                  <input 
                    type="datetime-local"
                    name="transactionDate"
                    value={formData.transactionDate}
                    onChange={handleInputChange}
                    max={new Date().toISOString().slice(0, 16)}
                    className={errors.transactionDate ? 'input-error' : ''}
                  />
                  {errors.transactionDate && (
                    <span className="error-message">{errors.transactionDate}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    Payment Method <span className="requiredTags">*</span>
                  </label>
                  <select 
                    name="paymentMethodId"
                    value={formData.paymentMethodId}
                    onChange={handleInputChange}
                    className={errors.paymentMethodId ? 'input-error' : ''}
                  >
                    <option value="">Select Payment Method</option>
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.id}>
                        {method.methodName || method.name}
                      </option>
                    ))}
                  </select>
                  {errors.paymentMethodId && (
                    <span className="error-message">{errors.paymentMethodId}</span>
                  )}
                </div>
              </div>

              {/* Accounts Payable Toggle */}
              <div className="form-toggle">
                <label className="toggle-label">
                  <input 
                    type="checkbox" 
                    name="isPayable"
                    checked={formData.isPayable}
                    onChange={handleInputChange}
                  />
                  <span>Mark as Accounts Payable</span>
                </label>
              </div>

              {formData.isPayable && (
                <div className="form-group">
                  <label>
                    Due Date <span className="requiredTags">*</span>
                  </label>
                  <input 
                    type="date"
                    name="payableDueDate"
                    value={formData.payableDueDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={errors.payableDueDate ? 'input-error' : ''}
                  />
                  {errors.payableDueDate && (
                    <span className="error-message">{errors.payableDueDate}</span>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Section 4: Vendor Information (only if not trip-related) */}
          {!isLinkedToTrip && (
            <div className="modalContent">
              <section className="form-section">
                <h3>Vendor Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vendor Name</label>
                    <input 
                      type="text"
                      name="vendorName"
                      value={formData.vendorName}
                      onChange={handleInputChange}
                      placeholder="Enter vendor name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Vendor ID</label>
                    <input 
                      type="text"
                      name="vendorId"
                      value={formData.vendorId}
                      onChange={handleInputChange}
                      placeholder="Enter vendor ID"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modalButtons">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`btn-primary ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? '' : 'Add Expense'}
            </button>
          </div>

          </form>
        </div>

        {/* BUS SELECTOR MODAL */}
        {showBusSelector && (
          <BusSelector
            isOpen={showBusSelector}
            assignments={assignments}
            allEmployees={[]}
            onSelect={handleAssignmentSelect}
            onClose={() => setShowBusSelector(false)}
          />
        )}
      </div>
    </div>
  );
};

export default AddExpense;