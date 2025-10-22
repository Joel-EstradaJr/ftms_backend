'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import ModalHeader from '../../../../Components/ModalHeader';
import ItemsTable from '../../../../Components/itemTable';
import '../../../../styles/components/modal.css';
import { OperationalExpense } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';

interface OperationalExpenseViewModalProps {
  expense: OperationalExpense;
  onClose: () => void;
}

const OperationalExpenseViewModal: React.FC<OperationalExpenseViewModalProps> = ({ expense, onClose }) => {
  const [showItems, setShowItems] = useState(true);

  const modalContent = (
    <div className="modalOverlay">
      <div className="modalStandard">
        <ModalHeader
          title={`Operational Expense - ${expense.receipt_number || expense.id}`}
          onClose={onClose}
        />

        <div className="modalContent">
          <h3 className="sectionTitle">Expense Details</h3>
          <div className="formRow">
            <div className="formField">
              <label>Date:</label>
              <input type="text" value={formatDate(expense.date)} readOnly />
            </div>
            <div className="formField">
              <label>Expense Type:</label>
              <div style={{ padding: '0.5rem 0' }}>
                <span className={`chip ${expense.expense_type.toLowerCase()}`}>
                  {expense.expense_type.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <div className="formField">
              <label>Amount:</label>
              <input type="text" value={formatMoney(expense.amount)} readOnly className="amount-text" />
            </div>
          </div>
          <div className="formRow">
            <div className="formField">
              <label>Status:</label>
              <div style={{ padding: '0.5rem 0' }}>
                <span className={`chip ${expense.status.toLowerCase()}`}>
                  {expense.status.charAt(0).toUpperCase() + expense.status.slice(1).toLowerCase()}
                </span>
              </div>
            </div>
            <div className="formField">
              <label>Category:</label>
              <input type="text" value={expense.category || '-'} readOnly />
            </div>
            <div className="formField">
              <label>Receipt Number:</label>
              <input type="text" value={expense.receipt_number || '-'} readOnly />
            </div>
          </div>

          <div className="formRow">
            <div className="formField full-width">
              <label>Description:</label>
              <textarea value={expense.description} readOnly rows={3} />
            </div>
          </div>
        </div>

        <div className="modalContent">
          <h3 className="sectionTitle">Bus & Employee Information</h3>
          <div className="formRow">
            <div className="formField">
              <label>Bus Number:</label>
              <input type="text" value={expense.bus_number || 'N/A'} readOnly />
            </div>
            <div className="formField">
              <label>Employee:</label>
              <input type="text" value={expense.employee_name || 'N/A'} readOnly />
            </div>
          </div>
        </div>

        <div className="modalContent">
          <h3 className="sectionTitle">Audit Information</h3>
          <div className="formRow">
            <div className="formField">
              <label>Created By:</label>
              <input type="text" value={expense.created_by} readOnly />
            </div>
            <div className="formField">
              <label>Created At:</label>
              <input type="text" value={formatDate(expense.created_at)} readOnly />
            </div>
          </div>
          {expense.approved_by && (
            <div className="formRow">
              <div className="formField">
                <label>Approved By:</label>
                <input type="text" value={expense.approved_by} readOnly />
              </div>
              <div className="formField">
                <label>Approved At:</label>
                <input type="text" value={formatDate(expense.approved_at!)} readOnly />
              </div>
            </div>
          )}
          <div className="formRow">
            <div className="formField">
              <label>Last Updated:</label>
              <input type="text" value={formatDate(expense.updated_at)} readOnly />
            </div>
          </div>
        </div>

          {/* Items Table */}
          {expense.items && expense.items.length > 0 && (
            <div className="modalContent">
                <div style={{ marginTop: '1.5rem' }}>
                    <ItemsTable
                        items={expense.items}
                        onItemsChange={() => {}}
                        showItems={showItems}
                        onToggleItems={() => setShowItems(!showItems)}
                        readOnly={true}
                        title="Expense Items"
                    />
                </div>
            </div>
          )}
        

        <div className="modalButtons">
          <button type="button" onClick={onClose} className="cancelButton">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default OperationalExpenseViewModal;
