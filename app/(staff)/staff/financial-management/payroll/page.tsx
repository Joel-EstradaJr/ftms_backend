// financial-management\payroll\page.tsx
"use client";

import React, { useState, useEffect, useCallback} from "react";
import "../../../../styles/payroll/payroll.css";
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";
import PaginationComponent from "../../../../Components/pagination";
import Loading from '../../../../Components/loading';
import Swal from 'sweetalert2';
import { showSuccess } from '../../../../utility/Alerts';
import ViewPayrollModal from "./viewPayroll";
import { endOfMonth, format, getDaysInMonth } from 'date-fns';

// Individual employee payroll record type
type PayrollRecord = {
  payroll_id: string;
  employee_number: string;
  employee_name: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  employee_status: string;
  hire_date: string;
  termination_date?: string | null;
  job_title: string;
  department: string;
  payroll_period: "Monthly" | "Semi-Monthly" | "Weekly";
  payroll_start_date: string;
  payroll_end_date: string;
  basic_rate: number;
  days_worked: number;
  // Earnings
  basic_pay: number;
  overtime_regular: number;
  overtime_holiday: number;
  service_incentive_leave: number;
  holiday_pay: number;
  thirteenth_month_pay: number;
  // Benefits
  revenue_benefit: number;
  safety_benefit: number;
  additional_benefits: number;
  // Deductions
  sss_deduction: number;
  philhealth_deduction: number;
  pag_ibig_deduction: number;
  cash_advance: number;
  damage_shortage: number;
  other_deductions: number;
  // Totals
  gross_total_earnings: number;
  total_deductions: number;
  net_pay: number;
  // Status
  status: "Released" | "Pending" | string;
  date_released?: string | null;
  created_by?: string;
  // New fields for signature/remarks
  signature?: string;
  remarks?: string;
  holiday_adjustment?: number;
  allowance?: number;
  total_salary?: number;
};

// Payroll period group type for the main table
type PayrollPeriodGroup = {
  period_id: string;
  cut_off_period: string; // e.g., "June 1 – 30, 2025"
  payroll_type: "Monthly" | "Semi-Monthly" | "Weekly";
  start_date: string;
  end_date: string;
  employees_covered: number;
  status: "Released" | "Pending";
  total_payroll_amount: number;
  records: PayrollRecord[];
};

interface PayrollGenError {
  employee: string;
  reason: string;
}

interface PayrollGenSummary {
  generated: number;
  skipped: number;
  errors: PayrollGenError[];
}

// Define EligibleEmployee type
interface EligibleEmployee {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  position?: {
    positionName?: string;
    department?: { departmentName?: string };
  };
  payrollPeriod?: string;
}

