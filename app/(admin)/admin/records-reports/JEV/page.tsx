'use client';

import React, { useState, useEffect } from 'react';
import '../../../../styles/records-reports/jev.css';
import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';
import PaginationComponent from '../../../../Components/pagination';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import JEVViewModal from './JEVViewModal';
import { JournalEntry, JournalEntryFilters, EntryType, JournalStatus } from '../../../../types/jev';
import { formatDate, formatMoney } from '../../../../utils/formatting';

// Sample data for demonstration
const sampleJournalEntries: JournalEntry[] = [
  {
    journal_entry_id: '1',
    journal_number: 'JV-2025-001',
    transaction_date: '2025-10-22',
    posting_date: '2025-10-22',
    reference_number: 'REF-001',
    description: 'Office supplies purchase',
    entry_type: EntryType.MANUAL,
    source_module: 'PURCHASE',
    source_id: 'PUR-001',
    status: JournalStatus.POSTED,
    total_debit: 5000,
    total_credit: 5000,
    is_balanced: true,
    created_at: '2025-10-22T10:00:00Z',
    created_by: 'admin',
    posted_at: '2025-10-22T10:30:00Z',
    posted_by: 'admin',
    updated_at: '2025-10-22T10:30:00Z',
    journal_lines: [
      {
        line_id: '1',
        account_id: '1',
        account: {
          account_id: '1',
          account_code: '1010',
          account_name: 'Cash on Hand',
          account_type: 'ASSET' as any,
          is_active: true,
          is_system_account: true,
          level: 1
        },
        line_number: 1,
        description: 'Payment for office supplies',
        credit_amount: 5000,
        department: 'ADMIN',
        responsibility_center: 'MAIN'
      },
      {
        line_id: '2',
        account_id: '5',
        account: {
          account_id: '5',
          account_code: '5010',
          account_name: 'Office Supplies Expense',
          account_type: 'EXPENSE' as any,
          is_active: true,
          is_system_account: false,
          level: 1
        },
        line_number: 2,
        description: 'Office supplies purchase',
        debit_amount: 5000,
        department: 'ADMIN',
        responsibility_center: 'MAIN'
      }
    ]
  },
  {
    journal_entry_id: '2',
    journal_number: 'JV-2025-002',
    transaction_date: '2025-10-21',
    posting_date: '2025-10-21',
    reference_number: 'SAL-001',
    description: 'Monthly salary payment',
    entry_type: EntryType.AUTO_PAYROLL,
    source_module: 'PAYROLL',
    source_id: 'PAY-001',
    status: JournalStatus.POSTED,
    total_debit: 15000,
    total_credit: 15000,
    is_balanced: true,
    created_at: '2025-10-21T09:00:00Z',
    created_by: 'system',
    posted_at: '2025-10-21T09:15:00Z',
    posted_by: 'admin',
    updated_at: '2025-10-21T09:15:00Z',
    journal_lines: [
      {
        line_id: '3',
        account_id: '2',
        account: {
          account_id: '2',
          account_code: '1020',
          account_name: 'Cash in Bank',
          account_type: 'ASSET' as any,
          is_active: true,
          is_system_account: true,
          level: 1
        },
        line_number: 1,
        description: 'Salary payment',
        credit_amount: 15000,
        department: 'HR',
        responsibility_center: 'MAIN'
      },
      {
        line_id: '4',
        account_id: '6',
        account: {
          account_id: '6',
          account_code: '6010',
          account_name: 'Salaries Expense',
          account_type: 'EXPENSE' as any,
          is_active: true,
          is_system_account: false,
          level: 1
        },
        line_number: 2,
        description: 'Monthly salaries',
        debit_amount: 15000,
        department: 'HR',
        responsibility_center: 'MAIN'
      }
    ]
  }
];

