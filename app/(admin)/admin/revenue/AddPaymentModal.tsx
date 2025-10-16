"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { getRevenueGlobalsCached } from '@/lib/clientStore';

type PaymentLine = {
  amount: number;
  payment_method_id: string;
  payment_status_id: string;
  paid_date?: string;
  reference_number?: string;
  remarks?: string;
  installment_id?: string | null;
};

type Props = {
  revenue_id: string;
  outstanding_balance: number;
  installments?: Array<{ id: string; installment_number: number; amount_due: number; amount_paid: number; }>;
  onClose: () => void;
  onSubmitted: () => void;
};

const AddPaymentModal: React.FC<Props> = ({ revenue_id, outstanding_balance, installments = [], onClose, onSubmitted }) => {
  const [lines, setLines] = useState<PaymentLine[]>([{ amount: 0, payment_method_id: '', payment_status_id: '' }]);
  const [methods, setMethods] = useState<{ id: string; name: string }[]>([]);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.amount) || 0), 0), [lines]);
  const remaining = Math.max(0, outstanding_balance - total);

  useEffect(() => {
    (async () => {
      try {
        const g = await getRevenueGlobalsCached();
        setMethods(g.payment_methods || []);
        setStatuses(g.payment_statuses || []);
      } catch {}
    })();
  }, []);

  const setLine = (idx: number, patch: Partial<PaymentLine>) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const addLine = () => setLines(prev => [...prev, { amount: 0, payment_method_id: '', payment_status_id: '' }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    // basic client validation
    if (!lines.every(l => Number(l.amount) > 0 && l.payment_method_id && l.payment_status_id)) {
      alert('Please fill all required payment fields with amounts > 0');
      return;
    }
    const res = await fetch(`/api/revenues/${encodeURIComponent(revenue_id)}/payments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payments: lines })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || 'Failed to add payments');
      return;
    }
    onSubmitted();
    onClose();
  };

  return (
    <div className="modalOverlay">
      <div className="editRevenueModal">
        <div className="modalHeader"><h3>Add Payments</h3><button onClick={onClose}>×</button></div>
        <div className="modalBody">
          <div style={{ marginBottom: 8 }}>Outstanding: ₱ {outstanding_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div style={{ marginBottom: 8 }}>Entering total: ₱ {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Remaining: ₱ {remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          {lines.map((l, idx) => (
            <div key={idx} className="formRow" style={{ gap: 8, alignItems: 'center' }}>
              <input type="number" min="0.01" step="0.01" placeholder="Amount" value={l.amount}
                onChange={e => setLine(idx, { amount: Number(e.target.value) })} className="formInput" />
              <select value={l.payment_method_id} onChange={e => setLine(idx, { payment_method_id: e.target.value })} className="formInput">
                <option value="">Method</option>
                {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select value={l.payment_status_id} onChange={e => setLine(idx, { payment_status_id: e.target.value })} className="formInput">
                <option value="">Status</option>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="text" placeholder="Reference # (optional)" value={l.reference_number || ''}
                onChange={e => setLine(idx, { reference_number: e.target.value })} className="formInput" />
              <input type="date" value={l.paid_date || ''}
                onChange={e => setLine(idx, { paid_date: e.target.value })} className="formInput" />
              {installments.length > 0 && (
                <select value={l.installment_id || ''} onChange={e => setLine(idx, { installment_id: e.target.value || null })} className="formInput">
                  <option value="">Whole Revenue</option>
                  {installments.map(inst => (
                    <option key={inst.id} value={inst.id}>Inst #{inst.installment_number} (Due ₱{Number(inst.amount_due).toLocaleString()})</option>
                  ))}
                </select>
              )}
              <button onClick={() => removeLine(idx)} className="deleteBtn">Remove</button>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <button onClick={addLine} className="editBtn">Add line</button>
          </div>
        </div>
        <div className="modalFooter">
          <button onClick={submit} className="viewBtn">Submit</button>
          <button onClick={onClose} className="deleteBtn">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddPaymentModal;
