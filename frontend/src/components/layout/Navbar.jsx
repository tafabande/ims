import React, { useState } from 'react';
import { 
  Bell, 
  Sun, 
  Moon, 
  UserCircle, 
  Command,
  LogOut,
  ChevronDown
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header style={{
      height: '60px',
      background: 'var(--color-paper)',
      borderBottom: '1px solid var(--color-rule)',
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
            border: '1px solid var(--color-rule)',
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
        {lowStockCount > 0 && (
          <button 
            onClick={onNavigateToLowStock}
            style={{
              background: 'var(--color-paper-2)',
              border: '1px solid var(--color-rule)',
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
            <Bell size={16} color="var(--color-accent)" />
            <span className="badge badge-warning" style={{ padding: '1px 6px', borderRadius: '4px' }}>
              {lowStockCount} LOW
            </span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--color-paper-2)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            padding: '7px 10px',
            color: 'var(--color-ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={16} color="var(--color-ink-muted)" /> : <Moon size={16} color="var(--color-accent)" />}
        </button>

        {/* User Account & Role Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              background: 'var(--color-paper-2)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: 'var(--color-ink)',
              fontSize: '0.8125rem',
              fontWeight: 600
            }}
          >
            <UserCircle size={18} color="var(--color-accent)" />
            <span>Taa</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', textTransform: 'uppercase' }}>
              ({currentRole || 'MANAGER'})
            </span>
            <ChevronDown size={14} color="var(--color-ink-muted)" />
          </button>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '110%',
              background: 'var(--color-paper)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              padding: '12px',
              minWidth: '200px',
              zIndex: 100
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Taa Administrator</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginBottom: '8px' }}>
                taa@company.com
              </div>
              <div style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                background: 'var(--color-canvas)',
                padding: '4px 8px',
                borderRadius: '4px',
                marginBottom: '12px',
                border: '1px solid var(--color-rule)'
              }}>
                Role: {(currentRole || 'MANAGER').toUpperCase()}
              </div>

              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center'
                }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
