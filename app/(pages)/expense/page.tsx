"use client";

import React, { useState, useEffect } from "react";
import "../../styles/expense/expense.css";
import "../../styles/components/table.css";
import PaginationComponent from "../../Components/pagination";
import AddExpense from "./addExpense"; 
import Swal from 'sweetalert2';
import EditExpenseModal from "./editExpense";
import ViewExpenseModal from "./viewExpense";
import { getAllAssignmentsWithRecorded } from '@/lib/operations/assignments';
import { formatDateTime, formatDate } from '../../utility/dateFormatter';
import Loading from '../../Components/loading';
import { showSuccess, showError, showConfirmation } from '../../utility/Alerts';
import { formatDisplayText } from '@/app/utils/formatting';
import FilterDropdown, { FilterSection } from "../../Components/filter";
import type { Assignment } from '@/lib/operations/assignments';



// Add interface for new expense creation
interface GlobalCategory {
  category_id: string;
  name: string;
  applicable_modules: string[];
  is_deleted: boolean;
}

interface NewExpense {
  category?: string;
  category_id?: string;
  assignment_id?: string;
  bus_trip_id?: string;
  source_id?: string;
  payment_method_id?: string;
  total_amount: number;
  expense_date: string;
  created_by: string;
  employee_id?: string;
  driver_reimbursement?: number;
  conductor_reimbursement?: number;
}

// Define interface based on your Prisma ExpenseRecord schema
interface ExpenseRecord {
  expense_id: string;
  assignment_id?: string;
  bus_trip_id?: string;
  category_id: string;
  source_id?: string;
  payment_method_id: string;
  category: {
    category_id: string;
    name: string;
  };
  source?: {
    source_id: string;
    name: string;
  };
  payment_method: {
    id: string;
    name: string;
  };
  total_amount: number;
  expense_date: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
  reimbursements?: Reimbursement[];
  // Legacy fields for backward compatibility
  category_name?: string;
  payment_method_name?: string;
  source_name?: string;
}

type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  job_title?: string;
  amount: number;
  status: {
    id: string;
    name: string;
  };
  requested_date: string;
  approved_by?: string;
  approved_date?: string;
  rejection_reason?: string;
  paid_by?: string;
  paid_date?: string;
  payment_reference?: string;
  payment_method?: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  is_deleted: boolean;
  cancelled_by?: string;
  cancelled_date?: string;
};

// UI data type that matches your schema exactly
type ExpenseData = ExpenseRecord;

