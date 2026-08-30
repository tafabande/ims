import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Building2, CheckCircle2, ArrowRight, Package, X } from 'lucide-react';
import { apiGet } from '../../utils/apiClient';

export default function TransfersView({ onShowToast, currentRole = 'MANAGER' }) {
  const [branches, setBranches] = useState([
    { id: 1, name: 'Harare Flagship Store (STR-HRE-01)' },
    { id: 2, name: 'Bulawayo Commercial Branch (STR-BYO-02)' }
  ]);

  useEffect(() => {
    apiGet('/stores')
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setBranches(res.map(s => ({ id: s.id, name: `${s.name} (${s.store_code || s.id})` })));
        }
      })
      .catch(() => {});
  }, []);

  const [transfers, setTransfers] = useState([
    {
      id: 1,
      transfer_code: 'TRF-2026-94021',
      source_store: 'Harare Flagship Store (STR-HRE-01)',
      destination_store: 'Bulawayo Commercial Branch (STR-BYO-02)',
      status: 'IN_TRANSIT',
      requested_by: 'Bulawayo Branch Manager (EMP-1991-00045)',
      notes: 'Inter-branch stock request for 20 units USB-C 65W Chargers',
      created_at: '2026-08-26 01:15:00',
      items: [{ id: 101, product_name: 'USB-C 65W Universal Power Adapter', quantity: 20 }]
    },
    {
      id: 2,
      transfer_code: 'TRF-2026-88102',
      source_store: 'Beitbridge Border Hub (STR-BGB-13)',
      destination_store: 'Harare Flagship Store (STR-HRE-01)',
      status: 'COMPLETED',
      requested_by: 'Harare Inventory Auditor',
      notes: 'Import goods relocation from border warehouse',
      created_at: '2026-08-25 14:20:00',
      items: [{ id: 102, product_name: 'Dell XPS 15 Workstation Laptop', quantity: 15 }]
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    source_store: branches[0]?.name || 'Harare Flagship Store (STR-HRE-01)',
    destination_store: branches[1]?.name || 'Bulawayo Commercial Branch (STR-BYO-02)',
    product_name: 'USB-C 65W Universal Power Adapter',
    quantity: 10,
    notes: 'Inter-branch stock requisition'
  });

  const handleCreateTransfer = (e) => {
    e.preventDefault();
    if (formData.source_store === formData.destination_store) {
      if (onShowToast) onShowToast('warning', 'Invalid Transfer', 'Source and Destination branches must be different.');
      return;
    }

    const newTransfer = {
      id: Date.now(),
      transfer_code: `TRF-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      source_store: formData.source_store,
      destination_store: formData.destination_store,
      status: 'PENDING_APPROVAL',
      requested_by: `${currentRole} Manager`,
      notes: formData.notes,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      items: [{ id: Date.now() + 1, product_name: formData.product_name, quantity: formData.quantity }]
    };

    setTransfers([newTransfer, ...transfers]);
    setIsModalOpen(false);
    onShowToast?.('success', 'Transfer Requisition Issued', `Inter-branch stock transfer ${newTransfer.transfer_code} requested across 14-branch network.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Inter-Branch Stock Transfer Requisitions (14 Branches)
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            Branch Managers manage local inventory and issue inter-branch transfer requests across the 14-branch network.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer'
          }}
        >
          <ArrowRightLeft size={18} /> Request Inter-Branch Transfer
        </button>
      </div>

      {/* Transfer Pipeline Stepper List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {transfers.map(t => (
          <div key={t.id} style={{
            background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)', fontSize: '12px' }}>{t.transfer_code}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px',
                    background: t.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: t.status === 'COMPLETED' ? 'var(--color-signal-green)' : '#f59e0b'
                  }}>
                    {t.status}
                  </span>
                </div>

                <div style={{ marginTop: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span>📍 From: <strong>{t.source_store}</strong></span>
                  <ArrowRight size={14} color="var(--color-accent)" />
                  <span>📍 To: <strong>{t.destination_store}</strong></span>
                </div>

                <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: '700' }}>
                  Items: {t.items.map(i => `${i.product_name} (${i.quantity} units)`).join(', ')}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                  Requested by: {t.requested_by} • <em>"{t.notes}"</em>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', width: '520px', maxWidth: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Request Inter-Branch Stock Transfer</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>SOURCE BRANCH (REQUESTED FROM)</label>
                <select
                  value={formData.source_store}
                  onChange={e => setFormData({ ...formData, source_store: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px' }}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>DESTINATION BRANCH (RECEIVING STOCK)</label>
                <select
                  value={formData.destination_store}
                  onChange={e => setFormData({ ...formData, destination_store: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px' }}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>PRODUCT REQUISITION</label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>QUANTITY</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '9px 16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}>Submit Stock Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
