import React, { useState } from 'react';
import { 
  UserCog, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Monitor, 
  Smartphone, 
  Trash2, 
  Key, 
  UserX, 
  UserCheck,
  Briefcase,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export default function UsersView({ users: initialUsers, currentRole, onShowToast }) {
  const [activeTab, setActiveTab] = useState('rbac'); // 'rbac' or 'raci'
  const [operatorUsers, setOperatorUsers] = useState(initialUsers || [
    { id: 1, name: "Alice Admin", email: "admin@ims.local", role: "ADMIN", department: "Executive", active: true },
    { id: 2, name: "Bob Manager", email: "manager@ims.local", role: "MANAGER", department: "Warehouse A", active: true },
    { id: 3, name: "Charlie Staff", email: "staff@ims.local", role: "STAFF", department: "POS Terminal", active: true }
  ]);

  const [sessions, setSessions] = useState([
    {
      session_id: "SESS-9001",
      user: "Alice Admin",
      role: "ADMIN",
      device: "Chrome on Windows 11 (Desktop)",
      ip: "192.168.1.105",
      created: "2026-08-25 08:00",
      expires: "2026-09-01 08:00 (7d)",
      active: true
    },
    {
      session_id: "SESS-9002",
      user: "Bob Manager",
      role: "MANAGER",
      device: "Safari on macOS (MacBook Pro)",
      ip: "192.168.1.112",
      created: "2026-08-25 09:15",
      expires: "2026-09-01 09:15 (7d)",
      active: true
    },
    {
      session_id: "SESS-9003",
      user: "Charlie Staff",
      role: "STAFF",
      device: "Edge on Windows 10 (POS Terminal)",
      ip: "192.168.1.120",
      created: "2026-08-25 09:10",
      expires: "2026-09-01 09:10 (7d)",
      active: true
    }
  ]);

  const handleRevokeSession = (sessionId) => {
    setSessions(prev => prev.map(s => s.session_id === sessionId ? { ...s, active: false } : s));
    if (onShowToast) onShowToast(`Server Session ${sessionId} revoked successfully.`, 'warning');
  };

  const handleToggleUserStatus = (userId) => {
    setOperatorUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextState = !u.active;
        if (onShowToast) onShowToast(nextState ? `Enabled Operator ${u.name}` : `Disabled Operator ${u.name} (Preserved audit trail)`, nextState ? 'success' : 'warning');
        return { ...u, active: nextState };
      }
      return u;
    }));
  };

  const permissionsMatrix = [
    { module: 'View products', admin: true, manager: true, staff: true },
    { module: 'Create products', admin: true, manager: true, staff: false },
    { module: 'Edit products', admin: true, manager: true, staff: false },
    { module: 'Delete products', admin: true, manager: false, staff: false },
    { module: 'View inventory stock', admin: true, manager: true, staff: true },
    { module: 'Adjust stock (In/Out)', admin: true, manager: true, staff: false },
    { module: 'Receive stock', admin: true, manager: true, staff: true },
    { module: 'Process / Complete sale', admin: true, manager: true, staff: true },
    { module: 'Manage employees', admin: true, manager: false, staff: false },
    { module: 'Manage system users', admin: true, manager: false, staff: false },
    { module: 'View audit logs', admin: true, manager: true, staff: false },
    { module: 'Manage system settings', admin: true, manager: false, staff: false },
  ];

  const raciMatrix = [
    { activity: 'Create users & assign roles', admin: 'R / A', manager: 'I', staff: 'I', it: 'C', dba: 'I' },
    { activity: 'Manage products & pricing', admin: 'A', manager: 'R', staff: 'C', it: 'I', dba: 'I' },
    { activity: 'Receive stock shipments', admin: 'A', manager: 'R', staff: 'R', it: 'I', dba: 'I' },
    { activity: 'Stock quantity adjustment', admin: 'A', manager: 'R', staff: 'C', it: 'I', dba: 'C' },
    { activity: 'Database backup & WAL recovery', admin: 'I', manager: 'I', staff: 'I', it: 'C', dba: 'R / A' },
    { activity: 'System deployment & CI/CD', admin: 'A', manager: 'I', staff: 'I', it: 'R', dba: 'C' },
    { activity: 'Security & network config', admin: 'A', manager: 'C', staff: 'I', it: 'R', dba: 'C' },
    { activity: 'Audit review & compliance', admin: 'A', manager: 'R', staff: 'I', it: 'C', dba: 'C' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>User & Security Access Control</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            JWT Access Tokens (15m) • Hashed Sessions (7d) • Operational RACI & Technical RBAC Matrix
          </p>
        </div>
      </div>

      {/* Active Device Sessions Panel */}
      <div className="hm-panel" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={16} color="var(--color-accent)" /> Server-Side Active Refresh Sessions & Devices
          </div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-signal-cyan)' }}>
            JWT 15m ACCESS / 7d REFRESH HASH
          </span>
        </div>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Operator</th>
                <th>Device & User-Agent</th>
                <th>IP Address</th>
                <th>Session Expiry</th>
                <th>State</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.session_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>{s.session_id}</td>
                  <td style={{ fontWeight: 700 }}>{s.user}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Monitor size={14} color="var(--color-ink-muted)" /> {s.device}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{s.ip}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-dim)' }}>{s.expires}</td>
                  <td>
                    {s.active ? (
                      <span className="badge badge-success">● Active</span>
                    ) : (
                      <span className="badge badge-danger">Revoked</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {s.active && (
                      <button
                        onClick={() => handleRevokeSession(s.session_id)}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--color-signal-red)', borderColor: 'var(--color-signal-red)' }}
                      >
                        <Trash2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> Revoke Session
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Table */}
      <div className="hm-panel" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-rule)', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          Registered Operators & Soft-Deletion Lifecycle
        </div>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Operator Name</th>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Department</th>
                <th>User Status</th>
                <th style={{ textAlign: 'right' }}>Operator Actions</th>
              </tr>
            </thead>
            <tbody>
              {operatorUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>#{u.id}</td>
                  <td style={{ fontWeight: 700 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${
                      u.role === 'ADMIN' ? 'badge-danger' :
                      u.role === 'MANAGER' ? 'badge-warning' : 'badge-info'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>{u.department}</td>
                  <td>
                    {u.active ? (
                      <span className="badge badge-success">● Active User</span>
                    ) : (
                      <span className="badge badge-danger">Disabled User</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {u.active ? (
                      <button
                        onClick={() => handleToggleUserStatus(u.id)}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--color-signal-red)', borderColor: 'var(--color-signal-red)' }}
                      >
                        <UserX size={13} style={{ display: 'inline', marginRight: '4px' }} /> Disable User
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleUserStatus(u.id)}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--color-signal-green)', borderColor: 'var(--color-signal-green)' }}
                      >
                        <UserCheck size={13} style={{ display: 'inline', marginRight: '4px' }} /> Enable User
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Governance & Matrix Panel */}
      <div className="hm-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--color-accent)" /> Governance & Access Matrices
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
              Operational business ownership vs technical system software permissions
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`btn ${activeTab === 'rbac' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('rbac')}
            >
              <Lock size={14} /> Software RBAC Matrix
            </button>
            <button 
              className={`btn ${activeTab === 'raci' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('raci')}
            >
              <Briefcase size={14} /> Operational RACI Matrix
            </button>
          </div>
        </div>

        {/* RBAC Matrix */}
        {activeTab === 'rbac' && (
          <div>
            <div style={{ marginBottom: '12px', fontSize: '0.8rem', color: 'var(--color-ink-muted)', background: 'var(--color-paper-2)', padding: '10px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
              <strong>RBAC (Role-Based Access Control)</strong> defines what actions operators are technically allowed to execute within the IMS application software.
            </div>
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Permission / Module Action</th>
                    <th style={{ textAlign: 'center' }}>Admin</th>
                    <th style={{ textAlign: 'center' }}>Manager</th>
                    <th style={{ textAlign: 'center' }}>Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionsMatrix.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.module}</td>
                      <td style={{ textAlign: 'center' }}>
                        {item.admin ? <CheckCircle2 size={18} color="var(--color-signal-green)" style={{ display: 'inline' }} /> : <Lock size={16} color="var(--color-signal-red)" style={{ display: 'inline' }} />}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.manager ? <CheckCircle2 size={18} color="var(--color-signal-green)" style={{ display: 'inline' }} /> : <Lock size={16} color="var(--color-signal-red)" style={{ display: 'inline' }} />}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.staff ? <CheckCircle2 size={18} color="var(--color-signal-green)" style={{ display: 'inline' }} /> : <Lock size={16} color="var(--color-signal-red)" style={{ display: 'inline' }} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RACI Matrix */}
        {activeTab === 'raci' && (
          <div>
            <div style={{ marginBottom: '12px', fontSize: '0.8rem', color: 'var(--color-ink-muted)', background: 'var(--color-paper-2)', padding: '10px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
              <strong>RACI (Responsible, Accountable, Consulted, Informed)</strong> maps business & project management roles to organizational responsibilities.
            </div>
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Activity / Task</th>
                    <th style={{ textAlign: 'center' }}>Admin</th>
                    <th style={{ textAlign: 'center' }}>Inventory Manager</th>
                    <th style={{ textAlign: 'center' }}>Warehouse Staff</th>
                    <th style={{ textAlign: 'center' }}>IT Lead</th>
                    <th style={{ textAlign: 'center' }}>DBA</th>
                  </tr>
                </thead>
                <tbody>
                  {raciMatrix.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.activity}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.admin.includes('R') ? 'var(--color-signal-green)' : 'var(--color-accent)' }}>
                        {item.admin}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.manager.includes('R') ? 'var(--color-signal-green)' : 'var(--color-accent)' }}>
                        {item.manager}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.staff.includes('R') ? 'var(--color-signal-green)' : 'var(--color-ink-muted)' }}>
                        {item.staff}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.it.includes('R') ? 'var(--color-signal-green)' : 'var(--color-ink-muted)' }}>
                        {item.it}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.dba.includes('R') ? 'var(--color-signal-green)' : 'var(--color-ink-muted)' }}>
                        {item.dba}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
