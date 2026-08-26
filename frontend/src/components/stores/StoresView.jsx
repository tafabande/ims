import React, { useState } from 'react';
import { Store, Warehouse, Plus, Building2, MapPin, Phone, Mail, CheckCircle2, Clock } from 'lucide-react';

export default function StoresView({ onShowToast, currentRole = 'MANAGER' }) {
  const [stores, setStores] = useState([
    {
      id: 1,
      store_code: 'STR-HRE-01',
      name: 'Harare Main Flagship Store',
      address: '102 Sam Nujoma Street, Harare CBD',
      phone: '+263 242 700112',
      email: 'harare.main@ims-retail.co.zw',
      operating_hours: '08:00 - 18:00',
      status: 'ACTIVE',
      warehouses: [
        { id: 101, warehouse_code: 'WH-HRE-MAIN', name: 'Harare Central Warehouse (Aisle A-01..B-03)' }
      ],
      registers: [
        { id: 201, register_code: 'POS-HRE-01', name: 'Till 01 Main Counter', status: 'ACTIVE' },
        { id: 202, register_code: 'POS-HRE-02', name: 'Till 02 Express Checkout', status: 'CLOSED' }
      ]
    },
    {
      id: 2,
      store_code: 'STR-BYO-02',
      name: 'Bulawayo Commercial Branch #02',
      address: '45 Jason Moyo Street, Bulawayo',
      phone: '+263 292 884019',
      email: 'bulawayo@ims-retail.co.zw',
      operating_hours: '08:00 - 17:30',
      status: 'ACTIVE',
      warehouses: [
        { id: 102, warehouse_code: 'WH-BYO-01', name: 'Bulawayo Regional Warehouse' }
      ],
      registers: [
        { id: 203, register_code: 'POS-BYO-01', name: 'Till 01 Main', status: 'ACTIVE' }
      ]
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    store_code: 'STR-NEW-001',
    name: '',
    address: '',
    phone: '',
    email: '',
    operating_hours: '08:00 - 18:00'
  });

  const isAdmin = ['APP_ADMIN', 'SYSADMIN', 'ADMIN'].includes((currentRole || '').toUpperCase());

  const handleDeactivateStore = (storeId) => {
    setStores(prev => prev.map(st => {
      if (st.id === storeId) {
        return { ...st, status: st.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' };
      }
      return st;
    }));
    onShowToast?.('info', 'Branch Status Updated', 'Store status updated by Admin.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Store & Branch Operations
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            Physical store branches, warehouse allocations, and POS register terminals.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent)',
              color: '#fff',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Plus size={18} /> Add Branch
          </button>
        )}
      </div>

      {/* Store Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {stores.map(s => (
          <div key={s.id} style={{
            background: 'var(--color-paper-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-accent)'
                }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-ink)' }}>{s.name}</h3>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 600 }}>
                    {s.store_code}
                  </span>
                </div>
              </div>
              <span style={{
                fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '12px',
                background: s.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: s.status === 'ACTIVE' ? 'var(--color-signal-green)' : '#ef4444', fontWeight: 700
              }}>
                {s.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {s.address}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {s.phone}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {s.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Hours: {s.operating_hours}</div>
            </div>

            <div style={{
              borderTop: '1px solid var(--color-rule)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '0.75rem', fontFamily: 'var(--font-mono)'
            }}>
              <div><Warehouse size={12} style={{ display: 'inline', marginRight: '4px' }} /> Warehouses: <strong>{s.warehouses.length}</strong></div>
              <div><Store size={12} style={{ display: 'inline', marginRight: '4px' }} /> POS Tills: <strong>{s.registers.length}</strong></div>
              
              {isAdmin ? (
                <button
                  onClick={() => handleDeactivateStore(s.id)}
                  style={{ padding: '4px 8px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                >
                  {s.status === 'ACTIVE' ? 'Archive Branch' : 'Reactivate'}
                </button>
              ) : (
                <span style={{ fontSize: '10px', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>(Admin Protected)</span>
              )}
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
            padding: '24px', width: '480px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create New Branch Store</h3>
            <form onSubmit={handleCreateStore} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>STORE CODE</label>
                <input
                  type="text"
                  required
                  value={formData.store_code}
                  onChange={e => setFormData({ ...formData, store_code: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>STORE NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gweru Mall Branch"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>PHYSICAL ADDRESS</label>
                <input
                  type="text"
                  required
                  placeholder="12 Main Ave"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>PHONE</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>EMAIL</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
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
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
