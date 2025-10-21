"use client";

import React, { useState, useMemo } from "react";
import PaginationComponent from "../../../../Components/pagination";
import Loading from "../../../../Components/loading";
import ErrorDisplay from "../../../../Components/errordisplay";
import FilterDropdown, { FilterSection } from "../../../../Components/filter";
import { showSuccess, showError, showConfirmation } from "../../../../utils/Alerts";
import { formatDate } from '../../../../utils/formatting';;
import { calculateNextPaymentDate, calculatePaymentProgress, getPaymentStatus } from '../../../../utils/paymentCalculations';
import ViewLoanPaymentModal from "./viewLoanPayment";
import AddPaymentModal from "./addPayment";
import PaymentHistory from "./paymentHistory";
import CloseLoanPayment from "./closeLoanPayment";
import PaymentSchedule from "./paymentSchedule";
import AuditLoanPayment from "./auditLoanPayment";

//@ts-ignore
import "../../../../styles/loan-management/loanPayment.css";
//@ts-ignore
import "../../../../styles/components/table.css";
//@ts-ignore
import "../../../../styles/components/chips.css";

enum LoanStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

enum Department {
  OPERATIONS = 'operations',
  MAINTENANCE = 'maintenance',
  ADMINISTRATION = 'administration',
  FINANCE = 'finance',
  HR = 'hr'
}

enum LoanType {
  EMERGENCY = 'emergency',
  EDUCATIONAL = 'educational',
  MEDICAL = 'medical',
  HOUSING = 'housing',
  PERSONAL = 'personal',
  SALARY_ADVANCE = 'salary_advance'
}

enum PaymentType {
  REGULAR = 'regular',
  PARTIAL = 'partial',
  FULL_SETTLEMENT = 'full_settlement',
  IRREGULAR = 'irregular'
}

enum PaymentMethod {
  CASH = 'cash',
  CHECK = 'check',
  BANK_TRANSFER = 'bank_transfer',
  SALARY_DEDUCTION = 'salary_deduction'
}

interface Employee {
  employee_id?: string;
  name: string;
  job_title: string;
  department: Department | string;
  employee_number: string;
  monthly_salary?: number;
  hire_date: string;
}

interface LoanPayment {
  id: string;
  loan_id: string;
  payment_amount: number;
  payment_type: PaymentType | string;
  payment_method: PaymentMethod | string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  processed_by: string;
  processed_at: string;
}

interface LoanForPaymentPage {
  id: string;
  loan_request_id: string;
  employee: Employee;
  loan_type: LoanType | string;
  approved_amount: number;
  disbursed_amount?: number;
  repayment_terms: number;
  monthly_deduction: number;
  interest_rate?: number;
  status: LoanStatus | string;
  disbursed_date?: string;
  application_date: string;
  total_paid: number;
  remaining_balance: number;
  payments_made: number;
  payment_records: LoanPayment[];
  next_payment_date?: string | null;
  next_payment_amount?: number;
  is_overdue: boolean;
  days_overdue?: number;
  payment_status: string;
}

interface LoanPaymentFilters {
  employee?: string[];
  department?: Department[];
  status?: string[];
  payment_status?: string[];
  date_range?: { from: string; to: string };
}

