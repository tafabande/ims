import React, { useState } from 'react';
import { 
  Sliders, 
  CreditCard, 
  ShieldCheck, 
  FileText, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Percent, 
  Building2, 
  Lock,
  Download,
  AlertTriangle
} from 'lucide-react';

export default function SalesGovernanceView({
  sales = [],
  onProcessSale,
  onShowToast,
  currentRole = 'MANAGER',
  salesPolicy = {
    maxCashierDiscountPct: 5.0,
    highValueApprovalThreshold: 1000.00,
    standardTaxRatePct: 10.0,
    zigExchangeRate: 13.50,
    allowNegativeStockSale: false
  },
  setSalesPolicy,
  gateways = [],
  setGateways
}) {
  // Manager Active Tab
  const [managerTab, setManagerTab] = useState('gateways'); // 'gateways' | 'policy_rules' | 'approvals' | 'ledger'

  // Internal Fallbacks if setters not provided
  const updatePolicy = (newPolicy) => {
    if (setSalesPolicy) setSalesPolicy(newPolicy);
  };

  const updateGateways = (updater) => {
    if (setGateways) {
      setGateways(updater);
    }
  };

  // Pending High-Value & Discount Sale Approvals Queue
  const [pendingLargeSales, setPendingLargeSales] = useState([
    {
      id: 901,
      invoice_number: 'INV-PEND-0041',
      customer_name: 'Apex Commercial Supplies',
      total_amount: 3450.00,
      discount_requested: '12% High Volume Discount',
      submitted_by: 'Charlie Staff (EMP-00014)',
      timestamp: '2026-08-26 02:15:00',
      items: [{ product_name: 'Dell XPS 15 Workstation Laptop', quantity: 3, unit_price: 1150.00 }]
    }
  ]);

  // Handlers
  const handleApproveLargeSale = (saleId) => {
    const sale = pendingLargeSales.find(s => s.id === saleId);
    if (!sale) return;

    onProcessSale?.({
      ...sale,
      payment_status: 'PAID',
      created_at: new Date().toISOString()
    });

    setPendingLargeSales(prev => prev.filter(s => s.id !== saleId));
    onShowToast?.('success', 'Sale Authorized', `Manager approved high-value sale ${sale.invoice_number} ($${sale.total_amount.toFixed(2)}).`);
  };

  const handleRejectLargeSale = (saleId) => {
    setPendingLargeSales(prev => prev.filter(s => s.id !== saleId));
    onShowToast?.('danger', 'Sale Declined', `Manager declined high-value sale.`);
  };

  const handleToggleGateway = (id) => {
    setGateways(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, enabled: !g.enabled };
      }
      return g;
    }));
    onShowToast?.('info', 'Gateway Updated', 'Payment gateway configuration updated.');
  };

  const handleUpdateSurcharge = (id, newPct) => {
    setGateways(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, surchargePct: parseFloat(newPct) || 0 };
      }
      return g;
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', margin: 0 }}>
            Sales Policy & Rates Governance Workbench
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Set currency exchange rates (ZiG), configure payment gateway surcharges, define cashier discount limits, and authorize high-value sales.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--color-paper-2)', padding: '6px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', fontSize: '12px', fontFamily: 'monospace' }}>
          <span>ZiG EXCHANGE RATE: <strong>1 USD = {salesPolicy.zigExchangeRate} ZiG</strong></span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-rule)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setManagerTab('gateways')}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            background: managerTab === 'gateways' ? 'var(--color-accent)' : 'var(--color-paper-2)',
            color: managerTab === 'gateways' ? '#fff' : 'var(--color-ink)', border: 'none',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <CreditCard size={15} /> Payment Gateways & Surcharges ({gateways.filter(g => g.enabled).length} Active)
        </button>
        <button
          onClick={() => setManagerTab('policy_rules')}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            background: managerTab === 'policy_rules' ? 'var(--color-accent)' : 'var(--color-paper-2)',
            color: managerTab === 'policy_rules' ? '#fff' : 'var(--color-ink)', border: 'none',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Sliders size={15} /> Currency Rates & Discount Policy
        </button>
        <button
          onClick={() => setManagerTab('approvals')}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            background: managerTab === 'approvals' ? 'var(--color-accent)' : 'var(--color-paper-2)',
            color: managerTab === 'approvals' ? '#fff' : 'var(--color-ink)', border: 'none',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <ShieldCheck size={15} /> Pending Sale Approvals ({pendingLargeSales.length})
        </button>
        <button
          onClick={() => setManagerTab('ledger')}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            background: managerTab === 'ledger' ? 'var(--color-accent)' : 'var(--color-paper-2)',
            color: managerTab === 'ledger' ? '#fff' : 'var(--color-ink)', border: 'none',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <FileText size={15} /> Verified Sales History Ledger
        </button>
      </div>

      {/* MANAGER TAB 1: PAYMENT GATEWAYS & SURCHARGES */}
      {managerTab === 'gateways' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 14px 0', color: 'var(--color-ink)' }}>
            Configure Payment Gateways & Cashier Surcharge Percentages
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginBottom: '16px' }}>
            Active payment gateways will be available for cashiers to select during POS checkout. Surcharges are automatically added to the customer invoice grand total.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {gateways.map(g => (
              <div key={g.id} style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-ink)' }}>{g.name}</div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-accent)' }}>{g.type}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={g.enabled}
                    onChange={() => handleToggleGateway(g.id)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </div>

                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-ink)' }}>SURCHARGE (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={g.surchargePct}
                    onChange={e => handleUpdateSurcharge(g.id, e.target.value)}
                    style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-ink)', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700' }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', marginTop: '6px' }}>
                  Scope: <strong>{g.usage}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MANAGER TAB 2: CURRENCY RATES & DISCOUNT POLICY */}
      {managerTab === 'policy_rules' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px', maxWidth: '640px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--color-ink)' }}>Sales & Exchange Rate Policy Parameters</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: 'var(--color-ink)' }}>
                ZIG EXCHANGE RATE (1 USD = X ZiG)
              </label>
              <input
                type="number"
                step="0.1"
                value={salesPolicy.zigExchangeRate}
                onChange={e => updatePolicy({ ...salesPolicy, zigExchangeRate: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-ink)', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>Official rate used to convert dual-currency cashier transactions.</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: 'var(--color-ink)' }}>
                MAX CASHIER DISCOUNT CEILING (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={salesPolicy.maxCashierDiscountPct}
                onChange={e => updatePolicy({ ...salesPolicy, maxCashierDiscountPct: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-ink)', fontSize: '13px', fontWeight: '700' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>Cashiers cannot grant discounts above this threshold without manager sign-off.</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: 'var(--color-ink)' }}>
                HIGH-VALUE SALE APPROVAL THRESHOLD ($)
              </label>
              <input
                type="number"
                step="100"
                value={salesPolicy.highValueApprovalThreshold}
                onChange={e => updatePolicy({ ...salesPolicy, highValueApprovalThreshold: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-ink)', fontSize: '13px', fontWeight: '700' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>Sales exceeding this total require manager authorization before completion.</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: 'var(--color-ink)' }}>
                STANDARD TAX RATE (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={salesPolicy.standardTaxRatePct}
                onChange={e => updatePolicy({ ...salesPolicy, standardTaxRatePct: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-ink)', fontSize: '13px', fontWeight: '700' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <input
                type="checkbox"
                checked={salesPolicy.allowNegativeStockSale}
                onChange={e => updatePolicy({ ...salesPolicy, allowNegativeStockSale: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-ink)' }}>Allow Cashier Sales of Out-Of-Stock Items (Negative Inventory Override)</label>
            </div>

            <button
              onClick={() => onShowToast?.('success', 'Policy Updated', 'Sales policy rules and exchange rates saved successfully.')}
              style={{ marginTop: '10px', padding: '10px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}
            >
              Save Sales Policy & Rates
            </button>
          </div>
        </div>
      )}

      {/* MANAGER TAB 3: PENDING APPROVALS QUEUE */}
      {managerTab === 'approvals' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 14px 0', color: 'var(--color-ink)' }}>
            Pending High-Value & Cashier Discount Sale Approvals
          </h3>
          {pendingLargeSales.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
              No pending high-value sales requiring manager sign-off.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                  <th style={{ padding: '8px' }}>INVOICE</th>
                  <th style={{ padding: '8px' }}>CUSTOMER</th>
                  <th style={{ padding: '8px' }}>TOTAL AMOUNT</th>
                  <th style={{ padding: '8px' }}>SUBMITTED BY</th>
                  <th style={{ padding: '8px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {pendingLargeSales.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-accent)' }}>{s.invoice_number}</td>
                    <td style={{ padding: '10px', color: 'var(--color-ink)' }}>{s.customer_name}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: '800', color: 'var(--color-ink)' }}>${s.total_amount.toFixed(2)}</td>
                    <td style={{ padding: '10px', color: 'var(--color-ink)' }}>{s.submitted_by}</td>
                    <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleApproveLargeSale(s.id)}
                        style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <CheckCircle size={14} /> Approve Sale
                      </button>
                      <button
                        onClick={() => handleRejectLargeSale(s.id)}
                        style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MANAGER TAB 4: VERIFIED SALES HISTORY LEDGER */}
      {managerTab === 'ledger' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Verified Completed Sales Ledger</h3>
            <button
              onClick={() => onShowToast?.('info', 'Export Started', 'Downloading sales ledger CSV...')}
              style={{ padding: '6px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                <th style={{ padding: '10px' }}>INVOICE #</th>
                <th style={{ padding: '10px' }}>CUSTOMER</th>
                <th style={{ padding: '10px' }}>TOTAL</th>
                <th style={{ padding: '10px' }}>GATEWAY</th>
                <th style={{ padding: '10px' }}>ISSUED BY</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-accent)' }}>{s.invoice_number}</td>
                  <td style={{ padding: '10px', color: 'var(--color-ink)' }}>{s.customer_name}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-ink)' }}>${s.total_amount.toFixed(2)}</td>
                  <td style={{ padding: '10px', color: 'var(--color-ink)' }}>{s.payment_method}</td>
                  <td style={{ padding: '10px', color: 'var(--color-ink)' }}>{s.user_name || 'Cashier Staff'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
