"use client";

import React, { useState, useEffect } from "react";
import "../../../styles/components/table.css";
import "../../../styles/components/chips.css";
import "../../../styles/budget-management/budgetRequest.css";
import PaginationComponent from "../../../Components/pagination";
import Swal from 'sweetalert2';
import { formatDate, formatDateTime } from '../../../utility/dateFormatter';
import Loading from '../../../Components/loading';
import { showSuccess, showError } from '../../../utility/Alerts';
import FilterDropdown, { FilterSection } from "../../../Components/filter";
import AddBudgetRequest from './addBudgetRequest';
import ViewBudgetRequest from './viewBudgetRequest';
import AuditTrailBudgetRequest from './auditTrailBudgetRequest';



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

const BudgetRequestPage = () => {
  const [data, setData] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
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
        { id: 'Draft', label: 'Draft' },
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

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
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
            title: 'Marketing Campaign Q2',
            description: 'Budget for digital marketing campaign including social media advertising, website improvements, and promotional materials to increase ridership.',
            requested_amount: 25000,
            status: 'Approved',
            category: 'Marketing',
            requested_by: 'Jane Smith',
            request_date: '2024-03-10',
            approval_date: '2024-03-12',
            approved_by: 'Finance Admin',
            created_at: '2024-03-10T14:30:00Z'
          },
          {
            request_id: 'BR003',
            title: 'Driver Training Program',
            description: 'Quarterly driver safety training program covering defensive driving techniques and vehicle maintenance basics for all fleet drivers.',
            requested_amount: 15000,
            status: 'Draft',
            category: 'Training',
            requested_by: 'Mike Johnson',
            request_date: '2024-03-20',
            created_at: '2024-03-20T09:15:00Z'
          },
          {
            request_id: 'BR004',
            title: 'GPS Tracking System Upgrade',
            description: 'Upgrade existing GPS tracking systems across the fleet with new hardware and software capabilities for better route optimization.',
            requested_amount: 75000,
            status: 'Rejected',
            category: 'Equipment',
            requested_by: 'Sarah Wilson',
            request_date: '2024-03-08',
            rejection_reason: 'Budget constraints for Q1',
            created_at: '2024-03-08T11:20:00Z'
          },
          {
            request_id: 'BR005',
            title: 'Terminal Infrastructure Repair',
            description: 'Essential repairs to bus terminal facilities including roof repairs, electrical system updates, and passenger waiting areas renovation.',
            requested_amount: 120000,
            status: 'Closed',
            category: 'Infrastructure',
            requested_by: 'Tom Brown',
            request_date: '2024-02-25',
            approval_date: '2024-02-28',
            approved_by: 'Finance Admin',
            created_at: '2024-02-25T16:45:00Z'
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
            request_id: 'BR007',
            title: 'Office Equipment Upgrade',
            description: 'Replacement of outdated computers and office equipment for administrative staff to improve operational efficiency.',
            requested_amount: 18000,
            status: 'Draft',
            category: 'Other',
            requested_by: 'Lisa Martinez',
            request_date: '2024-03-22',
            created_at: '2024-03-22T08:45:00Z'
          },
          {
            request_id: 'BR008',
            title: 'Safety Equipment Update',
            description: 'Purchase of updated safety equipment including first aid kits, fire extinguishers, and emergency communication devices for all vehicles.',
            requested_amount: 8500,
            status: 'Approved',
            category: 'Equipment',
            requested_by: 'Robert Garcia',
            request_date: '2024-03-12',
            approval_date: '2024-03-14',
            approved_by: 'Operations Manager',
            created_at: '2024-03-12T10:20:00Z'
          }
        ];
        
        setData(mockData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showError('Failed to load budget requests', 'Error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort logic
  const filteredData = data.filter((item: BudgetRequest) => {
    const searchLower = search.toLowerCase();

    const matchesSearch = search === '' || 
      item.title.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      item.status.toLowerCase().includes(searchLower) ||
      item.requested_by.toLowerCase().includes(searchLower) ||
      item.requested_amount.toString().includes(searchLower) ||
      item.request_id.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter ? 
      statusFilter.split(',').some(status => item.status === status.trim()) : true;

    const matchesCategory = categoryFilter ? 
      categoryFilter.split(',').some(cat => item.category === cat.trim()) : true;

    const itemDate = new Date(item.request_date).toISOString().split('T')[0];
    const matchesDate = (!dateFrom || itemDate >= dateFrom) && 
      (!dateTo || itemDate <= dateTo);

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
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
        default: return 'Draft';
      }
    };

    return (
      <span className={`chip ${getStatusClass(status)}`}>
        {status}
      </span>
    );
  };

  // Action buttons based on status (Admin View)
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

    switch (item.status) {
      case 'Draft':
        buttons.push(
          <button 
            key="edit"
            className="editBtn" 
            onClick={() => handleEdit(item)}
            title="Edit Request"
          >
            <i className="ri-edit-2-line" />
          </button>,
          <button 
            key="delete"
            className="deleteBtn" 
            onClick={() => handleDelete(item.request_id)}
            title="Delete Request"
          >
            <i className="ri-delete-bin-line" />
          </button>,
          <button 
            key="submit"
            className="submitBtn" 
            onClick={() => handleSubmit(item.request_id)}
            title="Submit for Approval"
          >
            <i className="ri-send-plane-line" />
          </button>
        );
        break;
      
      case 'Pending Approval':
        // Admin can approve or reject pending requests
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
      
      case 'Rejected':
        buttons.push(
          <button 
            key="export"
            className="exportBtn" 
            onClick={() => handleExportSingle(item)}
            title="Export Request"
          >
            <i className="ri-download-line" />
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
    }

    return buttons;
  };

  // Add Budget Request
    const handleAddBudgetRequest = async (newRequest: any) => {
        try {
            // Here you would make an API call to save the budget request
            console.log('New budget request:', newRequest);
            
            // For now, add to local state (replace with actual API call)
            const mockRequest = {
                request_id: `BR${String(data.length + 1).padStart(3, '0')}`,
                title: newRequest.title,
                description: newRequest.description,
                requested_amount: newRequest.total_amount, // Map total_amount to requested_amount
                status: newRequest.status,
                category: 'Operations', // You may want to add category to your form
                requested_by: newRequest.requester_name,
                request_date: newRequest.request_date,
                approval_date: newRequest.approval_date,
                approved_by: newRequest.approved_by,
                rejection_reason: newRequest.rejection_reason,
                created_at: new Date().toISOString()
            };
            
            setData(prev => [mockRequest, ...prev]);
            showSuccess('Budget request created successfully', 'Success');
            setShowAddModal(false);
        } catch (error) {
            console.error('Error creating budget request:', error);
            showError('Failed to create budget request', 'Error');
        }
    };


  // Action handlers
  const handleView = (item: BudgetRequest) => {
    setSelectedRequest(item);
    setShowViewModal(true);
  };

  const handleEdit = (item: BudgetRequest) => {
    console.log('Edit:', item);
    showSuccess('Edit functionality will be implemented', 'Info');
    // Implement edit modal
  };

  const handleDelete = async (requestId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the budget request permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#FEB71F',
      reverseButtons: true,
      confirmButtonText: 'Yes, delete it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        // Implement delete API call
        setData(prev => prev.filter(item => item.request_id !== requestId));
        showSuccess('Request deleted successfully', 'Deleted');
      } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete request', 'Error');
      }
    }
  };

  const handleSubmit = async (requestId: string) => {
    const result = await Swal.fire({
      title: 'Submit for Approval?',
      text: 'Once submitted, you cannot edit this request.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#FEB71F',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Submit',
    });

    if (result.isConfirmed) {
      try {
        // Implement submit API call
        setData(prev => prev.map(item => 
          item.request_id === requestId 
            ? { ...item, status: 'Pending Approval' as const }
            : item
        ));
        showSuccess('Request submitted for approval', 'Success');
      } catch (error) {
        console.error('Submit error:', error);
        showError('Failed to submit request', 'Error');
      }
    }
  };

  // New admin functions
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

  const handleExportSingle = (item: BudgetRequest) => {
    console.log('Export single:', item);
    showSuccess(`Exporting request ${item.request_id}...`, 'Export Started');
    // Implement single request export
  };

    const handleAuditTrail = (requestId: string) => {
        const request = data.find(item => item.request_id === requestId);
        if (request) {
            setSelectedRequestForAudit(request);
            setShowAuditModal(true);
        }
    };

  // Export functions
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    console.log('Export format:', format);
    showSuccess(`Exporting data as ${format.toUpperCase()}...`, 'Export Started');
    // Implement export functionality based on format
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
                  <h1 className="title">Budget Request (Admin)</h1>
                  <Loading />
              </div>
          );
      }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Budget Requests (Admin)</h1>
        </div>
        
        <div className="settings">
          {/* Search bar */}
          <div className="revenue_searchBar">
            <i className="ri-search-line" />
            <input
              className="searchInput"
              type="text"
              placeholder="Search requests..."
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

          <div className="filters">
            {/* Export dropdown */}
            <div className="export-dropdown">
              <button className="export-dropdown-toggle">
                <i className="ri-download-line" /> Export
              </button>
              <div className="export-dropdown-menu">
                <button onClick={() => handleExport('csv')}>
                  <i className="ri-file-text-line" /> CSV
                </button>
                <button onClick={() => handleExport('excel')}>
                  <i className="ri-file-excel-line" /> Excel
                </button>
                <button onClick={() => handleExport('pdf')}>
                  <i className="ri-file-pdf-line" /> PDF
                </button>
              </div>
            </div>

            {/* Add New Request */}
            <button onClick={() => setShowAddModal(true)} id="addRequest">
                <i className="ri-add-line" /> New Request
            </button>
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
                  <th onClick={() => handleSort('status')} className="sortable">
                    Status
                    {sortField === 'status' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
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
              <p className="noRecords">No budget requests found.</p>
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

        {showAddModal && (
            <AddBudgetRequest
                onClose={() => setShowAddModal(false)}
                onAddBudgetRequest={handleAddBudgetRequest}
                currentUser="ftms_user" // Replace with actual user
            />
        )}

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
                showActions={true}
            />
        )}
      </div>
    </div>
  );
};

export default BudgetRequestPage;