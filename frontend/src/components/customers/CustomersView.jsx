import React, { useState } from 'react';
import { Users, Plus, X, Download, Search } from 'lucide-react';

export default function CustomersView({ customers = [], onAddCustomer, onShowToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', contact_person: '', email: '', phone: '' });

  const safeCustomers = Array.isArray(customers) ? customers : [];

  const filteredCustomers = safeCustomers.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm) ||
    (c.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onAddCustomer) {
      onAddCustomer({
        ...formData,
        id: Date.now(),
        total_orders: 0,
        total_spent: 0.00
      });
    }
    if (onShowToast) onShowToast('success', 'Customer Added', `Registered ${formData.name} in CRM.`);
    setIsModalOpen(false);
    setFormData({ name: '', contact_person: '', email: '', phone: '' });
  };

  const exportCustomerCSV = () => {
    const headers = ["Customer Name", "Contact Person", "Email", "Phone", "Total Orders", "Total Spent"];
    const rows = safeCustomers.map(c => [
      `"${c.name || 'N/A'}"`,
      `"${c.contact_person || 'N/A'}"`,
      `"${c.email || 'N/A'}"`,
      `"${c.phone || 'N/A'}"`,
      c.total_orders || 0,
      (Number(c.total_spent) || 0).toFixed(2)
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ims_customer_directory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('info', 'Customers Exported', 'Downloaded customer records CSV.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
            Customer Directory & CRM Accounts
          </h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', margin: '4px 0 0 0', fontFamily: 'var(--font-mono)' }}>
            Track client purchase histories, total order volumes, and contact metadata.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={exportCustomerCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={15} /> Export Customers CSV
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> Add Customer
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Search size={18} color="var(--color-ink-muted)" />
        <input 
          type="text" 
          placeholder="Filter customers by name, email, contact person, or phone..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          style={{ 
            border: 'none', 
            outline: 'none', 
            background: 'transparent', 
            color: 'var(--color-ink)', 
            width: '100%', 
            fontSize: '13.5px' 
          }} 
        />
      </div>

      {/* Customers Table Panel */}
      <div className="hm-panel" style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)' }}>
        <div className="custom-table-container">
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--color-paper-2)', borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                <th style={{ padding: '12px 16px' }}>CUSTOMER NAME</th>
                <th style={{ padding: '12px 16px' }}>CONTACT PERSON</th>
                <th style={{ padding: '12px 16px' }}>EMAIL ADDRESS</th>
                <th style={{ padding: '12px 16px' }}>PHONE NUMBER</th>
                <th style={{ padding: '12px 16px' }}>TOTAL ORDERS</th>
                <th style={{ padding: '12px 16px' }}>TOTAL SPENT (USD)</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-ink-muted)' }}>
                    No customer records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => {
                  const ordersCount = c.total_orders ?? c.orders_count ?? 0;
                  const spentTotal = Number(c.total_spent ?? c.spent_total ?? 0);

                  return (
                    <tr key={c.id || Math.random()} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-ink)' }}>
                        {c.name || 'Unnamed Client'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-ink-muted)' }}>
                        {c.contact_person || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-accent)' }}>
                        {c.email || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                        {c.phone || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge badge-info" style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 700, fontSize: '11px' }}>
                          {ordersCount} Orders
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-signal-green)' }}>
                        ${spentTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '24px', maxWidth: '500px', borderRadius: 'var(--radius-md)', background: 'var(--color-paper-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>
                Register New Customer
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">Company / Client Name *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="input-label">Primary Contact Person</label>
                <input
                  type="text"
                  className="input-field"
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Customer Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
