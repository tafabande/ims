import React from 'react';
import { 
  ShieldCheck, 
  Bell, 
  Sun, 
  Moon, 
  UserCircle, 
  Command,
  LogOut
} from 'lucide-react';

export default function Navbar({ 
  currentRole, 
  setCurrentRole, 
  theme, 
  toggleTheme, 
  lowStockCount, 
  onOpenCommandPalette,
  onNavigateToLowStock,
  onLogout 
}) {
  return (
    <header style={{
      height: '60px',
      background: 'var(--color-paper)',
      borderBottom: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Left: Command Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onOpenCommandPalette}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--color-paper-2)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '7px 14px',
            color: 'var(--color-ink-muted)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            minWidth: '230px'
          }}
        >
          <Command size={15} color="var(--color-accent)" />
          <span style={{ flex: 1, textAlign: 'left' }}>Search system operations...</span>
        </button>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Low Stock Alert Bell */}
        <button 
          onClick={onNavigateToLowStock}
          style={{
            background: 'var(--color-paper-2)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            color: 'var(--color-ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8125rem',
            fontWeight: 600
          }}
          title="View Low Stock Alerts"
        >
          <Bell size={16} color={lowStockCount > 0 ? 'var(--color-signal-amber)' : 'var(--color-ink-muted)'} />
          {lowStockCount > 0 ? (
            <span className="badge badge-warning" style={{ padding: '1px 6px', borderRadius: '4px' }}>
              {lowStockCount} LOW
            </span>
          ) : (
            <span style={{ color: 'var(--color-signal-green)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>HEALTHY</span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--color-paper-2)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '7px',
            color: 'var(--color-ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={16} color="var(--color-signal-amber)" /> : <Moon size={16} color="var(--color-accent)" />}
        </button>

        {/* Role Selector Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--color-accent-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px'
        }}>
          <ShieldCheck size={14} color="var(--color-accent)" />
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-accent)',
              fontWeight: 700,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="APP_ADMIN" style={{ background: 'var(--color-paper-surface)', color: 'var(--color-ink)' }}>ROLE: APP ADMIN</option>
            <option value="SYSADMIN" style={{ background: 'var(--color-paper-surface)', color: 'var(--color-ink)' }}>ROLE: SYSADMIN</option>
            <option value="MANAGER" style={{ background: 'var(--color-paper-surface)', color: 'var(--color-ink)' }}>ROLE: MANAGER</option>
            <option value="STAFF" style={{ background: 'var(--color-paper-surface)', color: 'var(--color-ink)' }}>ROLE: STAFF</option>
            <option value="AUDITOR" style={{ background: 'var(--color-paper-surface)', color: 'var(--color-ink)' }}>ROLE: AUDITOR</option>
          </select>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            color: 'var(--color-signal-red)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: '4px'
          }}
          title="Sign Out of IMS"
        >
          <LogOut size={15} /> Logout
        </button>
      </div>
    </header>
  );
}
