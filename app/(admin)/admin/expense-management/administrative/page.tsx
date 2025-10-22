'use client';

import React, { useState, useEffect } from 'react';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import ExportButton from '../../../../Components/ExportButton';
import AdminExpenseViewModal from './AdminExpenseViewModal';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import PaginationComponent from '../../../../Components/pagination';
import { AdministrativeExpense, AdministrativeExpenseFilters } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';
import '../../../../styles/expense-management/administrative.css';

const AdministrativeExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<AdministrativeExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | number | null>(null);

  const [selectedExpense, setSelectedExpense] = useState<AdministrativeExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<AdministrativeExpenseFilters>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Sample data for demonstration
  const sampleAdministrativeExpenses: AdministrativeExpense[] = [
    {
      id: 'ADM-001',
      date: '2024-01-15',
      expense_type: 'OFFICE_SUPPLIES',
      category: 'Operations',
      description: 'Printer paper, pens, and office supplies for admin office',
      amount: 2500.00,
      department: 'Administration',
      vendor: 'Office Depot',
      invoice_number: 'INV-2024-001',
      receipt_number: 'REC-ADM-001',
      status: 'APPROVED',
      items: [
        {
          item_name: 'Printer Paper',
          quantity: 20,
          unit_measure: 'boxes',
          unit_cost: 100,
          supplier: 'Office Depot',
          subtotal: 2000,
          type: 'supply'
        },
        {
          item_name: 'Ballpoint Pens',
          quantity: 50,
          unit_measure: 'pcs',
          unit_cost: 10,
          supplier: 'Office Depot',
          subtotal: 500,
          type: 'supply'
        }
      ],
      created_by: 'admin@ftms.com',
      created_at: '2024-01-15T08:00:00Z',
      approved_by: 'manager@ftms.com',
      approved_at: '2024-01-15T14:30:00Z',
      updated_at: '2024-01-15T14:30:00Z',
    },
    {
      id: 'ADM-002',
      date: '2024-01-20',
      expense_type: 'UTILITIES',
      category: 'Operations',
      description: 'Monthly electricity bill for main office',
      amount: 15000.00,
      department: 'Administration',
      vendor: 'Electric Company',
      invoice_number: 'INV-ELEC-JAN-2024',
      receipt_number: 'REC-ADM-002',
      status: 'POSTED',
      items: [
        {
          item_name: 'Electricity Consumption',
          quantity: 1,
          unit_measure: 'months',
          unit_cost: 15000,
          supplier: 'Electric Company',
          subtotal: 15000,
          type: 'service'
        }
      ],
      created_by: 'admin@ftms.com',
      created_at: '2024-01-20T09:00:00Z',
      approved_by: 'manager@ftms.com',
      approved_at: '2024-01-20T16:00:00Z',
      updated_at: '2024-01-21T10:00:00Z',
    },
  ];

  useEffect(() => {
    fetchData();
  }, [currentPage, filters, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await fetch(`/api/admin/expenses/administrative?page=${currentPage}&pageSize=${pageSize}&search=${searchTerm}&filters=${JSON.stringify(filters)}`);
      // const data = await response.json();

      // Simulate filtering on sample data
      let filtered = sampleAdministrativeExpenses;

      if (searchTerm) {
        filtered = filtered.filter(
          (exp) =>
            exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (filters.expense_type) {
        filtered = filtered.filter((exp) => exp.expense_type === filters.expense_type);
      }

      if (filters.status) {
        filtered = filtered.filter((exp) => exp.status === filters.status);
      }

      if (filters.dateRange?.from) {
        filtered = filtered.filter((exp) => exp.date >= filters.dateRange!.from!);
      }

      if (filters.dateRange?.to) {
        filtered = filtered.filter((exp) => exp.date <= filters.dateRange!.to!);
      }

      setExpenses(filtered);
      setTotalCount(filtered.length);
    } catch (err) {
      setError(500);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = (appliedFilters: any) => {
    const converted: AdministrativeExpenseFilters = {
      dateRange: appliedFilters.dateRange,
      expense_type: appliedFilters.expense_type,
      status: appliedFilters.status,
    };
    setFilters(converted);
    setCurrentPage(1);
  };

  const handleRowClick = (expense: AdministrativeExpense) => {
    setSelectedExpense(expense);
  };

  const handleCloseModal = () => {
    setSelectedExpense(null);
  };

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
      icon: 'ri-folder-line',
      options: [
        { id: '', label: 'All Types' },
        { id: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
        { id: 'UTILITIES', label: 'Utilities' },
        { id: 'PROFESSIONAL_FEES', label: 'Professional Fees' },
        { id: 'INSURANCE', label: 'Insurance' },
        { id: 'LICENSING', label: 'Licensing' },
        { id: 'PERMITS', label: 'Permits' },
        { id: 'GENERAL_ADMIN', label: 'General Admin' }
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
        { id: 'PENDING', label: 'Pending' },
        { id: 'APPROVED', label: 'Approved' },
        { id: 'REJECTED', label: 'Rejected' },
        { id: 'POSTED', label: 'Posted' }
      ],
      defaultValue: ''
    }
  ];

  // Prepare export data
  const exportData = expenses.map((exp) => ({
    Date: formatDate(exp.date),
    'Expense Type': exp.expense_type.replace(/_/g, ' '),
    Department: exp.department || 'N/A',
    Vendor: exp.vendor || 'N/A',
    'Invoice Number': exp.invoice_number || 'N/A',
    Description: exp.description,
    Amount: formatMoney(exp.amount),
    Status: exp.status.charAt(0).toUpperCase() + exp.status.slice(1).toLowerCase(),
  }));

  if (loading) return <Loading />;
  if (error) return <ErrorDisplay errorCode={error} onRetry={() => { setError(null); fetchData(); }} />;

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Administrative Expenses</h1>
        </div>

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search by description, department, vendor, or invoice..."
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
              title="Administrative Expense Filters"
            />
          </div>

          <div className="filters">
            <ExportButton
              data={exportData}
              filename="administrative-expenses"
              title="Administrative Expenses Report"
            />
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense Type</th>
                  <th>Department</th>
                  <th>Vendor</th>
                  <th>Invoice Number</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">
                      No administrative expenses found
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense, index) => (
                    <tr
                      key={expense.id}
                      onClick={() => handleRowClick(expense)}
                      className="expense-row"
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{formatDate(expense.date)}</td>
                      <td>
                        <span className={`chip ${expense.expense_type.toLowerCase()}`}>
                          {expense.expense_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{expense.department || 'N/A'}</td>
                      <td>{expense.vendor || 'N/A'}</td>
                      <td>{expense.invoice_number || 'N/A'}</td>
                      <td className="description-cell">{expense.description}</td>
                      <td className="amount-cell">{formatMoney(expense.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / pageSize)}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={() => {}}
        />
      </div>

      {selectedExpense && (
        <AdminExpenseViewModal expense={selectedExpense} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default AdministrativeExpensePage;
