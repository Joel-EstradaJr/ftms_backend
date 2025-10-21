'use client';

import React, { useState } from 'react';
import ModalHeader from '@/app/Components/ModalHeader';
import { showError } from '@/app/utils/Alerts';
import { AccountType, AccountFormData, ChartOfAccount } from '@/app/types/jev';
import { getNormalBalance, getAvailableParentAccounts } from '@/app/lib/jev/accountHelpers';
import { validateAccountForm, validateParentChildRelationship } from '@/app/lib/jev/accountValidation';
import '@/app/styles/jev/addAccount.css';
import '@/app/styles/components/modal.css';

interface AddAccountModalProps {
  onClose: () => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  accounts: ChartOfAccount[];
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onSubmit, accounts }) => {
  const [formData, setFormData] = useState<AccountFormData>({
    account_code: '',
    account_name: '',
    account_type: AccountType.ASSET,
    description: '',
    notes: '',
    parent_account_id: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountTypes = [
    { value: AccountType.ASSET, label: 'Asset' },
    { value: AccountType.LIABILITY, label: 'Liability' },
    { value: AccountType.EQUITY, label: 'Equity' },
    { value: AccountType.REVENUE, label: 'Revenue' },
    { value: AccountType.EXPENSE, label: 'Expense' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: value === '' ? undefined : value 
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setErrors({});
      
      // Validate basic form fields
      const basicValidation = await validateAccountForm({
        account_code: formData.account_code,
        account_name: formData.account_name,
        account_type: formData.account_type,
      });

      if (!basicValidation.valid) {
        const newErrors: Record<string, string> = {};
        basicValidation.errors.forEach(error => {
          if (error.includes('code')) newErrors.account_code = error;
          else if (error.includes('name')) newErrors.account_name = error;
          else if (error.includes('type')) newErrors.account_type = error;
        });
        setErrors(newErrors);
        await showError(basicValidation.errors.join('<br/>'), 'Validation Error');
        return;
      }

      // Validate parent-child relationship if parent is selected
      if (formData.parent_account_id) {
        const parentValidation = validateParentChildRelationship(
          formData.parent_account_id,
          formData.account_type,
          accounts
        );

        if (!parentValidation.valid) {
          setErrors({ parent_account_id: parentValidation.errors[0] });
          await showError(parentValidation.errors.join('<br/>'), 'Invalid Parent Account');
          return;
        }
      }

      await onSubmit(formData);
    } catch (error) {
      console.error('Error creating account:', error);
      await showError('Failed to create account. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountCodeGuidelines = () => [
    { prefix: '1000-1999', type: 'Assets', examples: 'Cash, Inventory, Equipment' },
    { prefix: '2000-2999', type: 'Liabilities', examples: 'Accounts Payable, Loans' },
    { prefix: '3000-3999', type: 'Equity', examples: "Owner's Equity, Retained Earnings" },
    { prefix: '4000-4999', type: 'Revenue', examples: 'Sales, Service Revenue' },
    { prefix: '5000-5999', type: 'Expenses', examples: 'Salaries, Rent, Utilities' },
  ];

  const guidelines = getAccountCodeGuidelines();

  return (
    <div className="modalOverlay">
      <div className="modalContainer addAccountModal">
        <ModalHeader 
          title="Add New Account" 
          onClose={onClose} 
          showDateTime={true} 
        />

        <div className="modalContent">
          <form onSubmit={handleSubmit}>
            <div className="formFieldsHorizontal">
              <div className="formInputs">

                {/* Account Code and Name */}
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="account_code">
                      Account Code <span className="requiredTags">*</span>
                    </label>
                    <input
                      type="text"
                      id="account_code"
                      name="account_code"
                      value={formData.account_code}
                      onChange={handleInputChange}
                      placeholder="e.g., 1010"
                      maxLength={4}
                      className={errors.account_code ? 'input-error' : ''}
                    />
                    {errors.account_code && (
                      <div className="error-message">{errors.account_code}</div>
                    )}
                    <small style={{ color: 'var(--secondary-text-color)' }}>
                      4-digit code following account type guidelines below
                    </small>
                  </div>

                  <div className="formField">
                    <label htmlFor="account_name">
                      Account Name <span className="requiredTags">*</span>
                    </label>
                    <input
                      type="text"
                      id="account_name"
                      name="account_name"
                      value={formData.account_name}
                      onChange={handleInputChange}
                      placeholder="e.g., Cash on Hand"
                      className={errors.account_name ? 'input-error' : ''}
                    />
                    {errors.account_name && (
                      <div className="error-message">{errors.account_name}</div>
                    )}
                  </div>
                </div>

                {/* Account Type and Parent Account */}
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="account_type">
                      Account Type <span className="requiredTags">*</span>
                    </label>
                    <select
                      id="account_type"
                      name="account_type"
                      value={formData.account_type}
                      onChange={handleInputChange}
                      className={errors.account_type ? 'input-error' : ''}
                    >
                      {accountTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {errors.account_type && (
                      <div className="error-message">{errors.account_type}</div>
                    )}
                    <small style={{ color: 'var(--secondary-text-color)', fontSize: '12px' }}>
                      {getNormalBalance(formData.account_type) === 'DEBIT' ? 
                        '✓ Increases with debits' : 
                        '✓ Increases with credits'}
                    </small>
                  </div>

                  <div className="formField">
                    <label htmlFor="parent_account_id">
                      Parent Account <span style={{ color: 'var(--secondary-text-color)' }}>(Optional)</span>
                    </label>
                    <select
                      id="parent_account_id"
                      name="parent_account_id"
                      value={formData.parent_account_id || ''}
                      onChange={handleInputChange}
                      className={errors.parent_account_id ? 'input-error' : ''}
                    >
                      <option value="">-- None (Root Level) --</option>
                      {getAvailableParentAccounts(accounts, formData.account_type).map(acc => (
                        <option key={acc.account_id} value={acc.account_id}>
                          {acc.account_code} - {acc.account_name}
                        </option>
                      ))}
                    </select>
                    {errors.parent_account_id && (
                      <div className="error-message">{errors.parent_account_id}</div>
                    )}
                    <small style={{ color: 'var(--secondary-text-color)', fontSize: '12px' }}>
                      Create a subcategory (e.g., "BDO" under "Cash in Bank")
                    </small>
                  </div>
                </div>

                {/* Description */}
                <div className="formField full-width">
                  <label htmlFor="description">
                    Description <span style={{ color: 'var(--secondary-text-color)' }}>(Optional)</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    placeholder="Provide details about this account's purpose..."
                    rows={2}
                  />
                </div>

                {/* Notes */}
                <div className="formField full-width">
                  <label htmlFor="notes">
                    Internal Notes <span style={{ color: 'var(--secondary-text-color)' }}>(Optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleInputChange}
                    placeholder="Internal reminders or special instructions..."
                    rows={2}
                  />
                </div>

                {/* Guidelines Box */}
                <div className="info-box">
                  <h4><i className="ri-information-line"></i> Account Code Guidelines</h4>
                  <ul>
                    {guidelines.map((guide, idx) => (
                      <li key={idx}>
                        <strong>{guide.prefix}:</strong> {guide.type} <em>({guide.examples})</em>
                      </li>
                    ))}
                  </ul>
                  <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--secondary-text-color)' }}>
                    <strong>Tip:</strong> Use parent accounts for categories (e.g., 1020 - Cash in Bank) 
                    and child accounts for specific items (e.g., 1021 - BDO Account).
                  </p>
                </div>

              </div>
            </div>

            <div className="modalButtons">
              <button 
                type="button" 
                className="cancelButton"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="addButton"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="ri-add-line"></i>
                    Create Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;