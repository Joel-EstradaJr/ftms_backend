"use client";

import React, { useState, useMemo } from 'react';
import '../../../styles/components/modal.css';
import '../../../styles/components/table.css';
import '../../../styles/loan-management/paymentHistory.css';
import {
  showConfirmation
} from '@/app/utils/Alerts';

interface PaymentHistoryProps {
  show: boolean;
  loans: any[]; // Array of all loans
  onClose: () => void;
  onPayNow?: (loan: any) => void;
}

type SortField = 'employee_name' | 'due_date' | 'amount_due' | 'balance';
type SortDirection = 'asc' | 'desc';

export default function PaymentHistory({ show, loans, onClose, onPayNow }: PaymentHistoryProps) {
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all'); // all, due_today, overdue, upcoming
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!show || !loans) return null;

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
   * Check if date is today
   */
  const isToday = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  /**
   * Get filtered and sorted loans overview
   */
  const filteredLoans = useMemo(() => {
    let loansList = [...loans].filter(loan => loan.status !== 'closed' && loan.remaining_balance > 0);

    // Apply status filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (statusFilter === 'due_today') {
      loansList = loansList.filter((loan: any) => {
        const dueDate = loan.next_payment_date ? new Date(loan.next_payment_date) : null;
        if (!dueDate) return false;
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });
    } else if (statusFilter === 'overdue') {
      loansList = loansList.filter((loan: any) => loan.is_overdue);
    } else if (statusFilter === 'upcoming') {
      loansList = loansList.filter((loan: any) => {
        const dueDate = loan.next_payment_date ? new Date(loan.next_payment_date) : null;
        if (!dueDate) return false;
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() > today.getTime();
      });
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      loansList = loansList.filter((loan: any) =>
        (loan.employee?.name?.toLowerCase().includes(term)) ||
        (loan.loan_request_id?.toLowerCase().includes(term)) ||
        (loan.employee?.employee_number?.toLowerCase().includes(term))
      );
    }

    // Apply sorting
    loansList.sort((a: any, b: any) => {
      let aVal, bVal;

      switch (sortField) {
        case 'employee_name':
          aVal = a.employee?.name || '';
          bVal = b.employee?.name || '';
          break;
        case 'due_date':
          aVal = a.next_payment_date ? new Date(a.next_payment_date).getTime() : Infinity;
          bVal = b.next_payment_date ? new Date(b.next_payment_date).getTime() : Infinity;
          break;
        case 'amount_due':
          aVal = a.next_payment_amount || 0;
          bVal = b.next_payment_amount || 0;
          break;
        case 'balance':
          aVal = a.remaining_balance || 0;
          bVal = b.remaining_balance || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return loansList;
  }, [loans, statusFilter, searchTerm, sortField, sortDirection]);

  /**
   * Get paginated loans
   */
  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredLoans.slice(start, end);
  }, [filteredLoans, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);

  /**
   * Handle sort column click
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * Reset all filters
   */
  const handleResetFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  /**
   * Handle export to CSV with confirmation
   */
  const handleExport = async () => {
    const result = await showConfirmation(
      `Export <b>${filteredLoans.length} loan payment overview(s)</b> to CSV file?`,
      'Export Payment Overview'
    );

    if (!result.isConfirmed) return;

    const csvHeaders = ['Employee Name', 'Loan ID', 'Due Date', 'Amount Due', 'Total Paid', 'Balance', 'Status'];
    const csvRows = filteredLoans.map((loan: any) => [
      loan.employee?.name || '',
      loan.loan_request_id || '',
      formatDate(loan.next_payment_date),
      loan.next_payment_amount || 0,
      loan.total_paid || 0,
      loan.remaining_balance || 0,
      loan.is_overdue ? 'OVERDUE' : isToday(loan.next_payment_date) ? 'DUE TODAY' : 'UPCOMING'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-overview-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContainer" style={{ maxWidth: '1400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h1>💳 Payment Overview - Due Payments</h1>
          <button className="closeButton" onClick={onClose}>&times;</button>
        </div>

        <div className="modalContent payment-history-container">
          {/* Search Bar */}
          <div className="payment-search-bar">
            <input
              type="text"
              className="payment-search-input"
              placeholder="Search by employee name, loan ID, or employee number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Filter Bar */}
          <div className="payment-history-filters">
            <div className="filters-row">
              <div className="filter-group">
                <label className="filter-label">Status Filter</label>
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Active Loans</option>
                  <option value="due_today">Due Today</option>
                  <option value="overdue">Overdue</option>
                  <option value="upcoming">Upcoming</option>
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
              Showing <strong>{paginatedLoans.length}</strong> of <strong>{filteredLoans.length}</strong> loans
            </div>
            <div className="table-actions">
              <button className="table-action-btn export" onClick={handleExport}>
                <i className="ri-receipt-line" /> Export CSV
              </button>
            </div>
          </div>

          {/* Payment Overview Table */}
          {filteredLoans.length > 0 ? (
            <>
              <div className="table-wrapper">
                <div className="tableContainer">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th 
                          className={`sortable ${sortField === 'employee_name' ? sortDirection : ''}`}
                          onClick={() => handleSort('employee_name')}
                        >
                          Employee
                        </th>
                        <th>Loan ID</th>
                        <th 
                          className={`sortable ${sortField === 'due_date' ? sortDirection : ''}`}
                          onClick={() => handleSort('due_date')}
                        >
                          Due Date
                        </th>
                        <th 
                          className={`sortable ${sortField === 'amount_due' ? sortDirection : ''}`}
                          onClick={() => handleSort('amount_due')}
                        >
                          Amount Due
                        </th>
                        <th>Total Paid</th>
                        <th 
                          className={`sortable ${sortField === 'balance' ? sortDirection : ''}`}
                          onClick={() => handleSort('balance')}
                        >
                          Balance
                        </th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLoans.map((loan: any) => {
                        const isDueToday = isToday(loan.next_payment_date);
                        const isOverdue = loan.is_overdue;
                        
                        return (
                          <tr key={loan.id}
                              className={isOverdue ? 'overdue-row' : isDueToday ? 'due-today-row' : ''}
                              style={{ cursor: 'pointer' }}>
                            <td>
                              <div>
                                <strong>{loan.employee?.name || 'N/A'}</strong><br />
                                <small>{loan.employee?.employee_number || 'N/A'}</small>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                              {loan.loan_request_id || 'N/A'}
                            </td>
                            <td style={{ fontWeight: isOverdue || isDueToday ? 700 : 400, color: isOverdue ? '#DC2626' : isDueToday ? '#D97706' : 'inherit' }}>
                              {formatDate(loan.next_payment_date)}
                            </td>
                            <td style={{ fontWeight: 600, color: '#166534' }}>
                              {formatCurrency(loan.next_payment_amount || 0)}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {formatCurrency(loan.total_paid || 0)}
                            </td>
                            <td style={{ fontWeight: 700, color: '#D97706' }}>
                              {formatCurrency(loan.remaining_balance || 0)}
                            </td>
                            <td>
                              {isOverdue ? (
                                <span className="chip overdue">OVERDUE</span>
                              ) : isDueToday ? (
                                <span className="chip partial">DUE TODAY</span>
                              ) : (
                                <span className="chip pending">UPCOMING</span>
                              )}
                            </td>
                            <td className="actionButtons">
                              <div className="actionButtonsContainer">
                                {onPayNow && (
                                  <button 
                                    className="payBtn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPayNow(loan);
                                    }}
                                    title="Pay Now"
                                  >
                                    <i className="ri-money-dollar-circle-line" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No active loans with pending payments'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
