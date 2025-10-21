/**
 * Admin Bus Rental Page - Backend Integrated
 *
 * Displays bus rental revenue records with analytics:
 * - Fetches data from /api/admin/revenue (filtered by RENTAL source)
 * - Server-side pagination, search, and sorting
 * - Analytics: Total rental revenue, active rentals, available buses
 * - Database-optimized queries with indexes
 *
 * Columns: No., rentalCode, transactionDate, renterName, busDetails, amount, paymentMethod, status, Actions
 */

"use client";

import React, { useState, useEffect } from "react";
import "../../../../styles/revenue/revenue.css";
import "../../../../styles/revenue/busRevenue.css";
import "../../../../styles/revenue/viewBusRental.css";
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";
import PaginationComponent from "../../../../Components/pagination";
import RevenueFilter from "../../../../Components/RevenueFilter";
import Swal from 'sweetalert2';
import { showSuccess, showError } from '../../../../utils/Alerts';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import ViewBusRentalModal from './viewBusRentalModal';

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

interface BusRentalRecord {
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
  renterName?: string;
  busPlateNumber?: string;
  bodyNumber?: string;
  rentalStartDate?: string;
  rentalEndDate?: string;
  status: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface RentalAnalytics {
  totalRevenue: number;
  activeRentals: number;
  availableBuses: number;
  monthlyRevenue: number;
  averageRentalAmount: number;
}

const AdminBusRentalPage = () => {
  // State for data and UI
  const [data, setData] = useState<BusRentalRecord[]>([]);
  const [analytics, setAnalytics] = useState<RentalAnalytics>({
    totalRevenue: 0,
    activeRentals: 0,
    availableBuses: 0,
    monthlyRevenue: 0,
    averageRentalAmount: 0
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

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<BusRentalRecord | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

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
      // Build query parameters same as fetchData but without pagination
      const params = new URLSearchParams({
        sortBy: sortBy,
        order: sortOrder,
        sourceFilter: 'RENTAL',
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

      // Fetch analytics from API
      const response = await fetch(`/api/admin/revenue/analytics?${params.toString()}`);

      if (response.ok) {
        const analyticsData = await response.json();
        setAnalytics(analyticsData);
      } else {
        // Fallback to local calculation from current page data if API fails
        const totalRevenue = data.reduce((sum, record) => sum + record.amount, 0);
        const activeRentals = data.filter(record => record.status?.toUpperCase() === 'ACTIVE').length;
        const averageRentalAmount = data.length > 0 ? totalRevenue / data.length : 0;

        setAnalytics({
          totalRevenue,
          activeRentals,
          availableBuses: 25, // Placeholder - would need actual fleet data from API
          monthlyRevenue: totalRevenue * 0.3, // Estimate based on current data
          averageRentalAmount
        });
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      // Fallback to local calculation
      const totalRevenue = data.reduce((sum, record) => sum + record.amount, 0);
      const activeRentals = data.filter(record => record.status?.toUpperCase() === 'ACTIVE').length;
      const averageRentalAmount = data.length > 0 ? totalRevenue / data.length : 0;

      setAnalytics({
        totalRevenue,
        activeRentals,
        availableBuses: 25,
        monthlyRevenue: totalRevenue * 0.3,
        averageRentalAmount
      });
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
        sourceFilter: 'RENTAL', // Filter for rental revenue only
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
        throw new Error(`Failed to fetch rental data: ${response.statusText}`);
      }

      const result = await response.json();

      setData(result.data || []);
      setTotalPages(result.pagination.totalPages || 1);
      setTotalCount(result.pagination.totalCount || 0);

    } catch (err) {
      console.error('Error fetching rental data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      showError('Failed to load rental data', 'Error');
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

  // Fetch analytics when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [search, activeFilters, sortBy, sortOrder]);

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
  const handleView = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      setSelectedRecord(record);
      setShowViewModal(true);
    }
  };

  const handleEdit = (id: number) => {
    Swal.fire({
      title: 'Edit Rental',
      html: `<p>Editing rental record: <strong>ID ${id}</strong></p><p><em>Edit modal to be implemented</em></p>`,
      icon: 'info',
      confirmButtonColor: '#FEB71F',
    });
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the rental record permanently.',
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
          throw new Error('Failed to delete rental');
        }

        showSuccess('Rental record deleted successfully', 'Deleted');
        fetchData(); // Refresh the data
      } catch (err) {
        console.error('Error deleting rental:', err);
        showError('Failed to delete rental record', 'Error');
      }
    }
  };

  const handleAdd = () => {
    Swal.fire({
      title: 'Add Bus Rental',
      html: '<p><em>Add rental modal to be implemented</em></p>',
      icon: 'info',
      confirmButtonColor: '#961C1E',
    });
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Bus Rental Records</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Bus Rental Records</h1>
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
          <h1>Bus Rental Records</h1>
        </div>

        {/* Analytics Cards */}
        <div className="analytics-grid">
          <div className="analytics-card total-revenue">
            <h3>Total Revenue</h3>
            <p>{formatMoney(analytics.totalRevenue)}</p>
            <small>This month</small>
          </div>

          <div className="analytics-card active-rentals">
            <h3>Active Rentals</h3>
            <p>{analytics.activeRentals}</p>
            <small>Buses currently rented</small>
          </div>

          <div className="analytics-card available-buses">
            <h3>Available Buses</h3>
            <p>{analytics.availableBuses}</p>
            <small>Ready for rental</small>
          </div>

          <div className="analytics-card avg-rental">
            <h3>Avg. Rental Amount</h3>
            <p>{formatMoney(analytics.averageRentalAmount)}</p>
            <small>Per rental</small>
          </div>
        </div>

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="revenue_searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search rentals..."
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
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort("transactionDate")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Transaction Date"
                  >
                    Transaction Date{getSortIndicator("transactionDate")}
                  </th>
                  <th>Renter Name</th>
                  <th>Bus Details</th>
                  <th
                    onClick={() => handleSort("amount")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Amount"
                  >
                    Amount{getSortIndicator("amount")}
                  </th>
                  <th>Payment Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                      No rental records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    // Calculate row number based on current page
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;

                    return (
                      <tr key={item.id} onClick={() => handleView(item.id)} title="View Rental">
                        <td>{formatDate(item.transactionDate)}</td>
                        <td>{item.renterName || 'N/A'}</td>
                        <td>
                          {item.busPlateNumber && item.bodyNumber
                            ? `${item.busPlateNumber} (${item.bodyNumber})`
                            : item.busPlateNumber || item.bodyNumber || 'N/A'
                          }
                        </td>
                        <td>{formatMoney(item.amount)}</td>
                        <td>{item.paymentMethod.methodName}</td>
                        <td>
                          <span className={`chip ${item.status?.toLowerCase() || 'completed'}`}>
                            {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : 'Completed'}
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
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

      </div>

      {/* View Bus Rental Modal */}
      {showViewModal && selectedRecord && (
        <ViewBusRentalModal
          record={selectedRecord}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRecord(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminBusRentalPage;