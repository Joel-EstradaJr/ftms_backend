// app/(admin)/admin/revenue/otherRevenue/otherRevenueModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import { formatDate } from '../../../../utils/formatting';
import { isValidAmount } from '../../../../utils/validation';
import '../../../../styles/revenue/otherRevenueModal.css';
import '../../../../styles/components/modal.css';

type OtherRevenueModalProps = {
  mode: 'add' | 'edit' | 'view';
  onClose: () => void;
  onSubmit: (data: OtherRevenueData) => void;
  existingData?: OtherRevenueData | null;
  revenueSources: Array<{ id: number; name: string; sourceCode: string }>;
  paymentMethods: Array<{ id: number; methodName: string; methodCode: string }>;
  currentUser: string;
};

export type OtherRevenueData = {
  id?: number;
  revenueCode: string;
  sourceName: string; // Changed from sourceId to sourceName for flexibility
  description: string;
  amount: number;
  transactionDate: string;
  paymentMethodId: number;
  externalRefType?: string;
  externalRefId?: string;
  createdBy: string;
  approvedBy?: string;
};

const OtherRevenueModal: React.FC<OtherRevenueModalProps> = ({
  mode,
  onClose,
  onSubmit,
  existingData,
  revenueSources,
  paymentMethods,
  currentUser
}) => {
  const [formData, setFormData] = useState<OtherRevenueData>({
    revenueCode: existingData?.revenueCode || '',
    sourceName: existingData?.sourceName || '',
    description: existingData?.description || '',
    amount: existingData?.amount || 0,
    transactionDate: existingData?.transactionDate || new Date().toISOString().split('T')[0],
    paymentMethodId: existingData?.paymentMethodId || 0,
    externalRefType: existingData?.externalRefType || '',
    externalRefId: existingData?.externalRefId || '',
    createdBy: existingData?.createdBy || currentUser,
    approvedBy: existingData?.approvedBy || '',
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate revenue code for new records
  useEffect(() => {
    if (mode === 'add' && !formData.revenueCode) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      setFormData(prev => ({
        ...prev,
        revenueCode: `REV-${timestamp}-${random}`.toUpperCase()
      }));
    }
  }, [mode, formData.revenueCode]);

  // Validate form
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.sourceName.trim()) {
      newErrors.sourceName = 'Revenue source is required';
    }

    if (!isValidAmount(formData.amount)) {
      newErrors.amount = 'Amount must be a valid positive number';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.paymentMethodId) {
      newErrors.paymentMethodId = 'Payment method is required';
    }

    if (!formData.transactionDate) {
      newErrors.transactionDate = 'Transaction date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let parsedValue: any = value;

    if (name === 'amount') {
      parsedValue = parseFloat(value) || 0;
    } else if (name === 'paymentMethodId') {
      parsedValue = parseInt(value) || 0;
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
      console.error('Error submitting other revenue:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('');

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isAddMode = mode === 'add';

  const selectedPaymentMethod = paymentMethods.find(p => p.id === formData.paymentMethodId);

  // Filter revenue sources based on input
  const filteredSources = revenueSources.filter(source =>
    source.name.toLowerCase().includes(sourceFilter.toLowerCase())
  );

  return (
    <div className="modalOverlay">
      <div className="modalStandard">
        <ModalHeader
          title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} Other Revenue Record`}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit}>
          {/* Revenue Details Section */}
          <div className="modalContent">
            <h3 className="sectionTitle">Revenue Details</h3>
            <div className="formRow">
              <div className="formField">
                <label>Revenue Code</label>
                <input
                  type="text"
                  value={formData.revenueCode}
                  disabled
                  className="formInput"
                />
              </div>
              <div className="formField">
                <label>Transaction Date <span className='requiredTags'>*</span></label>
                <input
                  type="date"
                  name="transactionDate"
                  value={formData.transactionDate}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  className={`formInput ${errors.transactionDate ? 'input-error' : ''}`}
                  required
                />
                {errors.transactionDate && <span className="error-message">{errors.transactionDate}</span>}
              </div>
            </div>

            <div className="formRow">
              <div className="formField">
                <label>Revenue Source <span className='requiredTags'>*</span></label>
                <div className="combobox-container">
                  <input
                    type="text"
                    name="sourceName"
                    value={formData.sourceName}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        sourceName: e.target.value
                      }));
                      setSourceFilter(e.target.value);
                      setShowSourceDropdown(true);
                      // Clear error for this field
                      if (errors.sourceName) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.sourceName;
                          return newErrors;
                        });
                      }
                    }}
                    onFocus={() => setShowSourceDropdown(true)}
                    onBlur={() => {
                      // Delay hiding dropdown to allow click on options
                      setTimeout(() => setShowSourceDropdown(false), 200);
                    }}
                    disabled={isViewMode}
                    className={`formInput ${errors.sourceName ? 'input-error' : ''}`}
                    placeholder="Type or select revenue source..."
                    required
                  />
                  {showSourceDropdown && filteredSources.length > 0 && (
                    <div className="combobox-dropdown">
                      {filteredSources.map(source => (
                        <div
                          key={source.id}
                          className="combobox-option"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              sourceName: source.name
                            }));
                            setShowSourceDropdown(false);
                            setSourceFilter('');
                          }}
                        >
                          {source.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.sourceName && <span className="error-message">{errors.sourceName}</span>}
              </div>
              <div className="formField">
                <label>Amount <span className='requiredTags'>*</span></label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  className={`formInput ${errors.amount ? 'input-error' : ''}`}
                  step="0.01"
                  min="0"
                  required
                />
                {errors.amount && <span className="error-message">{errors.amount}</span>}
              </div>
            </div>

            <div className="formRow">
              <div className="formField">
                <label>Payment Method <span className='requiredTags'>*</span></label>
                <select
                  name="paymentMethodId"
                  value={formData.paymentMethodId}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  className={`formInput ${errors.paymentMethodId ? 'input-error' : ''}`}
                  required
                >
                  <option value={0}>Select Payment Method</option>
                  {paymentMethods.map(method => (
                    <option key={method.id} value={method.id}>
                      {method.methodName}
                    </option>
                  ))}
                </select>
                {errors.paymentMethodId && <span className="error-message">{errors.paymentMethodId}</span>}
              </div>
            </div>

            <div className="formField">
              <label>Description <span className='requiredTags'>*</span></label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isViewMode}
                className={`formInput ${errors.description ? 'input-error' : ''}`}
                rows={3}
                placeholder="Describe the revenue source and details..."
                required
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>
          </div>

          {/* Reference Information Section */}
          <div className="modalContent">
            <h3 className="sectionTitle">Reference Information (Optional)</h3>
            <div className="formRow">
              <div className="formField">
                <label>External Reference Type</label>
                <select
                  name="externalRefType"
                  value={formData.externalRefType}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  className="formInput"
                >
                  <option value="">Select Type</option>
                  <option value="DISPOSAL">Asset Disposal</option>
                  <option value="FORFEITED_DEPOSIT">Forfeited Deposit</option>
                  <option value="LOAN_REPAYMENT">Loan Repayment</option>
                  <option value="RENTER_DAMAGE">Renter Damage</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="formField">
                <label>External Reference ID</label>
                <input
                  type="text"
                  name="externalRefId"
                  value={formData.externalRefId}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  className="formInput"
                  placeholder="Reference ID or number"
                />
              </div>
            </div>
          </div>

          {/* Recording Information Section */}
          <div className="modalContent">
            <h3 className="sectionTitle">Recording Information</h3>
            <div className="formRow">
              <div className="formField">
                <label>Recorded By</label>
                <input
                  type="text"
                  value={formData.createdBy}
                  disabled
                  className="formInput"
                />
              </div>
              {existingData?.approvedBy && (
                <div className="formField">
                  <label>Approved By</label>
                  <input
                    type="text"
                    value={existingData.approvedBy}
                    disabled
                    className="formInput"
                  />
                </div>
              )}
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

export default OtherRevenueModal;