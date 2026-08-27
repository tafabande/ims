import React from 'react';
import { X, Printer, CheckCircle, ShoppingBag, ShieldCheck } from 'lucide-react';

export default function ReceiptModal({ sale, onClose, onShowToast }) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
    if (onShowToast) {
      onShowToast('success', 'Print Spooled', `Tax invoice ${sale.invoice_number} sent to printer.`);
    }
  };

  const taxAmount = sale.total_amount * 0.10; // 10% tax
  const subtotal = sale.total_amount - taxAmount;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-rule)',
          background: 'var(--color-paper-2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} color="var(--color-signal-green)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Tax Invoice & POS Receipt</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px' }}>
          <div className="printable-receipt" style={{
            background: '#ffffff',
            color: '#0f172a',
            padding: '24px',
            borderRadius: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
          }}>
            {/* Store Banner Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #94a3b8', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                IMS INDUSTRIAL TERMINAL
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Official Sales Tax Invoice & Stock Manifest
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                INVOICE #: <strong>{sale.invoice_number}</strong>
              </div>
            </div>

            {/* Meta details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '0.75rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Date:</span> <strong>{sale.timestamp ? new Date(sale.timestamp).toLocaleString() : 'N/A'}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748b' }}>Customer:</span> <strong>{sale.customer_name || 'Walk-in Customer'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Operator:</span> <strong>{sale.user_name || 'System Operator'}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748b' }}>Payment:</span> <strong>{sale.payment_method || 'CREDIT CARD'}</strong>
              </div>
            </div>

            {/* Line items table */}
            <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '8px 0', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                <span>Item Description</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Price</span>
                <span style={{ textAlign: 'right' }}>Total</span>
              </div>
              {sale.items && sale.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '6px 0', borderBottom: idx === sale.items.length - 1 ? 'none' : '1px dashed #f1f5f9' }}>
                  <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                  <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                  <span style={{ textAlign: 'right' }}>${item.unit_price?.toFixed(2)}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700 }}>${(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right', fontSize: '0.8rem', borderBottom: '2px dashed #94a3b8', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Subtotal (Excl. Tax):</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Estimated Tax (10%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                <span>TOTAL PAID:</span>
                <span style={{ color: '#0284c7' }}>${sale.total_amount?.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Sign-off */}
            <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
              <p style={{ fontWeight: 700 }}>Thank you for your business!</p>
              <p style={{ marginTop: '2px' }}>ACID Verified Immutable Ledger Entry ID #{sale.id}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--color-rule)',
          background: 'var(--color-paper-2)',
          display: 'flex',
          justify: 'flex-end',
          gap: '10px'
        }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} /> Print Tax Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
