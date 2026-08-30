import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle, Play, FileSpreadsheet } from 'lucide-react';
import { apiGet } from '../../utils/apiClient';

export default function StocktakeView({ onShowToast }) {
  const [stocktakes, setStocktakes] = useState([]);
  const [branches, setBranches] = useState([
    { id: 1, name: 'Harare Flagship Store (STR-HRE-001)' },
    { id: 2, name: 'Bulawayo Branch (STR-BYO-001)' }
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    store_name: branches[0]?.name || 'Harare Flagship Store (STR-HRE-001)',
    reason: 'PERIODIC_AUDIT',
    product_name: 'Dell XPS 15 9530',
    system_qty: 10,
    physical_qty: 8,
    notes: '2 units written off due to physical damage'
  });

  const handleCreateStocktake = (e) => {
    e.preventDefault();
    const variance = formData.physical_qty - formData.system_qty;
    const newStk = {
      id: Date.now(),
      stocktake_code: `STK-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      store_name: formData.store_name,
      status: 'APPROVED',
      reason: formData.reason,
      conducted_by: 'Charlie Staff',
      approved_by: 'Bob Manager',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      items: [
        {
          id: Date.now() + 1,
          sku: 'LAP-002',
          name: formData.product_name,
          system: formData.system_qty,
          physical: formData.physical_qty,
          variance: variance,
          reason: formData.reason
        }
      ]
    };

    setStocktakes([newStk, ...stocktakes]);
    setIsModalOpen(false);
    onShowToast?.('success', 'Stocktake Approved', `Stocktake session ${newStk.stocktake_code} approved. Variance posted to ledger.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Stock Counting & Audit (Stocktake)
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            Physical stock counting, variance investigation, manager approval, and reason-coded write-offs.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer'
          }}
        >
          <ClipboardList size={18} /> Perform Stocktake Session
        </button>
      </div>

      {/* Sessions Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {stocktakes.map(s => (
          <div key={s.id} style={{
            background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)',
            padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-accent)' }}>
                  {s.stocktake_code}
                </span>
                <span style={{
                  fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '12px',
                  background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-signal-green)', fontWeight: 700
                }}>
                  {s.status}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-dim)' }}>
                Audited by {s.conducted_by} • Approved by {s.approved_by}
              </div>
            </div>

            {/* Audit Grid Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                  <th style={{ padding: '8px' }}>PRODUCT</th>
                  <th style={{ padding: '8px' }}>SYSTEM STOCK</th>
                  <th style={{ padding: '8px' }}>PHYSICAL COUNT</th>
                  <th style={{ padding: '8px' }}>VARIANCE</th>
                  <th style={{ padding: '8px' }}>REASON CODE</th>
                </tr>
              </thead>
              <tbody>
                {s.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{item.name} ({item.sku})</td>
                    <td style={{ padding: '8px' }}>{item.system}</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{item.physical}</td>
                    <td style={{ padding: '8px', fontWeight: 800, color: item.variance < 0 ? '#ef4444' : item.variance > 0 ? 'var(--color-accent)' : 'var(--color-signal-green)' }}>
                      {item.variance > 0 ? `+${item.variance}` : item.variance}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-paper-2)', fontWeight: 700 }}>
                        {item.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Record Physical Stock Count</h3>
            <form onSubmit={handleCreateStocktake} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>STORE BRANCH</label>
                <select
                  value={formData.store_name}
                  onChange={e => setFormData({ ...formData, store_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>SYSTEM QUANTITY</label>
                  <input
                    type="number"
                    required
                    value={formData.system_qty}
                    onChange={e => setFormData({ ...formData, system_qty: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>PHYSICAL COUNT</label>
                  <input
                    type="number"
                    required
                    value={formData.physical_qty}
                    onChange={e => setFormData({ ...formData, physical_qty: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>EXPLICIT REASON CODE</label>
                <select
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                >
                  <option value="PERIODIC_AUDIT">Periodic Routine Audit</option>
                  <option value="EXPIRY">Expired Product Write-off</option>
                  <option value="DAMAGE">Physical Damage / Breakage</option>
                  <option value="THEFT">Unexplained Theft / Shrinkage</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>NOTES</label>
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
                  Submit & Approve Count
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
