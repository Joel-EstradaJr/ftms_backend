'use client';

import React from 'react';
//@ts-ignore
import "../../styles/budget-management/auditTrailBudgetRequest.css";
import { formatDateTime, formatDate } from '../../utility/dateFormatter';
import ModalHeader from '../../Components/ModalHeader';

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

interface AuditTrailPurchaseRequestProps {
  requestId: string;
  requestTitle: string;
  onClose: () => void;
}

const AuditTrailPurchaseRequest: React.FC<AuditTrailPurchaseRequestProps> = ({ 
  requestId, 
  requestTitle, 
  onClose 
}) => {
  
  // Mock audit data for purchase requests - replace with actual API call
  const auditLogs: AuditLogEntry[] = [
    {
      id: '1',
      action: 'Created',
      user: 'Admin User',
      user_role: 'Administrator',
      timestamp: '2024-03-22T08:30:00Z',
      details: 'Purchase request created for vehicle maintenance supplies',
      ip_address: '192.168.1.45',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '2',
      action: 'Modified',
      user: 'Admin User',
      user_role: 'Administrator',
      timestamp: '2024-03-22T09:45:30Z',
      details: 'Updated purchase request item details and quantities',
      changes: [
        {
          field: 'quantity',
          old_value: 5,
          new_value: 8
        },
        {
          field: 'unit_price',
          old_value: 450.00,
          new_value: 420.00
        },
        {
          field: 'vendor',
          old_value: 'AutoParts Inc.',
          new_value: 'Premium Auto Supply'
        },
        {
          field: 'request_purpose',
          old_value: 'Replacement parts',
          new_value: 'Emergency replacement of brake discs for Bus 001 - safety critical'
        }
      ],
      ip_address: '192.168.1.45',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '3',
      action: 'Submitted',
      user: 'Admin User',
      user_role: 'Administrator',
      timestamp: '2024-03-22T10:15:00Z',
      details: 'Purchase request submitted for approval',
      ip_address: '192.168.1.45',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '4',
      action: 'Reviewed',
      user: 'Procurement Manager',
      user_role: 'Procurement Department',
      timestamp: '2024-03-23T09:20:00Z',
      details: 'Purchase request reviewed - vendor verification in progress',
      ip_address: '192.168.1.102',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '5',
      action: 'Updated',
      user: 'Procurement Manager',
      user_role: 'Procurement Department',
      timestamp: '2024-03-23T11:30:00Z',
      details: 'Added vendor quotation and delivery timeline',
      changes: [
        {
          field: 'delivery_date',
          old_value: 'Not specified',
          new_value: '2024-03-26'
        },
        {
          field: 'status',
          old_value: 'pending',
          new_value: 'approved'
        }
      ],
      ip_address: '192.168.1.102',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '6',
      action: 'Approved',
      user: 'Department Head',
      user_role: 'Operations Manager',
      timestamp: '2024-03-23T14:45:00Z',
      details: 'Purchase request approved - proceeding to procurement',
      ip_address: '192.168.1.95',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '7',
      action: 'Ordered',
      user: 'Procurement Manager',
      user_role: 'Procurement Department',
      timestamp: '2024-03-24T08:00:00Z',
      details: 'Purchase order placed with approved vendor',
      changes: [
        {
          field: 'purchase_order_id',
          old_value: 'Not assigned',
          new_value: 'PO-2024-001234'
        },
        {
          field: 'status',
          old_value: 'approved',
          new_value: 'ordered'
        }
      ],
      ip_address: '192.168.1.102',
      user_agent: 'Chrome/122.0.0.0'
    },
    {
      id: '8',
      action: 'Completed',
      user: 'Warehouse Manager',
      user_role: 'Inventory Management',
      timestamp: '2024-03-26T15:30:00Z',
      details: 'Items received and inventory updated - purchase request completed',
      changes: [
        {
          field: 'status',
          old_value: 'ordered',
          new_value: 'completed'
        },
        {
          field: 'received_date',
          old_value: 'Not received',
          new_value: '2024-03-26'
        }
      ],
      ip_address: '192.168.1.88',
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
      case 'ordered':
        return 'ri-shopping-cart-line';
      case 'completed':
        return 'ri-check-double-line';
      case 'cancelled':
        return 'ri-close-circle-line';
      case 'refunded':
        return 'ri-refund-line';
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
      case 'ordered':
        return 'timeline-item-ordered';
      case 'completed':
        return 'timeline-item-completed';
      case 'cancelled':
        return 'timeline-item-cancelled';
      case 'refunded':
        return 'timeline-item-refunded';
      case 'deleted':
        return 'timeline-item-deleted';
      default:
        return 'timeline-item-default';
    }
  };

  // Format changes for display
  const formatChange = (change: { field: string; old_value: string | number; new_value: string | number }) => {
    const fieldName = change.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Handle different field types for purchase requests
    if (change.field === 'unit_price' || change.field === 'total_amount') {
      return `${fieldName}: ₱${Number(change.old_value).toLocaleString()} → ₱${Number(change.new_value).toLocaleString()}`;
    }
    
    if (change.field === 'quantity') {
      return `${fieldName}: ${change.old_value} → ${change.new_value}`;
    }
    
    if (change.field === 'delivery_date' || change.field === 'received_date') {
      return `${fieldName}: ${change.old_value} → ${change.new_value}`;
    }
    
    if (change.field === 'status') {
      const oldStatus = String(change.old_value).replace(/\b\w/g, l => l.toUpperCase());
      const newStatus = String(change.new_value).replace(/\b\w/g, l => l.toUpperCase());
      return `${fieldName}: ${oldStatus} → ${newStatus}`;
    }
    
    return `${fieldName}: "${change.old_value}" → "${change.new_value}"`;
  };

  // Handle export audit log
  const handleExportAudit = () => {
    console.log('Exporting purchase request audit trail for:', requestId);
    // Implement actual export logic here
    // Could generate CSV, PDF, or JSON export of the audit trail
  };

  return (
    <div className="modalOverlay">
      <div className="auditTrailBudgetRequestModal">
        <ModalHeader 
        title={`Purchase Request Audit Trail - ${requestId}`}
        onClose={onClose}
        />
        
        <div className="auditTrailSubheader">
          <div className="requestInfo">
            <h3>{requestTitle}</h3>
            <p>Complete activity log for this purchase request</p>
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
            <div className="auditStat">
              <span className="statNumber">{auditLogs.filter(log => log.changes).length}</span>
              <span className="statLabel">Modifications</span>
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

export default AuditTrailPurchaseRequest;