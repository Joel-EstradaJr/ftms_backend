'use client';

import React, { useState } from 'react';
import ModalHeader from '@/app/Components/ModalHeader';
import { showError, showSuccess } from '@/app/utils/Alerts';
import { ChartOfAccount, AccountFormData } from '@/app/types/jev';
import '@/app/styles/jev/editAccount.css';
import '@/app/styles/components/modal.css';

interface EditAccountModalProps {
  account: ChartOfAccount;
  onClose: () => void;
  onSubmit: (data: Partial<AccountFormData>) => Promise<void>;
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({ account, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<AccountFormData>>({
    account_name: account.account_name,
    description: account.description || '',
    notes: account.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (account.is_system_account) {
      await showError('System accounts cannot be modified', 'Error');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      await showSuccess('Account updated successfully', 'Success');
      onClose();
    } catch (error) {
      console.error('Error updating account:', error);
      await showError('Failed to update account. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContainer editAccountModal">
        <ModalHeader 
          title="Edit Account" 
          onClose={onClose} 
          showDateTime={true} 
        />

        <div className="modalContent">
          {account.is_system_account && (
            <div className="warning-box">
              <i className="ri-alert-line"></i>
              <div>
                <p>This is a system account. Modifications are restricted.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="formFieldsHorizontal">
              <div className="formInputs">

                {/* Non-editable fields - Display Only */}
                <div className="formField full-width">
                  <label>Account Code</label>
                  <input
                    type="text"
                    value={account.account_code}
                    disabled
                    style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                  <small style={{ color: 'var(--secondary-text-color)' }}>
                    Account code cannot be modified
                  </small>
                </div>

                <div className="formField full-width">
                  <label>Account Type</label>
                  <input
                    type="text"
                    value={account.account_type}
                    disabled
                    style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                  <small style={{ color: 'var(--secondary-text-color)' }}>
                    Account type cannot be modified
                  </small>
                </div>

                {/* Editable Fields */}
                <div className="formField full-width">
                  <label htmlFor="account_name">
                    Account Name <span className="requiredTags">*</span>
                  </label>
                  <input
                    type="text"
                    id="account_name"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleInputChange}
                    required
                    disabled={account.is_system_account}
                  />
                </div>

                <div className="formField full-width">
                  <label htmlFor="description">
                    Description <span style={{ color: 'var(--secondary-text-color)' }}>(Optional)</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide additional details about this account..."
                    rows={3}
                    disabled={account.is_system_account}
                  />
                </div>

                <div className="formField full-width">
                  <label htmlFor="notes">
                    Notes <span style={{ color: 'var(--secondary-text-color)' }}>(Optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes..."
                    rows={3}
                    disabled={account.is_system_account}
                  />
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
                disabled={isSubmitting || account.is_system_account}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line"></i>
                    Update Account
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

export default EditAccountModal;
