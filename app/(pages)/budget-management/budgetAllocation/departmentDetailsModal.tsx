'use client';

import React, { useState, useEffect } from 'react';
import '../../../styles/budget-management/departmentDetailsModal.css';
import { formatDate } from '../../../utility/dateFormatter';

// Enhanced interfaces for allocation history
interface AllocationHistory {
  allocation_id: string;
  department_id: string;
  type: 'Allocation' | 'Deduction' | 'Adjustment';
  amount: number;
  date: string;
  allocated_by: string;
  notes: string;
  status: 'Allocated' | 'Closed' | 'Pending' | 'Cancelled';
  created_at: string;
  updated_at?: string;
  reference_id?: string;
}

interface DepartmentBudget {
  department_id: string;
  department_name: string;
  allocated_budget: number;
  used_budget: number;
  remaining_budget: number;
  budget_requests_count: number;
  last_allocation_date: string;
  budget_period: string;
  status: 'Active' | 'Inactive' | 'Exceeded';
}

interface DepartmentDetailsModalProps {
  department: DepartmentBudget;
  isOpen: boolean;
  onClose: () => void;
}

interface FilterState {
  search: string;
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

interface SortState {
  field: 'date' | 'amount' | 'type' | 'status' | 'allocated_by';
  direction: 'asc' | 'desc';
}

const DepartmentDetailsModal: React.FC<DepartmentDetailsModalProps> = ({
  department,
  isOpen,
  onClose
}) => {
  // State management
  const [allocationHistory, setAllocationHistory] = useState<AllocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: ''
  });
  const [sort, setSort] = useState<SortState>({
    field: 'date',
    direction: 'desc'
  });

  // Mock allocation history data
  const generateMockHistoryData = (departmentId: string): AllocationHistory[] => {
    const histories: AllocationHistory[] = [
      {
        allocation_id: 'ALLOC-2024-001',
        department_id: departmentId,
        type: 'Allocation',
        amount: 250000,
        date: '2024-09-01T00:00:00Z',
        allocated_by: 'John Smith',
        notes: 'Initial Q4 budget allocation',
        status: 'Allocated',
        created_at: '2024-09-01T00:00:00Z',
        reference_id: 'REQ-2024-Q4-001'
      },
      {
        allocation_id: 'ALLOC-2024-002',
        department_id: departmentId,
        type: 'Allocation',
        amount: 150000,
        date: '2024-09-10T00:00:00Z',
        allocated_by: 'Maria Garcia',
        notes: 'Additional budget for new project requirements',
        status: 'Allocated',
        created_at: '2024-09-10T00:00:00Z',
        reference_id: 'REQ-2024-PROJ-002'
      },
      {
        allocation_id: 'DEDUCT-2024-001',
        department_id: departmentId,
        type: 'Deduction',
        amount: -50000,
        date: '2024-09-15T00:00:00Z',
        allocated_by: 'John Smith',
        notes: 'Budget reallocation to Operations',
        status: 'Closed',
        created_at: '2024-09-15T00:00:00Z',
        updated_at: '2024-09-15T12:30:00Z',
        reference_id: 'TRANSFER-2024-001'
      },
      {
        allocation_id: 'ALLOC-2024-003',
        department_id: departmentId,
        type: 'Adjustment',
        amount: 75000,
        date: '2024-09-20T00:00:00Z',
        allocated_by: 'Sarah Johnson',
        notes: 'Mid-month budget adjustment for urgent needs',
        status: 'Pending',
        created_at: '2024-09-20T00:00:00Z',
        reference_id: 'ADJ-2024-MID-001'
      },
      {
        allocation_id: 'ALLOC-2024-004',
        department_id: departmentId,
        type: 'Allocation',
        amount: 100000,
        date: '2024-08-25T00:00:00Z',
        allocated_by: 'Michael Brown',
        notes: 'Previous month carryover allocation',
        status: 'Closed',
        created_at: '2024-08-25T00:00:00Z',
        updated_at: '2024-09-01T00:00:00Z',
        reference_id: 'CARRY-2024-AUG'
      },
      {
        allocation_id: 'DEDUCT-2024-002',
        department_id: departmentId,
        type: 'Deduction',
        amount: -25000,
        date: '2024-09-22T00:00:00Z',
        allocated_by: 'John Smith',
        notes: 'Budget correction due to calculation error',
        status: 'Cancelled',
        created_at: '2024-09-22T00:00:00Z',
        reference_id: 'CORR-2024-001'
      }
    ];

    return histories;
  };

  // Load allocation history
  useEffect(() => {
    if (isOpen && department) {
      setLoading(true);
      setTimeout(() => {
        const mockData = generateMockHistoryData(department.department_id);
        setAllocationHistory(mockData);
        setLoading(false);
      }, 500);
    }
  }, [isOpen, department]);

  // Filter and sort logic
  const getFilteredAndSortedHistory = () => {
    let filtered = allocationHistory.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          item.allocation_id.toLowerCase().includes(searchLower) ||
          item.allocated_by.toLowerCase().includes(searchLower) ||
          item.notes.toLowerCase().includes(searchLower) ||
          item.reference_id?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filters.type && item.type !== filters.type) return false;

      // Status filter
      if (filters.status && item.status !== filters.status) return false;

      // Date range filter
      if (filters.dateFrom && new Date(item.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(item.date) > new Date(filters.dateTo)) return false;

      // Amount range filter
      const absoluteAmount = Math.abs(item.amount);
      if (filters.amountMin && absoluteAmount < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && absoluteAmount > parseFloat(filters.amountMax)) return false;

      return true;
    });

    // Sort filtered results
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort.field) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'allocated_by':
          aValue = a.allocated_by;
          bValue = b.allocated_by;
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Pagination logic
  const filteredHistory = getFilteredAndSortedHistory();
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Allocated': return 'status-allocated';
      case 'Closed': return 'status-closed';
      case 'Pending': return 'status-pending';
      case 'Cancelled': return 'status-cancelled';
      default: return 'status-allocated';
    }
  };

  // Get type badge class
  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Allocation': return 'type-allocation';
      case 'Deduction': return 'type-deduction';
      case 'Adjustment': return 'type-adjustment';
      default: return 'type-allocation';
    }
  };

  // Format amount with proper sign and color
  const formatAmount = (amount: number) => {
    const isPositive = amount >= 0;
    return (
      <span className={`amount-value ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '+' : ''}₱{Math.abs(amount).toLocaleString()}
      </span>
    );
  };

  // Get row actions based on status
  const getRowActions = (item: AllocationHistory) => {
    const actions = [];

    // View action (always available)
    actions.push(
      <button
        key="view"
        className="actionBtn viewBtn"
        onClick={() => handleViewAllocation(item)}
        title="View Details"
      >
        <i className="ri-eye-line" />
      </button>
    );

    switch (item.status) {
      case 'Allocated':
        actions.push(
          <button
            key="edit"
            className="actionBtn editBtn"
            onClick={() => handleEditAllocation(item)}
            title="Edit Allocation"
          >
            <i className="ri-edit-line" />
          </button>,
          <button
            key="rollback"
            className="actionBtn rollbackBtn"
            onClick={() => handleRollbackToPending(item)}
            title="Rollback to Pending"
          >
            <i className="ri-arrow-go-back-line" />
          </button>,
          <button
            key="close"
            className="actionBtn closeBtn"
            onClick={() => handleCloseAllocation(item)}
            title="Close Allocation"
          >
            <i className="ri-close-circle-line" />
          </button>
        );
        break;

      case 'Closed':
        actions.push(
          <button
            key="export"
            className="actionBtn exportBtn"
            onClick={() => handleExportAllocation(item)}
            title="Export Details"
          >
            <i className="ri-download-line" />
          </button>,
          <button
            key="audit"
            className="actionBtn auditBtn"
            onClick={() => handleAuditTrail(item)}
            title="Audit Trail"
          >
            <i className="ri-history-line" />
          </button>
        );
        break;

      case 'Pending':
        actions.push(
          <button
            key="approve"
            className="actionBtn approveBtn"
            onClick={() => handleApproveAllocation(item)}
            title="Approve"
          >
            <i className="ri-check-line" />
          </button>,
          <button
            key="reject"
            className="actionBtn rejectBtn"
            onClick={() => handleRejectAllocation(item)}
            title="Reject"
          >
            <i className="ri-close-line" />
          </button>
        );
        break;

      default:
        // Cancelled or other statuses only have view
        break;
    }

    return actions;
  };

  // Action handlers
  const handleViewAllocation = (item: AllocationHistory) => {
    console.log('View allocation:', item);
  };

  const handleEditAllocation = (item: AllocationHistory) => {
    console.log('Edit allocation:', item);
  };

  const handleRollbackToPending = (item: AllocationHistory) => {
    console.log('Rollback to pending:', item);
  };

  const handleCloseAllocation = (item: AllocationHistory) => {
    console.log('Close allocation:', item);
  };

  const handleExportAllocation = (item: AllocationHistory) => {
    console.log('Export allocation:', item);
  };

  const handleAuditTrail = (item: AllocationHistory) => {
    console.log('View audit trail:', item);
  };

  const handleApproveAllocation = (item: AllocationHistory) => {
    console.log('Approve allocation:', item);
  };

  const handleRejectAllocation = (item: AllocationHistory) => {
    console.log('Reject allocation:', item);
  };

  // Filter handlers
  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSortChange = (field: SortState['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: ''
    });
  };

  // Export handlers
  const handleExportCSV = () => {
    console.log('Export CSV');
  };

  const handleExportExcel = () => {
    console.log('Export Excel');
  };

  const handleExportPDF = () => {
    console.log('Export PDF');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container department-details-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <h2>{department.department_name} Department</h2>
            <p>Budget Allocation History & Management</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Department Summary */}
        <div className="department-summary">
          <div className="summary-metrics">
            <div className="metric-item">
              <i className="ri-money-dollar-circle-line" />
              <div className="metric-content">
                <span className="metric-label">Allocated</span>
                <span className="metric-value">₱{department.allocated_budget.toLocaleString()}</span>
              </div>
            </div>
            <div className="metric-item">
              <i className="ri-shopping-cart-line" />
              <div className="metric-content">
                <span className="metric-label">Used</span>
                <span className="metric-value used">₱{department.used_budget.toLocaleString()}</span>
              </div>
            </div>
            <div className="metric-item">
              <i className="ri-wallet-line" />
              <div className="metric-content">
                <span className="metric-label">Remaining</span>
                <span className={`metric-value ${department.remaining_budget < 0 ? 'negative' : 'positive'}`}>
                  ₱{department.remaining_budget.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="metric-item">
              <i className="ri-percent-line" />
              <div className="metric-content">
                <span className="metric-label">Utilization</span>
                <span className="metric-value">
                  {Math.round((department.used_budget / department.allocated_budget) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="global-actions">
          <div className="search-filters">
            <div className="search-box">
              <i className="ri-search-line" />
              <input
                type="text"
                placeholder="Search allocations..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Allocation">Allocation</option>
                <option value="Deduction">Deduction</option>
                <option value="Adjustment">Adjustment</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Allocated">Allocated</option>
                <option value="Closed">Closed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <input
                type="date"
                placeholder="Date From"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />

              <input
                type="date"
                placeholder="Date To"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            <button className="clear-filters-btn" onClick={clearAllFilters}>
              <i className="ri-filter-off-line" /> Clear Filters
            </button>
          </div>

          <div className="action-buttons">
            <div className="export-dropdown">
              <button className="dropdown-toggle">
                <i className="ri-download-line" /> Export
              </button>
              <div className="dropdown-menu">
                <button onClick={handleExportCSV}>
                  <i className="ri-file-text-line" /> CSV
                </button>
                <button onClick={handleExportExcel}>
                  <i className="ri-file-excel-line" /> Excel
                </button>
                <button onClick={handleExportPDF}>
                  <i className="ri-file-pdf-line" /> PDF
                </button>
              </div>
            </div>

            <button className="add-allocation-btn">
              <i className="ri-add-line" /> Add Allocation
            </button>
          </div>
        </div>

        {/* Allocation History Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading-state">
              <i className="ri-loader-4-line loading-spinner" />
              <p>Loading allocation history...</p>
            </div>
          ) : (
            <>
              <div className="table-header">
                <h3>Allocation History</h3>
                <span className="results-count">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredHistory.length)} of {filteredHistory.length} records
                </span>
              </div>

              <div className="table-wrapper">
                <table className="allocation-history-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSortChange('date')} className="sortable">
                        Date
                        <i className={`ri-arrow-${sort.field === 'date' && sort.direction === 'asc' ? 'up' : 'down'}-line`} />
                      </th>
                      <th onClick={() => handleSortChange('type')} className="sortable">
                        Type
                        <i className={`ri-arrow-${sort.field === 'type' && sort.direction === 'asc' ? 'up' : 'down'}-line`} />
                      </th>
                      <th onClick={() => handleSortChange('amount')} className="sortable">
                        Amount
                        <i className={`ri-arrow-${sort.field === 'amount' && sort.direction === 'asc' ? 'up' : 'down'}-line`} />
                      </th>
                      <th onClick={() => handleSortChange('allocated_by')} className="sortable">
                        Allocated By
                        <i className={`ri-arrow-${sort.field === 'allocated_by' && sort.direction === 'asc' ? 'up' : 'down'}-line`} />
                      </th>
                      <th>Notes</th>
                      <th onClick={() => handleSortChange('status')} className="sortable">
                        Status
                        <i className={`ri-arrow-${sort.field === 'status' && sort.direction === 'asc' ? 'up' : 'down'}-line`} />
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((item) => (
                      <tr key={item.allocation_id}>
                        <td>
                          <div className="date-info">
                            <span className="date">{formatDate(item.date)}</span>
                            <span className="allocation-id">{item.allocation_id}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`type-badge ${getTypeBadgeClass(item.type)}`}>
                            {item.type}
                          </span>
                        </td>
                        <td>{formatAmount(item.amount)}</td>
                        <td>{item.allocated_by}</td>
                        <td>
                          <div className="notes-cell" title={item.notes}>
                            {item.notes.length > 50 ? `${item.notes.substring(0, 50)}...` : item.notes}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            {getRowActions(item)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <i className="ri-arrow-left-line" /> Previous
                  </button>

                  <div className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </div>

                  <button
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next <i className="ri-arrow-right-line" />
                  </button>
                </div>
              )}

              {filteredHistory.length === 0 && (
                <div className="no-results">
                  <i className="ri-file-list-line" />
                  <h3>No allocation history found</h3>
                  <p>Try adjusting your search and filter criteria</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetailsModal;