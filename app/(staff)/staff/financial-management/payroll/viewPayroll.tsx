'use client';
import React, { useState } from 'react';
import '../../../../styles/payroll/viewPayroll.css';
import ModalHeader from '@/app/Components/ModalHeader';

// Add types for processed_benefits, processed_deductions, and hr_data_snapshot
interface BenefitItem {
  benefitType: { name: string };
  value: string | number;
  frequency: string;
  prorated: number;
}
interface DeductionItem {
  deductionType: { name: string };
  value: string | number;
  frequency: string;
  prorated: number;
}
interface AttendanceItem {
  date: string;
  status: string;
}
interface HrDataSnapshot {
  attendances?: AttendanceItem[];
  // ...other fields as needed
}

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
  calculation_notes?: string;
  processed_benefits?: BenefitItem[];
  processed_deductions?: DeductionItem[];
  hr_data_snapshot?: HrDataSnapshot;
  // New fields for signature/remarks
  signature?: string;
  remarks?: string;
  holiday_adjustment?: number;
  allowance?: number;
  total_salary?: number;
};

// Payroll period group type
type PayrollPeriodGroup = {
  period_id: string;
  cut_off_period: string;
  payroll_type: "Monthly" | "Semi-Monthly" | "Weekly";
  start_date: string;
  end_date: string;
  employees_covered: number;
  status: "Released" | "Pending";
  total_payroll_amount: number;
  records: PayrollRecord[];
};

type ViewPayrollModalProps = {
  period: PayrollPeriodGroup;
  onClose: () => void;
};

