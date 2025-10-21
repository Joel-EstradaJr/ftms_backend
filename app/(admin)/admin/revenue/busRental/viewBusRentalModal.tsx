// app/(admin)/admin/revenue/busRental/viewBusRentalModal.tsx
'use client';

import React from 'react';
import '../../../../styles/revenue/viewBusRental.css';
import ModalHeader from '../../../../Components/ModalHeader';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import '../../../../styles/components/modal.css';

interface BusRentalRecord {
  id: number;
  revenueCode: string;
  transactionDate: string;
  description: string;
  amount: number;
  sourceId: number;
  source: {
    id: number;
    name: string;
    sourceCode: string;
  };
  paymentMethodId: number;
  paymentMethod: {
    id: number;
    methodName: string;
    methodCode: string;
  };
  externalRefType: string;
  externalRefId: string;
  renterName?: string;
  busPlateNumber?: string;
  bodyNumber?: string;
  rentalStartDate?: string;
  rentalEndDate?: string;
  status: string;
}

interface ViewBusRentalModalProps {
  record: BusRentalRecord;
  onClose: () => void;
}

const ViewBusRentalModal: React.FC<ViewBusRentalModalProps> = ({ record, onClose }) => {
  return (
    <div className="modalOverlay">
      <div className="viewBusRentalModal">
        <ModalHeader title="View Bus Rental" onClose={onClose} />

        <div className="modalContent">
          <div className="detailRow">
            <span className="label">Revenue Code:</span>
            <span className="value">{record.revenueCode}</span>
          </div>
          <div className="detailRow">
            <span className="label">Transaction Date:</span>
            <span className="value">{formatDate(record.transactionDate)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Amount:</span>
            <span className="value">{formatMoney(record.amount)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Payment Method:</span>
            <span className="value">{record.paymentMethod.methodName}</span>
          </div>
          <div className="detailRow">
            <span className="label">Status:</span>
            <span className="value">{record.status || 'Completed'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Description:</span>
            <span className="value">{record.description || '—'}</span>
          </div>
        </div>

        <div className="modalContent">
          <h3 className="sectionTitle">Rental Details</h3>
          <div className="detailRow">
            <span className="label">Renter Name:</span>
            <span className="value">{record.renterName || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Bus Plate Number:</span>
            <span className="value">{record.busPlateNumber || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Body Number:</span>
            <span className="value">{record.bodyNumber || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Rental Start Date:</span>
            <span className="value">{record.rentalStartDate ? formatDate(record.rentalStartDate) : 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Rental End Date:</span>
            <span className="value">{record.rentalEndDate ? formatDate(record.rentalEndDate) : 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">External Reference:</span>
            <span className="value">{record.externalRefType}: {record.externalRefId}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBusRentalModal;