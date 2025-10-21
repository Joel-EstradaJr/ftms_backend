'use client';

import React, { useState } from 'react';
import ModalHeader from '@/app/Components/ModalHeader';
import { showSuccess } from '@/app/utils/Alerts';
import { ChartOfAccount, AccountFormData } from '@/app/types/jev';
import '@/app/styles/jev/addAccount.css';

interface AddChildAccountModalProps {
  parentAccount: ChartOfAccount;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
}

const AddChildAccountModal: React.FC<AddChildAccountModalProps> = ({ 
  parentAccount, 
  onClose, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState<AccountFormData>({
    account_code: '',
    account_name: '',
    account_type: parentAccount.account_type,
    parent_account_id: parentAccount.account_id,
    description: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      await showSuccess('Child account created successfully', 'Success');
      onClose();
    } catch (error) {
      console.error('Error creating child account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContainer addAccountModal">
        <ModalHeader 
          title={`Add Child Account to ${parentAccount.account_code} - ${parentAccount.account_name}`}
          onClose={onClose} 
          showDateTime={true} 
        />

        <div className="modalContent">
          <div className="info-box">
            <h4><i className="ri-information-line"></i> Child Account Information</h4>
            <p>This child account will inherit the account type ({parentAccount.account_type}) from its parent account.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="formFieldsHorizontal">
              <div className="formInputs">
                <div className="formField">
                  <label>Account Code <span className="requiredTags">*</span></label>
                  <input
                    type="text"
                    name="account_code"
                    value={formData.account_code}
                    onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                    placeholder={`e.g., ${parentAccount.account_code}1`}
                    maxLength={4}
                  />
                </div>

                <div className="formField">
                  <label>Account Name <span className="requiredTags">*</span></label>
                  <input
                    type="text"
                    name="account_name"
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    placeholder="Enter child account name"
                  />
                </div>

                <div className="formField">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="modalButtons">
              <button type="button" className="cancelButton" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="addButton" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Child Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddChildAccountModal;
