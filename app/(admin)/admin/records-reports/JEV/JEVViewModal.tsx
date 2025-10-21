'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import ModalHeader from '../../../../Components/ModalHeader';
import  '../../../../styles/components/modal.css';
import  '../../../../styles/components/table.css';
import { JournalEntry, JournalEntryLine } from '../../../../types/jev';
import { formatDate, formatMoney } from '../../../../utils/formatting';

interface JEVViewModalProps {
  entry: JournalEntry;
  onClose: () => void;
}

const JEVViewModal: React.FC<JEVViewModalProps> = ({ entry, onClose }) => {
  const modalContent = (
    <div className="modalOverlay">
      <div className="modalStandard">
        <ModalHeader
          title={`Journal Entry Voucher - ${entry.journal_number}`}
          onClose={onClose}
        />

        <div className="modalContent">
          {/* Header Information */}
          <h3 className="sectionTitle">Journal Entry Details</h3>
          <div className="jev-header-section">
            <div className="jev-header-grid">
              <div className="jev-header-item">
                <label>JEV Number:</label>
                <span>{entry.journal_number}</span>
              </div>
              <div className="jev-header-item">
                <label>Transaction Date:</label>
                <span>{formatDate(entry.transaction_date)}</span>
              </div>
              <div className="jev-header-item">
                <label>Posting Date:</label>
                <span>{entry.posting_date ? formatDate(entry.posting_date) : 'Not posted'}</span>
              </div>
              <div className="jev-header-item">
                <label>Reference Number:</label>
                <span>{entry.reference_number || 'N/A'}</span>
              </div>
              <div className="jev-header-item">
                <label>Entry Type:</label>
                <span className={`jev-type jev-type-${entry.entry_type.toLowerCase()}`}>
                  {entry.entry_type.replace('_', ' ')}
                </span>
              </div>
              <div className="jev-header-item">
                <label>Status:</label>
                <span className={`jev-status jev-status-${entry.status.toLowerCase()}`}>
                  {entry.status}
                </span>
              </div>
              <div className="jev-header-item">
                <label>Source Module:</label>
                <span>{entry.source_module || 'Manual'}</span>
              </div>
              <div className="jev-header-item">
                <label>Balanced:</label>
                <span className={`jev-balance ${entry.is_balanced ? 'balanced' : 'unbalanced'}`}>
                  {entry.is_balanced ? '✓ Balanced' : '✗ Unbalanced'}
                </span>
              </div>
            </div>

            <div className="jev-description-section">
              <label>Description:</label>
              <p>{entry.description}</p>
            </div>
          </div>

          {/* Journal Lines */}
          <h3 className="sectionTitle">Journal Entry Lines</h3>
          <div className="jev-lines-section">
            <div className="jev-lines-table-container">
              <table className="jev-lines-table">
                <thead>
                  <tr>
                    <th>Account No.</th>
                    <th>Account Name</th>
                    <th>Description</th>
                    <th>Debit</th>
                    <th>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.journal_lines.map((line) => (
                    <tr key={line.line_id}>
                      <td className="jev-account-code">
                        {line.account?.account_code || 'N/A'}
                      </td>
                      <td className="jev-account-name">
                        {line.account?.account_name || 'N/A'}
                      </td>
                      <td className="jev-line-description">
                        {line.description || 'N/A'}
                      </td>
                      <td className="jev-amount debit">
                        {line.debit_amount ? formatMoney(line.debit_amount) : '-'}
                      </td>
                      <td className="jev-amount credit">
                        {line.credit_amount ? formatMoney(line.credit_amount) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="jev-totals-row">
                    <td colSpan={3} className="jev-totals-label">TOTALS:</td>
                    <td className="jev-total-debit">{formatMoney(entry.total_debit)}</td>
                    <td className="jev-total-credit">{formatMoney(entry.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Audit Information */}
          <h3 className="sectionTitle">Audit Information</h3>
          <div className="jev-audit-section">
            <div className="jev-audit-grid">
              <div className="jev-audit-item">
                <label>Created By:</label>
                <span>{entry.created_by}</span>
              </div>
              <div className="jev-audit-item">
                <label>Created At:</label>
                <span>{formatDate(entry.created_at)}</span>
              </div>
              {entry.posted_by && (
                <>
                  <div className="jev-audit-item">
                    <label>Posted By:</label>
                    <span>{entry.posted_by}</span>
                  </div>
                  <div className="jev-audit-item">
                    <label>Posted At:</label>
                    <span>{formatDate(entry.posted_at!)}</span>
                  </div>
                </>
              )}
              <div className="jev-audit-item">
                <label>Last Updated:</label>
                <span>{formatDate(entry.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modalButtons">
          <button type="button" onClick={onClose} className="cancelButton">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to document body for proper overlay behavior
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  // Fallback for SSR
  return modalContent;
};

export default JEVViewModal;