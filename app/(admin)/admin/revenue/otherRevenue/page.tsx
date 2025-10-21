/**
 * Admin Other Revenue Page - Backend Integrated
 *
 * Displays miscellaneous revenue records (excluding bus trips and rentals):
 * - Fetches data from /api/admin/revenue (excluding main categories)
 * - Server-side pagination, search, and sorting
 * - Analytics: Revenue breakdown by source type
 * - Database-optimized queries with indexes
 *
 * Columns: No., revenueCode, transactionDate, source, description, amount, paymentMethod, Actions
 */

"use client";

import React, { useState, useEffect } from "react";
import "../../../../styles/revenue/revenue.css";
import "../../../../styles/revenue/otherRevenue.css";
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";
import PaginationComponent from "../../../../Components/pagination";
import RevenueFilter from "../../../../Components/RevenueFilter";
import Swal from 'sweetalert2';
import { showSuccess, showError } from '../../../../utils/Alerts';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import OtherRevenueModal, { OtherRevenueData } from './otherRevenueModal';

// TypeScript interfaces
interface RevenueSource {
  id: number;
  name: string;
  sourceCode: string;
}

interface PaymentMethod {
  id: number;
  methodName: string;
  methodCode: string;
}

interface OtherRevenueRecord {
  id: number;
  revenueCode: string;
  transactionDate: string;
  description: string;
  amount: number;
  sourceId: number;
  source: RevenueSource;
  paymentMethodId: number;
  paymentMethod: PaymentMethod;
  externalRefType: string;
  externalRefId: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface RevenueAnalytics {
  totalRevenue: number;
  transactionCount: number;
  topSources: Array<{
    sourceName: string;
    amount: number;
  }>;
}

const AdminOtherRevenuePage = () => {
  // State for data and UI
  const [data, setData] = useState<OtherRevenueRecord[]>([]);
  const [analytics, setAnalytics] = useState<RevenueAnalytics>({
    totalRevenue: 0,
    transactionCount: 0,
    topSources: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Filter options state
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Search and filter states
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For debouncing
  const [activeFilters, setActiveFilters] = useState<{
    sources: string[];
    paymentMethods: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
  }>({
    sources: [],
    paymentMethods: [],
    dateRange: { from: '', to: '' },
    amountRange: { from: '', to: '' }
  });

  // Sort states
  const [sortBy, setSortBy] = useState<"revenueCode" | "transactionDate" | "amount">("transactionDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // UI states
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Modal states
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<OtherRevenueRecord | null>(null);

  // Fetch filter options (revenue sources and payment methods)
  const fetchFilterOptions = async () => {
    try {
      // Fetch revenue sources
      const sourcesResponse = await fetch('/api/admin/revenue-sources');
      if (sourcesResponse.ok) {
        const sourcesData = await sourcesResponse.json();
        setRevenueSources(sourcesData.data || []);
      }

      // Fetch payment methods
      const methodsResponse = await fetch('/api/admin/payment-methods');
      if (methodsResponse.ok) {
        const methodsData = await methodsResponse.json();
        setPaymentMethods(methodsData.data || []);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      // Calculate analytics from current data
      const totalRevenue = data.reduce((sum, record) => sum + record.amount, 0);

      // Calculate top sources
      const sourceMap = new Map<string, number>();
      data.forEach(record => {
        const sourceName = record.source.name;
        const currentAmount = sourceMap.get(sourceName) || 0;
        sourceMap.set(sourceName, currentAmount + record.amount);
      });

      const topSources = Array.from(sourceMap.entries())
        .map(([sourceName, amount]) => ({ sourceName, amount }))
        .sort((a, b) => b.amount - a.amount); // Sort by amount descending

      setAnalytics({
        totalRevenue,
        transactionCount: data.length,
        topSources
      });
    } catch (err) {
      console.error('Error calculating analytics:', err);
    }
  };

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: sortBy,
        order: sortOrder,
        excludeSources: 'BUS_TRIP,RENTAL', // Exclude main categories
      });

      // Add search parameter if exists
      if (search) {
        params.append('search', search);
      }

      // Add filter parameters
      if (activeFilters.sources && Array.isArray(activeFilters.sources) && activeFilters.sources.length > 0) {
        params.append('sources', activeFilters.sources.join(','));
      }

      if (activeFilters.paymentMethods && Array.isArray(activeFilters.paymentMethods) && activeFilters.paymentMethods.length > 0) {
        params.append('paymentMethods', activeFilters.paymentMethods.join(','));
      }

      if (activeFilters.dateRange && typeof activeFilters.dateRange === 'object') {
        const dateRange = activeFilters.dateRange as { from: string; to: string };
        if (dateRange.from) {
          params.append('dateFrom', dateRange.from);
        }
        if (dateRange.to) {
          params.append('dateTo', dateRange.to);
        }
      }

      if (activeFilters.amountRange && typeof activeFilters.amountRange === 'object') {
        const amountRange = activeFilters.amountRange as { from: string; to: string };
        if (amountRange.from) {
          params.append('amountFrom', amountRange.from);
        }
        if (amountRange.to) {
          params.append('amountTo', amountRange.to);
        }
      }

      // Fetch from API
      const response = await fetch(`/api/admin/revenue?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch other revenue data: ${response.statusText}`);
      }

      const result = await response.json();

      setData(result.data || []);
      setTotalPages(result.pagination.totalPages || 1);
      setTotalCount(result.pagination.totalCount || 0);

    } catch (err) {
      console.error('Error fetching other revenue data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      showError('Failed to load other revenue data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, search, sortBy, sortOrder, activeFilters]);

  // Fetch analytics when data changes
  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
    }
  }, [data, loading]);

  // Sort handler
  const handleSort = (field: "revenueCode" | "transactionDate" | "amount") => {
    if (sortBy === field) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column - default to desc
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1); // Reset to first page
  };

  // Get sort indicator for column
  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  // Handle filter apply
  const handleFilterApply = (filterValues: {
    sources: string[];
    paymentMethods: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
  }) => {
    setActiveFilters(filterValues);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Action handlers
  const handleAdd = () => {
    setSelectedRecord(null);
    setModalMode('add');
  };

  const handleView = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      setSelectedRecord(record);
      setModalMode('view');
    }
  };

  const handleEdit = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      setSelectedRecord(record);
      setModalMode('edit');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the revenue record permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      confirmButtonText: 'Yes, delete it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/revenue/${id}?userId=admin`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete revenue');
        }

        showSuccess('Revenue record deleted successfully', 'Deleted');
        fetchData(); // Refresh the data
      } catch (err) {
        console.error('Error deleting revenue:', err);
        showError('Failed to delete revenue record', 'Error');
      }
    }
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Other Revenue Records</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Other Revenue Records</h1>
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
          <h1>Other Revenue Records</h1>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="analytics-toggle-btn"
            title={showAnalytics ? "Hide Analytics" : "Show Analytics"}
          >
            <i className={showAnalytics ? "ri-eye-line" : "ri-eye-off-line"} />
          </button>
        </div>

        {showAnalytics && (
          <>
            {/* Analytics Cards */}
            <div className="analytics-grid">
              <div className="analytics-card total-revenue">
                <h3>Total Revenue</h3>
                <p>
                  {formatMoney(analytics.totalRevenue)}
                </p>
                <small>Other revenue sources</small>
              </div>

              <div className="analytics-card transactions">
                <h3>Transactions</h3>
                <p>
                  {analytics.transactionCount}
                </p>
                <small>Total records</small>
              </div>

              <div className="analytics-card top-sources">
                <h3>Top Revenue Sources</h3>
                <div className="top-sources-container">
                  {analytics.topSources.length === 0 ? (
                    <div className="no-data-message">
                      No data available
                    </div>
                  ) : (
                    analytics.topSources.map((source, index) => (
                      <div key={source.sourceName} className="top-sources-item">
                        <span className="source-name">{source.sourceName}</span>
                        <span className="source-amount">{formatMoney(source.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="revenue_searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search other revenue..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Filter button right next to search bar */}
            <RevenueFilter
              sources={revenueSources.map(source => ({
                id: source.id.toString(),
                label: source.name
              }))}
              paymentMethods={paymentMethods.map(method => ({
                id: method.id.toString(),
                label: method.methodName
              }))}
              onApply={handleFilterApply}
              initialValues={activeFilters}
            />
          </div>

          {/* Add Revenue Button on the right */}
          <div className="filters">
            <button onClick={handleAdd} id='addRevenue'>
              <i className="ri-add-line" /> Add Revenue
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th
                    onClick={() => handleSort("transactionDate")}
                    className="sortable-header"
                    title="Click to sort by Transaction Date"
                  >
                    Transaction Date{getSortIndicator("transactionDate")}
                  </th>
                  <th>Source</th>
                  <th>Description</th>
                  <th
                    onClick={() => handleSort("amount")}
                    className="sortable-header"
                    title="Click to sort by Amount"
                  >
                    Amount{getSortIndicator("amount")}
                  </th>
                  <th>Payment Method</th>
                  <th>Actions</th>
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
                      No other revenue records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    // Calculate row number based on current page
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;

                    return (
                      <tr key={item.id} onClick={() => handleView(item.id)} title="View Record">
                        <td>{rowNumber}</td>
                        <td>{formatDate(item.transactionDate)}</td>
                        <td>{item.source.name}</td>
                        <td>{item.description || 'N/A'}</td>
                        <td>{formatMoney(item.amount)}</td>
                        <td>{item.paymentMethod.methodName}</td>
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            {/* Edit button */}
                            <button
                              className="editBtn"
                              onClick={() => handleEdit(item.id)}
                              title="Edit Record"
                            >
                              <i className="ri-edit-2-line" />
                            </button>

                            {/* Delete button */}
                            <button
                              className="deleteBtn"
                              onClick={() => handleDelete(item.id)}
                              title="Delete Record"
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
                          </div>
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
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

      </div>

      {/* Other Revenue Modal */}
      {modalMode && (
        <OtherRevenueModal
          mode={modalMode}
          existingData={selectedRecord ? {
            id: selectedRecord.id,
            revenueCode: selectedRecord.revenueCode,
            sourceName: selectedRecord.source.name, // Changed from sourceId to sourceName
            description: selectedRecord.description,
            amount: selectedRecord.amount,
            transactionDate: selectedRecord.transactionDate,
            paymentMethodId: selectedRecord.paymentMethodId,
            externalRefType: selectedRecord.externalRefType,
            externalRefId: selectedRecord.externalRefId,
            createdBy: 'admin', // Default value since not in record
          } : null}
          onClose={() => {
            setModalMode(null);
            setSelectedRecord(null);
          }}
          onSubmit={async (data: OtherRevenueData) => {
            try {
              const method = modalMode === 'add' ? 'POST' : 'PUT';
              const url = modalMode === 'add' 
                ? '/api/admin/revenue?userId=admin' 
                : `/api/admin/revenue/${selectedRecord?.id}?userId=admin`;

              // TODO: Backend needs to handle sourceName instead of sourceId
              // The API should either:
              // 1. Accept sourceName and resolve to existing sourceId, or
              // 2. Create new revenue source if it doesn't exist
              const payload = {
                ...data,
                // For now, try to find existing source or use the name directly
                sourceId: revenueSources.find(s => s.name === data.sourceName)?.id || 0,
                sourceName: data.sourceName // Include both for backward compatibility
              };

              const response = await fetch(url, {
                method,
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                throw new Error(`Failed to ${modalMode} revenue`);
              }

              showSuccess(`Revenue record ${modalMode === 'add' ? 'added' : 'updated'} successfully`, modalMode === 'add' ? 'Added' : 'Updated');
              fetchData(); // Refresh data
              setModalMode(null);
              setSelectedRecord(null);
            } catch (err) {
              console.error(`Error ${modalMode}ing revenue:`, err);
              showError(`Failed to ${modalMode} revenue record`, 'Error');
            }
          }}
          revenueSources={revenueSources}
          paymentMethods={paymentMethods}
          currentUser="admin"
        />
      )}
    </div>
  );
};

export default AdminOtherRevenuePage;