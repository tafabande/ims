import React from 'react';
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
  UserCheck
} from 'lucide-react';
import ShiftCalendarWidget from './ShiftCalendarWidget';

export default function ManagerDashboard({ 
  products = [], 
  sales = [], 
  salesPolicy = { zigExchangeRate: 13.50 },
  onNavigate 
}) {
  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0);
  const outOfStockItems = products.filter(p => p.stock_quantity === 0);
  const totalValuation = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>INVENTORY CATALOG POSITION</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '6px 0 2px 0', color: 'var(--color-ink)' }}>
            {totalProducts} <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', fontWeight: 500 }}>SKUs</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
            Active Registered Store Inventory
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>LOW STOCK ALERTS</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: lowStockItems.length > 0 ? '#ef4444' : 'var(--color-signal-green)', margin: '6px 0 2px 0' }}>
            {lowStockItems.length} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>SKUs</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
            <strong>{outOfStockItems.length}</strong> Completely Depleted SKUs
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>TOTAL INVENTORY VALUATION</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '6px 0 2px 0', color: 'var(--color-ink)' }}>
            ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
            Cost Basis Capital Invested
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>GROSS REVENUE LEDGER</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)', margin: '6px 0 2px 0' }}>
            ${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {(totalSalesRevenue * salesPolicy.zigExchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })} ZiG (@ {salesPolicy.zigExchangeRate} ZiG/USD)
          </div>
        </div>

      </div>

      {/* Store Working Days & Shift Roster Calendar (Understaffed Days Alerts) */}
      <ShiftCalendarWidget onNavigate={onNavigate} />

      {/* Operational Cases Attention Grid & Manager Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Requires Attention Card */}
        <div style={{ 
          background: 'var(--color-paper-surface)', 
          border: '1px solid var(--color-rule)', 
          borderRadius: 'var(--radius-md)', 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          justify: 'space-between' 
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '4px' }}>
              REQUIRES MANAGER DECISION
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 14px 0', color: 'var(--color-ink)' }}>
              Operational Cases Awaiting Review
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-paper-2)', padding: '10px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--color-ink)' }}>Refund Request</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>REF-2026-0042 • Cashier: Sarah M.</div>
                </div>
                <span style={{ fontWeight: 800, color: '#ef4444', padding: '2px 8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', fontSize: '11px' }}>
                  $340.00 (High)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-paper-2)', padding: '10px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--color-ink)' }}>Receiving Discrepancy</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>DISC-2026-0087 • PO-431 (-2u shortage)</div>
                </div>
                <span style={{ fontWeight: 800, color: '#ef4444', padding: '2px 8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', fontSize: '11px' }}>
                  Action Needed
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-paper-2)', padding: '10px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--color-ink)' }}>Till Float Variance</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>FV-2026-0021 • Register Till 02</div>
                </div>
                <span style={{ fontWeight: 800, color: '#f59e0b', padding: '2px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', fontSize: '11px' }}>
                  -$13.00 (Normal)
                </span>
              </div>
            </div>
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => onNavigate('attention')}
            style={{ width: '100%', marginTop: '18px', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <ShieldCheck size={16} /> Open Attention Center Hub (3 Pending)
          </button>
        </div>

        {/* Audit Trail & Case Decision Stream */}
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-ink-muted)', fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '4px' }}>
            EXECUTED DECISION TIMELINE
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 14px 0', color: 'var(--color-ink)' }}>
            Recent Operational Approvals
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-rule)', paddingBottom: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>Refund REF-2026-0039 Approved ($120.00)</div>
                <div style={{ color: 'var(--color-ink-muted)', fontSize: '11px' }}>Approved by Store Manager • Today, 16:15</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-rule)', paddingBottom: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>PO-00428 Receiving Shipment Accepted</div>
                <div style={{ color: 'var(--color-ink-muted)', fontSize: '11px' }}>Verified & Accepted into Stock • Today, 14:20</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                ✕
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>Stock Adjustment ADJ-0038 Rejected</div>
                <div style={{ color: 'var(--color-ink-muted)', fontSize: '11px' }}>Denied write-off of 5 units • Today, 11:05</div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
