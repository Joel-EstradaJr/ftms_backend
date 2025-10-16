"use client";
import React, { useState, useEffect } from "react";
import '../../../styles/Components/table.css';
import "../../../styles/audit/audit.css";
import PaginationComponent from "../../../Components/pagination";
import Swal from "sweetalert2";
import Loading from '../../../Components/loading';
import { showSuccess, showError, showConfirmation } from '../../../utility/Alerts';
import { formatDisplayText } from '@/app/utils/formatting';
import FilterDropdown, { FilterSection } from "../../../Components/filter";

type AuditLog = {
  log_id: string;
  action: string;
  table_affected: string;
  record_id: string;
  performed_by: string;
  timestamp: string;
  details: string;
  ip_address?: string;
};

const formatDateTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

type ViewModalProps = {
  log: AuditLog | null;
  onClose: () => void;
};

const ViewDetailsModal: React.FC<ViewModalProps> = ({ log, onClose }) => {
  if (!log) return null;

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE': return '✨';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      case 'EXPORT': return '📤';
      case 'VIEW': return '👁️';
      default: return '📋';
    }
  };

  const getTableIcon = (table: string) => {
    switch (table.toLowerCase()) {
      case 'expenserecord': return '💰';
      case 'revenuerecord': return '📈';
      case 'receipt': return '🧾';
      case 'reimbursement': return '💳';
      default: return '📊';
    }
  };

  return (
      <div className="modalOverlay">
        <div className="viewDetailsModal">
          <div className="modalHeader">
            <h2>Audit Log Details</h2>
            <button onClick={onClose} className="closeButton">&times;</button>
          </div>
          <div className="modalContent">
            <div className="audit-details-container">
              {/* Primary Information Card */}
              <div className="audit-detail-card">
                <div className="audit-detail-row">
                  <div className="audit-detail-icon">🕒</div>
                  <div className="audit-detail-content">
                    <div className="audit-detail-label">Date & Time</div>
                    <div className="audit-detail-value">{formatDateTime(log.timestamp)}</div>
                  </div>
                </div>
                <div className="audit-detail-row">
                  <div className="audit-detail-icon">{getActionIcon(log.action)}</div>
                  <div className="audit-detail-content">
                    <div className="audit-detail-label">Action</div>
                    <div className="audit-detail-value">
                      <span className={`action-badge ${log.action.toLowerCase()}`}>
                        {log.action}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="audit-detail-row">
                  <div className="audit-detail-icon">{getTableIcon(log.table_affected)}</div>
                  <div className="audit-detail-content">
                    <div className="audit-detail-label">Table Affected</div>
                    <div className="audit-detail-value">{formatDisplayText(log.table_affected)}</div>
                  </div>
                </div>
              </div>

              {/* Secondary Information Card */}
              <div className="audit-detail-card">
                <div className="audit-detail-row">
                  <div className="audit-detail-icon">🔑</div>
                  <div className="audit-detail-content">
                    <div className="audit-detail-label">Record ID</div>
                    <div className="audit-detail-value">
                      <span className="code-text">{log.record_id}</span>
                    </div>
                  </div>
                </div>
                <div className="audit-detail-row">
                  <div className="audit-detail-icon">👤</div>
                  <div className="audit-detail-content">
                    <div className="audit-detail-label">Performed By</div>
                    <div className="audit-detail-value">{log.performed_by}</div>
                  </div>
                </div>
                <div className="audit-detail-row">
                  <div className="audit-detail-icon">🌐</div>
                  <div className="audit-detail-content">
                    <div className="audit-detail-label">IP Address</div>
                    <div className="audit-detail-value">
                      <span className="code-text">{log.ip_address || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Card */}
              <div className="audit-detail-card">
                <div className="audit-detail-row">
                  <div className="audit-detail-icon">📋</div>
                  <div className="audit-detail-content">
                    <div className="audit-detail-label">Details</div>
                    <div className="audit-detail-value details-section">
                      {typeof log.details === 'string'
                        ? log.details
                        : JSON.stringify(log.details, null, 2)
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

const AuditPage = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Available tables for filtering
  const availableTables = [
    { id: 'ExpenseRecord', label: 'Expense Records' },
    { id: 'RevenueRecord', label: 'Revenue Records' },
    { id: 'Receipt', label: 'Receipts' },
    { id: 'Reimbursement', label: 'Reimbursements' }
  ];

  // Available actions for filtering
  const availableActions = [
    { id: 'CREATE', label: 'Create' },
    { id: 'UPDATE', label: 'Update' },
    { id: 'DELETE', label: 'Delete' },
    { id: 'EXPORT', label: 'Export' },
    { id: 'VIEW', label: 'View' }
  ];

  // Filter sections configuration
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      defaultValue: { from: dateFrom, to: dateTo }
    },
    {
      id: 'table',
      title: 'Table',
      type: 'checkbox',
      options: availableTables
    },
    {
      id: 'action',
      title: 'Action',
      type: 'checkbox',
      options: availableActions
    }
  ];

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await fetch('/api/auditlogs');
        if (!response.ok) throw new Error('Failed to fetch audit logs');
        const data = await response.json();
        setAuditLogs(data);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      (log.details && typeof log.details === 'string' && log.details.toLowerCase().includes(search.toLowerCase())) ||
      (log.performed_by && typeof log.performed_by === 'string' && log.performed_by.toLowerCase().includes(search.toLowerCase())) ||
      (log.action && typeof log.action === 'string' && log.action.toLowerCase().includes(search.toLowerCase()));
    
    const matchesTable = tableFilter ? 
      tableFilter.split(',').some(table => log.table_affected === table.trim()) : true;
    
    const logDate = new Date(log.timestamp).toISOString().split('T')[0];
    const matchesDate = (!dateFrom || logDate >= dateFrom) && (!dateTo || logDate <= dateTo);
    
    const matchesAction = actionFilter ? 
      actionFilter.split(',').some(action => log.action === action.trim()) : true;
    
    return matchesSearch && matchesTable && matchesDate && matchesAction;
  });

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredLogs.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const handleExport = async () => {
    try {
      // Check if there are records to export
      if (filteredLogs.length === 0) {
        const warningResult = await showConfirmation(
          'No records found with the current filters. Do you want to proceed with exporting an empty dataset?',
          'Warning'
        );
        if (!warningResult.isConfirmed) {
          return;
        }
      }

      // Show export confirmation with details
      const confirmResult = await showConfirmation(`
        <div class="exportConfirmation">
          <p><strong>Date Range:</strong> ${dateFrom ? formatDateTime(dateFrom) : 'Start'} to ${dateTo ? formatDateTime(dateTo) : 'End'}</p>
          <p><strong>Table Filter:</strong> ${tableFilter || 'All Tables'}</p>
          <p><strong>Action Filter:</strong> ${actionFilter || 'All Actions'}</p>
          <p><strong>Search Term:</strong> ${search || 'None'}</p>
          <p><strong>Number of Records:</strong> ${filteredLogs.length}</p>
        </div>`,
        'Confirm Export'
      );

      if (!confirmResult.isConfirmed) {
        return;
      }

      // Show loading state
      Swal.fire({
        title: 'Exporting...',
        text: 'Please wait while we prepare your export.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Get export ID
      const exportIdResponse = await fetch('/api/generate-export-id');
      if (!exportIdResponse.ok) throw new Error('Failed to generate export ID');
      const { exportId } = await exportIdResponse.json();

      // Create audit log for export action
      await fetch('/api/auditlogs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'EXPORT',
          table_affected: 'AuditLog',
          record_id: exportId,
          details: `Exported audit logs with filters - Date Range: ${dateFrom || 'Start'} to ${dateTo || 'End'}, Table: ${tableFilter || 'All'}, Action: ${actionFilter || 'All'}, Search: ${search || 'None'}, Records: ${filteredLogs.length}`
        }),
      });

      // Prepare data for export
      const exportData = filteredLogs.map(log => ({
        'Date & Time': formatDateTime(log.timestamp),
        'Action': log.action,
        'Table': log.table_affected,
        'Record ID': log.record_id,
        'Performed By': log.performed_by,
        'IP Address': log.ip_address || 'N/A',
        'Details': log.details || 'N/A'
      }));

      // Convert to CSV
      const headers = ['Date & Time', 'Action', 'Table', 'Record ID', 'Performed By', 'IP Address', 'Details'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => 
            JSON.stringify(row[header as keyof typeof row] || '')
          ).join(',')
        )
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `audit_logs_${exportId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      await showSuccess(`Successfully exported ${filteredLogs.length} records`, 'Export Complete!');
    } catch (error) {
      console.error('Export failed:', error);
      await showError('An error occurred while exporting the audit logs', 'Export Failed');
    }
  };

  // Handle filter application
  const handleFilterApply = (filterValues: Record<string, string | string[] | {from: string; to: string}>) => {
    // Date range filter
    if (filterValues.dateRange && typeof filterValues.dateRange === 'object') {
      const dateRange = filterValues.dateRange as { from: string; to: string };
      setDateFrom(dateRange.from);
      setDateTo(dateRange.to);
    }
    
    // Table filter (multiple selection support)
    if (filterValues.table && Array.isArray(filterValues.table)) {
      setTableFilter(filterValues.table.join(','));
    } else {
      setTableFilter('');
    }

    // Action filter (new filter for actions)
    if (filterValues.action && Array.isArray(filterValues.action)) {
      setActionFilter(filterValues.action.join(','));
    } else {
      setActionFilter('');
    }

    // Reset pagination page
    setCurrentPage(1);
  };

  if (loading) {
    return (
        <div className="card">
            <h1 className="title">Finance Tracking Management</h1>
            <Loading />
        </div>
    );
  }

  return (
    <div className="card">
      {/* <h1 className="title">Audit Logs</h1> */}
      <div className="elements">
        <h1 className="title">Audit Logs</h1>
        <div className="settings">
          <div className="searchBar">
            <i className="ri-search-line" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            /> 
          </div>
          <FilterDropdown
            sections={filterSections}
            onApply={handleFilterApply}
            initialValues={{
              dateRange: { from: dateFrom, to: dateTo },
              table: tableFilter ? tableFilter.split(',') : [],
              action: actionFilter ? actionFilter.split(',') : []
            }}
          />

          <div className="filters">
            
            <button onClick={handleExport} id="export"><i className="ri-receipt-line" /> Export Logs</button>
          </div>
        </div>
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record ID</th>
                <th>Performed By</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>{currentRecords.map((log) => (
              <tr key={log.log_id} onClick={() => setSelectedLog(log)}>
                <td>{formatDateTime(log.timestamp)}</td>
                <td>{log.action}</td>
                <td>{formatDisplayText(log.table_affected)}</td>
                <td>{log.record_id}</td>
                <td>{log.performed_by}</td>
                <td>{log.ip_address || 'N/A'}</td>
              </tr>
            ))}</tbody></table>
            {currentRecords.length === 0 && <p className="noRecords">No audit logs found.</p>}
          </div>
        </div>
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
        {selectedLog && (
          <ViewDetailsModal
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
          />
        )}
      </div>
    </div>
  );
};

export default AuditPage;