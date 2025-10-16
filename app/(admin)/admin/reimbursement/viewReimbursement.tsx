"use client";
import React, { useState } from "react";
import ViewExpenseModal from '../expense/viewExpense';
import '../../../styles/reimbursement/viewReimbursement.css';
import ModalHeader from '@/app/Components/ModalHeader';

type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  job_title?: string;
  amount: number;
  status: string;
  requested_date: string;
  submitted_date?: string;
  approved_by?: string | null;
  approved_date?: string | null;
  rejection_reason?: string | null;
  paid_by?: string | null;
  paid_date?: string | null;
  payment_reference?: string | null;
  payment_method?: string | null;
  created_by: string;
  created_at: string;
  updated_by?: string | null;
  updated_at?: string | null;
  is_deleted: boolean;
  cancelled_by?: string | null;
  cancelled_date?: string | null;
  remarks?: string | null;
  expense?: {
    expense_id: string;
    category: {
      category_id: string;
      name: string;
    };
    total_amount: number;
    expense_date: string;
    assignment_id?: string;
    payment_method: {
      id: string;
      name: string;
    };
  };
};

interface ViewReimbursementProps {
  isOpen: boolean;
  onClose: () => void;
  record: Reimbursement | null;
  onReimburse?: (reimbursementId: string, notes: string) => void;
}

const formatDisplay = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? "-" : value;

const ViewReimbursement: React.FC<ViewReimbursementProps> = ({
  isOpen,
  onClose,
  record
}) => {
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  if (!isOpen || !record) return null;

  return (
    <>
      <div className="modalOverlay" onClick={onClose}>
        <div className="viewReimbursementModal" onClick={e => e.stopPropagation()}>
          <ModalHeader title="Reimbursement Details" onClose={onClose} />
          <div className="modalBody">
            <div className="mainDetails">
              <div className="detailRow">
                <span className="label">Employee Name:</span>
                <span className="value">{record.employee_name}</span>
              </div>
              {record.job_title && (
                <div className="detailRow">
                  <span className="label">Job Title:</span>
                  <span className="value">{record.job_title}</span>
                </div>
              )}
              <div className="detailRow">
                <span className="label">Expense Reference:</span>
                <span className="value">
                  <button 
                    className="linkButton"
                    onClick={() => setShowExpenseModal(true)}
                    disabled={!record.expense}
                  >
                    {record.expense ? 
                      `View Expense - ${record.expense.category.name} (₱${record.expense.total_amount.toLocaleString()})` : 
                      'Expense details not available'
                    }
                  </button>
                </span>
              </div>
              <div className="detailRow">
                <span className="label">Submitted Date:</span>
                <span className="value">{formatDisplay(record.submitted_date || record.requested_date)}</span>
              </div>
              <div className="detailRow">
                <span className="label">Status:</span>
                <span className={`value viewStatus ${typeof record.status === 'string' ? record.status.toLowerCase() : ''} ${record.status === 'CANCELLED' ? 'status-cancelled' : ''}`}>
                  {record.status || '-'}
                </span>
              </div>
              {record.status === "CANCELLED" && (
                <>
                  <div className="detailRow">
                    <span className="label">Cancelled By:</span>
                    <span className="value">{formatDisplay(record.cancelled_by)}</span>
                  </div>
                  <div className="detailRow">
                    <span className="label">Cancelled Date:</span>
                    <span className="value">{formatDisplay(record.cancelled_date ? new Date(record.cancelled_date).toLocaleDateString() : null)}</span>
                  </div>
                </>
              )}
              <div className="detailRow">
                <span className="label">Approved By:</span>
                <span className="value">{formatDisplay(record.approved_by)}</span>
              </div>
              <div className="detailRow">
                <span className="label">Approved Date:</span>
                <span className="value">{formatDisplay(record.approved_date)}</span>
              </div>
              <div className="detailRow">
                <span className="label">Approved Amount:</span>
                <span className="value">
                  {record.amount !== null
                    ? `₱${record.amount.toFixed(2)}`
                    : "-"}
                </span>
              </div>
              <div className="detailRow">
                <span className="label">Paid Date:</span>
                <span className="value">{formatDisplay(record.paid_date)}</span>
              </div>
              {record.status === "REJECTED" && (
                <div className="detailRow">
                  <span className="label">Rejection Reason:</span>
                  <span className="value fullDetails">{formatDisplay(record.rejection_reason)}</span>
                </div>
              )}
              {/* Display remarks if they exist - not just for Paid status */}
              {record.remarks && record.remarks.trim() !== '' && (
                <div className="detailRow">
                  <span className="label">Remarks:</span>
                  <span className="value fullDetails">{formatDisplay(record.remarks)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="modalFooter">
            <button className="closeBtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && record.expense && (
        <ViewExpenseModal
          record={record.expense}
          onClose={() => setShowExpenseModal(false)}
        />
      )}
    </>
  );
};

export default ViewReimbursement;