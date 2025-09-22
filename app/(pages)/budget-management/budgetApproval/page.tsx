"use client";

import React, { useState, useEffect } from "react";
import "../../../styles/components/table.css";
import "../../../styles/components/chips.css";
import "../../../styles/budget-management/budgetApproval.css";
import PaginationComponent from "../../../Components/pagination";
import Swal from 'sweetalert2';
import { formatDate, formatDateTime } from '../../../utility/dateFormatter';
import Loading from '../../../Components/loading';
import { showSuccess, showError } from '../../../utility/Alerts';
import FilterDropdown, { FilterSection } from "../../../Components/filter";
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
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
        
        // Mock data - only Pending Approval requests
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
            request_id: 'BR006',
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
            request_id: 'BR009',
            title: 'Security System Upgrade',
            description: 'Installation of advanced security cameras and access control systems at all bus terminals and maintenance facilities.',
            requested_amount: 85000,
            status: 'Pending Approval',
            category: 'Infrastructure',
            requested_by: 'Anna Davis',
            request_date: '2024-03-22',
            created_at: '2024-03-22T11:15:00Z'
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

  // Filter and sort logic (only Pending Approval requests)
  const filteredData = data.filter((item: BudgetRequest) => {
    const searchLower = search.toLowerCase();

    const matchesSearch = search === '' || 
      item.title.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      item.requested_by.toLowerCase().includes(searchLower) ||
      item.requested_amount.toString().includes(searchLower) ||
      item.request_id.toLowerCase().includes(searchLower);

    const matchesCategory = categoryFilter ? 
      categoryFilter.split(',').some(cat => item.category === cat.trim()) : true;

    const itemDate = new Date(item.request_date).toISOString().split('T')[0];
    const matchesDate = (!dateFrom || itemDate >= dateFrom) && 
      (!dateTo || itemDate <= dateTo);

    // Only show Pending Approval requests
    const isPendingApproval = item.status === 'Pending Approval';

    return matchesSearch && matchesCategory && matchesDate && isPendingApproval;
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
        case 'Pending Approval': return 'pending-approval';
        default: return 'pending-approval';
      }
    };

    return (
      <span className={`chip ${getStatusClass(status)}`}>
        {status}
      </span>
    );
  };

  // Action buttons for approval page (only Pending Approval requests)
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

    // Approve and Reject buttons for Pending Approval status
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

  // Sort handler
  const handleSort = (field: keyof BudgetRequest) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Budget Approval</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Budget Approval</h1>
        </div>
        
        <div className="settings">
          {/* Search bar */}
          <div className="revenue_searchBar">
            <i className="ri-search-line" />
            <input
              className="searchInput"
              type="text"
              placeholder="Search pending requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <FilterDropdown
            sections={filterSections}
            onApply={handleFilterApply}
            initialValues={{
              dateRange: { from: dateFrom, to: dateTo },
              category: categoryFilter ? categoryFilter.split(',') : []
            }}
          />
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
              <p className="noRecords">No budget requests pending approval.</p>
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