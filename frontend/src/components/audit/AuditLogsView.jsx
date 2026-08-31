import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Lock, 
  Download, 
  Search, 
  Clock, 
  User, 
  Globe, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Filter,
  List,
  GitCommit
} from 'lucide-react';
import { apiGet } from '../../utils/apiClient';

export default function AuditLogsView({ transactions, onShowToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'table'

  useEffect(() => {
    let isMounted = true;
    const fetchAuditLogs = async () => {
      try {
        const data = await apiGet('/audit/logs');
        if (isMounted && Array.isArray(data)) {
          setLogs(data);
        }
      } catch (err) {
        if (isMounted && onShowToast) {
          onShowToast('error', 'Audit Log Error', 'Failed to fetch security audit trail.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAuditLogs();
    return () => {
      isMounted = false;
    };
  }, [onShowToast]);

  const filteredLogs = logs.filter(evt => {
    const matchesSearch = 
      (evt.user || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (evt.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (evt.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (evt.ip || '').includes(searchTerm);
    
    const matchesStatus = selectedStatus === 'ALL' || evt.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const successCount = logs.filter(e => e.status === 'SUCCESS').length;
  const warnCount = logs.filter(e => e.status === 'WARN').length;
  const uniqueIps = new Set(logs.map(e => e.ip || '127.0.0.1')).size;

  const exportAuditCSV = () => {
    const headers = ["Event ID", "Operator", "Role", "Action", "IP Address", "Status", "Details", "Before/After Change", "Timestamp"];
    const rows = logs.map(evt => [
      evt.id,
      `"${evt.user || ''}"`,
      evt.role || 'STAFF',
      evt.action,
      evt.ip,
      evt.status,
      `"${evt.details || ''}"`,
      `"${evt.before_after || ''}"`,
      `"${evt.timestamp}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ims_security_audit_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Downloaded immutable security audit trail CSV.', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Audit Logs & Governance Dashboard</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            Immutable security event timeline monitoring access attempts, operator actions, and system integrity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn ${viewMode === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('timeline')}
          >
            <GitCommit size={15} /> Visual Timeline
          </button>
          <button 
            className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('table')}
          >
            <List size={15} /> Data Table View
          </button>
          <button className="btn btn-secondary" onClick={exportAuditCSV}>
            <Download size={15} /> Export Audit CSV
          </button>
        </div>
      </div>

      {/* Telemetry KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="hm-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '4px' }}>
            TOTAL AUDITED EVENTS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
            {logs.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', marginTop: '4px' }}>
            ● Append-only immutable log
          </div>
        </div>

        <div className="hm-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '4px' }}>
            SUCCESSFUL OPERATIONS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)' }}>
            {successCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-signal-green)', marginTop: '4px' }}>
            ✓ 100% Authorized RBAC
          </div>
        </div>

        <div className="hm-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '4px' }}>
            SECURITY WARNINGS / BLOCKS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-amber)' }}>
            {warnCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-signal-amber)', marginTop: '4px' }}>
            ⚠ Defensive validation blocked
          </div>
        </div>

        <div className="hm-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '4px' }}>
            MONITORED OPERATOR IP SUBNETS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-cyan)' }}>
            {uniqueIps}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', marginTop: '4px' }}>
            ● Internal LAN subnets
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="hm-panel" style={{ padding: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '36px' }}
            placeholder="Search by Operator, Action Verb, IP Address, or Details..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--color-ink-muted)" />
          <select
            className="input-field"
            style={{ width: '160px' }}
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Event Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="WARN">WARNING</option>
          </select>
        </div>
      </div>

      {/* Visual Timeline View */}
      {viewMode === 'timeline' && (
        <div className="hm-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            {/* Timeline Vertical Line */}
            <div style={{
              position: 'absolute',
              left: '19px',
              top: '10px',
              bottom: '10px',
              width: '2px',
              background: 'var(--color-rule-strong)'
            }} />

            {filteredLogs.map((evt) => {
              const isSuccess = evt.status === 'SUCCESS';
              const isWarn = evt.status === 'WARN';

              return (
                <div key={evt.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative' }}>
                  {/* Timeline Dot Icon */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isSuccess ? 'var(--color-paper-surface)' : 'var(--color-paper-surface)',
                    border: `2px solid ${isSuccess ? 'var(--color-signal-green)' : 'var(--color-signal-amber)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                    boxShadow: 'var(--elevation-1)'
                  }}>
                    {isSuccess ? (
                      <CheckCircle2 size={18} color="var(--color-signal-green)" />
                    ) : (
                      <AlertTriangle size={18} color="var(--color-signal-amber)" />
                    )}
                  </div>

                  {/* Event Content Card */}
                  <div className="hm-card" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-accent)' }}>
                          {evt.id}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{evt.user}</span>
                        <span className={`badge ${evt.role === 'ADMIN' ? 'badge-danger' : evt.role === 'MANAGER' ? 'badge-warning' : 'badge-info'}`}>
                          {evt.role}
                        </span>
                        <span className="badge badge-info">{evt.action}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Globe size={12} /> {evt.ip}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.875rem', color: 'var(--color-ink)', lineHeight: '1.4' }}>
                      {evt.details}
                    </div>

                    {evt.before_after && (
                      <div style={{
                        background: 'var(--color-paper-2)',
                        border: '1px solid var(--color-rule)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '6px 10px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--color-ink-muted)'
                      }}>
                        State Change: {evt.before_after}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Structured Table View */}
      {viewMode === 'table' && (
        <div className="hm-panel" style={{ padding: '0px', overflow: 'hidden' }}>
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Operator</th>
                  <th>Assigned Role</th>
                  <th>Action Verb</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Event Details</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(evt => (
                  <tr key={evt.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>{evt.id}</td>
                    <td style={{ fontWeight: 700 }}>{evt.user}</td>
                    <td>
                      <span className={`badge ${evt.role === 'ADMIN' ? 'badge-danger' : evt.role === 'MANAGER' ? 'badge-warning' : 'badge-info'}`}>
                        {evt.role}
                      </span>
                    </td>
                    <td><span className="badge badge-info">{evt.action}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>{evt.ip}</td>
                    <td>
                      <span className={`badge ${evt.status === 'SUCCESS' ? 'badge-success' : 'badge-warning'}`}>
                        {evt.status === 'SUCCESS' ? '● SUCCESS' : '⚠ WARN'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{evt.details}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-dim)' }}>
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
