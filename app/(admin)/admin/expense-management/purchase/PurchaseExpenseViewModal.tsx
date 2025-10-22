'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import ModalHeader from '../../../../Components/ModalHeader';
import ItemsTable from '../../../../Components/itemTable';
import '../../../../styles/components/modal.css';
import { PurchaseExpense } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';

interface PurchaseExpenseViewModalProps {
  expense: PurchaseExpense;
  onClose: () => void;
}

const PurchaseExpenseViewModal: React.FC<PurchaseExpenseViewModalProps> = ({ expense, onClose }) => {
  const [showItems, setShowItems] = useState(true);
  
  // Calculate budget utilization
  const budgetUtilization =
    expense.budget_allocated && expense.budget_allocated > 0
      ? ((expense.budget_utilized || 0) / expense.budget_allocated) * 100
      : 0;

  const modalContent = (
    <div className="modalOverlay">
      <div className="modalStandard">
        <ModalHeader
          title={`Purchase Expense - ${expense.pr_number}`}
          onClose={onClose}
        />

        <div className="modalContent">
          <h3 className="sectionTitle">Purchase Request Details</h3>
          <div className="formRow">
            <div className="formField">
              <label>PR Number:</label>
              <input type="text" value={expense.pr_number} readOnly />
            </div>
            <div className="formField">
              <label>PR Date:</label>
              <input type="text" value={formatDate(expense.pr_date)} readOnly />
            </div>
            <div className="formField">
              <label>Supplier:</label>
              <input type="text" value={expense.supplier || 'N/A'} readOnly />
            </div>
          </div>
          <div className="formRow">
            <div className="formField">
              <label>Category:</label>
              <input type="text" value={expense.category || 'N/A'} readOnly />
            </div>
            <div className="formField">
              <label>Amount:</label>
              <input type="text" value={formatMoney(expense.amount)} readOnly className="amount-text" />
            </div>
            <div className="formField">
              <label>Status:</label>
              <div style={{ padding: '0.5rem 0' }}>
                <span className={`chip ${expense.status.toLowerCase()}`}>
                  {expense.status.charAt(0).toUpperCase() + expense.status.slice(1).toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="formRow">
            <div className="formField full-width">
              <label>Description:</label>
              <textarea value={expense.description} readOnly rows={3} />
            </div>
          </div>

          <h3 className="sectionTitle">Delivery Receipt Details</h3>
          <div className="formRow">
            <div className="formField">
              <label>DR Number:</label>
              <input type="text" value={expense.dr_number || 'Not yet delivered'} readOnly />
            </div>
            <div className="formField">
              <label>DR Date:</label>
              <input type="text" value={expense.dr_date ? formatDate(expense.dr_date) : '-'} readOnly />
            </div>
          </div>
          <div className="formRow">
            <div className="formField">
              <label>Receipt Number:</label>
              <input type="text" value={expense.receipt_number || '-'} readOnly />
            </div>
            <div className="formField">
              <label>Posting Date:</label>
              <input type="text" value={expense.date ? formatDate(expense.date) : '-'} readOnly />
            </div>
          </div>
        </div>

        <div className="modalContent">
          <h3 className="sectionTitle">Budget Utilization</h3>
          <div className="formRow">
            <div className="formField">
              <label>Budget Code:</label>
              <input type="text" value={expense.budget_code || 'N/A'} readOnly />
            </div>
            <div className="formField">
              <label>Budget Allocated:</label>
              <input 
                type="text" 
                value={expense.budget_allocated ? formatMoney(expense.budget_allocated) : 'N/A'} 
                readOnly 
                className="amount-text" 
              />
            </div>
          </div>
          <div className="formRow">
            <div className="formField">
              <label>Budget Utilized (Before):</label>
              <input 
                type="text" 
                value={expense.budget_utilized ? formatMoney(expense.budget_utilized) : 'N/A'} 
                readOnly 
                className="amount-text" 
              />
            </div>
            <div className="formField">
              <label>Utilization Rate:</label>
              <div style={{ padding: '0.5rem 0' }}>
                <span
                  className={`budget-utilization ${
                    budgetUtilization > 80 ? 'high' : budgetUtilization > 50 ? 'medium' : 'low'
                  }`}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                  }}
                >
                  {expense.budget_allocated ? `${budgetUtilization.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
          {(expense.status === 'REFUNDED' || expense.status === 'REPLACED') && expense.adjustment_reason && (
            <div className="modalContent">
              <h3 className="sectionTitle">Adjustment Information</h3>
              <div className="formRow">
                <div className="formField">
                  <label>Adjustment Reason:</label>
                  <textarea value={expense.adjustment_reason} readOnly rows={2} />
                </div>
                <div className="formField">
                  <label>Adjustment Amount:</label>
                  <input 
                    type="text" 
                    value={expense.adjustment_amount ? formatMoney(expense.adjustment_amount) : '-'} 
                    readOnly 
                    className="amount-text" 
                  />
                </div>
              </div>
            </div>
          )}

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

          {/* Items Table */}
          {expense.items && expense.items.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <ItemsTable
                items={expense.items}
                onItemsChange={() => {}}
                showItems={showItems}
                onToggleItems={() => setShowItems(!showItems)}
                readOnly={true}
                title="Purchase Items"
              />
            </div>
          )}
        </div>        
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default PurchaseExpenseViewModal;
