'use client';

import React, { useState, useEffect } from 'react';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import ExportButton from '../../../../Components/ExportButton';
import PurchaseExpenseViewModal from './PurchaseExpenseViewModal';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import PaginationComponent from '../../../../Components/pagination';
import { PurchaseExpense, PurchaseExpenseFilters } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';
import '../../../../styles/expense-management/purchase.css';

const PurchaseExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<PurchaseExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | number | null>(null);

  const [selectedExpense, setSelectedExpense] = useState<PurchaseExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<PurchaseExpenseFilters>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Sample data for demonstration
  const samplePurchaseExpenses: PurchaseExpense[] = [
    {
      id: 'PUR-001',
      date: '2024-01-25',
      pr_number: 'PR-2024-001',
      pr_date: '2024-01-10',
      dr_number: 'DR-2024-001',
      dr_date: '2024-01-25',
      description: 'Bus spare parts - brake pads and filters',
      amount: 25000.00,
      category: 'Maintenance',
      budget_code: 'BUD-MAINT-2024',
      budget_allocated: 500000.00,
      budget_utilized: 125000.00,
      status: 'DELIVERED',
      receipt_number: 'REC-PUR-001',
      supplier: 'Auto Parts Supplier Inc.',
      items: [
        {
          item_name: 'Brake Pads Set',
          quantity: 10,
          unit_measure: 'sets',
          unit_cost: 1500,
          supplier: 'Auto Parts Supplier Inc.',
          subtotal: 15000,
          type: 'supply'
        },
        {
          item_name: 'Oil Filter',
          quantity: 20,
          unit_measure: 'pcs',
          unit_cost: 500,
          supplier: 'Auto Parts Supplier Inc.',
          subtotal: 10000,
          type: 'supply'
        }
      ],
      created_by: 'procurement@ftms.com',
      created_at: '2024-01-10T10:00:00Z',
      approved_by: 'manager@ftms.com',
      approved_at: '2024-01-11T14:00:00Z',
      updated_at: '2024-01-25T16:30:00Z',
    },
    {
      id: 'PUR-002',
      date: '2024-01-28',
      pr_number: 'PR-2024-002',
      pr_date: '2024-01-15',
      dr_number: 'DR-2024-002',
      dr_date: '2024-01-28',
      description: 'Fuel purchase - bulk diesel for fleet',
      amount: 150000.00,
      category: 'Fuel',
      budget_code: 'BUD-FUEL-2024',
      budget_allocated: 2000000.00,
      budget_utilized: 450000.00,
      status: 'POSTED',
      receipt_number: 'REC-PUR-002',
      supplier: 'Petron Corporation',
      items: [
        {
          item_name: 'Diesel Fuel',
          quantity: 3000,
          unit_measure: 'liters',
          unit_cost: 50,
          supplier: 'Petron Corporation',
          subtotal: 150000,
          type: 'supply'
        }
      ],
      created_by: 'procurement@ftms.com',
      created_at: '2024-01-15T09:00:00Z',
      approved_by: 'manager@ftms.com',
      approved_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-29T08:00:00Z',
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
      // const response = await fetch(`/api/admin/expenses/purchase?page=${currentPage}&pageSize=${pageSize}&search=${searchTerm}&filters=${JSON.stringify(filters)}`);
      // const data = await response.json();

      // Simulate filtering on sample data
      let filtered = samplePurchaseExpenses;

      if (searchTerm) {
        filtered = filtered.filter(
          (exp) =>
            exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.pr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.dr_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
        );
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
    const converted: PurchaseExpenseFilters = {
      dateRange: appliedFilters.dateRange,
      status: appliedFilters.status,
    };
    setFilters(converted);
    setCurrentPage(1);
  };

  const handleRowClick = (expense: PurchaseExpense) => {
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
      id: 'status',
      title: 'Status',
      type: 'radio',
      icon: 'ri-information-line',
      options: [
        { id: '', label: 'All Status' },
        { id: 'DRAFT', label: 'Draft' },
        { id: 'MATCHED', label: 'Matched' },
        { id: 'DELIVERED', label: 'Delivered' },
        { id: 'POSTED', label: 'Posted' },
        { id: 'CLOSED', label: 'Closed' },
        { id: 'REFUNDED', label: 'Refunded' },
        { id: 'REPLACED', label: 'Replaced' }
      ],
      defaultValue: ''
    }
  ];

  // Calculate budget utilization percentage
  const getBudgetUtilization = (expense: PurchaseExpense): string => {
    if (!expense.budget_allocated || expense.budget_allocated === 0) return 'N/A';
    const percentage = ((expense.budget_utilized || 0) / expense.budget_allocated) * 100;
    return `${percentage.toFixed(1)}%`;
  };

  // Prepare export data
  const exportData = expenses.map((exp) => ({
    Date: formatDate(exp.date),
    'PR Number': exp.pr_number,
    'DR Number': exp.dr_number || 'N/A',
    Description: exp.description,
    Supplier: exp.supplier || 'N/A',
    Category: exp.category || 'N/A',
    Amount: formatMoney(exp.amount),
    'Budget Code': exp.budget_code || 'N/A',
    'Budget Utilization': getBudgetUtilization(exp),
    Status: exp.status.charAt(0).toUpperCase() + exp.status.slice(1).toLowerCase(),
  }));

  if (loading) return <Loading />;
  if (error) return <ErrorDisplay errorCode={error} onRetry={() => { setError(null); fetchData(); }} />;

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Purchase Expenses</h1>
        </div>

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search by description, PR number, DR number, or supplier..."
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
                  status: (filterValues.status as string) || ''
                });
              }}
              initialValues={{
                dateRange: filters.dateRange ? { from: filters.dateRange.from || '', to: filters.dateRange.to || '' } : { from: '', to: '' },
                status: filters.status || ''
              }}
              title="Purchase Expense Filters"
            />
          </div>

          <div className="filters">
            <ExportButton
              data={exportData}
              filename="purchase-expenses"
              title="Purchase Expenses Report"
            />
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table purchase-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>PR Number</th>
                  <th>DR Number</th>
                  <th>Description</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Budget Utilization</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">
                      No purchase expenses found
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense, index) => {
                    const budgetUtilization = getBudgetUtilization(expense);
                    const utilizationPercent =
                      expense.budget_allocated && expense.budget_allocated > 0
                        ? ((expense.budget_utilized || 0) / expense.budget_allocated) * 100
                        : 0;

                    return (
                      <tr
                        key={expense.id}
                        onClick={() => handleRowClick(expense)}
                        className="expense-row"
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{formatDate(expense.date)}</td>
                        <td>{expense.pr_number}</td>
                        <td>{expense.dr_number || '-'}</td>
                        <td className="description-cell">{expense.description}</td>
                        <td>{expense.supplier || 'N/A'}</td>
                        <td className="amount-cell">{formatMoney(expense.amount)}</td>
                        <td>
                          <span
                            className={`budget-utilization ${
                              utilizationPercent > 80
                                ? 'high'
                                : utilizationPercent > 50
                                ? 'medium'
                                : 'low'
                            }`}
                          >
                            {budgetUtilization}
                          </span>
                        </td>
                      </tr>
                    );
                  })
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
        <PurchaseExpenseViewModal expense={selectedExpense} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default PurchaseExpensePage;
