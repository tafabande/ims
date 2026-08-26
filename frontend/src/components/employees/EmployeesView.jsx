import React, { useState } from 'react';
import { Users, Search, Plus, Building2, UserCheck, UserX, Activity, Shield, Phone, Mail, Edit3, Lock, FileText, AlertCircle, X } from 'lucide-react';
import { can } from '../../utils/permissions';

export default function EmployeesView({ onShowToast, currentRole = 'MANAGER' }) {
  const [employees, setEmployees] = useState([
    {
      id: 1,
      employee_code: 'EMP-2026-00014',
      first_name: 'John',
      last_name: 'Moyo',
      email: 'john.moyo@ims.co.zw',
      phone: '+263 77 123 4567',
      position: 'Senior Cashier',
      department: 'Sales & POS',
      store_name: 'Harare Flagship Store',
      status: 'ACTIVE', // ACTIVE | SUSPENDED | ON_LEAVE | RETIRED | TERMINATED | DECEASED
      status_note: 'Active staff member in good standing.',
      vital_info_note: 'Special Exemption: Authorized for cash Till drawer overrides up to $500.00. Medical: Diabetic (Emergency contact: Spouse +263 77 999 8888).'
    },
    {
      id: 2,
      employee_code: 'EMP-2026-00022',
      first_name: 'Sarah',
      last_name: 'Jenkins',
      email: 'sarah.j@ims.co.zw',
      phone: '+263 71 987 6543',
      position: 'Receiving Operator',
      department: 'Warehouse & Logistics',
      store_name: 'Harare Main Warehouse',
      status: 'ON_LEAVE',
      status_note: 'Annual leave from 20 Aug to 30 Aug 2026.',
      vital_info_note: 'Forklift License Certified (Exp: Dec 2027). Shift Lead Supervisor privileges.'
    },
    {
      id: 3,
      employee_code: 'EMP-2026-00031',
      first_name: 'Peter',
      last_name: 'Khumalo',
      email: 'peter.k@ims.co.zw',
      phone: '+263 78 444 3322',
      position: 'Warehouse Lead',
      department: 'Warehouse & Logistics',
      store_name: 'Bulawayo Branch #02',
      status: 'SUSPENDED',
      status_note: 'Pending audit investigation regarding loading dock variance EXC-2026-0041.',
      vital_info_note: 'Suspended pending investigation. System user login disabled.'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Status Change Modal
  const [statusModalEmp, setStatusModalEmp] = useState(null);
  const [newStatus, setNewStatus] = useState('SUSPENDED');
  const [statusAuditNote, setStatusAuditNote] = useState('');

  // Vital Info Note Modal
  const [vitalModalEmp, setVitalModalEmp] = useState(null);
  const [vitalInfoNoteText, setVitalInfoNoteText] = useState('');

  const isManager = can(currentRole, 'attention.decide');

  const handleUpdateStatus = () => {
    if (!statusAuditNote.trim()) {
      if (onShowToast) onShowToast('warning', 'Audit Note Required', 'You must provide a justification note for status change.');
      return;
    }

    setEmployees(prev => prev.map(emp => {
      if (emp.id === statusModalEmp.id) {
        return {
          ...emp,
          status: newStatus,
          status_note: statusAuditNote
        };
      }
      return emp;
    }));

    if (onShowToast) onShowToast('info', 'Status Updated', `Employee ${statusModalEmp.employee_code} status set to ${newStatus}. Note logged.`);
    setStatusModalEmp(null);
    setStatusAuditNote('');
  };

  const handleSaveVitalInfo = () => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === vitalModalEmp.id) {
        return {
          ...emp,
          vital_info_note: vitalInfoNoteText
        };
      }
      return emp;
    }));

    if (onShowToast) onShowToast('success', 'Vital Info Pinned', `Vital Information note updated for ${vitalModalEmp.employee_code}.`);
    setVitalModalEmp(null);
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
            IMS Employee HR Directory & Vital Notes
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
            HR Account Statuses (Active, Suspended, Leave, Retired, Terminated, Deceased) & Pinned Vital Information.
          </p>
        </div>
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
            placeholder="Search by employee name or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--color-ink)', width: '100%', outline: 'none', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)' }}>HR STATUS:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)', fontSize: '0.8125rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="ON_LEAVE">ON_LEAVE</option>
            <option value="RETIRED">RETIRED</option>
            <option value="TERMINATED">TERMINATED</option>
            <option value="DECEASED">DECEASED</option>
          </select>
        </div>
      </div>

      {/* Employee List with Pinned Vital Notes */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredEmployees.map(emp => (
          <div key={emp.id} style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-paper-2)', color: 'var(--color-accent)' }}>
                    {emp.employee_code}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    {emp.first_name} {emp.last_name}
                  </h3>
                  <span style={{
                    fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px',
                    background: emp.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : emp.status === 'SUSPENDED' ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-paper-2)',
                    color: emp.status === 'ACTIVE' ? '#10b981' : emp.status === 'SUSPENDED' ? '#ef4444' : 'var(--color-ink-muted)'
                  }}>
                    {emp.status}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--color-ink-muted)', marginTop: '6px' }}>
                  {emp.position} • {emp.department} • 📍 {emp.store_name}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                  📞 {emp.phone} • ✉️ {emp.email}
                </div>

                {/* PINNED VITAL INFO CARD AT A GLANCE */}
                <div style={{ marginTop: '12px', background: 'var(--color-paper-2)', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-xs)', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                      📌 VITAL INFORMATION AT A GLANCE (EXEMPTIONS / CONDITIONS / PRIVILEGES)
                    </span>
                    {isManager && (
                      <button
                        onClick={() => {
                          setVitalModalEmp(emp);
                          setVitalInfoNoteText(emp.vital_info_note);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                      >
                        Edit Note
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-ink)', lineHeight: 1.5 }}>
                    {emp.vital_info_note || 'No vital notes pinned.'}
                  </div>
                </div>

                {emp.status_note && (
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                    Status Reason: "{emp.status_note}"
                  </div>
                )}
              </div>

              {/* Status Update Button */}
              {isManager && (
                <button
                  onClick={() => {
                    setStatusModalEmp(emp);
                    setNewStatus(emp.status);
                  }}
                  style={{ padding: '7px 14px', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Change HR Status
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* HR STATUS CHANGE MODAL */}
      {statusModalEmp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', width: '480px', maxWidth: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Change Employee HR Status</h3>
              <button onClick={() => setStatusModalEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '14px' }}>
              Employee: <strong>{statusModalEmp.first_name} {statusModalEmp.last_name} ({statusModalEmp.employee_code})</strong>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>SELECT NEW HR STATUS</label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px', fontWeight: '700' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="ON_LEAVE">ON_LEAVE</option>
                <option value="RETIRED">RETIRED</option>
                <option value="TERMINATED">TERMINATED</option>
                <option value="DECEASED">DECEASED</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>MANDATORY JUSTIFICATION NOTE</label>
              <textarea
                value={statusAuditNote}
                onChange={e => setStatusAuditNote(e.target.value)}
                placeholder="State audit justification for status change..."
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setStatusModalEmp(null)} style={{ padding: '9px 16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpdateStatus} style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}>Save HR Status</button>
            </div>
          </div>
        </div>
      )}

      {/* VITAL INFO NOTE MODAL */}
      {vitalModalEmp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', width: '520px', maxWidth: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Edit Vital Information Pinned Note</h3>
              <button onClick={() => setVitalModalEmp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                VITAL INFORMATION AT A GLANCE (EXEMPTIONS / CONDITIONS / PRIVILEGES):
              </label>
              <textarea
                value={vitalInfoNoteText}
                onChange={e => setVitalInfoNoteText(e.target.value)}
                placeholder="e.g. Special Exemptions, Cash Handling Limits, Medical Conditions, Emergency Contacts..."
                rows={4}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setVitalModalEmp(null)} style={{ padding: '9px 16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveVitalInfo} style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}>Save Vital Note</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
