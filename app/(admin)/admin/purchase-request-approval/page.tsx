"use client";

import React, { useState, useEffect, useMemo } from "react";
import FilterDropdown, { FilterSection } from "../../../Components/filter";
import Loading from "../../../Components/loading";
import PaginationComponent from "../../../Components/pagination";
import { showConfirmation, showSuccess, showError } from "../../../utility/Alerts";

// Import types for purchase request approval
import {
  ApprovalStatus,
  RequestPriority,
  Department,
  ApprovalAction,
  RollbackAction,
  RefundAction,
  ApprovalFilters
} from "../../../types/purchaseRequestApproval";
import type { PurchaseRequestApproval } from "../../../types/purchaseRequestApproval";

// Import existing modal components
//@ts-ignore
import ViewPurchaseRequest from "./viewPurchaseRequest";
//@ts-ignore
import AuditTrailPurchaseRequest from "./auditTrailPurchaseRequest";
//@ts-ignore
import TrackStatusPurchaseRequest from "./trackStatusPurchaseRequest";

// Import approval-specific modals
import ApprovalModal from "./approvalModal";
import RejectionModal from "./rejectionModal";
import ProcessRefundModal from "./processRefundModal";

// Import styles - using table.css and expense.css structure
//@ts-ignore
import "../../../styles/components/filter.css";
//@ts-ignore
import "../../../styles/components/table.css";
//@ts-ignore
import "../../../styles/components/chips.css";
//@ts-ignore
import "../../../styles/components/loading.css";
//@ts-ignore
import "../../../styles/expense/expense.css";
//@ts-ignore
import "../../../styles/purchase-approval/purchase-approval.css";

