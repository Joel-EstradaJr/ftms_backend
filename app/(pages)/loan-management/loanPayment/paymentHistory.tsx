"use client";

import React, { useState, useMemo } from 'react';
import '../../../styles/components/modal.css';
import '../../../styles/loan-management/paymentHistory.css';
import {
  showDeletePaymentConfirmation,
  showDeletePaymentSuccess,
  showEditPaymentConfirmation,
  showConfirmation
} from '@/app/utility/Alerts';

interface PaymentHistoryProps {
  show: boolean;
  loan: any;
  onClose: () => void;
  onEdit?: (paymentId: string) => void;
  onDelete?: (paymentId: string) => Promise<void>;
}

type SortField = 'payment_date' | 'payment_amount' | 'payment_method' | 'receipt_number';
type SortDirection = 'asc' | 'desc';

export default function PaymentHistory({ show, loan, onClose, onEdit, onDelete }: PaymentHistoryProps) {
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('payment_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!show || !loan) return null;

  /**
   * Formats number as Philippine Peso currency
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  /**
   * Formats date to readable format
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  /**
   * Format payment method for display
   */
  const formatPaymentMethod = (method: string) => {
    const methods: { [key: string]: string } = {
      'CASH': 'Cash',
      'CHECK': 'Check',
      'BANK_TRANSFER': 'Bank Transfer',
      'SALARY_DEDUCTION': 'Salary Deduction',
      'PAYROLL_ADJUSTMENT': 'Payroll Adjustment'
    };
    return methods[method] || method;
  };

  /**
   * Get filtered and sorted payments
   */
  const filteredPayments = useMemo(() => {
    let payments = loan.loanPayments || loan.payment_records || loan.payments || [];

    // Apply date range filter
    if (startDate) {
      payments = payments.filter((p: any) => 
        new Date(p.payment_date) >= new Date(startDate)
      );
    }
    if (endDate) {
      payments = payments.filter((p: any) => 
        new Date(p.payment_date) <= new Date(endDate)
      );
    }

    // Apply payment method filter
    if (paymentMethod) {
      payments = payments.filter((p: any) => 
        p.payment_method === paymentMethod
      );
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      payments = payments.filter((p: any) =>
        (p.receipt_number?.toLowerCase().includes(term)) ||
        (p.reference_number?.toLowerCase().includes(term)) ||
        (p.notes?.toLowerCase().includes(term))
      );
    }

    // Apply sorting
    payments.sort((a: any, b: any) => {
      let aVal, bVal;

      switch (sortField) {
        case 'payment_date':
          aVal = new Date(a.payment_date).getTime();
          bVal = new Date(b.payment_date).getTime();
          break;
        case 'payment_amount':
          aVal = a.payment_amount;
          bVal = b.payment_amount;
          break;
        case 'payment_method':
          aVal = a.payment_method;
          bVal = b.payment_method;
          break;
        case 'receipt_number':
          aVal = a.receipt_number || '';
          bVal = b.receipt_number || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return payments;
  }, [loan.loanPayments, startDate, endDate, paymentMethod, searchTerm, sortField, sortDirection]);

  /**
   * Get paginated payments
   */
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredPayments.slice(start, end);
  }, [filteredPayments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  /**
   * Handle sort column click
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  /**
   * Reset all filters
   */
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setPaymentMethod('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  /**
   * Handle export to CSV with confirmation
   */
  const handleExport = async () => {
    const result = await showConfirmation(
      `Export <b>${filteredPayments.length} payment record(s)</b> to CSV file?`,
      'Export Payment History'
    );

    if (!result.isConfirmed) return;

    const csvHeaders = ['Date', 'Amount', 'Method', 'Receipt Number', 'Reference Number', 'Notes'];
    const csvRows = filteredPayments.map((p: any) => [
      formatDate(p.payment_date),
      p.payment_amount,
      formatPaymentMethod(p.payment_method),
      p.receipt_number || '',
      p.reference_number || '',
      p.notes || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${loan.loan_id || loan.loan_request_id || loan.id}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  /**
   * Handle delete payment with confirmation
   */
  const handleDelete = async (payment: any) => {
    const result = await showDeletePaymentConfirmation(
      payment.payment_id,
      payment.payment_amount
    );

    if (result.isConfirmed && onDelete) {
      try {
        await onDelete(payment.payment_id);
        await showDeletePaymentSuccess();
      } catch (error) {
        console.error('Error deleting payment:', error);
      }
    }
  };

  /**
   * Handle edit payment with confirmation
   */
  const handleEdit = async (payment: any) => {
    const result = await showEditPaymentConfirmation(payment.payment_id);
    
    if (result.isConfirmed && onEdit) {
      onEdit(payment.payment_id);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContainer" style={{ maxWidth: '1400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h1>💳 Payment History - {loan.loan_id || loan.loan_request_id || loan.id}</h1>
          <button className="closeButton" onClick={onClose}>&times;</button>
        </div>

        <div className="modalContent payment-history-container">
          {/* Search Bar */}
          <div className="payment-search-bar">
            <input
              type="text"
              className="payment-search-input"
              placeholder="🔍 Search by receipt number, reference, or notes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <button className="payment-search-btn" onClick={() => setCurrentPage(1)}>
              Search
            </button>
          </div>

          {/* Filter Bar */}
          <div className="payment-history-filters">
            <div className="filters-row">
              <div className="filter-group">
                <label className="filter-label">Start Date</label>
                <input
                  type="date"
                  className="filter-input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">End Date</label>
                <input
                  type="date"
                  className="filter-input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Payment Method</label>
                <select
                  className="filter-select"
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All Methods</option>
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="SALARY_DEDUCTION">Salary Deduction</option>
                  <option value="PAYROLL_ADJUSTMENT">Payroll Adjustment</option>
                </select>
              </div>

              <div className="filter-button-group">
                <button className="filter-btn reset" onClick={handleResetFilters}>
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Table Controls */}
          <div className="table-controls">
            <div className="table-info">
              Showing <strong>{paginatedPayments.length}</strong> of <strong>{filteredPayments.length}</strong> payments
            </div>
            <div className="table-actions">
              <button className="table-action-btn export" onClick={handleExport}>
                📥 Export CSV
              </button>
            </div>
          </div>

          {/* Payment History Table */}
          {filteredPayments.length > 0 ? (
            <>
              <div className="payment-history-table-container">
                <table className="payment-history-table">
                  <thead>
                    <tr>
                      <th 
                        className={`sortable ${sortField === 'payment_date' ? sortDirection : ''}`}
                        onClick={() => handleSort('payment_date')}
                      >
                        Payment Date
                      </th>
                      <th 
                        className={`sortable ${sortField === 'payment_amount' ? sortDirection : ''}`}
                        onClick={() => handleSort('payment_amount')}
                      >
                        Amount
                      </th>
                      <th 
                        className={`sortable ${sortField === 'payment_method' ? sortDirection : ''}`}
                        onClick={() => handleSort('payment_method')}
                      >
                        Method
                      </th>
                      <th 
                        className={`sortable ${sortField === 'receipt_number' ? sortDirection : ''}`}
                        onClick={() => handleSort('receipt_number')}
                      >
                        Receipt #
                      </th>
                      <th>Reference #</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((payment: any, index: number) => (
                      <tr key={payment.payment_id || index}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td className="payment-amount-cell">
                          {formatCurrency(payment.payment_amount)}
                        </td>
                        <td>{formatPaymentMethod(payment.payment_method)}</td>
                        <td className="payment-receipt-cell">
                          {payment.receipt_number || 'N/A'}
                        </td>
                        <td className="payment-receipt-cell">
                          {payment.reference_number || 'N/A'}
                        </td>
                        <td>
                          <span className="payment-status-badge paid">Paid</span>
                        </td>
                        <td>
                          <div className="payment-row-actions">
                            <button
                              className="payment-row-action-btn view"
                              onClick={() => alert(`View payment ${payment.payment_id}`)}
                              title="View Details"
                            >
                              👁️
                            </button>
                            {onEdit && (
                              <button
                                className="payment-row-action-btn edit"
                                onClick={() => handleEdit(payment)}
                                title="Edit Payment"
                              >
                                ✏️
                              </button>
                            )}
                            {onDelete && (
                              <button
                                className="payment-row-action-btn delete"
                                onClick={() => handleDelete(payment)}
                                title="Delete Payment"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="payment-pagination">
                  <div className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Prev
                    </button>
                    <div className="pagination-page-numbers">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                        if (pageNum > totalPages) return null;
                        return (
                          <button
                            key={pageNum}
                            className={`pagination-btn ${pageNum === currentPage ? 'active' : ''}`}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="payment-history-empty">
              <div className="payment-history-empty-icon">💳</div>
              <div className="payment-history-empty-title">No Payments Found</div>
              <div className="payment-history-empty-message">
                {searchTerm || startDate || endDate || paymentMethod
                  ? 'Try adjusting your filters'
                  : 'No payment history available for this loan'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
