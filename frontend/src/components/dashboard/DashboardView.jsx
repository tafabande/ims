import React from 'react';
import { 
  AlertTriangle, 
  ShoppingCart, 
  ShoppingBag, 
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  ShieldCheck,
  Cpu,
  Database,
  Server,
  Activity,
  Calendar,
  Coffee,
  Award,
  Bell
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { can } from '../../utils/permissions';

export default function DashboardView({ 
  products = [], 
  sales = [], 
  currentRole = 'MANAGER',
  onNavigate 
}) {
  const roleName = (currentRole || 'MANAGER').toUpperCase();

  // Telemetry metrics for Manager/Warehouse
  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0);
  const outOfStockItems = products.filter(p => p.stock_quantity === 0);
  const totalValuation = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);

  const attentionItems = [
    { id: 'REF-00042', priority: 'critical', badge: 'Critical', title: 'Refund Approval Required', desc: 'Customer ABC Traders • $340.00 requested' },
    { id: 'ADJ-00041', priority: 'critical', badge: 'Critical', title: 'Stock Write-off Approval', desc: 'Harare Main • -2 units SKU-000482 write-off' },
    { id: 'PO-00431', priority: 'warning', badge: 'Warning', title: 'Goods Receiving Discrepancy', desc: 'XYZ Electronics • 96 received / 100 ordered (-4u)' },
    { id: 'CRIT-CAT6', priority: 'warning', badge: 'Warning', title: 'Critical Low Stock Warning', desc: 'CAT6 Cable Roll 300m • 3 units remaining' }
  ];

  const chartData = [
    { day: 'Mon', sales: 1450, purchases: 800 },
    { day: 'Tue', sales: 2100, purchases: 1100 },
    { day: 'Wed', sales: 3200, purchases: 2200 },
    { day: 'Thu', sales: 1850, purchases: 600 },
    { day: 'Fri', sales: 3900, purchases: 1800 },
    { day: 'Sat', sales: 4800, purchases: 900 },
    { day: 'Sun', sales: 3600, purchases: 1400 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* HEADER STRIP */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700 }}>
              OPERATIONS OVERVIEW
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>• Wednesday, 26 Aug 2026</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            {roleName === 'STAFF' || roleName === 'STAFF_SELLER' || roleName === 'STAFF_MOVER' ? 'Personal Staff Workbench & Shift Schedule' :
             roleName === 'APP_ADMIN' || roleName === 'SYSADMIN' || roleName === 'ADMIN' ? 'System Performance & Server Infrastructure Health' :
             'Executive Operations & Control Dashboard'}
          </h2>
        </div>

        {/* Role-Specific Quick Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {(roleName === 'STAFF' || roleName === 'STAFF_SELLER') && (
            <>
              <button className="btn btn-primary" onClick={() => onNavigate('sales')}>
                <ShoppingCart size={15} /> Launch POS Terminal
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('shifts')}>
                <Clock size={15} /> Shift & Cash Till
              </button>
            </>
          )}

          {roleName === 'STAFF_MOVER' && (
            <button className="btn btn-primary" onClick={() => onNavigate('transfers')}>
              <ShoppingBag size={15} /> Stock Transfers & Movements
            </button>
          )}

          {roleName === 'WAREHOUSE' && (
            <button className="btn btn-primary" onClick={() => onNavigate('purchases')}>
              <ShoppingBag size={15} /> Receive Goods
            </button>
          )}

          {roleName === 'MANAGER' && (
            <button className="btn btn-primary" onClick={() => onNavigate('attention')}>
              <ShieldCheck size={15} /> Open Operational Attention
            </button>
          )}

          {(roleName === 'APP_ADMIN' || roleName === 'SYSADMIN' || roleName === 'ADMIN') && (
            <button className="btn btn-primary" onClick={() => onNavigate('users')}>
              <Users size={15} /> Manage System Users & RBAC
            </button>
          )}
        </div>
      </div>

      {/* DASHBOARD TYPE 1: SYSADMIN & APP_ADMIN (Server Metrics, System Errors, Infrastructure) */}
      {(roleName === 'APP_ADMIN' || roleName === 'SYSADMIN' || roleName === 'ADMIN') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Server Hardware & Performance Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700' }}>
                <Cpu size={16} /> CPU UTILIZATION
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0' }}>24%</div>
              <div style={{ fontSize: '11px', color: 'var(--color-signal-green)', fontWeight: '700' }}>● Optimal (4 Cores / 3.2 GHz)</div>
            </div>

            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700' }}>
                <Server size={16} /> SYSTEM RAM USAGE
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0' }}>3.2 GB / 8 GB</div>
              <div style={{ fontSize: '11px', color: 'var(--color-signal-green)', fontWeight: '700' }}>● 40% Capacity Allocated</div>
            </div>

            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700' }}>
                <Database size={16} /> POSTGRES POOL
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0' }}>14 / 50 Active</div>
              <div style={{ fontSize: '11px', color: 'var(--color-signal-green)', fontWeight: '700' }}>● Latency: 18ms (p99)</div>
            </div>

            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700' }}>
                <Activity size={16} /> REDIS CACHE HIT
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0' }}>98.4%</div>
              <div style={{ fontSize: '11px', color: 'var(--color-signal-green)', fontWeight: '700' }}>● High Throughput</div>
            </div>
          </div>

          {/* Active System Error Logs & Exception Stream */}
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: 'var(--color-ink)' }}>
              System Error Logs & Exception Stream
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                  <th style={{ padding: '8px' }}>TIMESTAMP</th>
                  <th style={{ padding: '8px' }}>LEVEL</th>
                  <th style={{ padding: '8px' }}>ENDPOINT / COMPONENT</th>
                  <th style={{ padding: '8px' }}>EXCEPTION DETAILS</th>
                  <th style={{ padding: '8px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>2026-08-26 04:02:11</td>
                  <td style={{ padding: '8px', color: '#ef4444', fontWeight: '700' }}>WARN</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>POST /api/v1/sales/checkout</td>
                  <td style={{ padding: '8px' }}>Stock limit bound check triggered (Requested 5u, stock 3u)</td>
                  <td style={{ padding: '8px', color: '#10b981', fontWeight: '700' }}>HANDLED (400)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>2026-08-26 03:45:09</td>
                  <td style={{ padding: '8px', color: '#10b981', fontWeight: '700' }}>INFO</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>POST /api/v1/auth/token</td>
                  <td style={{ padding: '8px' }}>Successful Operator Auth (EMP-00014)</td>
                  <td style={{ padding: '8px', color: '#10b981', fontWeight: '700' }}>OK (200)</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* DASHBOARD TYPE 2: STAFF (Personal Sales Quota, Shift Times, Lunch, Performance) */}
      {(roleName === 'STAFF' || roleName === 'STAFF_SELLER' || roleName === 'STAFF_MOVER') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Staff Quota & Performance Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700' }}>
                <Award size={16} /> DAILY SALES QUOTA
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0' }}>$420.00 / $500.00</div>
              <div style={{ fontSize: '11px', color: 'var(--color-signal-green)', fontWeight: '700' }}>● 84% Quota Completed</div>
            </div>

            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700' }}>
                <Calendar size={16} /> SHIFT TIMINGS
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0' }}>08:00 - 16:30</div>
              <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>📍 Harare Flagship • Till 01</div>
            </div>

            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '12px', fontWeight: '700' }}>
                <Coffee size={16} /> SCHEDULED LUNCH BREAK
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0' }}>12:30 - 13:15</div>
              <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>⏳ Upcoming in 2 hours</div>
            </div>
          </div>

          {/* Announcements & Updates Notice Board */}
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="var(--color-accent)" /> Store Updates & Team Announcements
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'var(--color-paper-2)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
                <div style={{ fontWeight: '700', fontSize: '13px' }}>📢 ZiG Currency & Mobile EcoCash Surcharges Active</div>
                <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                  Please ensure EcoCash transactions apply the +2.5% surcharge configured in POS checkout.
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* DASHBOARD TYPE 3: MANAGER / WAREHOUSE / AUDITOR (Financial, Inventory & Attention) */}
      {(roleName === 'MANAGER' || roleName === 'WAREHOUSE' || roleName === 'AUDITOR') && (
        <>
          {/* DIRECTIONAL KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            
            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>INVENTORY POSITION</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '4px 0 2px 0' }}>
                {totalProducts} <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', fontWeight: 500 }}>SKUs</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                <strong>{totalProducts}</strong> Total Units
              </div>
            </div>

            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>LOW STOCK ALERTS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: lowStockItems.length > 0 ? '#ef4444' : 'var(--color-signal-green)', margin: '4px 0 2px 0' }}>
                {lowStockItems.length} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>SKUs</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                <strong>{outOfStockItems.length}</strong> Depleted
              </div>
            </div>

            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>INVENTORY VALUE (COST BASIS)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '4px 0 2px 0' }}>
                ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                Cost Basis Capital
              </div>
            </div>

            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>REVENUE LEDGER</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)', margin: '4px 0 2px 0' }}>
                ${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                Verified Invoices
              </div>
            </div>

          </div>

          {/* ATTENTION QUEUE */}
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Operational Attention Queue ({attentionItems.length} items)
              </h3>
              <button onClick={() => onNavigate('attention')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}>
                Open Attention Center →
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                  <th style={{ padding: '8px' }}>Priority</th>
                  <th style={{ padding: '8px' }}>Issue & Context</th>
                  <th style={{ padding: '8px' }}>Ref ID</th>
                  <th style={{ padding: '8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {attentionItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800,
                        background: item.priority === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: item.priority === 'critical' ? '#ef4444' : '#f59e0b'
                      }}>
                        {item.badge}
                      </span>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <strong>{item.title}</strong><br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>{item.desc}</span>
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-accent)' }}>{item.id}</td>
                    <td style={{ padding: '8px' }}>
                      <button onClick={() => onNavigate('attention')} style={{ padding: '4px 10px', borderRadius: 'var(--radius-xs)', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                        {item.actionLabel}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}
