import React from 'react';
import { 
  Package, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  PlusCircle, 
  ArrowUpRight, 
  Boxes,
  ShoppingCart,
  ShoppingBag,
  Activity
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DashboardView({ 
  products, 
  transactions, 
  sales, 
  onNavigate 
}) {
  // Compute Telemetry Metrics
  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock_quantity <= p.reorder_level);
  const outOfStockItems = products.filter(p => p.stock_quantity === 0);
  const totalStockQuantity = products.reduce((acc, p) => acc + p.stock_quantity, 0);
  const totalValuation = products.reduce((acc, p) => acc + (p.stock_quantity * p.purchase_price), 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.total_amount, 0);

  // Sales & Purchases Chart Stream
  const chartData = [
    { day: 'Mon', sales: 1200, purchases: 800 },
    { day: 'Tue', sales: 1900, purchases: 1100 },
    { day: 'Wed', sales: 2900, purchases: 2200 },
    { day: 'Thu', sales: 1450, purchases: 600 },
    { day: 'Fri', sales: 3200, purchases: 1800 },
    { day: 'Sat', sales: 4100, purchases: 900 },
    { day: 'Sun', sales: 2800, purchases: 1400 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Quick Action Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)', fontWeight: 700 }}>
              OPERATIONS OVERVIEW
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Store Inventory & Sales Executive Dashboard</h2>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('sales')}>
            <ShoppingCart size={15} /> Launch POS Terminal
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('purchases')}>
            <ShoppingBag size={15} /> Receive Goods
          </button>
        </div>
      </div>

      {/* Telemetry Summary Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '12px'
      }}>
        <div style={{ padding: '16px 20px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>CATALOG SKUS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: '4px 0 2px 0' }}>
            {totalProducts}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)' }}>
            {totalStockQuantity} Total Units Stocked
          </div>
        </div>

        <div 
          className={lowStockItems.length > 0 ? 'warning-border-pulse' : ''}
          style={{ padding: '16px 20px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)' }}
        >
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-signal-amber)', fontWeight: 700 }}>CRITICAL LOW STOCK</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-signal-amber)', margin: '4px 0 2px 0' }}>
            {lowStockItems.length} SKUs
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)' }}>
            {outOfStockItems.length} Completely Depleted
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>INVENTORY COST VALUATION</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)', margin: '4px 0 2px 0' }}>
            ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)' }}>
            Cost Basis Capital
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>SALES REVENUE (L7D)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', margin: '4px 0 2px 0' }}>
            ${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)' }}>
            {sales.length} Tax Invoices Issued
          </div>
        </div>
      </div>

      {/* Main Grid: Chart (2/3) & Watchlist (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '8px' }}>
        {/* Sales Area Chart */}
        <div style={{ padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Weekly Sales & Intake Velocity</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>7-Day Revenue vs Purchase Expenditures ($ USD)</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'oklch(76% 0.18 70)', fontWeight: 700 }}>
                ● Sales (Revenue)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'oklch(72% 0.10 190)', fontWeight: 700 }}>
                ╌╌ Purchases (Intake)
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(76% 0.18 70)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="oklch(76% 0.18 70)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(72% 0.10 190)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(72% 0.10 190)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="day" stroke="var(--color-ink-muted)" fontSize={11} fontFamily="JetBrains Mono" />
                <YAxis stroke="var(--color-ink-muted)" fontSize={11} fontFamily="JetBrains Mono" />
                <Tooltip 
                  contentStyle={{ background: 'var(--color-paper-2)', border: 'none', borderRadius: '6px', fontSize: '0.8rem', boxShadow: 'var(--elevation-2)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="oklch(76% 0.18 70)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="purchases" stroke="oklch(72% 0.10 190)" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Watchlist Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} color="var(--color-signal-amber)" /> Reorder Watchlist
            </h3>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-dim)' }}>
              {lowStockItems.length} ITEMS
            </span>
          </div>

          {lowStockItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-ink-dim)', fontSize: '0.8125rem' }}>
              All inventory levels operating within safe margins.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '230px' }}>
              {lowStockItems.map(item => (
                <div key={item.id} style={{
                  padding: '10px 12px',
                  background: 'var(--color-paper-2)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)' }}>SKU: {item.sku}</div>
                  </div>

                  <span className="badge badge-warning">
                    {item.stock_quantity} / {item.reorder_level} MIN
                  </span>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary btn-sm" style={{ marginTop: '16px', width: '100%' }} onClick={() => onNavigate('purchases')}>
            <PlusCircle size={14} /> Auto-Generate Supplier PO
          </button>
        </div>
      </div>

      {/* Transaction Stream Ledger */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Real-Time Stock Audit Ledger Stream</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>Immutable event log of stock movements</p>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('inventory')}>
            View Full Ledger
          </button>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Type</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Operator</th>
                <th>Reference</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 5).map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>#{tx.id}</td>
                  <td>
                    <span className={`badge ${
                      tx.type === 'PURCHASE' ? 'badge-success' :
                      tx.type === 'SALE' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{tx.product_name}</td>
                  <td style={{ 
                    fontWeight: 800, 
                    color: tx.quantity > 0 ? 'var(--color-signal-green)' : 'var(--color-signal-red)',
                    fontFamily: 'var(--font-mono)' 
                  }}>
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                  </td>
                  <td>{tx.user_name}</td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>{tx.reference}</td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-dim)' }}>
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
