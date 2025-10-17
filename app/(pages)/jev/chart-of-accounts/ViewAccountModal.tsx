'use client';

import React from 'react';
import ModalHeader from '@/app/Components/ModalHeader';
import { formatDate } from '@/app/utility/dateFormatter';
import { ChartOfAccount } from '@/app/types/jev';
import { getAccountHierarchyDisplay, formatAccountBalance, getAccountTypeClass, getAccountStatusInfo, getNormalBalance } from '@/app/lib/jev/accountHelpers';
import '@/app/styles/jev/viewAccount.css';
import '@/app/styles/components/modal.css';

interface ViewAccountModalProps {
  account: ChartOfAccount;
  onClose: () => void;
}

const ViewAccountModal: React.FC<ViewAccountModalProps> = ({ account, onClose }) => {
  const statusInfo = getAccountStatusInfo(account);

  // Sample recent transactions for display (replace with API call)
  const recentTransactions = [
    {
      journal_number: 'JE-2024-10-0001',
      transaction_date: '2024-10-14',
      description: 'Revenue collection - Bus 101',
      debit: 15000.00,
      credit: 0,
      balance: 165000.00
    },
    {
      journal_number: 'JE-2024-10-0002',
      transaction_date: '2024-10-13',
      description: 'Fuel purchase',
      debit: 0,
      credit: 5000.00,
      balance: 150000.00
    },
    {
      journal_number: 'JE-2024-10-0003',
      transaction_date: '2024-10-12',
      description: 'Payroll disbursement',
      debit: 0,
      credit: 45000.00,
      balance: 155000.00
    }
  ];

  return (
    <div className="modalOverlay">
      <div className="modalContainer viewAccountModal">
        <ModalHeader 
          title="Account Details" 
          onClose={onClose} 
          showDateTime={false} 
        />

        <div className="modalContent">
          <div className="viewAccountContent">
            
            {/* Account Header Section */}
            <div className="account-header-section">
              <div className="account-code-display">
                <h2>{account.account_code}</h2>
                <h3>{account.account_name}</h3>
                <div className="account-badges">
                  <span className={`chip ${statusInfo.chipClass}`}>
                    {statusInfo.label}
                  </span>
                  {account.is_system_account && (
                    <span className="chip Draft">
                      System Account
                    </span>
                  )}
                </div>
              </div>

              <div className="account-balance-display">
                <div className="balance-label">Account Type</div>
                <div className="balance-amount">
                  {account.account_type}
                </div>
                <div className="balance-type">
                  Normal Balance: <strong>{getNormalBalance(account.account_type)}</strong>
                </div>
              </div>
            </div>

            {/* Account Details Grid */}
            <div className="details-grid">
              <div className="detail-section">
                <h4><i className="ri-information-line"></i> Account Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Account Type:</span>
                  <span className="detail-value">
                    {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Normal Balance:</span>
                  <span className="detail-value">
                    <span className={`balance-type ${getNormalBalance(account.account_type).toLowerCase()}`}>
                      {getNormalBalance(account.account_type)}
                    </span>
                  </span>
                </div>
                {account.parent_account_id && (
                  <div className="detail-row">
                    <span className="detail-label">Parent Account:</span>
                    <span className="detail-value">
                      {account.parent_account_code} - {account.parent_account_name}
                    </span>
                  </div>
                )}
                {account.description && (
                  <div className="detail-row full-width">
                    <span className="detail-label">Description:</span>
                    <span className="detail-value">{account.description}</span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h4><i className="ri-bar-chart-line"></i> Status</h4>
                <div className="detail-row">
                  <span className="detail-label">Account Status:</span>
                  <span className="detail-value">
                    {account.is_active ? (
                      <span className="chip active">Active</span>
                    ) : (
                      <span className="chip closed">Archived</span>
                    )}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">System Account:</span>
                  <span className="detail-value">
                    {account.is_system_account ? (
                      <span className="chip Draft">Yes</span>
                    ) : (
                      <span className="chip">No</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Description and Notes Section */}
            {(account.description || account.notes) && (
              <div className="notes-section">
                <h4><i className="ri-file-text-line"></i> Additional Information</h4>
                {account.description && (
                  <div className="note-item">
                    <span className="note-label">Description:</span>
                    <p>{account.description}</p>
                  </div>
                )}
                {account.notes && (
                  <div className="note-item">
                    <span className="note-label">Notes:</span>
                    <p>{account.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Transactions Section - TODO: Implement when journal entries are ready */}
            {false && (
              <div className="transactions-section">
                <h4><i className="ri-file-list-3-line"></i> Recent Transactions</h4>
                <div className="transactions-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Journal Entry</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((txn, index) => (
                        <tr key={index}>
                          <td><strong>{txn.journal_number}</strong></td>
                          <td>{formatDate(txn.transaction_date)}</td>
                          <td>{txn.description}</td>
                          <td className={txn.debit > 0 ? 'debit-amount' : ''}>
                            {txn.debit > 0 ? `₱${txn.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className={txn.credit > 0 ? 'credit-amount' : ''}>
                            {txn.credit > 0 ? `₱${txn.credit.toLocaleString()}` : '-'}
                          </td>
                          <td>
                            <strong>
                              ₱{txn.balance.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="view-all-link">
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    View All Transactions →
                  </a>
                </div>
              </div>
            )}

          </div>

          <div className="modalButtons">
            <button 
              type="button" 
              className="cancelButton"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAccountModal;
