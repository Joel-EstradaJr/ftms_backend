"use client";
import React, { useEffect, useMemo, useState } from "react";

type Props = {
  driverName: string;
  conductorName: string;
  driverAmount: string | number;
  conductorAmount: string | number;
  totalAmount: number;
  onDriverAmountChange: (value: string) => void;
  onConductorAmountChange: (value: string) => void;
  onValidityChange?: (valid: boolean, error: string | null, sum: number) => void;
  title?: string;
};

const ReimbursementBreakdownForm: React.FC<Props> = ({
  driverName,
  conductorName,
  driverAmount,
  conductorAmount,
  totalAmount,
  onDriverAmountChange,
  onConductorAmountChange,
  onValidityChange,
  title = "Reimbursement Breakdown",
}) => {
  const [localDriver, setLocalDriver] = useState<string>(String(driverAmount ?? ""));
  const [localConductor, setLocalConductor] = useState<string>(String(conductorAmount ?? ""));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalDriver(String(driverAmount ?? ""));
  }, [driverAmount]);
  useEffect(() => {
    setLocalConductor(String(conductorAmount ?? ""));
  }, [conductorAmount]);

  const sum = useMemo(() => {
    const d = parseFloat(localDriver || "0");
    const c = parseFloat(localConductor || "0");
    return (isNaN(d) ? 0 : d) + (isNaN(c) ? 0 : c);
  }, [localDriver, localConductor]);

  useEffect(() => {
    let err: string | null = null;
    if (sum < 1) {
      err = "Enter at least 1.00 total reimbursement";
    } else if (sum > (Number(totalAmount) || 0)) {
      err = "Sum of reimbursements cannot exceed total expense amount";
    }
    setError(err);
    onValidityChange?.(!err, err, sum);
  }, [sum, totalAmount, onValidityChange]);

  return (
    <div className="formSection" style={{ marginTop: 16 }}>
      <div className="sectionHeader">
        <h4 style={{ margin: 0 }}>{title}</h4>
        <small style={{ color: "#666" }}>Amounts editable • Names read-only</small>
      </div>

      <div className="gridTwoCols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div className="formGroup">
          <label className="formLabel">Driver</label>
          <input className="formInput" type="text" value={driverName || "Driver"} readOnly />
          <input
            className="formInput"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={localDriver}
            onChange={(e) => {
              setLocalDriver(e.target.value);
              onDriverAmountChange(e.target.value);
            }}
          />
        </div>

        <div className="formGroup">
          <label className="formLabel">Conductor</label>
          <input className="formInput" type="text" value={conductorName || "Conductor"} readOnly />
          <input
            className="formInput"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={localConductor}
            onChange={(e) => {
              setLocalConductor(e.target.value);
              onConductorAmountChange(e.target.value);
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>Subtotal:</strong> ₱ {sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ color: error ? "#B91C1C" : "#16A34A" }}>
          {error ? error : "Looks good"}
        </div>
      </div>
    </div>
  );
};

export default ReimbursementBreakdownForm;
