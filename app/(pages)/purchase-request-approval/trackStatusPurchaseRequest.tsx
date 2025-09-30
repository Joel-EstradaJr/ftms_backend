'use client';

import React from 'react';
//@ts-ignore
import "../../styles/budget-management/auditTrailBudgetRequest.css";
import { formatDateTime, formatDate } from '../../utility/dateFormatter';
import ModalHeader from '../../Components/ModalHeader';

// Types
interface StatusEntry {
  id: string;
  status: string;
  date: string;
  description: string;
  isCompleted: boolean;
}

interface TrackStatusPurchaseRequestProps {
  requestId: string;
  requestTitle: string;
  onClose: () => void;
}

const TrackStatusPurchaseRequest: React.FC<TrackStatusPurchaseRequestProps> = ({ 
  requestId, 
  requestTitle, 
  onClose 
}) => {
  
  // Mock status tracking data - replace with actual API call
  const statusEntries: StatusEntry[] = [
    {
      id: '1',
      status: 'Request Created',
      date: '2024-03-22T08:30:00Z',
      description: 'Purchase request has been created and is ready for submission',
      isCompleted: true
    },
    {
      id: '2',
      status: 'Submitted for Approval',
      date: '2024-03-22T10:15:00Z',
      description: 'Request submitted to procurement department for review',
      isCompleted: true
    },
    {
      id: '3',
      status: 'Under Review',
      date: '2024-03-23T09:20:00Z',
      description: 'Procurement team is reviewing the request and vendor details',
      isCompleted: true
    },
    {
      id: '4',
      status: 'Approved',
      date: '2024-03-23T14:45:00Z',
      description: 'Request approved by department head, ready for procurement',
      isCompleted: true
    },
    {
      id: '5',
      status: 'Purchase Order Created',
      date: '2024-03-24T08:00:00Z',
      description: 'Purchase order PO-2024-001234 has been created and sent to vendor',
      isCompleted: true
    },
    {
      id: '6',
      status: 'Order Confirmed by Vendor',
      date: '2024-03-24T14:30:00Z',
      description: 'Vendor has confirmed the order with delivery date March 26, 2024',
      isCompleted: true
    },
    {
      id: '7',
      status: 'In Transit',
      date: '2024-03-25T09:00:00Z',
      description: 'Items are currently being shipped to your location',
      isCompleted: true
    },
    {
      id: '8',
      status: 'Delivered & Completed',
      date: '2024-03-26T15:30:00Z',
      description: 'Items delivered successfully and inventory has been updated',
      isCompleted: true
    }
  ];

  // Get current status
  const currentStatusIndex = statusEntries.findIndex(entry => !entry.isCompleted);
  const currentStatus = currentStatusIndex !== -1 ? currentStatusIndex : statusEntries.length - 1;

  // Get status icon
  const getStatusIcon = (status: string, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) {
      return 'ri-check-circle-fill';
    } else if (isCurrent) {
      return 'ri-time-line';
    } else {
      return 'ri-circle-line';
    }
  };

  // Get status color class
  const getStatusColorClass = (status: string, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) {
      return 'timeline-item-completed';
    } else if (isCurrent) {
      return 'timeline-item-pending';
    } else {
      return 'timeline-item-future';
    }
  };

  // Calculate completion percentage
  const completedSteps = statusEntries.filter(entry => entry.isCompleted).length;
  const completionPercentage = Math.round((completedSteps / statusEntries.length) * 100);

  return (
    <div className="modalOverlay">
      <div className="auditTrailBudgetRequestModal">
        <ModalHeader 
        title={`Track Status - ${requestId}`}
        onClose={onClose}
        />
        
        <div className="auditTrailSubheader">
          <div className="requestInfo">
            <h3>{requestTitle}</h3>
            <p>Track the current status and progress of your purchase request</p>
          </div>
          <div className="auditStats">
            <div className="auditStat">
              <span className="statNumber">{completionPercentage}%</span>
              <span className="statLabel">Complete</span>
            </div>
            <div className="auditStat">
              <span className="statNumber">{completedSteps}</span>
              <span className="statLabel">Steps Done</span>
            </div>
            <div className="auditStat">
              <span className="statNumber">{statusEntries.length - completedSteps}</span>
              <span className="statLabel">Remaining</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progressSection" style={{ padding: '20px', backgroundColor: '#f8fafc', margin: '0 20px', borderRadius: '8px', marginBottom: '20px' }}>
          <div className="progressHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: '600', color: '#334155' }}>Overall Progress</span>
            <span style={{ fontWeight: '600', color: '#10b981' }}>{completionPercentage}%</span>
          </div>
          <div className="progressBar" style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              className="progressFill" 
              style={{ 
                width: `${completionPercentage}%`, 
                height: '100%', 
                backgroundColor: '#10b981', 
                transition: 'width 0.3s ease' 
              }}
            />
          </div>
        </div>

        <div className="auditTrailContent">
          <div className="timeline">
            {statusEntries.map((entry, index) => {
              const isCurrent = index === currentStatus && !entry.isCompleted;
              return (
                <div key={entry.id} className={`timeline-item ${getStatusColorClass(entry.status, entry.isCompleted, isCurrent)}`}>
                  <div className="timeline-marker">
                    <i className={getStatusIcon(entry.status, entry.isCompleted, isCurrent)} />
                  </div>
                  
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div className="timeline-action">
                        <h4>{entry.status}</h4>
                        {entry.isCompleted && (
                          <span className="timeline-time">{formatDateTime(entry.date)}</span>
                        )}
                        {isCurrent && (
                          <span className="timeline-time" style={{ color: '#f59e0b', fontWeight: '600' }}>In Progress</span>
                        )}
                        {!entry.isCompleted && !isCurrent && (
                          <span className="timeline-time" style={{ color: '#9ca3af' }}>Pending</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="timeline-details">
                      <p style={{ margin: '8px 0 0 0', color: entry.isCompleted ? '#374151' : '#6b7280' }}>
                        {entry.description}
                      </p>
                    </div>
                  </div>
                  
                  {index < statusEntries.length - 1 && <div className="timeline-connector" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modalButtons">
          <button 
            className="exportAuditBtn" 
            onClick={() => {
              console.log('Refreshing status for:', requestId);
              // In real app, this would refresh the status from the server
            }}
            style={{ backgroundColor: '#3b82f6' }}
          >
            <i className="ri-refresh-line" /> Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackStatusPurchaseRequest;