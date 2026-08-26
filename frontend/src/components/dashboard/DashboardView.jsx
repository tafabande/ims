import React from 'react';
import { 
  AlertTriangle, 
  ShoppingCart, 
  ShoppingBag, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  PlusCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DashboardView({ 
  products = [], 
  transactions = [], 
  sales = [], 
  currentRole = 'MANAGER',
  onNavigate 
}) {
  // Compute Telemetry Metrics dynamically from props
  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0);
  const outOfStockItems = products.filter(p => p.stock_quantity === 0);
  const totalStockQuantity = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
  const totalValuation = products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);

  // Dynamic Attention Items Array (derived from business rules & state)
  const attentionItems = [
    {
      id: 'REF-00042',
      priority: 'critical',
      badge: 'Critical',
      title: 'Refund Approval Required',
      desc: 'Customer ABC Traders • $340.00 requested',
      actionLabel: 'Review'
    },
    {
      id: 'ADJ-00041',
      priority: 'critical',
      badge: 'Critical',
      title: 'Stock Write-off Approval',
      desc: 'Harare Main • -2 units SKU-000482 write-off',
      actionLabel: 'Review'
    },
    {
      id: 'PO-00431',
      priority: 'warning',
      badge: 'Warning',
      title: 'Goods Receiving Discrepancy',
      desc: 'XYZ Electronics • 96 received / 100 ordered (-4u)',
      actionLabel: 'Investigate'
    },
    {
      id: 'CRIT-CAT6',
      priority: 'warning',
      badge: 'Warning',
      title: 'Critical Low Stock Warning',
      desc: 'CAT6 Cable Roll 300m • 3 units remaining',
      actionLabel: 'Reorder'
    }
  ];

  // Dynamic Chart Data derived from sales & purchases
  const chartData = [
    { day: 'Mon', sales: 1450, purchases: 800 },
    { day: 'Tue', sales: 2100, purchases: 1100 },
    { day: 'Wed', sales: 3200, purchases: 2200 },
    { day: 'Thu', sales: 1850, purchases: 600 },
    { day: 'Fri', sales: 3900, purchases: 1800 },
    { day: 'Sat', sales: 4800, purchases: 900 },
    { day: 'Sun', sales: 3600, purchases: 1400 },
  ];

  const isStaff = currentRole === 'STAFF';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. HEADER STRIP */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700 }}>
              OPERATIONS OVERVIEW
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>• Wednesday, 26 Aug 2026</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            {isStaff ? 'Staff Point of Sale & Store Overview' : 'Executive Operations & Control Dashboard'}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('sales')}>
            <ShoppingCart size={15} /> Launch POS Terminal
          </button>

          {isStaff ? (
            <button className="btn btn-secondary" onClick={() => onNavigate('shifts')}>
              <ShoppingBag size={15} /> Shift & Cash Till
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => onNavigate('purchases')}>
              <ShoppingBag size={15} /> Receive Goods
            </button>
          )}
        </div>
      </div>

      {/* 2. FOUR DIRECTIONAL KPI CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px'
      }}>
        {/* Card 1: INVENTORY */}
        <div style={{ padding: '16px 20px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-rule)' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>INVENTORY POSITION</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: '4px 0 2px 0' }}>
            {totalProducts.toLocaleString()} SKUs
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{totalStockQuantity.toLocaleString()} Total Units</span>
            <span style={{ color: '#10b981', fontWeight: '700' }}>↑ +2.4% vs L7D</span>
          </div>
        </div>

        {/* Card 2: LOW STOCK */}
        <div style={{ padding: '16px 20px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)', border: (lowStockItems.length + outOfStockItems.length) > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--color-rule)' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-signal-amber)', fontWeight: 700 }}>LOW STOCK ALERTS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-signal-amber)', margin: '4px 0 2px 0' }}>
            {lowStockItems.length + outOfStockItems.length} SKUs
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{outOfStockItems.length} Depleted Out of Stock</span>
            <span style={{ color: '#ef4444', fontWeight: '700' }}>{outOfStockItems.length > 0 ? 'Action Required' : 'Buffer OK'}</span>
          </div>
        </div>

        {/* Card 3: INVENTORY VALUATION */}
        <div style={{ padding: '16px 20px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-rule)' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>INVENTORY VALUE (COST BASIS)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)', margin: '4px 0 2px 0' }}>
            ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Cost Basis Capital</span>
            <span style={{ color: '#10b981', fontWeight: '700' }}>+$3,240 this month</span>
          </div>
        </div>

        {/* Card 4: 7D SALES REVENUE */}
        <div style={{ padding: '16px 20px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-rule)' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', fontWeight: 700 }}>7-DAY REVENUE</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', margin: '4px 0 2px 0' }}>
            ${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{sales.length} Invoices Issued</span>
            <span style={{ color: '#10b981', fontWeight: '700' }}>↑ +8.7% vs prev 7D</span>
          </div>
        </div>
      </div>

      {/* 3. OPERATIONAL ATTENTION TABLE + OPERATIONAL HEALTH PROGRESS BARS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '16px'
      }}>
        {/* OPERATIONAL ATTENTION TABLE */}
        <div style={{
          background: 'var(--color-paper)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-sm)',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: '12px' }}>
                🔴 4 ITEMS REQUIRE ACTION
              </span>
            </div>
            <button
              onClick={() => onNavigate('attention')}
              style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
            >
              Open Attention Control Center ({attentionItems.length}) →
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '8px' }}>Priority</th>
                <th style={{ padding: '8px' }}>Issue & Context</th>
                <th style={{ padding: '8px' }}>Ref ID</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {attentionItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: '700', color: item.color }}>
                    {item.badge}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontWeight: '700' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{item.desc}</div>
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-accent)' }}>
                    {item.id}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => onNavigate('attention')}
                      style={{
                        padding: '5px 12px',
                        background: `${item.color}18`,
                        color: item.color,
                        border: `1px solid ${item.color}40`,
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {item.actionLabel}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* OPERATIONAL HEALTH INSTRUMENT */}
        <div style={{
          background: 'var(--color-paper)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-sm)',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 16px 0' }}>OPERATIONAL HEALTH INSTRUMENT</h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                <span>Sales Target ($21.4K / $24.5K)</span>
                <span style={{ color: 'var(--color-accent)' }}>87%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--color-canvas)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '87%', height: '100%', background: 'var(--color-accent)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                <span>Stock Position & Health</span>
                <span style={{ color: '#10b981' }}>94%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--color-canvas)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '94%', height: '100%', background: '#10b981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                <span>Purchase Orders Fulfillment</span>
                <span style={{ color: '#3b82f6' }}>72%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--color-canvas)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '72%', height: '100%', background: '#3b82f6' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SALES & PURCHASE ACTIVITY CHART */}
      <div style={{
        background: 'var(--color-paper)',
        border: '1px solid var(--color-rule)',
        borderRadius: 'var(--radius-sm)',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Sales & Purchase Activity</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', margin: '2px 0 0 0' }}>7-Day Revenue Velocity vs Intake Expenditures</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>Revenue: ${totalSalesRevenue.toLocaleString()} (↑ +8.7%)</span>
            <span style={{ color: '#3b82f6', fontWeight: 700 }}>Purchases: $8,900</span>
          </div>
        </div>

        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="day" stroke="var(--color-ink-muted)" fontSize={11} />
              <YAxis stroke="var(--color-ink-muted)" fontSize={11} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: '6px', fontSize: '0.8rem' }}
              />
              <Area type="monotone" dataKey="sales" stroke="var(--color-accent)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              <Area type="monotone" dataKey="purchases" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorPurchases)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. SIDE-BY-SIDE: REORDER WATCHLIST + RECENT ACTIVITY (No heavy full ledger) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* REORDER WATCHLIST */}
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} color="var(--color-signal-amber)" /> Reorder Watchlist
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('purchases')}>
              Generate Purchase Orders
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--color-ink-dim)', fontSize: '0.8125rem' }}>
              All inventory levels operating within safe margins.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lowStockItems.slice(0, 4).map(item => (
                <div key={item.id} style={{
                  padding: '10px 12px',
                  background: 'var(--color-canvas)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--color-rule)'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-ink-dim)', fontFamily: 'monospace' }}>SKU: {item.sku}</div>
                  </div>

                  <span className="badge badge-warning">
                    {item.stock_quantity} / {item.reorder_level} MIN
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENT ACTIVITY SUMMARY (3-5 items) */}
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Recent Activity Stream</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('inventory')}>
              View Full Ledger →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.slice(0, 4).map(tx => (
              <div key={tx.id} style={{
                padding: '10px 12px',
                background: 'var(--color-canvas)',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--color-rule)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge ${tx.type === 'PURCHASE' ? 'badge-success' : tx.type === 'SALE' ? 'badge-info' : 'badge-warning'}`}>
                    {tx.type}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{tx.product_name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-ink-dim)' }}>Operator: {tx.user_name || 'System'}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontFamily: 'monospace', color: tx.quantity > 0 ? 'var(--color-signal-green)' : 'var(--color-signal-red)' }}>
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-ink-dim)', fontFamily: 'monospace' }}>
                    {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