const JEVPage = () => {
  // State management
  const [data, setData] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Filter states
  const [activeFilters, setActiveFilters] = useState<JournalEntryFilters>({
    search: '',
    date_from: '',
    date_to: '',
    entry_type: '',
    status: '',
    source_module: '',
    account_id: ''
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Filter sections for FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Transaction Date',
      type: 'dateRange',
      icon: 'ri-calendar-line',
      defaultValue: { from: '', to: '' }
    },
    {
      id: 'entry_type',
      title: 'Entry Type',
      type: 'radio',
      icon: 'ri-file-list-line',
      options: [
        { id: '', label: 'All Types' },
        { id: EntryType.MANUAL, label: 'Manual' },
        { id: EntryType.AUTO_REVENUE, label: 'Auto Revenue' },
        { id: EntryType.AUTO_EXPENSE, label: 'Auto Expense' },
        { id: EntryType.AUTO_PAYROLL, label: 'Auto Payroll' },
        { id: EntryType.AUTO_LOAN, label: 'Auto Loan' },
        { id: EntryType.AUTO_PURCHASE, label: 'Auto Purchase' },
        { id: EntryType.AUTO_REFUND, label: 'Auto Refund' },
        { id: EntryType.ADJUSTMENT, label: 'Adjustment' },
        { id: EntryType.CLOSING, label: 'Closing' }
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
        { id: JournalStatus.DRAFT, label: 'Draft' },
        { id: JournalStatus.POSTED, label: 'Posted' },
        { id: JournalStatus.REVERSED, label: 'Reversed' }
      ],
      defaultValue: ''
    },
    {
      id: 'source_module',
      title: 'Source Module',
      type: 'radio',
      icon: 'ri-building-line',
      options: [
        { id: '', label: 'All Modules' },
        { id: 'PURCHASE', label: 'Purchase' },
        { id: 'PAYROLL', label: 'Payroll' },
        { id: 'REVENUE', label: 'Revenue' },
        { id: 'EXPENSE', label: 'Expense' },
        { id: 'LOAN', label: 'Loan' },
        { id: 'MANUAL', label: 'Manual' }
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
      // const response = await fetch('/api/admin/jev?...' + queryParams);
      // const result = await response.json();

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Apply filters to sample data
      let filteredData = [...sampleJournalEntries];

      if (activeFilters.search) {
        const searchTerm = activeFilters.search.toLowerCase();
        filteredData = filteredData.filter(entry =>
          entry.journal_number.toLowerCase().includes(searchTerm) ||
          entry.description.toLowerCase().includes(searchTerm) ||
          entry.reference_number?.toLowerCase().includes(searchTerm)
        );
      }

      if (activeFilters.entry_type) {
        filteredData = filteredData.filter(entry => entry.entry_type === activeFilters.entry_type);
      }

      if (activeFilters.status) {
        filteredData = filteredData.filter(entry => entry.status === activeFilters.status);
      }

      if (activeFilters.date_from) {
        filteredData = filteredData.filter(entry => entry.transaction_date >= activeFilters.date_from!);
      }

      if (activeFilters.date_to) {
        filteredData = filteredData.filter(entry => entry.transaction_date <= activeFilters.date_to!);
      }

      // Pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      setData(paginatedData);
      setTotalCount(filteredData.length);
      setTotalPages(Math.ceil(filteredData.length / pageSize));

    } catch (err) {
      console.error('Error fetching JEV data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterApply = (filters: JournalEntryFilters) => {
    setActiveFilters(filters);
    setCurrentPage(1); // Reset to first page
  };

  // Handle row click for viewing
  const handleRowClick = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setShowViewModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowViewModal(false);
    setSelectedEntry(null);
  };

  // Handle export
  const handleExport = () => {
    try {
      // Prepare CSV data
      const headers = ['JEV No.', 'Transaction Date', 'Description', 'Type', 'Status', 'Total Debit', 'Total Credit', 'Balanced'];
      const rows = data.map(entry => [
        entry.journal_number,
        formatDate(entry.transaction_date),
        entry.description,
        entry.entry_type.replace('_', ' '),
        entry.status,
        entry.total_debit.toString(),
        entry.total_credit.toString(),
        entry.is_balanced ? 'Yes' : 'No'
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `jev-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting JEV data:', err);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, activeFilters]);

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Journal Entry Vouchers</h1>
        <Loading />
      </div>
    );
  }

  // Error state
  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Journal Entry Vouchers</h1>
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

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Journal Entry Vouchers</h1>
        </div>

        {/* Filters */}
        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search JEV number, description..."
                value={activeFilters.search}
                onChange={(e) => handleFilterApply({ ...activeFilters, search: e.target.value })}
              />
            </div>

            {/* Filter button right next to search bar */}
              <FilterDropdown
                sections={filterSections}
                onApply={(filterValues) => {
                  const dateRange = filterValues.dateRange as { from: string; to: string } || { from: '', to: '' };
                  const entryTypeValue = (filterValues.entry_type as string) || '';
                  const statusValue = (filterValues.status as string) || '';
                  const sourceModuleValue = (filterValues.source_module as string) || '';
                  
                  handleFilterApply({
                    search: activeFilters.search,
                    date_from: dateRange.from || '',
                    date_to: dateRange.to || '',
                    entry_type: entryTypeValue as '' | EntryType | undefined,
                    status: statusValue as '' | JournalStatus | undefined,
                    source_module: sourceModuleValue || '',
                    account_id: ''
                  });
                }}
                initialValues={{
                  dateRange: activeFilters.date_from && activeFilters.date_to ? {
                    from: activeFilters.date_from,
                    to: activeFilters.date_to
                  } : { from: '', to: '' },
                  entry_type: activeFilters.entry_type || '',
                  status: activeFilters.status || '',
                  source_module: activeFilters.source_module || ''
                }}
                title="JEV Filters"
              />
          </div>

          {/* Export button on the right */}
          <div className="filters">
            <button onClick={handleExport} id='exportJEV' title="Export as CSV">
              <i className="ri-download-line" /> Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table jev-table">
              <thead>
                <tr>
                  <th>JEV No.</th>
                  <th>Transaction Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Total Debit</th>
                  <th>Total Credit</th>
                  <th>Balanced</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="loading-cell">
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell">
                      No journal entries found.
                    </td>
                  </tr>
                ) : (
                  data.map((entry) => (
                    <tr
                      key={entry.journal_entry_id}
                      onClick={() => handleRowClick(entry)}
                      className="jev-row"
                      title="Click to view details"
                    >
                      <td className="jev-number">{entry.journal_number}</td>
                      <td>{formatDate(entry.transaction_date)}</td>
                      <td className="jev-description">{entry.description}</td>
                      <td>
                        <span className={`chip ${entry.entry_type.toLowerCase()}`}>
                          {entry.entry_type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${entry.status.toLowerCase()}`}>
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="jev-amount">{formatMoney(entry.total_debit)}</td>
                      <td className="jev-amount">{formatMoney(entry.total_credit)}</td>
                      <td>
                        <span className={`jev-balance ${entry.is_balanced ? 'balanced' : 'unbalanced'}`}>
                          {entry.is_balanced ? '✓' : '✗'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

      </div>

      {/* View Modal */}
      {showViewModal && selectedEntry && (
        <JEVViewModal
          entry={selectedEntry}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default JEVPage;