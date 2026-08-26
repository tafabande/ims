import React, { useState } from 'react';
import { Clock, DollarSign, AlertTriangle, CheckCircle, Lock, Play, Calculator, ShieldCheck, Check, X } from 'lucide-react';
import { can } from '../../utils/permissions';

export default function ShiftManagementView({ onShowToast, currentRole = 'STAFF' }) {
  const [activeShift, setActiveShift] = useState(null);
  const [actualCashInput, setActualCashInput] = useState('');
  const [closedShifts, setClosedShifts] = useState([
    {
      id: 1,
      shift_code: 'SHIFT-2026-94021',
      employee_name: 'Charlie Staff (EMP-00014)',
      opening_cash: 200.00,
      actual_cash: 200.00,
      expected_cash: 200.00,
      variance: 0.00,
      status: 'CLOSED',
      end_time: '2026-08-25 18:00:00'
    }
  ]);

  // Open Shift Form State with Float Override
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [standardFloat, setStandardFloat] = useState(200.00);
  const [overrideFloatInput, setOverrideFloatInput] = useState('100.00');
  const [floatReason, setFloatReason] = useState('Till short of small bill notes today.');
  const [pendingFloatApproval, setPendingFloatApproval] = useState(null);

  const isManager = can(currentRole, 'attention.decide');

  const handleStartShift = () => {
    const floatAmount = parseFloat(overrideFloatInput) || standardFloat;
    const isVariance = floatAmount !== standardFloat;

    const newShift = {
      id: Date.now(),
      shift_code: `SHIFT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      employee_name: 'Charlie Staff (EMP-00014)',
      store_name: 'Harare Flagship Store',
      register_name: 'Till 01 Main',
      start_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      opening_cash: floatAmount,
      standard_float: standardFloat,
      sales_total: 0.0,
      refunds_total: 0.0,
      expected_cash: floatAmount,
      status: isVariance ? 'AWAITING_FLOAT_APPROVAL' : 'OPEN',
      float_variance_approved: !isVariance,
      float_reason: isVariance ? floatReason : ''
    };

    if (isVariance) {
      setPendingFloatApproval(newShift);
      if (onShowToast) onShowToast('warning', 'Manager Approval Needed', `Starting float override ($${floatAmount.toFixed(2)} vs Standard $${standardFloat.toFixed(2)}) requires Manager Approval.`);
    } else {
      setActiveShift(newShift);
      if (onShowToast) onShowToast('success', 'Shift Opened', `Shift ${newShift.shift_code} started with $${floatAmount.toFixed(2)} opening float.`);
    }
    setShowOpenShiftModal(false);
  };

  const handleApproveFloatVariance = (shift) => {
    const approvedShift = {
      ...shift,
      status: 'OPEN',
      float_variance_approved: true
    };
    setActiveShift(approvedShift);
    setPendingFloatApproval(null);
    if (onShowToast) onShowToast('success', 'Float Variance Authorized', `Manager approved starting float of $${shift.opening_cash.toFixed(2)} for ${shift.shift_code}.`);
  };

  const handleCloseShift = (e) => {
    e.preventDefault();
    const actual = parseFloat(actualCashInput) || 0;
    const variance = actual - activeShift.expected_cash;

    const closed = {
      ...activeShift,
      end_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actual_cash: actual,
      variance: Math.round((variance + Number.EPSILON) * 100) / 100,
      status: 'CLOSED'
    };

    setClosedShifts([closed, ...closedShifts]);
    setActiveShift(null);

    const toastType = variance === 0 ? 'success' : 'warning';
    onShowToast?.(toastType, 'Shift Closed', `Shift ${closed.shift_code} closed. Cash Variance: $${variance >= 0 ? '+' : ''}${variance.toFixed(2)}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
          Shift & Cash Till Reconciliation
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
          Manage register shifts, standard float overrides ($200 vs $100), manager approvals, and cash variance tracking.
        </p>
      </div>

      {/* PENDING FLOAT APPROVAL NOTIFICATION CARD */}
      {pendingFloatApproval && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#f59e0b', fontWeight: '800', fontSize: '14px' }}>
                🟠 Manager Approval Needed: Starting Float Override
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                Shift <strong>{pendingFloatApproval.shift_code}</strong> requested <strong>${pendingFloatApproval.opening_cash.toFixed(2)}</strong> opening float (Standard: ${pendingFloatApproval.standard_float.toFixed(2)}).
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Reason: "{pendingFloatApproval.float_reason}"
              </div>
            </div>

            {isManager ? (
              <button
                onClick={() => handleApproveFloatVariance(pendingFloatApproval)}
                style={{ padding: '8px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                <Check size={14} style={{ display: 'inline', marginRight: '4px' }} /> Approve Float Override
              </button>
            ) : (
              <span style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                (Awaiting Manager Authorization)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Active Shift Widget */}
      {activeShift ? (
        <div style={{
          background: 'var(--color-paper-surface)',
          border: '2px solid var(--color-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)'
              }}>
                <Clock size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>ACTIVE OPERATIONAL SHIFT</h3>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700 }}>
                  {activeShift.shift_code} • {activeShift.employee_name}
                </span>
              </div>
            </div>
            <span style={{
              fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '4px 10px', borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-signal-green)', fontWeight: 800
            }}>
              ● REGISTER TILL OPEN
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700 }}>OPENING FLOAT</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>${activeShift.opening_cash.toFixed(2)}</div>
            </div>
            <div style={{ padding: '14px', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700 }}>EXPECTED CASH IN TILL</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>${activeShift.expected_cash.toFixed(2)}</div>
            </div>
          </div>

          {/* Close Till Form */}
          <form onSubmit={handleCloseShift} style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-ink)' }}>ENTER ACTUAL COUNTED CASH IN TILL ($):</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="number"
                step="0.01"
                required
                value={actualCashInput}
                onChange={e => setActualCashInput(e.target.value)}
                placeholder="0.00"
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700 }}
              />
              <button
                type="submit"
                style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: '#ef4444', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                <Lock size={16} style={{ display: 'inline', marginRight: '4px' }} /> Close Till
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-paper-surface)', border: '1px dashed var(--color-rule)', borderRadius: 'var(--radius-md)',
          padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
        }}>
          <Clock size={36} style={{ color: 'var(--color-ink-dim)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Active Register Shift</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>Start a new register shift with standard float ($200.00) or override value.</p>
          <button
            onClick={() => setShowOpenShiftModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-signal-green)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer'
            }}
          >
            <Play size={18} /> Start Register Shift
          </button>
        </div>
      )}

      {/* OPEN SHIFT WITH FLOAT OVERRIDE MODAL */}
      {showOpenShiftModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', width: '480px', maxWidth: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Open Register Shift & Set Float</h3>
              <button onClick={() => setShowOpenShiftModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>STANDARD STARTING FLOAT</label>
              <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--color-accent)' }}>
                ${standardFloat.toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>TODAY'S ACTUAL STARTING FLOAT ($)</label>
              <input
                type="number"
                step="0.01"
                value={overrideFloatInput}
                onChange={e => setOverrideFloatInput(e.target.value)}
                placeholder="100.00"
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '14px', fontWeight: '700' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '4px' }}>
                e.g. Normally $200.00, but starting with $100.00 today.
              </span>
            </div>

            {parseFloat(overrideFloatInput) !== standardFloat && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#f59e0b' }}>VARIANCE JUSTIFICATION NOTE (FOR MANAGER APPROVAL)</label>
                <textarea
                  value={floatReason}
                  onChange={e => setFloatReason(e.target.value)}
                  placeholder="State reason for starting float variance..."
                  rows={3}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid #f59e0b', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '12px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowOpenShiftModal(false)} style={{ padding: '9px 16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleStartShift} style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}>Start Shift</button>
            </div>
          </div>
        </div>
      )}

      {/* Closed Shifts History */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>Shift Reconciliation History</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
              <th style={{ padding: '10px' }}>SHIFT CODE</th>
              <th style={{ padding: '10px' }}>OPERATOR</th>
              <th style={{ padding: '10px' }}>EXPECTED</th>
              <th style={{ padding: '10px' }}>ACTUAL</th>
              <th style={{ padding: '10px' }}>VARIANCE</th>
              <th style={{ padding: '10px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {closedShifts.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-accent)' }}>{s.shift_code}</td>
                <td style={{ padding: '10px' }}>{s.employee_name}</td>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>${s.expected_cash.toFixed(2)}</td>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>${s.actual_cash.toFixed(2)}</td>
                <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700, color: s.variance === 0 ? 'var(--color-signal-green)' : '#ef4444' }}>
                  {s.variance >= 0 ? '+' : ''}${s.variance.toFixed(2)}
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: 'var(--color-canvas)', border: '1px solid var(--color-rule)' }}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
