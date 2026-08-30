import React, { useState } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Clock, 
  User, 
  ArrowRight, 
  FileText, 
  ShieldAlert, 
  X, 
  Check, 
  RotateCcw, 
  Sliders, 
  DollarSign, 
  Package, 
  Layers, 
  Filter, 
  MessageSquare, 
  Lock, 
  Download, 
  ShieldCheck, 
  Send, 
  Plus,
  HelpCircle,
  AlertOctagon,
  XCircle,
  FileCheck,
  TrendingUp
} from 'lucide-react';
import { can } from '../../utils/permissions';
import { apiGet } from '../../utils/apiClient';

export default function AttentionCenterView({ onShowToast, currentRole = 'MANAGER', onNavigate }) {
  // Case Filtering & Search State
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'REFUND_REQUEST' | 'RECEIVING_DISCREPANCY' | 'FLOAT_VARIANCE' | 'STOCK_ADJUSTMENT' | 'SYSTEM_ERROR' | 'PRICE_OVERRIDE'
  const [statusTab, setStatusTab] = useState('PENDING'); // 'PENDING' | 'INVESTIGATING' | 'RESOLVED'
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Case Modal State
  const [selectedCase, setSelectedCase] = useState(null);
  const [decisionType, setDecisionType] = useState('APPROVED'); // 'APPROVED' | 'DENIED' | 'CONTESTED' | 'RETURNED' | 'ESCALATED'
  const [decisionComment, setDecisionComment] = useState('');

  // Unified Operational Cases Master Dataset
  const [cases, setCases] = useState([
    {
      id: 1,
      case_number: 'REF-2026-0042',
      case_type: 'REFUND_REQUEST',
      status: 'PENDING_REVIEW', // PENDING_REVIEW, UNDER_INVESTIGATION, APPROVED, DENIED, CONTESTED, RETURNED
      priority: 'HIGH',
      subject: 'Customer Refund Request: SAL-00182 ($340.00)',
      description: 'Customer ABC Traders requested $340.00 refund on receipt SAL-00182 due to damaged packaging discovered upon unboxing.',
      created_by: 'Tendai M. (EMP-00014)',
      assigned_to_role: 'MANAGER',
      entity_type: 'REFUND',
      entity_id: 'INV-004281',
      amount: 340.00,
      evidence: {
        customer_name: 'ABC Traders',
        item_name: 'Dell XPS 15 Workstation Laptop',
        original_sale_amount: 340.00,
        refund_reason: 'Damaged item upon delivery',
        attached_files: ['Receipt_SAL00182.pdf', 'Photo_BoxDamage.jpg']
      },
      created_at: '2026-08-26T04:12:00Z',
      events: [
        { id: 101, event_type: 'CREATED', performed_by: 'Tendai M. (EMP-00014)', old_status: null, new_status: 'DRAFT', comment: 'Draft refund request created at POS terminal', created_at: '2026-08-26T04:12:00Z' },
        { id: 102, event_type: 'SUBMITTED', performed_by: 'Tendai M. (EMP-00014)', old_status: 'DRAFT', new_status: 'PENDING_REVIEW', comment: 'Submitted for Store Manager approval', created_at: '2026-08-26T04:13:00Z' }
      ]
    },
    {
      id: 2,
      case_number: 'DISC-2026-0087',
      case_type: 'RECEIVING_DISCREPANCY',
      status: 'PENDING_REVIEW',
      priority: 'HIGH',
      subject: 'Goods Receiving Discrepancy: PO-00431 (-2u Missing)',
      description: 'XYZ Electronics delivery for PO-00431: 100 ordered, 96 accepted, 2 rejected (damaged), 2 unaccounted for.',
      created_by: 'Farai W. (EMP-00031)',
      assigned_to_role: 'MANAGER',
      entity_type: 'PURCHASE_ORDER',
      entity_id: 'PO-00431',
      amount: 230.00,
      evidence: {
        po_number: 'PO-00431',
        supplier_name: 'XYZ Electronics',
        ordered_qty: 100,
        accepted_qty: 96,
        rejected_qty: 2,
        missing_qty: 2,
        attached_files: ['DeliveryNote_GRN882.pdf']
      },
      created_at: '2026-08-26T03:45:00Z',
      events: [
        { id: 103, event_type: 'SUBMITTED', performed_by: 'Farai W. (EMP-00031)', old_status: null, new_status: 'PENDING_REVIEW', comment: 'Receiving variance calculated during warehouse count', created_at: '2026-08-26T03:45:00Z' }
      ]
    },
    {
      id: 3,
      case_number: 'FV-2026-0021',
      case_type: 'FLOAT_VARIANCE',
      status: 'PENDING_REVIEW',
      priority: 'NORMAL',
      subject: 'End-of-Shift Cash Float Variance: -$13.00',
      description: 'Till 01 Shift Close: Expected cash $200.00, Actual counted $187.00. Variance -$13.00.',
      created_by: 'Tendai M. (EMP-00014)',
      assigned_to_role: 'MANAGER',
      entity_type: 'CASH_SESSION',
      entity_id: 'SES-00021',
      amount: 13.00,
      evidence: {
        till_id: 'TILL-01',
        expected_cash: 200.00,
        actual_cash: 187.00,
        variance: -13.00,
        staff_note: 'Incorrect opening change float provided at morning shift start.'
      },
      created_at: '2026-08-26T02:30:00Z',
      events: [
        { id: 104, event_type: 'SUBMITTED', performed_by: 'Tendai M. (EMP-00014)', old_status: null, new_status: 'PENDING_REVIEW', comment: 'Shift variance submitted at till reconciliation', created_at: '2026-08-26T02:30:00Z' }
      ]
    },
    {
      id: 4,
      case_number: 'INC-2026-0017',
      case_type: 'SYSTEM_ERROR',
      status: 'UNDER_INVESTIGATION',
      priority: 'HIGH',
      subject: 'POS Transaction Stock Deduction Failure: INV-00921',
      description: 'Customer payment succeeded on EFTPOS card reader, but stock deduction failed due to lock timeout.',
      created_by: 'Charlie Staff (EMP-00014)',
      assigned_to_role: 'SYSADMIN',
      entity_type: 'SYSTEM_INCIDENT',
      entity_id: 'INV-00921',
      amount: 0.00,
      evidence: {
        transaction_id: 'TXN-902184',
        error_code: 'DB_TIMEOUT_LOCK',
        affected_sku: 'SKU-000482'
      },
      created_at: '2026-08-26T01:10:00Z',
      events: [
        { id: 105, event_type: 'SUBMITTED', performed_by: 'Charlie Staff', old_status: null, new_status: 'PENDING_REVIEW', comment: 'Incident reported from front-desk POS', created_at: '2026-08-26T01:10:00Z' },
        { id: 106, event_type: 'ESCALATED', performed_by: 'Bob Manager', old_status: 'PENDING_REVIEW', new_status: 'UNDER_INVESTIGATION', comment: 'Escalated to IT Sysadmin for database ledger audit', created_at: '2026-08-26T01:30:00Z' }
      ]
    },
    {
      id: 5,
      case_number: 'REF-2026-0039',
      case_type: 'REFUND_REQUEST',
      status: 'APPROVED',
      priority: 'NORMAL',
      subject: 'Customer Refund Approved: SAL-00140 ($120.00)',
      description: 'Refund for unopened Ethernet switch return within 7-day policy window.',
      created_by: 'Charlie Staff (EMP-00014)',
      assigned_to_role: 'MANAGER',
      entity_type: 'REFUND',
      entity_id: 'INV-003912',
      amount: 120.00,
      evidence: {
        customer_name: 'Metro Network Solutions',
        item_name: '8-Port Gigabit Switch',
        original_sale_amount: 120.00
      },
      created_at: '2026-08-25T16:00:00Z',
      events: [
        { id: 107, event_type: 'SUBMITTED', performed_by: 'Charlie Staff', old_status: null, new_status: 'PENDING_REVIEW', comment: 'Customer return presented with original receipt', created_at: '2026-08-25T16:00:00Z' },
        { id: 108, event_type: 'APPROVED', performed_by: 'Bob Manager', old_status: 'PENDING_REVIEW', new_status: 'APPROVED', comment: 'Approved per standard 7-day return policy. Receipt verified.', created_at: '2026-08-25T16:15:00Z' }
      ]
    }
  ]);

  // Segregation of Duties (SoD) Capability Check
  const canViewAttention = can(currentRole, 'attention.view');

  if (!canViewAttention) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: 'var(--color-paper-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '40px 30px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-signal-red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto'
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--color-ink)' }}>
            Segregation of Duties (SoD) Restricted Access
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-ink-muted)', lineHeight: '1.6', margin: '0 0 20px 0' }}>
            The <strong>Operational Attention & Case Decision Center</strong> is strictly reserved for <strong>Managerial Personnel (MANAGER)</strong>.
          </p>
          <div style={{
            padding: '14px 18px', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)',
            fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-ink)', textAlign: 'left'
          }}>
            <strong>SoD Compliance Rule:</strong> System Administrators manage infrastructure and users. Operational business decisions (refund approvals, write-offs, discrepancies) are strictly performed by authorized Store Managers.
          </div>
        </div>
      </div>
    );
  }

  // Handle Manager Decision Submission
  const handleExecuteDecision = () => {
    if (!selectedCase) return;

    const nowStr = new Date().toISOString();
    const finalComment = decisionComment.trim() ? decisionComment.trim() : '';

    setCases(prev => prev.map(c => {
      if (c.id === selectedCase.id) {
        const oldStatus = c.status;
        const newStatus = decisionType === 'APPROVED' ? 'APPROVED' : decisionType;
        
        return {
          ...c,
          status: newStatus,
          updated_at: nowStr,
          events: [
            ...c.events,
            {
              id: Date.now(),
              event_type: decisionType,
              performed_by: `${currentRole.toUpperCase()} Reviewer`,
              old_status: oldStatus,
              new_status: newStatus,
              comment: finalComment,
              created_at: nowStr
            }
          ]
        };
      }
      return c;
    }));

    onShowToast?.('success', `Case Decision Executed (${decisionType})`, `Case ${selectedCase.case_number} updated. Logged in immutable timeline.`);
    setSelectedCase(null);
    setDecisionComment('');
  };

  // Filter Cases
  const filteredCases = cases.filter(c => {
    // Status tab filter
    if (statusTab === 'PENDING' && c.status !== 'PENDING_REVIEW') return false;
    if (statusTab === 'INVESTIGATING' && c.status !== 'UNDER_INVESTIGATION' && c.status !== 'CONTESTED') return false;
    if (statusTab === 'RESOLVED' && c.status !== 'APPROVED' && c.status !== 'DENIED' && c.status !== 'RETURNED') return false;

    // Type filter
    if (activeFilter !== 'ALL' && c.case_type !== activeFilter) return false;

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        c.case_number.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.created_by.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = cases.filter(c => c.status === 'PENDING_REVIEW').length;
  const investigatingCount = cases.filter(c => c.status === 'UNDER_INVESTIGATION' || c.status === 'CONTESTED').length;
  const resolvedCount = cases.filter(c => c.status === 'APPROVED' || c.status === 'DENIED' || c.status === 'RETURNED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Unified Operational Attention & Escalation Center
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Single command center for managing operational cases: refunds, receiving discrepancies, float variances, stock write-offs, and incidents.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn ${statusTab === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusTab('PENDING')}
          >
            Needs Decision ({pendingCount})
          </button>
          <button 
            className={`btn ${statusTab === 'INVESTIGATING' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusTab('INVESTIGATING')}
          >
            Under Investigation ({investigatingCount})
          </button>
          <button 
            className={`btn ${statusTab === 'RESOLVED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusTab('RESOLVED')}
          >
            Resolved Cases ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Case Type Filters Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', borderBottom: '1px solid var(--color-rule)' }}>
        {[
          { id: 'ALL', label: 'All Case Types' },
          { id: 'REFUND_REQUEST', label: 'Refund Requests' },
          { id: 'RECEIVING_DISCREPANCY', label: 'Receiving Discrepancies' },
          { id: 'FLOAT_VARIANCE', label: 'Float Variances' },
          { id: 'STOCK_ADJUSTMENT', label: 'Stock Write-offs' },
          { id: 'SYSTEM_ERROR', label: 'System Errors' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeFilter === filter.id ? 'var(--color-accent)' : 'var(--color-paper-2)',
              color: activeFilter === filter.id ? '#fff' : 'var(--color-ink)'
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Case List Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredCases.length === 0 ? (
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '40px', textAlign: 'center', color: 'var(--color-ink-muted)', fontSize: '14px' }}>
            No operational cases found under this filter.
          </div>
        ) : (
          filteredCases.map(item => (
            <div
              key={item.id}
              style={{
                background: 'var(--color-paper-surface)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)', fontSize: '13px' }}>
                    {item.case_number}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px',
                    background: item.priority === 'HIGH' || item.priority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: item.priority === 'HIGH' || item.priority === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                    fontFamily: 'monospace'
                  }}>
                    {item.case_type.replace('_', ' ')}
                  </span>
                  {item.amount > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-signal-green)' }}>
                      ${item.amount.toFixed(2)}
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-ink)' }}>
                  {item.subject}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.4 }}>
                  {item.description}
                </p>

                <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', marginTop: '8px', display: 'flex', gap: '14px' }}>
                  <span>Requested by: <strong>{item.created_by}</strong></span>
                  <span>Target: <strong>{item.entity_id || 'N/A'}</strong></span>
                  <span>Submitted: <strong>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                </div>
              </div>

              <div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedCase(item);
                    setDecisionType('APPROVED');
                    setDecisionComment('');
                  }}
                  style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  Review →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* WORKBENCH MODAL: CASE DETAILS & DECISION ENGINE */}
      {selectedCase && (
        <div className="modal-overlay" onClick={() => setSelectedCase(null)} style={{ zIndex: 300 }}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '780px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-rule)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-accent)', fontWeight: 800 }}>{selectedCase.case_number}</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: 'var(--color-paper-2)', color: 'var(--color-ink)' }}>{selectedCase.case_type}</span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--color-ink)' }}>{selectedCase.subject}</h3>
              </div>
              <button onClick={() => setSelectedCase(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-muted)' }}><X size={20} /></button>
            </div>

            {/* Original Request Details (Immutable Context) */}
            <div style={{ background: 'var(--color-paper-2)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', border: '1px solid var(--color-rule)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-ink-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Original Case Context</div>
              <p style={{ fontSize: '13px', color: 'var(--color-ink)', margin: '0 0 12px 0' }}>{selectedCase.description}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', fontSize: '12px' }}>
                <div><strong>Requested By:</strong> {selectedCase.created_by}</div>
                <div><strong>Reference Entity:</strong> {selectedCase.entity_type} ({selectedCase.entity_id})</div>
                <div><strong>Financial Amount:</strong> ${selectedCase.amount ? selectedCase.amount.toFixed(2) : '0.00'}</div>
                <div><strong>Current Status:</strong> <span style={{ fontWeight: 800, color: 'var(--color-accent)' }}>{selectedCase.status}</span></div>
              </div>

              {/* Evidence Metadata */}
              {selectedCase.evidence && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--color-rule)', fontSize: '12px' }}>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>ATTACHED EVIDENCE & VERIFICATION:</div>
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '11px', background: 'var(--color-paper)', padding: '8px', borderRadius: '4px', color: 'var(--color-ink)' }}>
                    {JSON.stringify(selectedCase.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Immutable Timeline Audit Events Trail */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 10px 0', color: 'var(--color-ink)' }}>Immutable Case Event Audit Timeline</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedCase.events.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--color-paper-surface)', padding: '10px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent)', marginTop: '4px' }} />
                    <div style={{ flex: 1, fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{ev.event_type} by {ev.performed_by}</strong>
                        <span style={{ fontFamily: 'monospace', color: 'var(--color-ink-muted)', fontSize: '11px' }}>{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ color: 'var(--color-ink-muted)', marginTop: '2px' }}>{ev.comment}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manager Decision Controls (Executing Action) */}
            {can(currentRole, 'attention.decide') ? (
              <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--color-ink)' }}>Manager Decision Execution</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { id: 'APPROVED', label: 'Approve', color: '#10b981' },
                    { id: 'DENIED', label: 'Deny', color: '#ef4444' },
                    { id: 'CONTESTED', label: 'Contest', color: '#f59e0b' },
                    { id: 'RETURNED', label: 'Return for clarification', color: '#3b82f6' },
                    { id: 'ESCALATED', label: 'Escalate Further', color: '#8b5cf6' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setDecisionType(opt.id)}
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: decisionType === opt.id ? `2px solid ${opt.color}` : '1px solid var(--color-rule)',
                        background: decisionType === opt.id ? opt.color : 'var(--color-paper-2)',
                        color: decisionType === opt.id ? '#fff' : 'var(--color-ink)'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: 'var(--color-ink)' }}>REVIEWER DECISION NOTE / COMMENT (OPTIONAL)</label>
                  <textarea
                    rows={3}
                    value={decisionComment}
                    onChange={e => setDecisionComment(e.target.value)}
                    placeholder="Enter decision rationale, verification notes, or instructions (optional)..."
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-ink)', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedCase(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleExecuteDecision}>
                    Submit Decision ({decisionType})
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '16px', fontSize: '13px', color: 'var(--color-ink-muted)' }}>
                <em>Read-Only View: Operational decision rights reserved for Store Operations Managers.</em>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
