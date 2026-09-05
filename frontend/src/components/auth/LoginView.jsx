import React, { useState, useEffect } from 'react';
import { Box, Lock, User, ArrowRight, AlertCircle, Loader, Mail, ShieldCheck, Key } from 'lucide-react';
import { apiGet } from '../../utils/apiClient';
import { useAuth } from '../../utils/authStore';

/**
 * LoginView — Production Authentication & First-Time Enterprise Setup Screen
 *
 * Behavior:
 * - Automatically checks /api/auth/status on load.
 * - If NO enterprise data or user accounts exist (uninitialized deployment):
 *   Renders the First-Time Enterprise Setup screen to bootstrap the Root Administrator
 *   requiring a mandatory one-time server bootstrap token instead of an unauthenticated form.
 * - If enterprise accounts exist:
 *   Renders the standard enterprise authentication screen.
 */
export default function LoginView({ onLoginSuccess }) {
  const { login, initializeRootAdmin, isLoading, error, clearError } = useAuth();
  
  // System Initialization State
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(true);
  const [installationId, setInstallationId] = useState(null);

  // Standard Login Form State
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminContact, setAdminContact] = useState(null);

  // First-Time Setup Form State
  const [fullName, setFullName] = useState('System Administrator');
  const [initEmail, setInitEmail] = useState('admin@ims.co.zw');
  const [initPassword, setInitPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [validationError, setValidationError] = useState('');

  // Check system status on mount
  useEffect(() => {
    apiGet('/api/auth/status')
      .then((data) => {
        setIsInitialized(Boolean(data.is_initialized));
        setInstallationId(data.installation_id);
      })
      .catch(() => {
        // Fallback to regular login if status endpoint fails
        setIsInitialized(true);
      })
      .finally(() => {
        setIsStatusLoading(false);
      });

    // Fetch IT admin contact info
    apiGet('/api/settings/contact')
      .then((data) => setAdminContact(data))
      .catch(() => {});
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!usernameOrEmail.trim() || !password.trim()) return;

    const result = await login(usernameOrEmail.trim(), password);
    if (result.success) {
      onLoginSuccess(result.user);
    }
  };

  const handleInitSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (!fullName.trim() || !initEmail.trim() || !initPassword.trim() || !bootstrapToken.trim()) {
      setValidationError('Please complete all required fields, including the one-time bootstrap token.');
      return;
    }

    if (initPassword.length < 15) {
      setValidationError('Password/passphrase must be at least 15 characters (NIST SP 800-63B standard).');
      return;
    }

    if (initPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    const result = await initializeRootAdmin(fullName.trim(), initEmail.trim(), initPassword, bootstrapToken.trim());
    if (result.success) {
      onLoginSuccess(result.user);
    }
  };

  if (isStatusLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-paper)',
          gap: '12px',
        }}
      >
        <Loader size={28} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', fontWeight: 600 }}>
          Connecting to IMS Enterprise Gateway...
        </p>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: FIRST-TIME ENTERPRISE SETUP (REQUIRES BOOTSTRAP SECRET)
  // =========================================================================
  if (!isInitialized) {
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
            maxWidth: '540px',
            background: 'var(--color-paper-2)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 32px',
            boxShadow: 'var(--elevation-3)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1c1917',
                marginBottom: '14px',
                boxShadow: 'var(--elevation-warm)',
              }}
            >
              <Box size={24} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
              Enterprise IMS Onboarding
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
              Initial System Deployment &amp; Administrator Bootstrap
            </p>
            {installationId && (
              <div style={{ marginTop: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    background: 'var(--color-paper-surface)',
                    border: '1px solid var(--color-rule)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--color-accent)',
                  }}
                >
                  Installation ID: {installationId}
                </span>
              </div>
            )}
          </div>

          {/* Prominent One-Time Authorization Notice */}
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--color-accent-subtle)',
              border: '1px solid var(--color-rule-strong)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <ShieldCheck size={20} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8125rem', lineHeight: '1.45', color: 'var(--color-ink-dim)' }}>
              <strong style={{ color: 'var(--color-ink)', display: 'block', marginBottom: '3px', fontSize: '0.875rem' }}>
                One-Time Deployment Authorization Required
              </strong>
              Enter the one-time <strong>Bootstrap Token</strong> (configured via <code style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>BOOTSTRAP_SECRET</code> or stored in the server's <code style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>.bootstrap_token</code> file) to initialize the primary Root Administrator.
            </div>
          </div>

          {/* Validation or Server Error Message */}
          {(validationError || error) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-signal-red)',
                fontSize: '0.8125rem',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{validationError || error}</span>
            </div>
          )}

          {/* Root Admin Bootstrap Form */}
          <form onSubmit={handleInitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="input-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>One-Time Bootstrap Authorization Token *</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} color="var(--color-accent)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '36px', fontFamily: 'monospace' }}
                  value={bootstrapToken}
                  onChange={(e) => { setBootstrapToken(e.target.value); setValidationError(''); }}
                  placeholder="Paste server one-time bootstrap secret"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="input-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Root Administrator Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--color-ink-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setValidationError(''); }}
                  placeholder="e.g. System Administrator"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="input-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Root Administrator Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--color-ink-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                  value={initEmail}
                  onChange={(e) => { setInitEmail(e.target.value); setValidationError(''); }}
                  placeholder="admin@enterprise.co.zw"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Root Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--color-ink-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    className="input-field"
                    style={{ paddingLeft: '36px' }}
                    value={initPassword}
                    onChange={(e) => { setInitPassword(e.target.value); setValidationError(''); }}
                    placeholder="Min 15 chars (passphrase recommended)"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--color-ink-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    className="input-field"
                    style={{ paddingLeft: '36px' }}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setValidationError(''); }}
                    placeholder="Re-enter password"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                marginTop: '10px',
                padding: '12px 18px',
                fontSize: '0.875rem',
                fontWeight: 700,
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
                  <Loader size={16} className="animate-spin" />
                  Verifying Token &amp; Bootstrapping...
                </>
              ) : (
                <>
                  Authorize &amp; Initialize Root Administrator <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Architecture info footer */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '14px',
              borderTop: '1px solid var(--color-rule)',
              fontSize: '0.75rem',
              color: 'var(--color-ink-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>IMS Zero-Trust Installation Boundary</span>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Secure Bootstrap Protocol</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: STANDARD ENTERPRISE LOGIN SCREEN (INITIALIZED)
  // =========================================================================
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

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                <Loader size={16} className="animate-spin" />
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
    </div>
  );
}
