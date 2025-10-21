"use client";

import React, { useState, useMemo } from 'react';
import '../../../../styles/components/modal.css';
import '../../../../styles/loan-management/paymentSchedule.css';
import {
  showPaymentConfirmation,
  showPaymentSuccess
} from '@/app/utils/Alerts';

interface PaymentScheduleProps {
  show: boolean;
  loan: any;
  onClose: () => void;
  onMakePayment?: (scheduleId: string, dueAmount: number) => void;
  onViewDetails?: (scheduleId: string) => void;
}

type ScheduleStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';

export default function PaymentSchedule({ show, loan, onClose, onMakePayment, onViewDetails }: PaymentScheduleProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);

  if (!show || !loan) return null;

  /**
   * Formats number as Philippine Peso currency
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  /**
   * Formats date to readable format
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  /**
   * Calculate days until/overdue for a payment
   */
  const calculateDaysUntil = (dueDate: string): number => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Determine schedule status
   */
  const getScheduleStatus = (schedule: any): ScheduleStatus => {
    if (schedule.status === 'PAID') return 'PAID';
    
    const daysUntil = calculateDaysUntil(schedule.due_date);
    
    if (schedule.paid_amount > 0 && schedule.paid_amount < schedule.due_amount) {
      return 'PARTIAL';
    }
    
    if (daysUntil < 0) {
      return 'OVERDUE';
    }
    
    return 'PENDING';
  };

  /**
   * Generate payment schedule based on loan terms
   * This creates a schedule if not already in database
   */
  const generateSchedule = useMemo(() => {
    // If loan has explicit schedule, use it
    if (loan.paymentSchedule && loan.paymentSchedule.length > 0) {
      return loan.paymentSchedule.map((schedule: any) => ({
        ...schedule,
        status: getScheduleStatus(schedule)
      }));
    }

    // Otherwise generate schedule from loan terms
    const schedule = [];
    const loanAmount = loan.loan_amount || loan.approved_amount || loan.disbursed_amount || 0;
    const interestRate = loan.interest_rate || 0;
    const totalWithInterest = loanAmount * (1 + interestRate / 100);
    const termMonths = loan.term_months || loan.repayment_terms || 12;
    const monthlyPayment = totalWithInterest / termMonths;
    
    // Handle multiple date field names and ensure valid date
    let startDate = new Date();
    const dateString = loan.approved_date || loan.disbursed_date || loan.request_date || loan.application_date;
    if (dateString) {
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        startDate = parsedDate;
      }
    }

    for (let i = 0; i < termMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      
      // Calculate paid amount from actual payments
      const paidAmount = 0; // Would be calculated from actual payment records
      
      const scheduleItem = {
        schedule_id: `generated-${i}`,
        installment_number: i + 1,
        due_date: dueDate.toISOString(),
        due_amount: monthlyPayment,
        paid_amount: paidAmount,
        status: paidAmount >= monthlyPayment ? 'PAID' : 'PENDING'
      };

      schedule.push({
        ...scheduleItem,
        status: getScheduleStatus(scheduleItem)
      });
    }

    return schedule;
  }, [loan]);

  /**
   * Find the next payment due
   */
  const nextPayment = useMemo(() => {
    return generateSchedule.find((s: any) => 
      s.status === 'PENDING' || s.status === 'OVERDUE' || s.status === 'PARTIAL'
    );
  }, [generateSchedule]);

  /**
   * Calculate summary statistics
   */
  const summary = useMemo(() => {
    const total = generateSchedule.length;
    const paid = generateSchedule.filter((s: any) => s.status === 'PAID').length;
    const overdue = generateSchedule.filter((s: any) => s.status === 'OVERDUE').length;
    const totalAmount = generateSchedule.reduce((sum: number, s: any) => sum + s.due_amount, 0);
    const paidAmount = generateSchedule.reduce((sum: number, s: any) => sum + (s.paid_amount || 0), 0);
    const remainingAmount = totalAmount - paidAmount;

    return {
      total,
      paid,
      overdue,
      pending: total - paid - overdue,
      totalAmount,
      paidAmount,
      remainingAmount,
      progress: (paid / total) * 100
    };
  }, [generateSchedule]);

  /**
   * Handle make payment action
   */
  const handleMakePayment = async (schedule: any) => {
    const loanId = loan.loan_id || loan.loan_request_id || loan.id;
    const result = await showPaymentConfirmation(
      schedule.due_amount - (schedule.paid_amount || 0),
      loanId
    );

    if (result.isConfirmed) {
      if (onMakePayment) {
        onMakePayment(schedule.schedule_id, schedule.due_amount);
        await showPaymentSuccess();
      }
    }
  };

  /**
   * Get status badge color and text
   */
  const getStatusBadge = (status: ScheduleStatus) => {
    const badges = {
      'PAID': { text: 'Paid', className: 'schedule-status-badge paid' },
      'PENDING': { text: 'Pending', className: 'schedule-status-badge pending' },
      'OVERDUE': { text: 'Overdue', className: 'schedule-status-badge overdue' },
      'PARTIAL': { text: 'Partial', className: 'schedule-status-badge partial' }
    };
    return badges[status] || badges['PENDING'];
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContainer" style={{ maxWidth: '1200px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h1>📅 Payment Schedule - {loan.loan_id || loan.loan_request_id || loan.id}</h1>
          <button className="closeButton" onClick={onClose}>&times;</button>
        </div>

        <div className="modalContent payment-schedule-container">
          {/* Next Payment Alert */}
          {nextPayment && (
            <div className={`next-payment-alert ${nextPayment.status === 'OVERDUE' ? 'overdue' : ''}`}>
              <div className="next-payment-icon">
                {nextPayment.status === 'OVERDUE' ? '⚠️' : '📅'}
              </div>
              <div className="next-payment-details">
                <div className="next-payment-title">
                  {nextPayment.status === 'OVERDUE' ? 'Overdue Payment!' : 'Next Payment Due'}
                </div>
                <div className="next-payment-info">
                  <span className="next-payment-amount">{formatCurrency(nextPayment.due_amount - (nextPayment.paid_amount || 0))}</span>
                  <span className="next-payment-date">Due: {formatDate(nextPayment.due_date)}</span>
                  {nextPayment.status === 'OVERDUE' && (
                    <span className="next-payment-overdue">
                      {Math.abs(calculateDaysUntil(nextPayment.due_date))} days overdue
                    </span>
                  )}
                </div>
              </div>
              {onMakePayment && (
                <button
                  className="next-payment-action-btn"
                  onClick={() => handleMakePayment(nextPayment)}
                >
                  Pay Now
                </button>
              )}
            </div>
          )}

          {/* Schedule Summary Grid */}
          <div className="schedule-summary-grid">
            <div className="schedule-summary-card total">
              <div className="summary-card-icon">📊</div>
              <div className="summary-card-content">
                <div className="summary-card-label">Total Installments</div>
                <div className="summary-card-value">{summary.total}</div>
              </div>
            </div>

            <div className="schedule-summary-card paid">
              <div className="summary-card-icon">✅</div>
              <div className="summary-card-content">
                <div className="summary-card-label">Paid</div>
                <div className="summary-card-value">{summary.paid}</div>
              </div>
            </div>

            <div className="schedule-summary-card overdue">
              <div className="summary-card-icon">⚠️</div>
              <div className="summary-card-content">
                <div className="summary-card-label">Overdue</div>
                <div className="summary-card-value">{summary.overdue}</div>
              </div>
            </div>

            <div className="schedule-summary-card pending">
              <div className="summary-card-icon">⏳</div>
              <div className="summary-card-content">
                <div className="summary-card-label">Pending</div>
                <div className="summary-card-value">{summary.pending}</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="schedule-progress-section">
            <div className="schedule-progress-header">
              <span className="schedule-progress-label">Overall Progress</span>
              <span className="schedule-progress-percentage">{summary.progress.toFixed(1)}%</span>
            </div>
            <div className="schedule-progress-bar">
              <div
                className="schedule-progress-fill"
                style={{ width: `${summary.progress}%` }}
              />
            </div>
            <div className="schedule-progress-amounts">
              <span className="schedule-progress-paid">
                Paid: {formatCurrency(summary.paidAmount)}
              </span>
              <span className="schedule-progress-remaining">
                Remaining: {formatCurrency(summary.remainingAmount)}
              </span>
            </div>
          </div>

          {/* Schedule Legend */}
          <div className="schedule-legend">
            <div className="schedule-legend-item">
              <span className="schedule-status-badge paid">Paid</span>
              <span className="schedule-legend-text">Payment completed</span>
            </div>
            <div className="schedule-legend-item">
              <span className="schedule-status-badge pending">Pending</span>
              <span className="schedule-legend-text">Upcoming payment</span>
            </div>
            <div className="schedule-legend-item">
              <span className="schedule-status-badge overdue">Overdue</span>
              <span className="schedule-legend-text">Payment past due</span>
            </div>
            <div className="schedule-legend-item">
              <span className="schedule-status-badge partial">Partial</span>
              <span className="schedule-legend-text">Partially paid</span>
            </div>
          </div>

          {/* Payment Schedule Table */}
          <div className="payment-schedule-table-container">
            <table className="payment-schedule-table">
              <thead>
                <tr>
                  <th>Installment</th>
                  <th>Due Date</th>
                  <th>Days Until/Overdue</th>
                  <th>Amount Due</th>
                  <th>Paid Amount</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {generateSchedule.map((schedule: any, index: number) => {
                  const daysUntil = calculateDaysUntil(schedule.due_date);
                  const balance = schedule.due_amount - (schedule.paid_amount || 0);
                  const statusBadge = getStatusBadge(schedule.status);
                  const isOverdue = schedule.status === 'OVERDUE';
                  const isNextPayment = nextPayment?.schedule_id === schedule.schedule_id;

                  return (
                    <tr
                      key={schedule.schedule_id || index}
                      className={`
                        ${isOverdue ? 'schedule-row-overdue' : ''}
                        ${isNextPayment ? 'schedule-row-next' : ''}
                        ${selectedSchedule === schedule.schedule_id ? 'schedule-row-selected' : ''}
                      `}
                      onClick={() => setSelectedSchedule(schedule.schedule_id)}
                    >
                      <td className="schedule-installment-cell">
                        #{schedule.installment_number}
                        {isNextPayment && <span className="schedule-next-badge">Next</span>}
                      </td>
                      <td>{formatDate(schedule.due_date)}</td>
                      <td className="schedule-days-cell">
                        {daysUntil > 0 && (
                          <span className="schedule-days-badge upcoming">
                            {daysUntil} days
                          </span>
                        )}
                        {daysUntil === 0 && (
                          <span className="schedule-days-badge today">
                            Today
                          </span>
                        )}
                        {daysUntil < 0 && (
                          <span className="schedule-days-badge overdue-days">
                            {Math.abs(daysUntil)} days overdue
                          </span>
                        )}
                      </td>
                      <td className="schedule-amount-cell">
                        {formatCurrency(schedule.due_amount)}
                      </td>
                      <td className="schedule-amount-cell paid">
                        {formatCurrency(schedule.paid_amount || 0)}
                      </td>
                      <td className="schedule-amount-cell balance">
                        {formatCurrency(balance)}
                      </td>
                      <td>
                        <span className={statusBadge.className}>
                          {statusBadge.text}
                        </span>
                      </td>
                      <td>
                        <div className="schedule-row-actions">
                          {schedule.status !== 'PAID' && onMakePayment && (
                            <button
                              className="schedule-action-btn pay"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMakePayment(schedule);
                              }}
                              title="Make Payment"
                            >
                              💳 Pay
                            </button>
                          )}
                          {onViewDetails && (
                            <button
                              className="schedule-action-btn view"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(schedule.schedule_id);
                              }}
                              title="View Details"
                            >
                              👁️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Schedule Footer Summary */}
          <div className="schedule-footer-summary">
            <div className="schedule-footer-item">
              <span className="schedule-footer-label">Total Amount:</span>
              <span className="schedule-footer-value">{formatCurrency(summary.totalAmount)}</span>
            </div>
            <div className="schedule-footer-item">
              <span className="schedule-footer-label">Total Paid:</span>
              <span className="schedule-footer-value paid">{formatCurrency(summary.paidAmount)}</span>
            </div>
            <div className="schedule-footer-item">
              <span className="schedule-footer-label">Total Remaining:</span>
              <span className="schedule-footer-value remaining">{formatCurrency(summary.remainingAmount)}</span>
            </div>
          </div>
        </div>

        <div className="modalFooter">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
