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

        {/* Authenticated Server Role Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--color-accent-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 10px',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <ShieldCheck size={14} color="var(--color-accent)" />
          <span style={{
            color: 'var(--color-accent)',
            fontWeight: 700,
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.5px'
          }}>
            ROLE: {currentRole ? currentRole.toUpperCase() : 'USER'}
          </span>
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
