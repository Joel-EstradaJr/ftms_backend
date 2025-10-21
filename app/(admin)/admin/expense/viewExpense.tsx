// app/(pages)/expense/viewExpense.tsx
'use client';
import React from 'react';
import '../../../styles/components/modal.css';
import '../../../styles/expense/viewExpense.css';
import { formatDisplayText, formatDateTime } from '@/app/utils/formatting';
import ModalHeader from '@/app/Components/ModalHeader';

type ViewExpenseModalProps = {
  record: any; // API response type - full expense with relations
  onClose: () => void;
};

const ViewExpenseModal: React.FC<ViewExpenseModalProps> = ({ record, onClose }) => {
  const renderOperationsDetails = () => {
    if (!record.busTripCache) return null;

    const busTripCache = record.busTripCache;

    return (
      <div className="operationsDetails">
        <h3>Operations Details (Bus Trip)</h3>
        <div className="detailRow">
          <span className="label">Bus Plate Number:</span>
          <span className="value">{busTripCache.busPlateNumber}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Route:</span>
          <span className="value">{busTripCache.busRoute}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Type:</span>
          <span className="value">{busTripCache.busType}</span>
        </div>
        <div className="detailRow">
          <span className="label">Driver:</span>
          <span className="value">{busTripCache.driverName}</span>
        </div>
        <div className="detailRow">
          <span className="label">Conductor:</span>
          <span className="value">{busTripCache.conductorName}</span>
        </div>
        <div className="detailRow">
          <span className="label">Date Assigned:</span>
          <span className="value">{formatDateTime(busTripCache.dateAssigned)}</span>
        </div>
        <div className="detailRow">
          <span className="label">Trip Revenue:</span>
          <span className="value">₱{Number(busTripCache.tripRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="detailRow">
          <span className="label">Assignment Type:</span>
          <span className="value">{busTripCache.assignmentType}</span>
        </div>
        <div className="detailRow">
          <span className="label">Assignment Value:</span>
          <span className="value">
            {busTripCache.assignmentType === 'Percentage' 
              ? `${(Number(busTripCache.assignmentValue) * 100).toFixed(1)}%`
              : `₱${Number(busTripCache.assignmentValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          </span>
        </div>
      </div>
    );
  };

  const renderVendorDetails = () => {
    if (!record.vendorName && !record.vendorId) return null;

    return (
      <div className="otherDetails">
        <h3>Vendor Details</h3>
        {record.vendorName && (
          <div className="detailRow">
            <span className="label">Vendor Name:</span>
            <span className="value">{record.vendorName}</span>
          </div>
        )}
        {record.vendorId && (
          <div className="detailRow">
            <span className="label">Vendor ID:</span>
            <span className="value">{record.vendorId}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modalOverlay">
      <div className="viewExpenseModal">
        <ModalHeader title="View Expense" onClose={onClose} showDateTime={true} />

        <div className="mainDetails">
          <div className="detailRow">
            <span className="label">Expense Code:</span>
            <span className="value">{record.expenseCode || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Category:</span>
            <span className="value">{record.category?.name || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Description:</span>
            <span className="value">{record.description || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Amount:</span>
            <span className="value">₱{Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="detailRow">
            <span className="label">Transaction Date:</span>
            <span className="value">{formatDateTime(record.transactionDate)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Payment Method:</span>
            <span className="value">{record.paymentMethod?.methodName || 'N/A'}</span>
          </div>
          
          {/* Reimbursement breakdown */}
          {record.isReimbursement && record.reimbursements && record.reimbursements.length > 0 && (
            <div className="detailRow">
              <span className="label">Reimbursements:</span>
              <span className="value">
                {record.reimbursements.map((r: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: '0.5rem' }}>
                    <strong>{r.employeeName}</strong> ({r.employeeNumber})
                    <br />
                    Amount: ₱{Number(r.claimedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <br />
                    Status: <span className={`chip ${r.status.toLowerCase()}`}>{r.status}</span>
                    {r.approvedAmount && (
                      <>
                        <br />
                        Approved: ₱{Number(r.approvedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </>
                    )}
                  </div>
                ))}
              </span>
            </div>
          )}

          {/* Accounts Payable */}
          {record.isPayable && (
            <>
              <div className="detailRow">
                <span className="label">Payable Status:</span>
                <span className="value">
                  <span className={`chip ${record.payableStatus?.toLowerCase()}`}>
                    {record.payableStatus || 'PENDING'}
                  </span>
                </span>
              </div>
              {record.payableDueDate && (
                <div className="detailRow">
                  <span className="label">Due Date:</span>
                  <span className="value">{formatDateTime(record.payableDueDate)}</span>
                </div>
              )}
              {record.payablePaidDate && (
                <div className="detailRow">
                  <span className="label">Paid Date:</span>
                  <span className="value">{formatDateTime(record.payablePaidDate)}</span>
                </div>
              )}
            </>
          )}

          <div className="detailRow">
            <span className="label">Created By:</span>
            <span className="value">{record.createdBy || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Created At:</span>
            <span className="value">{formatDateTime(record.createdAt)}</span>
          </div>
        </div>

        {record.busTripCache && renderOperationsDetails()}
        {renderVendorDetails()}

        {!record.busTripCache && !record.vendorName && (
          <div className="otherDetails">
            <h3>Additional Details</h3>
            <div className="detailRow">
              <span className="label">Source:</span>
              <span className="value">Manual Entry</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewExpenseModal;