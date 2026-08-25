import React, { useState } from 'react';
import { Tag, ShieldCheck, Plus, Calendar, Percent, CheckCircle2 } from 'lucide-react';

export default function PromotionsView({ onShowToast, currentRole }) {
  const [promotions, setPromotions] = useState([
    {
      id: 14,
      promo_code: 'PROMO-2026-014',
      name: 'Beverages & Accessories Sale',
      discount_type: 'PERCENTAGE',
      value: 10,
      target_category: 'Peripherals & Accessories',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      status: 'ACTIVE',
      created_by: 'Charlie Staff',
      approved_by: 'Bob Manager'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    promo_code: 'PROMO-2026-015',
    name: 'Spring Clearance Special',
    discount_type: 'PERCENTAGE',
    value: 15,
    target_category: 'Laptops & Computers',
    start_date: '2026-09-15',
    end_date: '2026-10-15'
  });

  const handleCreatePromo = (e) => {
    e.preventDefault();
    const newPromo = {
      id: Date.now(),
      ...formData,
      status: 'PENDING',
      created_by: currentRole === 'ADMIN' ? 'Alice Admin' : 'Charlie Staff',
      approved_by: null
    };

    setPromotions([newPromo, ...promotions]);
    setIsModalOpen(false);
    onShowToast?.('info', 'Promotion Created', `Rule ${newPromo.promo_code} submitted for Manager approval.`);
  };

  const handleApprove = (id) => {
    setPromotions(promotions.map(p => p.id === id ? { ...p, status: 'ACTIVE', approved_by: 'Bob Manager' } : p));
    onShowToast?.('success', 'Promotion Approved', `Promotion rule activated with Segregation of Duties.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Discounts & Promotions Rules
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            Pricing rules and promotional discounts with Manager Approval workflow (Segregation of Duties).
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer'
          }}
        >
          <Plus size={18} /> Create Promotion Rule
        </button>
      </div>

      {/* Promotions Table */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
              <th style={{ padding: '10px' }}>PROMO CODE</th>
              <th style={{ padding: '10px' }}>RULE NAME</th>
              <th style={{ padding: '10px' }}>DISCOUNT TYPE</th>
              <th style={{ padding: '10px' }}>TARGET CATEGORY</th>
              <th style={{ padding: '10px' }}>VALIDITY DATES</th>
              <th style={{ padding: '10px' }}>STATUS</th>
              <th style={{ padding: '10px' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{p.promo_code}</td>
                <td style={{ padding: '10px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--color-accent)' }}>
                  {p.discount_type === 'PERCENTAGE' ? `${p.value}% OFF` : `$${p.value} OFF`}
                </td>
                <td style={{ padding: '10px' }}>{p.target_category}</td>
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  {p.start_date} to {p.end_date}
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '12px',
                    background: p.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                    color: p.status === 'ACTIVE' ? 'var(--color-signal-green)' : '#eab308', fontWeight: 700
                  }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  {p.status === 'PENDING' && (currentRole === 'ADMIN' || currentRole === 'MANAGER') && (
                    <button
                      onClick={() => handleApprove(p.id)}
                      style={{
                        padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px',
                        background: 'var(--color-signal-green)', color: '#fff', border: 'none', cursor: 'pointer'
                      }}
                    >
                      Approve & Activate
                    </button>
                  )}
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create Promotion Rule</h3>
            <form onSubmit={handleCreatePromo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>PROMO CODE</label>
                <input
                  type="text"
                  required
                  value={formData.promo_code}
                  onChange={e => setFormData({ ...formData, promo_code: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>RULE NAME</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>DISCOUNT TYPE</label>
                  <select
                    value={formData.discount_type}
                    onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>VALUE</label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  />
                </div>
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
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
