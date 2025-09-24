// app/(pages)/expense/viewExpense.tsx
'use client';
import React from 'react';
import { formatDateTime } from '../../utility/dateFormatter';
import '../../styles/expense/viewExpense.css';
import { formatDisplayText } from '@/app/utils/formatting';
import type { Assignment } from '@/lib/operations/assignments';
import ModalHeader from '@/app/Components/ModalHeader';

type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  job_title?: string;
  amount: number;
  status: {
    id: string;
    name: string;
  };
  requested_date: string;
  approved_by?: string;
  approved_date?: string;
  rejection_reason?: string;
  paid_by?: string;
  paid_date?: string;
  payment_reference?: string;
  payment_method?: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  is_deleted: boolean;
  cancelled_by?: string;
  cancelled_date?: string;
};

type ExpenseRecord = {
  expense_id: string;
  category: {
    category_id: string;
    name: string;
  };
  total_amount: number;
  expense_date: string;
  assignment?: Assignment;
  // receipt removed
  payment_method: {
    id: string;
    name: string;
  };
  reimbursements?: Reimbursement[];
};

type ViewExpenseModalProps = {
  record: ExpenseRecord;
  onClose: () => void;
};

const ViewExpenseModal: React.FC<ViewExpenseModalProps> = ({ record, onClose }) => {
  // receipt view removed

  const renderOperationsDetails = () => {
    if (!record.assignment) return null;

    return (
      <div className="operationsDetails">
        <h3>Operations Details</h3>
        <div className="detailRow">
          <span className="label">Bus Plate Number:</span>
          <span className="value">{record.assignment.bus_plate_number}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Route:</span>
          <span className="value">{record.assignment.bus_route}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Type:</span>
          <span className="value">{record.assignment.bus_type}</span>
        </div>
        <div className="detailRow">
          <span className="label">Driver:</span>
          <span className="value">{record.assignment.driver_name || record.assignment.driver_id}</span>
        </div>
        <div className="detailRow">
          <span className="label">Conductor:</span>
          <span className="value">{record.assignment.conductor_name || record.assignment.conductor_id}</span>
        </div>
        <div className="detailRow">
          <span className="label">Date Assigned:</span>
          <span className="value">{formatDateTime(record.assignment.date_assigned)}</span>
        </div>
        <div className="detailRow">
          <span className="label">Trip Fuel Expense:</span>
          <span className="value">₱{record.assignment.trip_fuel_expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="modalOverlay">
      <div className="viewExpenseModal">
        <ModalHeader title="View Expense" onClose={onClose} />

        <div className="mainDetails">
          <div className="detailRow">
            <span className="label">Category:</span>
            <span className="value">{record.category.name === 'Other' ? 'Other' : formatDisplayText(record.category.name)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Submitted Amount:</span>
            <span className="value">₱{Number(record.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="detailRow">
            <span className="label">Entry Date:</span>
            <span className="value">{formatDateTime(record.expense_date)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Payment Method:</span>
            <span className="value">{record.payment_method.name === 'REIMBURSEMENT' ? 'Employee Reimbursement' : 'Company Paid (CASH)'}</span>
          </div>
          {/* Reimbursement breakdown */}
          {record.payment_method.name === 'REIMBURSEMENT' && record.reimbursements && record.reimbursements.length > 0 && (
            <div className="detailRow">
              <span className="label">Reimbursements:</span>
              <span className="value">
                {record.reimbursements.map((r: Reimbursement, idx: number) => (
                  <div key={idx}>{r.job_title ? r.job_title + ': ' : ''}{r.employee_name} (₱{Number(r.amount).toLocaleString()})</div>
                ))}
              </span>
            </div>
          )}
        </div>

        {record.assignment && renderOperationsDetails()}

        {!record.assignment && (
          <div className="otherDetails">
            <h3>Expense Source Details</h3>
            <div className="detailRow">
              <span className="value">N/A</span>
            </div>
          </div>
        )}

        <div className="modalFooter">
          <button className="closeBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewExpenseModal;