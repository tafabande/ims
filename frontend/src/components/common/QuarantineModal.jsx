import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Lock, Trash2, X } from 'lucide-react';

/**
 * QuarantineModal Component:
 * Implements Progressive Disclosure and Confirmation Proportional to Damage.
 * High and Critical risk actions require typing the exact confirmation phrase
 * before unlocking the execution button.
 */
export default function QuarantineModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Quarantine Action Required",
  description = "You are about to perform a sensitive operation.",
  confirmationCode = "",
  severity = "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
  actionLabel = "Proceed Action",
  isLoading = false
}) {
  const [typedCode, setTypedCode] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  if (!isOpen) return null;

  const requiresTyping = severity === 'HIGH' || severity === 'CRITICAL';
  const isMatch = !requiresTyping || typedCode.trim() === confirmationCode.trim();

  const handleExecute = (e) => {
    e.preventDefault();
    if (!isMatch) return;
    onConfirm({ typedCode, passwordConfirm });
  };

  const getSeverityStyle = () => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          badgeColor: 'var(--color-signal-red)',
          icon: <ShieldAlert size={24} color="var(--color-signal-red)" />
        };
      case 'HIGH':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          badgeColor: 'var(--color-signal-amber)',
          icon: <AlertTriangle size={24} color="var(--color-signal-amber)" />
        };
      default:
        return {
          bg: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          badgeColor: 'var(--color-accent)',
          icon: <AlertTriangle size={24} color="var(--color-accent)" />
        };
    }
  };

  const style = getSeverityStyle();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'var(--color-paper-surface)',
        border: style.border,
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--elevation-3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              background: style.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {style.icon}
            </div>
            <div>
              <div style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                color: style.badgeColor,
                textTransform: 'uppercase'
              }}>
                SEVERITY: {severity} QUARANTINE
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-ink)', margin: '2px 0 0 0' }}>
                {title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', lineHeight: '1.45', marginBottom: '20px' }}>
          {description}
        </p>

        {/* Proportional Confirmation Challenge */}
        {requiresTyping && (
          <div style={{
            background: 'var(--color-paper-2)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
              Confirmation Required:
            </label>
            <p style={{ fontSize: '0.78125rem', color: 'var(--color-ink-muted)', marginBottom: '10px' }}>
              Type <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-signal-red)' }}>{confirmationCode}</strong> to unlock this action.
            </p>
            <input
              type="text"
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value)}
              placeholder={`Type "${confirmationCode}"`}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-rule)',
                background: 'var(--color-paper-surface)',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-rule)',
              background: 'transparent',
              color: 'var(--color-ink)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={!isMatch || isLoading}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: !isMatch ? 'var(--color-rule)' : severity === 'CRITICAL' ? 'var(--color-signal-red)' : 'var(--color-accent)',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: !isMatch || isLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isLoading ? 'Executing...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
