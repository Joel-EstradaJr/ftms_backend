// app\PageContent\revenuePage.tsx
"use client";

import React, { useState, useEffect } from "react";
import "../../styles/revenue/revenue.css";
import "../../styles/components/table.css";
import PaginationComponent from "../../Components/pagination";
import AddRevenue from "./addRevenue"; 
import Swal from 'sweetalert2';
import EditRevenueModal from "./editRevenue";
import ViewRevenueModal from "./viewRevenue";
import AddPaymentModal from "./AddPaymentModal";
// Assignments are loaded via client-side cache now
import { formatDate } from '../../utility/dateFormatter';
import Loading from '../../Components/loading';
import { showSuccess, showError } from '../../utility/Alerts';
import { formatDateTime } from "../../utility/dateFormatter";
import { formatDisplayText } from '@/app/utils/formatting';
import type { Assignment } from '@/lib/operations/assignments';
import FilterDropdown, { FilterSection } from "../../Components/filter"
import { getRevenueGlobalsCached, getAssignmentsCached } from '@/lib/clientStore';

interface GlobalCategory {
  category_id: string;
  name: string;
  applicable_modules: string[];
  is_deleted?: boolean;
}

interface RevenueRecord {
  revenue_id: string;
  assignment_id?: string;
  bus_trip_id?: string | null;
  category_id: string;
  source_id?: string;
  category: {
    category_id: string;
    name: string;
    applicable_modules: string[];
  };
  source?: {
    source_id: string;
    name: string;
    applicable_modules: string[];
  };
  total_amount: number;
  collection_date: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
  is_receivable?: boolean;
  outstanding_balance?: number;
  due_date?: string | null;
}

interface RevenueData {
  revenue_id: string;
  category: {
    category_id: string;
    name: string;
    applicable_modules: string[];
  };
  source?: {
    source_id: string;
    name: string;
    applicable_modules: string[];
  };
  total_amount: number;
  collection_date: string;
  created_by: string;
  created_at: string;
  assignment_id?: string;
  bus_trip_id?: string | null;
  is_receivable?: boolean;
  outstanding_balance?: number;
  due_date?: string | null;
  attachment_count?: number;
}

// Small indicator types for cache health endpoint
interface CacheHealthResponse {
  busTripCache: { count: number; last_synced_at: string | null };
  employeeCache: { count: number; last_synced_at: string | null };
  payrollCache: { count: number; last_synced_at: string | null };
  now: string;
}

// Compact cache health indicator component
const CacheHealthIndicator: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [health, setHealth] = useState<CacheHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setError(null);
      const res = await fetch('/api/cache/health', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j: CacheHealthResponse = await res.json();
      setHealth(j);
    } catch (e: any) {
      setError(e?.message || 'failed');
    } finally {
      setLoading(false);
    }
  };

  // Initial + external refresh trigger
  useEffect(() => {
    fetchHealth();
     
  }, [refreshKey]);

  // Background refresh every 60s
  useEffect(() => {
    const id = setInterval(fetchHealth, 60 * 1000);
    return () => clearInterval(id);
     
  }, []);

  const formatSync = (iso: string | null) => {
    if (!iso) return 'never';
    try {
      const d = new Date(iso);
      // Show local date and time, short style
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return String(iso);
    }
  };

  return (
    <div
      title={
        health
          ? `BusTrips: ${health.busTripCache.count}, Employees: ${health.employeeCache.count}, Payroll: ${health.payrollCache.count} | Last Sync: ${formatSync(health.busTripCache.last_synced_at || health.employeeCache.last_synced_at || health.payrollCache.last_synced_at)}`
          : 'Cache health'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        border: '1px solid #e0e0e0',
        borderRadius: 6,
        fontSize: 12,
        color: '#333',
        background: '#fafafa',
        marginLeft: 8,
        whiteSpace: 'nowrap',
      }}
      aria-live="polite"
    >
      <i className="ri-database-2-line" aria-hidden="true" />
      {loading ? (
        <span>Cache: loading…</span>
      ) : error ? (
        <span>Cache: unavailable</span>
      ) : health ? (
        <span>
          Cache: Trips {health.busTripCache.count} | Emp {health.employeeCache.count} | Payroll {health.payrollCache.count} • Synced {formatSync(
            health.busTripCache.last_synced_at || health.employeeCache.last_synced_at || health.payrollCache.last_synced_at
          )}
        </span>
      ) : (
        <span>Cache: n/a</span>
      )}
    </div>
  );
};

