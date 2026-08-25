import React, { useState } from 'react';
import { Users, Plus, X, Download } from 'lucide-react';

export default function CustomersView({ customers, onAddCustomer, onShowToast }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact_person: '', email: '', phone: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddCustomer({
      ...formData,
      id: Date.now(),
      total_orders: 0,
      total_spent: 0.00
    });
    if (onShowToast) onShowToast('success', 'Customer Added', `Registered ${formData.name} in CRM.`);
    setIsModalOpen(false);
    setFormData({ name: '', contact_person: '', email: '', phone: '' });
  };

  const exportCustomerCSV = () => {
    const headers = ["Customer Name", "Contact Person", "Email", "Phone", "Total Orders", "Total Spent"];
    const rows = customers.map(c => [
      `"${c.name}"`,
      `"${c.contact_person}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      c.total_orders,
      c.total_spent
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Customer Directory & Accounts</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            Track client purchase histories, total order volumes, and contact metadata.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={exportCustomerCSV}>
            <Download size={15} /> Export Customers CSV
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Customer
          </button>
        </div>
      </div>

      <div className="hm-panel" style={{ padding: '0px', overflow: 'hidden' }}>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td>{c.contact_person}</td>
                  <td>{c.email}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{c.phone}</td>
                  <td><span className="badge badge-info">{c.total_orders} Orders</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-signal-green)' }}>
                    ${c.total_spent.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Register New Customer</h3>
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