const ExpensePage = () => {
  const [data, setData] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const today = new Date().toISOString().split('T')[0];
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<ExpenseData | null>(null);
  const [recordToView, setRecordToView] = useState<ExpenseData | null>(null);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [availableCategories, setAvailableCategories] = useState<GlobalCategory[]>([]);
  
  // Filter sections configuration similar to revenue page
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
    }
  ];

  // Handle filter application
  const handleFilterApply = (filterValues: Record<string, string | string[] | {from: string; to: string}>) => {
    // Date range filter
    if (filterValues.dateRange && typeof filterValues.dateRange === 'object') {
      const dateRange = filterValues.dateRange as { from: string; to: string };
      setDateFrom(dateRange.from);
      setDateTo(dateRange.to);
    }
    
    // Category filter (multiple selection support)
    if (filterValues.category && Array.isArray(filterValues.category)) {
      setCategoryFilter(filterValues.category.join(','));
    } else {
      setCategoryFilter('');
    }

    // Reset pagination page
    setCurrentPage(1);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/globals/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const categoriesData = await response.json();
      // Filter categories that are applicable to expense module
      const expenseCategories = categoriesData.filter((cat: GlobalCategory) => 
        cat.applicable_modules.includes('expense') && !cat.is_deleted
      );
      setAvailableCategories(expenseCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showError('Failed to load categories', 'Error');
    }
  };

  // Format assignment for display
  const formatAssignment = (assignment: Assignment): string => {
    // Helper to format bus type correctly
    const formatBusType = (busType: string | null): string => {
      if (!busType) return 'N/A';
      
      // Normalize bus type values to display format
      const normalizedType = busType.toLowerCase();
      if (normalizedType === 'aircon' || normalizedType === 'airconditioned') {
        return 'A';
      } else if (normalizedType === 'ordinary' || normalizedType === 'non-aircon') {
        return 'O';
      } else {
        // For any other values, return the first letter capitalized
        return busType.charAt(0).toUpperCase();
      }
    };

    const busType = formatBusType(assignment.bus_type);
    const driverName = assignment.driver_name || 'N/A';
    const conductorName = assignment.conductor_name || 'N/A';
    return `${busType} | ${assignment.bus_plate_number || 'N/A'} - ${assignment.bus_route} | ${driverName} & ${conductorName}`;
  };

  // Fetch expenses data
  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const expensesData = await response.json();
      setData(expensesData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showError('Failed to load expenses', 'Error');
    }
  };

  // Fetch assignments data
  const fetchAssignments = async () => {
    try {
      // Get all assignments for reference (including recorded ones)
      const allAssignmentsData = await getAllAssignmentsWithRecorded();
      setAllAssignments(allAssignmentsData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showError('Failed to load assignments', 'Error');
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchExpenses(), 
        fetchAssignments(),
        fetchCategories() // Add this
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-reload data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data when lastUpdate changes
  useEffect(() => {
    if (!loading && !showModal && !editModalOpen) {
      fetchExpenses();
      fetchAssignments();
    }
  }, [lastUpdate, loading, showModal, editModalOpen]);

  // Filter and pagination logic
const filteredData = data.filter((item: ExpenseData) => {
  // Convert search to lowercase for case-insensitive comparison
  const searchLower = search.toLowerCase();
  
  // Check if search term exists in any field
  const matchesSearch = search === '' || 
    // Basic fields
    item.expense_id.toLowerCase().includes(searchLower) ||
    (item.category?.name?.toLowerCase() || item.category_name?.toLowerCase() || '').includes(searchLower) ||
    item.total_amount.toString().includes(searchLower) ||
    formatDate(item.expense_date).toLowerCase().includes(searchLower) ||
    (item.created_by?.toLowerCase() || '').includes(searchLower) ||
    (item.source?.name?.toLowerCase() || item.source_name?.toLowerCase() || '').includes(searchLower) ||
    
    // Assignment related fields (if available)
    (item.assignment_id?.toLowerCase() || '').includes(searchLower) ||
    
  false; // no receipt-related fields anymore
    
  const matchesCategory = categoryFilter ? 
    categoryFilter.split(',').some(cat => item.category?.name === cat.trim() || item.category_name === cat.trim()) : true;
  const matchesDate = (!dateFrom || item.expense_date >= dateFrom) && 
                    (!dateTo || item.expense_date <= dateTo);
  return matchesSearch && matchesCategory && matchesDate;
}).sort((a, b) => {
  // Sort by latest action (updated_at if available, otherwise created_at)
  // This ensures that the most recently added or edited records appear at the top
  const aLatestAction = a.updated_at || a.created_at;
  const bLatestAction = b.updated_at || b.created_at;
  
  // Convert to timestamps for comparison
  const aTimestamp = new Date(aLatestAction).getTime();
  const bTimestamp = new Date(bLatestAction).getTime();
  
  // Sort in descending order (latest first)
  return bTimestamp - aTimestamp;
});

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleAddExpense = async (newExpense: NewExpense) => {
    // Remove employee_id if present and source is operations
    if (newExpense.assignment_id && newExpense.driver_reimbursement !== undefined && newExpense.conductor_reimbursement !== undefined) {
      delete newExpense.employee_id;
    }
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense)
      });

      if (!response.ok) throw new Error('Create failed');

      const result: ExpenseRecord = await response.json();
      
      // Update expenses state with proper timestamps
      setData(prev => [{
        ...result,
        created_at: result.created_at || new Date().toISOString(),
        updated_at: result.updated_at || undefined, // Ensure updated_at is set if available
        is_deleted: result.is_deleted ?? false,
      }, ...prev]);
      
      // Trigger immediate data refresh
      setLastUpdate(Date.now());

      showSuccess('Success', 'Expense added successfully');
      setShowModal(false);
    } catch (error) {
      console.error('Create error:', error);
      showError('Error', 'Failed to add expense: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async (expense_id: string) => {
    const result = await showConfirmation(
      'This will delete the record permanently.',
      'Are you sure?'
    );


    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/expenses/${expense_id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        setData(prev => prev.filter(item => item.expense_id !== expense_id));
        showSuccess('Deleted!', 'Record deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        showError('Error', 'Failed to delete record');
      }
    }
  };

  const handleSaveEdit = async (updatedRecord: {
    expense_id: string;
    expense_date: string;
    total_amount: number;
    payment_method_id?: string;
    payment_status_id?: string;
    driver_reimbursement?: number;
    conductor_reimbursement?: number;
  }) => {
    try {
      const response = await fetch(`/api/expenses/${updatedRecord.expense_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord)
      });

      if (!response.ok) {
        let serverMsg = 'Update failed';
        try {
          const errJson = await response.json();
          serverMsg = errJson?.error || serverMsg;
          if (errJson?.details) serverMsg += `: ${errJson.details}`;
          if (errJson?.code === 'P2002') serverMsg = 'Duplicate expense detected (unique constraint)';
        } catch {}
        throw new Error(serverMsg);
      }

      const result = await response.json();
      
      // Update local state by moving the edited record to the top with proper timestamps
      setData(prev => {
        // Remove the old version of the record
        const filtered = prev.filter(rec => rec.expense_id !== updatedRecord.expense_id);
        // Create the updated record with proper timestamps
        const updated = {
          ...result,
          created_at: result.created_at || new Date().toISOString(),
          updated_at: result.updated_at || new Date().toISOString(), // Set updated_at to current time
          is_deleted: result.is_deleted ?? false,
        };
        // Add the updated record at the beginning of the array
        return [updated, ...filtered];
      });

      setEditModalOpen(false);
      setRecordToEdit(null);
      showSuccess('Updated Successfully', 'Record updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      const msg = error instanceof Error ? error.message : 'Error';
      showError('Failed to update record', msg);
    }
  };

  const handleViewExpense = (expense: ExpenseData) => {
    console.log('handleViewExpense called with:', expense);
    // Show the expense modal
    console.log('Setting record to view:', expense);
    setRecordToView(expense);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setRecordToView(null);
    setViewModalOpen(false);
  };

  // Generate the file name helper function
  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'expense_records';
    
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
      "Expense Date",
      "Source",
      "Category",
      "Amount",
      "Payment Method"
    ];
    return baseColumns;
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
          table_affected: 'ExpenseRecord',
          record_id: exportId,
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
      let message = `<strong>Expense Records Export</strong><br/><br/>`;
      
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
      confirmButtonText: 'Export',
      background: 'white',
      reverseButtons:true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const exportId = await logExportAudit();
          performExport(filteredData, exportId);
          showSuccess('Export completed successfully', 'Exported Successfully');
        } catch (error) {
          console.error('Export error:', error);
          showError('Failed to export data', 'Error');
        }
      }
    });
  };

  const performExport = (recordsToExport: ExpenseData[], exportId: string) => {
    // Generate header comment with consistent expense_date formatting
    const generateHeaderComment = () => {
      let comment = '"# Expense Records Export","","","","","","","","","","","","","","",""\n';
      comment += `"# Export ID:","${exportId}","","","","","","","","","","","","","",""\n`;
      comment += `"# Generated:","${formatDate(new Date())}","","","","","","","","","","","","","",""\n`;
      
      if (categoryFilter) {
        comment += `"# Category:","${categoryFilter}","","","","","","","","","","","","","",""\n`;
      } else {
        comment += '"# Category:","All Categories","","","","","","","","","","","","","",""\n';
      }
      
      if (dateFrom || dateTo) {
        const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
        const to = dateTo ? formatDate(dateTo) : 'Present';
        comment += `"# Date Range:","${from} to ${to}","","","","","","","","","","","","","",""\n`;
      } else {
        comment += '"# Date Range:","All Dates","","","","","","","","","","","","","",""\n';
      }
      
      comment += `"# Total Records:","${recordsToExport.length}","","","","","","","","","","","","","",""\n\n`;
      return comment;
    };

  const columns = getExportColumns();
  const headers = columns.join(",") + "\n";

  const rows = recordsToExport.map(item => {
      let assignment: Assignment | undefined = undefined;
      if (item.assignment_id && item.bus_trip_id) {
        assignment = allAssignments.find(a => a.assignment_id === item.assignment_id && a.bus_trip_id === item.bus_trip_id);
      } else if (item.assignment_id) {
        assignment = allAssignments.find(a => a.assignment_id === item.assignment_id);
      }
      let source: string = '';
      if (assignment) {
        source = formatAssignment(assignment);
      } else if (item.assignment_id) {
        source = `Assignment ${item.assignment_id} not found`;
      }
   
      return [
        formatDateTime(item.expense_date),
        source,
        formatDisplayText(item.category_name || item.category?.name || ''),
        `₱${Number(item.total_amount).toLocaleString()}`,
        item.payment_method_name ? (item.payment_method_name === 'Reimbursement' ? 'Reimbursement' : 'Cash') : (item.payment_method?.name === 'Reimbursement' ? 'Reimbursement' : 'Cash')
      ].join(",");
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
                <h1 className="title">Expense Management</h1>
                <Loading />
            </div>
        );
    }


  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Expense Management</h1>
        </div>
        
        <div className="settings">
          <div className="expense_searchBar">
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
              category: categoryFilter ? categoryFilter.split(',') : []
            }}
          />
          <div className="filters">
            <button onClick={handleExport} id="export"><i className="ri-receipt-line" /> Export CSV</button>

            <button onClick={() => setShowModal(true)} id='addExpense'><i className="ri-add-line" /> Add Expense</button>
          </div>
        </div>

        {/* ==========table===========  */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Expense Date</th>
                  <th>Source</th>
                  <th>Category</th>
                  <th>Submitted Amount</th>
                  <th>Payment Method</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(item => {
                  let assignment: Assignment | undefined = undefined;
                  if (item.assignment_id && item.bus_trip_id) {
                    assignment = allAssignments.find(a => a.assignment_id === item.assignment_id && a.bus_trip_id === item.bus_trip_id);
                  } else if (item.assignment_id) {
                    assignment = allAssignments.find(a => a.assignment_id === item.assignment_id);
                  }
                  let source: string = '';
                  if (assignment) {
                    source = formatAssignment(assignment);
                  } else if (item.assignment_id) {
                    source = `Assignment ${item.assignment_id} not found`;
                  } else if (item.source?.name || item.source_name) {
                    source = item.source?.name || item.source_name || '';
                  }
                              
                  return (
                    <tr key={item.expense_id}>
                      <td>{formatDateTime(item.expense_date)}</td>
                      <td>{source}</td>
                      <td>{formatDisplayText(item.category_name || item.category?.name || '')}</td>
                      <td>₱{Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{item.payment_method_name ? (item.payment_method_name === 'Reimbursement' ? 'Reimbursement' : 'Cash') : (item.payment_method?.name === 'Reimbursement' ? 'Reimbursement' : 'Cash')}</td>
                      <td className="styles.actionButtons">
                        <div className="actionButtonsContainer">
                          {/* view button */}
                          <button className="viewBtn" onClick={() => handleViewExpense(item)} title="View Record">
                            <i className="ri-eye-line" />
                          </button>
                          {/* edit button */}
                          <button className="editBtn" onClick={() => {setRecordToEdit(item);setEditModalOpen(true);}} title="Edit Record">
                            <i className="ri-edit-2-line" />
                          </button>
                          {/* delete button */}
                          <button className="deleteBtn" onClick={() => handleDelete(item.expense_id)} title="Delete Record">
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
          <AddExpense
            onClose={() => setShowModal(false)}
            onAddExpense={handleAddExpense}
            assignments={allAssignments.filter(a => !data.some(r => r.bus_trip_id && a.bus_trip_id && r.bus_trip_id === a.bus_trip_id))}
            currentUser="ftms_user" // Replace with your actual user ID
          />
        )}

        {editModalOpen && recordToEdit && (
          <EditExpenseModal
            record={{
              expense_id: recordToEdit.expense_id,
              expense_date: recordToEdit.expense_date,
              category: recordToEdit.category,
              total_amount: recordToEdit.total_amount,
              assignment: recordToEdit.assignment_id && recordToEdit.bus_trip_id
                ? allAssignments.find(a => a.assignment_id === recordToEdit.assignment_id && a.bus_trip_id === recordToEdit.bus_trip_id)
                : recordToEdit.assignment_id
                ? allAssignments.find(a => a.assignment_id === recordToEdit.assignment_id)
                : undefined,
              source: recordToEdit.source,
              payment_method: recordToEdit.payment_method,
              reimbursements: recordToEdit.reimbursements,
            }}
            onClose={() => {
              setEditModalOpen(false);
              setRecordToEdit(null);
            }}
            onSave={handleSaveEdit}
          />
        )}

        {viewModalOpen && recordToView && (
          <ViewExpenseModal
            record={{
              expense_id: recordToView.expense_id,
              category: recordToView.category,
              total_amount: recordToView.total_amount,
              expense_date: recordToView.expense_date,
              assignment: recordToView.assignment_id && recordToView.bus_trip_id
                ? allAssignments.find(a => a.assignment_id === recordToView.assignment_id && a.bus_trip_id === recordToView.bus_trip_id)
                : recordToView.assignment_id
                ? allAssignments.find(a => a.assignment_id === recordToView.assignment_id)
                : undefined,
              payment_method: recordToView.payment_method,
              reimbursements: recordToView.reimbursements,
            }}
            onClose={handleCloseViewModal}
          />
        )}
      </div>
    </div>
  );
};

export default ExpensePage;
