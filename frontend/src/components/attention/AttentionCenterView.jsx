import React, { useState } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Settings, 
  Clock, 
  User, 
  ArrowRight, 
  FileText, 
  ShieldAlert, 
  TrendingDown, 
  HelpCircle,
  X,
  Check,
  RotateCcw,
  Sliders,
  DollarSign,
  Package,
  Layers,
  Filter,
  CheckSquare,
  MessageSquare,
  Lock,
  Download,
  ShieldCheck,
  Send
} from 'lucide-react';
import { can } from '../../utils/permissions';

export default function AttentionCenterView({ onShowToast, currentRole = 'MANAGER', onNavigate }) {
  const [activeTab, setActiveTab] = useState('ACTION_REQUIRED'); // 'ACTION_REQUIRED' | 'IMPORTANT' | 'INFORMATIONAL' | 'RESOLVED' | 'HISTORY_BOARD' | 'SETTINGS'
  const [selectedAlertForExplanation, setSelectedAlertForExplanation] = useState(null);
  
  // Custom Modals State (No browser prompts!)
  const [decisionModalEntity, setDecisionModalEntity] = useState(null); // { item, decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' }
  const [decisionNote, setDecisionNote] = useState('');
  
  const [staffNoteModalEntity, setStaffNoteModalEntity] = useState(null);
  const [staffObservationNote, setStaffObservationNote] = useState('');

  const [exportConsentModal, setExportConsentModal] = useState(null); // { datasetName: string }
  const [exportReason, setExportReason] = useState('');

  const isManager = can(currentRole, 'attention.decide');

  // Notification items state with full lifecycle and staff notes
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      code: 'NOTIF-2026-0091',
      category: 'REFUND_APPROVAL',
      importance: 'ACTION_REQUIRED',
      title: 'Refund Approval Required: #REF-00042',
      summary: 'Customer ABC Traders requested $340.00 refund on receipt SAL-00182.',
      requester: 'Sales Clerk (EMP-00014)',
      timestamp: '2026-08-26T01:45:00Z',
      lifecycle: 'ACTION_REQUIRED', // CREATED | UNREAD | ACKNOWLEDGED | ACTION_REQUIRED | RESOLVED | CLOSED
      details: {
        customer: 'ABC Traders',
        amount: 340.00,
        receipt_id: 'SAL-00182',
        reason: 'Duplicate Transaction',
        note: 'Transaction was processed twice on POS Terminal 01 due to network timeout.',
        items: [
          { name: 'Dell XPS 15 Laptop', qty: 1, price: 340.00 }
        ]
      },
      whyExplanation: {
        trigger: 'Refund Amount Exceeds Staff Authorization Threshold ($100.00)',
        formula: 'Requested Refund ($340.00) > Staff Limit ($100.00) → Manager Approval Required',
        auditRef: 'AUD-REF-2026-0042',
        ledgerImpact: 'Pending $340.00 Debit to Cash Till & Stock Return to Warehouse Quarantine'
      },
      staffNotes: [
        { author: 'John M. (Floor Staff)', time: '01:50 UTC', note: 'Customer returned unit unopened in original box.' }
      ],
      historyTrail: [
        { time: '01:45 UTC', event: 'Ticket NOTIF-2026-0091 created by EMP-00014' }
      ]
    },
    {
      id: 2,
      code: 'NOTIF-2026-0088',
      category: 'STOCK_ADJUSTMENT',
      importance: 'ACTION_REQUIRED',
      title: 'Stock Write-off Approval: #ADJ-00041',
      summary: 'Warehouse Staff requested -2 unit stock write-off on SKU-000482 at Harare Main.',
      requester: 'Warehouse Staff (EMP-00031)',
      timestamp: '2026-08-26T01:30:00Z',
      lifecycle: 'ACTION_REQUIRED',
      details: {
        sku: 'SKU-000482',
        product_name: 'Samsung 55" Smart TV',
        warehouse: 'Harare Main Warehouse',
        quantity_change: -2,
        reason: 'Transit Damage',
        note: 'Screen cracked during unloader unloading at loading dock.'
      },
      whyExplanation: {
        trigger: 'Physical Stock Variance / Write-off Exception Threshold',
        formula: 'Write-off Value (2u × $450 = $900.00) > Auto-approve Threshold ($50.00)',
        auditRef: 'AUD-ADJ-2026-0041'
      },
      staffNotes: [
        { author: 'Peter K. (Warehouse Lead)', time: '01:35 UTC', note: 'Photos taken at dock and attached to shipment GRN.' }
      ],
      historyTrail: [
        { time: '01:30 UTC', event: 'Ticket NOTIF-2026-0088 created by EMP-00031' }
      ]
    },
    {
      id: 3,
      code: 'NOTIF-2026-0074',
      category: 'GOODS_RECEIVED_VARIANCE',
      importance: 'IMPORTANT',
      title: 'Goods Received Variance: PO-2026-00431',
      summary: 'Supplier XYZ Electronics delivered 96 units against 100 ordered (-4 unit variance).',
      requester: 'Receiving Operator (EMP-00022)',
      timestamp: '2026-08-26T01:10:00Z',
      lifecycle: 'IMPORTANT',
      details: {
        po_code: 'PO-2026-00431',
        supplier: 'XYZ Electronics',
        ordered_qty: 100,
        received_qty: 96,
        variance: -4,
        note: 'Supplier delivery note indicates 4 units backordered for delivery tomorrow.'
      },
      whyExplanation: {
        trigger: 'Supplier Receiving Variance Rule (> 2% shortage)',
        formula: 'Shortage (4 units = 4.0%) > Variance Tolerance (2.0%)',
        auditRef: 'AUD-GRN-2026-00431'
      },
      staffNotes: [],
      historyTrail: [
        { time: '01:10 UTC', event: 'Shortage recorded on GRN #882 by EMP-00022' }
      ]
    }
  ]);

  // Handle Staff Note Attachment
  const handleAddStaffNote = () => {
    if (!staffNoteModalEntity || !staffObservationNote.trim()) return;
    setNotifications(prev => prev.map(n => {
      if (n.id === staffNoteModalEntity.id) {
        return {
          ...n,
          staffNotes: [
            ...n.staffNotes,
            { author: `${currentRole} User`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), note: staffObservationNote }
          ],
          historyTrail: [
            ...n.historyTrail,
            { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: `Note attached by ${currentRole}: ${staffObservationNote}` }
          ]
        };
      }
      return n;
    }));
    if (onShowToast) onShowToast('info', 'Staff Observation Note Added', `Note attached to ticket #${staffNoteModalEntity.code}.`);
    setStaffNoteModalEntity(null);
    setStaffObservationNote('');
  };

  // Handle Manager Decision with Custom Modal & Mandatory Note
  const handleExecuteManagerDecision = () => {
    if (!decisionModalEntity || !decisionNote.trim()) {
      if (onShowToast) onShowToast('warning', 'Manager Justification Required', 'You must provide a manager decision note before confirming.');
      return;
    }

    const { item, decision } = decisionModalEntity;
    setNotifications(prev => prev.map(n => {
      if (n.id === item.id) {
        return {
          ...n,
          importance: 'RESOLVED',
          lifecycle: 'RESOLVED',
          title: `Resolved (${decision}): ${n.title}`,
          details: { ...n.details, managerDecision: decision, managerNote: decisionNote },
          historyTrail: [
            ...n.historyTrail,
            { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: `Manager Decision (${decision}) executed by ${currentRole}. Note: ${decisionNote}` }
          ]
        };
      }
      return n;
    }));

    if (onShowToast) {
      onShowToast('success', `Decision Executed (${decision})`, `Ticket #${item.code} resolved. Note logged in audit ledger.`);
    }

    setDecisionModalEntity(null);
    setDecisionNote('');
  };

  // Handle Ticket Closure
  const handleCloseTicket = (item) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === item.id) {
        return { ...n, lifecycle: 'CLOSED' };
      }
      return n;
    }));
    if (onShowToast) onShowToast('info', 'Ticket Closed', `Ticket #${item.code} moved to archived ledger.`);
  };

  // Handle Sensitive Data Export Consent
  const handleConfirmExport = () => {
    if (!exportReason.trim()) {
      if (onShowToast) onShowToast('warning', 'Export Reason Required', 'You must provide a business reason before exporting sensitive data.');
      return;
    }

    if (onShowToast) {
      onShowToast('success', 'Security Consent Authorized', `Export of ${exportConsentModal.datasetName} authorized by ${currentRole}. Security audit log logged.`);
    }
    setExportConsentModal(null);
    setExportReason('');
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'ACTION_REQUIRED') return n.importance === 'ACTION_REQUIRED' && n.lifecycle !== 'CLOSED';
    if (activeTab === 'IMPORTANT') return n.importance === 'IMPORTANT' && n.lifecycle !== 'CLOSED';
    if (activeTab === 'INFORMATIONAL') return n.importance === 'INFORMATIONAL' && n.lifecycle !== 'CLOSED';
    if (activeTab === 'RESOLVED') return n.importance === 'RESOLVED' && n.lifecycle !== 'CLOSED';
    if (activeTab === 'HISTORY_BOARD') return true;
    return true;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--color-rule)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                Operational Attention & Control Center
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
                {isManager ? 'Manager Decision & Approval Engine • Mandatory Note Authorizations' : 'View Problems & Submit Staff Observations'}
              </p>
            </div>
          </div>
        </div>

        {/* Sensitive Data Export Button */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setExportConsentModal({ datasetName: 'Customer & Financial Stock Ledger' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-xs)',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              color: 'var(--color-text)'
            }}
          >
            <Download size={16} /> Export Sensitive Ledger
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--color-rule)',
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'ACTION_REQUIRED', label: 'Requires Action', icon: AlertCircle },
          { id: 'IMPORTANT', label: 'Important Events', icon: AlertTriangle },
          { id: 'INFORMATIONAL', label: 'Informational', icon: Info },
          { id: 'RESOLVED', label: 'Resolved', icon: CheckCircle2 },
          { id: 'HISTORY_BOARD', label: 'Conversation & Ticket History Board', icon: MessageSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                background: 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: NOTIFICATIONS QUEUE */}
      {activeTab !== 'HISTORY_BOARD' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredNotifications.map(item => (
            <div
              key={item.id}
              style={{
                background: 'var(--color-paper)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-sm)',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', color: 'var(--color-accent)' }}>
                      TICKET ID: {item.code}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                      {item.title}
                    </h3>
                  </div>

                  <p style={{ fontSize: '13.5px', margin: '8px 0 0 0', color: 'var(--color-text)' }}>
                    {item.summary}
                  </p>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
                    Requested by <strong>{item.requester}</strong> • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Staff Notes Attached */}
                  {item.staffNotes.length > 0 && (
                    <div style={{ marginTop: '12px', padding: '10px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-accent)', marginBottom: '4px' }}>STAFF OBSERVATION NOTES:</div>
                      {item.staffNotes.map((sn, idx) => (
                        <div key={idx} style={{ fontSize: '12px', color: 'var(--color-text)' }}>
                          <strong>{sn.author} ({sn.time}):</strong> "{sn.note}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions: Manager Decisions vs Staff Note Attachment */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSelectedAlertForExplanation(item)}
                    style={{ padding: '7px 12px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Why Am I Seeing This?
                  </button>

                  <button
                    onClick={() => setStaffNoteModalEntity(item)}
                    style={{ padding: '7px 12px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <MessageSquare size={14} /> Attach Staff Note
                  </button>

                  {/* Manager Decision Buttons (Only shown if authorized) */}
                  {isManager && item.lifecycle !== 'RESOLVED' && (
                    <>
                      <button
                        onClick={() => setDecisionModalEntity({ item, decision: 'APPROVE' })}
                        style={{ padding: '7px 14px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setDecisionModalEntity({ item, decision: 'REQUEST_CHANGES' })}
                        style={{ padding: '7px 14px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Request Changes
                      </button>
                    </>
                  )}

                  {!isManager && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '6px' }}>
                      (View Only Mode — Manager decision required)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: HISTORY & TICKET CONVERSATION BOARD */}
      {activeTab === 'HISTORY_BOARD' && (
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Historical Message & Ticket Conversation Board</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Complete audit trail of all staff observations, manager decision notes, and ticket lifecycles.
          </p>

          <div style={{ display: 'grid', gap: '14px' }}>
            {notifications.map(ticket => (
              <div key={ticket.id} style={{ padding: '16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '800', color: 'var(--color-accent)', fontSize: '12px' }}>{ticket.code}</span>
                    <strong style={{ fontSize: '14px' }}>{ticket.title}</strong>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: ticket.lifecycle === 'RESOLVED' ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-paper)', border: '1px solid var(--color-rule)' }}>
                      {ticket.lifecycle}
                    </span>
                  </div>

                  {ticket.lifecycle !== 'CLOSED' && (
                    <button
                      onClick={() => handleCloseTicket(ticket)}
                      style={{ padding: '5px 10px', background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Close Ticket
                    </button>
                  )}
                </div>

                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  History Trail:
                  {ticket.historyTrail.map((h, i) => (
                    <div key={i} style={{ marginLeft: '12px', marginTop: '2px' }}>• [{h.time}] {h.event}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. CUSTOM MODAL: MANDATORY MANAGER DECISION NOTE (No generic window prompt!) */}
      {decisionModalEntity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', width: '500px', maxWidth: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                Manager Decision: {decisionModalEntity.decision}
              </h3>
              <button onClick={() => setDecisionModalEntity(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '14px' }}>
              Target Ticket: <strong>{decisionModalEntity.item.code}</strong> — {decisionModalEntity.item.title}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                Mandatory Manager Decision Note / Audit Justification:
              </label>
              <textarea
                value={decisionNote}
                onChange={e => setDecisionNote(e.target.value)}
                placeholder="Enter mandatory justification note for audit ledger..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-rule)',
                  background: 'var(--color-canvas)',
                  color: 'var(--color-text)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDecisionModalEntity(null)} style={{ padding: '9px 16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleExecuteManagerDecision} style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}>
                Confirm & Log Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CUSTOM MODAL: STAFF OBSERVATION NOTE */}
      {staffNoteModalEntity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', width: '480px', maxWidth: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                Attach Staff Observation Note
              </h3>
              <button onClick={() => setStaffNoteModalEntity(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '14px' }}>
              Target Ticket: <strong>{staffNoteModalEntity.code}</strong>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={staffObservationNote}
                onChange={e => setStaffObservationNote(e.target.value)}
                placeholder="e.g. Found 2 extra boxes under pallet 4 on Aisle A-02."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-rule)',
                  background: 'var(--color-canvas)',
                  color: 'var(--color-text)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setStaffNoteModalEntity(null)} style={{ padding: '9px 16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddStaffNote} style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}>Attach Note</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CUSTOM MODAL: SENSITIVE DATA EXPORT CONSENT */}
      {exportConsentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', width: '520px', maxWidth: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={22} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  Sensitive Data Export Consent Required
                </h3>
              </div>
              <button onClick={() => setExportConsentModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', padding: '12px', fontSize: '12.5px', marginBottom: '16px' }}>
              ⚠️ You are attempting to export sensitive dataset: <strong>{exportConsentModal.datasetName}</strong>. Every export is permanently logged with your user ID and IP address into the security compliance audit trail.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                Export Reason / Business Justification:
              </label>
              <textarea
                value={exportReason}
                onChange={e => setExportReason(e.target.value)}
                placeholder="e.g. Monthly external financial audit compliance export for Q3."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-rule)',
                  background: 'var(--color-canvas)',
                  color: 'var(--color-text)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setExportConsentModal(null)} style={{ padding: '9px 16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmExport} style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}>
                Authorize Export & Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHY EXPLANATION MODAL */}
      {selectedAlertForExplanation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', width: '580px', maxWidth: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-rule)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HelpCircle size={22} color="var(--color-accent)" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  Why Am I Seeing This?
                </h3>
              </div>
              <button onClick={() => setSelectedAlertForExplanation(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
              <div><strong>Trigger Rule:</strong> {selectedAlertForExplanation.whyExplanation.trigger}</div>
              <div style={{ marginTop: '8px', fontFamily: 'monospace', background: 'var(--color-canvas)', padding: '10px', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)' }}>
                {selectedAlertForExplanation.whyExplanation.formula}
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Audit Reference: {selectedAlertForExplanation.whyExplanation.auditRef}
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedAlertForExplanation(null)} style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '600', cursor: 'pointer' }}>
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
