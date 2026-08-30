import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Bell, 
  Clock, 
  Building2, 
  DollarSign, 
  AlertTriangle, 
  Save, 
  RefreshCw,
  CheckCircle2,
  Lock,
  Megaphone,
  Layers,
  FileText
} from 'lucide-react';
import { apiGet, apiPost } from '../../utils/apiClient';
import { ROLE_PERMISSIONS } from '../../utils/permissions';

export default function OperationsControlCenterView({ currentUser, onShowToast }) {
  const [activeSubTab, setActiveSubTab] = useState('workflows'); // 'workflows' | 'permissions' | 'escalations' | 'notifications' | 'sessions' | 'announcements'
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for role permission overrides preview
  const [roleMatrix, setRoleMatrix] = useState(ROLE_PERMISSIONS);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/settings');
      const map = {};
      if (Array.isArray(data)) {
        data.forEach((s) => {
          map[s.key] = s.value;
        });
      }
      setSettings(map);
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Configuration Error', 'Failed to fetch operational configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await apiPost('/settings/bulk', settings);
      if (onShowToast) onShowToast('success', 'Operations Control Updated', 'Configuration settings saved successfully.');
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Save Failed', err.message || 'Failed to update configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle permission in role matrix
  const handleTogglePermission = (role, perm) => {
    setRoleMatrix((prev) => {
      const currentList = prev[role] || [];
      const updated = currentList.includes(perm)
        ? currentList.filter((p) => p !== perm)
        : [...currentList, perm];
      return { ...prev, [role]: updated };
    });
  };

  const allCapabilities = [
    { code: 'users.manage', label: 'User & Account Management' },
    { code: 'roles.manage', label: 'Role & Permission Controls' },
    { code: 'system.config', label: 'System & Workflow Config' },
    { code: 'attention.view', label: 'View Operational Cases' },
    { code: 'attention.decide', label: 'Approve / Reject Cases' },
    { code: 'sales.create', label: 'Process POS Sales' },
    { code: 'sales.refund', label: 'Request Customer Refund' },
    { code: 'sales.refund.approve', label: 'Approve High Refund' },
    { code: 'purchases.approve', label: 'Approve Purchase Orders' },
    { code: 'inventory.adjust', label: 'Adjust Stock Quantity' },
    { code: 'inventory.receive', label: 'Receive Delivered Goods' },
    { code: 'integrity.view', label: 'Forensic & Integrity Engine' },
    { code: 'audit.view', label: 'Security & Audit Logs' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Page Header (Quiet Zone) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '4px' }}>
            ADMINISTRATION & GOVERNANCE
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Operations Control Center
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Operational parameters, approval workflows, dynamic policies, and role permission controls.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchSettings}
            disabled={loading || saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh Config
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveSettings}
            disabled={loading || saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-rule)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'workflows', label: 'Workflows & Approvals', icon: Sliders },
          { id: 'permissions', label: 'Roles & Permissions', icon: ShieldCheck },
          { id: 'escalations', label: 'Escalation Rules', icon: Clock },
          { id: 'notifications', label: 'Notification Rules', icon: Bell },
          { id: 'sessions', label: 'Work Sessions & Cash', icon: DollarSign },
          { id: 'announcements', label: 'System Announcements', icon: Megaphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'var(--color-paper-2)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: WORKFLOWS & APPROVAL RULES */}
      {activeSubTab === 'workflows' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Sliders size={18} color="var(--color-accent)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Refund Approval Thresholds</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                  Manager Refund Limit ($)
                </label>
                <input 
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  value={settings['sales.refund_approval_threshold'] || '100.0'}
                  onChange={(e) => handleInputChange('sales.refund_approval_threshold', e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', display: 'block', marginTop: '4px' }}>
                  Refund requests exceeding this value require explicit Store Manager sign-off.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                  Counter Staff Max Discount (%)
                </label>
                <input 
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  value={settings['sales.max_staff_discount'] || '2.0'}
                  onChange={(e) => handleInputChange('sales.max_staff_discount', e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                  Store Manager Max Discount (%)
                </label>
                <input 
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  value={settings['sales.max_manager_discount'] || '5.0'}
                  onChange={(e) => handleInputChange('sales.max_manager_discount', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Building2 size={18} color="var(--color-accent)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Procurement & Inventory Rules</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                  Purchase Order High-Risk Limit ($)
                </label>
                <input 
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  value={settings['purchases.approval_threshold'] || '500.0'}
                  onChange={(e) => handleInputChange('purchases.approval_threshold', e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', display: 'block', marginTop: '4px' }}>
                  Purchase orders above this limit require multi-level managerial authorization.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                  Minimum Profit Margin Floor (%)
                </label>
                <input 
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  value={settings['pricing.minimum_margin'] || '10.0'}
                  onChange={(e) => handleInputChange('pricing.minimum_margin', e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                  Default Low Stock Reorder Threshold (Units)
                </label>
                <input 
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  value={settings['inventory.low_stock_threshold'] || '5'}
                  onChange={(e) => handleInputChange('inventory.low_stock_threshold', e.target.value)}
                />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT 2: ROLES & PERMISSIONS MATRIX */}
      {activeSubTab === 'permissions' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px', overflowX: 'auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Role Capabilities Matrix</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
              Permissions determine what action buttons and pages users are allowed to access across the frontend and backend API.
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-rule)', background: 'var(--color-paper-2)' }}>
                <th style={{ padding: '10px 12px' }}>Capability / Permission</th>
                {['MANAGER', 'WAREHOUSE', 'STAFF', 'APP_ADMIN', 'AUDITOR'].map((role) => (
                  <th key={role} style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allCapabilities.map((cap) => (
                <tr key={cap.code} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{cap.label}</div>
                    <code style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>{cap.code}</code>
                  </td>
                  {['MANAGER', 'WAREHOUSE', 'STAFF', 'APP_ADMIN', 'AUDITOR'].map((role) => {
                    const isChecked = (roleMatrix[role] || []).includes(cap.code);
                    return (
                      <td key={role} style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(role, cap.code)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT 3: ESCALATION RULES */}
      {activeSubTab === 'escalations' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Clock size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Automated Escalation Rules</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                Unreviewed Case Auto-Escalation Window (Hours)
              </label>
              <input 
                type="number"
                className="input"
                style={{ width: '100%' }}
                value={settings['escalation.auto_escalate_hours'] || '24'}
                onChange={(e) => handleInputChange('escalation.auto_escalate_hours', e.target.value)}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', display: 'block', marginTop: '4px' }}>
                Cases left unresolved past this window will automatically escalate to executive management.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: NOTIFICATION RULES */}
      {activeSubTab === 'notifications' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Bell size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Restrained Notification & Quiet Mode</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-xs)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>Enforce Restrained Quiet Mode</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                  Replaces screaming red badge bubbles with subtle soft borders around menu items needing attention.
                </div>
              </div>
              <input 
                type="checkbox"
                checked={settings['notifications.quiet_mode'] === 'true' || settings['notifications.quiet_mode'] === true}
                onChange={(e) => handleInputChange('notifications.quiet_mode', e.target.checked ? 'true' : 'false')}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: WORK SESSIONS & CASH */}
      {activeSubTab === 'sessions' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <DollarSign size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Work Sessions & Till Float Policies</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                Default Till Register Float ($)
              </label>
              <input 
                type="number"
                className="input"
                style={{ width: '100%' }}
                value={settings['work_session.default_float'] || '150.0'}
                onChange={(e) => handleInputChange('work_session.default_float', e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                JWT Session Timeout Duration (Seconds)
              </label>
              <input 
                type="number"
                className="input"
                style={{ width: '100%' }}
                value={settings['security.session_timeout'] || '900'}
                onChange={(e) => handleInputChange('security.session_timeout', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: SYSTEM ANNOUNCEMENTS */}
      {activeSubTab === 'announcements' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px', maxWidth: '700px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Megaphone size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Global Operations Announcement Banner</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-xs)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>Enable Announcement Header</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>Displays broadcast notice banner across top of all user screens.</div>
              </div>
              <input 
                type="checkbox"
                checked={settings['announcement.enabled'] === 'true' || settings['announcement.enabled'] === true}
                onChange={(e) => handleInputChange('announcement.enabled', e.target.checked ? 'true' : 'false')}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                Announcement Text
              </label>
              <textarea 
                className="input"
                rows={3}
                style={{ width: '100%', fontFamily: 'sans-serif' }}
                value={settings['announcement.text'] || ''}
                onChange={(e) => handleInputChange('announcement.text', e.target.value)}
                placeholder="Enter operational notice for logged-in staff..."
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
