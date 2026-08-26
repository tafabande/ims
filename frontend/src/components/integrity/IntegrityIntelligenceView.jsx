import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  HelpCircle, 
  Radio, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Layers, 
  TrendingUp, 
  MapPin, 
  ChevronRight,
  FileText,
  RefreshCw,
  Activity,
  ShieldCheck,
  Zap,
  Filter,
  Eye,
  Sliders,
  Maximize2,
  X,
  FileSpreadsheet,
  Check,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '../../utils/apiClient';
import { can } from '../../utils/permissions';

export default function IntegrityIntelligenceView({ onShowToast, currentRole = 'MANAGER', onNavigate }) {
  const [activeTab, setActiveTab] = useState('attention'); // 'attention' | 'exceptions' | 'lineage' | 'external_sources' | 'digital_twin'
  const [selectedEntityForLineage, setSelectedEntityForLineage] = useState(null);
  const [quarantineActionEntity, setQuarantineActionEntity] = useState(null);
  const [quarantineNote, setQuarantineNote] = useState('');
  const [selectedAisle, setSelectedAisle] = useState('A-02');

  const isManager = can(currentRole, 'attention.decide');

  // Operational Exceptions Queue Data
  const [exceptions, setExceptions] = useState([
    {
      id: 1,
      code: "EXC-2026-0041",
      severity: "CRITICAL", // 🔴
      badge: "🔴 Critical",
      color: "#ef4444",
      issue: "Inventory Discrepancy",
      entity: "Dell XPS 15 Workstation Laptop",
      sku: "SKU-DELL-XPS15",
      location: "Harare Main Warehouse · Aisle A-02",
      expected: 147,
      system: 143,
      variance: -4,
      note: "Possible unexplained stock movement during loading dock transfer.",
      status: "Investigation",
      actionType: "HOLD_STOCK", // HOLD_STOCK | APPROVE_TRANSACTION | REORDER
      actionLabel: "Investigate",
      lineage: {
        openingStock: 150,
        received: 25,
        sales: 18,
        supplierReturns: 6,
        internalTransfers: 4,
        customerReturns: 0,
        expectedBalance: 147,
        actualCount: 143,
        unexplainedVariance: -4,
        evidence: [
          { ref: 'PO-1042', type: 'Purchase Order', note: '+25 units received from Dell Logistics' },
          { ref: 'GR-882', type: 'Goods Receipt', note: 'Inspected and accepted at Harare Main' },
          { ref: 'INV-2041..2078', type: 'Sales Invoices', note: '18 units sold across 14 transactions' },
          { ref: 'TR-441', type: 'Stock Transfer', note: '4 units moved to Bulawayo Branch' },
          { ref: 'SC-109', type: 'Physical Stock Count', note: 'Verified by Auditor EMP-00004' }
        ]
      }
    },
    {
      id: 2,
      code: "EXC-2026-0042",
      severity: "HIGH", // 🟠
      badge: "🟠 Approval Required",
      color: "#f59e0b",
      issue: "Pricing Override Exception",
      entity: "Logitech MX Master 3S Mouse",
      sku: "SKU-LOGI-MX3S",
      location: "Bulawayo Store #02 · Till 01",
      salePrice: 78.00,
      floorPrice: 85.00,
      note: "Sold at $78.00 (below negotiation floor of $85.00) without manager authorization.",
      status: "Approval Required",
      actionType: "APPROVE_TRANSACTION",
      actionLabel: "Review Transaction",
      lineage: {
        openingStock: 50,
        received: 10,
        sales: 5,
        expectedBalance: 55,
        actualCount: 55,
        unexplainedVariance: 0,
        evidence: [
          { ref: 'INV-20482', type: 'POS Receipt', note: 'Discount code OVERRIDE_78 applied by Sales Staff EMP-00014' },
          { ref: 'POLICY-PRICE-01', type: 'Pricing Rule', note: 'Minimum floor limit $85.00' }
        ]
      }
    },
    {
      id: 3,
      code: "EXC-2026-0043",
      severity: "MEDIUM", // 🟡
      badge: "🟡 Stock Low",
      color: "#3b82f6",
      issue: "Reorder Point Triggered",
      entity: "USB-C 65W Power Adapter",
      sku: "SKU-PWR-65W",
      location: "Harare Main Warehouse · Aisle B-01",
      currentStock: 12,
      reorderLevel: 20,
      note: "Available stock (12u) is below safety reorder level (20u).",
      status: "Reorder Pending",
      actionType: "REORDER",
      actionLabel: "Create Purchase Order",
      lineage: {
        openingStock: 100,
        received: 0,
        sales: 88,
        expectedBalance: 12,
        actualCount: 12,
        unexplainedVariance: 0,
        evidence: [
          { ref: 'REORDER-RULE-65W', type: 'Inventory Policy', note: 'Safety buffer 20 units' }
        ]
      }
    }
  ]);

  // External Data Source Provenance Ledger
  const [externalSources, setExternalSources] = useState([
    {
      id: 1,
      source_name: "Excel Bulk Opening Stock Import",
      import_type: "FILE_UPLOAD",
      filename: "opening_stock_harare_august.csv",
      imported_by: "EMP-00017 (HR/Ops Admin)",
      timestamp: "2026-08-25 14:15 UTC",
      records_imported: 120,
      status: "DOCUMENTED", // DOCUMENTED | REQUIRES_REVIEW
      reference: "IMP-2026-00040",
      reason: "Initial legacy stock migration for Harare Main Branch."
    },
    {
      id: 2,
      source_name: "POS Terminal Gateway API",
      import_type: "API_INTEGRATION",
      filename: "POS Terminal 01 Sync Stream",
      imported_by: "INT-2026-00014 (POS Service)",
      timestamp: "2026-08-25 18:30 UTC",
      records_imported: 45,
      status: "DOCUMENTED",
      reference: "SYNC-2026-0091",
      reason: "End-of-day POS offline queue reconciliation."
    },
    {
      id: 3,
      source_name: "Manual External Warehouse Adjustment",
      import_type: "MANUAL_ADJUSTMENT",
      filename: "N/A (Direct SQL/API)",
      imported_by: "EMP-00031 (Warehouse Ops)",
      timestamp: "2026-08-26 01:20 UTC",
      records_imported: 3,
      status: "REQUIRES_REVIEW", // ⚠️ Unverified external adjustment
      reference: "ADJ-EXT-00482",
      reason: "Third-party logistics transit damage reconciliation."
    }
  ]);

  // Handle Action Execution (Hold, Approve, Reorder)
  const handleExecuteAction = (item, action) => {
    if (action === 'HOLD_STOCK') {
      setQuarantineActionEntity(item);
    } else if (action === 'APPROVE_TRANSACTION') {
      if (onShowToast) onShowToast('success', 'Pricing Override Approved', `Transaction ${item.code} authorized by Manager.`);
      setExceptions(prev => prev.filter(e => e.id !== item.id));
    } else if (action === 'REORDER') {
      if (onNavigate) onNavigate('purchases');
      if (onShowToast) onShowToast('info', 'PO Generator Opened', `Navigated to Purchasing to order ${item.entity}.`);
    }
  };

  const handleConfirmQuarantine = () => {
    if (!quarantineActionEntity) return;
    if (onShowToast) {
      onShowToast('warning', 'Inventory Hold Enforced', `Stock for ${quarantineActionEntity.entity} placed on Quarantine Hold in ${quarantineActionEntity.location}. Note: ${quarantineNote || 'Manager Audit Hold'}`);
    }
    setQuarantineActionEntity(null);
    setQuarantineNote('');
  };

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
              background: 'linear-gradient(135deg, var(--color-accent), #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                Inventory Operations & Integrity Control
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
                Monitor stock integrity, operational exceptions, calculation lineage, and 2D spatial warehouse activity.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (onShowToast) onShowToast('info', 'Integrity Scan Completed', 'Verified 1,284 SKUs across 2 warehouses. 99.8% ledger reconciliation rate.');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-xs)',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <Zap size={16} /> Run Full Integrity Scan
        </button>
      </div>

      {/* 4 CLICKABLE STATUS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div
          onClick={() => setActiveTab('attention')}
          style={{
            padding: '18px',
            background: 'var(--color-paper)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            borderLeft: '4px solid #10b981'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', lineHeight: 1 }}>99.8%</div>
          <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '6px' }}>Inventory Integrity</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>1,284 SKUs verified & reconciled</div>
        </div>

        <div
          onClick={() => setActiveTab('attention')}
          style={{
            padding: '18px',
            background: 'var(--color-paper)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            borderLeft: '4px solid #ef4444'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', lineHeight: 1 }}>7</div>
          <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '6px' }}>Stock Alerts</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>3 critical low stock triggers</div>
        </div>

        <div
          onClick={() => setActiveTab('attention')}
          style={{
            padding: '18px',
            background: 'var(--color-paper)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            borderLeft: '4px solid #f59e0b'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b', lineHeight: 1 }}>3</div>
          <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '6px' }}>Manager Approvals</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>2 require immediate action</div>
        </div>

        <div
          onClick={() => setActiveTab('digital_twin')}
          style={{
            padding: '18px',
            background: 'var(--color-paper)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            borderLeft: '4px solid #8b5cf6'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#8b5cf6', lineHeight: 1 }}>1</div>
          <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '6px' }}>Quarantine Hold</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Harare Main · Aisle A-02</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--color-rule)',
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'attention', label: 'Needs Your Attention', icon: AlertCircle },
          { id: 'exceptions', label: 'Operational Exceptions Matrix', icon: Layers },
          { id: 'external_sources', label: 'External Source Provenance (3)', icon: FileSpreadsheet },
          { id: 'digital_twin', label: 'Warehouse Digital Twin & BLE Map', icon: MapPin }
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
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: NEEDS YOUR ATTENTION (COMPACT OPERATIONAL QUEUE) */}
      {activeTab === 'attention' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔴 3 OPERATIONAL EXCEPTIONS NEED MANAGER DECISION</span>
          </div>

          {exceptions.map(item => (
            <div
              key={item.id}
              style={{
                background: 'var(--color-paper)',
                border: `1px solid ${item.color}40`,
                borderLeft: `4px solid ${item.color}`,
                borderRadius: 'var(--radius-sm)',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px', background: `${item.color}20`, color: item.color }}>
                      {item.badge}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                      {item.issue} — {item.entity}
                    </h3>
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', gap: '16px', color: 'var(--color-text)', flexWrap: 'wrap' }}>
                    {item.variance !== undefined && (
                      <span><strong>Expected:</strong> {item.expected} | <strong>System Count:</strong> {item.system} | <strong style={{ color: item.color }}>Variance: {item.variance}</strong></span>
                    )}
                    {item.salePrice !== undefined && (
                      <span><strong>Sale Price:</strong> ${item.salePrice.toFixed(2)} | <strong>Floor Limit:</strong> ${item.floorPrice.toFixed(2)}</span>
                    )}
                    {item.currentStock !== undefined && (
                      <span><strong>Current Stock:</strong> {item.currentStock} | <strong>Reorder Point:</strong> {item.reorderLevel}</span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    📍 {item.location} • <em>"{item.note}"</em>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {item.lineage && (
                    <button
                      onClick={() => setSelectedEntityForLineage(item)}
                      style={{
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
                      Why is this number {item.system || item.currentStock}?
                    </button>
                  )}

                  {isManager ? (
                    <button
                      onClick={() => handleExecuteAction(item, item.actionType)}
                      style={{
                        padding: '7px 14px',
                        background: 'var(--color-accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {item.actionLabel}
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '6px' }}>
                      (View Only Mode — Anomaly ID: {item.code})
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 2: OPERATIONAL EXCEPTIONS MATRIX TABLE */}
      {activeTab === 'exceptions' && (
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Operational Exceptions Summary Matrix</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '10px' }}>Severity</th>
                <th style={{ padding: '10px' }}>Issue Type</th>
                <th style={{ padding: '10px' }}>Target Entity</th>
                <th style={{ padding: '10px' }}>Location</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px', fontWeight: '700', color: e.color }}>{e.badge}</td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{e.issue}</td>
                  <td style={{ padding: '12px' }}>{e.entity}</td>
                  <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>{e.location}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)' }}>
                      {e.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleExecuteAction(e, e.actionType)}
                      style={{ padding: '5px 12px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      {e.actionLabel}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECTION 3: EXTERNAL SOURCE PROVENANCE LEDGER */}
      {activeTab === 'external_sources' && (
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>External Data Source Ingestion Provenance</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Distinguishes system-generated ledger events from external bulk file imports, API syncs, or manual overrides.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={{ padding: '14px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>TOTAL EXTERNAL ADJUSTMENTS</div>
              <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px' }}>3 Ingestions</div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>DOCUMENTED & VERIFIED</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>2 Documented</div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>REQUIRES REVIEW</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b', marginTop: '2px' }}>1 Unverified Review</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '10px' }}>Ref Code</th>
                <th style={{ padding: '10px' }}>Source Name & Type</th>
                <th style={{ padding: '10px' }}>Importer / Service</th>
                <th style={{ padding: '10px' }}>Records</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Business Reason</th>
              </tr>
            </thead>
            <tbody>
              {externalSources.map(src => (
                <tr key={src.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-accent)' }}>{src.reference}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '600' }}>{src.source_name}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{src.import_type} • {src.filename}</div>
                  </td>
                  <td style={{ padding: '12px' }}>{src.imported_by}</td>
                  <td style={{ padding: '12px', fontWeight: '700' }}>{src.records_imported} rows</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background: src.status === 'DOCUMENTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: src.status === 'DOCUMENTED' ? '#10b981' : '#f59e0b'
                    }}>
                      {src.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>{src.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECTION 4: 2D WAREHOUSE SPATIAL DIGITAL TWIN */}
      {activeTab === 'digital_twin' && (
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Warehouse Overview & 2D Spatial Digital Twin</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Harare Main Warehouse • <strong>68.4% capacity utilized</strong> • Real-time BLE RFID Tag Tracking
              </p>
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '6px 12px', borderRadius: '4px' }}>
              ● BLE RFID GATEWAY ONLINE
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            {/* Visual 2D Aisle Grid Map */}
            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '14px', textTransform: 'uppercase' }}>
                HARARE MAIN WAREHOUSE SPATIAL MAP
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {[
                  { aisle: 'A-01', name: 'Aisle A-01', status: 'HEALTHY', units: 310, holds: 0 },
                  { aisle: 'A-02', name: 'Aisle A-02 🔴', status: 'HOLD', units: 143, holds: 1 },
                  { aisle: 'A-03', name: 'Aisle A-03', status: 'HEALTHY', units: 280, holds: 0 },
                  { aisle: 'B-01', name: 'Aisle B-01 🟡', status: 'LOW_STOCK', units: 12, holds: 0 },
                  { aisle: 'B-02', name: 'Aisle B-02', status: 'HEALTHY', units: 450, holds: 0 },
                  { aisle: 'B-03', name: 'Aisle B-03', status: 'HEALTHY', units: 520, holds: 0 }
                ].map(a => (
                  <div
                    key={a.aisle}
                    onClick={() => setSelectedAisle(a.aisle)}
                    style={{
                      background: 'var(--color-paper)',
                      border: selectedAisle === a.aisle ? '2px solid var(--color-accent)' : a.status === 'HOLD' ? '1px solid #ef4444' : '1px solid var(--color-rule)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{a.name}</span>
                      {a.holds > 0 && <span style={{ fontSize: '10px', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>HOLD</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>{a.units} units stocked</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-accent)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Radio size={12} /> BLE TAG-940{a.aisle.replace('-', '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Aisle Inspector Detail */}
            <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-accent)', textTransform: 'uppercase' }}>
                AISLE INSPECTOR DETAIL
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0 12px 0' }}>
                Aisle {selectedAisle}
              </h3>

              {selectedAisle === 'A-02' ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 'var(--radius-xs)', padding: '12px' }}>
                    <div style={{ color: '#ef4444', fontWeight: '700', fontSize: '13px' }}>🔴 Active Investigation & Hold</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Dell XPS 15 Workstation Laptop (-4u variance)</div>
                  </div>
                  <div style={{ fontSize: '13px' }}><strong>Stock Count:</strong> 143 units</div>
                  <div style={{ fontSize: '13px' }}><strong>Quarantine Status:</strong> 1 active hold</div>
                  <div style={{ fontSize: '13px' }}><strong>Last Verified:</strong> Today, 14:32 UTC (Auditor EMP-00004)</div>
                  <button
                    onClick={() => setActiveTab('attention')}
                    style={{ marginTop: '8px', padding: '8px 14px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Open Investigation →
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Aisle {selectedAisle} operating within normal safety limits. No active quarantine holds.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: HUMAN READABLE LINEAGE ("Why is this number 143?") */}
      {selectedEntityForLineage && (
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
            width: '640px',
            maxWidth: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-rule)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HelpCircle size={22} style={{ color: '#3b82f6' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                    Why is this number {selectedEntityForLineage.system || selectedEntityForLineage.currentStock}?
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Stock Movement History & Formula Calculation
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedEntityForLineage(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Calculation Formula Card */}
            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '8px' }}>
                PRODUCT: {selectedEntityForLineage.entity} ({selectedEntityForLineage.sku})
              </div>

              <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }}>
                <div>Opening Stock (1 Aug): &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{selectedEntityForLineage.lineage.openingStock}</div>
                {selectedEntityForLineage.lineage.received !== undefined && (
                  <div>+ Goods Received (PO-1042): &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+{selectedEntityForLineage.lineage.received}</div>
                )}
                {selectedEntityForLineage.lineage.sales !== undefined && (
                  <div>- Sales Recorded (INV-2041..): &nbsp;&nbsp;-{selectedEntityForLineage.lineage.sales}</div>
                )}
                {selectedEntityForLineage.lineage.supplierReturns !== undefined && (
                  <div>- Supplier Returns: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-{selectedEntityForLineage.lineage.supplierReturns}</div>
                )}
                {selectedEntityForLineage.lineage.internalTransfers !== undefined && (
                  <div>- Internal Transfers (TR-441): &nbsp;&nbsp;&nbsp;&nbsp;-{selectedEntityForLineage.lineage.internalTransfers}</div>
                )}
                <div style={{ borderTop: '1px dashed var(--color-rule)', margin: '6px 0', paddingTop: '4px', fontWeight: '700' }}>
                  Expected Stock Balance: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{selectedEntityForLineage.lineage.expectedBalance}
                </div>
                <div style={{ fontWeight: '700' }}>
                  Physical / System Count: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{selectedEntityForLineage.lineage.actualCount}
                </div>
                <div style={{ borderTop: '1px solid var(--color-rule)', margin: '6px 0', paddingTop: '4px', fontWeight: '800', color: selectedEntityForLineage.color }}>
                  Unexplained Variance: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{selectedEntityForLineage.lineage.unexplainedVariance}
                </div>
              </div>
            </div>

            {/* Evidence Links */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px 0' }}>Evidence Documents & User Activity Trail</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {selectedEntityForLineage.lineage.evidence.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px' }}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-accent)', marginRight: '8px' }}>{ev.ref}</span>
                      <span><strong>{ev.type}:</strong> {ev.note}</span>
                    </div>
                    <span style={{ color: '#10b981', fontWeight: '700' }}>✓ Verified</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedEntityForLineage(null)}
                style={{ padding: '9px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '600', cursor: 'pointer' }}
              >
                Close Calculation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: QUARANTINE / HOLD CONFIRMATION */}
      {quarantineActionEntity && (
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
            width: '500px',
            maxWidth: '100%',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                Enforce Stock Hold / Quarantine
              </h3>
              <button onClick={() => setQuarantineActionEntity(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px' }}>Target Entity: <strong>{quarantineActionEntity.entity}</strong></div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Location: {quarantineActionEntity.location}</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Manager Audit Note / Hold Justification (Optional)
              </label>
              <textarea
                value={quarantineNote}
                onChange={e => setQuarantineNote(e.target.value)}
                placeholder="e.g. Transaction was entered twice. Second transaction should be voided."
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
              <button onClick={() => setQuarantineActionEntity(null)} style={{ padding: '9px 16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmQuarantine} style={{ padding: '9px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}>Place Stock on Hold</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
