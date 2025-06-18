// app\Components\addRevenue.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../styles/addRevenue.css';
import axios from 'axios'; // ✅ Required for PUT request
import {
  showEmptyFieldWarning,
  showAddConfirmation,
  showAddSuccess,
  showInvalidAmountAlert
} from '../utility/Alerts';
import { isValidAmount } from '../utility/validation';
import { formatDate } from '../utility/dateFormatter';

type AddRevenueProps = {
  onClose: () => void;
  onAddRevenue: (formData: {
    category: string;
    assignment_id?: string;
    total_amount: number;
    collection_date: string;
    created_by: string;
    other_source?: string;
  }) => void;
  assignments: {
    assignment_id: string;
    bus_bodynumber: string;
    bus_route: string;
    bus_type: string;
    driver_name: string;
    conductor_name: string;
    date_assigned: string;
    trip_revenue: number;
    assignment_type: 'Boundary' | 'Percentage' | 'Bus_Rental';
    is_revenue_recorded: boolean;
  }[];
  currentUser: string;
};

const AddRevenue: React.FC<AddRevenueProps> = ({ 
  onClose, 
  onAddRevenue,
  assignments,
  currentUser 
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [maxDate, setMaxDate] = useState("");
  const [filteredAssignments, setFilteredAssignments] = useState(assignments.filter(a => !a.is_revenue_recorded));
  
  const [formData, setFormData] = useState({
    category: 'Boundary',
    assignment_id: '',
    total_amount: 0,
    collection_date: new Date().toISOString().split('T')[0],
    created_by: currentUser,
    other_source: '',
  });

  // Set maxDate to today on mount
  useEffect(() => {
    const today = new Date();
    setMaxDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(formatDate(now));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (formData.category === 'Other') {
      setFilteredAssignments([]);
      setFormData(prev => ({
        ...prev,
        assignment_id: '',
        total_amount: 0
      }));
    } else {
      const filtered = assignments.filter(a => {
        if (a.is_revenue_recorded) return false;
        if (formData.category === 'Boundary') return a.assignment_type === 'Boundary';
        if (formData.category === 'Percentage') return a.assignment_type === 'Percentage';
        if (formData.category === 'Bus_Rental') return a.assignment_type === 'Bus_Rental';
        return false;
      }).sort((a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime());
      setFilteredAssignments(filtered);
    }
  }, [formData.category, assignments]);

  useEffect(() => {
    if (formData.assignment_id && formData.category !== 'Other') {
      const selectedAssignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (selectedAssignment) {
        setFormData(prev => ({
          ...prev,
          total_amount: selectedAssignment.trip_revenue
        }));
      }
    }
  }, [formData.assignment_id, assignments, formData.category]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        assignment_id: '',
        total_amount: 0
      }));
    } else if (name === 'total_amount' && formData.category === 'Other') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { category, assignment_id, total_amount, collection_date, other_source } = formData;

    if (!category || !collection_date || !currentUser ) {
      await showEmptyFieldWarning();
      return;
    }

    if (category !== 'Other' && !assignment_id) {
      await showEmptyFieldWarning();
      return;
    }

    if (category === 'Other' && !other_source) {
      await showEmptyFieldWarning();
      return;
    }

    if (!isValidAmount(total_amount)) {
      await showInvalidAmountAlert();
      return;
    }

    const result = await showAddConfirmation();

    if (result.isConfirmed) {
      try {
        await onAddRevenue({
          category,
          total_amount,
          collection_date,
          created_by: currentUser,
          ...(category !== 'Other' ? { assignment_id } : { other_source })
        });

        // Update is_revenue_recorded in Supabase if assignment is used
        if (assignment_id) {
          await axios.put(`/api/assignments/${assignment_id}`, {
            is_revenue_recorded: true
          });
        }

        await showAddSuccess();
        onClose();
      } catch (error: unknown) {
        console.error('Error adding revenue:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        Swal.fire('Error', 'Failed to add revenue: ' + errorMessage, 'error');
      }
    }
  };

  // Format assignment for display
  const formatAssignment = (assignment: typeof assignments[0]) => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    return `₱ ${assignment.trip_revenue} | ${busType} | ${assignment.bus_bodynumber} - ${assignment.bus_route} | ${assignment.driver_name.split(' ').pop()} & ${assignment.conductor_name.split(' ').pop()} | ${formatDate(assignment.date_assigned)}`;
  };

  return (
    <div className="modalOverlay">
      <div className="addRevenueModal">
        <div className="modalHeader">
          <h2>Add Revenue</h2>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="formFieldsHorizontal">
            <div className="formLabels">
              <div className="formLabel">Category</div>
              <div className="formLabel">Source</div>
              <div className="formLabel">Amount</div>
              <div className="formLabel">Collection Date</div>
            </div>
            
            <div className="formInputs">
              {/* CATEGORY */}
              <div className="formField">
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="formSelect"
                >
                  <option value="Boundary">Boundary</option>
                  <option value="Percentage">Percentage</option>
                  <option value="Bus_Rental">Bus Rental</option>
                  <option value="Other">Other</option>
                </select>
                <span className='requiredTag'> *</span>
              </div>

              {/* SOURCE */}
              <div className="formField">
                {formData.category === 'Other' ? (
                  <>
                    <input
                      type="text"
                      id="other_source"
                      name="other_source"
                      value={formData.other_source}
                      onChange={handleInputChange}
                      placeholder="Please specify"
                      required
                      className="formInput"
                    />
                    <span className='requiredTag'> *</span>
                  </>
                ) : (
                  <>
                    <select
                      id="assignment_id"
                      name="assignment_id"
                      value={formData.assignment_id}
                      onChange={handleInputChange}
                      required
                      className="formSelect"
                      disabled={filteredAssignments.length === 0}
                    >
                      <option value="">Select {formData.category} Assignment</option>
                      {filteredAssignments.map((assignment) => (
                        <option 
                          key={assignment.assignment_id} 
                          value={assignment.assignment_id}
                        >
                          {formatAssignment(assignment)}
                        </option>
                      ))}
                    </select>
                    <span className='requiredTag'> *</span>
                  </>
                )}

                {formData.category !== 'Other' && filteredAssignments.length === 0 && (
                  <div className="noAssignments">No {formData.category} assignments available</div>
                )}
              </div>

              {/* AMOUNT */}
              <div className="formField">
                {formData.category === 'Other' ? (
                  <>
                    <input
                      type="number"
                      id="total_amount"
                      name="total_amount"
                      value={formData.total_amount || ''}
                      onChange={handleInputChange}
                      placeholder="Enter amount"
                      required
                      className="formInput"
                      min="0"
                      step="0.01"
                    />
                    <span className='requiredTag'> *</span>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      id="total_amount"
                      name="total_amount"
                      value={formData.total_amount.toLocaleString()}
                      readOnly
                      className="formInput"
                    />
                    <span className='requiredTag'> *</span>
                  </>
                )}
              </div>

              {/* DATE */}
              <div className="formField">
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.collection_date}
                  onChange={handleInputChange}
                  required
                  className="formInput"
                  max={maxDate}
                />
                <span className='requiredTag'> *</span>
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="button" className="cancelButton" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="addButton">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRevenue;