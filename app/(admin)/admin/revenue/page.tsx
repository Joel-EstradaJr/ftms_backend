/**
 * Admin Revenue List Page - Backend Integrated
 * 
 * Displays revenue records with full backend integration:
 * - Fetches data from /api/admin/revenue
 * - Server-side pagination, search, and sorting
 * - Database-optimized queries with indexes
 * 
 * Columns: No., revenueCode, transactionDate, source, amount, paymentMethod, Actions
 */

"use client";

import React, { useState, useEffect } from "react";
import "../../../styles/revenue/revenue.css";
import "../../../styles/components/table.css";
import PaginationComponent from "../../../Components/pagination";
import RevenueFilter from "../../../Components/RevenueFilter";
import Swal from 'sweetalert2';
import { showSuccess, showError } from '../../../utils/Alerts';
import { formatDate, formatMoney } from '../../../utils/formatting';
import Loading from '../../../Components/loading';
import ErrorDisplay from '../../../Components/errordisplay';

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

interface RevenueRecord {
  id: number;
  revenueCode: string;
  transactionDate: string;
  description: string;
  amount: number;
  sourceId: number;
  source: RevenueSource;
  paymentMethodId: number;
  paymentMethod: PaymentMethod;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const AdminRevenuePage = () => {
  // State for data and UI
  const [data, setData] = useState<RevenueRecord[]>([]);
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
        throw new Error(`Failed to fetch revenue data: ${response.statusText}`);
      }

      const result = await response.json();
      
      setData(result.data || []);
      setTotalPages(result.pagination.totalPages || 1);
      setTotalCount(result.pagination.totalCount || 0);
      
    } catch (err) {
      console.error('Error fetching revenue data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      showError('Failed to load revenue data', 'Error');
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
    Swal.fire({
      title: 'View Revenue',
      html: `<p>Viewing revenue record: <strong>ID ${id}</strong></p><p><em>View modal to be implemented</em></p>`,
      icon: 'info',
      confirmButtonColor: '#961C1E',
    });
  };

  const handleEdit = (id: number) => {
    Swal.fire({
      title: 'Edit Revenue',
      html: `<p>Editing revenue record: <strong>ID ${id}</strong></p><p><em>Edit modal to be implemented</em></p>`,
      icon: 'info',
      confirmButtonColor: '#FEB71F',
    });
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the record permanently.',
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

        showSuccess('Record deleted successfully', 'Deleted');
        fetchData(); // Refresh the data
      } catch (err) {
        console.error('Error deleting revenue:', err);
        showError('Failed to delete record', 'Error');
      }
    }
  };

  const handleAdd = () => {
    Swal.fire({
      title: 'Add Revenue',
      html: '<p><em>Add modal to be implemented</em></p>',
      icon: 'info',
      confirmButtonColor: '#961C1E',
    });
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Revenue Records</h1>
        <Loading />
      </div>
    );
  }

   if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Revenue Record</h1>
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
          <h1>Revenue Records</h1> 
        </div>
            
      <div className="settings">
        {/* Search bar with Filter button inline */}
        <div className="search-filter-container">
          <div className="revenue_searchBar">
            <i className="ri-search-line" />
            <input
              className="searchInput"
              type="text"
              placeholder="Search revenue..."
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
                    onClick={() => handleSort("revenueCode")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Revenue Code"
                  >
                    Revenue Code{getSortIndicator("revenueCode")}
                  </th>
                  <th 
                    onClick={() => handleSort("transactionDate")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Transaction Date"
                  >
                    Transaction Date{getSortIndicator("transactionDate")}
                  </th>
                  <th>Source</th>
                  <th 
                    onClick={() => handleSort("amount")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
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
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                      No records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    // Calculate row number based on current page
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    
                    return (
                      <tr key={item.id}>
                        <td>{rowNumber}</td>
                        <td>{item.revenueCode}</td>
                        <td>{formatDate(item.transactionDate)}</td>
                        <td>{item.source.name}</td>
                        <td>{formatMoney(item.amount)}</td>
                        <td>{item.paymentMethod.methodName}</td>
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            {/* View button */}
                            <button 
                              className="viewBtn" 
                              onClick={() => handleView(item.id)} 
                              title="View Record"
                            >
                              <i className="ri-eye-line" />
                            </button>
                            
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
    </div>
  );
};

export default AdminRevenuePage;