const LoanPaymentPage = () => {
  const sampleLoanPaymentData: LoanForPaymentPage[] = [
    {
      id: "1",
      loan_request_id: "LR-2024-001",
      employee: {
        employee_id: "EMP-003",
        name: "Carlos Santos",
        job_title: "Bus Driver",
        department: Department.OPERATIONS,
        employee_number: "20230003",
        monthly_salary: 22000.00,
        hire_date: "2020-08-22"
      },
      loan_type: LoanType.EDUCATIONAL,
      approved_amount: 37500.00,
      disbursed_amount: 37500.00,
      repayment_terms: 12,
      monthly_deduction: 3125.00,
      interest_rate: 0,
      status: LoanStatus.DISBURSED,
      disbursed_date: "2024-01-01",
      application_date: "2023-12-15",
      total_paid: 15625.00,
      remaining_balance: 21875.00,
      payments_made: 5,
      payment_records: [],
      next_payment_date: calculateNextPaymentDate("2024-01-01", 12, 5),
      next_payment_amount: 3125.00,
      is_overdue: false,
      days_overdue: 0,
      payment_status: 'active'
    },
    {
      id: "2",
      loan_request_id: "LR-2024-002",
      employee: {
        employee_id: "EMP-002",
        name: "Maria Garcia",
        job_title: "Dispatcher",
        department: Department.OPERATIONS,
        employee_number: "20210002",
        monthly_salary: 23000.00,
        hire_date: "2021-05-10"
      },
      loan_type: LoanType.EMERGENCY,
      approved_amount: 30000.00,
      disbursed_amount: 30000.00,
      repayment_terms: 10,
      monthly_deduction: 3000.00,
      interest_rate: 0,
      status: LoanStatus.DISBURSED,
      disbursed_date: "2024-05-01",
      application_date: "2024-04-20",
      total_paid: 12000.00,
      remaining_balance: 18000.00,
      payments_made: 4,
      payment_records: [],
      next_payment_date: "2024-10-01",
      next_payment_amount: 3000.00,
      is_overdue: true,
      days_overdue: 8,
      payment_status: 'overdue'
    },
    {
      id: "3",
      loan_request_id: "LR-2023-015",
      employee: {
        employee_id: "EMP-005",
        name: "Roberto Kim",
        job_title: "Accountant",
        department: Department.FINANCE,
        employee_number: "20230005",
        monthly_salary: 35000.00,
        hire_date: "2019-02-14"
      },
      loan_type: LoanType.MEDICAL,
      approved_amount: 80000.00,
      disbursed_amount: 80000.00,
      repayment_terms: 24,
      monthly_deduction: 3333.33,
      interest_rate: 5.0,
      status: LoanStatus.CLOSED,
      disbursed_date: "2023-12-01",
      application_date: "2023-11-20",
      total_paid: 84000.00,
      remaining_balance: 0,
      payments_made: 24,
      payment_records: [],
      next_payment_date: null,
      next_payment_amount: 0,
      is_overdue: false,
      days_overdue: 0,
      payment_status: 'completed'
    }
  ];

  const [loanPayments, setLoanPayments] = useState<LoanForPaymentPage[]>(sampleLoanPaymentData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<LoanPaymentFilters>({});
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showCloseLoanModal, setShowCloseLoanModal] = useState(false);
  const [showPaymentScheduleModal, setShowPaymentScheduleModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [activeRecord, setActiveRecord] = useState<LoanForPaymentPage | null>(null);

  const filteredLoans = useMemo(() => {
    return loanPayments.filter(loan => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        loan.employee.name.toLowerCase().includes(searchLower) ||
        loan.employee.employee_number.toLowerCase().includes(searchLower) ||
        loan.loan_request_id.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
      if (filters.employee?.length && !filters.employee.includes(loan.employee.name)) return false;
      if (filters.department?.length && !filters.department.includes(loan.employee.department as Department)) return false;
      if (filters.status?.length && !filters.status.includes(loan.status)) return false;
      if (filters.payment_status?.length && !filters.payment_status.includes(loan.payment_status)) return false;

      if (filters.date_range) {
        const loanDate = new Date(loan.disbursed_date || loan.application_date);
        const fromDate = filters.date_range.from ? new Date(filters.date_range.from) : null;
        const toDate = filters.date_range.to ? new Date(filters.date_range.to) : null;
        if (fromDate && loanDate < fromDate) return false;
        if (toDate && loanDate > toDate) return false;
      }

      return true;
    });
  }, [loanPayments, search, filters]);

  const totalPages = Math.ceil(filteredLoans.length / pageSize);
  const currentRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLoans.slice(startIndex, startIndex + pageSize);
  }, [filteredLoans, currentPage, pageSize]);

  const formatDepartment = (dept: string) => {
    return dept.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatLoanType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatPaymentStatus = (status: string) => {
    switch(status) {
      case 'completed': return 'Completed';
      case 'overdue': return 'Overdue';
      case 'due_today': return 'Due Today';
      case 'due_this_week': return 'Due This Week';
      case 'due_this_month': return 'Due This Month';
      case 'active': return 'Active';
      default: return 'Active';
    }
  };

  const filterSections: FilterSection[] = [
    {
      id: 'employee',
      title: 'Employee',
      type: 'checkbox',
      options: Array.from(new Set(loanPayments.map(l => l.employee.name))).map(name => ({
        id: name,
        label: name
      }))
    },
    {
      id: 'department',
      title: 'Department',
      type: 'checkbox',
      options: Object.values(Department).map(dept => ({
        id: dept,
        label: formatDepartment(dept)
      }))
    },
    {
      id: 'status',
      title: 'Loan Status',
      type: 'checkbox',
      options: [
        { id: LoanStatus.DISBURSED, label: 'Active (Disbursed)' },
        { id: LoanStatus.CLOSED, label: 'Closed' }
      ]
    },
    {
      id: 'payment_status',
      title: 'Payment Status',
      type: 'checkbox',
      options: [
        { id: 'active', label: 'Active' },
        { id: 'overdue', label: 'Overdue' },
        { id: 'completed', label: 'Completed' }
      ]
    },
    {
      id: 'date_range',
      title: 'Date Range',
      type: 'dateRange'
    }
  ];

  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleExport = () => {
    try {
      const csvHeaders = [
        'Loan ID', 'Employee Name', 'Employee Number', 'Department', 'Loan Type',
        'Approved Amount', 'Total Paid', 'Remaining Balance', 'Payments Made',
        'Total Payments', 'Progress %', 'Next Payment Date', 'Status', 'Payment Status'
      ];

      const csvData = filteredLoans.map(loan => [
        loan.loan_request_id,
        loan.employee.name,
        loan.employee.employee_number,
        formatDepartment(loan.employee.department),
        formatLoanType(loan.loan_type),
        loan.approved_amount.toFixed(2),
        loan.total_paid.toFixed(2),
        loan.remaining_balance.toFixed(2),
        loan.payments_made,
        loan.repayment_terms,
        calculatePaymentProgress(loan.payments_made, loan.repayment_terms),
        loan.next_payment_date || 'Completed',
        loan.status,
        formatPaymentStatus(loan.payment_status)
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `loan-payments-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      showSuccess('CSV file exported successfully', 'Export Complete');
    } catch (error) {
      showError('Failed to export data', 'Export Error');
    }
  };

  const handleAddPayment = async (paymentData: any) => {
    try {
      const loan = activeRecord;
      if (!loan) return;

      const newPayment: LoanPayment = {
        id: `P${Date.now()}`,
        loan_id: loan.id,
        payment_amount: paymentData.payment_amount,
        payment_type: paymentData.payment_type,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes,
        processed_by: "Current User",
        processed_at: new Date().toISOString()
      };

      const updatedLoan = {
        ...loan,
        payment_records: [...loan.payment_records, newPayment],
        payments_made: loan.payments_made + 1,
        total_paid: loan.total_paid + paymentData.payment_amount,
        remaining_balance: loan.remaining_balance - paymentData.payment_amount,
        next_payment_date: calculateNextPaymentDate(
          loan.disbursed_date!,
          loan.repayment_terms,
          loan.payments_made + 1
        ),
        is_overdue: false,
        days_overdue: 0
      };

      updatedLoan.payment_status = updatedLoan.remaining_balance === 0 
        ? 'completed' 
        : getPaymentStatus(updatedLoan.next_payment_date, updatedLoan.remaining_balance === 0);

      if (updatedLoan.remaining_balance === 0) {
        updatedLoan.status = LoanStatus.CLOSED;
      }

      setLoanPayments(prev => prev.map(l => l.id === loan.id ? updatedLoan : l));
      setShowAddPaymentModal(false);
      setActiveRecord(null);
      showSuccess('Payment recorded successfully', 'Payment Added');
    } catch (error) {
      showError('Failed to add payment', 'Payment Error');
    }
  };

  const handleCloseLoan = async (closureData: any) => {
    try {
      const loan = activeRecord;
      if (!loan) return;

      const updatedLoan = {
        ...loan,
        status: LoanStatus.CLOSED,
        payment_status: 'completed'
      };

      setLoanPayments(prev => prev.map(l => l.id === loan.id ? updatedLoan : l));
      setShowCloseLoanModal(false);
      setActiveRecord(null);
      showSuccess('Loan closed successfully', 'Loan Closed');
    } catch (error) {
      showError('Failed to close loan', 'Close Error');
    }
  };

  const getActionButtons = (loan: LoanForPaymentPage) => {
    if (loan.status === LoanStatus.CLOSED) {
      return (
        <>
          <button 
            className="viewBtn"
            onClick={() => {
              setActiveRecord(loan);
              setShowViewModal(true);
            }}
            title="View Loan Details"
          >
            <i className="ri-eye-line" />
          </button>
          <button 
            className="submitBtn"
            onClick={() => {
              setActiveRecord(loan);
              setShowPaymentScheduleModal(true);
            }}
            title="Payment Schedule"
          >
            <i className="ri-calendar-check-line" />
          </button>
          <button 
            className="exportBtn"
            onClick={() => {
              console.log('Export loan:', loan.loan_request_id);
            }}
            title="Export Loan"
          >
            <i className="ri-file-download-line" />
          </button>
          <button 
            className="auditBtn"
            onClick={() => {
              setActiveRecord(loan);
              setShowAuditModal(true);
            }}
            title="View Audit Trail"
          >
            <i className="ri-history-line" />
          </button>
        </>
      );
    }

    return (
      <>
        <button 
          className="viewBtn"
          onClick={() => {
            setActiveRecord(loan);
            setShowViewModal(true);
          }}
          title="View Loan Details"
        >
          <i className="ri-eye-line" />
        </button>
        <button 
          className="payBtn"
          onClick={() => {
            setActiveRecord(loan);
            setShowAddPaymentModal(true);
          }}
          title="Add Payment"
        >
          <i className="ri-money-dollar-circle-line" />
        </button>
        <button 
          className="submitBtn"
          onClick={() => {
            setActiveRecord(loan);
            setShowPaymentScheduleModal(true);
          }}
          title="Payment Schedule"
        >
          <i className="ri-calendar-check-line" />
        </button>
  
        <button 
          className="deleteBtn"
          onClick={async () => {
            const result = await showConfirmation(
              `Are you sure you want to <b>CLOSE</b> this loan for ${loan.employee.name}?`,
              'Close Loan'
            );
            if (result.isConfirmed) {
              setActiveRecord(loan);
              setShowCloseLoanModal(true);
            }
          }}
          title="Close Loan"
          disabled={loan.remaining_balance > 0}
        >
          <i className="ri-lock-line" />
        </button>
      </>
    );
  };

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Audit Logs</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setErrorCode(null);
            //refresh logic here
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Loan Payment Management</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Loan Payment Management</h1>
        </div>
        
        <div className="settings">
          <div className="search-filter-container">
            <div className="loan_searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search by employee, loan ID, employee number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <FilterDropdown
              sections={filterSections}
              onApply={handleApplyFilters}
            />
          </div>


          <div className="filters">
            <button 
              onClick={() => setShowPaymentHistoryModal(true)} 
              id="paymentOverview"
              style={{
                backgroundColor: '#23915F',
                color: 'white',
                width: '180px'
              }}
            >
              <i className="ri-file-list-3-line" /> Overview
            </button>
            <button onClick={handleExport} id="export">
              <i className="ri-receipt-line" /> Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Loan Type</th>
                  <th>Amount</th>
                  <th>Payments</th>
                  <th>Next Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(loan => (
                  <tr key={loan.id}>
                    <td>
                      <div>
                        <strong>{loan.employee.name}</strong><br />
                        <small>{loan.employee.employee_number} - {loan.employee.job_title}</small>
                      </div>
                    </td>
                    <td>{formatDepartment(loan.employee.department)}</td>
                    <td>{formatLoanType(loan.loan_type)}</td>
                    <td>
                      <div>
                        <strong>₱{loan.approved_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><br />
                        <small style={{ color: loan.remaining_balance === 0 ? '#23915F' : '#961C1E' }}>
                          Balance: ₱{loan.remaining_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{loan.payments_made} of {loan.repayment_terms} paid</strong><br />
                        <small>({calculatePaymentProgress(loan.payments_made, loan.repayment_terms)}% complete)</small>
                      </div>
                    </td>
                    <td>
                      {loan.next_payment_date ? (
                        <div>
                          <strong>{formatDate(loan.next_payment_date)}</strong><br />
                          <small>₱{loan.next_payment_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                          {loan.is_overdue && (
                            <><br /><small style={{ color: '#FF4949' }}>{loan.days_overdue} days overdue</small></>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#23915F' }}>Completed</span>
                      )}
                    </td>
                    <td className="table-status">
                      <span className={`chip ${loan.payment_status}`}>
                        {formatPaymentStatus(loan.payment_status)}
                      </span>
                    </td>
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        {getActionButtons(loan)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && (
              <p className="noRecords">No loan payments found matching your criteria.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />

        {showViewModal && activeRecord && (
          <ViewLoanPaymentModal
            show={showViewModal}
            loan={activeRecord}
            onClose={() => {
              setShowViewModal(false);
              setActiveRecord(null);
            }}
          />
        )}

        {showAddPaymentModal && activeRecord && (
          <AddPaymentModal
            show={showAddPaymentModal}
            loan={activeRecord}
            onClose={() => {
              setShowAddPaymentModal(false);
              setActiveRecord(null);
            }}
            onSubmit={handleAddPayment}
          />
        )}

        {showPaymentHistoryModal && (
          <PaymentHistory
            show={showPaymentHistoryModal}
            loans={loanPayments}
            onClose={() => {
              setShowPaymentHistoryModal(false);
              setActiveRecord(null);
            }}
            onPayNow={(loan) => {
              setActiveRecord(loan);
              setShowAddPaymentModal(true);
              setShowPaymentHistoryModal(false);
            }}
          />
        )}

        {showCloseLoanModal && activeRecord && (
          <CloseLoanPayment
            show={showCloseLoanModal}
            loan={activeRecord}
            onClose={() => {
              setShowCloseLoanModal(false);
              setActiveRecord(null);
            }}
            onCloseLoan={handleCloseLoan}
          />
        )}

        {showPaymentScheduleModal && (
          <PaymentSchedule
            show={showPaymentScheduleModal}
            loan={activeRecord || currentRecords[0]}
            onClose={() => {
              setShowPaymentScheduleModal(false);
              setActiveRecord(null);
            }}
          />
        )}

        {showAuditModal && activeRecord && (
          <AuditLoanPayment
            show={showAuditModal}
            loan={activeRecord}
            onClose={() => {
              setShowAuditModal(false);
              setActiveRecord(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LoanPaymentPage;
