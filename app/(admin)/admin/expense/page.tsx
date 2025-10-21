"use client";

import React, { useState, useEffect } from "react";
//@ts-ignore
import "../../../styles/expense/expense.css";
//@ts-ignore
import "../../../styles/components/table.css";
import PaginationComponent from "../../../Components/pagination";
import Swal from 'sweetalert2';
import { formatDateTime, formatDate } from '../../../utils/formatting';
import Loading from '../../../Components/loading';
import ErrorDisplay from '../../../Components/errordisplay';
import { showSuccess, showError, showConfirmation } from '../../../utils/Alerts';
import { formatDisplayText } from '@/app/utils/formatting';
import FilterDropdown, { FilterSection } from "../../../Components/filter";
import AddExpense from './addExpense';
import ViewExpenseModal from './viewExpense';
import EditExpenseModal from './editExpense';

const ExpensePage = () => {
  // ─────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  
  // Dynamic dropdown data
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // ─────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: 'transactionDate',
        sortOrder: 'desc',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (paymentMethodFilter) params.append('paymentMethodId', paymentMethodFilter);
      if (departmentFilter) params.append('department', departmentFilter);

      const response = await fetch(`/api/expense?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch expenses: ${response.statusText}`);
      }

      const data = await response.json();
      
      setExpenses(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalRecords(data.pagination?.totalRecords || 0);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setError(err);
      showError(err.message, 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      // Fetch categories
      const categoriesRes = await fetch('/api/expense/categories');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      // Fetch payment methods
      const paymentMethodsRes = await fetch('/api/expense/payment-methods');
      if (paymentMethodsRes.ok) {
        const paymentMethodsData = await paymentMethodsRes.json();
        setPaymentMethods(paymentMethodsData);
      }
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  // Load data on mount and when filters/pagination change
  useEffect(() => {
    fetchExpenses();
  }, [currentPage, pageSize, searchTerm, dateFrom, dateTo, categoryFilter, paymentMethodFilter, departmentFilter]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // ─────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────
  const handleView = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/expense/${expenseId}`);
      if (!response.ok) throw new Error('Failed to fetch expense details');
      
      const data = await response.json();
      setSelectedExpense(data);
      setShowViewModal(true);
    } catch (err: any) {
      showError(err.message, 'Failed to load expense details');
    }
  };

  const handleEdit = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/expense/${expenseId}`);
      if (!response.ok) throw new Error('Failed to fetch expense details');
      
      const data = await response.json();
      setSelectedExpense(data);
      setShowEditModal(true);
    } catch (err: any) {
      showError(err.message, 'Failed to load expense details');
    }
  };

  const handleDelete = async (expenseId: string) => {
    const result = await showConfirmation(
      'Are you sure you want to delete this expense? This action cannot be undone.',
      'Delete Expense'
    );

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/expense/${expenseId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to delete expense');
        }

        showSuccess('Expense deleted successfully', 'Success');
        fetchExpenses(); // Refresh list
      } catch (err: any) {
        showError(err.message, 'Failed to delete expense');
      }
    }
  };

  const handleAddExpense = async (formData: any) => {
    try {
      const response = await fetch('/api/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add expense');
      }

      showSuccess('Expense added successfully', 'Success');
      setShowAddModal(false);
      fetchExpenses(); // Refresh list
    } catch (err: any) {
      showError(err.message, 'Failed to add expense');
    }
  };

  const handleSaveExpense = async (updatedData: any) => {
    try {
      const response = await fetch(`/api/expense/${updatedData.expense_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update expense');
      }

      showSuccess('Expense updated successfully', 'Success');
      setShowEditModal(false);
      fetchExpenses(); // Refresh list
    } catch (err: any) {
      showError(err.message, 'Failed to update expense');
    }
  };

  const handleFilterApply = (filters: any) => {
    if (filters.dateRange) {
      setDateFrom(filters.dateRange.from || '');
      setDateTo(filters.dateRange.to || '');
    }
    if (filters.category) {
      setCategoryFilter(filters.category.join(','));
    }
    if (filters.paymentMethod) {
      setPaymentMethodFilter(filters.paymentMethod.join(','));
    }
    if (filters.department) {
      setDepartmentFilter(filters.department);
    }
    setCurrentPage(1); // Reset to first page
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        sortBy: 'transactionDate',
        sortOrder: 'desc',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (categoryFilter) params.append('categoryId', categoryFilter);

      const response = await fetch(`/api/expense?${params.toString()}`);
      const data = await response.json();

      // Convert to CSV
      const csvContent = convertToCSV(data.data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess('Expenses exported successfully', 'Export Complete');
    } catch (err: any) {
      showError(err.message, 'Failed to export expenses');
    }
  };

  const convertToCSV = (data: any[]) => {
    const headers = ['Expense Date', 'Source', 'Category', 'Amount', 'Payment Method'];
    const rows = data.map(item => [
      formatDateTime(item.transactionDate),
      formatSource(item),
      item.category?.name || 'N/A',
      item.amount,
      item.paymentMethod?.methodName || 'N/A',
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  };

  const formatSource = (expense: any) => {
    if (expense.busTripCache) {
      const busType = expense.busTripCache.busType === 'Aircon' ? 'A' : 'O';
      return `${busType} | ${expense.busTripCache.busPlateNumber} - ${expense.busTripCache.busRoute} | ${expense.busTripCache.driverName} & ${expense.busTripCache.conductorName}`;
    }
    return expense.vendorName || expense.category?.department || 'Manual Entry';
  };

  // ─────────────────────────────────────────────────────────
  // FILTER SECTIONS
  // ─────────────────────────────────────────────────────────
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      icon: 'ri-calendar-line',
    },
    {
      id: 'category',
      title: 'Category',
      type: 'checkbox',
      icon: 'ri-list-check',
      options: categories.map(cat => ({ id: cat.id.toString(), label: cat.name })),
    },
    {
      id: 'paymentMethod',
      title: 'Payment Method',
      type: 'checkbox',
      icon: 'ri-bank-card-line',
      options: paymentMethods.map(pm => ({ id: pm.id.toString(), label: pm.methodName })),
    },
    {
      id: 'department',
      title: 'Department',
      type: 'radio',
      icon: 'ri-building-line',
      options: [
        { id: 'Operations', label: 'Operations' },
        { id: 'Finance', label: 'Finance' },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Audit Logs</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setErrorCode(null);
            fetchExpenses();
          }}
        />
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
          <div className="search-filter-container">
            <div className="expense_searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search here..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
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
          <div className="filters">
            <button onClick={handleExport} id="export"><i className="ri-receipt-line" /> Export CSV</button>
            <button onClick={() => setShowAddModal(true)} id='addExpense'><i className="ri-add-line" /> Add Expense</button>
          </div>
        </div>

        {/* ==========TABLE=========== */}
          <>
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
                    {expenses.map(item => (
                      <tr key={item.id}>
                        <td>{formatDateTime(item.transactionDate)}</td>
                        <td>{formatSource(item)}</td>
                        <td>{item.category?.name || 'N/A'}</td>
                        <td>₱{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{item.paymentMethod?.methodName || 'N/A'}</td>
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            <button className="viewBtn" onClick={() => handleView(item.id)} title="View Record">
                              <i className="ri-eye-line" />
                            </button>
                            <button className="editBtn" onClick={() => handleEdit(item.id)} title="Edit Record">
                              <i className="ri-edit-2-line" />
                            </button>
                            <button className="deleteBtn" onClick={() => handleDelete(item.id)} title="Delete Record">
                              <i className="ri-delete-bin-line" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {expenses.length === 0 && <p className="noRecords">No records found.</p>}
              </div>
            </div>

            <PaginationComponent
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </>
      </div>

      {/* MODALS */}
      {showAddModal && (
        <AddExpense
          onClose={() => setShowAddModal(false)}
          onAddExpense={handleAddExpense}
          assignments={[]}
          currentUser="admin@example.com"
        />
      )}

      {showViewModal && selectedExpense && (
        <ViewExpenseModal
          record={selectedExpense}
          onClose={() => {
            setShowViewModal(false);
            setSelectedExpense(null);
          }}
        />
      )}

      {showEditModal && selectedExpense && (
        <EditExpenseModal
          record={selectedExpense}
          onClose={() => {
            setShowEditModal(false);
            setSelectedExpense(null);
          }}
          onSave={handleSaveExpense}
        />
      )}
    </div>
  );
};

export default ExpensePage;
