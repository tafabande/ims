import React, { useState } from 'react';
import { Truck, Plus, Mail, Phone, MapPin, X } from 'lucide-react';

export default function SuppliersView({ suppliers, onAddSupplier, currentRole, onShowToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddSupplier({
      ...formData,
      id: Date.now()
    });
    if (onShowToast) onShowToast('success', 'Supplier Registered', `Added ${formData.name} to directory.`);
    setIsModalOpen(false);
    setFormData({ name: '', contact_person: '', email: '', phone: '', address: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Suppliers & Vendors Directory</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            Maintain primary supplier details, contacts, and purchase origins.
          </p>
        </div>

        {currentRole !== 'STAFF' && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Register Supplier
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
        {suppliers.map(s => (
          <div key={s.id} className="hm-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', color: 'var(--color-accent)' }}>
                <Truck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{s.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>Contact: {s.contact_person}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-ink-muted)' }}>
                <Mail size={14} color="var(--color-accent)" /> {s.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-ink-muted)' }}>
                <Phone size={14} color="var(--color-accent)" /> {s.phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-ink-dim)' }}>
                <MapPin size={14} color="var(--color-ink-dim)" /> {s.address}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Register Vendor / Supplier</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">Supplier Company Name *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  placeholder="e.g. Global Tech Distributors"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="input-label">Contact Person Name *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={formData.contact_person}
                  onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="input-label">Email Address *</label>
                  <input
                    type="email"
                    className="input-field"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Phone Number *</label>
                  <input
                    type="text"
                    className="input-field font-mono"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Physical Address</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
