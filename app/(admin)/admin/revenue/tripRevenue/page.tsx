/**
 * Admin Trip Revenue Page - Backend Integrated
 *
 * Displays bus trip records with revenue recording capability:
 * - Fetches data from /api/admin/revenue/bus-trips
 * - Server-side pagination, search, and sorting
 * - Database-optimized queries with indexes
 *
 * Columns: No., Assignment ID, Bus Route, Date Assigned, Trip Revenue, Driver, Conductor, Status, Actions
 */

"use client";

import React, { useState, useEffect } from "react";
import "../../../../styles/revenue/revenue.css";
import "../../../../styles/revenue/recordRevenue.css";
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";
import PaginationComponent from "../../../../Components/pagination";
import RevenueFilter from "../../../../Components/RevenueFilter";
import RecordRevenue, { RecordRevenueData } from "./recordRevenue";
import Swal from 'sweetalert2';
import { showSuccess, showError } from '../../../../utils/Alerts';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';

// TypeScript interfaces
interface BusTripRecord {
  id: number;
  assignmentId: string;
  busTripId: string;
  busRoute: string;
  dateAssigned: string;
  tripRevenue: number;
  tripFuelExpense: number;
  assignmentType: string;
  assignmentValue: string;
  paymentMethod: string;
  driverName: string;
  conductorName: string;
  driverEmployeeNumber: string;
  conductorEmployeeNumber: string;
  busPlateNumber: string;
  busType: string;
  bodyNumber: string;
  isRevenueRecorded: boolean;
  isExpenseRecorded: boolean;
  tripStatus: string;
}

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

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const AdminTripRevenuePage = () => {
  // State for data and UI
  const [data, setData] = useState<BusTripRecord[]>([]);
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
  const [sortBy, setSortBy] = useState<"assignmentId" | "dateAssigned" | "tripRevenue">("dateAssigned");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [modalMode, setModalMode] = useState<'record' | 'edit' | 'view'>('record');
  const [selectedTrip, setSelectedTrip] = useState<BusTripRecord | null>(null);
  const [existingRecordData, setExistingRecordData] = useState<RecordRevenueData | null>(null);

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
        includeRecorded: 'true', // Include both recorded and unrecorded
      });

      // Add search parameter if exists
      if (search) {
        params.append('search', search);
      }

      // Add filter parameters
      if (activeFilters.dateRange && typeof activeFilters.dateRange === 'object') {
        const dateRange = activeFilters.dateRange as { from: string; to: string };
        if (dateRange.from) {
          params.append('dateFrom', dateRange.from);
        }
        if (dateRange.to) {
          params.append('dateTo', dateRange.to);
        }
      }

      // Fetch from API
      const response = await fetch(`/api/admin/revenue/bus-trips?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch bus trip data: ${response.statusText}`);
      }

      const result = await response.json();

      setData(result.busTrips || []);
      setTotalPages(Math.ceil((result.count || 0) / pageSize));
      setTotalCount(result.count || 0);

    } catch (err) {
      console.error('Error fetching bus trip data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      showError('Failed to load bus trip data', 'Error');
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

  // Sort handler
  const handleSort = (field: "assignmentId" | "dateAssigned" | "tripRevenue") => {
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
  const handleView = (busTrip: BusTripRecord) => {
    setSelectedTrip(busTrip);
    setModalMode('view');
    setShowRecordModal(true);
    // TODO: Fetch existing record data if available
    setExistingRecordData(null);
  };

  const handleRecordRevenue = (busTrip: BusTripRecord) => {
    setSelectedTrip(busTrip);
    setModalMode('record');
    setShowRecordModal(true);
    setExistingRecordData(null);
  };

  const handleEditRevenue = (busTrip: BusTripRecord) => {
    setSelectedTrip(busTrip);
    setModalMode('edit');
    setShowRecordModal(true);
    // TODO: Fetch existing record data
    setExistingRecordData(null);
  };

  const handleModalSubmit = async (data: RecordRevenueData) => {
    // TODO: Guide for backend developer - The recorded_by and recorded_date fields are now automatically prefilled
    // and disabled in the frontend. Backend should validate these fields and ensure they are properly stored.
    // recorded_by should match the authenticated user, and recorded_date should be the current date.
    try {
      let response;
      if (modalMode === 'record') {
        // Create new revenue record
        response = await fetch('/api/admin/revenue/trip-records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            trip_id: selectedTrip?.busTripId,
          }),
        });
      } else if (modalMode === 'edit') {
        // Update existing revenue record
        response = await fetch(`/api/admin/revenue/trip-records/${data.trip_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      }

      if (!response!.ok) {
        throw new Error(`Failed to ${modalMode} revenue record`);
      }

      showSuccess(`Revenue record ${modalMode === 'record' ? 'created' : 'updated'} successfully`, 'Success');
      fetchData(); // Refresh the data
    } catch (err) {
      console.error(`Error ${modalMode}ing revenue record:`, err);
      showError(`Failed to ${modalMode} revenue record`, 'Error');
    }
  };

  const handleModalClose = () => {
    setShowRecordModal(false);
    setSelectedTrip(null);
    setExistingRecordData(null);
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Trip Revenue Records</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Trip Revenue Records</h1>
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
          <h1>Trip Revenue Records</h1>
        </div>

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="revenue_searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search bus trips..."
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
                  <th>Bus Route</th>
                  <th
                    onClick={() => handleSort("dateAssigned")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Date Assigned"
                  >
                    Date Assigned{getSortIndicator("dateAssigned")}
                  </th>
                  <th
                    onClick={() => handleSort("tripRevenue")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Trip Revenue"
                  >
                    Trip Revenue{getSortIndicator("tripRevenue")}
                  </th>
                  <th>Driver</th>
                  <th>Conductor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                      No bus trip records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    // Calculate row number based on current page
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;

                    return (
                      <tr key={item.id}>
                        <td>{item.busRoute}</td>
                        <td>{formatDate(item.dateAssigned)}</td>
                        <td>{formatMoney(item.tripRevenue)}</td>
                        <td>{item.driverName}</td>
                        <td>{item.conductorName}</td>
                        <td>
                          <span className={`chip ${item.isRevenueRecorded ? 'completed' : 'pending'}`}>
                            {item.isRevenueRecorded ? 'Revenue Recorded' : 'Pending'}
                          </span>
                        </td>
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            {/* View button */}
                            <button
                              className="viewBtn"
                              onClick={() => handleView(item)}
                              title="View Trip Details"
                            >
                              <i className="ri-eye-line" />
                            </button>

                            {/* Record Revenue button - only if not recorded */}
                            {!item.isRevenueRecorded && (
                              <button
                                className="editBtn"
                                onClick={() => handleRecordRevenue(item)}
                                title="Record Revenue"
                              >
                                <i className="ri-cash-line" />
                              </button>
                            )}

                            {/* Edit Revenue button - only if recorded */}
                            {item.isRevenueRecorded && (
                              <button
                                className="editBtn"
                                onClick={() => handleEditRevenue(item)}
                                title="Edit Revenue Record"
                              >
                                <i className="ri-edit-line" />
                              </button>
                            )}

                            {/* Placeholder for delete if needed */}
                            {item.isRevenueRecorded && (
                              <button
                                className="deleteBtn"
                                onClick={() => Swal.fire('Delete', 'Delete functionality to be implemented', 'info')}
                                title="Delete Record"
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            )}
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

      {/* Record Revenue Modal */}
      {showRecordModal && selectedTrip && (
        <RecordRevenue
          mode={modalMode}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
          tripData={{
            trip_id: selectedTrip.busTripId,
            route: selectedTrip.busRoute,
            bus_number: selectedTrip.bodyNumber,
            trip_date: selectedTrip.dateAssigned,
            total_revenue: selectedTrip.tripRevenue,
            driver_name: selectedTrip.driverName,
            conductor_name: selectedTrip.conductorName,
          }}
          existingData={existingRecordData}
          currentUser="admin" // TODO: Guide for backend developer - Replace hardcoded "admin" with actual authenticated user
          // Backend should provide user authentication context or API endpoint to get current user info
        />
      )}

    </div>
  );
};

export default AdminTripRevenuePage;