export default function PurchaseRequestApproval() {
  // Sample data for purchase request approvals
  const sampleApprovalData: PurchaseRequestApproval[] = [
    {
      id: "1",
      request_id: "PR-2024-001",
      title: "Vehicle Maintenance Supplies",
      department: Department.OPERATIONS,
      requester_name: "Juan Dela Cruz",
      requester_position: "Fleet Supervisor",
      supplier_name: "AutoParts Inc.",
      total_amount: 25000.00,
      request_date: "2024-01-15",
      status: ApprovalStatus.PENDING_APPROVAL,
      priority: RequestPriority.URGENT,
      submitted_by: "Juan Dela Cruz",
      submitted_date: "2024-01-15",
      items: [
        {
          item_name: "Brake Pads",
          quantity: 10,
          unit_measure: "sets",
          unit_cost: 1500.00,
          total_cost: 15000.00,
          supplier: "AutoParts Inc.",
          category: "Maintenance"
        },
        {
          item_name: "Engine Oil",
          quantity: 20,
          unit_measure: "liters",
          unit_cost: 500.00,
          total_cost: 10000.00,
          supplier: "AutoParts Inc.",
          category: "Maintenance"
        }
      ],
      purpose: "Regular maintenance for bus fleet",
      justification: "Critical maintenance items needed to ensure fleet safety and reliability",
      created_at: "2024-01-15T08:00:00Z",
      created_by: "Juan Dela Cruz",
      is_deleted: false
    },
    {
      id: "2",
      request_id: "PR-2024-002",
      title: "Office Equipment Upgrade",
      department: Department.ADMINISTRATION,
      requester_name: "Maria Santos",
      requester_position: "Admin Manager",
      supplier_name: "TechMax Supply",
      total_amount: 45000.00,
      request_date: "2024-01-10",
      status: ApprovalStatus.APPROVED,
      priority: RequestPriority.NORMAL,
      submitted_by: "Maria Santos",
      submitted_date: "2024-01-10",
      approved_by: "Admin Director",
      approved_date: "2024-01-12",
      items: [
        {
          item_name: "Desktop Computer",
          quantity: 3,
          unit_measure: "units",
          unit_cost: 15000.00,
          total_cost: 45000.00,
          supplier: "TechMax Supply",
          category: "Equipment"
        }
      ],
      purpose: "Upgrade aging office computers",
      justification: "Current computers are 5+ years old and affecting productivity",
      created_at: "2024-01-10T09:30:00Z",
      created_by: "Maria Santos",
      is_deleted: false
    },
    {
      id: "3",
      request_id: "PR-2024-003",
      title: "Safety Equipment Purchase",
      department: Department.OPERATIONS,
      requester_name: "Carlos Rodriguez",
      requester_position: "Safety Officer",
      supplier_name: "SafetyFirst Corp.",
      total_amount: 18000.00,
      request_date: "2024-01-08",
      status: ApprovalStatus.REJECTED,
      priority: RequestPriority.NORMAL,
      submitted_by: "Carlos Rodriguez",
      submitted_date: "2024-01-08",
      rejected_by: "Finance Manager",
      rejected_date: "2024-01-14",
      rejection_reason: "Budget allocation exceeded for safety equipment this quarter",
      items: [
        {
          item_name: "Safety Vests",
          quantity: 50,
          unit_measure: "pieces",
          unit_cost: 200.00,
          total_cost: 10000.00,
          supplier: "SafetyFirst Corp.",
          category: "Safety"
        },
        {
          item_name: "Hard Hats",
          quantity: 40,
          unit_measure: "pieces",
          unit_cost: 200.00,
          total_cost: 8000.00,
          supplier: "SafetyFirst Corp.",
          category: "Safety"
        }
      ],
      purpose: "Replenish safety equipment inventory",
      justification: "Safety equipment needs replacement due to wear and compliance requirements",
      created_at: "2024-01-08T14:20:00Z",
      created_by: "Carlos Rodriguez",
      is_deleted: false
    },
    {
      id: "4",
      request_id: "PR-2024-004",
      title: "Cleaning Supplies Restock",
      department: Department.MAINTENANCE,
      requester_name: "Ana Garcia",
      requester_position: "Maintenance Supervisor",
      supplier_name: "CleanMax Solutions",
      total_amount: 12000.00,
      request_date: "2024-01-05",
      status: ApprovalStatus.COMPLETED,
      priority: RequestPriority.NORMAL,
      submitted_by: "Ana Garcia",
      submitted_date: "2024-01-05",
      approved_by: "Operations Manager",
      approved_date: "2024-01-06",
      items: [
        {
          item_name: "Industrial Detergent",
          quantity: 24,
          unit_measure: "bottles",
          unit_cost: 250.00,
          total_cost: 6000.00,
          supplier: "CleanMax Solutions",
          category: "Cleaning"
        },
        {
          item_name: "Disinfectant",
          quantity: 30,
          unit_measure: "bottles",
          unit_cost: 200.00,
          total_cost: 6000.00,
          supplier: "CleanMax Solutions",
          category: "Cleaning"
        }
      ],
      purpose: "Monthly cleaning supplies replenishment",
      justification: "Regular maintenance supplies needed for facility cleanliness",
      order_number: "ORD-2024-001",
      actual_delivery_date: "2024-01-20",
      created_at: "2024-01-05T11:15:00Z",
      created_by: "Ana Garcia",
      is_deleted: false
    },
    {
      id: "5",
      request_id: "PR-2024-005",
      title: "IT Infrastructure Components",
      department: Department.ADMINISTRATION,
      requester_name: "Roberto Kim",
      requester_position: "IT Manager",
      supplier_name: "DataTech Solutions",
      total_amount: 35000.00,
      request_date: "2024-01-12",
      status: ApprovalStatus.PARTIALLY_COMPLETED,
      priority: RequestPriority.URGENT,
      submitted_by: "Roberto Kim",
      submitted_date: "2024-01-12",
      approved_by: "IT Director",
      approved_date: "2024-01-13",
      refund_amount: 5000.00,
      refund_reason: "One server unit was defective upon delivery",
      items: [
        {
          item_name: "Network Server",
          quantity: 2,
          unit_measure: "units",
          unit_cost: 15000.00,
          total_cost: 30000.00,
          supplier: "DataTech Solutions",
          category: "IT Equipment"
        },
        {
          item_name: "Network Switch",
          quantity: 5,
          unit_measure: "units",
          unit_cost: 1000.00,
          total_cost: 5000.00,
          supplier: "DataTech Solutions",
          category: "IT Equipment"
        }
      ],
      purpose: "Network infrastructure upgrade",
      justification: "Current network infrastructure cannot handle increased load",
      order_number: "ORD-2024-002",
      created_at: "2024-01-12T16:45:00Z",
      created_by: "Roberto Kim",
      is_deleted: false
    }
  ];

  // State management
  const [data, setData] = useState<PurchaseRequestApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ApprovalFilters>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [activeRow, setActiveRow] = useState<PurchaseRequestApproval | null>(null);

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setData(sampleApprovalData);
      } catch (error) {
        console.error('Error loading approval data:', error);
        showError('Failed to load purchase request approvals', 'Error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter sections configuration
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      defaultValue: { from: "", to: "" }
    },
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      options: [
        { id: ApprovalStatus.PENDING_APPROVAL, label: 'Pending Approval' },
        { id: ApprovalStatus.APPROVED, label: 'Approved' },
        { id: ApprovalStatus.REJECTED, label: 'Rejected' },
        { id: ApprovalStatus.COMPLETED, label: 'Completed' },
        { id: ApprovalStatus.PARTIALLY_COMPLETED, label: 'Partially Completed' },
        { id: ApprovalStatus.REFUND_REQUESTED, label: 'Refund Requested' }
      ]
    },
    {
      id: 'department',
      title: 'Department',
      type: 'checkbox',
      options: [
        { id: Department.OPERATIONS, label: 'Operations' },
        { id: Department.MAINTENANCE, label: 'Maintenance' },
        { id: Department.ADMINISTRATION, label: 'Administration' },
        { id: Department.FINANCE, label: 'Finance' },
        { id: Department.HR, label: 'HR' }
      ]
    },
    {
      id: 'priority',
      title: 'Priority',
      type: 'checkbox',
      options: [
        { id: RequestPriority.URGENT, label: 'Urgent' },
        { id: RequestPriority.NORMAL, label: 'Normal' }
      ]
    },
    {
      id: 'supplier',
      title: 'Supplier',
      type: 'checkbox',
      options: Array.from(new Set(sampleApprovalData.map(item => item.supplier_name)))
        .map(supplier => ({ id: supplier, label: supplier }))
    }
  ];

  // Handle filter application
  const handleApplyFilters = (filterValues: Record<string, any>) => {
    console.log("Applied filters:", filterValues);
    
    const newFilters: ApprovalFilters = {};
    
    // Date range filter
    if (filterValues.dateRange && typeof filterValues.dateRange === 'object') {
      newFilters.date_range = filterValues.dateRange as { from: string; to: string };
    }
    
    // Status filter
    if (filterValues.status && Array.isArray(filterValues.status)) {
      newFilters.status = filterValues.status as ApprovalStatus[];
    }
    
    // Department filter
    if (filterValues.department && Array.isArray(filterValues.department)) {
      newFilters.department = filterValues.department as Department[];
    }
    
    // Priority filter
    if (filterValues.priority && Array.isArray(filterValues.priority)) {
      newFilters.priority = filterValues.priority as RequestPriority[];
    }
    
    // Supplier filter
    if (filterValues.supplier && Array.isArray(filterValues.supplier)) {
      newFilters.supplier = filterValues.supplier;
    }
    
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item =>
        item.request_id.toLowerCase().includes(searchLower) ||
        item.title.toLowerCase().includes(searchLower) ||
        item.requester_name.toLowerCase().includes(searchLower) ||
        item.supplier_name.toLowerCase().includes(searchLower) ||
        item.department.toLowerCase().includes(searchLower) ||
        item.total_amount.toString().includes(searchLower)
      );
    }
    
    // Apply filters
    if (filters.status?.length) {
      result = result.filter(item => filters.status!.includes(item.status));
    }
    
    if (filters.department?.length) {
      result = result.filter(item => filters.department!.includes(item.department));
    }
    
    if (filters.priority?.length) {
      result = result.filter(item => filters.priority!.includes(item.priority));
    }
    
    if (filters.supplier?.length) {
      result = result.filter(item => filters.supplier!.includes(item.supplier_name));
    }
    
    if (filters.date_range) {
      const { from, to } = filters.date_range;
      if (from) result = result.filter(item => item.request_date >= from);
      if (to) result = result.filter(item => item.request_date <= to);
    }
    
    return result;
  }, [data, search, filters]);

  // Pagination calculations
  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Format status for display
  const formatStatus = (status: ApprovalStatus): string => {
    const statusMap = {
      [ApprovalStatus.PENDING_APPROVAL]: 'Pending Approval',
      [ApprovalStatus.APPROVED]: 'Approved',
      [ApprovalStatus.REJECTED]: 'Rejected',
      [ApprovalStatus.COMPLETED]: 'Completed',
      [ApprovalStatus.PARTIALLY_COMPLETED]: 'Partially Completed',
      [ApprovalStatus.REFUND_REQUESTED]: 'Refund Requested',
      [ApprovalStatus.CANCELLED]: 'Cancelled'
    };
    return statusMap[status] || status;
  };

  // Format department for display
  const formatDepartment = (department: Department): string => {
    const departmentMap = {
      [Department.OPERATIONS]: 'Operations',
      [Department.MAINTENANCE]: 'Maintenance',
      [Department.ADMINISTRATION]: 'Administration',
      [Department.FINANCE]: 'Finance',
      [Department.HR]: 'HR'
    };
    return departmentMap[department] || department;
  };

  // Modal handlers
  const openModal = (content: React.ReactNode, rowData?: PurchaseRequestApproval) => {
    setModalContent(content);
    setActiveRow(rowData || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setActiveRow(null);
  };

  // Action handlers
  const handleView = (request: PurchaseRequestApproval) => {
    openModal(
      <ViewPurchaseRequest 
        purchaseRequest={request} 
        onClose={closeModal} 
      />, 
      request
    );
  };

  const handleApprove = (request: PurchaseRequestApproval) => {
    const handleApprovalSubmit = async (comments?: string) => {
      const updatedData = data.map(item =>
        item.id === request.id
          ? {
              ...item,
              status: ApprovalStatus.APPROVED,
              approved_by: "Current User", // In real app, get from auth
              approved_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
              updated_by: "Current User"
            }
          : item
      );
      setData(updatedData);
      showSuccess("Purchase request has been approved successfully.", "Request Approved");
    };

    openModal(
      <ApprovalModal 
        request={{
          request_id: request.request_id,
          title: request.title,
          requester_name: request.requester_name,
          total_amount: request.total_amount,
          department: request.department
        }}
        onApprove={handleApprovalSubmit}
        onClose={closeModal}
      />, 
      request
    );
  };

  const handleReject = (request: PurchaseRequestApproval) => {
    const handleRejectionSubmit = async (rejectionReason: string) => {
      const updatedData = data.map(item =>
        item.id === request.id
          ? {
              ...item,
              status: ApprovalStatus.REJECTED,
              rejected_by: "Current User",
              rejected_date: new Date().toISOString().split('T')[0],
              rejection_reason: rejectionReason,
              updated_at: new Date().toISOString(),
              updated_by: "Current User"
            }
          : item
      );
      setData(updatedData);
      showSuccess("Purchase request has been rejected.", "Request Rejected");
    };

    openModal(
      <RejectionModal 
        request={{
          request_id: request.request_id,
          title: request.title,
          requester_name: request.requester_name,
          total_amount: request.total_amount,
          department: request.department
        }}
        onReject={handleRejectionSubmit}
        onClose={closeModal}
      />, 
      request
    );
  };

  const handleRollback = async (request: PurchaseRequestApproval) => {
    const result = await showConfirmation(
      `Are you sure you want to <b>ROLLBACK</b> "${request.title}" to pending status?`,
      "Rollback Request"
    );
    
    if (result.isConfirmed) {
      const updatedData = data.map(item =>
        item.id === request.id
          ? {
              ...item,
              status: ApprovalStatus.PENDING_APPROVAL,
              approved_by: undefined,
              approved_date: undefined,
              rejected_by: undefined,
              rejected_date: undefined,
              rejection_reason: undefined,
              updated_at: new Date().toISOString(),
              updated_by: "Current User"
            }
          : item
      );
      setData(updatedData);
      showSuccess("Purchase request has been rolled back to pending status.", "Request Rolled Back");
    }
  };

  const handleCancel = async (request: PurchaseRequestApproval) => {
    const result = await showConfirmation(
      `Are you sure you want to <b>CANCEL</b> the purchase request "${request.title}"?<br/>
      <small>This action cannot be undone.</small>`,
      "Cancel Request"
    );
    
    if (result.isConfirmed) {
      const updatedData = data.map(item =>
        item.id === request.id
          ? {
              ...item,
              status: ApprovalStatus.CANCELLED,
              updated_at: new Date().toISOString(),
              updated_by: "Current User"
            }
          : item
      );
      setData(updatedData);
      showSuccess("Purchase request has been cancelled.", "Request Cancelled");
    }
  };

  const handleProcessRefund = (request: PurchaseRequestApproval) => {
    const handleRefundSubmit = async (refundData: {
      refund_amount: number;
      refund_reason: string;
      payment_method: string;
      account_details?: string;
    }) => {
      // In a real app, this would trigger refund processing
      console.log("Processing refund:", refundData);
      showSuccess("Refund request has been processed successfully.", "Refund Processed");
    };

    openModal(
      <ProcessRefundModal 
        request={request}
        onRefundProcessed={(requestId: string, refundAmount: number, reason: string) => {
          handleRefundSubmit({
            refund_amount: refundAmount,
            refund_reason: reason,
            payment_method: "bank_transfer", // Default, actual value comes from modal
            account_details: undefined
          });
        }}
        onClose={closeModal}
      />, 
      request
    );
  };

  const handleTrackStatus = (request: PurchaseRequestApproval) => {
    openModal(
      <TrackStatusPurchaseRequest 
        requestId={request.request_id}
        requestTitle={request.title}
        onClose={closeModal} 
      />, 
      request
    );
  };

  const handleAuditTrail = (request: PurchaseRequestApproval) => {
    openModal(
      <AuditTrailPurchaseRequest 
        requestId={request.request_id}
        requestTitle={request.title}
        onClose={closeModal} 
      />, 
      request
    );
  };

  // Export functionality
  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'purchase_request_approvals';
    
    // Add filter info to filename
    if (filters.status?.length) {
      fileName += `_${filters.status.join('-').replace(/[^a-zA-Z0-9-]/g, '')}`;
    }
    
    if (filters.department?.length) {
      fileName += `_${filters.department.join('-')}`;
    }
    
    fileName += `_${dateStamp}_${timeStamp}`;
    
    return `${fileName}.csv`;
  };

  const generateExportData = () => {
    return filteredData.map(request => ({
      'Request ID': request.request_id,
      'Title': request.title,
      'Department': formatDepartment(request.department),
      'Requester': request.requester_name,
      'Position': request.requester_position,
      'Supplier': request.supplier_name,
      'Total Amount': `₱${request.total_amount.toLocaleString()}`,
      'Status': formatStatus(request.status),
      'Priority': request.priority.charAt(0).toUpperCase() + request.priority.slice(1),
      'Request Date': new Date(request.request_date).toLocaleDateString(),
      'Submitted By': request.submitted_by,
      'Submitted Date': new Date(request.submitted_date).toLocaleDateString(),
      'Approved By': request.approved_by || 'N/A',
      'Approved Date': request.approved_date ? new Date(request.approved_date).toLocaleDateString() : 'N/A',
      'Rejected By': request.rejected_by || 'N/A',
      'Rejected Date': request.rejected_date ? new Date(request.rejected_date).toLocaleDateString() : 'N/A',
      'Rejection Reason': request.rejection_reason || 'N/A',
      'Purpose': request.purpose,
      'Items Count': request.items.length,
      'Order Number': request.order_number || 'N/A',
      'Refund Amount': request.refund_amount ? `₱${request.refund_amount.toLocaleString()}` : 'N/A',
      'Refund Reason': request.refund_reason || 'N/A'
    }));
  };

  const handleExport = async () => {
    try {
      // Show confirmation with export details
      const exportData = generateExportData();
      const result = await showConfirmation(
        `Export ${exportData.length} purchase request approval records?<br/>
        <small>Filters applied: ${filters.status?.length ? `Status (${filters.status.length})` : 'All Status'}, 
        ${filters.department?.length ? `Department (${filters.department.length})` : 'All Departments'}</small>`,
        "Confirm Export"
      );
      
      if (result.isConfirmed) {
        // Generate CSV header comment
        const generateHeaderComment = () => {
          let comment = `# Purchase Request Approval Export\n`;
          comment += `# Export Date: ${new Date().toISOString()}\n`;
          comment += `# Total Records: ${exportData.length}\n`;
          comment += `# Filters Applied:\n`;
          comment += `#   Status: ${filters.status?.length ? filters.status.join(', ') : 'All'}\n`;
          comment += `#   Department: ${filters.department?.length ? filters.department.join(', ') : 'All'}\n`;
          comment += `#   Search Term: ${search || 'None'}\n`;
          comment += `# \n`;
          return comment;
        };

        // Generate CSV content
        const headers = Object.keys(exportData[0] || {});
        const csvHeaders = headers.join(",") + "\n";
        
        const csvRows = exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            return typeof value === 'string' && value.includes(',') 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(",")
        ).join("\n");
        
        // Create and download file
        const blob = new Blob([generateHeaderComment() + csvHeaders + csvRows], { 
          type: "text/csv;charset=utf-8;" 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = generateFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccess(`Successfully exported ${exportData.length} records.`, "Export Complete");
      }
    } catch (error) {
      console.error("Export error:", error);
      showError("Failed to export data. Please try again.", "Export Error");
    }
  };

  // Get conditional action buttons based on status
  const getActionButtons = (request: PurchaseRequestApproval) => {
    const baseActions = [
      <button
        key="view"
        className="viewBtn"
        onClick={() => handleView(request)}
        title="View Details"
      >
        <i className="ri-eye-line"></i>
      </button>
    ];

    switch (request.status) {
      case ApprovalStatus.PENDING_APPROVAL:
        return [
          ...baseActions,
          <button
            key="approve"
            className="editBtn"
            onClick={() => handleApprove(request)}
            title="Approve"
          >
            <i className="ri-check-line"></i>
          </button>,
          <button
            key="reject"
            className="deleteBtn"
            onClick={() => handleReject(request)}
            title="Reject"
          >
            <i className="ri-close-line"></i>
          </button>
        ];

      case ApprovalStatus.APPROVED:
        return [
          ...baseActions,
          <button
            key="rollback"
            className="editBtn"
            onClick={() => handleRollback(request)}
            title="Rollback to Pending"
          >
            <i className="ri-arrow-go-back-line"></i>
          </button>,
          <button
            key="cancel"
            className="deleteBtn"
            onClick={() => handleCancel(request)}
            title="Cancel"
          >
            <i className="ri-forbid-line"></i>
          </button>
        ];

      case ApprovalStatus.REJECTED:
        return [
          ...baseActions,
          <button
            key="rollback"
            className="editBtn"
            onClick={() => handleRollback(request)}
            title="Rollback to Pending"
          >
            <i className="ri-arrow-go-back-line"></i>
          </button>
        ];

      case ApprovalStatus.COMPLETED:
        return [
          ...baseActions,
          <button
            key="audit"
            className="editBtn"
            onClick={() => handleAuditTrail(request)}
            title="Audit Trail"
          >
            <i className="ri-file-list-3-line"></i>
          </button>
        ];

      case ApprovalStatus.PARTIALLY_COMPLETED:
        return [
          ...baseActions,
          <button
            key="refund"
            className="editBtn"
            onClick={() => handleProcessRefund(request)}
            title="Process Refund"
          >
            <i className="ri-refund-line"></i>
          </button>,
          <button
            key="track"
            className="viewBtn"
            onClick={() => handleTrackStatus(request)}
            title="Track Status"
          >
            <i className="ri-map-pin-line"></i>
          </button>
        ];

      default:
        return baseActions;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Purchase Request Approval</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Purchase Request Approval</h1>
        </div>
        
        <div className="settings">
          <div className="expense_searchBar">
            <i className="ri-search-line" />
            <input
              className="searchInput"
              type="text"
              placeholder="Search requests, requester, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <FilterDropdown
            sections={filterSections}
            onApply={handleApplyFilters}
          />
          
          <div className="filters">
            <button onClick={handleExport} id="export">
              <i className="ri-receipt-line" /> Export CSV
            </button>
          </div>
        </div>

        {/* Table - Following expense page structure */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Requester</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(request => (
                  <tr key={request.id}>
                    <td>{request.title}</td>
                    <td>{formatDepartment(request.department)}</td>
                    <td>{request.requester_name}</td>
                    <td>{request.supplier_name}</td>
                    <td>₱{request.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{new Date(request.request_date).toLocaleDateString()}</td>
                    <td className="table-status">
                      <span className={`chip ${request.status}`}>
                        {formatStatus(request.status)}
                      </span>
                    </td>
                    <td className="table-status">
                      <span className={`chip ${request.priority}`}>
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </span>
                    </td>
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        {getActionButtons(request)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && (
              <p className="noRecords">No purchase requests found matching your criteria.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />

        {/* Modal */}
        {isModalOpen && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              {modalContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}