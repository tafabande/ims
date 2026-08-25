import React, { useState } from 'react';
import { X, Printer, QrCode, Barcode, Copy, Check } from 'lucide-react';

export default function ThermalLabelModal({ product, onClose, onShowToast }) {
  const [copies, setCopies] = useState(1);
  const [copied, setCopied] = useState(false);

  if (!product) return null;

  const handlePrint = () => {
    window.print();
    if (onShowToast) {
      onShowToast('success', 'Print Job Sent', `Sent ${copies} thermal label(s) for ${product.name} to printer.`);
    }
  };

  const handleCopySKU = () => {
    navigator.clipboard.writeText(product.sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-rule)',
          background: 'var(--color-paper-2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Barcode size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Thermal Label Printing Simulator</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Label Preview Container */}
          <div>
            <div className="input-label">LABEL STICKER PREVIEW (50mm x 30mm)</div>
            <div className="printable-label" style={{
              background: '#ffffff',
              color: '#000000',
              padding: '12px',
              borderRadius: '4px',
              border: '2px dashed #94a3b8',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              height: '160px',
              fontFamily: 'monospace',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569' }}>
                    IMS INDUSTRIAL SKU
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    {product.name}
                  </div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0284c7' }}>
                  ${product.selling_price?.toFixed(2)}
                </div>
              </div>

              {/* Barcode Graphic */}
              <div style={{ textAlign: 'center', margin: '4px 0' }}>
                <div style={{
                  height: '40px',
                  background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px)',
                  borderRadius: '1px'
                }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', marginTop: '2px' }}>
                  {product.barcode || product.sku}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: '#64748b' }}>
                <span>SKU: <strong>{product.sku}</strong></span>
                <span>LOC: <strong>Aisle {product.category_id || 'A-1'}</strong></span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">PRINT COPIES</label>
              <input
                type="number"
                min="1"
                max="100"
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label className="input-label">SKU QUICK COPY</label>
              <button
                onClick={handleCopySKU}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                {copied ? <Check size={14} color="var(--color-signal-green)" /> : <Copy size={14} />}
                {copied ? 'Copied SKU!' : 'Copy SKU Barcode'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--color-rule)',
          background: 'var(--color-paper-2)',
          display: 'flex',
          justify: 'flex-end',
          gap: '10px'
        }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} /> Print {copies} Sticker(s)
          </button>
        </div>
      </div>
    </div>
  );
}
