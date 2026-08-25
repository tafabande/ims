import React, { useState } from 'react';
import { RotateCcw, AlertOctagon, CheckCircle2, DollarSign, PackageCheck, FileText } from 'lucide-react';

export default function ReturnsView({ onShowToast }) {
  const [returns, setReturns] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: 'INV-2026-00103',
    customer_name: 'Apex Retail Stores',
    product_name: 'Lenovo ThinkPad X1 Carbon',
    quantity: 1,
    refund_price: 1450.0,
    reason_category: 'DEFECTIVE',
    restockable: true
  });

  const handleProcessReturn = (e) => {
    e.preventDefault();
    const newReturn = {
      id: Date.now(),
      return_code: `RET-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      invoice_number: formData.invoice_number,
      customer_name: formData.customer_name,
      total_refund_amount: formData.quantity * formData.refund_price,
      reason_category: formData.reason_category,
      is_damaged: !formData.restockable,
      restock_approved: formData.restockable,
      status: 'COMPLETED',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      items: [{ id: Date.now() + 1, product_name: formData.product_name, quantity: formData.quantity, price: formData.refund_price, restockable: formData.restockable }]
    };

    setReturns([newReturn, ...returns]);
    setIsModalOpen(false);
    onShowToast?.('success', 'Return Processed', `Return order ${newReturn.return_code} processed. Refund: $${newReturn.total_refund_amount.toFixed(2)}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Returns & Refunds Management
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            Process customer returns, restockable items, damaged write-offs, and refund receipts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer'
          }}
        >
          <RotateCcw size={18} /> Issue Return / Refund
        </button>
      </div>

      {/* Returns Table */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
              <th style={{ padding: '10px' }}>RETURN CODE</th>
              <th style={{ padding: '10px' }}>ORIGINAL SALE</th>
              <th style={{ padding: '10px' }}>CUSTOMER</th>
              <th style={{ padding: '10px' }}>REASON</th>
              <th style={{ padding: '10px' }}>RESTOCKABLE</th>
              <th style={{ padding: '10px' }}>TOTAL REFUND</th>
              <th style={{ padding: '10px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {returns.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.return_code}</td>
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{r.invoice_number}</td>
                <td style={{ padding: '10px' }}>{r.customer_name}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-paper-2)', fontWeight: 600 }}>
                    {r.reason_category}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  {r.restock_approved ? (
                    <span style={{ color: 'var(--color-signal-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <PackageCheck size={14} /> YES (Restocked)
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertOctagon size={14} /> NO (Write-Off)
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px', fontWeight: 800, color: 'var(--color-ink)' }}>${r.total_refund_amount.toFixed(2)}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '12px',
                    background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-signal-green)', fontWeight: 700
                  }}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)',
            padding: '24px', width: '480px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Issue Return Order</h3>
            <form onSubmit={handleProcessReturn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>ORIGINAL INVOICE NUMBER</label>
                <input
                  type="text"
                  required
                  value={formData.invoice_number}
                  onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>PRODUCT NAME</label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>QUANTITY</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>REFUND UNIT PRICE ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.refund_price}
                    onChange={e => setFormData({ ...formData, refund_price: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>RETURN REASON</label>
                <select
                  value={formData.reason_category}
                  onChange={e => setFormData({ ...formData, reason_category: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                >
                  <option value="DEFECTIVE">Defective Goods</option>
                  <option value="WRONG_ITEM">Wrong Item Sent</option>
                  <option value="EXPIRED">Expired Product</option>
                  <option value="CUSTOMER_CHANGE">Customer Changed Mind</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="restockable"
                  checked={formData.restockable}
                  onChange={e => setFormData({ ...formData, restockable: e.target.checked })}
                />
                <label htmlFor="restockable" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Restock back into active inventory ledger</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'transparent', color: 'var(--color-ink)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Process Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
