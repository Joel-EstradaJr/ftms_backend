// app/(pages)/revenue/viewRevenue.tsx
'use client';

import React, { useState, useEffect } from 'react';
import '../../styles/revenue/viewRevenue.css';
import { formatDateTime } from '../../utility/dateFormatter';
import { formatDisplayText } from '@/app/utils/formatting';
import { formatPeso } from '@/app/utils/revenueCalc';
import type { Assignment } from '@/lib/operations/assignments';
import ModalHeader from '@/app/Components/ModalHeader';
import { getEmployeesCached, getRevenueGlobalsCached } from '@/lib/clientStore';

type GlobalCategory = {
  category_id: string;
  name: string;
  applicable_modules: string[];
};

type Employee = {
  employee_id: string;
  name: string;
  job_title: string;
};

type ViewRevenueProps = {
  record: {
    revenue_id: string;
    category?: GlobalCategory;
    category_id?: string;
    total_amount: number;
    collection_date: string;
    created_at: string;
    assignment?: Assignment;
    payment_status_name?: string;
    payment_method_name?: string;
    remarks?: string;
  };
  onClose: () => void;
};

const ViewRevenue: React.FC<ViewRevenueProps> = ({ record, onClose }) => {
  const [, setAllEmployees] = useState<Employee[]>([]);
  const [categoryName, setCategoryName] = useState<string>('Loading...');
  // AR fields
  const [isReceivable, setIsReceivable] = useState<boolean>(false);
  const [payerName, setPayerName] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [interestRate, setInterestRate] = useState<number>(0);
  const [installments, setInstallments] = useState<Array<{
    installment_id: string;
    installment_number: number;
    due_date: string;
    amount_due: number;
    amount_paid: number;
    payment_status_name?: string;
    payment_method_name?: string;
    paid_date?: string | null;
  }>>([]);
  // Attachments state
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    file_id?: string | null;
    path?: string | null;
    original_name: string;
    uploaded_at?: string;
    size_bytes?: number;
    mime_type?: string;
  }>>([]);
  // Payments
  const [payments, setPayments] = useState<Array<{
    id: string;
    amount: number;
    paid_date?: string;
    reference_number?: string | null;
    remarks?: string | null;
    payment_method_name?: string;
    payment_status_name?: string;
    installment_number?: number | null;
  }>>([]);

  // Fetch employees and category data on component mount (cached)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeesData = await getEmployeesCached();
        setAllEmployees(employeesData);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    const fetchCategoryName = async () => {
      if (record.category?.name) {
        setCategoryName(record.category.name);
        return;
      }

      if (record.category_id) {
        try {
          const g = await getRevenueGlobalsCached();
          const cat = (g.categories || []).find(c => c.category_id === record.category_id);
          setCategoryName(cat?.name || 'Unknown Category');
        } catch (error) {
          console.error('Error fetching category:', error);
          setCategoryName('Unknown Category');
        }
      } else {
        setCategoryName('Unknown Category');
      }
    };

    fetchEmployees();
    fetchCategoryName();
    // Fetch full revenue details for AR data
    const fetchRevenue = async () => {
      try {
        const res = await fetch(`/api/revenues/${record.revenue_id}`);
        if (!res.ok) return;
        const data = await res.json();
        setIsReceivable(!!data.is_receivable);
        setPayerName(data.payer_name || '');
        if (data.due_date) setDueDate(new Date(data.due_date).toISOString());
        if (data.interest_rate !== undefined && data.interest_rate !== null) setInterestRate(Number(data.interest_rate) || 0);
        if (Array.isArray(data.installments)) {
          setInstallments(data.installments.map((it: any) => ({
            installment_id: it.installment_id || `${it.revenue_id}-${it.installment_number}`,
            installment_number: it.installment_number,
            due_date: it.due_date,
            amount_due: Number(it.amount_due) || 0,
            amount_paid: Number(it.amount_paid) || 0,
            payment_status_name: it.payment_status?.name,
            payment_method_name: it.payment_method?.name,
            paid_date: it.paid_date || null,
          })));
        }
        if (Array.isArray(data.payments)) {
          setPayments(data.payments.map((p: any) => ({
            id: p.id,
            amount: Number(p.amount) || 0,
            paid_date: p.paid_date,
            reference_number: p.reference_number || null,
            remarks: p.remarks || null,
            payment_method_name: p.payment_method?.name,
            payment_status_name: p.payment_status?.name,
            installment_number: p.installment?.installment_number ?? null,
          })));
        }
      } catch (e) {
        // ignore
      }
    };
    fetchRevenue();

    // Fetch attachments for this revenue
    const fetchAttachments = async () => {
      try {
        const res = await fetch(`/api/revenues/${encodeURIComponent(record.revenue_id)}/attachments`);
        if (!res.ok) return;
        const items = await res.json();
        setAttachments(Array.isArray(items) ? items : []);
      } catch {
        // ignore
      }
    };
    fetchAttachments();
  }, [record.category, record.category_id]);

  const renderAssignmentDetails = () => {
    if (!record.assignment) return null;

    return (
      <div className="assignmentDetails">
        <h3>Assignment Details</h3>
        <div className="detailRow">
          <span className="label">Assignment Type:</span>
          <span className="value">{formatDisplayText(record.assignment.assignment_type)}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Number:</span>
          <span className="value">{record.assignment.bus_plate_number || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Body Number:</span>
          <span className="value">{record.assignment.body_number || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Route:</span>
          <span className="value">{record.assignment.bus_route}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Type:</span>
          <span className="value">{record.assignment.bus_type || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Driver:</span>
          <span className="value">{record.assignment.driver_name || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Conductor:</span>
          <span className="value">{record.assignment.conductor_name || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Date Assigned:</span>
          <span className="value">{formatDateTime(record.assignment.date_assigned)}</span>
        </div>
        <div className="detailRow">
          <span className="label">Trip Revenue:</span>
          <span className="value">{formatPeso(Number(record.assignment.trip_revenue))}</span>
        </div>
        <div className="detailRow">
          <span className="label">Assignment Value:</span>
          <span className="value">
            {record.assignment.assignment_type === 'Percentage' 
              ? `${(Number(record.assignment.assignment_value) * 100).toFixed(2)}%`
              : formatPeso(Number(record.assignment.assignment_value))}
          </span>
        </div>
      </div>
    );
  };


  return (
    <div className="modalOverlay">
      <div className="viewRevenueModal">
        <ModalHeader title="View Revenue" onClose={onClose} />

        <div className="mainDetails">
          <div className="detailRow">
            <span className="label">Category:</span>
            <span className="value">{categoryName}</span>
          </div>
          <div className="detailRow">
            <span className="label">Remitted Amount:</span>
            <span className="value">{formatPeso(Number(record.total_amount))}</span>
          </div>
          <div className="detailRow">
            <span className="label">Collection Date:</span>
            <span className="value">{formatDateTime(record.collection_date)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Payment Status:</span>
            <span className="value">{record.payment_status_name || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Payment Method:</span>
            <span className="value">{record.payment_method_name || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Remarks:</span>
            <span className="value">{record.remarks || '—'}</span>
          </div>
          {isReceivable && (
            <>
              <div className="detailRow">
                <span className="label">Accounts Receivable:</span>
                <span className="value">Yes</span>
              </div>
              <div className="detailRow">
                <span className="label">Payer Name:</span>
                <span className="value">{payerName || '—'}</span>
              </div>
              <div className="detailRow">
                <span className="label">Overall Due Date:</span>
                <span className="value">{dueDate ? formatDateTime(dueDate) : '—'}</span>
              </div>
              <div className="detailRow">
                <span className="label">Interest Rate:</span>
                <span className="value">{Number(interestRate).toFixed(2)}%</span>
              </div>
            </>
          )}
        </div>

        {record.assignment && renderAssignmentDetails()}

        {isReceivable && installments.length > 0 && (
          <div className="assignmentDetails">
            <h3>Installments</h3>
            <div className="tableWrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Due Date</th>
                    <th>Amount Due</th>
                    <th>Amount Paid</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map(inst => (
                    <tr key={inst.installment_id}>
                      <td>{inst.installment_number}</td>
                      <td>{formatDateTime(inst.due_date)}</td>
                      <td>{formatPeso(Number(inst.amount_due))}</td>
                      <td>{formatPeso(Number(inst.amount_paid))}</td>
                      <td>{inst.payment_status_name || '-'}</td>
                      <td>{inst.payment_method_name || '-'}</td>
                      <td>{inst.paid_date ? formatDateTime(inst.paid_date) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attachments Section */}
        <div className="assignmentDetails">
          <h3>Attachments</h3>
          {attachments.length === 0 ? (
            <div style={{ color: '#6c757d' }}>No attachments uploaded.</div>
          ) : (
            <ul>
              {attachments.map(att => (
                <li key={att.id}>
                  {att.file_id ? (
                    <a href={`/api/revenues/attachments/${att.id}/download`} target="_blank" rel="noreferrer">{att.original_name}</a>
                  ) : (
                    <a href={att.path || '#'} target="_blank" rel="noreferrer">{att.original_name || att.path}</a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payments Section */}
        {payments.length > 0 && (
          <div className="assignmentDetails">
            <h3>Payments</h3>
            <div className="tableWrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Installment</th>
                    <th>Reference</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>{p.paid_date ? formatDateTime(p.paid_date) : '-'}</td>
                      <td>{formatPeso(Number(p.amount))}</td>
                      <td>{p.payment_method_name || '-'}</td>
                      <td>{p.payment_status_name || '-'}</td>
                      <td>{p.installment_number != null ? `#${p.installment_number}` : '-'}</td>
                      <td>{p.reference_number || '-'}</td>
                      <td>{p.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

export default ViewRevenue;