import React from 'react';
import { 
  PackageCheck, 
  Truck, 
  AlertTriangle, 
  Clock, 
  Layers, 
  ArrowRight,
  PackageX,
  FileCheck2,
  Box
} from 'lucide-react';

export default function WarehouseDashboard({ 
  products = [], 
  purchases = [], 
  onNavigate 
}) {
  const lowStockItems = products.filter(p => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0);
  const outOfStockItems = products.filter(p => p.stock_quantity === 0);
  const pendingPurchases = purchases.filter(p => p.status === 'PENDING' || p.status === 'ORDERED').length || 4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Warehouse Today's Workload KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PackageCheck size={14} color="var(--color-accent)" /> INBOUND POs TO RECEIVE
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent)', margin: '6px 0 2px 0' }}>
            {pendingPurchases}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Awaiting Goods Receiving (GRN)
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Box size={14} color="#f59e0b" /> PICKING & PACKING QUEUE
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', margin: '6px 0 2px 0' }}>
            12
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Store Replenishment Orders
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Truck size={14} color="#3b82f6" /> READY FOR DISPATCH
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', margin: '6px 0 2px 0' }}>
            7
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Staged at Loading Bay B
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} color="#8b5cf6" /> IN TRANSIT CARGO
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', margin: '6px 0 2px 0' }}>
            8
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>
            Active Inter-Store Deliveries
          </div>
        </div>

        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} color="#ef4444" /> RECEIVING EXCEPTIONS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', margin: '6px 0 2px 0' }}>
            2
          </div>
          <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
            Damaged / Discrepant Shipments
          </div>
        </div>

      </div>

      {/* Active Stock Movements & Transport Manifest */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
              Active Stock Movements & Transport Manifest
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
              Real-time movement tracking between central warehouse and store branches
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('purchases')} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PackageCheck size={14} /> Receive Goods (GRN)
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('transfers')} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={14} /> Open Transfers Hub
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
              <th style={{ padding: '10px 8px' }}>MANIFEST #</th>
              <th style={{ padding: '10px 8px' }}>ROUTE (ORIGIN ➔ DESTINATION)</th>
              <th style={{ padding: '10px 8px' }}>ITEMS / SKUs</th>
              <th style={{ padding: '10px 8px' }}>TRANSPORT & DRIVER</th>
              <th style={{ padding: '10px 8px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)' }}>TR-000421</td>
              <td style={{ padding: '10px 8px', color: 'var(--color-ink)' }}>Harare Main Warehouse ➔ Bulawayo Store #02</td>
              <td style={{ padding: '10px 8px', color: 'var(--color-ink-muted)' }}>12 items (CAT6 Cable, Dell Laptops)</td>
              <td style={{ padding: '10px 8px' }}>Truck ZW-1234 (Driver: John M.)</td>
              <td style={{ padding: '10px 8px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 800, fontSize: '11px' }}>
                  IN TRANSIT
                </span>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)' }}>TR-000422</td>
              <td style={{ padding: '10px 8px', color: 'var(--color-ink)' }}>Harare Main Warehouse ➔ Harare Store #01</td>
              <td style={{ padding: '10px 8px', color: 'var(--color-ink-muted)' }}>24 items (Accessories & Chargers)</td>
              <td style={{ padding: '10px 8px' }}>Van ZW-8891 (Driver: Peter K.)</td>
              <td style={{ padding: '10px 8px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 800, fontSize: '11px' }}>
                  PICKING & PACKING
                </span>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)' }}>PO-000892</td>
              <td style={{ padding: '10px 8px', color: 'var(--color-ink)' }}>Supplier (TechCorp) ➔ Central Receiving Bay</td>
              <td style={{ padding: '10px 8px', color: 'var(--color-ink-muted)' }}>50 items (Monitors 27")</td>
              <td style={{ padding: '10px 8px' }}>Freight Forwarder #901</td>
              <td style={{ padding: '10px 8px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontSize: '11px' }}>
                  READY FOR GRN
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Critical Stock Replenishment Priority */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
              Stock Level Alerts & Replenishment Priority
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
              Items requiring immediate warehouse restocking or purchase order reorder
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => onNavigate('inventory')} style={{ fontSize: '12px' }}>
            View Full Inventory →
          </button>
        </div>

        {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
          <div style={{ padding: '20px', color: 'var(--color-signal-green)', fontWeight: 700, fontSize: '13px' }}>
            ✓ All warehouse items are sufficiently stocked above minimum reorder points.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                <th style={{ padding: '8px' }}>SKU</th>
                <th style={{ padding: '8px' }}>PRODUCT NAME</th>
                <th style={{ padding: '8px' }}>CATEGORY</th>
                <th style={{ padding: '8px' }}>CURRENT STOCK</th>
                <th style={{ padding: '8px' }}>REORDER LEVEL</th>
                <th style={{ padding: '8px' }}>PRIORITY</th>
              </tr>
            </thead>
            <tbody>
              {outOfStockItems.slice(0, 3).map((item, idx) => (
                <tr key={`out-${idx}`} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 800 }}>{item.sku || `SKU-0${idx}`}</td>
                  <td style={{ padding: '8px', fontWeight: 700 }}>{item.name}</td>
                  <td style={{ padding: '8px', color: 'var(--color-ink-muted)' }}>{item.category || 'General'}</td>
                  <td style={{ padding: '8px', color: '#ef4444', fontWeight: 800 }}>0 units</td>
                  <td style={{ padding: '8px' }}>{item.reorder_level || 5} units</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 800, fontSize: '11px' }}>
                      CRITICAL (DEPLETED)
                    </span>
                  </td>
                </tr>
              ))}
              {lowStockItems.slice(0, 3).map((item, idx) => (
                <tr key={`low-${idx}`} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 800 }}>{item.sku || `SKU-L${idx}`}</td>
                  <td style={{ padding: '8px', fontWeight: 700 }}>{item.name}</td>
                  <td style={{ padding: '8px', color: 'var(--color-ink-muted)' }}>{item.category || 'General'}</td>
                  <td style={{ padding: '8px', color: '#f59e0b', fontWeight: 800 }}>{item.stock_quantity} units</td>
                  <td style={{ padding: '8px' }}>{item.reorder_level || 5} units</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 800, fontSize: '11px' }}>
                      LOW STOCK
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
