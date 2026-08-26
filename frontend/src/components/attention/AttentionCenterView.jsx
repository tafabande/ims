import React, { useState, useEffect } from 'react';
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
  CheckSquare
} from 'lucide-react';

export default function AttentionCenterView({ onShowToast, onNavigate }) {
  const [activeTab, setActiveTab] = useState('ACTION_REQUIRED'); // 'ACTION_REQUIRED' | 'IMPORTANT' | 'INFORMATIONAL' | 'RESOLVED' | 'SETTINGS'
  const [selectedAlertForExplanation, setSelectedAlertForExplanation] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  
  // Notification items state with full lifecycle
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      code: 'NOTIF-2026-0091',
      category: 'REFUND_APPROVAL',
      importance: 'ACTION_REQUIRED', // 🔴
      title: 'Refund Approval Required: #REF-00042',
      summary: 'Customer ABC Traders requested $340.00 refund on receipt SAL-00182.',
      requester: 'Sales Clerk (EMP-00014)',
      timestamp: '2026-08-26T01:45:00Z',
      lifecycle: 'ACTION_REQUIRED', // CREATED | UNREAD | ACKNOWLEDGED | ACTION_REQUIRED | RESOLVED | ARCHIVED
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
      }
    },
    {
      id: 2,
      code: 'NOTIF-2026-0088',
      category: 'STOCK_ADJUSTMENT',
      importance: 'ACTION_REQUIRED', // 🔴
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
        activityTrail: [
          { step: 'Opening Balance', qty: 240 },
          { step: 'Received (PO-00431)', qty: '+80' },
          { step: 'Sales Recorded', qty: '-43' },
          { step: 'Damages Reported', qty: '-2' },
          { step: 'Expected Balance', qty: 275 },
          { step: 'Physical Count', qty: 273 }
        ],
        auditRef: 'AUD-ADJ-2026-0041'
      }
    },
    {
      id: 3,
      code: 'NOTIF-2026-0074',
      category: 'GOODS_RECEIVED_VARIANCE',
      importance: 'IMPORTANT', // 🟠
      title: 'Goods Received Variance: PO-2026-00431',
      summary: 'Supplier XYZ Electronics delivered 96 units against 100 ordered (-4 unit variance).',
      requester: 'Receiving Operator (EMP-00022)',
      timestamp: '2026-08-26T01:10:00Z',
      lifecycle: 'ACKNOWLEDGED',
      details: {
        po_number: 'PO-2026-00431',
        supplier: 'XYZ Electronics',
        ordered_qty: 100,
        received_qty: 96,
        returned_qty: 4,
        variance: -4,
        note: '4 units arrived with crushed outer cartons and were rejected at receiving bay.'
      },
      whyExplanation: {
        trigger: 'Goods Received Discrepancy Rule',
        formula: 'Received (96u) ≠ Ordered (100u) → Variance (-4u) logged to Supplier Claim Ledger',
        auditRef: 'AUD-RCV-2026-0431'
      }
    },
    {
      id: 4,
      code: 'NOTIF-2026-0062',
      category: 'CRITICAL_STOCK',
      importance: 'IMPORTANT', // 🟠
      title: 'Critical Low Stock Warning: CAT6 Cable Roll 300m',
      summary: 'Available stock (3u) is below safety reorder level (10u). Projected depletion in ~2 days.',
      requester: 'Automated Inventory Monitor',
      timestamp: '2026-08-26T00:50:00Z',
      lifecycle: 'ACKNOWLEDGED',
      details: {
        sku: 'SKU-CABLE-CAT6',
        product_name: 'CAT6 Cable Roll 300m',
        current_stock: 3,
        reorder_level: 10,
        recommended_reorder: 50
      },
      whyExplanation: {
        trigger: 'Inventory Reorder Point Rule',
        formula: 'Current Stock (3u) ≤ Reorder Level (10u) → Automated Reorder Alert Generated',
        auditRef: 'AUD-INV-CAT6-001'
      }
    },
    {
      id: 5,
      code: 'NOTIF-2026-0045',
      category: 'STOCK_ORDER_CREATED',
      importance: 'INFORMATIONAL', // 🔵
      title: 'Routine Purchase Order Drafted: PO-2026-00432',
      summary: '50 × CAT6 Cable ordered from Supplier X by Automated Replenishment system.',
      requester: 'System Automated Replenishment',
      timestamp: '2026-08-25T22:15:00Z',
      lifecycle: 'ACKNOWLEDGED',
      details: {
        po_number: 'PO-2026-00432',
        supplier: 'Supplier X',
        total_items: 50
      },
      whyExplanation: {
        trigger: 'Informational Event Rule (No Manager Action Required)',
        formula: 'Routine PO creation within pre-approved budget limits',
        auditRef: 'AUD-PO-2026-0432'
      }
    },
    {
      id: 6,
      code: 'NOTIF-2026-0012',
      category: 'REFUND_APPROVAL',
      importance: 'RESOLVED', // ✓
      title: 'Resolved (APPROVED): Refund #REF-00039',
      summary: '$120.00 refund approved for customer John Moyo.',
      requester: 'Manager (You)',
      timestamp: '2026-08-25T16:30:00Z',
      lifecycle: 'RESOLVED',
      details: {
        customer: 'John Moyo',
        amount: 120.00,
        decision: 'APPROVED',
        note: 'Verified duplicate charge on merchant bank gateway.'
      },
      whyExplanation: {
        trigger: 'Manager Signoff Completed',
        formula: 'Approved → Financial Ledger Credited & Audit Log Signed',
        auditRef: 'AUD-REF-2026-0039'
      }
    }
  ]);

  // Alert Rules Configuration State
  const [alertSettings, setAlertSettings] = useState({
    critical_stock: true,
    low_stock: true,
    goods_received: true,
    goods_variance: true,
    purchase_created: false, // Manager opted out of routine purchase noise
    purchase_approved: true,
    refund_requested: true,
    payment_info_changed: true,
    cash_variance: true,
    shift_exception: true,
    external_data_import: true
  });

  const handleDecision = (notificationId, decision) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === notificationId) {
        return {
          ...n,
          importance: 'RESOLVED',
          lifecycle: 'RESOLVED',
          title: `Resolved (${decision}): ${n.title.replace('Approval Required:', '').replace('Approval:', '')}`,
          details: { ...n.details, decision, managerNote: decisionNotes }
        };
      }
      return n;
    }));

    if (onShowToast) {
      onShowToast('success', `Decision Executed (${decision})`, `Notification #${notificationId} resolved and logged in security audit trail.`);
    }

    setShowApprovalModal(null);
    setDecisionNotes('');
  };

  const actionRequiredCount = notifications.filter(n => n.importance === 'ACTION_REQUIRED').length;
  const importantCount = notifications.filter(n => n.importance === 'IMPORTANT').length;
  const informationalCount = notifications.filter(n => n.importance === 'INFORMATIONAL').length;
  const resolvedCount = notifications.filter(n => n.importance === 'RESOLVED').length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'ACTION_REQUIRED') return n.importance === 'ACTION_REQUIRED';
    if (activeTab === 'IMPORTANT') return n.importance === 'IMPORTANT';
    if (activeTab === 'INFORMATIONAL') return n.importance === 'INFORMATIONAL';
    if (activeTab === 'RESOLVED') return n.importance === 'RESOLVED';
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
              background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
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
                Categorized Exception Dispatcher • 3-Outcome Authorizations • Business Rule Triggers & Audit Provenance
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setActiveTab('SETTINGS')}
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
          <Sliders size={16} /> Configure Alert Rules
        </button>
      </div>

      {/* Categorized Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--color-rule)',
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'ACTION_REQUIRED', label: 'Requires Action', badge: actionRequiredCount, icon: AlertCircle },
          { id: 'IMPORTANT', label: 'Important Events', badge: importantCount, icon: AlertTriangle },
          { id: 'INFORMATIONAL', label: 'Informational', badge: informationalCount, icon: Info },
          { id: 'RESOLVED', label: 'Resolved / History', badge: resolvedCount, icon: CheckCircle2 },
          { id: 'SETTINGS', label: 'Notification Settings', badge: 0, icon: Settings }
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
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
              <span>{tab.label}</span>
              {tab.badge > 0 && !isActive && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--color-accent)',
                  boxShadow: '0 0 6px var(--color-accent)'
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}

      {/* 1. NOTIFICATION LIST (ACTION_REQUIRED, IMPORTANT, INFORMATIONAL, RESOLVED) */}
      {activeTab !== 'SETTINGS' && (
        <div>
          {filteredNotifications.length === 0 ? (
            <div style={{
              background: 'var(--color-paper)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-sm)',
              padding: '48px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              <CheckCircle2 size={42} style={{ color: '#10b981', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
                No Pending Items in this Category
              </h3>
              <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                All operational events have been reviewed and processed according to business rules.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredNotifications.map(item => {
                const isActionReq = item.importance === 'ACTION_REQUIRED';
                const isImportant = item.importance === 'IMPORTANT';
                const isResolved = item.importance === 'RESOLVED';

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--color-paper)',
                      border: isActionReq ? '1px solid #ef4444' : isImportant ? '1px solid #f59e0b' : '1px solid var(--color-rule)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '20px',
                      boxShadow: isActionReq ? '0 2px 12px rgba(239, 68, 68, 0.08)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-xs)',
                          background: isActionReq ? 'rgba(239, 68, 68, 0.15)' : isImportant ? 'rgba(245, 158, 11, 0.15)' : isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isActionReq ? '#ef4444' : isImportant ? '#f59e0b' : isResolved ? '#10b981' : '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isActionReq ? <AlertCircle size={20} /> : isImportant ? <AlertTriangle size={20} /> : isResolved ? <CheckCircle2 size={20} /> : <Info size={20} />}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
                              {item.title}
                            </h3>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', padding: '2px 6px', borderRadius: '4px' }}>
                              {item.code}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: isActionReq ? 'rgba(239, 68, 68, 0.15)' : isImportant ? 'rgba(245, 158, 11, 0.15)' : isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: isActionReq ? '#ef4444' : isImportant ? '#f59e0b' : isResolved ? '#10b981' : '#3b82f6'
                            }}>
                              {item.importance.replace('_', ' ')}
                            </span>
                          </div>

                          <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: '6px 0 10px 0', lineHeight: 1.4 }}>
                            {item.summary}
                          </p>

                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                            <span><strong>Requester:</strong> {item.requester}</span>
                            <span>•</span>
                            <span><strong>Time:</strong> {new Date(item.timestamp).toLocaleString()}</span>
                            {item.details?.reason && (
                              <>
                                <span>•</span>
                                <span><strong>Reason:</strong> {item.details.reason}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => setSelectedAlertForExplanation(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <HelpCircle size={14} /> Why Am I Seeing This?
                        </button>

                        {isActionReq && (
                          <button
                            onClick={() => setShowApprovalModal(item)}
                            style={{
                              padding: '7px 14px',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Review & Execute Decision
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. NOTIFICATION SETTINGS & RULES CONFIGURATION */}
      {activeTab === 'SETTINGS' && (
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Manager Operational Alert Rules & Noise Controls</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Configure which business events trigger manager notifications vs quiet system background logging.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {[
              { key: 'critical_stock', title: 'Critical Stockout Alerts (Stock ≤ Reorder Level)', desc: 'Notify manager when stock reaches critical thresholds', category: 'Inventory' },
              { key: 'low_stock', title: 'Low Stock Warnings', desc: 'Notify manager when stock drops below safety buffer', category: 'Inventory' },
              { key: 'goods_received', title: 'Goods Received Confirmations', desc: 'Notify manager when purchase order deliveries arrive', category: 'Purchasing' },
              { key: 'goods_variance', title: 'Goods Receiving Discrepancy / Variance', desc: 'Notify manager when received quantity differs from purchase order', category: 'Purchasing' },
              { key: 'purchase_created', title: 'Routine Purchase Created', desc: 'Notify manager on every routine PO creation (Default OFF to avoid noise)', category: 'Purchasing' },
              { key: 'purchase_approved', title: 'Purchase Approved & Issued', desc: 'Notify manager when supplier PO is authorized', category: 'Purchasing' },
              { key: 'refund_requested', title: 'Refund Approval Required', desc: 'Notify manager when sales clerk requests customer refund', category: 'Sales & POS' },
              { key: 'payment_info_changed', title: 'Payment Credentials Changed', desc: 'Notify manager on sensitive bank/payment modifications', category: 'Security' },
              { key: 'cash_variance', title: 'Till Cash Variance Exception', desc: 'Notify manager when shift drawer count disagrees with POS ledger', category: 'Shifts & Till' },
              { key: 'external_data_import', title: 'External Data Intake Execution', desc: 'Notify manager when bulk file or ERP integration commits records', category: 'Integration' }
            ].map(rule => (
              <div
                key={rule.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-rule)',
                  borderRadius: 'var(--radius-xs)'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{rule.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{rule.desc}</div>
                </div>

                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={alertSettings[rule.key]}
                    onChange={e => setAlertSettings({ ...alertSettings, [rule.key]: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: alertSettings[rule.key] ? 'var(--color-accent)' : '#64748b',
                    borderRadius: '24px',
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: alertSettings[rule.key] ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              if (onShowToast) onShowToast('success', 'Alert Rules Saved', 'Manager operational alert settings updated successfully.');
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Save Alert Rule Preferences
          </button>
        </div>
      )}

      {/* 3. MODAL: "WHY AM I SEEING THIS?" EXPLAINABILITY DRAWER */}
      {selectedAlertForExplanation && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--color-paper)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            width: '620px',
            maxWidth: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-rule)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HelpCircle size={22} style={{ color: '#3b82f6' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                  Why Am I Seeing This Alert?
                </h3>
              </div>
              <button onClick={() => setSelectedAlertForExplanation(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid #3b82f6', borderRadius: 'var(--radius-xs)', padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase' }}>
                {selectedAlertForExplanation.code} • {selectedAlertForExplanation.category}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', marginTop: '4px', color: 'var(--color-text)' }}>
                {selectedAlertForExplanation.title}
              </div>
            </div>

            {/* Explanation Breakdown Card */}
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Business Rule Trigger</label>
                <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px', padding: '10px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)' }}>
                  ⚡ {selectedAlertForExplanation.whyExplanation?.trigger}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Mathematical & Policy Formula</label>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', marginTop: '4px', padding: '12px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', color: 'var(--color-accent)' }}>
                  {selectedAlertForExplanation.whyExplanation?.formula}
                </div>
              </div>

              {/* Activity Trail if available */}
              {selectedAlertForExplanation.whyExplanation?.activityTrail && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Ledger Activity Trail</label>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Operation Step</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAlertForExplanation.whyExplanation.activityTrail.map((st, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                          <td style={{ padding: '8px' }}>{st.step}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}>{st.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px' }}>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Audit Record Reference</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: '700', marginTop: '2px' }}>
                    {selectedAlertForExplanation.whyExplanation?.auditRef}
                  </div>
                </div>
                <div style={{ padding: '10px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px' }}>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Source of Truth</div>
                  <div style={{ fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                    ✓ Immutable PostgreSQL Audit Ledger
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedAlertForExplanation(null)}
                style={{
                  padding: '9px 18px',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: 3-OUTCOME APPROVAL EXECUTION ENGINE */}
      {showApprovalModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--color-paper)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            width: '540px',
            maxWidth: '100%',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                Execute Controlled Approval Decision
              </h3>
              <button onClick={() => setShowApprovalModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: '700' }}>{showApprovalModal.code}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{showApprovalModal.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{showApprovalModal.summary}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Manager Decision Notes / Justification
              </label>
              <textarea
                value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                placeholder="Enter mandatory audit review notes..."
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

            {/* 3 Symmetrical Outcome Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button
                onClick={() => handleDecision(showApprovalModal.id, 'APPROVED')}
                style={{
                  padding: '12px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Check size={16} /> Approve
              </button>

              <button
                onClick={() => {
                  if (!decisionNotes.trim()) {
                    alert('Notes required for rejection');
                    return;
                  }
                  handleDecision(showApprovalModal.id, 'REJECTED');
                }}
                style={{
                  padding: '12px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <X size={16} /> Reject
              </button>

              <button
                onClick={() => {
                  if (!decisionNotes.trim()) {
                    alert('Notes required for requesting changes');
                    return;
                  }
                  handleDecision(showApprovalModal.id, 'CHANGES_REQUESTED');
                }}
                style={{
                  padding: '12px',
                  background: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={16} /> Request Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
