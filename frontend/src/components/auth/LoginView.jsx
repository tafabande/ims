import React, { useState } from 'react';
import { Box, Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STAFF');
  const [error, setError] = useState('');

  const fillDevPreset = (presetRole, devUser) => {
    setUsername(devUser);
    setPassword('SecurePass123!');
    setRole(presetRole);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your credentials to authenticate.');
      return;
    }
    setError('');
    onLogin(role, username);
  };


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-paper)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--color-paper-2)',
        border: '1px solid var(--color-rule)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 28px',
        boxShadow: 'var(--elevation-2)'
      }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            marginBottom: '12px'
          }}>
            <Box size={24} />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Enterprise IMS
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
            Inventory & Operations Management System
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-signal-red)',
            fontSize: '0.8125rem',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="input-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--color-ink-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '36px' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--color-ink-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: '36px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">Access Role</label>
            <div style={{ position: 'relative' }}>
              <ShieldCheck size={16} color="var(--color-ink-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <select
                className="input-field"
                style={{ paddingLeft: '36px', cursor: 'pointer' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="APP_ADMIN">Application Administrator (IAM, Security & Config)</option>
                <option value="SYSADMIN">System Administrator (Infrastructure & Server Ops)</option>
                <option value="MANAGER">Store Manager (Store & Operations Scope)</option>
                <option value="STAFF">Staff (POS Counter & Cash Till)</option>
                <option value="AUDITOR">Auditor (Read-Only Compliance Oversight)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '8px', padding: '11px 16px', fontSize: '0.875rem', width: '100%' }}
          >
            Sign In to IMS <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-rule)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
          New account? Contact your System Administrator to provision access.
        </div>
      </div>
    </div>
  );
}

