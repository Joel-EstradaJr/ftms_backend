"use client";

import React, { useState, useEffect } from "react";
//@ts-ignore
import "../../../../styles/components/table.css";
//@ts-ignore
import "../../../../styles/components/chips.css";
//@ts-ignore
import "../../../../styles/budget-management/budgetApproval.css";
import PaginationComponent from "../../../../Components/pagination";
import ErrorDisplay from '../../../../Components/errordisplay';
import Swal from 'sweetalert2';
import { formatDate, formatDateTime } from '../../../../utils/formatting';
import Loading from '../../../../Components/loading';
import { showSuccess, showError } from '../../../../utils/Alerts';
import FilterDropdown, { FilterSection } from "../../../../Components/filter";
import ViewBudgetRequest from '../budgetRequest/viewBudgetRequest';
import AuditTrailBudgetRequest from '../budgetRequest/auditTrailBudgetRequest';

interface BudgetRequest {
  request_id: string;
  title: string;
  description: string;
  requested_amount: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Closed';
  category: string;
  requested_by: string;
  request_date: string;
  approval_date?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
}

const BudgetApprovalPage = () => {
  const [data, setData] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedRequestForAudit, setSelectedRequestForAudit] = useState<BudgetRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [availableCategories] = useState([
    'Operations',
    'Maintenance',
    'Marketing',
    'Training',
    'Equipment',
    'Infrastructure',
    'Other'
  ]);
  const [sortField, setSortField] = useState<keyof BudgetRequest>('request_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      defaultValue: { from: dateFrom, to: dateTo }
    },
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      options: [
        { id: 'Pending Approval', label: 'Pending Approval' },
        { id: 'Approved', label: 'Approved' },
        { id: 'Rejected', label: 'Rejected' },
        { id: 'Closed', label: 'Closed' }
      ]
    },
    {
      id: 'category',
      title: 'Category',
      type: 'checkbox',
      options: availableCategories.map(cat => ({
        id: cat,
        label: cat
      }))
    }
  ];

  // Handle filter application
  const handleFilterApply = (filterValues: Record<string, string | string[] | {from: string; to: string}>) => {
    // Date range filter
    if (filterValues.dateRange && typeof filterValues.dateRange === 'object') {
      const dateRange = filterValues.dateRange as { from: string; to: string};
      setDateFrom(dateRange.from);
      setDateTo(dateRange.to);
    }

    // Status filter
    if (filterValues.status && Array.isArray(filterValues.status)) {
      setStatusFilter(filterValues.status.join(','));
    } else {
      setStatusFilter('');
    }

    // Category filter
    if (filterValues.category && Array.isArray(filterValues.category)) {
      setCategoryFilter(filterValues.category.join(','));
    } else {
      setCategoryFilter('');
    }

    // Reset pagination
    setCurrentPage(1);
  };

  // Mock data - replace with actual API call (only Pending Approval requests)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - all approval workflow statuses
        const mockData: BudgetRequest[] = [
          {
            request_id: 'BR001',
            title: 'New Bus Maintenance Equipment',
            description: 'Purchase of diagnostic equipment for bus maintenance including computerized diagnostic tools and specialized repair equipment for improving service quality.',
            requested_amount: 50000,
            status: 'Pending Approval',
            category: 'Maintenance',
            requested_by: 'John Doe',
            request_date: '2024-03-15',
            created_at: '2024-03-15T10:00:00Z'
          },
          {
            request_id: 'BR002',
            title: 'Driver Training Program',
            description: 'Comprehensive training program for new drivers including safety protocols and customer service training.',
            requested_amount: 25000,
            status: 'Approved',
            category: 'Training',
            requested_by: 'Mike Johnson',
            request_date: '2024-03-12',
            approval_date: '2024-03-14',
            approved_by: 'Finance Admin',
            created_at: '2024-03-12T14:30:00Z'
          },
          {
            request_id: 'BR003',
            title: 'Office Renovation',
            description: 'Renovation of the main office including new furniture and improved workspace layout.',
            requested_amount: 75000,
            status: 'Rejected',
            category: 'Infrastructure',
            requested_by: 'Sarah Wilson',
            request_date: '2024-03-08',
            rejection_reason: 'Budget constraints - project postponed to next fiscal year',
            approved_by: 'Finance Admin',
            created_at: '2024-03-08T11:00:00Z'
          },
          {
            request_id: 'BR004',
            title: 'Passenger WiFi Network',
            description: 'Installation of WiFi hotspots on all buses for passenger connectivity and real-time information access.',
            requested_amount: 60000,
            status: 'Closed',
            category: 'Equipment',
            requested_by: 'Kevin Martinez',
            request_date: '2024-01-15',
            approval_date: '2024-01-20',
            approved_by: 'Finance Admin',
            created_at: '2024-01-15T12:00:00Z'
          },
          {
            request_id: 'BR005',
            title: 'Fleet Expansion Vehicles',
            description: 'Purchase of 3 additional buses to expand route coverage and reduce passenger wait times during peak hours.',
            requested_amount: 450000,
            status: 'Pending Approval',
            category: 'Operations',
            requested_by: 'David Lee',
            request_date: '2024-03-18',
            created_at: '2024-03-18T13:30:00Z'
          },
          {
            request_id: 'BR006',
            title: 'Emergency Response Equipment',
            description: 'Purchase of first aid kits, defibrillators, and emergency communication equipment for all bus terminals.',
            requested_amount: 30000,
            status: 'Approved',
            category: 'Equipment',
            requested_by: 'Robert Davis',
            request_date: '2024-03-16',
            approval_date: '2024-03-18',
            approved_by: 'Finance Admin',
            created_at: '2024-03-16T08:45:00Z'
          },
          {
            request_id: 'BR007',
            title: 'Security System Upgrade',
            description: 'Installation of advanced security cameras and access control systems at all bus terminals and maintenance facilities.',
            requested_amount: 85000,
            status: 'Pending Approval',
            category: 'Infrastructure',
            requested_by: 'Anna Davis',
            request_date: '2024-03-22',
            created_at: '2024-03-22T11:15:00Z'
          },
          {
            request_id: 'BR008',
            title: 'Marketing Campaign Materials',
            description: 'Design and printing of promotional materials for the new route expansion campaign.',
            requested_amount: 15000,
            status: 'Rejected',
            category: 'Marketing',
            requested_by: 'Jane Smith',
            request_date: '2024-03-10',
            rejection_reason: 'Campaign postponed due to scheduling conflicts',
            approved_by: 'Finance Admin',
            created_at: '2024-03-10T09:00:00Z'
          }
        ];
        
        setData(mockData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showError('Failed to load budget requests for approval', 'Error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort logic (show all approval workflow statuses)
  const filteredData = data.filter((item: BudgetRequest) => {
    const searchLower = search.toLowerCase();

    const matchesSearch = search === '' || 
      item.title.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      item.requested_by.toLowerCase().includes(searchLower) ||
      item.requested_amount.toString().includes(searchLower) ||
      item.request_id.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter ? 
      statusFilter.split(',').some(status => item.status === status.trim()) : true;

    const matchesCategory = categoryFilter ? 
      categoryFilter.split(',').some(cat => item.category === cat.trim()) : true;

    const matchesAmount = (!amountMin || item.requested_amount >= parseFloat(amountMin)) && 
      (!amountMax || item.requested_amount <= parseFloat(amountMax));

    const itemDate = new Date(item.request_date).toISOString().split('T')[0];
    const matchesDate = (!dateFrom || itemDate >= dateFrom) && 
      (!dateTo || itemDate <= dateTo);

    // Show all approval workflow statuses
    const validStatuses = ['Pending Approval', 'Approved', 'Rejected', 'Closed'];
    const isValidStatus = validStatuses.includes(item.status);

    return matchesSearch && matchesStatus && matchesCategory && matchesAmount && matchesDate && isValidStatus;
  }).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Status badge component using unified chip styling
  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusClass = (status: string) => {
      switch (status) {
        case 'Draft': return 'Draft';
        case 'Pending Approval': return 'pending-approval';
        case 'Approved': return 'Approved';
        case 'Rejected': return 'Rejected';
        case 'Closed': return 'Closed';
        default: return 'pending-approval';
      }
    };

    return (
      <span className={`chip ${getStatusClass(status)}`}>
        {status}
      </span>
    );
  };

  // Action buttons based on status (similar to budgetRequest design)
  const getActionButtons = (item: BudgetRequest) => {
    const buttons = [];

    // View button (always available)
    buttons.push(
      <button 
        key="view"
        className="viewBtn" 
        onClick={() => handleView(item)}
        title="View Request"
      >
        <i className="ri-eye-line" />
      </button>
    );

    // Status-specific actions
    switch (item.status) {
      case 'Pending Approval':
        buttons.push(
          <button 
            key="approve"
            className="approveBtn" 
            onClick={() => handleApprove(item.request_id)}
            title="Approve Request"
          >
            <i className="ri-check-line" />
          </button>,
          <button 
            key="reject"
            className="rejectBtn" 
            onClick={() => handleReject(item.request_id)}
            title="Reject Request"
          >
            <i className="ri-close-line" />
          </button>
        );
        break;

      case 'Approved':
        buttons.push(
          <button 
            key="rollback"
            className="rollbackBtn" 
            onClick={() => handleRollbackToPending(item.request_id)}
            title="Rollback to Pending"
          >
            <i className="ri-arrow-go-back-line" />
          </button>,
          <button 
            key="close"
            className="closeBtn" 
            onClick={() => handleCloseRequest(item.request_id)}
            title="Close Request"
          >
            <i className="ri-archive-line" />
          </button>
        );
        break;

      case 'Rejected':
        buttons.push(
          <button 
            key="rollback"
            className="rollbackBtn" 
            onClick={() => handleRollbackToPending(item.request_id)}
            title="Rollback to Pending (Reconsider)"
          >
            <i className="ri-arrow-go-back-line" />
          </button>
        );
        break;

      case 'Closed':
        buttons.push(
          <button 
            key="export"
            className="exportBtn" 
            onClick={() => handleExportSingle(item)}
            title="Export Request"
          >
            <i className="ri-download-line" />
          </button>,
          <button 
            key="audit"
            className="auditBtn" 
            onClick={() => handleAuditTrail(item.request_id)}
            title="View Audit Trail"
          >
            <i className="ri-history-line" />
          </button>
        );
        break;

      default:
        break;
    }

    return buttons;
  };

  // Action handlers
  const handleView = (item: BudgetRequest) => {
    setSelectedRequest(item);
    setShowViewModal(true);
  };

  const handleApprove = async (requestId: string) => {
    const result = await Swal.fire({
      title: 'Approve Budget Request?',
      text: 'This will approve the budget request and allocate funds.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#FEB71F',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Approve',
    });

    if (result.isConfirmed) {
      try {
        // Implement approve API call
        setData(prev => prev.map(item => 
          item.request_id === requestId 
            ? { 
                ...item, 
                status: 'Approved' as const,
                approval_date: new Date().toISOString().split('T')[0],
                approved_by: 'Finance Admin'
              }
            : item
        ));
        showSuccess('Request approved successfully', 'Approved');
      } catch (error) {
        console.error('Approve error:', error);
        showError('Failed to approve request', 'Error');
      }
    }
  };

  const handleReject = async (requestId: string) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Budget Request',
      input: 'textarea',
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Enter reason for rejection...',
      inputAttributes: {
        'aria-label': 'Enter reason for rejection'
      },
      showCancelButton: true,
      confirmButtonText: 'Reject',
      confirmButtonColor: '#FF4949',
      cancelButtonColor: '#FEB71F',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to provide a reason for rejection!'
        }
      }
    });

    if (reason) {
      try {
        // Implement reject API call
        setData(prev => prev.map(item => 
          item.request_id === requestId 
            ? { 
                ...item, 
                status: 'Rejected' as const,
                rejection_reason: reason,
                approved_by: 'Finance Admin'
              }
            : item
        ));
        showSuccess('Request rejected successfully', 'Rejected');
      } catch (error) {
        console.error('Reject error:', error);
        showError('Failed to reject request', 'Error');
      }
    }
  };

  const handleAuditTrail = (requestId: string) => {
    const request = data.find(item => item.request_id === requestId);
    if (request) {
      setSelectedRequestForAudit(request);
      setShowAuditModal(true);
    }
  };

  // New action handlers for approval workflow
  const handleRollbackToPending = async (requestId: string) => {
    const result = await Swal.fire({
      title: 'Rollback to Pending Approval?',
      text: 'This will change the status back to Pending Approval for reconsideration.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#FEB71F',
      cancelButtonColor: '#6c757d',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Rollback',
    });

    if (result.isConfirmed) {
      try {
        setData(prev => prev.map(item => 
          item.request_id === requestId 
            ? { 
                ...item, 
                status: 'Pending Approval' as const,
                rejection_reason: undefined,
                approval_date: undefined,
                approved_by: undefined,
                updated_at: new Date().toISOString()
              }
            : item
        ));
        showSuccess('Request rolled back to pending approval', 'Rolled Back');
      } catch (error) {
        console.error('Rollback error:', error);
        showError('Failed to rollback request', 'Error');
      }
    }
  };

  const handleCloseRequest = async (requestId: string) => {
    const result = await Swal.fire({
      title: 'Close Budget Request?',
      text: 'This will mark the request as closed. Funds will be considered utilized.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#6c757d',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Close Request',
    });

    if (result.isConfirmed) {
      try {
        setData(prev => prev.map(item => 
          item.request_id === requestId 
            ? { 
                ...item, 
                status: 'Closed' as const,
                updated_at: new Date().toISOString()
              }
            : item
        ));
        showSuccess('Request closed successfully', 'Closed');
      } catch (error) {
        console.error('Close error:', error);
        showError('Failed to close request', 'Error');
      }
    }
  };

  const handleExportSingle = (item: BudgetRequest) => {
    console.log('Export single:', item);
    showSuccess(`Exporting request ${item.request_id}...`, 'Export Started');
  };

  // Global export functions
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    console.log('Export format:', format);
    showSuccess(`Exporting data as ${format.toUpperCase()}...`, 'Export Started');
  };

  // Sort handler
  const handleSort = (field: keyof BudgetRequest) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

   if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Budget Approval</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setErrorCode(null);
            //fetchdata again
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Budget Approval Management</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Budget Approval Management</h1>
        </div>
        
        <div className="settings">
          {/* Search bar */}
          <div className="revenue_searchBar">
            <i className="ri-search-line" />
            <input
              className="searchInput"
              type="text"
              placeholder="Search budget requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <FilterDropdown
            sections={filterSections}
            onApply={handleFilterApply}
            initialValues={{
              dateRange: { from: dateFrom, to: dateTo },
              status: statusFilter ? statusFilter.split(',') : [],
              category: categoryFilter ? categoryFilter.split(',') : []
            }}
          />

          {/* Export dropdown - similar to budgetRequest */}
          <div className="export-dropdown">
            <button className="export-dropdown-toggle">
              <i className="ri-download-line" /> Export
            </button>
            <div className="export-dropdown-menu">
              <button onClick={() => handleExport('csv')}>
                <i className="ri-file-text-line" />
                CSV
              </button>
              <button onClick={() => handleExport('excel')}>
                <i className="ri-file-excel-line" />
                Excel
              </button>
              <button onClick={() => handleExport('pdf')}>
                <i className="ri-file-pdf-line" />
                PDF
              </button>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('request_date')} className="sortable">
                    Request Date
                    {sortField === 'request_date' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th onClick={() => handleSort('title')} className="sortable">
                    Title
                    {sortField === 'title' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th onClick={() => handleSort('category')} className="sortable">
                    Category
                    {sortField === 'category' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th onClick={() => handleSort('requested_amount')} className="sortable">
                    Amount
                    {sortField === 'requested_amount' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th>Status</th>
                  <th onClick={() => handleSort('requested_by')} className="sortable">
                    Requested By
                    {sortField === 'requested_by' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(item => (
                  <tr 
                    key={item.request_id}
                    onClick={(e) => {
                      // Prevent row click when clicking on action buttons
                      if (!(e.target as HTMLElement).closest('.actionButtonsContainer')) {
                        handleView(item);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{formatDate(item.request_date)}</td>
                    <td>
                      <div className="request-title">
                        <strong title={item.title.length > 30 ? item.title : undefined}>
                          {item.title}
                        </strong>
                        <div 
                          className="request-description" 
                          title={item.description.length > 60 ? item.description : undefined}
                        >
                          {item.description.length > 60 
                            ? `${item.description.substring(0, 60)}...` 
                            : item.description
                          }
                        </div>
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td className="amount-cell">
                      ₱{item.requested_amount.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{item.requested_by}</td>
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        {getActionButtons(item)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && (
              <p className="noRecords">No budget requests found matching the current filters.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        {showAuditModal && selectedRequestForAudit && (
          <AuditTrailBudgetRequest
            requestId={selectedRequestForAudit.request_id}
            requestTitle={selectedRequestForAudit.title}
            onClose={() => {
              setShowAuditModal(false);
              setSelectedRequestForAudit(null);
            }}
          />
        )}

        {showViewModal && selectedRequest && (
          <ViewBudgetRequest
            request={selectedRequest}
            onClose={() => {
              setShowViewModal(false);
              setSelectedRequest(null);
            }}
            onEdit={(request) => {
              console.log('Edit request:', request);
              // Handle edit functionality
              setShowViewModal(false);
            }}
            onExport={(request) => {
              console.log('Export request:', request);
              // Handle export functionality
            }}
            showActions={false} // No actions in approval view
          />
        )}
      </div>
    </div>
  );
};

export default BudgetApprovalPage;