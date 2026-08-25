import React, { useState } from 'react';
import { 
  Boxes, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  AlertTriangle, 
  Plus, 
  Download, 
  Search,
  CheckCircle2,
  XCircle,
  X,
  ShieldCheck,
  Calculator
} from 'lucide-react';

export default function InventoryView({ products, transactions, onAdjustStock, onExportCSV, onShowToast, currentRole }) {
  const [activeTab, setActiveTab] = useState('levels');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [adjustmentType, setAdjustmentType] = useState('IN'); // IN or OUT
  const [reasonCategory, setReasonCategory] = useState('CORRECTION');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const targetProduct = products.find(p => p.id === Number(selectedProductId)) || products[0];
  const currentStock = targetProduct?.stock_quantity || 0;
  const qtyDelta = adjustmentType === 'IN' ? Number(quantity || 0) : -Number(quantity || 0);
  const projectedStock = currentStock + qtyDelta;
  const isInvalidNegative = projectedStock < 0;

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;
    if (isInvalidNegative) {
      if (onShowToast) onShowToast('Stock bound error: Cannot adjust stock below 0.', 'danger');
      return;
    }

    const qtyNumber = adjustmentType === 'IN' ? Number(quantity) : -Number(quantity);
    const fullNotes = `[${reasonCategory}] ${notes || 'Manual stock adjustment'}`;

    onAdjustStock(Number(selectedProductId), qtyNumber, 'ADJUSTMENT', fullNotes);
    setIsAdjustModalOpen(false);
    setQuantity(1);
    setNotes('');
    if (onShowToast) onShowToast(`Stock updated for ${targetProduct?.name}. New Balance: ${projectedStock}`, 'success');
  };

  // Metrics
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock_quantity, 0);
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Stock & Audit Ledger</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            Defensive Row-Level Locked Inventory Operations & Transaction Trail
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => onExportCSV(transactions, 'inventory_ledger.csv')}>
            <Download size={15} /> Export Ledger CSV
          </button>
          {(currentRole === 'MANAGER' || currentRole === 'STAFF') && (
            <button className="btn btn-primary" onClick={() => setIsAdjustModalOpen(true)}>
              <Plus size={15} /> Record Stock Adjustment
            </button>
          )}
        </div>
      </div>

      {/* Stock Health KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="hm-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>TOTAL INVENTORY UNITS</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{totalStockUnits.toLocaleString()}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-signal-green)', fontWeight: 700 }}>● ALL WAREHOUSES HEALTHY</span>
        </div>

        <div className="hm-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>LOW STOCK WARNINGS</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-signal-amber)', fontFamily: 'var(--font-mono)' }}>
            {lowStockProducts.length} ITEMS
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)' }}>REORDER THRESHOLD TRIGGERED</span>
        </div>

        <div className="hm-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>OUT OF STOCK ALERTS</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-signal-red)', fontFamily: 'var(--font-mono)' }}>
            {outOfStockProducts.length} ITEMS
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-signal-red)', fontWeight: 700 }}>● IMMEDIATE REORDER REQUIRED</span>
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-rule)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('levels')}
            className={`btn ${activeTab === 'levels' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8125rem' }}
          >
            <Boxes size={15} /> Inventory Levels & Stock Health
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8125rem' }}
          >
            <History size={15} /> Immutable Transaction History ({transactions.length})
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={15} color="var(--color-ink-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search SKU or Product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px' }}
          />
        </div>
      </div>

      {/* Content 1: Inventory Stock Levels */}
      {activeTab === 'levels' && (
        <div className="hm-panel" style={{ padding: '0px', overflow: 'hidden' }}>
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>On Hand Qty</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th>Total Cost Value</th>
                  <th>Stock Health Meter</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(p => p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(p => {
                    const totalValue = p.stock_quantity * p.purchase_price;
                    const isOut = p.stock_quantity === 0;
                    const isLow = p.stock_quantity <= p.reorder_level;

                    return (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>{p.sku}</td>
                        <td style={{ fontWeight: 700 }}>{p.name}</td>
                        <td>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{p.stock_quantity}</span> {p.unit}
                        </td>
                        <td style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>{p.reorder_level} {p.unit}</td>
                        <td>
                          {isOut ? (
                            <span className="badge badge-danger">OUT OF STOCK</span>
                          ) : isLow ? (
                            <span className="badge badge-warning">LOW STOCK</span>
                          ) : (
                            <span className="badge badge-success">IN STOCK</span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>${totalValue.toFixed(2)}</td>
                        <td style={{ width: '180px' }}>
                          <div style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, (p.stock_quantity / (p.reorder_level * 3)) * 100)}%`,
                              height: '100%',
                              background: isOut ? 'var(--color-signal-red)' : isLow ? 'var(--color-signal-amber)' : 'var(--color-signal-green)',
                              borderRadius: '10px'
                            }}></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content 2: Immutable Transaction Log */}
      {activeTab === 'history' && (
        <div className="hm-panel" style={{ padding: '0px', overflow: 'hidden' }}>
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tx ID</th>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>Transaction Type</th>
                  <th>Quantity Delta</th>
                  <th>Operator</th>
                  <th>Ref #</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>#{tx.id}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{tx.product_name}</td>
                    <td>
                      <span className={`badge ${
                        tx.type === 'SALE' ? 'badge-info' :
                        tx.type === 'PURCHASE' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      color: tx.quantity > 0 ? 'var(--color-signal-green)' : 'var(--color-signal-red)'
                    }}>
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{tx.user_name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>{tx.reference}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>{tx.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Defensive Stock Adjustment */}
      {isAdjustModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAdjustModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '24px', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calculator size={20} color="var(--color-accent)" /> Defensive Stock Adjustment
                </h3>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                  Atomic PostgreSQL Row-Level Lock (.with_for_update)
                </span>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">Target SKU / Product *</label>
                <select
                  className="input-field"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Current Stock: {p.stock_quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="input-label">Adjustment Direction *</label>
                  <select
                    className="input-field"
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                  >
                    <option value="IN">STOCK IN (+ Increase Inventory)</option>
                    <option value="OUT">STOCK OUT (- Decrease Inventory)</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Adjustment Reason *</label>
                  <select
                    className="input-field"
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value)}
                  >
                    <option value="CORRECTION">Stocktake Correction</option>
                    <option value="DAMAGED">Damaged / Write-Off</option>
                    <option value="RETURNED">Customer Return</option>
                    <option value="SAMPLE">Demo / Sample Allocation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Quantity Amount *</label>
                <input
                  type="number"
                  min="1"
                  className="input-field font-mono"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              {/* Defensive Pre-Calculation Summary Card */}
              <div style={{
                background: isInvalidNegative ? 'var(--color-accent-subtle)' : 'var(--color-paper-2)',
                border: `1px solid ${isInvalidNegative ? 'var(--color-signal-red)' : 'var(--color-rule)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-ink-muted)' }}>CURRENT STOCK:</span>
                  <span style={{ fontWeight: 700 }}>{currentStock} {targetProduct?.unit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-ink-muted)' }}>PROPOSED CHANGE:</span>
                  <span style={{ fontWeight: 800, color: qtyDelta >= 0 ? 'var(--color-signal-green)' : 'var(--color-signal-red)' }}>
                    {qtyDelta >= 0 ? `+${qtyDelta}` : qtyDelta} {targetProduct?.unit}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--color-rule)', paddingTop: '6px' }}>
                  <span style={{ fontWeight: 700 }}>PROJECTED RESULT:</span>
                  <span style={{ fontWeight: 800, color: isInvalidNegative ? 'var(--color-signal-red)' : 'var(--color-accent)' }}>
                    {projectedStock} {targetProduct?.unit}
                  </span>
                </div>
                {isInvalidNegative && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-signal-red)', fontWeight: 700, marginTop: '6px' }}>
                    ⚠ Cannot adjust stock below zero. Reduce stock-out quantity.
                  </div>
                )}
              </div>

              <div>
                <label className="input-label">Reason / Reference Notes</label>
                <textarea
                  className="input-field"
                  rows="2"
                  placeholder="Additional context for audit ledger..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isInvalidNegative}>
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
