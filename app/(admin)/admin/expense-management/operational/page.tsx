'use client';

import React, { useState, useEffect } from 'react';
import '../../../../styles/expense-management/operational.css';
import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';
import PaginationComponent from '../../../../Components/pagination';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import ExportButton from '../../../../Components/ExportButton';
//@ts-ignore
import OperationalExpenseViewModal from './OperationalExpenseViewModal';
import { 
  OperationalExpense, 
  OperationalExpenseFilters, 
  OperationalExpenseType,
  ExpenseStatus 
} from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';

// Sample data for demonstration
const sampleOperationalExpenses: OperationalExpense[] = [
  {
    id: '1',
    expense_type: OperationalExpenseType.FUEL,
    date: '2025-10-22',
    amount: 5000,
    description: 'Diesel fuel for Bus 101',
    category: 'Transportation',
    status: ExpenseStatus.APPROVED,
    bus_id: '1',
    bus_number: 'BUS-101',
    employee_id: '1',
    employee_name: 'Juan Dela Cruz',
    receipt_number: 'RCP-2025-001',
    items: [
      {
        item_name: 'Diesel Fuel',
        quantity: 100,
        unit_measure: 'liters',
        unit_cost: 50,
        supplier: 'Petron Station',
        subtotal: 5000,
        type: 'supply'
      }
    ],
    created_by: 'driver_001',
    approved_by: 'admin',
    created_at: '2025-10-22T08:00:00Z',
    approved_at: '2025-10-22T09:00:00Z',
    updated_at: '2025-10-22T09:00:00Z'
  },
  {
    id: '2',
    expense_type: OperationalExpenseType.TOLL,
    date: '2025-10-21',
    amount: 350,
    description: 'Skyway toll fee',
    category: 'Transportation',
    status: ExpenseStatus.PENDING,
    bus_id: '2',
    bus_number: 'BUS-102',
    employee_id: '2',
    employee_name: 'Maria Santos',
    receipt_number: 'RCP-2025-002',
    items: [
      {
        item_name: 'Skyway Toll',
        quantity: 1,
        unit_measure: 'pcs',
        unit_cost: 350,
        supplier: 'Skyway Toll Plaza',
        subtotal: 350,
        type: 'service'
      }
    ],
    created_by: 'driver_002',
    created_at: '2025-10-21T14:30:00Z',
    updated_at: '2025-10-21T14:30:00Z'
  }
];

