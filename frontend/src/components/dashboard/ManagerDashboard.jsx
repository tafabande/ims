import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sliders, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Layers, 
  Package,
  ArrowRight,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Activity
} from 'lucide-react';
import ShiftCalendarWidget from './ShiftCalendarWidget';

export default function ManagerDashboard({ 
  products = [], 
  sales = [], 
  salesPolicy = { zigExchangeRate: 13.50 },
  onNavigate 
}) {
  const [showIntelligence, setShowIntelligence] = useState(false);

  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0);
  const outOfStockItems = products.filter(p => p.stock_quantity === 0);
  const totalValuation = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);

  const stockHealthPct = totalProducts > 0 
    ? (((totalProducts - lowStockItems.length - outOfStockItems.length) / totalProducts) * 100).toFixed(1)
    : '100.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ─────────────────────────────────────────────────────────────
          LEVEL 1 — ACTION REQUIRED (Needs Immediate Decision)
          Primary focus: Items causing operational damage if ignored
         ───────────────────────────────────────────────────────────── */}
      <div style={{ 
        background: 'var(--color-paper-surface)', 
        border: '1px solid rgba(59, 130, 246, 0.3)', 
        borderRadius: 'var(--radius-md)', 
        padding: '20px',
        boxShadow: '0 0 12px rgba(59, 130, 246, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
              LEVEL 1 • ACTION REQUIRED
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--color-ink)' }}>
              Operational Items Awaiting Your Decision
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            3 Action Required
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          
          <div style={{ background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>REFUND REQUEST</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>$340.00</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>Customer Refund Request</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>REF-2026-0042 • Cashier: Sarah M.</div>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={() => onNavigate('attention')}
              style={{ marginTop: '12px', fontSize: '0.75rem', width: '100%', padding: '6px' }}
            >
              Review Refund Request →
            </button>
          </div>

          <div style={{ background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>RECEIVING DISCREPANCY</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>-2 Units Missing</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>Delivery Shortage PO-00431</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>DISC-2026-0087 • Supplier: XYZ Tech</div>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={() => onNavigate('attention')}
              style={{ marginTop: '12px', fontSize: '0.75rem', width: '100%', padding: '6px' }}
            >
              Resolve Discrepancy →
            </button>
          </div>

          <div style={{ background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>STOCK TRANSFER</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b' }}>Awaiting Dispatch</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>Transfer TR-084 to Branch B</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>15 SKUs • Priority Dispatch</div>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={() => onNavigate('transfers')}
              style={{ marginTop: '12px', fontSize: '0.75rem', width: '100%', padding: '6px' }}
            >
              Approve Dispatch →
            </button>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LEVEL 2 — OPERATIONAL STATE (Right Now Status)
          Answer: "What is happening right now?"
         ───────────────────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '8px' }}>
          LEVEL 2 • OPERATIONAL STATE
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>ACTIVE WORK SESSIONS</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '4px 0 2px 0', color: 'var(--color-ink)' }}>
              7 <span style={{ fontSize: '0.85rem', color: 'var(--color-signal-green)', fontWeight: 600 }}>Active Tills</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>Store POS Registers Running</div>
          </div>

          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>STOCK HEALTH INDEX</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)', margin: '4px 0 2px 0' }}>
              {stockHealthPct}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
              <strong>{lowStockItems.length}</strong> Low Stock • <strong>{outOfStockItems.length}</strong> Out of Stock
            </div>
          </div>

          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>TODAY'S GROSS SALES</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)', margin: '4px 0 2px 0' }}>
              ${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {(totalSalesRevenue * salesPolicy.zigExchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })} ZiG
            </div>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LEVEL 3 — PERFORMANCE & ROSTER
          Answer: "What is the business doing?"
         ───────────────────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '8px' }}>
          LEVEL 3 • PERFORMANCE & ROSTER
        </div>

        <ShiftCalendarWidget onNavigate={onNavigate} />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LEVEL 4 — EVIDENCE & SYSTEM INTELLIGENCE (Diagnostics Quiet Zone)
          Advanced forensic tools kept behind quiet expandable container or link
         ───────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '16px' }}>
        <button
          onClick={() => setShowIntelligence((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            width: '100%',
            padding: '12px 16px',
            background: 'var(--color-paper-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-ink-muted)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="var(--color-accent)" />
            <span>LEVEL 4 • System Intelligence & Inventory Integrity Diagnostics</span>
          </div>
          {showIntelligence ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showIntelligence && (
          <div style={{ 
            marginTop: '12px', 
            padding: '20px', 
            background: 'var(--color-paper-2)', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid var(--color-rule)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-ink)' }}>
              Deep forensic tools (Ledger Lineage, Anomaly Detection Matrix, BLE Digital Twin) are housed in the dedicated <strong>Integrity & Audit</strong> module to maintain operational focus.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => onNavigate('integrity')}>
                Open Inventory Integrity Engine →
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('audit')}>
                View Audit Logs →
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
