"use client";

import React, { useState, useMemo } from 'react';
import '../../../../styles/components/modal.css';
import '../../../../styles/loan-management/auditLoanPayment.css';
import { showAuditConfirmation, showAuditSuccess, showConfirmation } from '@/app/utils/Alerts';

interface AuditLoanPaymentProps {
  show: boolean;
  loan: any;
  auditLogs?: any[];
  onClose: () => void;
  onExportAudit?: () => void;
  onViewDetails?: (auditId: string) => void;
}

type ActionType = 'CREATED' | 'MODIFIED' | 'DELETED' | 'VOIDED' | 'APPROVED' | 'REJECTED' | 'ALL';

export default function AuditLoanPayment({ show, loan, auditLogs = [], onClose, onExportAudit, onViewDetails }: AuditLoanPaymentProps) {
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionType, setActionType] = useState<ActionType>('ALL');
  const [userFilter, setUserFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  if (!show || !loan) return null;

  /**
   * Formats date to readable format with time
   */
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  /**
   * Get user initials for avatar
   */
  const getUserInitials = (userName: string) => {
    if (!userName) return '??';
    const parts = userName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  };

  /**
   * Get action badge info
   */
  const getActionBadge = (action: string) => {
    const badges: { [key: string]: { text: string; className: string; icon: string } } = {
      'CREATED': { text: 'Created', className: 'audit-action-badge created', icon: '✨' },
      'MODIFIED': { text: 'Modified', className: 'audit-action-badge modified', icon: '✏️' },
      'DELETED': { text: 'Deleted', className: 'audit-action-badge deleted', icon: '🗑️' },
      'VOIDED': { text: 'Voided', className: 'audit-action-badge voided', icon: '⚠️' },
      'APPROVED': { text: 'Approved', className: 'audit-action-badge approved', icon: '✅' },
      'REJECTED': { text: 'Rejected', className: 'audit-action-badge rejected', icon: '❌' },
    };
    return badges[action] || { text: action, className: 'audit-action-badge', icon: '📝' };
  };

  /**
   * Mock audit logs if not provided (for demonstration)
   */
  const mockAuditLogs = useMemo(() => {
    if (auditLogs.length > 0) return auditLogs;

    // Generate mock audit logs for demonstration
    const mockLogs = [
      {
        audit_id: 'audit-001',
        action: 'CREATED',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        user_name: 'John Doe',
        user_email: 'john.doe@example.com',
        description: 'Loan payment request created',
        ip_address: '192.168.1.100',
        details: { loan_id: loan.loan_id, amount: loan.loan_amount }
      },
      {
        audit_id: 'audit-002',
        action: 'APPROVED',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        user_name: 'Jane Smith',
        user_email: 'jane.smith@example.com',
        description: 'Loan payment approved by supervisor',
        ip_address: '192.168.1.101',
        details: { approved_amount: loan.loan_amount }
      },
      {
        audit_id: 'audit-003',
        action: 'MODIFIED',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        user_name: 'John Doe',
        user_email: 'john.doe@example.com',
        description: 'Payment schedule updated',
        ip_address: '192.168.1.100',
        details: { field_changed: 'payment_schedule' }
      },
      {
        audit_id: 'audit-004',
        action: 'CREATED',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        user_name: 'John Doe',
        user_email: 'john.doe@example.com',
        description: 'Payment recorded: PHP 5,000.00',
        ip_address: '192.168.1.100',
        details: { payment_amount: 5000, payment_method: 'CASH' }
      },
    ];

    return mockLogs;
  }, [auditLogs, loan]);

  /**
   * Filter and sort audit logs
   */
  const filteredLogs = useMemo(() => {
    let logs = mockAuditLogs;

    // Apply date range filter
    if (startDate) {
      logs = logs.filter((log: any) =>
        new Date(log.timestamp) >= new Date(startDate)
      );
    }
    if (endDate) {
      logs = logs.filter((log: any) =>
        new Date(log.timestamp) <= new Date(endDate)
      );
    }

    // Apply action type filter
    if (actionType !== 'ALL') {
      logs = logs.filter((log: any) => log.action === actionType);
    }

    // Apply user filter
    if (userFilter) {
      logs = logs.filter((log: any) =>
        log.user_name.toLowerCase().includes(userFilter.toLowerCase()) ||
        log.user_email.toLowerCase().includes(userFilter.toLowerCase())
      );
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      logs = logs.filter((log: any) =>
        log.description?.toLowerCase().includes(term) ||
        log.action?.toLowerCase().includes(term) ||
        JSON.stringify(log.details)?.toLowerCase().includes(term)
      );
    }

    // Sort by timestamp (newest first)
    logs.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return logs;
  }, [mockAuditLogs, startDate, endDate, actionType, userFilter, searchTerm]);

  /**
   * Get paginated logs
   */
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  /**
   * Calculate summary statistics
   */
  const summary = useMemo(() => {
    const total = filteredLogs.length;
    const created = filteredLogs.filter((l: any) => l.action === 'CREATED').length;
    const modified = filteredLogs.filter((l: any) => l.action === 'MODIFIED').length;
    const deleted = filteredLogs.filter((l: any) => l.action === 'DELETED').length;
    const uniqueUsers = new Set(filteredLogs.map((l: any) => l.user_email)).size;

    return { total, created, modified, deleted, uniqueUsers };
  }, [filteredLogs]);

  /**
   * Reset all filters
   */
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setActionType('ALL');
    setUserFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  /**
   * Export audit log to CSV with confirmation
   */
  const handleExport = async () => {
    const result = await showConfirmation(
      `Export <b>${filteredLogs.length} audit record(s)</b> to CSV file?`,
      'Export Audit Trail'
    );
    
    if (result.isConfirmed) {
      const csvHeaders = ['Timestamp', 'Action', 'User', 'Email', 'Description', 'IP Address'];
      const csvRows = filteredLogs.map((log: any) => [
        formatDateTime(log.timestamp),
        log.action,
        log.user_name,
        log.user_email,
        log.description,
        log.ip_address
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${loan.loan_id || loan.loan_request_id || loan.id}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      await showAuditSuccess();
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContainer" style={{ maxWidth: '1400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h1>🔍 Audit Trail - {loan.loan_id || loan.loan_request_id || loan.id}</h1>
          <button className="closeButton" onClick={onClose}>&times;</button>
        </div>

        <div className="modalContent audit-loan-payment-container">
          {/* Audit Summary Cards */}
          <div className="audit-summary-cards">
            <div className="audit-summary-card total">
              <div className="audit-summary-icon">📊</div>
              <div className="audit-summary-content">
                <div className="audit-summary-label">Total Events</div>
                <div className="audit-summary-value">{summary.total}</div>
              </div>
            </div>

            <div className="audit-summary-card created">
              <div className="audit-summary-icon">✨</div>
              <div className="audit-summary-content">
                <div className="audit-summary-label">Created</div>
                <div className="audit-summary-value">{summary.created}</div>
              </div>
            </div>

            <div className="audit-summary-card modified">
              <div className="audit-summary-icon">✏️</div>
              <div className="audit-summary-content">
                <div className="audit-summary-label">Modified</div>
                <div className="audit-summary-value">{summary.modified}</div>
              </div>
            </div>

            <div className="audit-summary-card users">
              <div className="audit-summary-icon">👥</div>
              <div className="audit-summary-content">
                <div className="audit-summary-label">Unique Users</div>
                <div className="audit-summary-value">{summary.uniqueUsers}</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="audit-search-bar">
            <input
              type="text"
              className="audit-search-input"
              placeholder="🔍 Search audit logs..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Filters Section */}
          <div className="audit-filters-section">
            <div className="audit-filters-row">
              <div className="audit-filter-group">
                <label className="audit-filter-label">Start Date</label>
                <input
                  type="date"
                  className="audit-filter-input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="audit-filter-group">
                <label className="audit-filter-label">End Date</label>
                <input
                  type="date"
                  className="audit-filter-input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="audit-filter-group">
                <label className="audit-filter-label">Action Type</label>
                <select
                  className="audit-filter-select"
                  value={actionType}
                  onChange={(e) => {
                    setActionType(e.target.value as ActionType);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">All Actions</option>
                  <option value="CREATED">Created</option>
                  <option value="MODIFIED">Modified</option>
                  <option value="DELETED">Deleted</option>
                  <option value="VOIDED">Voided</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="audit-filter-group">
                <label className="audit-filter-label">User</label>
                <input
                  type="text"
                  className="audit-filter-input"
                  placeholder="Filter by user..."
                  value={userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="audit-filter-button-group">
                <button className="audit-filter-btn reset" onClick={handleResetFilters}>
                  Reset
                </button>
                <button className="audit-filter-btn export" onClick={handleExport}>
                  📥 Export
                </button>
              </div>
            </div>
          </div>

          {/* Table Info */}
          <div className="audit-table-info">
            Showing <strong>{paginatedLogs.length}</strong> of <strong>{filteredLogs.length}</strong> audit events
          </div>

          {/* Audit Trail Table */}
          {filteredLogs.length > 0 ? (
            <>
              <div className="table-wrapper">
                <div className="tableContainer">
                  <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>User</th>
                      <th>Description</th>
                      <th>IP Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log: any, index: number) => {
                      const badge = getActionBadge(log.action);
                      return (
                        <tr key={log.audit_id || index}>
                          <td className="audit-timestamp-cell">
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td>
                            <span className={badge.className}>
                              {badge.icon} {badge.text}
                            </span>
                          </td>
                          <td className="audit-user-cell">
                            <div className="audit-user-info">
                              <div className="audit-user-avatar">
                                {getUserInitials(log.user_name)}
                              </div>
                              <div className="audit-user-details">
                                <div className="audit-user-name">{log.user_name}</div>
                                <div className="audit-user-email">{log.user_email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="audit-description-cell">
                            {log.description}
                          </td>
                          <td className="audit-ip-cell">{log.ip_address}</td>
                          <td>
                            {onViewDetails && (
                              <button
                                className="audit-row-action-btn"
                                onClick={() => onViewDetails(log.audit_id)}
                                title="View Details"
                              >
                                👁️ Details
                              </button>
                            )}
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
                <div className="audit-pagination">
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
            <div className="audit-trail-empty">
              <div className="audit-trail-empty-icon">🔍</div>
              <div className="audit-trail-empty-title">No Audit Events Found</div>
              <div className="audit-trail-empty-message">
                {searchTerm || startDate || endDate || actionType !== 'ALL' || userFilter
                  ? 'Try adjusting your filters'
                  : 'No audit trail available for this loan'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