const OperationalExpensePage = () => {
  // State management
  const [data, setData] = useState<OperationalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<OperationalExpenseFilters>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [selectedExpense, setSelectedExpense] = useState<OperationalExpense | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Filter sections for FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      icon: 'ri-calendar-line',
      defaultValue: { from: '', to: '' }
    },
    {
      id: 'expense_type',
      title: 'Expense Type',
      type: 'radio',
      icon: 'ri-gas-station-line',
      options: [
        { id: '', label: 'All Types' },
        { id: OperationalExpenseType.FUEL, label: 'Fuel' },
        { id: OperationalExpenseType.TOLL, label: 'Toll' },
        { id: OperationalExpenseType.PARKING, label: 'Parking' },
        { id: OperationalExpenseType.ALLOWANCES, label: 'Allowances' },
        { id: OperationalExpenseType.PETTY_CASH, label: 'Petty Cash' },
        { id: OperationalExpenseType.VIOLATIONS, label: 'Violations' },
        { id: OperationalExpenseType.TERMINAL_FEES, label: 'Terminal Fees' }
      ],
      defaultValue: ''
    },
    {
      id: 'status',
      title: 'Status',
      type: 'radio',
      icon: 'ri-information-line',
      options: [
        { id: '', label: 'All Status' },
        { id: ExpenseStatus.PENDING, label: 'Pending' },
        { id: ExpenseStatus.APPROVED, label: 'Approved' },
        { id: ExpenseStatus.REJECTED, label: 'Rejected' },
        { id: ExpenseStatus.POSTED, label: 'Posted' }
      ],
      defaultValue: ''
    }
  ];

  // Fetch data (using sample data for now)
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await fetch('/api/admin/expenses/operational?...' + queryParams);
      // const result = await response.json();

      await new Promise(resolve => setTimeout(resolve, 500));

      let filteredData = [...sampleOperationalExpenses];

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(expense =>
          expense.description.toLowerCase().includes(searchLower) ||
          expense.bus_number?.toLowerCase().includes(searchLower) ||
          expense.employee_name?.toLowerCase().includes(searchLower) ||
          expense.receipt_number?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.expense_type) {
        filteredData = filteredData.filter(expense => expense.expense_type === filters.expense_type);
      }

      if (filters.status) {
        filteredData = filteredData.filter(expense => expense.status === filters.status);
      }

      if (filters.dateRange?.from) {
        filteredData = filteredData.filter(expense => expense.date >= filters.dateRange!.from!);
      }

      if (filters.dateRange?.to) {
        filteredData = filteredData.filter(expense => expense.date <= filters.dateRange!.to!);
      }

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      setData(paginatedData);
      setTotalCount(filteredData.length);
      setTotalPages(Math.ceil(filteredData.length / pageSize));

    } catch (err) {
      console.error('Error fetching operational expense data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setErrorCode('FETCH_ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = (appliedFilters: any) => {
    const converted: OperationalExpenseFilters = {
      dateRange: appliedFilters.dateRange,
      expense_type: appliedFilters.expense_type,
      status: appliedFilters.status,
    };
    setFilters(converted);
    setCurrentPage(1);
  };

  const handleRowClick = (expense: OperationalExpense) => {
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  const handleModalClose = () => {
    setShowViewModal(false);
    setSelectedExpense(null);
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, filters, searchTerm]);

  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Operational Expenses</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Operational Expenses</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setErrorCode(null);
            fetchData();
          }}
        />
      </div>
    );
  }

  // Prepare export data
  const exportData = data.map(expense => ({
    'Date': formatDate(expense.date),
    'Expense Type': expense.expense_type.replace(/_/g, ' '),
    'Bus': expense.bus_number || '-',
    'Employee': expense.employee_name || '-',
    'Description': expense.description,
    'Amount': formatMoney(expense.amount),
    'Status': expense.status,
    'Receipt': expense.receipt_number || '-'
  }));

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Operational Expenses</h1>
        </div>

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search description, bus, employee, receipt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter button right next to search bar */}
            <FilterDropdown
              sections={filterSections}
              onApply={(filterValues) => {
                const dateRange = filterValues.dateRange as { from: string; to: string } || { from: '', to: '' };
                handleFilterApply({
                  dateRange,
                  expense_type: (filterValues.expense_type as string) || '',
                  status: (filterValues.status as string) || ''
                });
              }}
              initialValues={{
                dateRange: filters.dateRange ? { from: filters.dateRange.from || '', to: filters.dateRange.to || '' } : { from: '', to: '' },
                expense_type: filters.expense_type || '',
                status: filters.status || ''
              }}
              title="Operational Expense Filters"
            />
          </div>

          <div className="filters">
            <ExportButton
              data={exportData}
              filename="operational-expenses"
              title="Operational Expenses Report"
            />
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table operational-expense-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense Type</th>
                  <th>Bus</th>
                  <th>Employee</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="loading-cell">Loading...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">No operational expenses found.</td>
                  </tr>
                ) : (
                  data.map((expense, index) => (
                    <tr
                      key={expense.id}
                      onClick={() => handleRowClick(expense)}
                      className="expense-row"
                      style={{ cursor: 'pointer' }}
                      title="Click to view details"
                    >
                      <td>{formatDate(expense.date)}</td>
                      <td>
                        <span className={`chip ${expense.expense_type.toLowerCase()}`}>
                          {expense.expense_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{expense.bus_number || '-'}</td>
                      <td>{expense.employee_name || '-'}</td>
                      <td className="expense-description">{expense.description}</td>
                      <td className="expense-amount">{formatMoney(expense.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {showViewModal && selectedExpense && (
        <OperationalExpenseViewModal
          expense={selectedExpense}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default OperationalExpensePage;
