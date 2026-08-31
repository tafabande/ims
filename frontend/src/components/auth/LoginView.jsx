import React, { useState, useEffect } from 'react';
import { Box, Lock, User, ArrowRight, AlertCircle, Loader, Mail } from 'lucide-react';
import { apiGet } from '../../utils/apiClient';
import { useAuth } from '../../utils/authStore';

/**
 * LoginView — Production Authentication Screen
 *
 * Security Rules Enforced:
 * - Role is determined EXCLUSIVELY by the server from credentials (no UI role selection)
 * - No dev presets, no hardcoded passwords, no role dropdowns
 * - Displays server-side error messages (wrong password, disabled account, etc.)
 * - Shows IT admin contact from system settings for account provisioning
 */
export default function LoginView({ onLoginSuccess }) {
  const { login, isLoading, error, clearError } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminContact, setAdminContact] = useState(null);

  // Fetch IT admin contact info (public endpoint, no auth required)
  useEffect(() => {
    apiGet('/api/settings/contact')
      .then((data) => setAdminContact(data))
      .catch(() => {}); // fail silently — login still works
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!usernameOrEmail.trim() || !password.trim()) return;

    const result = await login(usernameOrEmail.trim(), password);
    if (result.success) {
      onLoginSuccess(result.user);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-paper)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 28px',
          boxShadow: 'var(--elevation-2)',
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              marginBottom: '12px',
            }}
          >
            <Box size={24} />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Enterprise IMS
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
            Inventory &amp; Operations Management System
          </p>
        </div>

        {/* Server Error Message */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-signal-red)',
              fontSize: '0.8125rem',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Username or Email */}
          <div>
            <label className="input-label">Username or Email</label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                color="var(--color-ink-dim)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '36px' }}
                value={usernameOrEmail}
                onChange={(e) => { setUsernameOrEmail(e.target.value); clearError(); }}
                placeholder="Enter username or email"
                autoComplete="username"
                autoFocus
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="var(--color-ink-dim)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: '36px' }}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              marginTop: '8px',
              padding: '11px 16px',
              fontSize: '0.875rem',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Authenticating...
              </>
            ) : (
              <>
                Sign In to IMS <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* IT Admin Contact — shown for account provisioning requests */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-rule)',
            fontSize: '0.75rem',
            color: 'var(--color-ink-muted)',
          }}
        >
          {adminContact ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>Need access? Contact your IT Administrator:</span>
              <a
                href={`mailto:${adminContact.it_admin_email}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                }}
              >
                <Mail size={13} />
                {adminContact.it_admin_name
                  ? `${adminContact.it_admin_name} — ${adminContact.it_admin_email}`
                  : adminContact.it_admin_email}
              </a>
              {adminContact.it_admin_phone && (
                <span style={{ color: 'var(--color-ink-dim)', fontSize: '0.75rem' }}>
                  📞 {adminContact.it_admin_phone}
                </span>
              )}
            </div>
          ) : (
            <span>New account? Contact your System Administrator to provision access.</span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
