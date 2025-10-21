"use client";
import React, { useState } from "react";
import { showSuccess, showError } from '../../../utils/Alerts';
import "../../styles/reimbursement/applyReimbursement.css";
import EmployeeSelectorModal, { Employee } from "../../../Components/employeeSelector";
import ModalHeader from '@/app/Components/ModalHeader';

interface ApplyReimbursementProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reimbursementData: ReimbursementFormData) => void;
}

type ReimbursementFormData = {
  expense_id: string;
  employee_id: string;
  amount: number;
  notes: string;
  receipt_file?: File;
};


const ApplyReimbursement: React.FC<ApplyReimbursementProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<ReimbursementFormData>({
    expense_id: '',
    employee_id: '',
    amount: 0,
    notes: '',
  });
  
  //state for the employee selector
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  // Fix: Declare both error state and setter function properly
  const [, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees] = useState<Employee[]>([]);


  // Example: useEffect to fetch employees from API
  // React.useEffect(() => {
  //   fetch('/api/employees')
  //     .then(res => res.json())
  //     .then(data => setEmployees(data));
  // }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  // const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setReceiptFile(e.target.files[0]);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.amount) {
      showError('Please fill in all required fields', 'Error');
      return;
    }

    if (formData.amount <= 0) {
      showError('Amount must be greater than 0', 'Error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Generate an expense ID if it's empty
      const randomExpenseId = `E${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const submissionData = {
        ...formData,
        expense_id: formData.expense_id || randomExpenseId,
        receipt_file: receiptFile || undefined,
        employeeDetails: selectedEmployee
      };
      
      if (onSubmit) await onSubmit(submissionData);
      
      // Reset form
      setFormData({
        expense_id: '',
        employee_id: '',
        amount: 0,
        notes: '',
      });
      setReceiptFile(null);
      setSelectedEmployee(null);
      
      showSuccess('Reimbursement application submitted successfully!', 'Success');
      onClose();
    } catch(error) {
        console.error('Error submitting reimbursement:', error);
        // Fix: Now setError is properly declared as a function
        setError('Failed to submit reimbursement application');
        showError('Failed to submit reimbursement application', 'Error');
      } finally {
        setIsSubmitting(false);
      }
    };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        expense_id: '',
        employee_id: '',
        amount: 0,
        notes: '',
      });
      setReceiptFile(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="modalOverlay" onClick={handleClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <ModalHeader title="Apply for Reimbursement" onClose={handleClose} />

        <div className="modalBody">
          <div className="form-container">

            <div className="form-group">
              <label>
                Employee<span className='requiredTags'> *</span>
              </label>
              <button
                type="button"
                className="btn btn-employee"
                onClick={() => setEmployeeModalOpen(true)}
                disabled={isSubmitting}
                style={{ textAlign: "left" }}
              >
                {selectedEmployee
                  ? `${selectedEmployee.employee_name} (${selectedEmployee.job}, ${selectedEmployee.department})`
                  : "Select Employee"}
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="amount">
                Amount (₱)<span className='requiredTags'> *</span>
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount || ''}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any additional notes or description..."
                rows={4}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="modalFooter">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="ri-loader-line spinning"></i>
                Submitting...
              </>
            ) : (
              <>
                <i className="ri-send-plane-line"/> Submit Application
              </>
            )}
          </button>
        </div>
        <EmployeeSelectorModal
          isOpen={employeeModalOpen}
          onClose={() => setEmployeeModalOpen(false)}
          employees={employees}
          onSelect={(emp) => {
            setSelectedEmployee(emp); // for display
            setFormData(prev => ({
              ...prev,
              employee_id: emp.employee_id // for submission (hidden)
            }));
          }}
        />
      </div>
      
    </div>
    </>
  );
};

export default ApplyReimbursement;