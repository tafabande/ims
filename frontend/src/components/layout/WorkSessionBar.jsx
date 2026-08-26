import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  DollarSign, 
  MapPin, 
  Monitor, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  Layers,
  RotateCcw
} from 'lucide-react';

export default function WorkSessionBar({ 
  currentRole = 'MANAGER', 
  activeSession, 
  onStartSession, 
  onPauseSession, 
  onResumeSession, 
  onOpenCloseModal,
  onShowToast 
}) {
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [sessionType, setSessionType] = useState('SALES');
  const [locationName, setLocationName] = useState('Harare Store #01');
  const [deviceId, setDeviceId] = useState('POS-01');
  const [openingFloat, setOpeningFloat] = useState(200.00);

  const handleStartSubmit = (e) => {
    e.preventDefault();
    onStartSession({
      session_type: sessionType,
      location_name: locationName,
      device_id: deviceId,
      opening_float: parseFloat(openingFloat) || 0
    });
    setIsStartModalOpen(false);
    if (onShowToast) onShowToast('success', 'Work Session Started', `Started ${sessionType} session on ${deviceId}.`);
  };

  return (
    <div style={{
      background: 'var(--color-paper-2)',
      borderBottom: '1px solid var(--color-rule)',
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justify: 'space-between',
      fontSize: '12px',
      flexWrap: 'wrap',
      gap: '10px'
    }}>
      
      {/* Layer B: Operational Work Context Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} /> WORK CONTEXT:
        </span>

        {activeSession ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={13} color="var(--color-ink-muted)" />
              <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{activeSession.location_name}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Monitor size={13} color="var(--color-ink-muted)" />
              <span style={{ fontFamily: 'monospace', color: 'var(--color-ink-muted)' }}>{activeSession.device_id}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                fontWeight: 800,
                fontSize: '10.5px'
              }}>
                SESSION: {activeSession.session_type}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {activeSession.status === 'ACTIVE' ? (
                <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span> ACTIVE
                </span>
              ) : (
                <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 800, fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Pause size={11} /> PAUSED
                </span>
              )}
            </div>

            <div style={{ color: 'var(--color-ink-muted)', fontFamily: 'monospace' }}>
              Float: <strong>${(activeSession.opening_float || 0).toFixed(2)}</strong> • Expected Cash: <strong style={{ color: 'var(--color-signal-green)' }}>${(activeSession.expected_closing || activeSession.opening_float || 0).toFixed(2)}</strong>
            </div>
          </>
        ) : (
          <span style={{ color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
            No operational work session currently open. Click "Start Work Session" to initiate job tracking.
          </span>
        )}
      </div>

      {/* Session Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {activeSession ? (
          <>
            {activeSession.status === 'ACTIVE' ? (
              <button 
                onClick={onPauseSession} 
                className="btn btn-secondary" 
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Pause size={13} color="#f59e0b" /> Pause Session
              </button>
            ) : (
              <button 
                onClick={onResumeSession} 
                className="btn btn-primary" 
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Play size={13} /> Resume Session
              </button>
            )}

            <button 
              onClick={onOpenCloseModal} 
              className="btn btn-secondary" 
              style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', borderColor: '#ef4444', color: '#ef4444' }}
            >
              <Square size={12} fill="#ef4444" /> Close Session & Cash Reconcile
            </button>
          </>
        ) : (
          <button 
            onClick={() => setIsStartModalOpen(true)} 
            className="btn btn-primary" 
            style={{ fontSize: '11.5px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Play size={13} /> Start Operational Work Session
          </button>
        )}
      </div>

      {/* Modal: Start Operational Work Session */}
      {isStartModalOpen && (
        <div className="modal-overlay" onClick={() => setIsStartModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px', background: 'var(--color-paper-surface)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 14px 0', color: 'var(--color-ink)' }}>
              Start Operational Work Session
            </h3>

            <form onSubmit={handleStartSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">Select Session Type / Workflow *</label>
                <select className="input-field" value={sessionType} onChange={e => setSessionType(e.target.value)}>
                  <option value="SALES">SALES (Front-Desk Cashier & POS)</option>
                  <option value="GOODS_RECEIVING">GOODS RECEIVING (Warehouse GRN & POs)</option>
                  <option value="STOCK_COUNT">STOCK COUNT (Physical Stocktake Audit)</option>
                  <option value="STOCK_TRANSFER">STOCK TRANSFER (Inter-Store Dispatch)</option>
                  <option value="DISPATCH">DISPATCH (Outbound Freight Shipment)</option>
                  <option value="RETURN_PROCESSING">RETURN PROCESSING (Customer Claims)</option>
                </select>
              </div>

              <div>
                <label className="input-label">Work Location / Store Branch *</label>
                <input type="text" className="input-field" value={locationName} onChange={e => setLocationName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Terminal / Device ID *</label>
                  <input type="text" className="input-field font-mono" value={deviceId} onChange={e => setDeviceId(e.target.value)} required />
                </div>

                <div>
                  <label className="input-label">Opening Float ($ USD) *</label>
                  <input type="number" step="0.01" className="input-field font-mono" value={openingFloat} onChange={e => setOpeningFloat(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsStartModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Launch Work Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
