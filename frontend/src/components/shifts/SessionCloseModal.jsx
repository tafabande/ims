import React, { useState } from 'react';
import { X, DollarSign, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react';

export default function SessionCloseModal({ activeSession, onCloseSession, onCloseModal }) {
  const [actualCountedCash, setActualCountedCash] = useState('');
  const [notes, setNotes] = useState('');

  const openingFloat = activeSession?.opening_float || 200.00;
  const salesTotal = activeSession?.total_sales_amount || 1420.00;
  const refundsTotal = activeSession?.total_refunds_amount || 80.00;
  const expectedClosing = openingFloat + salesTotal - refundsTotal;

  const countedVal = parseFloat(actualCountedCash) || 0;
  const hasCounted = actualCountedCash !== '';
  const variance = countedVal - expectedClosing;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCloseSession({
      session_id: activeSession?.id || 1,
      actual_counted_cash: countedVal,
      notes: notes
    });
  };

  return (
    <div className="modal-overlay" onClick={onCloseModal}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: '24px', background: 'var(--color-paper-surface)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'monospace' }}>
              RECONCILIATION & CLOSING LEDGER
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--color-ink)' }}>
              Close Session: {activeSession?.session_code || 'WS-2026-0826-0041'}
            </h3>
          </div>
          <button onClick={onCloseModal} style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Breakdown Calculation Ledger */}
        <div style={{ background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', padding: '4px 0' }}>
            <span style={{ color: 'var(--color-ink-muted)' }}>Opening Cash Float:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>${openingFloat.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', padding: '4px 0' }}>
            <span style={{ color: 'var(--color-ink-muted)' }}>(+) Shift Sales Processed:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-signal-green)' }}>+${salesTotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', padding: '4px 0' }}>
            <span style={{ color: 'var(--color-ink-muted)' }}>(-) Shift Customer Refunds:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>-${refundsTotal.toFixed(2)}</span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-rule)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 800 }}>
            <span>Expected Closing Cash:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--color-accent)' }}>${expectedClosing.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="input-label">Actual Counted Physical Cash ($ USD) *</label>
            <input 
              type="number" 
              step="0.01" 
              className="input-field font-mono" 
              placeholder="e.g. 1810.00" 
              required 
              value={actualCountedCash} 
              onChange={e => setActualCountedCash(e.target.value)} 
            />
          </div>

          {/* Real-time Variance Calculation Result */}
          {hasCounted && (
            <div style={{
              background: variance === 0 
                ? 'rgba(16, 185, 129, 0.12)' 
                : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${variance === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              padding: '12px 14px',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: variance === 0 ? '#10b981' : '#ef4444' }}>
                  {variance === 0 ? '✓ RECONCILIATION MATCH' : '⚠️ CLOSING CASH VARIANCE'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                  {variance === 0 ? 'Counted cash matches expected ledger balance exactly.' : variance < 0 ? 'Cash shortage detected.' : 'Cash overage detected.'}
                </div>
              </div>

              <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: variance === 0 ? '#10b981' : '#ef4444' }}>
                {variance > 0 ? `+$${variance.toFixed(2)}` : `$${variance.toFixed(2)}`}
              </div>
            </div>
          )}

          <div>
            <label className="input-label">Session Closing Notes & Explanation</label>
            <textarea 
              className="input-field" 
              rows={2} 
              placeholder="Provide reason if there is a cash variance..." 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onCloseModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
              Confirm & Close Work Session
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