const RevenuePage = () => {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<RevenueData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [recordToView, setRecordToView] = useState<RevenueData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInstallments, setPaymentInstallments] = useState<Array<{ id: string; installment_number: number; amount_due: number; amount_paid: number; }>>([]);
  const [availableCategories, setAvailableCategories] = useState<GlobalCategory[]>([]);
  const [showOnlyAR, setShowOnlyAR] = useState(false);
  const [showOnlyWithBalance, setShowOnlyWithBalance] = useState(false);
  // Key to trigger CacheHealthIndicator refetch
  const [healthRefreshKey, setHealthRefreshKey] = useState(0);


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
        id: cat.name,
        label: cat.name
      }))
    },
    {
      id: 'receivables',
      title: 'Receivables',
      type: 'checkbox',
      options: [
        { id: 'is_receivable', label: 'AR Only' },
        { id: 'with_balance', label: 'Outstanding Balance > 0' },
      ]
    },
  ]

  // Handle filter application
  const handleFilterApply = (filterValues: Record<string, string | string[] | {from: string; to: string}>) => {
    const dateRange = filterValues['dateRange'] as any;
    if (dateRange?.from !== undefined) setDateFrom(dateRange.from || '');
    if (dateRange?.to !== undefined) setDateTo(dateRange.to || '');
    const selectedCats = (filterValues['category'] as string[]) || [];
    setCategoryFilter(selectedCats.join(','));
    const receivableChecks = (filterValues['receivables'] as string[]) || [];
    setShowOnlyAR(receivableChecks.includes('is_receivable'));
    setShowOnlyWithBalance(receivableChecks.includes('with_balance'));
    setCurrentPage(1);
  }

  

  const fetchCategories = async () => {
    try {
      const g = await getRevenueGlobalsCached();
      const categoriesData = g.categories || [];
      const revenueCategories = categoriesData.filter((cat: GlobalCategory) => 
        cat.applicable_modules.includes('revenue') && !cat.is_deleted
      );
      setAvailableCategories(revenueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showError('Failed to load categories', 'Error');
    }
  };

  // Fetch assignments with periodic refresh and error handling
  const fetchAssignments = async () => {
    try {
      // Fetch all assignments once and derive unrecorded locally
      const allAssignmentsData = await getAssignmentsCached();
      setAllAssignments(allAssignmentsData);
      const unrecorded = allAssignmentsData.filter((a: Assignment) => !a.is_revenue_recorded);
      setAssignments(unrecorded);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error fetching assignments:', errorMessage);
      // Don't show error toast here as it might be too frequent with auto-refresh
    }
  };

  // Set maxDate to today on mount
  useEffect(() => {
    const today = new Date();
    setMaxDate(today.toISOString().split('T')[0]);
  }, []);

  // Centralized periodic refresh is configured in the fetchAllData effect below

  // Single useEffect for initial data fetching
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      console.log('[FETCH] Starting fetchAllData');
      try {
        // Fetch categories for the filter dropdown
        await fetchCategories();

        // Fetch all assignments using the new Operations service
  const assignmentsData = await getAssignmentsCached();
        console.log('[FETCH] Assignments loaded from Operations API');

        // Filter out recorded assignments for the AddRevenue modal
        const unrecordedAssignments = assignmentsData.filter((a: Assignment) => !a.is_revenue_recorded);
        setAssignments(unrecordedAssignments);

        // Store all assignments for table display
        setAllAssignments(assignmentsData);

        // Then fetch revenues
        const revenuesResponse = await fetch('/api/revenues');
        console.log('[FETCH] /api/revenues status:', revenuesResponse.status);
        if (!revenuesResponse.ok) throw new Error('Failed to fetch revenues');

  const revenues: RevenueRecord[] = await revenuesResponse.json();

        const transformedData: RevenueData[] = revenues.map(revenue => ({
          revenue_id: revenue.revenue_id,
          category: revenue.category,
          source: revenue.source,
          total_amount: Number(revenue.total_amount),
          collection_date: revenue.collection_date, // Keep full ISO datetime string
          created_by: revenue.created_by,
          created_at: revenue.created_at,
          assignment_id: revenue.assignment_id,
          bus_trip_id: revenue.bus_trip_id,
          is_receivable: (revenue as any).is_receivable,
          outstanding_balance: Number((revenue as any).outstanding_balance || 0),
          due_date: (revenue as any).due_date || null,
          attachment_count: Number((revenue as any).attachment_count || 0),
        }));

        setData(transformedData);
        console.log('[FETCH] Data loaded successfully');
      } catch (error) {
        console.error('Error fetching data:', error);
        showError('Failed to load data', 'Error');
      } finally {
        setLoading(false);
        console.log('[FETCH] setLoading(false) called');
      }
    };
    
    fetchAllData();

    // Set up periodic refresh of assignments (align with cache refresh cadence)
    const refreshInterval = setInterval(async () => {
      try {
        await fetchAssignments();
      } catch (error) {
        console.error('Background refresh failed:', error);
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(refreshInterval);
  }, []); // Empty dependency array as we only want this to run once on mount

  // Filter and pagination logic
  const filteredData = data.filter((item: RevenueData) => {
    // Convert search to lowercase for case-insensitive comparison
    const searchLower = search.toLowerCase();

    // Lookup the related assignment
    let assignment: Assignment | undefined = undefined;
    if (item.assignment_id) {
      const busTripId = item.bus_trip_id === null ? undefined : item.bus_trip_id;
      assignment = allAssignments.find(a => (a.assignment_id ?? undefined) === (item.assignment_id ?? undefined) && ((a.bus_trip_id === null ? undefined : a.bus_trip_id) === busTripId)) ??
                   allAssignments.find(a => (a.assignment_id ?? undefined) === (item.assignment_id ?? undefined));
    }

    // Check if search term exists in any field
    const matchesSearch = search === '' || 
    // Basic revenue fields
    formatDate(item.collection_date).toLowerCase().includes(searchLower) ||
    (item.category?.name?.toLowerCase() || '').includes(searchLower) ||
    (item.source?.name?.toLowerCase() || '').includes(searchLower) ||
    item.total_amount.toString().includes(searchLower) ||
    (item.created_by?.toLowerCase() || '').includes(searchLower) ||

    // Assignment related fields (if available) - using new Operations API fields
    (assignment?.bus_type?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.bus_plate_number?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.bus_route?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.driver_name?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.conductor_name?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.date_assigned && formatDate(assignment.date_assigned).toLowerCase().includes(searchLower));

    const matchesCategory = categoryFilter ? 
      categoryFilter.split(',').some(cat => item.category.name === cat.trim()) : true;

    const itemDate = new Date(item.collection_date).toISOString().split('T')[0]; // Extract date part for comparison
    const matchesDate = (!dateFrom || itemDate >= dateFrom) && 
      (!dateTo || itemDate <= dateTo);
    const matchesReceivable = !showOnlyAR || !!item.is_receivable;
    const matchesBalance = !showOnlyWithBalance || (Number(item.outstanding_balance || 0) > 0);
    return matchesSearch && matchesCategory && matchesDate && matchesReceivable && matchesBalance;
  });

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Manual cache refresh (placeholder auth)
  const manualCacheRefresh = async () => {
    try {
      const res = await fetch('/api/cache/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: replace with real JWT or server action
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CACHE_REFRESH_TOKEN || ''}`,
        },
      });
      if (!res.ok) throw new Error(`Refresh failed (${res.status})`);
      showSuccess('Cache refresh started/completed.', 'Cache');
      // Optionally refetch assignments/categories quickly to reflect new data
      await Promise.all([fetchAssignments(), fetchCategories()]);
      // Nudge the health widget to refresh immediately
      setHealthRefreshKey((k) => k + 1);
    } catch (e: any) {
      console.error('Manual refresh error:', e);
      showError(e?.message || 'Failed to refresh cache', 'Cache Error');
    }
  };

  const handleAddRevenue = async (newRevenue: {
    category_id: string;
    assignment_id?: string;
    bus_trip_id?: string;
    total_amount: number;
    collection_date: string;
    created_by: string;
    source_ref?: string;
    payment_status_id: string;
    payment_method_id?: string;
    remarks: string;
    is_receivable?: boolean;
    payer_name?: string;
    due_date?: string;
    interest_rate?: number;
    installments?: { installment_number: number; due_date: string; amount_due: number }[];
    attachments?: File[];
  }) => {
    try {
      // Get the assignment to extract bus_trip_id
      const selectedAssignment = allAssignments.find(a => a.assignment_id === newRevenue.assignment_id);
      
      // Check for duplicates using bus_trip_id
      if (newRevenue.assignment_id && selectedAssignment?.bus_trip_id) {
        const duplicate = data.find(item => item.bus_trip_id === selectedAssignment.bus_trip_id);
        if (duplicate) {
          showError('Revenue record for this trip already exists.', 'Error');
          return;
        }
      }
      
      const response = await fetch('/api/revenues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: newRevenue.category_id,
          total_amount: Number(newRevenue.total_amount),
          collection_date: newRevenue.collection_date, // ISO string
          created_by: newRevenue.created_by,
          assignment_id: newRevenue.assignment_id || null,
          source_ref: newRevenue.source_ref || undefined,
          payment_status_id: newRevenue.payment_status_id,
          payment_method_id: newRevenue.payment_method_id || undefined,
          remarks: newRevenue.remarks,
          // include bus_trip_id when available so backend uses BusTrip flow
          bus_trip_id: newRevenue.bus_trip_id || selectedAssignment?.bus_trip_id || undefined,
          // AR support
          ...(newRevenue.is_receivable ? {
            is_receivable: true,
            payer_name: newRevenue.payer_name,
            due_date: newRevenue.due_date,
            interest_rate: newRevenue.interest_rate,
            installments: newRevenue.installments
          } : {}),
        })
      });
      
      if (!response.ok) throw new Error('Create failed');
      const result: RevenueRecord = await response.json();

      let attachmentCountForNew = 0;

      // If attachments were selected, upload them (optional) using new API
      if (newRevenue.attachments && newRevenue.attachments.length > 0) {
        const form = new FormData();
        newRevenue.attachments.forEach(f => form.append('files', f));
        const upRes = await fetch(`/api/revenues/${encodeURIComponent(result.revenue_id)}/attachments`, { method: 'POST', body: form });
        if (!upRes.ok) {
          console.warn('Attachment upload failed');
        } else {
          const upJson = await upRes.json().catch(() => null);
          const created = upJson?.attachments || [];
          attachmentCountForNew = Array.isArray(created) ? created.length : 0;
        }
      }
      
      // Refresh assignments data to get updated flags from Operations API BEFORE updating state
      await fetchAssignments();
      
      // Update revenues state (ensure bus_trip_id is included)
      setData(prev => [{
        revenue_id: result.revenue_id,
        category: result.category,
        source: result.source,
        total_amount: Number(result.total_amount),
        collection_date: result.collection_date, // Keep as ISO string
        created_by: result.created_by,
        created_at: result.created_at,
        assignment_id: result.assignment_id,
        bus_trip_id: result.bus_trip_id,
        is_receivable: (result as any).is_receivable ?? undefined,
        outstanding_balance: Number((result as any).outstanding_balance ?? 0),
        due_date: (result as any).due_date ?? null,
        attachment_count: attachmentCountForNew,
      }, ...prev]);
      
      showSuccess('Revenue added successfully', 'Success');
      setShowModal(false);
    } catch (error) {
      console.error('Create error:', error);
      showError('Failed to add revenue: ' + (error instanceof Error ? error.message : 'Unknown error'), 'Error');
    }
  };

  const handleDelete = async (revenue_id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the record permanently.',
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
        const response = await fetch(`/api/revenues/${revenue_id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        setData(prev => prev.filter(item => item.revenue_id !== revenue_id));
        showSuccess('Record deleted successfully', 'Deleted');
      } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete record', 'Error');
      }
    }
  };

  const handleSaveEdit = async (updatedRecord: {
    revenue_id: string;
    collection_date: string;
    total_amount: number;
    category_id?: string;
    source?: string;
    payment_status_id?: string;
    payment_method_id?: string;
    remarks?: string;
    is_receivable?: boolean;
    payer_name?: string;
    due_date?: string;
    interest_rate?: number;
  }) => {
    try {
      const response = await fetch(`/api/revenues/${updatedRecord.revenue_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord)
      });

      if (!response.ok) throw new Error('Update failed');

      const result = await response.json();
      
      // Update local state by moving the edited record to the top
      setData(prev => {
        // Remove the old version of the record
        const filtered = prev.filter(rec => rec.revenue_id !== updatedRecord.revenue_id);
        const updated: RevenueData = {
          revenue_id: result.revenue_id,
          category: result.category,
          source: result.source,
          total_amount: Number(result.total_amount),
          collection_date: result.collection_date,
          created_by: result.created_by,
          created_at: result.created_at,
          assignment_id: result.assignment_id,
          bus_trip_id: result.bus_trip_id,
          is_receivable: (result as any).is_receivable ?? undefined,
          outstanding_balance: Number((result as any).outstanding_balance ?? 0),
          due_date: (result as any).due_date ?? null,
        };
        // Add the updated record at the beginning of the array
        return [updated, ...filtered];
      });

      setEditModalOpen(false);
      setRecordToEdit(null);
      showSuccess('Record updated successfully', 'Success');
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update record', 'Error');
    }
  };

  // Generate the file name helper function
  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'revenue_records';
    
    if (categoryFilter) {
      fileName += `_${categoryFilter.toLowerCase().replace('_', '-')}`;
    }
    
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom).toISOString().split('T')[0] : 'all';
      const to = dateTo ? new Date(dateTo).toISOString().split('T')[0] : 'present';
      fileName += `_${from}_to_${to}`;
    }
    
    fileName += `_${dateStamp}_${timeStamp}`;
    
    return `${fileName}.csv`;
  };

  const getExportColumns = () => {
    const baseColumns = [
      "Collection Date",
      "Category",
      "Amount"
    ];

    if (!categoryFilter) {
      return [
        ...baseColumns,
        "Bus Type",
        "Plate Number",
        "Route",
        "Driver ID",
        "Conductor ID",
        "Assignment Date"
      ];
    }

    return [
      ...baseColumns,
      "Bus Type",
      "Plate Number",
      "Route",
      "Driver ID",
      "Conductor ID",
      "Assignment Date"
    ];
  };

  // Generate export details helper function
  const generateExportDetails = () => {
    let details = `Export Details:\n`;
    details += `Category: ${categoryFilter || 'All Categories'}\n`;
    
    if (dateFrom || dateTo) {
      const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
      const to = dateTo ? formatDate(dateTo) : 'Present';
      details += `Date Range: ${from} to ${to}\n`;
    } else {
      details += `Date Range: All Dates\n`;
    }
    
    details += `Total Records: ${filteredData.length}\n`;
    details += `Export Time: ${new Date().toISOString()}\n`;
    details += `Exported Columns: ${getExportColumns().join(', ')}`;
    
    return details;
  };

  // Add a new function to handle audit logging
  const logExportAudit = async () => {
    try {
      // First get the export ID from the API
      const idResponse = await fetch('/api/generate-export-id');
      if (!idResponse.ok) {
        throw new Error('Failed to generate export ID');
      }
      const { exportId } = await idResponse.json();

      // Generate details without export ID
      const details = generateExportDetails();

      const response = await fetch('/api/auditlogs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'EXPORT',
          table_affected: 'RevenueRecord',
          record_id: exportId,  // Export ID only appears here
          performed_by: 'ftms_user', // Replace with actual user ID
          details: details
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create audit log');
      }
  
      return exportId;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw error;
    }
  };

  // Modify the handleExport function
  const handleExport = () => {
    // Generate confirmation message helper function
    const generateConfirmationMessage = () => {
      let message = `<strong>Revenue Records Export</strong><br/><br/>`;
      
      if (categoryFilter) {
        message += `<strong>Category:</strong> ${categoryFilter}<br/>`;
      } else {
        message += `<strong>Category:</strong> All Categories<br/>`;
      }
      
      if (dateFrom || dateTo) {
        const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
        const to = dateTo ? formatDate(dateTo) : 'Present';
        message += `<strong>Date Range:</strong> ${from} to ${to}<br/>`;
      } else {
        message += `<strong>Date Range:</strong> All Dates<br/>`;
      }
      
      message += `<strong>Total Records:</strong> ${filteredData.length}`;
      return message;
    };
  
    // Show confirmation dialog
    Swal.fire({
      title: 'Confirm Export',
      html: generateConfirmationMessage(),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Export CSV',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'export-confirmation-dialog'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (filteredData.length === 0) {
          Swal.fire({
            title: 'No Records Found',
            text: 'There are no records to export based on current filters. Do you want to proceed anyway?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Export Empty File',
            cancelButtonText: 'Cancel',
          }).then(async (emptyResult) => {
            if (emptyResult.isConfirmed) {
              try {
                // First log the audit, which will generate the export ID
                const exportId = await logExportAudit();
                // Then perform the export
                await performExport(filteredData, exportId);
              } catch (error) {
                console.error('Export failed:', error);
                showError('Failed to complete export', 'Error');
              }
            }
          });
          return;
        }
        try {
          // First log the audit, which will generate the export ID
          const exportId = await logExportAudit();
          // Then perform the export
          await performExport(filteredData, exportId);
        } catch (error) {
          console.error('Export failed:', error);
          showError('Failed to complete export', 'Error');
        }
      }
    });
  };

  const performExport = (recordsToExport: RevenueData[], exportId: string) => {
    // Generate header comment with consistent collection_date formatting
    const generateHeaderComment = () => {
      let comment = '"# Revenue Records Export","","","","","","","","","",""\n';
      comment += `"# Export ID:","${exportId}","","","","","","","","",""\n`; // Keep in CSV if needed
      comment += `"# Generated:","${formatDate(new Date())}","","","","","","","","",""\n`;
      
      if (categoryFilter) {
        comment += `"# Category:","${categoryFilter}","","","","","","","","",""\n`;
      } else {
        comment += '"# Category:","All Categories","","","","","","","","",""\n';
      }
      
      if (dateFrom || dateTo) {
        const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
        const to = dateTo ? formatDate(dateTo) : 'Present';
        comment += `"# Date Range:","${from} to ${to}","","","","","","","","",""\n`;
      } else {
        comment += '"# Date Range:","All Dates","","","","","","","","",""\n';
      }
      
      comment += `"# Total Records:","${recordsToExport.length}","","","","","","","","",""\n\n`;
      return comment;
    };

        const columns = getExportColumns();
        const headers = columns.join(",") + "\n";
      
        const rows = recordsToExport.map(item => {
          const assignment = item.assignment_id 
            ? allAssignments.find(a => a.assignment_id === item.assignment_id)
            : null;
            
          const escapeField = (field: string | undefined) => {
            if (!field) return '';
            if (field.includes(',') || field.includes('"') || field.includes('\n')) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          };

          const rowData: string[] = [];

          columns.forEach(col => {
            switch(col) {
              case "Collection Date":
                rowData.push(escapeField(formatDate(item.collection_date)));
                break;
              case "Category":
                rowData.push(escapeField(item.category?.name || 'N/A'));
                break;
              case "Amount":
                rowData.push(item.total_amount.toFixed(2));
                break;
              case "Bus Type":
                rowData.push(escapeField(assignment?.bus_type || 'N/A'));
                break;
              case "Plate Number":
                rowData.push(escapeField(assignment?.bus_plate_number || 'N/A'));
                break;
              case "Route":
                rowData.push(escapeField(assignment?.bus_route || 'N/A'));
                break;
              case "Driver ID":
                rowData.push(escapeField(assignment?.driver_name || 'N/A'));
                break;
              case "Conductor ID":
                rowData.push(escapeField(assignment?.conductor_name || 'N/A'));
                break;
              case "Assignment Date":
                rowData.push(escapeField(assignment?.date_assigned ? formatDate(assignment.date_assigned) : 'N/A'));
                break;
              default:
                rowData.push('');
            }
          });
          return rowData.join(',');
        }).join("\n");
      
        const blob = new Blob([generateHeaderComment() + headers + rows], { 
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
      };

  if (loading) {
        return (
            <div className="card">
                <h1 className="title">Revenue Records</h1>
                <Loading />
            </div>
        );
    }

  return (
    <div className="card">
      <div className="elements">
        <div className="title"> 
          <h1>Revenue Records</h1> 
        </div>
        <div className="settings">
          {/* search bar */}
          <div className="revenue_searchBar">
            <i className="ri-search-line" />
            <input
              className="searchInput"
              type="text"
              placeholder="Search here..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            /> 
          </div>

          <FilterDropdown
            sections={filterSections}
            onApply={handleFilterApply}
            initialValues={{
              dateRange: { from: dateFrom, to: dateTo },
              category: categoryFilter ? categoryFilter.split(',') : [],
              receivables: [
                ...(showOnlyAR ? ['is_receivable'] : []),
                ...(showOnlyWithBalance ? ['with_balance'] : []),
              ]
            }}
          />

          <div className="filters">
            {/* Export CSV */}
            <button id="export" onClick={handleExport}><i className="ri-receipt-line" /> Export CSV</button>
            {/* Add Revenue */}
            <button onClick={() => setShowModal(true)} id='addRevenue'><i className="ri-add-line" /> Add Revenue</button>
            {/* Manual Cache Refresh (placeholder auth until JWT) */}
            <button onClick={manualCacheRefresh} id='refreshCache' style={{ marginLeft: 8 }}>
              <i className="ri-refresh-line" /> Refresh Cache
            </button>
            {/* Cache Health Indicator */}
            <CacheHealthIndicator refreshKey={healthRefreshKey} />
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Collection Date</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Remitted Amount</th>
                  <th>Flags</th>
                  <th>Files</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(item => {
                // Fix: Improved assignment matching using both assignment_id and bus_trip_id
                let assignment: Assignment | undefined = undefined;
                if (item.assignment_id) {
                  // First try to match using both assignment_id and bus_trip_id for precision
                  if (item.bus_trip_id) {
                    assignment = allAssignments.find(a => 
                      a.assignment_id === item.assignment_id && 
                      a.bus_trip_id === item.bus_trip_id
                    );
                  }
                  
                  // Fallback to assignment_id only if bus_trip_id match fails
                  if (!assignment) {
                    assignment = allAssignments.find(a => a.assignment_id === item.assignment_id);
                  }
                }

                // Format assignment for display
                const formatAssignmentForTable = (assignment: Assignment | undefined): string => {
                  if (!assignment) {
                    return item.assignment_id ? `Assignment ${item.assignment_id} not found` : 'N/A';
                  }
                  
                  // Use exact field names from Operations API
                  const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
                  const driverName = assignment.driver_name || 'N/A';
                  const conductorName = assignment.conductor_name || 'N/A';
                  
                  // Calculate display amount based on category and assignment type
                  let displayAmount = assignment.trip_revenue;
                  if (item.category?.name === 'Percentage' && assignment.assignment_value) {
                    displayAmount = assignment.trip_revenue * (assignment.assignment_value);
                  }
                  
                  return `${formatDate(assignment.date_assigned)} | ₱ ${displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${assignment.bus_plate_number || 'N/A'} (${busType}) - ${assignment.bus_route || 'N/A'} | ${driverName} & ${conductorName}`;
                };

                return (
                  <tr key={item.revenue_id}>
                    <td>{formatDateTime(item.collection_date)}</td>
                    <td>{item.category?.name || 'N/A'}</td>
                    <td>{formatAssignmentForTable(assignment)}</td>
                    <td>₱{item.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      <div className="flagsCell">
                        {item.is_receivable ? <span className="flag badge-ar">AR</span> : null}
                        {item.is_receivable && (item.outstanding_balance || 0) > 0 && item.due_date && new Date(item.due_date) < new Date() ? (
                          <span className="flag badge-overdue">Overdue</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {Number((item as any).attachment_count || 0) > 0 ? (
                        <span title={`${(item as any).attachment_count} attachment(s)`} aria-label="Has attachments">
                          <i className="ri-attachment-2" /> {(item as any).attachment_count}
                        </span>
                      ) : null}
                    </td>
                    <td className="styles.actionButtons">
                      <div className="actionButtonsContainer">
                        {/* add payment button */}
                        <button 
                          className="viewBtn" 
                          disabled={!item.is_receivable || Number(item.outstanding_balance || 0) <= 0}
                          onClick={async () => {
                            setRecordToEdit(item);
                            try {
                              const res = await fetch(`/api/revenues/${item.revenue_id}`);
                              if (res.ok) {
                                const rev = await res.json();
                                const inst = Array.isArray(rev.installments) ? rev.installments.map((i: any) => ({
                                  id: i.id,
                                  installment_number: Number(i.installment_number),
                                  amount_due: Number(i.amount_due || 0),
                                  amount_paid: Number(i.amount_paid || 0),
                                })) : [];
                                setPaymentInstallments(inst);
                              } else {
                                setPaymentInstallments([]);
                              }
                            } catch {
                              setPaymentInstallments([]);
                            }
                            setShowPaymentModal(true);
                          }} 
                          title={!item.is_receivable ? "Not receivable" : (Number(item.outstanding_balance || 0) <= 0 ? "No outstanding balance" : "Add Payments")}
                        >
                          <i className="ri-bank-card-line" />
                        </button>
                        {/* view button */}
                        <button 
                          className="viewBtn" 
                          onClick={() => {
                            setRecordToView(item);
                            setViewModalOpen(true);
                          }} 
                          title="View Record"
                        >
                          <i className="ri-eye-line" />
                        </button>
                        
                        {/* edit button */}
                        <button 
                          className="editBtn" 
                          onClick={() => {
                            setRecordToEdit(item);
                            setEditModalOpen(true);
                          }} 
                          title="Edit Record"
                        >
                          <i className="ri-edit-2-line" />
                        </button>
                        
                        {/* delete button */}
                        <button 
                          className="deleteBtn" 
                          onClick={() => handleDelete(item.revenue_id)} 
                          title="Delete Record"
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && <p className="noRecords">No records found.</p>}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        {showModal && (
          <AddRevenue
            onClose={() => setShowModal(false)}
            onAddRevenue={handleAddRevenue}
            assignments={assignments.filter(a => {
              // Filter out assignments that already have revenue records with the same bus_trip_id
              const isAlreadyRecorded = data.some(r => r.bus_trip_id && r.bus_trip_id === a.bus_trip_id);
              return !isAlreadyRecorded;
            })}
            currentUser={"ftms_user"}
            existingRevenues={data
              .filter(r => r?.category && typeof r.category.category_id === 'string')
              .map(r => ({
                assignment_id: r.assignment_id,
                bus_trip_id: r.bus_trip_id ? r.bus_trip_id : undefined,
                category_id: r.category.category_id,
                total_amount: r.total_amount,
                collection_date: r.collection_date
              }))}
          />
        )}

        {editModalOpen && recordToEdit && (
          <EditRevenueModal
            record={{
              revenue_id: typeof recordToEdit.revenue_id === 'string' ? recordToEdit.revenue_id : '',
              collection_date: typeof recordToEdit.collection_date === 'string' ? recordToEdit.collection_date : '',
              category_id: typeof recordToEdit.category?.category_id === 'string' ? recordToEdit.category.category_id : '',
              category: typeof recordToEdit.category?.name === 'string' ? recordToEdit.category.name : '',
              source: typeof recordToEdit.source?.name === 'string' ? recordToEdit.source.name : '',
              amount: typeof recordToEdit.total_amount === 'number' ? recordToEdit.total_amount : 0,
              assignment_id: typeof recordToEdit.assignment_id === 'string' ? recordToEdit.assignment_id : undefined,
            }}
            onClose={() => {
              setEditModalOpen(false);
              setRecordToEdit(null);
            }}
            onSave={handleSaveEdit}
            onAttachmentsChanged={(delta) => {
              if (!recordToEdit) return;
              setData(prev => prev.map(r => r.revenue_id === recordToEdit.revenue_id ? {
                ...r,
                attachment_count: Math.max(0, Number((r as any).attachment_count || 0) + (delta || 0)),
              } : r));
            }}
          />
        )}

        {showPaymentModal && recordToEdit && (
          <AddPaymentModal
            revenue_id={recordToEdit.revenue_id}
            outstanding_balance={Number(recordToEdit.outstanding_balance || 0)}
            installments={paymentInstallments}
            onClose={() => { setShowPaymentModal(false); setRecordToEdit(null); setPaymentInstallments([]); }}
            onSubmitted={async () => {
              // refresh the row via GET /api/revenues/{id}
              try {
                const res = await fetch(`/api/revenues/${recordToEdit.revenue_id}`);
                if (res.ok) {
                  const rev = await res.json();
                  setData(prev => prev.map(r => r.revenue_id === recordToEdit.revenue_id ? {
                    ...r,
                    outstanding_balance: Number(rev.outstanding_balance || 0),
                    is_receivable: rev.is_receivable,
                  } : r));
                }
              } catch {}
            }}
          />
        )}

        {viewModalOpen && recordToView && (
          <ViewRevenueModal
            record={{
              revenue_id: recordToView.revenue_id,
              category: recordToView.category,
              total_amount: recordToView.total_amount,
              collection_date: recordToView.collection_date,
              created_at: recordToView.created_at,
              assignment: recordToView.assignment_id && (((recordToView as { bus_trip_id?: string | null }).bus_trip_id ?? undefined) !== undefined)
                ? allAssignments.find(a => (a.assignment_id ?? undefined) === (recordToView.assignment_id ?? undefined) && (a.bus_trip_id === null ? undefined : a.bus_trip_id) === (recordToView.bus_trip_id === null ? undefined : recordToView.bus_trip_id))
                : recordToView.assignment_id
                  ? allAssignments.find(a => (a.assignment_id ?? undefined) === (recordToView.assignment_id ?? undefined))
                  : undefined,
            }}
            onClose={() => {
              setViewModalOpen(false);
              setRecordToView(null);
            }}
          />
        )}

      </div>
    </div>
  );
};

export default RevenuePage;
