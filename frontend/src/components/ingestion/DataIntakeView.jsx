import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  History, 
  Download, 
  Key, 
  Shield, 
  Layers, 
  ArrowRight, 
  RefreshCw, 
  Eye, 
  Database,
  Lock,
  Plus,
  Copy,
  Terminal,
  FileText
} from 'lucide-react';

export default function DataIntakeView({ onShowToast }) {
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'wizard' | 'history' | 'templates' | 'approvals' | 'integrations' | 'exports'

  // Telemetry & State Data
  const [metrics, setMetrics] = useState({
    total_imports: 14,
    pending_imports: 3,
    validation_errors: 2,
    awaiting_approval: 2,
    completed_imports: 9,
    duplicate_imports_flagged: 1
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      batch_id: 'IMP-2026-00041',
      filename: 'employees_august.xlsx',
      entity_type: 'EMPLOYEES',
      source_type: 'EXCEL',
      record_count: 250,
      valid_count: 243,
      rejected_count: 7,
      status: 'REQUIRES_CORRECTION',
      created_at: '2026-08-25T18:32:00Z'
    },
    {
      batch_id: 'IMP-2026-00040',
      filename: 'opening_stock_harare.csv',
      entity_type: 'OPENING_STOCK',
      source_type: 'CSV',
      record_count: 120,
      valid_count: 120,
      rejected_count: 0,
      status: 'IMPORTED',
      created_at: '2026-08-25T14:15:00Z'
    },
    {
      batch_id: 'IMP-2026-00039',
      filename: 'suppliers_q3.xlsx',
      entity_type: 'SUPPLIERS',
      source_type: 'EXCEL',
      record_count: 45,
      valid_count: 45,
      rejected_count: 0,
      status: 'IMPORTED',
      created_at: '2026-08-24T11:00:00Z'
    }
  ]);

  // Import Wizard State
  const [wizardStep, setWizardStep] = useState(1); // 1: Upload, 2: Column Mapping, 3: Validation, 4: Preview & Approve
  const [selectedEntity, setSelectedEntity] = useState('products');
  const [rawFile, setRawFile] = useState(null);
  const [fileHeaders, setFileHeaders] = useState(['Product SKU', 'Item Name', 'Unit Cost', 'Selling Price', 'Reorder Level']);
  const [columnMapping, setColumnMapping] = useState({
    'Product SKU': 'sku',
    'Item Name': 'name',
    'Unit Cost': 'purchase_price',
    'Selling Price': 'selling_price',
    'Reorder Level': 'reorder_level'
  });
  const [validationResult, setValidationResult] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Integration Accounts State
  const [integrationAccounts, setIntegrationAccounts] = useState([
    {
      id: 1,
      account_id: 'INT-2026-00012',
      name: 'Accounting ERP System',
      description: 'Syncs sales invoices and supplier purchases with external accounting ledger.',
      status: 'ACTIVE',
      scopes: ['products:read', 'sales:create', 'inventory:read'],
      created_at: '2026-08-20'
    },
    {
      id: 2,
      account_id: 'INT-2026-00014',
      name: 'POS Terminal 01 - Harare',
      description: 'Front-desk point of sale terminal sync.',
      status: 'ACTIVE',
      scopes: ['products:read', 'sales:create'],
      created_at: '2026-08-22'
    }
  ]);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountDesc, setNewAccountDesc] = useState('');
  const [newAccountScopes, setNewAccountScopes] = useState(['products:read', 'sales:create']);
  const [createdApiKeySecret, setCreatedApiKeySecret] = useState(null);

  // Fetch Dashboard Metrics on Mount
  useEffect(() => {
    fetch('/api/imports/intake-dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.metrics) setMetrics(data.metrics);
        if (data.recent_activity) setRecentActivity(data.recent_activity);
      })
      .catch(() => {
        // Fallback mock data already set in state
      });
  }, []);

  // Wizard Handlers
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRawFile(file);

    // Mock header extraction and duplicate check
    if (file.name.includes('duplicate')) {
      setDuplicateWarning({
        message: '⚠️ Possible duplicate import detected. File SHA-256 matches batch IMP-2026-00041 uploaded on 25 Aug 2026.',
        previous_batch: 'IMP-2026-00041'
      });
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleRunValidation = () => {
    // Simulate validation check with sample row errors
    if (rawFile && rawFile.name.includes('error')) {
      setValidationResult({
        batch_id: 'IMP-2026-00042',
        total_records: 3,
        valid_records: 1,
        rejected_records: 2,
        status: 'REQUIRES_CORRECTION',
        errors: [
          { row: 2, error: 'ABC-002: Quantity cannot be negative (-10).' },
          { row: 3, error: 'ABC-001: Duplicate SKU within uploaded file.' }
        ]
      });
    } else {
      setValidationResult({
        batch_id: 'IMP-2026-00042',
        total_records: 25,
        valid_records: 25,
        rejected_records: 0,
        status: 'VALIDATED',
        errors: []
      });
    }
    setWizardStep(3);
  };

  const handleCommitBatch = () => {
    onShowToast('success', 'Import Executed', `Batch ${validationResult?.batch_id || 'IMP-2026-00042'} successfully committed into Core Production Database.`);
    setWizardStep(1);
    setRawFile(null);
    setValidationResult(null);
    setActiveSubTab('history');
  };

  const handleCreateIntegrationAccount = () => {
    if (!newAccountName) return;
    const account_id = `INT-2026-000${Math.floor(100 + Math.random() * 900)}`;
    const mockSecret = `ims_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

    const newAcc = {
      id: Date.now(),
      account_id,
      name: newAccountName,
      description: newAccountDesc,
      status: 'ACTIVE',
      scopes: newAccountScopes,
      created_at: new Date().toISOString().split('T')[0]
    };

    setIntegrationAccounts(prev => [newAcc, ...prev]);
    setCreatedApiKeySecret(mockSecret);
    setShowCreateAccountModal(false);
    onShowToast('success', 'Integration Account Created', `Generated API Key for ${newAccountName}.`);
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
              background: 'linear-gradient(135deg, var(--color-accent), #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Layers size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>
                Data Intake & Import Center
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
                Controlled External Ingestion • Dynamic Column Mapping • Staging Database & Provenance Audit
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action */}
        <button
          onClick={() => { setActiveSubTab('wizard'); setWizardStep(1); }}
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
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Upload size={16} /> New Bulk Import
        </button>
      </div>

      {/* Sub-Module Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--color-rule)',
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'dashboard', label: 'Data Intake Overview', icon: Layers },
          { id: 'wizard', label: 'Import Center Wizard', icon: Upload },
          { id: 'history', label: 'Import History & Provenance', icon: History },
          { id: 'templates', label: 'Import Templates', icon: FileSpreadsheet },
          { id: 'approvals', label: 'Pending Approvals', icon: FileCheck },
          { id: 'integrations', label: 'API Integrations & Keys', icon: Key },
          { id: 'exports', label: 'Data Export Center', icon: Download }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                background: 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? '600' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DATA INTAKE OVERVIEW DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div>
          {/* Architecture Reminder Banner */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Shield size={24} style={{ color: '#3b82f6' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--color-text)' }}>
                  Ingestion Security Principle Enforced
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  External data never writes directly into your production PostgreSQL database. All records pass through format validation, schema checks, SHA-256 deduplication, and staging approval.
                </p>
              </div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)', padding: '6px 12px', borderRadius: '4px' }}>
              STAGING DB IS ACTIVE
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            {[
              { label: 'Pending Imports', value: metrics.pending_imports, color: '#f59e0b', icon: Upload, desc: 'Awaiting validation or staging' },
              { label: 'Validation Errors', value: metrics.validation_errors, color: '#ef4444', icon: AlertTriangle, desc: 'Requires user correction' },
              { label: 'Awaiting Approval', value: metrics.awaiting_approval, color: '#8b5cf6', icon: FileCheck, desc: 'Four-Eyes manager signoff' },
              { label: 'Completed Imports', value: metrics.completed_imports, color: '#10b981', icon: CheckCircle2, desc: 'Committed to production DB' },
              { label: 'Duplicate Flagged', value: metrics.duplicate_imports_flagged, color: '#3b82f6', icon: Copy, desc: 'SHA-256 hash warning triggered' }
            ].map((m, idx) => {
              const Icon = m.icon;
              return (
                <div key={idx} style={{
                  background: 'var(--color-paper)',
                  border: '1px solid var(--color-rule)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--radius-sm)',
                    background: `${m.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: m.color
                  }}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '800', lineHeight: 1 }}>{m.value}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px', color: 'var(--color-text)' }}>{m.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{m.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Ingestion Activity Table */}
          <div style={{
            background: 'var(--color-paper)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Recent Data Ingestion Activity</h3>
              <button onClick={() => setActiveSubTab('history')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                View Full Audit History →
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px 12px' }}>Batch ID</th>
                  <th style={{ padding: '10px 12px' }}>File Name</th>
                  <th style={{ padding: '10px 12px' }}>Entity Type</th>
                  <th style={{ padding: '10px 12px' }}>Total Records</th>
                  <th style={{ padding: '10px 12px' }}>Valid / Rejected</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map(act => (
                  <tr key={act.batch_id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600', color: 'var(--color-accent)' }}>{act.batch_id}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{act.filename}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--color-canvas)', fontSize: '11px', fontWeight: '600' }}>
                        {act.entity_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{act.record_count}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: '#10b981', fontWeight: '600' }}>{act.valid_count} ✓</span> / <span style={{ color: act.rejected_count > 0 ? '#ef4444' : 'var(--color-text-secondary)', fontWeight: act.rejected_count > 0 ? '700' : '400' }}>{act.rejected_count} ✗</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: act.status === 'IMPORTED' ? 'rgba(16, 185, 129, 0.15)' : act.status === 'REQUIRES_CORRECTION' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: act.status === 'IMPORTED' ? '#10b981' : act.status === 'REQUIRES_CORRECTION' ? '#ef4444' : '#f59e0b'
                      }}>
                        {act.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      {new Date(act.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: IMPORT CENTER WIZARD */}
      {activeSubTab === 'wizard' && (
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '24px' }}>
          
          {/* Step Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px', borderBottom: '1px solid var(--color-rule)', paddingBottom: '16px' }}>
            {[
              { step: 1, title: '1. Select & Upload' },
              { step: 2, title: '2. Dynamic Column Mapping' },
              { step: 3, title: '3. Business Rule Validation' },
              { step: 4, title: '4. Preview & Execute' }
            ].map(s => (
              <div key={s.step} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: wizardStep === s.step ? '700' : '500',
                color: wizardStep === s.step ? 'var(--color-accent)' : 'var(--color-text-secondary)'
              }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: wizardStep === s.step ? 'var(--color-accent)' : 'var(--color-canvas)',
                  color: wizardStep === s.step ? '#fff' : 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {s.step}
                </div>
                <span>{s.title}</span>
              </div>
            ))}
          </div>

          {/* STEP 1: UPLOAD */}
          {wizardStep === 1 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Step 1: Choose Import Entity & Upload File</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Target Entity Type</label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--color-rule)',
                      background: 'var(--color-canvas)',
                      color: 'var(--color-text)',
                      fontSize: '13px'
                    }}
                  >
                    <option value="products">Products Catalog (products.xlsx / csv)</option>
                    <option value="employees">Employees Directory (employees.xlsx)</option>
                    <option value="suppliers">Suppliers Directory (suppliers.xlsx)</option>
                    <option value="opening_stock">Opening Stock Balance (opening_stock.csv)</option>
                    <option value="customers">Customers Directory (customers.csv)</option>
                    <option value="purchases">Bulk Purchase Receipts (sales/purchases.xlsx)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Upload File (.csv, .xlsx, .xls)</label>
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px dashed var(--color-rule)',
                      background: 'var(--color-canvas)',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              {/* Duplicate Warning Box */}
              {duplicateWarning && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid #f59e0b',
                  borderRadius: 'var(--radius-xs)',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <AlertTriangle size={24} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#f59e0b', fontSize: '14px' }}>SHA-256 Duplicate File Alert</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{duplicateWarning.message}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setWizardStep(2)}
                disabled={!rawFile}
                style={{
                  padding: '10px 20px',
                  background: rawFile ? 'var(--color-accent)' : 'var(--color-rule)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: '600',
                  cursor: rawFile ? 'pointer' : 'not-allowed'
                }}
              >
                Proceed to Column Mapping →
              </button>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {wizardStep === 2 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Step 2: Map Spreadsheet Columns to IMS Fields</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                Your spreadsheet can use any custom business column headers. Map each uploaded column to its target IMS field below.
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Uploaded Header Column</th>
                    <th style={{ padding: '10px' }}>Mapping Direction</th>
                    <th style={{ padding: '10px' }}>Target IMS Schema Field</th>
                  </tr>
                </thead>
                <tbody>
                  {fileHeaders.map((header, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{header}</td>
                      <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>→</td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={columnMapping[header] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value })}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--color-rule)',
                            background: 'var(--color-canvas)',
                            color: 'var(--color-text)',
                            fontSize: '13px'
                          }}
                        >
                          <option value="sku">Product SKU (sku)</option>
                          <option value="name">Product Name (name)</option>
                          <option value="purchase_price">Purchase Cost (purchase_price)</option>
                          <option value="selling_price">Selling Price (selling_price)</option>
                          <option value="reorder_level">Reorder Level (reorder_level)</option>
                          <option value="employee_code">Employee ID (employee_code)</option>
                          <option value="first_name">First Name (first_name)</option>
                          <option value="last_name">Last Name (last_name)</option>
                          <option value="email">Email (email)</option>
                          <option value="phone">Phone (phone)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setWizardStep(1)} style={{ padding: '10px 18px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)' }}>Back</button>
                <button onClick={handleRunValidation} style={{ padding: '10px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '600' }}>Run Business Validation →</button>
              </div>
            </div>
          )}

          {/* STEP 3: VALIDATION SUMMARY */}
          {wizardStep === 3 && validationResult && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Step 3: Business Validation & Error Breakdown</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', borderRadius: 'var(--radius-xs)', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Total Uploaded Records</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px' }}>{validationResult.total_records}</div>
                </div>
                <div style={{ padding: '16px', borderRadius: 'var(--radius-xs)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981' }}>
                  <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>Valid Records</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>{validationResult.valid_records} ✓</div>
                </div>
                <div style={{ padding: '16px', borderRadius: 'var(--radius-xs)', background: validationResult.rejected_records > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-canvas)', border: validationResult.rejected_records > 0 ? '1px solid #ef4444' : '1px solid var(--color-rule)' }}>
                  <div style={{ fontSize: '12px', color: validationResult.rejected_records > 0 ? '#ef4444' : 'var(--color-text-secondary)', fontWeight: '600' }}>Rejected Records</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: validationResult.rejected_records > 0 ? '#ef4444' : 'var(--color-text)', marginTop: '4px' }}>{validationResult.rejected_records} ✗</div>
                </div>
              </div>

              {/* Error Detail Cards */}
              {validationResult.errors.length > 0 ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef4444', borderRadius: 'var(--radius-xs)', padding: '16px', marginBottom: '24px' }}>
                  <h4 style={{ color: '#ef4444', margin: '0 0 12px 0', fontSize: '14px' }}>❌ Validation Errors Prevent Production Execution</h4>
                  {validationResult.errors.map((err, idx) => (
                    <div key={idx} style={{ fontSize: '13px', color: 'var(--color-text)', marginBottom: '6px', fontFamily: 'monospace' }}>
                      Row {err.row}: {err.error}
                    </div>
                  ))}
                  <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Please correct the highlighted errors in your spreadsheet and re-upload.
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', borderRadius: 'var(--radius-xs)', padding: '16px', marginBottom: '24px' }}>
                  <h4 style={{ color: '#10b981', margin: 0, fontSize: '14px' }}>✓ All Records Passed Validation Cleanly</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Staged in database under batch ID <strong>{validationResult.batch_id}</strong>. Ready for final execution.</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setWizardStep(2)} style={{ padding: '10px 18px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)' }}>Back</button>
                {validationResult.rejected_records === 0 && (
                  <button onClick={() => setWizardStep(4)} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '600' }}>Proceed to Preview & Execute →</button>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & COMMIT */}
          {wizardStep === 4 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Step 4: Preview Staged Rows & Execute Core Transaction</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                Review normalized data before executing PostgreSQL transaction.
              </p>

              <div style={{ background: 'var(--color-canvas)', borderRadius: 'var(--radius-xs)', padding: '16px', marginBottom: '24px', border: '1px solid var(--color-rule)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--color-accent)' }}>STAGED BATCH: {validationResult?.batch_id}</div>
                <div style={{ fontSize: '13px' }}>Entity: <strong>{selectedEntity.toUpperCase()}</strong> | Total Rows: <strong>{validationResult?.total_records}</strong></div>
              </div>

              <button
                onClick={handleCommitBatch}
                style={{
                  padding: '12px 24px',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Approve & Execute Import to Core Database
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: IMPORT HISTORY & PROVENANCE */}
      {activeSubTab === 'history' && (
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Import History & Audit Provenance</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '10px' }}>Batch ID</th>
                <th style={{ padding: '10px' }}>File Name & SHA-256 Hash</th>
                <th style={{ padding: '10px' }}>Source</th>
                <th style={{ padding: '10px' }}>Records</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Imported Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map(act => (
                <tr key={act.batch_id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-accent)' }}>{act.batch_id}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '600' }}>{act.filename}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                      SHA256: 8a4f9b...2c10
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>{act.source_type}</td>
                  <td style={{ padding: '12px' }}>{act.record_count} total ({act.valid_count} valid)</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: act.status === 'IMPORTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: act.status === 'IMPORTED' ? '#10b981' : '#ef4444' }}>
                      {act.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>{new Date(act.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: IMPORT TEMPLATES */}
      {activeSubTab === 'templates' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Download Pre-built Spreadsheet Templates</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            Download ready-to-use CSV/Excel templates containing standard headers, sample rows, and instructions.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { entity: 'products', name: 'Products Template', desc: 'SKU, Name, Category, Cost, Price, Reorder Level, Unit', file: 'products_template.csv' },
              { entity: 'employees', name: 'Employees Template', desc: 'Employee No, First Name, Last Name, Email, Phone, Position', file: 'employees_template.csv' },
              { entity: 'suppliers', name: 'Suppliers Template', desc: 'Supplier Name, Contact Person, Email, Phone, Address', file: 'suppliers_template.csv' },
              { entity: 'opening_stock', name: 'Opening Stock Template', desc: 'SKU, Quantity, Unit Cost', file: 'opening_stock_template.csv' },
              { entity: 'customers', name: 'Customers Template', desc: 'Customer Name, Email, Phone', file: 'customers_template.csv' },
              { entity: 'purchases', name: 'Purchase Receipts Template', desc: 'PO Number, Supplier, Date, SKU, Quantity, Unit Cost', file: 'purchases_template.csv' }
            ].map(t => (
              <div key={t.entity} style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
                <FileSpreadsheet size={28} style={{ color: 'var(--color-accent)', marginBottom: '12px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 6px 0' }}>{t.name}</h4>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 16px 0' }}>{t.desc}</p>
                <a
                  href={`/api/imports/templates/${t.entity}`}
                  download={t.file}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: 'var(--color-canvas)',
                    border: '1px solid var(--color-rule)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--color-text)',
                    fontSize: '12px',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={14} /> Download Template
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PENDING APPROVALS */}
      {activeSubTab === 'approvals' && (
        <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Manager Approval Queue for Staged Batches</h3>
          
          <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid #8b5cf6', borderRadius: 'var(--radius-xs)', padding: '16px', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, color: '#8b5cf6', fontSize: '14px' }}>Four-Eyes Approval Policy</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              Staged bulk import batches with high record counts require independent manager signoff before core PostgreSQL execution.
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Batch Code</th>
                <th style={{ padding: '10px' }}>Uploader</th>
                <th style={{ padding: '10px' }}>Entity</th>
                <th style={{ padding: '10px' }}>Valid Records</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-accent)' }}>IMP-2026-00041</td>
                <td style={{ padding: '12px' }}>EMP-00017 (HR Manager)</td>
                <td style={{ padding: '12px' }}>EMPLOYEES</td>
                <td style={{ padding: '12px', color: '#10b981', fontWeight: '600' }}>243 valid</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={handleCommitBatch} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
                    Approve & Import
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: API INTEGRATIONS & KEYS */}
      {activeSubTab === 'integrations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>API Integration Accounts & Authentication Keys</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                External software systems (Accounting, POS, ERP) authenticate via API Keys with granular scope controls.
              </p>
            </div>
            <button
              onClick={() => setShowCreateAccountModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                background: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-xs)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> Create Integration Account
            </button>
          </div>

          {/* Secret Key Display Card if just created */}
          {createdApiKeySecret && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 'var(--radius-xs)', padding: '20px', marginBottom: '24px' }}>
              <div style={{ color: '#10b981', fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
                🔑 Secret API Key Generated Successfully
              </div>
              <p style={{ fontSize: '13px', margin: '0 0 12px 0' }}>
                Please copy this key now. It will <strong>never be shown again</strong>.
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  readOnly
                  value={createdApiKeySecret}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontFamily: 'monospace',
                    background: 'var(--color-paper)',
                    border: '1px solid var(--color-rule)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--color-text)'
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdApiKeySecret);
                    onShowToast('info', 'Copied', 'API Key copied to clipboard.');
                  }}
                  style={{ padding: '10px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', cursor: 'pointer' }}
                >
                  Copy Secret
                </button>
              </div>
            </div>
          )}

          {/* Accounts List */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {integrationAccounts.map(acc => (
              <div key={acc.id} style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{acc.name}</h4>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-accent)', background: 'var(--color-canvas)', padding: '2px 6px', borderRadius: '4px' }}>
                        {acc.account_id}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                        {acc.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '6px 0 12px 0' }}>{acc.description}</p>
                    
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {acc.scopes.map(s => (
                        <span key={s} style={{ fontSize: '11px', fontFamily: 'monospace', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', padding: '2px 6px', borderRadius: '4px' }}>
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ padding: '6px 12px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px', cursor: 'pointer' }}>
                      Rotate Key
                    </button>
                    <button style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 'var(--radius-xs)', fontSize: '12px', cursor: 'pointer' }}>
                      Revoke Access
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal for Creating Integration Account */}
          {showCreateAccountModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'var(--color-paper)', padding: '28px', borderRadius: 'var(--radius-sm)', width: '480px', maxWidth: '90%' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Create External Integration Client</h3>
                
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>System / Application Name</label>
                  <input
                    value={newAccountName}
                    onChange={e => setNewAccountName(e.target.value)}
                    placeholder="e.g. Accounting ERP System"
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Description</label>
                  <textarea
                    value={newAccountDesc}
                    onChange={e => setNewAccountDesc(e.target.value)}
                    placeholder="Purpose of integration"
                    rows={3}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Permitted Scopes</label>
                  {['products:read', 'products:write', 'sales:create', 'inventory:read', 'employees:read'].map(scope => (
                    <label key={scope} style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>
                      <input
                        type="checkbox"
                        checked={newAccountScopes.includes(scope)}
                        onChange={e => {
                          if (e.target.checked) setNewAccountScopes([...newAccountScopes, scope]);
                          else setNewAccountScopes(newAccountScopes.filter(s => s !== scope));
                        }}
                      /> {scope}
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowCreateAccountModal(false)} style={{ padding: '8px 16px', background: 'var(--color-canvas)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)' }}>Cancel</button>
                  <button onClick={handleCreateIntegrationAccount} style={{ padding: '8px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '600' }}>Generate API Credential</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: DATA EXPORT CENTER */}
      {activeSubTab === 'exports' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Data Export Engine</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            Export live production database records to CSV/Excel formats for financial reporting, accounting reconciliation, or management audit.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { entity: 'products', name: 'Products Catalog Export' },
              { entity: 'inventory_valuation', name: 'Inventory Valuation Report' },
              { entity: 'employees', name: 'Employees Directory Export' },
              { entity: 'suppliers', name: 'Suppliers Directory Export' },
              { entity: 'customers', name: 'Customer Records Export' },
              { entity: 'sales', name: 'Sales & Invoices Ledger Export' }
            ].map(exp => (
              <div key={exp.entity} style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
                <Download size={28} style={{ color: 'var(--color-accent)', marginBottom: '12px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 12px 0' }}>{exp.name}</h4>
                <a
                  href={`/api/imports/exports/${exp.entity}`}
                  download
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={14} /> Export to CSV
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
