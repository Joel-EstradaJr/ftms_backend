// app\(admin)\admin\revenue\tripRevenue\recordRevenue.tsx
'use client';

import React, { useState, useEffect } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import { formatDate } from '../../../../utils/formatting';
import { isValidAmount } from '../../../../utils/validation';
import '../../../../styles/revenue/recordRevenue.css';
import '../../../../styles/components/modal.css';


type RecordRevenueProps = {
  mode: 'record' | 'edit' | 'view';
  onClose: () => void;
  onSubmit: (data: RecordRevenueData) => void;
  tripData?: {
    trip_id: string;
    route: string;
    bus_number: string;
    trip_date: string;
    total_revenue: number;
    driver_name: string;
    conductor_name: string;
  };
  existingData?: RecordRevenueData | null;
  currentUser: string;
};

export type RecordRevenueData = {
  trip_id: string;
  remitted_amount: number;
  driver_shortage: number;
  conductor_shortage: number;
  additional_employees?: AdditionalEmployee[];
  loan_due_date?: string; // Optional due date for loan/shortage
  remarks: string;
  recorded_by: string;
  recorded_date: string;
};

type AdditionalEmployee = {
  id: string;
  name: string;
  shortage_amount: number;
};

const RecordRevenue: React.FC<RecordRevenueProps> = ({
  mode,
  onClose,
  onSubmit,
  tripData,
  existingData,
  currentUser
}) => {
  const [formData, setFormData] = useState<RecordRevenueData>({
    trip_id: tripData?.trip_id || '',
    remitted_amount: Number(existingData?.remitted_amount) || 0,
    driver_shortage: Number(existingData?.driver_shortage) || 0,
    conductor_shortage: Number(existingData?.conductor_shortage) || 0,
    additional_employees: existingData?.additional_employees || [],
    loan_due_date: existingData?.loan_due_date || '',
    remarks: existingData?.remarks || '',
    recorded_by: existingData?.recorded_by || currentUser,
    recorded_date: existingData?.recorded_date || new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Calculate shortage when remitted amount changes
  useEffect(() => {
    if (mode === 'view') return;

    const totalRevenue = tripData?.total_revenue || 0;
    const remitted = formData.remitted_amount;
    const shortage = Math.max(0, totalRevenue - remitted);

    if (shortage > 0) {
      // Auto-calculate 50/50 split
      const halfShortage = shortage / 2;
      setFormData(prev => ({
        ...prev,
        driver_shortage: halfShortage,
        conductor_shortage: halfShortage
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        driver_shortage: 0,
        conductor_shortage: 0
      }));
    }
  }, [formData.remitted_amount, tripData?.total_revenue, mode]);

  // Debounced validation checker (2-second delay)
  useEffect(() => {
    if (mode === 'view') return;

    // Clear existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    // Set new timeout for validation
    const timeout = setTimeout(() => {
      const totalRevenue = tripData?.total_revenue || 0;
      const remitted = formData.remitted_amount;
      const shortage = Math.max(0, totalRevenue - remitted);

      if (shortage > 0) {
        const totalCovered =
          Number(formData.driver_shortage) +
          Number(formData.conductor_shortage) +
          (formData.additional_employees?.reduce((sum, emp) => sum + Number(emp.shortage_amount), 0) || 0);

        const difference = Math.abs(totalCovered - shortage);

        if (difference > 0.01) {
          const shortfall = shortage - totalCovered;
          if (shortfall > 0) {
            setErrors(prev => ({
              ...prev,
              shortageSplit: `⚠️ Still need ₱${shortfall.toFixed(2)} more to cover the full shortage of ₱${shortage.toFixed(2)}`
            }));
          } else {
            setErrors(prev => ({
              ...prev,
              shortageSplit: `⚠️ Total exceeds shortage by ₱${Math.abs(shortfall).toFixed(2)}. Total should be ₱${shortage.toFixed(2)}`
            }));
          }
        } else {
          // Clear error if amounts match
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.shortageSplit;
            return newErrors;
          });
        }
      }
    }, 2000); // 2-second delay

    setValidationTimeout(timeout);

    // Cleanup on unmount
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [
    formData.driver_shortage,
    formData.conductor_shortage,
    formData.additional_employees,
    formData.remitted_amount,
    tripData?.total_revenue,
    mode
  ]);

  // Validate shortage amounts
  const validateShortageAmounts = () => {
    const totalRevenue = tripData?.total_revenue || 0;
    const remitted = formData.remitted_amount;
    const shortage = Math.max(0, totalRevenue - remitted);

    const totalCovered =
      formData.driver_shortage +
      formData.conductor_shortage +
      (formData.additional_employees?.reduce((sum, emp) => sum + emp.shortage_amount, 0) || 0);

    const newErrors: {[key: string]: string} = {};

    if (shortage > 0 && Math.abs(totalCovered - shortage) > 0.01) {
      newErrors.shortageSplit = `Total shortage coverage (${Number(totalCovered).toFixed(2)}) must equal the shortage amount (${Number(shortage).toFixed(2)})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate form
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!isValidAmount(formData.remitted_amount)) {
      newErrors.remitted_amount = 'Remitted amount must be a valid positive number';
    }

    if (formData.remitted_amount > (tripData?.total_revenue || 0)) {
      newErrors.remitted_amount = 'Remitted amount cannot exceed trip revenue';
    }

    if (!validateShortageAmounts()) {
      // Errors already set by validateShortageAmounts
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let parsedValue: any = value;

    if (name === 'remitted_amount' || name === 'driver_shortage' || name === 'conductor_shortage') {
      parsedValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting revenue record:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAdditionalEmployee = () => {
    const newEmployee: AdditionalEmployee = {
      id: `emp_${Date.now()}`,
      name: '',
      shortage_amount: 0
    };
    setFormData(prev => ({
      ...prev,
      additional_employees: [...(prev.additional_employees || []), newEmployee]
    }));
  };

  const updateAdditionalEmployee = (id: string, field: keyof AdditionalEmployee, value: any) => {
    setFormData(prev => ({
      ...prev,
      additional_employees: prev.additional_employees?.map(emp =>
        emp.id === id ? { ...emp, [field]: value } : emp
      )
    }));
  };

  const removeAdditionalEmployee = (id: string) => {
    setFormData(prev => ({
      ...prev,
      additional_employees: prev.additional_employees?.filter(emp => emp.id !== id)
    }));
  };

  const totalRevenue = Number(tripData?.total_revenue) || 0;
  const shortage = Math.max(0, totalRevenue - Number(formData.remitted_amount));
  const totalCovered =
    Number(formData.driver_shortage) +
    Number(formData.conductor_shortage) +
    (formData.additional_employees?.reduce((sum, emp) => sum + Number(emp.shortage_amount), 0) || 0);

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isRecordMode = mode === 'record';

  return (
    <div className="modalOverlay">
      <div className="modalStandard">
        <ModalHeader
          title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} Trip Revenue Record`}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit}>
            {/* Trip Details Section */}
            <div className="modalContent">
              <h3 className="sectionTitle">Trip Details</h3>
              <div className="formRow">
                <div className="formField">
                  <label>Trip ID</label>
                  <input
                    type="text"
                    value={tripData?.trip_id || ''}
                    disabled
                    className="formInput"
                  />
                </div>
                <div className="formField">
                  <label>Route</label>
                  <input
                    type="text"
                    value={tripData?.route || ''}
                    disabled
                    className="formInput"
                  />
                </div>
              </div>

              <div className="formRow">
                <div className="formField">
                  <label>Bus Number</label>
                  <input
                    type="text"
                    value={tripData?.bus_number || ''}
                    disabled
                    className="formInput"
                  />
                </div>
                <div className="formField">
                  <label>Trip Date</label>
                  <input
                    type="text"
                    value={tripData?.trip_date ? formatDate(new Date(tripData.trip_date)) : ''}
                    disabled
                    className="formInput"
                  />
                </div>
              </div>

              <div className="formRow">
                <div className="formField">
                  <label>Driver Name</label>
                  <input
                    type="text"
                    value={tripData?.driver_name || ''}
                    disabled
                    className="formInput"
                  />
                </div>
                <div className="formField">
                  <label>Conductor Name</label>
                  <input
                    type="text"
                    value={tripData?.conductor_name || ''}
                    disabled
                    className="formInput"
                  />
                </div>
              </div>

              <div className="formRow">
                <div className="formField">
                  <label>Total Trip Revenue</label>
                  <input
                    type="text"
                    value={`₱${totalRevenue.toFixed(2)}`}
                    disabled
                    className="formInput"
                  />
                </div>
              </div>
            </div>

            {/* Remittance Section */}
            <div className="modalContent">
              <h3 className="sectionTitle">Remittance</h3>
              <div className="formRow">
                <div className="formField">
                  <label>Remitted Amount <span className='requiredTags'>*</span></label>
                  <input
                    type="number"
                    name="remitted_amount"
                    value={formData.remitted_amount}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    className={`formInput ${errors.remitted_amount ? 'input-error' : ''}`}
                    step="0.01"
                    min="0"
                    max={totalRevenue}
                    required
                  />
                  {errors.remitted_amount && <span className="error-message">{errors.remitted_amount}</span>}
                </div>
                {shortage > 0 && (
                  <div className="formField">
                    <label>Revenue Shortage</label>
                    <input
                      type="text"
                      value={`₱${shortage.toFixed(2)}`}
                      disabled
                      className="formInput"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Loan Section - Only show if there's a shortage */}
            {shortage > 0 && (
              <div className="modalContent">
                <h3 className="sectionTitle">Loan</h3>
                <div className="formRow">
                  <div className="formField">
                    <label>{tripData?.driver_name || 'Driver'} <span className='requiredTags'>*</span></label>
                    <input
                      type="number"
                      name="driver_shortage"
                      value={formData.driver_shortage}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                      className={`formInput ${errors.shortageSplit ? 'input-error' : ''}`}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  {tripData?.conductor_name && (
                    <div className="formField">
                      <label>{tripData.conductor_name} <span className='requiredTags'>*</span></label>
                      <input
                        type="number"
                        name="conductor_shortage"
                        value={formData.conductor_shortage}
                        onChange={handleInputChange}
                        disabled={isViewMode}
                        className={`formInput ${errors.shortageSplit ? 'input-error' : ''}`}
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="formRow">
                  <div className="formField">
                    <label>Total Covered</label>
                    <input
                      type="text"
                      value={`₱${totalCovered.toFixed(2)}`}
                      disabled
                      className={`formInput ${errors.shortageSplit ? 'input-error' : ''}`}
                    />
                    {errors.shortageSplit && (
                      <span className="error-message">{errors.shortageSplit}</span>
                    )}
                  </div>
                  <div className="formField">
                    <label>Due Date (Optional)</label>
                    <input
                      type="date"
                      name="loan_due_date"
                      value={formData.loan_due_date}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                      className="formInput"
                      min={new Date().toISOString().split('T')[0]} // From today onwards
                    />
                  </div>
                </div>

                {/* Additional Employees */}
                <div className="formField">
                  <label>Additional Employees</label>
                  {formData.additional_employees?.map((employee, index) => (
                    <div key={employee.id} className="formRow" style={{ marginBottom: '0.5rem' }}>
                      <div className="formField">
                        <input
                          type="text"
                          placeholder="Employee Name"
                          value={employee.name}
                          onChange={(e) => updateAdditionalEmployee(employee.id, 'name', e.target.value)}
                          disabled={isViewMode}
                          className="formInput"
                        />
                      </div>
                      <div className="formField">
                        <input
                          type="number"
                          placeholder="Loan Amount"
                          value={employee.shortage_amount}
                          onChange={(e) => updateAdditionalEmployee(employee.id, 'shortage_amount', parseFloat(e.target.value) || 0)}
                          disabled={isViewMode}
                          className={`formInput ${errors.shortageSplit ? 'input-error' : ''}`}
                          step="0.01"
                          min="0"
                        />
                      </div>
                      {!isViewMode && (
                        <div className="formField" style={{ flex: '0 0 50px', display: 'flex', alignItems: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => removeAdditionalEmployee(employee.id)}
                            className="cancelButton"
                            style={{ width: '40px', height: '40px', padding: '0' }}
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={addAdditionalEmployee}
                      className="addButton"
                      style={{ 
                        width: 'auto', 
                        padding: '0.5rem 1rem', 
                        marginTop: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <i className="ri-add-line"></i>
                      Add Employee
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Recording Information */}
            <div className="modalContent">
              <h3 className="sectionTitle">Recording Information</h3>
              <div className="formRow">
                <div className="formField">
                  <label>Recorded By</label>
                  <input
                    type="text"
                    name="recorded_by"
                    value={formData.recorded_by}
                    onChange={handleInputChange}
                    disabled
                    className="formInput"
                  />
                </div>
                <div className="formField">
                  <label>Recorded Date</label>
                  <input
                    type="date"
                    name="recorded_date"
                    value={formData.recorded_date}
                    onChange={handleInputChange}
                    disabled
                    className="formInput"
                  />
                </div>
              </div>

              <div className="formField">
                <label>Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  className="formInput"
                  rows={3}
                  placeholder="Additional notes or remarks..."
                />
              </div>
            </div>
          

          {/* Modal Buttons */}
          <div className="modalButtons">
            <button type="button" onClick={onClose} className="cancelButton" disabled={isSubmitting}>
              Cancel
            </button>
            {!isViewMode && (
              <button type="submit" className="addButton" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : `${mode.charAt(0).toUpperCase() + mode.slice(1)} Revenue Record`}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordRevenue;