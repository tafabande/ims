import React from 'react';
import { 
  Award, 
  Clock, 
  Coffee, 
  Bell, 
  ShoppingCart, 
  Receipt, 
  DollarSign, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export default function StaffDashboard({ 
  sales = [], 
  salesPolicy = { zigExchangeRate: 13.50, standardTaxRatePct: 10, maxCashierDiscountPct: 5, highValueApprovalThreshold: 1000 },
  onNavigate 
}) {
  const todaySalesTotal = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  const todaySalesCount = sales.length;
  const recentSales = sales.slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Front-Desk Cashier Shift KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        <div style={{ 
          background: 'var(--color-paper-surface)', 
          border: '1px solid var(--color-rule)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
            <Award size={16} /> SHIFT SALES PROCESSED
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0', color: 'var(--color-signal-green)' }}>
            ${todaySalesTotal.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            {(todaySalesTotal * salesPolicy.zigExchangeRate).toFixed(2)} ZiG • <strong>{todaySalesCount}</strong> Receipts Completed
          </div>
        </div>

        <div style={{ 
          background: 'var(--color-paper-surface)', 
          border: '1px solid var(--color-rule)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
            <Clock size={16} /> REGISTER TILL STATUS
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            Till 01 Active
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Opening Cash Float: <strong>$200.00 USD</strong>
          </div>
        </div>

        <div style={{ 
          background: 'var(--color-paper-surface)', 
          border: '1px solid var(--color-rule)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
            <Coffee size={16} /> CASHIER SHIFT SCHEDULE
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0', color: 'var(--color-ink)' }}>
            08:00 - 16:30
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            📍 Main Store Register • Terminal #1
          </div>
        </div>

        <div style={{ 
          background: 'var(--color-paper-surface)', 
          border: '1px solid var(--color-rule)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>
            <DollarSign size={16} /> MAX CASHIER DISCOUNT
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', fontFamily: 'monospace', margin: '8px 0 4px 0', color: 'var(--color-ink)' }}>
            {salesPolicy.maxCashierDiscountPct}% Max
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Higher discounts require Manager PIN
          </div>
        </div>

      </div>

      {/* Active Exchange Policy & Store Announcements */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-ink)' }}>
          <Bell size={18} color="var(--color-accent)" /> Store Operations Policy & Announcements
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📢 Active Dual-Currency Rate Policy
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '4px', lineHeight: 1.5 }}>
              All transactions automatically compute dual-currency totals in ZiG at <strong>1 USD = {salesPolicy.zigExchangeRate} ZiG</strong>.
            </div>
          </div>

          <div style={{ background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚠️ High-Value Sale Limit Notice
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '4px', lineHeight: 1.5 }}>
              Sales above <strong>${salesPolicy.highValueApprovalThreshold} USD</strong> will prompt for Store Manager override approval.
            </div>
          </div>
        </div>
      </div>

      {/* Today's Completed Checkout Receipts */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
              Recent Sales Receipts Log
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
              Completed transactions during your current active shift
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('pos')} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCart size={15} /> Launch POS Register
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-ink-muted)', fontSize: '13px' }}>
            No sales processed yet today. Launch the POS register to initiate a sale.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                <th style={{ padding: '10px 8px' }}>RECEIPT #</th>
                <th style={{ padding: '10px 8px' }}>CUSTOMER / TYPE</th>
                <th style={{ padding: '10px 8px' }}>ITEMS</th>
                <th style={{ padding: '10px 8px' }}>PAYMENT METHOD</th>
                <th style={{ padding: '10px 8px' }}>TOTAL (USD)</th>
                <th style={{ padding: '10px 8px' }}>TOTAL (ZiG)</th>
                <th style={{ padding: '10px 8px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale, idx) => (
                <tr key={sale.id || idx} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)' }}>
                    {sale.receipt_no || sale.invoice_no || `REC-${1000 + idx}`}
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--color-ink)' }}>
                    {sale.customer_name || 'Walk-in Customer'}
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--color-ink-muted)' }}>
                    {sale.items ? sale.items.length : 1} item(s)
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-paper-2)', fontSize: '11px', fontWeight: 700 }}>
                      {sale.payment_method || 'CASH'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--color-signal-green)' }}>
                    ${(sale.total_amount || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: 'var(--color-ink-muted)' }}>
                    {((sale.total_amount || 0) * salesPolicy.zigExchangeRate).toFixed(2)} ZiG
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontSize: '11px' }}>
                      PAID & ISSUED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
