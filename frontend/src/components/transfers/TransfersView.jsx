import React, { useState } from 'react';
import { ArrowRightLeft, Building2, CheckCircle2, ArrowRight, Package } from 'lucide-react';

export default function TransfersView({ onShowToast }) {
  const [transfers, setTransfers] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    source_store: 'Harare Flagship Store (STR-HRE-001)',
    destination_store: 'Bulawayo Branch (STR-BYO-001)',
    product_name: 'Logitech MX Master 3S',
    quantity: 5,
    notes: 'Inter-branch transfer'
  });

  const handleCreateTransfer = (e) => {
    e.preventDefault();
    const newTransfer = {
      id: Date.now(),
      transfer_code: `TRF-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      source_store: formData.source_store,
      destination_store: formData.destination_store,
      status: 'COMPLETED',
      notes: formData.notes,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      items: [{ id: Date.now() + 1, product_name: formData.product_name, quantity: formData.quantity }]
    };

    setTransfers([newTransfer, ...transfers]);
    setIsModalOpen(false);
    onShowToast?.('success', 'Transfer Completed', `Stock transfer ${newTransfer.transfer_code} issued with dual ledger movement.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Inter-Store Stock Transfers
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            Single business transaction creating dual inventory ledger movements (-Qty Source, +Qty Destination).
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer'
          }}
        >
          <ArrowRightLeft size={18} /> New Stock Transfer
        </button>
      </div>

      {/* Transfer Pipeline Stepper List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {transfers.map(t => (
          <div key={t.id} style={{
            background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)',
            padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-accent)' }}>
                  {t.transfer_code}
                </span>
                <span style={{
                  fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '12px',
                  background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-signal-green)', fontWeight: 700
                }}>
                  {t.status}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-dim)' }}>
                {t.created_at}
              </span>
            </div>

            {/* Stepper Route */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--color-paper-2)',
              padding: '12px 16px', borderRadius: 'var(--radius-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <Building2 size={18} style={{ color: 'var(--color-ink-muted)' }} />
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>SOURCE STORE (-QTY)</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{t.source_store}</div>
                </div>
              </div>

              <ArrowRight size={20} style={{ color: 'var(--color-accent)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <Building2 size={18} style={{ color: 'var(--color-ink-muted)' }} />
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>DESTINATION STORE (+QTY)</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{t.destination_store}</div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
              <strong>Items Transferred:</strong>{' '}
              {t.items.map(item => `${item.quantity}x ${item.product_name}`).join(', ')}
              {t.notes && <span style={{ marginLeft: '12px', fontStyle: 'italic' }}>({t.notes})</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)',
            padding: '24px', width: '500px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create Inter-Store Transfer</h3>
            <form onSubmit={handleCreateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>SOURCE STORE (-QTY)</label>
                <select
                  value={formData.source_store}
                  onChange={e => setFormData({ ...formData, source_store: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                >
                  <option value="Harare Flagship Store (STR-HRE-001)">Harare Flagship Store (STR-HRE-001)</option>
                  <option value="Bulawayo Branch (STR-BYO-001)">Bulawayo Branch (STR-BYO-001)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>DESTINATION STORE (+QTY)</label>
                <select
                  value={formData.destination_store}
                  onChange={e => setFormData({ ...formData, destination_store: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                >
                  <option value="Bulawayo Branch (STR-BYO-001)">Bulawayo Branch (STR-BYO-001)</option>
                  <option value="Harare Flagship Store (STR-HRE-001)">Harare Flagship Store (STR-HRE-001)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>PRODUCT</label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>TRANSFER QUANTITY</label>
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
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>NOTES / REASON</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
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
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