const ViewPayrollModal: React.FC<ViewPayrollModalProps> = ({ period, onClose }) => {
  const [editingSignatures, setEditingSignatures] = useState<{ [key: string]: { signature: string; remarks: string } }>({});
  const [isEditing, setIsEditing] = useState(false);

  // Initialize editing state
  React.useEffect(() => {
    const initialSignatures: { [key: string]: { signature: string; remarks: string } } = {};
    period.records.forEach(record => {
      initialSignatures[record.payroll_id] = {
        signature: record.signature || '',
        remarks: record.remarks || ''
      };
    });
    setEditingSignatures(initialSignatures);
  }, [period]);

  const handleSignatureChange = (payrollId: string, field: 'signature' | 'remarks', value: string) => {
    setEditingSignatures(prev => ({
      ...prev,
      [payrollId]: {
        ...prev[payrollId],
        [field]: value
      }
    }));
  };

  const handleSaveSignatures = async () => {
    try {
      // Update records with new signatures/remarks
      const updatedRecords = period.records.map(record => ({
        ...record,
        signature: editingSignatures[record.payroll_id]?.signature || record.signature,
        remarks: editingSignatures[record.payroll_id]?.remarks || record.remarks
      }));

      // Send to API to update signatures
      await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecords),
      });

      setIsEditing(false);
      // You might want to refresh the data here
    } catch (error) {
      console.error('Failed to save signatures:', error);
    }
  };

  const calculateHolidayAdjustment = (record: PayrollRecord): number => {
    return record.holiday_pay || 0;
  };

  const calculateAllowance = (record: PayrollRecord): number => {
    return (record.revenue_benefit || 0) + (record.safety_benefit || 0) + (record.additional_benefits || 0);
  };

  const calculateTotalSalary = (record: PayrollRecord): number => {
    return record.net_pay || 0;
  };

  return (
    <div className="modalOverlay">
      <div className="viewPayrollModal">
        <ModalHeader title={`View Payroll Details - ${period.payroll_type} (${period.cut_off_period})`} onClose={onClose} />
        <div className="modalBody">
          {/* Period Summary */}
          <div className="mainDetails">
            <h3>Period Summary</h3>
            <div className="detailRow">
              <span className="label">Cut-Off Period:</span>
              <span className="value">{period.cut_off_period}</span>
            </div>
            <div className="detailRow">
              <span className="label">Payroll Type:</span>
              <span className="value">{period.payroll_type}</span>
            </div>
            <div className="detailRow">
              <span className="label">Employees Covered:</span>
              <span className="value">{period.employees_covered}</span>
            </div>
            <div className="detailRow">
              <span className="label">Total Amount:</span>
              <span className="value">₱{period.total_payroll_amount.toLocaleString()}</span>
            </div>
            <div className="detailRow">
              <span className="label">Status:</span>
              <span className="value">{period.status}</span>
            </div>
          </div>

          {/* Employee Details Table */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Employee Details</h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                style={{ 
                  padding: '8px 16px', 
                  background: isEditing ? '#dc3545' : '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {isEditing ? 'Cancel' : 'Edit Signatures'}
              </button>
            </div>
            
            {isEditing && (
              <div style={{ marginBottom: 16 }}>
                <button 
                  onClick={handleSaveSignatures}
                  style={{ 
                    padding: '8px 16px', 
                    background: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            )}

            <table className="grossEarningsTable" style={{ width: '100%', marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Emp No.</th>
                  <th>Start Date</th>
                  <th>Basic Rate</th>
                  <th>Present Days</th>
                  <th>Holiday Adj.</th>
                  <th>Allowance</th>
                  <th>Total Salary</th>
                  <th>Remarks/Signature</th>
                </tr>
              </thead>
              <tbody>
                {period.records.map((record) => (
                  <tr key={record.payroll_id}>
                    <td>{record.employee_name}</td>
                    <td>{record.employee_number}</td>
                    <td>{new Date(record.hire_date).toLocaleDateString()}</td>
                    <td>₱{record.basic_rate.toLocaleString()}/day</td>
                    <td>{record.days_worked}</td>
                    <td>₱{calculateHolidayAdjustment(record).toLocaleString()}</td>
                    <td>₱{calculateAllowance(record).toLocaleString()}</td>
                    <td>₱{calculateTotalSalary(record).toLocaleString()}</td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <input
                            type="text"
                            placeholder="Signature"
                            value={editingSignatures[record.payroll_id]?.signature || ''}
                            onChange={(e) => handleSignatureChange(record.payroll_id, 'signature', e.target.value)}
                            style={{ fontSize: '12px', padding: '2px 4px' }}
                          />
                          <input
                            type="text"
                            placeholder="Remarks"
                            value={editingSignatures[record.payroll_id]?.remarks || ''}
                            onChange={(e) => handleSignatureChange(record.payroll_id, 'remarks', e.target.value)}
                            style={{ fontSize: '12px', padding: '2px 4px' }}
                          />
                        </div>
                      ) : (
                        <div>
                          {record.signature ? (
                            <div style={{ color: '#28a745', fontWeight: 'bold' }}>✔️ {record.signature}</div>
                          ) : (
                            <div style={{ color: '#dc3545' }}>Pending Signature</div>
                          )}
                          {record.remarks && (
                            <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>{record.remarks}</div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed Breakdown (Collapsible) */}
          <div style={{ marginTop: 16 }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#007bff' }}>
                View Detailed Breakdown
              </summary>
              <div style={{ marginTop: 8 }}>
                {period.records.map((record) => (
                  <div key={record.payroll_id} style={{ marginBottom: 16, padding: 12, border: '1px solid #ddd', borderRadius: 4 }}>
                    <h4>{record.employee_name} ({record.employee_number})</h4>
                    
                    <table className="grossEarningsTable" style={{ width: '100%', marginTop: 8 }}>
                      <thead>
                        <tr>
                          <th colSpan={2}>Gross Earnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Basic Pay</td>
                          <td>₱{record.basic_pay.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Overtime (Regular)</td>
                          <td>₱{record.overtime_regular.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Overtime (Holiday)</td>
                          <td>₱{record.overtime_holiday.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Service Incentive Leave</td>
                          <td>₱{record.service_incentive_leave.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Holiday Pay</td>
                          <td>₱{record.holiday_pay.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>13th Month Pay</td>
                          <td>₱{record.thirteenth_month_pay.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Revenue Benefit</td>
                          <td>₱{record.revenue_benefit.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Safety Benefit</td>
                          <td>₱{record.safety_benefit.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Additional Benefits</td>
                          <td>₱{record.additional_benefits.toLocaleString()}</td>
                        </tr>
                        <tr style={{ fontWeight: 'bold', background: '#e9ecef' }}>
                          <td>Gross Total Earnings:</td>
                          <td>₱{record.gross_total_earnings.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="deductionTable" style={{ width: '100%', marginTop: 8 }}>
                      <thead>
                        <tr>
                          <th colSpan={2}>Deductions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>SSS</td>
                          <td>₱{record.sss_deduction.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>PhilHealth</td>
                          <td>₱{record.philhealth_deduction.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Pag-IBIG</td>
                          <td>₱{record.pag_ibig_deduction.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Cash Advance</td>
                          <td>₱{record.cash_advance.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Damage/Shortage</td>
                          <td>₱{record.damage_shortage.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Other Deductions</td>
                          <td>₱{record.other_deductions.toLocaleString()}</td>
                        </tr>
                        <tr style={{ fontWeight: 'bold', background: '#e9ecef' }}>
                          <td>Total Deductions:</td>
                          <td>₱{record.total_deductions.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="bonusTable" style={{ width: '100%', marginTop: 8 }}>
                      <thead>
                        <tr>
                          <th colSpan={2}>Net Pay Summary</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Gross Total Earnings:</strong></td>
                          <td><strong>₱{record.gross_total_earnings.toLocaleString()}</strong></td>
                        </tr>
                        <tr>
                          <td><strong>Total Deductions:</strong></td>
                          <td><strong>₱{record.total_deductions.toLocaleString()}</strong></td>
                        </tr>
                        <tr style={{ fontWeight: 'bold', background: '#d4edda', fontSize: '1.1em' }}>
                          <td>NET PAY:</td>
                          <td>₱{record.net_pay.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
        
        <div className="modalFooter">
          <button className="closeBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewPayrollModal;