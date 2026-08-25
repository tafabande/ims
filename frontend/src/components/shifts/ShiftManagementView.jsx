import React, { useState } from 'react';
import { Clock, DollarSign, AlertTriangle, CheckCircle, Lock, Play, Calculator } from 'lucide-react';

export default function ShiftManagementView({ onShowToast }) {
  const [activeShift, setActiveShift] = useState({
    id: 101,
    shift_code: 'SHIFT-2026-00421',
    employee_name: 'Charlie Staff (EMP-0003)',
    store_name: 'Harare Flagship Store (STR-HRE-001)',
    register_name: 'Till 01 (POS-HRE-001)',
    start_time: '2026-08-25 08:30:00',
    opening_cash: 200.0,
    sales_total: 1420.0,
    refunds_total: 50.0,
    expected_cash: 1570.0,
    status: 'OPEN'
  });

  const [actualCashInput, setActualCashInput] = useState('1565.00');
  const [closedShifts, setClosedShifts] = useState([
    {
      id: 99,
      shift_code: 'SHIFT-2026-00418',
      employee_name: 'Bob Manager',
      start_time: '2026-08-24 08:00:00',
      end_time: '2026-08-24 17:00:00',
      opening_cash: 200.0,
      expected_cash: 1200.0,
      actual_cash: 1200.0,
      variance: 0.0,
      status: 'RECONCILED'
    }
  ]);

  const handleCloseShift = (e) => {
    e.preventDefault();
    const actual = parseFloat(actualCashInput) || 0;
    const variance = actual - activeShift.expected_cash;

    const closed = {
      ...activeShift,
      end_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actual_cash: actual,
      variance: roundTwo(variance),
      status: 'CLOSED'
    };

    setClosedShifts([closed, ...closedShifts]);
    setActiveShift(null);

    const toastType = variance === 0 ? 'success' : 'warning';
    onShowToast?.(toastType, 'Shift Closed', `Shift ${closed.shift_code} closed. Cash Variance: $${variance >= 0 ? '+' : ''}${variance.toFixed(2)}.`);
  };

  const roundTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
          Shift & Cash Till Reconciliation
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
          Manage operator cash registers, shift opening/closing cash, and cash variance tracking.
        </p>
      </div>

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
              fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '4px 12px', borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.2)', color: 'var(--color-accent)', fontWeight: 800
            }}>
              STATUS: OPEN
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', background: 'var(--color-paper-2)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>OPENING CASH</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>${activeShift.opening_cash.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>POS SALES TOTAL</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-signal-green)' }}>+${activeShift.sales_total.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>REFUNDS DEDUCTED</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>-${activeShift.refunds_total.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>EXPECTED CASH IN TILL</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)' }}>${activeShift.expected_cash.toFixed(2)}</div>
            </div>
          </div>

          {/* Close Shift Form */}
          <form onSubmit={handleCloseShift} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--color-rule)', paddingTop: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calculator size={20} style={{ color: 'var(--color-ink-muted)' }} />
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>ACTUAL COUNTED CASH IN TILL</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={actualCashInput}
                    onChange={e => setActualCashInput(e.target.value)}
                    style={{
                      padding: '8px 12px', fontSize: '1.1rem', fontWeight: 700, borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)', width: '160px'
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: 'var(--radius-sm)',
                background: '#ef4444', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer'
              }}
            >
              <Lock size={18} /> Close Till & Shift
            </button>
          </form>
        </div>
      ) : (
        <div style={{
          background: 'var(--color-paper-surface)', border: '1px dashed var(--color-rule)', borderRadius: 'var(--radius-md)',
          padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
        }}>
          <Clock size={36} style={{ color: 'var(--color-ink-dim)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Active Shift Open</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>Start a new register shift to begin processing POS sales.</p>
          <button
            onClick={() => setActiveShift({
              id: Date.now(),
              shift_code: `SHIFT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
              employee_name: 'Charlie Staff (EMP-0003)',
              store_name: 'Harare Flagship Store',
              register_name: 'Till 01',
              start_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
              opening_cash: 200.0,
              sales_total: 0.0,
              refunds_total: 0.0,
              expected_cash: 200.0,
              status: 'OPEN'
            })}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-signal-green)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer'
            }}
          >
            <Play size={18} /> Start Shift ($200 Opening Float)
          </button>
        </div>
      )}

      {/* Closed Shifts Audit History */}
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
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.shift_code}</td>
                <td style={{ padding: '10px' }}>{s.employee_name}</td>
                <td style={{ padding: '10px', fontWeight: 600 }}>${s.expected_cash.toFixed(2)}</td>
                <td style={{ padding: '10px', fontWeight: 600 }}>${s.actual_cash.toFixed(2)}</td>
                <td style={{ padding: '10px', fontWeight: 700, color: s.variance < 0 ? '#ef4444' : s.variance > 0 ? 'var(--color-accent)' : 'var(--color-signal-green)' }}>
                  ${s.variance >= 0 ? '+' : ''}{s.variance.toFixed(2)}
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '12px',
                    background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-signal-green)', fontWeight: 700
                  }}>
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
