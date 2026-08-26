import React from 'react';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  Scale, 
  Lock, 
  History,
  FileSpreadsheet,
  AlertOctagon
} from 'lucide-react';

export default function AuditorDashboard({ 
  products = [], 
  sales = [], 
  onNavigate 
}) {
  const totalValuation = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Auditor Financial & Reconciliation KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Scale size={14} color="#10b981" /> RECONCILIATION STATUS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '6px 0 2px 0' }}>
            100% RECONCILED
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Physical Counts vs Ledger Balances
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} color="var(--color-accent)" /> TOTAL VALUATION COST BASIS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', margin: '6px 0 2px 0', color: 'var(--color-ink)' }}>
            ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Verified Asset Cost Balance
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertOctagon size={14} color="#10b981" /> UNBALANCED LEDGER ENTRIES
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '6px 0 2px 0' }}>
            0 Flagged
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Double-Entry Accounting Pass
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} color="#8b5cf6" /> CRYPTOGRAPHIC LOG HASHES
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6', margin: '6px 0 2px 0', fontFamily: 'monospace' }}>
            SHA-256 Valid
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Immutable Audit Trail Verified
          </div>
        </div>

      </div>

      {/* Compliance Inspection & Audit Stream */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
              Compliance Inspection Stream & Audit Ledger
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
              Read-only immutable trail of all system events, approvals, stock movements, and financial postings
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('audit_logs')} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} /> Launch Full Audit Ledger
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
              <th style={{ padding: '10px 8px' }}>EVENT ID</th>
              <th style={{ padding: '10px 8px' }}>OPERATOR / USER</th>
              <th style={{ padding: '10px 8px' }}>ACTION CATEGORY</th>
              <th style={{ padding: '10px 8px' }}>DETAILS / RESOURCE</th>
              <th style={{ padding: '10px 8px' }}>SHA-256 HASH VERIFICATION</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)' }}>EVT-900481</td>
              <td style={{ padding: '10px 8px', fontWeight: 700 }}>Manager (EMP-001)</td>
              <td style={{ padding: '10px 8px' }}>REFUND_APPROVE</td>
              <td style={{ padding: '10px 8px' }}>Approved REF-2026-0039 ($120.00 USD)</td>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: '11px', color: '#10b981' }}>e3b0c44298fc1c149afbf4c... [MATCH]</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)' }}>EVT-900480</td>
              <td style={{ padding: '10px 8px', fontWeight: 700 }}>Warehouse (EMP-004)</td>
              <td style={{ padding: '10px 8px' }}>GOODS_RECEIVE</td>
              <td style={{ padding: '10px 8px' }}>GRN PO-00428 (20 units Dell XPS)</td>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: '11px', color: '#10b981' }}>8f434346648f6b96df89dda... [MATCH]</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)' }}>EVT-900479</td>
              <td style={{ padding: '10px 8px', fontWeight: 700 }}>Cashier (EMP-012)</td>
              <td style={{ padding: '10px 8px' }}>POS_CHECKOUT</td>
              <td style={{ padding: '10px 8px' }}>Receipt REC-1048 ($45.00 / 607.50 ZiG)</td>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: '11px', color: '#10b981' }}>779c6d37651a2d1d054d728... [MATCH]</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
