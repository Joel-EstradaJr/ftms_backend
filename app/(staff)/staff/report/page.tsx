"use client";
import React, { useState, useEffect, useCallback } from "react";
import "../../../styles/report/report.css";
import "../../../styles/components/table.css";
import LineChart from '../../../Components/expenseRevenueLineChart';
import ExpensesPieChart from '../../../Components/expensesPieChart';
import RevenuePieChart from '../../../Components/revenuePieChart';
import Pagination from '../../../Components/pagination';
import ErrorDisplay from '../../../Components/ErrorDisplay';
import { getUnrecordedExpenseAssignments, getAllAssignmentsWithRecorded, type Assignment } from '@/lib/operations/assignments';
import { formatDate } from '../../../utils/formatting';;
import Loading from '../../../Components/loading';
import { showError } from '../../../utils/Alerts';
import Swal from 'sweetalert2';

type ExpenseData = {
  expense_id: string;
  revenue_id?: string;
  collection_date?: string;       
  category: string;         
  total_amount: number;     
  expense_date: string;             
  created_by: string;       
  assignment_id?: string;   
  other_source?: string;
  other_category?: string;
  assignment?: Assignment;
};

const ReportPage = () => {
  const [dateFilter, setDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState('profit');
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    setSearch("");
    setCategoryFilter("");
    setCurrentPage(1);
    setPageSize(10);
  }, [activeTab]);

  const formatAssignment = (assignment: Assignment): string => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    // Fix: Use bus_plate_number instead of bus_bodynumber
    // Handle missing driver_name and conductor_name gracefully
    const driverName = assignment.driver_name || assignment.driver_id || 'Unknown';
    const conductorName = assignment.conductor_name || assignment.conductor_id || 'Unknown';
    
    return `${busType} | ${assignment.bus_plate_number} - ${assignment.bus_route} | ${driverName.split(' ').pop()} & ${conductorName.split(' ').pop()} | ${formatDate(assignment.date_assigned)}`;
  };

  // receipt formatting removed

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const expensesData = await response.json();
      setExpenseData(expensesData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showError('Failed to load expenses', 'Error');
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true);
      const unrecordedAssignments = await getUnrecordedExpenseAssignments();
      setAssignments(unrecordedAssignments);
      const allAssignmentsData = await getAllAssignmentsWithRecorded();
      setAllAssignments(allAssignmentsData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showError('Failed to load assignments', 'Error');
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchExpenses(), fetchAssignments()]);
      setLoading(false);
    };
    loadData();
  }, [fetchExpenses, fetchAssignments]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchExpenses();
      fetchAssignments();
    }
  }, [lastUpdate, loading, fetchExpenses, fetchAssignments]);

  const filteredData = expenseData.filter((item: ExpenseData) => {
    const matchesSearch = (item.category?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchesDate = (!dateFrom || item.expense_date >= dateFrom) && 
                        (!dateTo || item.expense_date <= dateTo);
    return matchesSearch && matchesCategory && matchesDate;
  });

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // const generateFileName = (type: 'expense' | 'revenue') => {
  //   const now = new Date();
  //   const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
  //   const dateStamp = now.toISOString().split('T')[0];
    
  //   let fileName = `${type}_report`;
  //   if (dateFilter === 'Custom' && dateFrom && dateTo) {
  //     fileName += `_${dateFrom}_to_${dateTo}`;
  //   }
    
  //   return `${fileName}_${dateStamp}_${timeStamp}.csv`;
  // };

  // const handleExport = async () => {
  //   const reportType = activeTab === 'expense' ? 'expense' : 'revenue';
  //   const dateRange = dateFilter === 'Custom' && dateFrom && dateTo
  //     ? `${formatDate(dateFrom)} to ${formatDate(dateTo)}`
  //     : 'All dates';

  //   const result = await Swal.fire({
  //     title: 'Confirm Export',
  //     html: `
  //       <div style="text-align: left; margin-top: 1rem;">
  //         <strong>Report Type:</strong> ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report<br>
  //         <strong>Date Range:</strong> ${dateRange}<br>
  //         <strong>Total Records:</strong> ${filteredData.length}<br>
  //       </div>
  //     `,
  //     icon: 'question',
  //     showCancelButton: true,
  //     confirmButtonColor: '#13CE66',
  //     cancelButtonColor: '#961C1E',
  //     confirmButtonText: 'Export CSV',
  //     cancelButtonText: 'Cancel',
  //   });

  //   if (result.isConfirmed) {
  //     if (filteredData.length === 0) {
  //       Swal.fire({
  //         title: 'No Data',
  //         text: 'There are no records to export.',
  //         icon: 'warning',
  //         confirmButtonColor: '#13CE66',
  //       });
  //       return;
  //     }

  //     try {
  //       const dataToExport = activeTab === 'expense' ? 
  //         await prepareExpenseData() : 
  //         await prepareRevenueData();

  //       exportToCSV(dataToExport, activeTab as 'expense' | 'revenue');

  //       Swal.fire({
  //         title: 'Success!',
  //         text: 'Report exported successfully',
  //         icon: 'success',
  //         confirmButtonColor: '#13CE66',
  //       });
  //     } catch (error) {
  //       console.error('Export error:', error);
  //       Swal.fire({
  //         title: 'Error',
  //         text: 'Failed to export report.',
  //         icon: 'error',
  //         confirmButtonColor: '#961C1E',
  //       });
  //     }
  //   }
  // };

  const prepareExpenseData = async () => {
    const headers = [
      'Expense Date',
      'Category',
      'Source',
      'Amount (₱)',
      'Source Details'
    ];

    const rows = filteredData.map(item => {
      let source = '';
      let sourceDetails = '';

      if (item.assignment_id) {
        const assignment = allAssignments.find(a => a.assignment_id === item.assignment_id);
        source = 'Assignment';
        sourceDetails = assignment ? formatAssignment(assignment) : 'Assignment not found';
      } else if (item.other_source) {
        source = 'Other';
        sourceDetails = item.other_source || 'N/A';
      } else {
        source = 'Other';
        sourceDetails = 'N/A';
      }

      return [
        formatDate(item.expense_date),
        item.category === 'Other' ? item.other_category || 'Other' : item.category.replace('_', ' '),
        source,
        item.total_amount.toFixed(2),
        sourceDetails
      ];
    });

    return [headers, ...rows];
  };

  const prepareRevenueData = async () => {
    const headers = [
      'Collection Date',
      'Category',
      'Source',
      'Amount (₱)',
      'Source Details'
    ];

    const rows = filteredData.map(item => {
      let source = '';
      let sourceDetails = '';

      if (item.assignment_id) {
        const assignment = allAssignments.find(a => a.assignment_id === item.assignment_id);
        source = 'Assignment';
        sourceDetails = assignment ? formatAssignment(assignment) : 'Assignment not found';
      } else {
        source = 'Other';
        sourceDetails = item.other_source || 'N/A';
      }

      return [
        formatDate(item.collection_date || ''),
        item.category === 'Other' ? 'Other' : item.category.replace('_', ' '),
        source,
        item.total_amount.toFixed(2),
        sourceDetails
      ];
    });

    return [headers, ...rows];
  };

  // const exportToCSV = (data: (string | number)[][], type: 'expense' | 'revenue') => {
  //   const csvContent = data.map(row => 
  //     row.map(cell => {
  //       // Handle cells that might contain commas or quotes
  //       if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
  //         return `"${cell.replace(/"/g, '""')}"`;
  //       }
  //       return cell;
  //     }).join(',')
  //   ).join('\n');

  //   // Create metadata section
  //   const metadata = [
  //     `# ${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
  //     `# Generated: ${formatDate(new Date())}`,
  //     `# Date Range: ${dateFrom ? formatDate(dateFrom) : 'All'} to ${dateTo ? formatDate(dateTo) : 'Present'}`,
  //     `# Total Records: ${data.length - 1}`,
  //     ''
  //   ].join('\n');

  //   const blob = new Blob([metadata + csvContent], { type: 'text/csv;charset=utf-8;' });
  //   const link = document.createElement('a');
  //   link.href = URL.createObjectURL(blob);
  //   link.download = generateFileName(type);
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

  const handleExportData = async () => {
    const result = await Swal.fire({
      title: 'Export Financial Summary',
      html: `
        <div style="text-align: left; padding: 1rem;">
          <p><strong>This export will include:</strong></p>
          <ul style="list-style-type: none; padding: 0;">
            <li>✓ Revenue Reports</li>
            <li>✓ Expense Reports</li>
            <li>✓ Profit/Loss Report</li>
          </ul>
          <p><strong>Date Range:</strong> ${dateFrom ? formatDate(dateFrom) : 'All'} to ${dateTo ? formatDate(dateTo) : 'Present'}</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Export CSV',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        // Prepare data sections
        const summaryData = prepareSummaryData();
        const expenseRows = await prepareExpenseData();
        const revenueRows = await prepareRevenueData();

        // Generate CSV content
        const csvRows = [
          ['FINANCIAL SUMMARY REPORT'],
          [`Generated on: ${formatDate(new Date())}`],
          [`Period: ${dateFrom ? formatDate(dateFrom) : 'All'} to ${dateTo ? formatDate(dateTo) : 'Present'}`],
          [''],
          ['PROFIT/LOSS SUMMARY'],
          ['Category', 'Amount (₱)'],
          ['Total Revenue', summaryData.totalRevenue.toFixed(2)],
          ['Total Expenses', summaryData.totalExpenses.toFixed(2)],
          ['Net Profit/Loss', summaryData.netProfit.toFixed(2)],
          [''],
          ['REVENUE BREAKDOWN'],
          // Spread the revenue data rows
          ...(Array.isArray(revenueRows) ? revenueRows : []),
          [''],
          ['EXPENSE BREAKDOWN'],
          // Spread the expense data rows
          ...(Array.isArray(expenseRows) ? expenseRows : [])
        ];

        // Convert to CSV string with proper escaping
        const csv = csvRows
          .map(row => {
            return row.map(cell => {
              if (cell === null || cell === undefined) return '';
              const cellStr = cell.toString();
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            }).join(',');
          })
          .join('\n');

        // Create and download the file
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const fileName = `financial_summary_${formatDate(new Date()).replace(/\//g, '-')}.csv`;
        
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        Swal.fire({
          title: 'Success!',
          text: 'Financial summary exported successfully',
          icon: 'success',
          confirmButtonColor: '#13CE66',
        });
      } catch (error) {
        console.error('Export error:', error);
        Swal.fire({
          title: 'Export Failed',
          text: 'Failed to export data: ' + (error instanceof Error ? error.message : 'Unknown error'),
          icon: 'error',
          confirmButtonColor: '#961C1E',
        });
      }
    }
  };

  // Modify these calculation functions
  const calculateTotalRevenue = () => {
    // Filter only revenue records (those with collection_date)
    const revenueRecords = expenseData.filter(item => item.collection_date);
    return revenueRecords.reduce((sum, item) => sum + Number(item.total_amount), 0);
  };

  const calculateTotalExpenses = () => {
    // Filter only expense records (those with expense_date)
    const expenseRecords = expenseData.filter(item => item.expense_date);
    return expenseRecords.reduce((sum, item) => sum + Number(item.total_amount), 0);
  };

  const prepareSummaryData = () => {
    const totalRevenue = calculateTotalRevenue();
    const totalExpenses = calculateTotalExpenses();
    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses
    };
  };

  if (error) {
    return (
      <div className="card">
        <h1 className="title">Report Generation</h1>
        <ErrorDisplay
          type="503"
          message="Unable to generate report."
          onRetry={() => {
            setError(null);
            setLoading(true);
            // Refetch logic here
            setTimeout(() => setLoading(false), 1000);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Finance Tracking Management</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className='card'>
      <div className='elements'>
        <h1 className='title'>Financial Reports</h1>
        {/* CONTAINER FOR THE SETTINGS */}
        <div className="settings">
          <div className="filterDate">
            <div className="filter">
              <label htmlFor="dateFilter">Filter By:</label>
              <select
                value={dateFilter}
                id="dateFilter"
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value !== 'Custom') {
                    setDateFrom('');
                    setDateTo('');
                  }
                }}
              >
                <option value="">All</option>
                <option value="Day">Today</option>
                <option value="Month">This Month</option>
                <option value="Year">This Year</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {dateFilter === "Custom" && (
              <div className="dateRangePicker">
                <div className="date">
                  <label htmlFor="startDate">Start Date:</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      if (dateTo) {
                        // fetchReportData(); or any other function to fetch data
                      }
                    }}
                  />
                </div>

                <div className="date">
                  <label htmlFor="endDate">End Date:</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      if (dateFrom) {
                        // fetchReportData(); or any other function to fetch data
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>


          <button id="exportData" onClick={handleExportData}>
            <i className="ri-file-download-line" />
            Export Data
          </button>
        </div>

        <div className="tabBar-wrapper">
          <div className={`tabBar ${activeTab === 'profit' ? 'tab-1' : activeTab === 'expense' ? 'tab-2' : 'tab-3'}`}>
            <button
              className={activeTab === 'profit' ? 'active' : ''}
              onClick={() => setActiveTab('profit')}
            >
              Profit / Loss Report
            </button>

            <button
              className={activeTab === 'expense' ? 'active' : ''}
              onClick={() => setActiveTab('expense')}
            >
              Expense Reports
            </button>

            <button
              className={activeTab === 'revenue' ? 'active' : ''}
              onClick={() => setActiveTab('revenue')}
            >
              Revenue Reports
            </button>
          </div>
        </div>

        <div className="tabContent">
          {/* ============ Profit/Loss Report Tab ============ */}
          {activeTab === 'profit' && 
          <div className="profitTabContent">
            <div className="totalPieChart">
              <div className="total">
                {/* Container for Expense */}
                <div className="totalExpense">
                  <h2>Total Expense</h2>
                  <p>$0.00</p>
                </div>

                {/* Container for Revenue */}
                <div className="totalRevenue">
                  <h2>Total Revenue</h2>
                  <p>$0.00</p>
                </div>

                {/* Container for Net Profit */}
                <div className="totalNetProfit">
                  <h2>Net Profit</h2>
                  <p>0%</p>
                </div>
              </div>

              {/* Expense Pie Chart Container */}
              <div className="pieChartContainer">
                <ExpensesPieChart />
              </div>

              {/* Revenue Pie Chart Container */}
              <div className="pieChartContainer">
                <RevenuePieChart />
              </div>
            </div>

            <div className="expenseRevenueGraph">
              <LineChart />
            </div>
          </div>}

          {/* ============ Expense Report Tab ============ */}
          {activeTab === 'expense' && 
          <div className="expenseTabContent">
            <div className="expenseTable">
              <div className="settings">
                <div className="searchBar">
                  <i className="ri-search-line" />
                  <input
                    type="text"
                    placeholder="Search here..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  /> 
                </div>
                
                <div className="filters">
                  <select value={categoryFilter} id="categoryFilter" onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Vehicle_Parts">Vehicle Parts</option>
                    <option value="Tools">Tools</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Other">Other</option>
                  </select>                    
                </div>
              </div>
              
              {/* ==========table===========  */}
              <div className="table-wrapper">
                <div className="tableContainer">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Expense Date</th>
                        <th>Source</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecords.map(item => {
                        let source: string = '';
                        
                        if (item.assignment_id) {
                          source = 'Assignment';
                        } else {
                          source = 'Other';
                        }
                        
                        return (
                          <tr key={item.expense_id}>
                            <td>{formatDate(item.expense_date)}</td>
                            <td>{source}</td>
                            <td>{item.category.replace('_', ' ')}</td>
                            <td>₱{item.total_amount.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {currentRecords.length === 0 && !loading && <p className="noRecords">No records found.</p>}
                </div>
              </div>
              
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>

            <div className="pieChartContainer" id="expenseTabPieChart">
              <ExpensesPieChart />
            </div>
          </div>}

          {/* ============ Revenue Report Tab ============ */}
          {activeTab === 'revenue' && 
          <div className="revenueTabContent">
            <div className="revenueTable">
              <div className="settings">
                <div className="searchBar">
                  <i className="ri-search-line" />
                  <input
                    type="text"
                    placeholder="Search here..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  /> 
                </div>
                
                <div className="filters">
                  <select value={categoryFilter} id="categoryFilter" onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    <option value="Boundary">Boundary-based</option>
                    <option value="Percentage">Percentage-based</option>
                    <option value="Bus-Rental">Bus-rental</option>
                    <option value="Others">Others</option>
                  </select>                    
                </div>
              </div>
              
              {/* ==========table===========  */}
              <div className="table-wrapper">
                <div className="tableContainer">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Collection Date</th>
                        <th>Source</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecords.map(item => {
                        const assignment = item.assignment_id 
                          ? allAssignments.find(a => a.assignment_id === item.assignment_id)
                          : null;

                        let source: string;
                        if (item.category === 'Other') {
                          source = item.other_source || 'N/A';
                        } else if (assignmentsLoading) {
                          source = 'Loading...';
                        } else if (assignment) {
                          source = formatAssignment(assignment);
                        } else {
                          source = item.assignment_id 
                            ? `Assignment ${item.assignment_id} not found`
                            : 'No assignment linked';
                        }

                        return (
                          <>
                          <tr key={item.revenue_id}>
                            <td>{item.collection_date ? formatDate(item.collection_date) : 'N/A'}</td>
                            <td>{source}</td>
                            <td>{item.category === 'Other' ? 'Other' : item.category.replace('_', ' ')}</td>
                            <td>₱{item.total_amount.toLocaleString()}</td>
                          </tr>
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                  {currentRecords.length === 0 && !loading && <p className="noRecords">No records found.</p>}
                </div>
              </div>
              
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>

            <div className="pieChartContainer" id="expenseTabPieChart">
              <RevenuePieChart />
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

export default ReportPage;