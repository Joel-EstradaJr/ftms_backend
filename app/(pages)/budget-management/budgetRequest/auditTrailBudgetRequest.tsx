'use client';

import React from 'react';
import "../../../styles/budget-management/auditTrailBudgetRequest.css";
import { formatDateTime, formatDate } from '../../../utility/dateFormatter';
import ModalHeader from '../../../Components/ModalHeader';

// Types
interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  user_role: string;
  timestamp: string;
  details: string;
  changes?: {
    field: string;
    old_value: string | number;
    new_value: string | number;
  }[];
  ip_address?: string;
  user_agent?: string;
}

interface AuditTrailBudgetRequestProps {
  requestId: string;
  requestTitle: string;
  onClose: () => void;
}

const AuditTrailBudgetRequest: React.FC<AuditTrailBudgetRequestProps> = ({ 
  requestId, 
  requestTitle, 
  onClose 
}) => {
  
  // Mock audit data - replace with actual API call
  const auditLogs: AuditLogEntry[] = [
    {
      id: '1',
      action: 'Created',
      user: 'Lisa Martinez',
      user_role: 'Department Head',
      timestamp: '2024-03-22T08:45:00Z',
      details: 'Budget request created with initial draft status',
      ip_address: '192.168.1.45',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '2',
      action: 'Modified',
      user: 'Lisa Martinez',
      user_role: 'Department Head',
      timestamp: '2024-03-22T09:15:30Z',
      details: 'Updated budget request details and amount',
      changes: [
        {
          field: 'requested_amount',
          old_value: 15000,
          new_value: 18000
        },
        {
          field: 'description',
          old_value: 'Basic office equipment',
          new_value: 'Replacement of outdated computers and office equipment for administrative staff'
        }
      ],
      ip_address: '192.168.1.45',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '3',
      action: 'Submitted',
      user: 'Lisa Martinez',
      user_role: 'Department Head',
      timestamp: '2024-03-22T14:30:00Z',
      details: 'Budget request submitted for approval',
      ip_address: '192.168.1.45',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '4',
      action: 'Reviewed',
      user: 'Finance Admin',
      user_role: 'Finance Administrator',
      timestamp: '2024-03-23T10:20:00Z',
      details: 'Request reviewed and additional documentation requested',
      ip_address: '192.168.1.100',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '5',
      action: 'Updated',
      user: 'Lisa Martinez',
      user_role: 'Department Head',
      timestamp: '2024-03-23T15:45:00Z',
      details: 'Added supporting documents as requested',
      ip_address: '192.168.1.45',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '6',
      action: 'Approved',
      user: 'Finance Admin',
      user_role: 'Finance Administrator',
      timestamp: '2024-03-24T11:30:00Z',
      details: 'Budget request approved and funds allocated',
      ip_address: '192.168.1.100',
      user_agent: 'Chrome/122.0.0.0'
    }
  ];

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'ri-add-circle-line';
      case 'modified':
      case 'updated':
        return 'ri-edit-circle-line';
      case 'submitted':
        return 'ri-send-plane-line';
      case 'reviewed':
        return 'ri-eye-line';
      case 'approved':
        return 'ri-check-circle-line';
      case 'rejected':
        return 'ri-close-circle-line';
      case 'closed':
        return 'ri-archive-line';
      case 'deleted':
        return 'ri-delete-bin-line';
      default:
        return 'ri-history-line';
    }
  };

  // Get action color class
  const getActionColorClass = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'timeline-item-created';
      case 'modified':
      case 'updated':
        return 'timeline-item-modified';
      case 'submitted':
        return 'timeline-item-submitted';
      case 'reviewed':
        return 'timeline-item-reviewed';
      case 'approved':
        return 'timeline-item-approved';
      case 'rejected':
        return 'timeline-item-rejected';
      case 'closed':
        return 'timeline-item-closed';
      case 'deleted':
        return 'timeline-item-deleted';
      default:
        return 'timeline-item-default';
    }
  };

  // Format changes for display
  const formatChange = (change: { field: string; old_value: string | number; new_value: string | number }) => {
    const fieldName = change.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    if (change.field === 'requested_amount') {
      return `${fieldName}: ₱${Number(change.old_value).toLocaleString()} → ₱${Number(change.new_value).toLocaleString()}`;
    }
    
    return `${fieldName}: "${change.old_value}" → "${change.new_value}"`;
  };

  // Handle export audit log
  const handleExportAudit = () => {
    console.log('Exporting audit trail for:', requestId);
    // Implement actual export logic here
  };

  return (
    <div className="modalOverlay">
      <div className="auditTrailBudgetRequestModal">
        <ModalHeader 
        title={`Audit Trail - ${requestId}`}
        onClose={onClose}
        />
        
        <div className="auditTrailSubheader">
          <div className="requestInfo">
            <h3>{requestTitle}</h3>
            <p>Complete activity log for this budget request</p>
          </div>
          <div className="auditStats">
            <div className="auditStat">
              <span className="statNumber">{auditLogs.length}</span>
              <span className="statLabel">Total Actions</span>
            </div>
            <div className="auditStat">
              <span className="statNumber">{new Set(auditLogs.map(log => log.user)).size}</span>
              <span className="statLabel">Users Involved</span>
            </div>
          </div>
        </div>

        <div className="auditTrailContent">
          <div className="timeline">
            {auditLogs.map((log, index) => (
              <div key={log.id} className={`timeline-item ${getActionColorClass(log.action)}`}>
                <div className="timeline-marker">
                  <i className={getActionIcon(log.action)} />
                </div>
                
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div className="timeline-action">
                      <h4>{log.action}</h4>
                      <span className="timeline-time">{formatDateTime(log.timestamp)}</span>
                    </div>
                    <div className="timeline-user">
                      <div className="user-info">
                        <span className="user-name">{log.user}</span>
                        <span className="user-role">{log.user_role}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="timeline-details">
                    <p>{log.details}</p>
                    
                    {log.changes && log.changes.length > 0 && (
                      <div className="changes-section">
                        <h5>Changes Made:</h5>
                        <ul className="changes-list">
                          {log.changes.map((change, changeIndex) => (
                            <li key={changeIndex} className="change-item">
                              {formatChange(change)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="timeline-meta">
                      <div className="meta-item">
                        <i className="ri-global-line" />
                        <span>IP: {log.ip_address}</span>
                      </div>
                      <div className="meta-item">
                        <i className="ri-computer-line" />
                        <span>Browser: {log.user_agent}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < auditLogs.length - 1 && <div className="timeline-connector" />}
              </div>
            ))}
          </div>
        </div>

        <div className="modalButtons">
          <button className="exportAuditBtn" onClick={handleExportAudit}>
            <i className="ri-download-line" /> Export Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailBudgetRequest;