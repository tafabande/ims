import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Pause, 
  Square, 
  DollarSign, 
  ShieldCheck, 
  MapPin, 
  Monitor, 
  TrendingUp, 
  RotateCcw,
  ArrowRight,
  FileText
} from 'lucide-react';

export default function SessionTimelineView({ sessionId, sessionCode, onShowToast }) {
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState(null);

  useEffect(() => {
    // Simulated or Live API fetch for Session Event Audit Timeline
    const timer = setTimeout(() => {
      setTimelineData({
        session_id: sessionId || 1,
        session_code: sessionCode || 'WS-2026-0826-0041',
        operator: 'Tendai M. (Store Clerk)',
        location: 'Harare Store #01',
        terminal: 'POS-03',
        session_type: 'SALES',
        status: 'ACTIVE',
        opening_float: 200.00,
        total_sales: 1420.00,
        total_refunds: 80.00,
        expected_cash: 1540.00,
        timeline: [
          { id: 1, event_type: 'SESSION_STARTED', timestamp: '08:04:12', actor: 'Tendai M.', details: 'Started SALES work session on POS-03 with $200.00 opening float.' },
          { id: 2, event_type: 'SALE_CREATED', timestamp: '08:11:45', actor: 'Tendai M.', details: 'Processed Invoice SAL-2026-000184 ($1,479.99 Cash).' },
          { id: 3, event_type: 'REFUND_REQUESTED', timestamp: '08:32:04', actor: 'Tendai M.', details: 'Submitted refund escalation REF-2026-0042 ($80.00 packaging damage).' },
          { id: 4, event_type: 'ESCALATION_CREATED', timestamp: '08:32:10', actor: 'System Engine', details: 'Operational Case REF-2026-0042 routed to Manager Attention Center.' },
          { id: 5, event_type: 'REFUND_APPROVED', timestamp: '09:02:15', actor: 'Store Manager (Sarah M.)', details: 'Manager approved refund case REF-2026-0042. Ledger synced.' },
          { id: 6, event_type: 'SESSION_PAUSED', timestamp: '12:15:00', actor: 'Tendai M.', details: 'Session paused for scheduled operator lunch break.' },
          { id: 7, event_type: 'SESSION_RESUMED', timestamp: '13:00:10', actor: 'Tendai M.', details: 'Session resumed by operator on POS-03.' }
        ]
      });
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [sessionId, sessionCode]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
        <Clock className="animate-spin" size={24} style={{ marginBottom: '10px' }} />
        <div>Loading immutable session audit timeline...</div>
      </div>
    );
  }

  if (!timelineData) return null;

  return (
    <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
      
      {/* Session Audit Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-rule)' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'monospace' }}>
            IMMUTABLE SESSION AUDIT TIMELINE
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--color-ink)' }}>
            Work Session: {timelineData.session_code}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 800, fontFamily: 'monospace' }}>
            {timelineData.session_type}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontFamily: 'monospace' }}>
            {timelineData.status}
          </span>
        </div>
      </div>

      {/* Operational Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--color-paper-2)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>OPERATOR</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-ink)', marginTop: '2px' }}>{timelineData.operator}</div>
        </div>

        <div style={{ background: 'var(--color-paper-2)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>LOCATION / TERMINAL</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-ink)', marginTop: '2px' }}>{timelineData.location} ({timelineData.terminal})</div>
        </div>

        <div style={{ background: 'var(--color-paper-2)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>OPENING FLOAT</div>
          <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-ink)', marginTop: '2px' }}>${timelineData.opening_float.toFixed(2)}</div>
        </div>

        <div style={{ background: 'var(--color-paper-2)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 700 }}>EXPECTED CASH</div>
          <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-signal-green)', marginTop: '2px' }}>${timelineData.expected_cash.toFixed(2)}</div>
        </div>
      </div>

      {/* Event Audit Trail Steps */}
      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        <div style={{ position: 'absolute', left: '8px', top: '8px', bottom: '8px', width: '2px', background: 'var(--color-rule)' }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {timelineData.timeline.map((ev, index) => (
            <div key={index} style={{ position: 'relative', background: 'var(--color-paper-2)', padding: '14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
              
              {/* Event Marker Bullet */}
              <div style={{
                position: 'absolute',
                left: '-24px',
                top: '16px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: ev.event_type.includes('REFUND') || ev.event_type.includes('CLOSED') ? '#ef4444' : ev.event_type.includes('APPROVED') ? '#10b981' : 'var(--color-accent)',
                transform: 'translateX(-50%)',
                boxShadow: '0 0 0 4px var(--color-paper-surface)'
              }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    background: 'var(--color-paper)',
                    color: 'var(--color-accent)',
                    border: '1px solid var(--color-rule)'
                  }}>
                    {ev.event_type}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink)', marginLeft: '8px' }}>
                    {ev.actor}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> {ev.timestamp}
                </div>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--color-ink-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                {ev.details}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