const PayrollPage = () => {
  // State
  const [data, setData] = useState<PayrollRecord[]>([]);
  const [groupedData, setGroupedData] = useState<PayrollPeriodGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [payrollTypeFilter, setPayrollTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // View Payroll modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [periodToView, setPeriodToView] = useState<PayrollPeriodGroup | null>(null);

  // Payroll Generation Modal
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genStart, setGenStart] = useState("");
  const [genEnd, setGenEnd] = useState("");
  const [genPeriodType, setGenPeriodType] = useState("monthly");
  const [genLoading, setGenLoading] = useState(false);

  const [genError, setGenError] = useState<string | null>(null);

  // Add state for eligible employees and selection
  const [eligibleEmployees, setEligibleEmployees] = useState<EligibleEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Add state for export modal
  const [exportingPeriod, setExportingPeriod] = useState<PayrollPeriodGroup | null>(null);

  // Add state for semi-monthly selection
  const [semiMonthPart, setSemiMonthPart] = useState<'first' | 'second'>('first');

  // Add state for results modal
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [resultsData, setResultsData] = useState<PayrollGenSummary | null>(null);

  // Function to group payroll records by period
  const groupPayrollRecords = useCallback((records: PayrollRecord[]): PayrollPeriodGroup[] => {
    const groups: { [key: string]: PayrollPeriodGroup } = {};

    records.forEach(record => {
      const key = `${record.payroll_start_date}_${record.payroll_end_date}_${record.payroll_period}`;
      
      if (!groups[key]) {
        const startDate = new Date(record.payroll_start_date);
        const endDate = new Date(record.payroll_end_date);
        
        groups[key] = {
          period_id: key,
          cut_off_period: `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          payroll_type: record.payroll_period,
          start_date: record.payroll_start_date,
          end_date: record.payroll_end_date,
          employees_covered: 0,
          status: record.status as "Released" | "Pending",
          total_payroll_amount: 0,
          records: []
        };
      }
      
      groups[key].records.push(record);
      groups[key].employees_covered += 1;
      groups[key].total_payroll_amount += record.net_pay;
      
      // If any record is pending, the group is pending
      if (record.status === "Pending") {
        groups[key].status = "Pending";
      }
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, []);

  // Fetch payroll data from API
  const fetchPayrollData = useCallback(async (isSearch = false) => {
    try {
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const response = await fetch(`/api/payroll?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const records = result.data || [];
      setData(records);
      
      // Group the records
      const grouped = groupPayrollRecords(records);
      setGroupedData(grouped);
      
      setTotalPages(result.pagination?.totalPages || 1);
      
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching payroll data:", err);
      setError("Error retrieving payroll data.");
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [currentPage, pageSize, search, groupPayrollRecords]);

  // Fetch data when component mounts or filters change
  useEffect(() => {
    fetchPayrollData(false);
  }, [fetchPayrollData]);

  // Separate effect for search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchPayrollData(true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search, currentPage, fetchPayrollData]);

  // Effect to handle page changes
  useEffect(() => {
    if (currentPage !== 1) {
      fetchPayrollData(false);
    }
  }, [currentPage, pageSize, fetchPayrollData]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setSearch(e.target.value);
  };

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Handle key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearch("");
  };

  // Handle retry
  const handleRetry = () => {
    fetchPayrollData(false);
  };

  // Filter logic for client-side filtering
  const filteredData = groupedData.filter(item =>
    (!statusFilter || item.status.toLowerCase() === statusFilter.toLowerCase()) &&
    (!payrollTypeFilter || item.payroll_type.toLowerCase() === payrollTypeFilter.toLowerCase()) &&
    (!search || (
      item.cut_off_period.toLowerCase().includes(search.toLowerCase()) ||
      item.payroll_type.toLowerCase().includes(search.toLowerCase())
    ))
  );

  // Unique payroll types for filter dropdowns
  const payrollTypes = Array.from(new Set(groupedData.map((d) => d.payroll_type)));

  const handleReleaseWithConfirm = (periodIds: string[]) => {
    Swal.fire({
      title: 'Confirm Release',
      text: 'Are you sure you want to release these payroll periods?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Release',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      background: 'white',
    }).then((result) => {
      if (result.isConfirmed) {
        handleRelease(periodIds);
      }
    });
  };

  // Handle release action
  const handleRelease = async (periodIds: string[]) => {
    if (periodIds.length === 0) return;
    try {
      // Get all records from the selected periods
      const recordsToRelease = data.filter(record => 
        periodIds.some(periodId => {
          const [start, end, period] = periodId.split('_');
          return record.payroll_start_date === start && 
                 record.payroll_end_date === end && 
                 record.payroll_period === period;
        })
      );
      
      await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordsToRelease),
      });
      await fetchPayrollData(false);
      showSuccess('Payroll periods released!', 'Success');
    } catch {
      setError('Failed to release payroll periods');
    }
  };

  // Fetch eligible employees from HR for the selected period and payroll period
  const fetchEligibleEmployees = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    setEligibleEmployees([]);
    setSelectedEmployees([]);
    try {
      const res = await fetch(`/api/payroll/eligible-employees?start=${genStart}&end=${genEnd}&payrollPeriod=${genPeriodType}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch employees");
      
      const employees = data.employees as EligibleEmployee[];
      setEligibleEmployees(employees);
      
      if (employees.length === 0) {
        setPreviewError(`No eligible employees found for ${genPeriodType} payroll period. Please check employee configurations.`);
      } else {
        setSelectedEmployees(employees.map((e) => e.employeeNumber));
      }
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : "Failed to fetch employees");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle select/deselect all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(eligibleEmployees.map(e => e.employeeNumber));
    } else {
      setSelectedEmployees([]);
    }
  };

  // Handle individual checkbox
  const handleSelectEmployee = (empNum: string, checked: boolean) => {
    setSelectedEmployees(prev =>
      checked ? [...prev, empNum] : prev.filter(e => e !== empNum)
    );
  };

  // Enhanced payroll generation handler
  const handleGeneratePayroll = async () => {
    setGenLoading(true);
    setGenError(null);
    try {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: genStart, end: genEnd, periodType: genPeriodType, employees: selectedEmployees }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unknown error");
      setResultsData(data as PayrollGenSummary);
      setResultsModalOpen(true);
      fetchPayrollData(false);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Failed to generate payroll");
    } finally {
      setGenLoading(false);
    }
  };

  // Helper for month picker
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month] = e.target.value.split('-');
    const firstDay = new Date(Number(year), Number(month) - 1, 1);
    const lastDay = endOfMonth(firstDay);
    setGenStart(format(firstDay, 'yyyy-MM-dd'));
    setGenEnd(format(lastDay, 'yyyy-MM-dd'));
  };

  // Helper for semi-monthly picker
  const handleSemiMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month] = e.target.value.split('-');
    if (semiMonthPart === 'first') {
      setGenStart(format(new Date(Number(year), Number(month) - 1, 1), 'yyyy-MM-dd'));
      setGenEnd(format(new Date(Number(year), Number(month) - 1, 15), 'yyyy-MM-dd'));
    } else {
      const lastDay = getDaysInMonth(new Date(Number(year), Number(month) - 1));
      setGenStart(format(new Date(Number(year), Number(month) - 1, 16), 'yyyy-MM-dd'));
      setGenEnd(format(new Date(Number(year), Number(month) - 1, lastDay), 'yyyy-MM-dd'));
    }
  };

  // Helper for week picker
  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, week] = e.target.value.split('-W');
    const firstDay = new Date(Number(year), 0, 1 + (Number(week) - 1) * 7);
    // Adjust to Monday
    const day = firstDay.getDay();
    const monday = new Date(firstDay);
    monday.setDate(firstDay.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setGenStart(format(monday, 'yyyy-MM-dd'));
    setGenEnd(format(sunday, 'yyyy-MM-dd'));
  };

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Payroll Management</h1>
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h1 className="title">Payroll Management</h1>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <p>{error}</p>
          <button onClick={handleRetry} style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Payroll Management</h1>
        </div>

        {/* Payroll Generation Button */}
        <div style={{ marginBottom: 16 }}>
          <button className="releaseAllBtn" onClick={() => setGenModalOpen(true)}>
            <i className="ri-add-line" /> Generate Payroll
          </button>
        </div>

        <div className="settings">
          <div className="searchBar">
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              <i className="ri-search-line" />
              <input
                type="text"
                placeholder="Search here..."
                value={search}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyPress}
                disabled={searchLoading}
              />
              {searchLoading && (
                <div style={{ marginLeft: '8px', color: '#666' }}>
                  <i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}
              {search && !searchLoading && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </form>
          </div>

          <div className="filters">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filterSelect"
            >
              <option value="">All Status</option>
              <option key="pending" value="pending">Pending</option>
              <option key="released" value="released">Released</option>
            </select>

            <select
              value={payrollTypeFilter}
              onChange={(e) => setPayrollTypeFilter(e.target.value)}
              className="filterSelect"
            >
              <option value="">All Payroll Types</option>
              {payrollTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <button
              className="releaseAllBtn"
              disabled={filteredData.filter(r => r.status === "Pending").length === 0}
              onClick={() => handleReleaseWithConfirm(filteredData.filter(r => r.status === "Pending").map(r => r.period_id))}
            >
              <i className="ri-check-double-line" /> Release All Pending
            </button>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cut-Off Period</th>
                  <th>Payroll Type</th>
                  <th>Employees Covered</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={item.period_id}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setPeriodToView(item);
                      setViewModalOpen(true);
                    }}
                  >
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td>{item.cut_off_period}</td>
                    <td>{item.payroll_type}</td>
                    <td>{item.employees_covered}</td>
                    <td>₱{item.total_payroll_amount.toLocaleString()}</td>
                    <td>
                      <span className={`chip ${item.status}`}>{item.status}</span>
                    </td>
                    <td>
                      <div className="actionButtonsContainer">
                        <button
                          className="viewBtn"
                          onClick={e => {
                            e.stopPropagation();
                            setPeriodToView(item);
                            setViewModalOpen(true);
                          }}
                          title="View Details"
                        >
                          <i className="ri-eye-line" />
                        </button>
                        <button
                          className="exportBtn"
                          onClick={e => {
                            e.stopPropagation();
                            setExportingPeriod(item);
                          }}
                          title="Export"
                        >
                          <i className="ri-download-line" />
                        </button>
                        <button
                          className="releaseBtn"
                          disabled={item.status !== "Pending"}
                          onClick={e => {
                            e.stopPropagation();
                            if (item.status === "Pending") handleReleaseWithConfirm([item.period_id]);
                          }}
                          title={item.status === "Pending" ? "Release Payroll" : "Already Released"}
                        >
                          <i className="ri-check-double-line" />
                        </button>
                        <button
                          className="deleteBtn"
                          onClick={e => {
                            e.stopPropagation();
                            // TODO: Implement delete logic
                          }}
                          title="Delete Payroll"
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredData.length === 0 && (
              <p className="noRecords">No payroll records found.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        {viewModalOpen && periodToView && (
          <ViewPayrollModal
            period={periodToView}
            onClose={() => {
              setViewModalOpen(false);
              setPeriodToView(null);
            }}
          />
        )}

        {/* Payroll Generation Modal */}
        {genModalOpen && (
          <div className="modalOverlay">
            <div className="viewPayrollModal" style={{ minWidth: 400, maxWidth: 540, borderRadius: 14, boxShadow: '0 6px 32px rgba(0,0,0,0.14)', background: '#fff', padding: 0 }}>
              <div className="modalHeader" style={{ borderBottom: '1px solid #eee', marginBottom: 0, padding: '24px 32px 12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontWeight: 700, fontSize: 24, margin: 0 }}>Generate Payroll</h2>
                <button className="closeButton" style={{ fontSize: 24, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setGenModalOpen(false)}>&times;</button>
              </div>
              <div className="modalBody" style={{ background: '#f7f7f9', borderRadius: 8, padding: 32, margin: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 600, fontSize: 16, minWidth: 120 }}>Payroll Period:</label>
                  <select value={genPeriodType} onChange={e => setGenPeriodType(e.target.value)} style={{ fontSize: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', minWidth: 140, fontWeight: 500 }}>
                    <option value="monthly">Monthly</option>
                    <option value="semi-monthly">Semi-Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  {genPeriodType === 'monthly' && (
                    <label style={{ fontWeight: 500, fontSize: 15, minWidth: 120 }}>Month:
                      <input
                        type="month"
                        onChange={handleMonthChange}
                        style={{ marginLeft: 8, fontSize: 16, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', minWidth: 120 }}
                      />
                    </label>
                  )}
                  {genPeriodType === 'semi-monthly' && (
                    <>
                      <label style={{ fontWeight: 500, fontSize: 15, minWidth: 120 }}>Month:
                        <input
                          type="month"
                          onChange={handleSemiMonthChange}
                          style={{ marginLeft: 8, fontSize: 16, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', minWidth: 120 }}
                        />
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
                        <label style={{ fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center' }}>
                          <input
                            type="radio"
                            name="semiMonthPart"
                            value="first"
                            checked={semiMonthPart === 'first'}
                            onChange={() => setSemiMonthPart('first')}
                            style={{ marginRight: 6 }}
                          />
                          1–15
                        </label>
                        <label style={{ fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center' }}>
                          <input
                            type="radio"
                            name="semiMonthPart"
                            value="second"
                            checked={semiMonthPart === 'second'}
                            onChange={() => setSemiMonthPart('second')}
                            style={{ marginRight: 6 }}
                          />
                          16–End
                        </label>
                      </div>
                    </>
                  )}
                  {genPeriodType === 'weekly' && (
                    <label style={{ fontWeight: 500, fontSize: 15, minWidth: 120 }}>Week:
                      <input
                        type="week"
                        onChange={handleWeekChange}
                        style={{ marginLeft: 8, fontSize: 16, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', minWidth: 120 }}
                      />
                    </label>
                  )}
                  {genPeriodType === 'custom' && (
                    <>
                      <label style={{ fontWeight: 500, fontSize: 15, minWidth: 120 }}>Start Date:
                        <input type="date" value={genStart} onChange={e => setGenStart(e.target.value)} style={{ marginLeft: 8, fontSize: 16, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', minWidth: 120 }} />
                      </label>
                      <label style={{ fontWeight: 500, fontSize: 15, minWidth: 120 }}>End Date:
                        <input type="date" value={genEnd} onChange={e => setGenEnd(e.target.value)} style={{ marginLeft: 8, fontSize: 16, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', minWidth: 120 }} />
                      </label>
                    </>
                  )}
                </div>
                {/* Period summary */}
                {(genStart && genEnd) && (
                  <div style={{ marginBottom: 24, fontSize: 15, color: '#333', background: '#fffbe6', borderRadius: 8, padding: '10px 18px', border: '1px solid #ffe58f', fontWeight: 500, letterSpacing: 0.2 }}>
                    <span style={{ color: '#bfa100', marginRight: 8 }}>🗓️</span>
                    <b>Selected Period:</b> {genStart} to {genEnd}
                  </div>
                )}
                <div style={{ margin: '18px 0', borderTop: '1px solid #e5e5e5' }} />
                {eligibleEmployees.length > 0 && (
                  <div style={{ marginBottom: 24, background: '#fff', borderRadius: 8, padding: 14, border: '1px solid #eee', maxHeight: 220, overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: 14 }}>
                      <thead>
                        <tr>
                          <th><input type="checkbox" checked={selectedEmployees.length === eligibleEmployees.length} onChange={e => handleSelectAll(e.target.checked)} /></th>
                          <th>Employee Number</th>
                          <th>Employee Name</th>
                          <th>Department</th>
                          <th>Position</th>
                          <th>Payroll Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eligibleEmployees.map(emp => (
                          <tr key={emp.employeeNumber}>
                            <td><input type="checkbox" checked={selectedEmployees.includes(emp.employeeNumber)} onChange={e => handleSelectEmployee(emp.employeeNumber, e.target.checked)} /></td>
                            <td>{emp.employeeNumber}</td>
                            <td>{[emp.firstName, emp.middleName, emp.lastName, emp.suffix].filter(Boolean).join(' ')}</td>
                            <td>{emp.position?.department?.departmentName || '-'}</td>
                            <td>{emp.position?.positionName || '-'}</td>
                            <td>{emp.payrollPeriod || genPeriodType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* No eligible employees message */}
                {!previewLoading && eligibleEmployees.length === 0 && genStart && genEnd && (
                  <div style={{ 
                    background: '#fff3cd', 
                    borderRadius: 8, 
                    padding: 20, 
                    border: '1px solid #ffeaa7',
                    marginBottom: 24,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 18, color: '#856404', marginBottom: 8 }}>
                      <span style={{ marginRight: 8 }}>⚠️</span>
                      No Eligible Employees Found
                    </div>
                    <div style={{ fontSize: 14, color: '#856404', lineHeight: 1.5 }}>
                      No employees are eligible for <strong>{genPeriodType}</strong> payroll period<br />
                      from <strong>{genStart}</strong> to <strong>{genEnd}</strong>.<br /><br />
                      This could be because:
                      <ul style={{ textAlign: 'left', margin: '8px 0 0 20px', padding: 0 }}>
                        <li>No employees are configured for this payroll period type</li>
                        <li>All employees are inactive</li>
                        <li>No employees match the selected criteria</li>
                      </ul>
                    </div>
                  </div>
                )}
                {previewError && <div style={{ color: 'red', marginBottom: 12 }}>{previewError}</div>}
                {genError && <div style={{ color: 'red', marginBottom: 12 }}>{genError}</div>}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 18 }}>
                  <button
                    className="releaseAllBtn"
                    style={{ minWidth: 180, fontSize: 16, fontWeight: 600, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', boxShadow: '0 1px 4px rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
                    onClick={fetchEligibleEmployees}
                    disabled={previewLoading || !genStart || !genEnd}
                    title="Preview eligible employees for this period"
                  >
                    {previewLoading ? <span className="loader" style={{ width: 18, height: 18, border: '2px solid #fff', borderTop: '2px solid #22c55e', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> : <i className="ri-search-line" style={{ fontSize: 18 }} />}
                    {previewLoading ? 'Loading...' : 'Preview Eligible Employees'}
                  </button>
                  <button
                    className="releaseAllBtn"
                    style={{ minWidth: 180, fontSize: 16, fontWeight: 600, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', boxShadow: '0 1px 4px rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
                    onClick={handleGeneratePayroll}
                    disabled={genLoading || selectedEmployees.length === 0}
                    title="Generate payroll for selected employees"
                  >
                    {genLoading ? <span className="loader" style={{ width: 18, height: 18, border: '2px solid #fff', borderTop: '2px solid #2563eb', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> : <i className="ri-check-double-line" style={{ fontSize: 18 }} />}
                    Generate Payroll
                  </button>
                </div>
              </div>
              <div className="modalFooter" style={{ borderTop: '1px solid #eee', marginTop: 0, padding: '18px 32px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="closeBtn" style={{ fontSize: 16, borderRadius: 8, padding: '10px 28px', background: '#f4f4f4', color: '#333', border: '1px solid #ccc', fontWeight: 600 }} onClick={() => setGenModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Export Confirmation Modal */}
        {exportingPeriod && (
          <div className="modalOverlay">
            <div className="viewPayrollModal">
              <div className="modalHeader">
                <h2>Export Payroll</h2>
                <button className="closeButton" onClick={() => setExportingPeriod(null)}>&times;</button>
              </div>
              <div className="modalBody">
                <p>Are you sure you want to export payroll for <b>{exportingPeriod.cut_off_period}</b> ({exportingPeriod.payroll_type})?</p>
              </div>
              <div className="modalFooter">
                <button className="closeBtn" onClick={() => setExportingPeriod(null)}>Cancel</button>
                <button
                  className="releaseAllBtn"
                  onClick={async () => {
                    const { start_date, end_date, payroll_type } = exportingPeriod;
                    const res = await fetch('/api/payroll/export', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ start: start_date, end: end_date, payrollPeriod: payroll_type })
                    });
                    if (res.ok) {
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `payroll_export_${start_date}_to_${end_date}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } else {
                      alert('Failed to export payroll.');
                    }
                    setExportingPeriod(null);
                  }}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {resultsModalOpen && resultsData && (
          <div className="modalOverlay">
            <div className="viewPayrollModal" style={{ minWidth: 500, maxWidth: 600, borderRadius: 14, boxShadow: '0 6px 32px rgba(0,0,0,0.14)', background: '#fff', padding: 0 }}>
              <div className="modalHeader" style={{ borderBottom: '1px solid #eee', marginBottom: 0, padding: '24px 32px 12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontWeight: 700, fontSize: 24, margin: 0 }}>
                  {resultsData.generated > 0 ? '✅ Payroll Generated Successfully' : '⚠️ Payroll Generation Results'}
                </h2>
                <button className="closeButton" style={{ fontSize: 24, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setResultsModalOpen(false)}>&times;</button>
              </div>
              <div className="modalBody" style={{ background: '#f7f7f9', borderRadius: 8, padding: 32, margin: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {/* Summary Cards */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                  <div style={{ flex: 1, background: '#d4edda', borderRadius: 8, padding: 16, textAlign: 'center', border: '1px solid #c3e6cb' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#155724' }}>{resultsData.generated}</div>
                    <div style={{ fontSize: 14, color: '#155724' }}>Generated</div>
                  </div>
                  <div style={{ flex: 1, background: '#fff3cd', borderRadius: 8, padding: 16, textAlign: 'center', border: '1px solid #ffeaa7' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#856404' }}>{resultsData.skipped}</div>
                    <div style={{ fontSize: 14, color: '#856404' }}>Skipped</div>
                  </div>
                  {resultsData.errors && resultsData.errors.length > 0 && (
                    <div style={{ flex: 1, background: '#f8d7da', borderRadius: 8, padding: 16, textAlign: 'center', border: '1px solid #f5c6cb' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#721c24' }}>{resultsData.errors.length}</div>
                      <div style={{ fontSize: 14, color: '#721c24' }}>Errors</div>
                    </div>
                  )}
                </div>

                {/* Error Details */}
                {resultsData.errors && resultsData.errors.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #eee', marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#721c24', fontSize: 18, fontWeight: 600 }}>
                      <span style={{ marginRight: 8 }}>❌</span>
                      Issues Found
                    </h3>
                    <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                      The following employees already have payroll records for the selected period:
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {resultsData.errors.map((error: PayrollGenError, index: number) => (
                        <div key={index} style={{ 
                          padding: '12px 16px', 
                          background: '#f8f9fa', 
                          borderRadius: 6, 
                          marginBottom: 8,
                          border: '1px solid #e9ecef',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}>
                          <div style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            background: '#dc3545',
                            flexShrink: 0
                          }} />
                          <div>
                            <div style={{ fontWeight: 600, color: '#333', marginBottom: 2 }}>
                              {error.employee}
                            </div>
                            <div style={{ fontSize: 13, color: '#666' }}>
                              {error.reason === 'date overlap' 
                                ? 'Payroll record already exists for this period' 
                                : error.reason}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {resultsData.generated > 0 && (
                  <div style={{ background: '#d4edda', borderRadius: 8, padding: 16, border: '1px solid #c3e6cb', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>✅</span>
                      <span style={{ fontWeight: 600, color: '#155724' }}>
                        Successfully generated {resultsData.generated} payroll record{resultsData.generated !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button
                    className="closeBtn"
                    style={{ 
                      fontSize: 16, 
                      borderRadius: 8, 
                      padding: '12px 24px', 
                      background: '#6c757d', 
                      color: '#fff', 
                      border: 'none', 
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => setResultsModalOpen(false)}
                  >
                    Close
                  </button>
                  {resultsData.generated > 0 && (
                    <button
                      className="releaseAllBtn"
                      style={{ 
                        fontSize: 16, 
                        borderRadius: 8, 
                        padding: '12px 24px', 
                        background: '#28a745', 
                        color: '#fff', 
                        border: 'none', 
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onClick={() => {
                        setResultsModalOpen(false);
                        setGenModalOpen(false);
                      }}
                    >
                      View Payroll Records
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
