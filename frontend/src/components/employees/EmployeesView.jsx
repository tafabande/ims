import React, { useState } from 'react';
import { Users, Search, Plus, Building2, UserCheck, UserX, Activity, Shield, Phone, Mail, Edit3, Lock } from 'lucide-react';

export default function EmployeesView({ onShowToast, currentRole }) {
  const [employees, setEmployees] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'activity' | 'account'
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: 'CASHIER',
    department: 'Sales & POS',
    store_name: 'Harare Flagship Store (STR-HRE-001)',
    has_user_account: false
  });

  const handleCreateEmployee = (e) => {
    e.preventDefault();
    const newEmp = {
      id: Date.now(),
      employee_code: `EMP-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      position: formData.position,
      department: formData.department,
      store_name: formData.store_name,
      manager_name: 'Bob Manager',
      status: 'ACTIVE',
      user_id: formData.has_user_account ? Date.now() + 1 : null,
      user_code: formData.has_user_account ? `USR-${Math.floor(1000 + Math.random() * 9000)}` : null,
      role: formData.has_user_account ? 'STAFF' : 'NO_ACCOUNT',
      activity: {
        total_sales_count: 0,
        total_sales_amount: 0.0,
        total_returns_count: 0,
        total_adjustments_count: 0,
        last_activity: 'Just Created'
      }
    };

    setEmployees([newEmp, ...employees]);
    setIsModalOpen(false);
    onShowToast?.('success', 'Employee Registered', `Employee '${newEmp.first_name} ${newEmp.last_name}' (${newEmp.employee_code}) created.`);
  };

  const handleToggleStatus = (id) => {
    setEmployees(employees.map(emp => {
      if (emp.id === id) {
        const nextStatus = emp.status === 'ACTIVE' ? 'TERMINATED' : 'ACTIVE';
        onShowToast?.('info', 'Status Updated', `Employee ${emp.employee_code} status set to ${nextStatus}. Historical sales remain attributed.`);
        return { ...emp, status: nextStatus };
      }
      return emp;
    }));
    if (selectedEmp && selectedEmp.id === id) {
      setSelectedEmp(prev => ({ ...prev, status: prev.status === 'ACTIVE' ? 'TERMINATED' : 'ACTIVE' }));
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const nameMatch = `${emp.first_name} ${emp.last_name} ${emp.employee_code}`.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === 'ALL' || emp.status === statusFilter;
    return nameMatch && statusMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            IMS Employee Directory & Workbench
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            Operational identity, store assignments, system user account linkages, and operational activity history.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer'
          }}
        >
          <Plus size={18} /> Add Employee
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '12px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '400px', background: 'var(--color-paper-2)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
          <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
          <input
            type="text"
            placeholder="Search by employee name or code (EMP-2026-XXXXX)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--color-ink)', width: '100%', outline: 'none', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>STATUS:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)', fontSize: '0.8125rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>
        </div>
      </div>

      {/* Table Grid */}
      <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
              <th style={{ padding: '10px' }}>EMPLOYEE NUMBER</th>
              <th style={{ padding: '10px' }}>NAME</th>
              <th style={{ padding: '10px' }}>POSITION</th>
              <th style={{ padding: '10px' }}>STORE ASSIGNMENT</th>
              <th style={{ padding: '10px' }}>USER ACCOUNT</th>
              <th style={{ padding: '10px' }}>STATUS</th>
              <th style={{ padding: '10px' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>
                  {emp.employee_code}
                </td>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {emp.first_name} {emp.last_name}
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-paper-2)', fontWeight: 700 }}>
                    {emp.position}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>{emp.store_name}</td>
                <td style={{ padding: '10px' }}>
                  {emp.user_id ? (
                    <span style={{ color: 'var(--color-signal-green)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                      <UserCheck size={14} /> Linked ({emp.user_code})
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-ink-dim)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                      <UserX size={14} /> No Login Account
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: '12px',
                    background: emp.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: emp.status === 'ACTIVE' ? 'var(--color-signal-green)' : '#ef4444', fontWeight: 800
                  }}>
                    {emp.status}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  <button
                    onClick={() => { setSelectedEmp(emp); setActiveTab('overview'); }}
                    style={{
                      padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px',
                      background: 'var(--color-paper-2)', color: 'var(--color-ink)', border: '1px solid var(--color-rule)', cursor: 'pointer'
                    }}
                  >
                    View Workbench
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employee Workbench Drawer */}
      {selectedEmp && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: 'var(--color-paper)',
          borderLeft: '1px solid var(--color-rule)', boxShadow: '-4px 0 20px rgba(0,0,0,0.3)', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 1000, overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-rule)', pb: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedEmp.first_name} {selectedEmp.last_name}</h3>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700 }}>
                {selectedEmp.employee_code}
              </span>
            </div>
            <button
              onClick={() => setSelectedEmp(null)}
              style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-rule)', background: 'transparent', color: 'var(--color-ink)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Drawer Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-paper-2)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', border: 'none',
                background: activeTab === 'overview' ? 'var(--color-accent)' : 'transparent',
                color: activeTab === 'overview' ? '#fff' : 'var(--color-ink-muted)', cursor: 'pointer'
              }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              style={{
                flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', border: 'none',
                background: activeTab === 'activity' ? 'var(--color-accent)' : 'transparent',
                color: activeTab === 'activity' ? '#fff' : 'var(--color-ink-muted)', cursor: 'pointer'
              }}
            >
              IMS Activity
            </button>
            <button
              onClick={() => setActiveTab('account')}
              style={{
                flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', border: 'none',
                background: activeTab === 'account' ? 'var(--color-accent)' : 'transparent',
                color: activeTab === 'account' ? '#fff' : 'var(--color-ink-muted)', cursor: 'pointer'
              }}
            >
              User Account
            </button>
          </div>

          {/* Overview Content */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
              <div><span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>POSITION</span><div style={{ fontWeight: 700 }}>{selectedEmp.position}</div></div>
              <div><span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>DEPARTMENT</span><div>{selectedEmp.department}</div></div>
              <div><span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>ASSIGNED STORE</span><div>{selectedEmp.store_name}</div></div>
              <div><span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>REPORTING MANAGER</span><div>{selectedEmp.manager_name}</div></div>
              <div><span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>EMAIL</span><div>{selectedEmp.email}</div></div>
              <div><span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>PHONE</span><div>{selectedEmp.phone}</div></div>

              <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => handleToggleStatus(selectedEmp.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
                    background: selectedEmp.status === 'ACTIVE' ? '#ef4444' : 'var(--color-signal-green)',
                    color: '#fff', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {selectedEmp.status === 'ACTIVE' ? 'Deactivate Employee (Soft)' : 'Reactivate Employee'}
                </button>
              </div>
            </div>
          )}

          {/* IMS Activity Content */}
          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>POS SALES PROCESSED</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-signal-green)' }}>
                  {selectedEmp.activity.total_sales_count} Transactions (${selectedEmp.activity.total_sales_amount.toFixed(2)})
                </div>
              </div>
              <div style={{ background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>RETURNS & REFUNDS APPROVED</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  {selectedEmp.activity.total_returns_count} Orders
                </div>
              </div>
              <div style={{ background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>STOCK ADJUSTMENTS LOGGED</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  {selectedEmp.activity.total_adjustments_count} Audit Ledger Events
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-dim)' }}>
                Last Operational Activity: {selectedEmp.activity.last_activity}
              </div>
            </div>
          )}

          {/* User Account Linkage Content */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedEmp.user_id ? (
                <div style={{ background: 'var(--color-paper-2)', padding: '16px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-signal-green)', fontWeight: 800 }}>
                    <Shield size={18} /> Linked System Account ({selectedEmp.user_code})
                  </div>
                  <div><span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>SYSTEM ROLE</span><div>{selectedEmp.role}</div></div>
                  <div><span style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', fontWeight: 700 }}>LOGIN USERNAME</span><div>{selectedEmp.email}</div></div>
                </div>
              ) : (
                <div style={{ background: 'var(--color-paper-2)', padding: '16px', borderRadius: 'var(--radius-sm)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <UserX size={32} style={{ color: 'var(--color-ink-dim)', margin: '0 auto' }} />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>No Login Account Linked</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>This employee record exists strictly as an operational identity without system login credentials.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Register New Employee</h3>
            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>FIRST NAME</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>LAST NAME</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>EMAIL</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>POSITION</label>
                  <select
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  >
                    <option value="CASHIER">Cashier</option>
                    <option value="SALES_ASSISTANT">Sales Assistant</option>
                    <option value="STORE_MANAGER">Store Manager</option>
                    <option value="WAREHOUSE_ASSISTANT">Warehouse Assistant</option>
                    <option value="STOCK_CONTROLLER">Stock Controller</option>
                    <option value="PROCUREMENT_OFFICER">Procurement Officer</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>PHONE</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="has_user_account"
                  checked={formData.has_user_account}
                  onChange={e => setFormData({ ...formData, has_user_account: e.target.checked })}
                />
                <label htmlFor="has_user_account" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Provision System Login User Account</label>
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
                  Register Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
