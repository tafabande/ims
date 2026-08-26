import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Key,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Database,
  FileText,
  Clock,
  Layers,
  Lock,
  Search,
  Eye,
  Plus
} from 'lucide-react';

export default function ImportCenterView({ onShowToast, currentRole }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'upload' | 'history' | 'templates' | 'api_keys'
  const [selectedEntity, setSelectedEntity] = useState('PRODUCTS');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileHash, setFileHash] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  
  // Staged Preview State
  const [stagedBatch, setStagedBatch] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [sampleHeaders, setSampleHeaders] = useState([]);

  // Staged Batches History
  const [batches, setBatches] = useState([]);
  const [apiAccounts, setApiAccounts] = useState([]);
  
  // New API Key Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newScopes, setNewScopes] = useState(['products:read', 'sales:create']);
  const [issuedKeySecret, setIssuedKeySecret] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    // Simulate SHA-256 Hash calculation & Headers preview
    const fakeHash = "8786892d5e040ac050bcc81f6bfbe6cce293a3828fe839edde1f1d3a5141af94";
    setFileHash(fakeHash);

    if (selectedEntity === 'PRODUCTS') {
      setSampleHeaders(["Item Code", "Product Description", "Cost Price", "Retail Price", "Stock Qty"]);
      setColumnMapping({
        "Item Code": "sku",
        "Product Description": "name",
        "Cost Price": "purchase_price",
        "Retail Price": "selling_price",
        "Stock Qty": "reorder_level"
      });
    } else if (selectedEntity === 'EMPLOYEES') {
      setSampleHeaders(["Employee No", "First Name", "Last Name", "Email", "Job Title", "Department"]);
      setColumnMapping({
        "Employee No": "employee_code",
        "First Name": "first_name",
        "Last Name": "last_name",
        "Email": "email",
        "Job Title": "job_title",
        "Department": "department"
      });
    }

    onShowToast(`File '${file.name}' loaded. Ready for column mapping & validation.`, 'info');
  };

  const handleRunValidation = () => {
    const batchId = `IMP-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newBatch = {
      id: Date.now(),
      batch_id: batchId,
      filename: uploadedFile ? uploadedFile.name : `${selectedEntity.toLowerCase()}_import.csv`,
      entity_type: selectedEntity,
      record_count: 24,
      valid_count: 23,
      rejected_count: 1,
      status: 'REQUIRES_CORRECTION',
      created_at: new Date().toISOString(),
      is_duplicate: isDuplicate
    };
    setStagedBatch(newBatch);
    setBatches([newBatch, ...batches]);
    onShowToast(`Validation complete for ${batchId}. 23 records valid, 1 rejected.`, 'warning');
  };

  const handleApproveBatch = (batchId) => {
    setBatches(batches.map(b => b.batch_id === batchId ? { ...b, status: 'APPROVED', approved_at: new Date().toISOString() } : b));
    if (stagedBatch && stagedBatch.batch_id === batchId) {
      setStagedBatch({ ...stagedBatch, status: 'APPROVED' });
    }
    onShowToast(`Import Batch ${batchId} approved! Promoted 23 records to core production database.`, 'success');
  };

  const handleCreateApiAccount = (e) => {
    e.preventDefault();
    if (!newAccountName) return;

    const accId = `INT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const secretKey = `ims_live_${Math.random().toString(36).substring(2, 18)}_${Math.random().toString(36).substring(2, 18)}`;

    const newAcc = {
      id: Date.now(),
      account_id: accId,
      name: newAccountName,
      status: 'ACTIVE',
      scopes: newScopes,
      created_at: new Date().toISOString()
    };

    setApiAccounts([...apiAccounts, newAcc]);
    setIssuedKeySecret(secretKey);
    onShowToast(`Integration Account '${newAccountName}' created with API Key.`, 'success');
  };

  const handleDownloadTemplate = (entity) => {
    onShowToast(`Downloading official IMS CSV template for ${entity}...`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Enterprise Data Import Center & Integrations Hub
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Controlled data ingestion layer with dynamic column mapping, SHA-256 deduplication, staging validation & API integrations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 active:scale-95"
          >
            <UploadCloud className="w-4 h-4" />
            Import New File
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'dashboard'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-4 h-4" />
          Data Intake Dashboard
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'upload'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Import Center & Mapping
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Clock className="w-4 h-4" />
          Import History & Staging ({batches.length})
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'templates'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Download className="w-4 h-4" />
          Templates & Data Export
        </button>

        <button
          onClick={() => setActiveTab('api_keys')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'api_keys'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Key className="w-4 h-4" />
          API Accounts & Keys ({apiAccounts.length})
        </button>
      </div>

      {/* TAB 1: DATA INTAKE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Batches</span>
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">
                {batches.filter(b => b.status !== 'APPROVED').length}
              </div>
              <p className="text-xs text-slate-400 mt-1">Awaiting manager approval</p>
            </div>

            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Validation Errors</span>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">
                {batches.reduce((acc, b) => acc + (b.rejected_count || 0), 0)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Staged row corrections required</p>
            </div>

            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Records</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">
                {batches.filter(b => b.status === 'APPROVED').reduce((acc, b) => acc + (b.valid_count || 0), 0)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Promoted to core PostgreSQL DB</p>
            </div>

            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">API Integration Keys</span>
                <Key className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{apiAccounts.length}</div>
              <p className="text-xs text-slate-400 mt-1">Scoped REST service accounts</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IMPORT CENTER & COLUMN MAPPING */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 space-y-6">
            <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-cyan-400" />
              1. Select Data Entity & Upload CSV / Excel Payload
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['PRODUCTS', 'EMPLOYEES', 'SUPPLIERS', 'CUSTOMERS', 'OPENING_STOCK', 'PURCHASES', 'SALES'].map(entity => (
                <button
                  key={entity}
                  onClick={() => setSelectedEntity(entity)}
                  className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    selectedEntity === entity
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {entity.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* File Dropzone */}
            <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 p-8 rounded-2xl text-center bg-slate-950/40 transition-all">
              <input
                type="file"
                accept=".csv,.xlsx"
                id="file-upload-input"
                className="hidden"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload-input" className="cursor-pointer space-y-3 block">
                <FileSpreadsheet className="w-12 h-12 text-cyan-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-200">
                  {uploadedFile ? uploadedFile.name : "Click to browse or drag & drop CSV/Excel file"}
                </div>
                <p className="text-xs text-slate-400">Supports .csv and .xlsx spreadsheets. Max file size: 50MB.</p>
              </label>
            </div>

            {uploadedFile && (
              <div className="space-y-6 border-t border-slate-800 pt-6">
                <div className="flex items-center justify-between bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs font-mono text-cyan-400 font-bold">SHA-256 FINGERPRINT</span>
                    <div className="text-xs font-mono text-slate-300 mt-1">{fileHash}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsDuplicate(!isDuplicate)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${
                        isDuplicate ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isDuplicate ? '⚠️ Duplicate File Detected' : '✓ Unique Payload Hash'}
                    </button>
                  </div>
                </div>

                {/* Column Mapper */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-200">2. Dynamic Vendor Column Mapping</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sampleHeaders.map(header => (
                      <div key={header} className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                        <span className="font-semibold text-slate-300">{header}</span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                        <span className="font-mono text-cyan-400 font-bold">{columnMapping[header] || 'Unmapped'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRunValidation}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10"
                >
                  Run Staging Validation & Format Verification
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: IMPORT HISTORY & PENDING APPROVALS */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Import History & Staging Audit Trail
          </h3>

          {batches.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No import batches staged. Upload a file from the Import Center to begin.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {batches.map(b => (
                <div key={b.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{b.batch_id}</span>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300">{b.entity_type}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200 mt-1">{b.filename}</div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Total: {b.record_count} | Valid: {b.valid_count} | Rejected: {b.rejected_count} | Uploaded: {b.created_at}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      b.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {b.status}
                    </span>

                    {b.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleApproveBatch(b.batch_id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 active:scale-95"
                      >
                        Manager Approve & Import
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TEMPLATES & DATA EXPORT */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Download className="w-5 h-5 text-cyan-400" />
              Download Standard Import Templates (.CSV)
            </h3>
            <p className="text-sm text-slate-400">
              Download official CSV templates pre-populated with standard headers and sample instruction rows.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {['PRODUCTS', 'EMPLOYEES', 'SUPPLIERS', 'CUSTOMERS', 'OPENING_STOCK', 'PURCHASES', 'SALES'].map(entity => (
                <button
                  key={entity}
                  onClick={() => handleDownloadTemplate(entity)}
                  className="flex items-center justify-between bg-slate-950/60 p-4 rounded-xl border border-slate-800 hover:border-cyan-500/50 transition-all text-xs font-semibold text-slate-200 group"
                >
                  <span>{entity.replace('_', ' ')} Template</span>
                  <Download className="w-4 h-4 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: API ACCOUNTS & KEYS */}
      {activeTab === 'api_keys' && (
        <div className="space-y-6">
          <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  Integration Accounts & Scoped API Keys
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Issue API Keys for external software systems (Accounting ERP, POS, WMS).
                </p>
              </div>
              <button
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-cyan-600/10 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Create Integration Account
              </button>
            </div>

            {apiAccounts.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                No integration service accounts created yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {apiAccounts.map(acc => (
                  <div key={acc.id} className="py-4 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-cyan-400">{acc.account_id}</span>
                      <h4 className="text-sm font-semibold text-slate-200">{acc.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {acc.scopes.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {acc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE API ACCOUNT MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100">New Integration Service Account</h3>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleCreateApiAccount} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Account / System Name</label>
                <input
                  type="text"
                  placeholder="e.g. Accounting ERP System"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {issuedKeySecret && (
                <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/40 space-y-2">
                  <span className="text-xs font-mono text-cyan-400 font-bold">API KEY SECRET (SHOWN ONCE)</span>
                  <div className="font-mono text-xs text-amber-400 select-all break-all">{issuedKeySecret}</div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
