import React, { useState } from 'react';
import { Store, Warehouse, Plus, Building2, MapPin, Phone, Mail, CheckCircle2, Clock } from 'lucide-react';

export default function StoresView({ onShowToast, currentRole }) {
  const [stores, setStores] = useState([
    {
      id: 1,
      store_code: 'STR-HRE-001',
      name: 'Harare Flagship Store',
      address: '100 Sam Nujoma Street, Harare',
      phone: '+263 77 123 4567',
      email: 'hre@ims.local',
      status: 'ACTIVE',
      operating_hours: '08:00 - 18:00',
      warehouses: [{ id: 1, warehouse_code: 'WH-HRE-001', name: 'Main Central Storage' }],
      registers: [{ id: 1, register_code: 'POS-HRE-001', name: 'Till 01', status: 'CLOSED' }]
    },
    {
      id: 2,
      store_code: 'STR-BYO-001',
      name: 'Bulawayo Branch',
      address: '45 Leopold Takawira Ave, Bulawayo',
      phone: '+263 77 987 6543',
      email: 'byo@ims.local',
      status: 'ACTIVE',
      operating_hours: '08:00 - 17:30',
      warehouses: [{ id: 2, warehouse_code: 'WH-BYO-001', name: 'Branch Warehouse' }],
      registers: [{ id: 2, register_code: 'POS-BYO-001', name: 'Till 01 - Express', status: 'CLOSED' }]
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

  const handleCreateStore = (e) => {
    e.preventDefault();
    const newStore = {
      id: Date.now(),
      ...formData,
      status: 'ACTIVE',
      warehouses: [{ id: Date.now() + 1, warehouse_code: `WH-${formData.store_code.replace('STR-', '')}-01`, name: `${formData.name} Warehouse` }],
      registers: [{ id: Date.now() + 2, register_code: `POS-${formData.store_code.replace('STR-', '')}-01`, name: 'Till 01 Main', status: 'CLOSED' }]
    };
    setStores([...stores, newStore]);
    setIsModalOpen(false);
    onShowToast?.('success', 'Store Created', `Branch '${newStore.name}' (${newStore.store_code}) registered.`);
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
        {currentRole === 'MANAGER' && (
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
                background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-signal-green)', fontWeight: 700
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
              borderTop: '1px solid var(--color-rule)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between',
              fontSize: '0.75rem', fontFamily: 'var(--font-mono)'
            }}>
              <div><Warehouse size={12} style={{ display: 'inline', marginRight: '4px' }} /> Warehouses: <strong>{s.warehouses.length}</strong></div>
              <div><Store size={12} style={{ display: 'inline', marginRight: '4px' }} /> POS Tills: <strong>{s.registers.length}</strong></div>
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
