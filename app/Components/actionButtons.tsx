import React from "react";
//@ts-ignore
import "../styles/components/actionButtons.css";

interface ActionButtonsProps {
    onView?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onCancel?: () => void;
    onRollback?: () => void;
    onExport?: () => void;
    onAuditTrail?: () => void;
    onProcessRefund?: () => void;
    onTrackStatus?: () => void;
    disableView?: boolean;
    disableEdit?: boolean;
    disableDelete?: boolean;
    disableCancel?: boolean;
    disableRollback?: boolean;
    disableExport?: boolean;
    disableAuditTrail?: boolean;
    disableProcessRefund?: boolean;
    disableTrackStatus?: boolean;
}

const ActionButtons = ({
    onView,
    onEdit,
    onDelete,
    onCancel,
    onRollback,
    onExport,
    onAuditTrail,
    onProcessRefund,
    onTrackStatus,
    disableView = false,
    disableEdit = false,
    disableDelete = false,
    disableCancel = false,
    disableRollback = false,
    disableExport = false,
    disableAuditTrail = false,
    disableProcessRefund = false,
    disableTrackStatus = false
}: ActionButtonsProps) => {
    return (
        <div className="action-buttons">
            {onView && (
                <button
                    className={`action-btn view${disableView ? ' disabled' : ''}`}
                    onClick={onView}
                    title="View"
                >
                    <i className="ri-eye-line"></i>
                </button>
            )}
            {onEdit && (
                <button
                    className={`action-btn edit${disableEdit ? ' disabled' : ''}`}
                    onClick={onEdit}
                    title="Edit"
                >
                    <i className="ri-edit-2-line"></i>
                </button>
            )}
            {onDelete && (
                <button
                    className={`action-btn delete${disableDelete ? ' disabled' : ''}`}
                    onClick={onDelete}
                    title="Delete"
                >
                    <i className="ri-delete-bin-line"></i>
                </button>
            )}
            {onCancel && (
                <button
                    className={`action-btn cancel${disableCancel ? ' disabled' : ''}`}
                    onClick={onCancel}
                    title="Cancel"
                >
                    <i className="ri-close-line"></i>
                </button>
            )}
            {onRollback && (
                <button
                    className={`action-btn rollback${disableRollback ? ' disabled' : ''}`}
                    onClick={onRollback}
                    title="Rollback"
                >
                    <i className="ri-arrow-go-back-line"></i>
                </button>
            )}
            {onExport && (
                <button
                    className={`action-btn export${disableExport ? ' disabled' : ''}`}
                    onClick={onExport}
                    title="Export"
                >
                    <i className="ri-download-line"></i>
                </button>
            )}
            {onAuditTrail && (
                <button
                    className={`action-btn audit${disableAuditTrail ? ' disabled' : ''}`}
                    onClick={onAuditTrail}
                    title="Audit Trail"
                >
                    <i className="ri-file-list-line"></i>
                </button>
            )}
            {onProcessRefund && (
                <button
                    className={`action-btn refund${disableProcessRefund ? ' disabled' : ''}`}
                    onClick={onProcessRefund}
                    title="Process Refund"
                >
                    <i className="ri-refund-line"></i>
                </button>
            )}
            {onTrackStatus && (
                <button
                    className={`action-btn track${disableTrackStatus ? ' disabled' : ''}`}
                    onClick={onTrackStatus}
                    title="Track Status"
                >
                    <i className="ri-truck-line"></i>
                </button>
            )}
        </div>
    );
};

export default ActionButtons;