import React, { useState } from 'react';
import { RotateCcw, AlertOctagon, CheckCircle2, DollarSign, PackageCheck, FileText } from 'lucide-react';

export default function ReturnsView({ onShowToast }) {
  const [returns, setReturns] = useState([]);

  const initialFormState = {
    invoice_number: '',
    customer_name: '',
    product_name: '',
    quantity: 1,
    refund_price: '',
    reason_category: 'DEFECTIVE',
    restockable: true,
    notes: ''
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);

  const handleOpenModal = () => {
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleCreateReturn = (e, isSubmitForApproval = false) => {
    e.preventDefault();
    if (!formData.invoice_number || !formData.product_name || !formData.refund_price) {
      onShowToast?.('warning', 'Missing Fields', 'Please fill in invoice number, product name, and unit price.');
      return;
    }

    const price = parseFloat(formData.refund_price) || 0;
    const qty = parseInt(formData.quantity) || 1;
    const status = isSubmitForApproval ? 'PENDING_APPROVAL' : 'COMPLETED';
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newReturn = {
      id: Date.now(),
      return_code: `RET-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      invoice_number: formData.invoice_number,
      customer_name: formData.customer_name || 'Walk-in Customer',
      total_refund_amount: qty * price,
      reason_category: formData.reason_category,
      is_damaged: !formData.restockable,
      restock_approved: formData.restockable,
      notes: formData.notes,
      status: status,
      created_at: formattedDate,
      items: [{ id: Date.now() + 1, product_name: formData.product_name, quantity: qty, price: price, restockable: formData.restockable }]
    };

    setReturns([newReturn, ...returns]);
    setIsModalOpen(false);
    setFormData(initialFormState);
    
    if (isSubmitForApproval) {
      onShowToast?.('warning', 'Refund Submitted for Approval', `Return request ${newReturn.return_code} ($${newReturn.total_refund_amount.toFixed(2)}) sent to Manager Attention Center.`);
    } else {
      onShowToast?.('success', 'Return Processed', `Return order ${newReturn.return_code} processed. Refund: $${newReturn.total_refund_amount.toFixed(2)}.`);
    }
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
            Process customer returns, submit refund requests for manager approval, restock items, and write-offs.
          </p>
        </div>
        <button
          onClick={handleOpenModal}
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
              <th style={{ padding: '10px' }}>REASON & NOTES</th>
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
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-paper-2)', fontWeight: 600, display: 'inline-block', marginBottom: '4px' }}>
                    {r.reason_category}
                  </span>
                  {r.notes && <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>{r.notes}</div>}
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
                    fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700,
                    background: r.status === 'PENDING_APPROVAL' ? 'rgba(245, 158, 11, 0.15)' : r.status === 'COMPLETED' || r.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: r.status === 'PENDING_APPROVAL' ? '#f59e0b' : r.status === 'COMPLETED' || r.status === 'APPROVED' ? 'var(--color-signal-green)' : '#ef4444'
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
            padding: '24px', width: '520px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Issue / Request Customer Return</h3>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>CUSTOMER NAME</label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
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
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
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
                    onChange={e => setFormData({ ...formData, refund_price: parseFloat(e.target.value) || 0 })}
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
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>REFUND REASON DETAILS / NOTES (OPTIONAL)</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Provide additional details regarding the return or refund justification..."
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)', fontSize: '0.85rem' }}
                />
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'transparent', color: 'var(--color-ink)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateReturn(e, true)}
                  style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #f59e0b', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Send for Manager Approval
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateReturn(e, false)}
                  style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Process & Issue Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
