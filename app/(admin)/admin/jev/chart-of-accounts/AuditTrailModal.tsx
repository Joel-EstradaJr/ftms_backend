'use client';

import React, { useState, useEffect } from 'react';
import ModalHeader from '@/app/Components/ModalHeader';
import { formatDateTime } from '@/app/utils/formatting';
import { AuditLog } from '@/app/types/jev';
import '@/app/styles/jev/auditTrail.css';
import '@/app/styles/components/modal.css';

interface AuditTrailModalProps {
  recordId: string;
  recordType: string;
  recordName: string;
  onClose: () => void;
}

const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ 
  recordId, 
  recordType, 
  recordName, 
  onClose 
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call (replace with actual API)
    setTimeout(() => {
      const sampleLogs: AuditLog[] = [
        {
          audit_id: '1',
          action: 'UPDATE',
          table_affected: recordType,
          record_id: recordId,
          performed_by: 'admin_user',
          performed_at: '2024-10-15T10:30:00',
          details: 'Updated account description',
          old_values: { description: 'Old description' },
          new_values: { description: 'New updated description' }
        },
        {
          audit_id: '2',
          action: 'CREATE',
          table_affected: recordType,
          record_id: recordId,
          performed_by: 'system',
          performed_at: '2024-01-01T08:00:00',
          details: 'Account created',
          old_values: null,
          new_values: { account_code: '1010', account_name: 'Cash on Hand' }
        }
      ];

      setAuditLogs(sampleLogs);
      setLoading(false);
    }, 500);
  }, [recordId, recordType]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'ri-add-circle-line';
      case 'UPDATE':
        return 'ri-edit-line';
      case 'DELETE':
        return 'ri-delete-bin-line';
      case 'ARCHIVE':
        return 'ri-archive-line';
      case 'RESTORE':
        return 'ri-refresh-line';
      default:
        return 'ri-file-list-line';
    }
  };

  const getActionClass = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'info';
      case 'DELETE':
      case 'ARCHIVE':
        return 'error';
      case 'RESTORE':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContainer auditTrailModal">
        <ModalHeader 
          title={`Audit Trail - ${recordName}`}
          onClose={onClose} 
          showDateTime={false} 
        />

        <div className="modalContent">
          {loading ? (
            <div className="loading-section">
              <p>Loading audit trail...</p>
            </div>
          ) : (
            <div className="audit-trail-content">
              {auditLogs.length === 0 ? (
                <p className="noRecords">No audit trail records found.</p>
              ) : (
                <div className="timeline">
                  {auditLogs.map((log) => (
                    <div key={log.audit_id} className={`timeline-item ${getActionClass(log.action)}`}>
                      <div className="timeline-marker">
                        <i className={getActionIcon(log.action)}></i>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <h4>{log.action}</h4>
                          <span className="timeline-date">{formatDateTime(log.performed_at)}</span>
                        </div>
                        <p className="timeline-details">{log.details}</p>
                        <p className="timeline-user">
                          <i className="ri-user-line"></i> {log.performed_by}
                        </p>
                        
                        {(log.old_values || log.new_values) && (
                          <div className="timeline-changes">
                            <details>
                              <summary>View Changes</summary>
                              <div className="changes-grid">
                                {log.old_values && (
                                  <div className="old-values">
                                    <strong>Before:</strong>
                                    <pre>{JSON.stringify(log.old_values, null, 2)}</pre>
                                  </div>
                                )}
                                {log.new_values && (
                                  <div className="new-values">
                                    <strong>After:</strong>
                                    <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="modalButtons">
            <button className="cancelButton" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailModal;
