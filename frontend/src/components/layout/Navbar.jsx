import React, { useState, useEffect } from 'react';
import { Bell, Sun, Moon, UserCircle, Command, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { apiGet, apiPost } from '../../utils/apiClient';

/**
 * Navbar — displays the real authenticated user's name, email, and role.
 * Role is shown as read-only (server-assigned from JWT) — no UI role switching.
 */
export default function Navbar({
  currentUser,
  theme,
  toggleTheme,
  lowStockCount,
  onOpenCommandPalette,
  onNavigateToLowStock,
  onLogout,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);

  useEffect(() => {
    apiGet('/api/notifications')
      .then(res => {
        if (Array.isArray(res)) setNotificationsList(res);
      })
      .catch(() => {});
  }, []);

  const unreadCount = notificationsList.filter(n => !n.read_at).length;
  const displayName = currentUser?.fullName || currentUser?.full_name || 'User';
  const displayEmail = currentUser?.email || '';
  const displayRole = currentUser?.role || 'STAFF';
  const userCode = currentUser?.userCode || currentUser?.user_code || '';

  const handleMarkAllRead = () => {
    apiPost('/notifications/read-all', {})
      .then(() => {
        setNotificationsList(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      })
      .catch(() => {});
  };

  return (
    <header
      style={{
        height: '60px',
        background: 'var(--color-paper)',
        borderBottom: '1px solid var(--color-rule)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: Global Command Search */}
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
            minWidth: '230px',
          }}
        >
          <Command size={15} color="var(--color-accent)" />
          <span style={{ flex: 1, textAlign: 'left' }}>Search system operations...</span>
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-dim)' }}>
            Ctrl+K
          </span>
        </button>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Central Notification Bell Indicator & Drawer */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
            style={{
              background: 'var(--color-paper-2)',
              border: unreadCount > 0 ? '1px solid var(--color-accent)' : '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              color: 'var(--color-ink)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              boxShadow: unreadCount > 0 ? 'var(--elevation-warm)' : 'none'
            }}
            title="System Operational Notifications"
          >
            <Bell size={16} color={unreadCount > 0 ? 'var(--color-accent)' : 'var(--color-ink-muted)'} />
            {unreadCount > 0 && (
              <span style={{ background: 'var(--color-accent)', color: '#1c1917', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 800 }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotificationsMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '340px',
                background: 'var(--color-paper)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '12px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--color-rule)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}>
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {notificationsList.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', padding: '12px', textAlign: 'center' }}>
                    No notifications right now.
                  </div>
                ) : (
                  notificationsList.map(n => (
                    <div
                      key={n.id}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-xs)',
                        background: n.read_at ? 'var(--color-paper-2)' : 'var(--color-accent-subtle)',
                        borderLeft: n.read_at ? '2px solid transparent' : '2px solid var(--color-accent)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                        {n.read_at ? '○' : '●'} {n.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
            alignItems: 'center',
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun size={16} color="var(--color-ink-muted)" />
          ) : (
            <Moon size={16} color="var(--color-accent)" />
          )}
        </button>

        {/* User Profile Menu */}
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
              fontWeight: 600,
            }}
          >
            <UserCircle size={18} color="var(--color-accent)" />
            <span>{displayName.split(' ')[0]}</span>
            <span
              style={{
                fontSize: '0.68rem',
                color: 'var(--color-ink-muted)',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
              }}
            >
              [{displayRole}]
            </span>
            <ChevronDown size={14} color="var(--color-ink-muted)" />
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '110%',
                background: 'var(--color-paper)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                padding: '12px',
                minWidth: '240px',
                zIndex: 100,
              }}
              onMouseLeave={() => setShowProfileMenu(false)}
            >
              {/* User Info */}
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-ink)' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginBottom: '4px' }}>
                {displayEmail}
              </div>
              {userCode && (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-dim)', marginBottom: '4px' }}>
                  {userCode}
                </div>
              )}

              {/* Role Badge (read-only — server assigned) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  background: 'var(--color-canvas)',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  marginBottom: '12px',
                  border: '1px solid var(--color-rule)',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                }}
              >
                <ShieldCheck size={12} />
                {displayRole.toUpperCase()}
                <span style={{ color: 'var(--color-ink-dim)', fontWeight: 400, marginLeft: 'auto' }}>
                  server-assigned
                </span>
              </div>

              {/* Sign Out */}
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
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
                  justifyContent: 'center',
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
