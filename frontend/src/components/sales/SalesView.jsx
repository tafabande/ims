import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  CheckCircle, 
  Plus, 
  Minus, 
  Receipt, 
  CreditCard, 
  DollarSign, 
  User, 
  Download,
  AlertTriangle,
  Settings,
  ShieldCheck,
  Building2,
  X,
  Check,
  Percent,
  Sliders,
  FileText,
  Lock
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import { can } from '../../utils/permissions';

export default function SalesView({ 
  products = [], 
  customers = [], 
  sales = [], 
  onProcessSale, 
  onExportCSV,
  currentRole = 'STAFF',
  onShowToast
}) {
  const isManager = can(currentRole, 'sales.policy') || can(currentRole, 'attention.decide');

  // Active Tab State
  const [managerTab, setManagerTab] = useState('gateways'); // 'gateways' | 'policy_rules' | 'approvals' | 'ledger'
  const [staffTab, setStaffTab] = useState('pos'); // 'pos' | 'history'

  // POS Checkout State (For Cashier Staff Only)
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(customers[0]?.id || 1);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Manager Policy & Gateways State
  const [gateways, setGateways] = useState([
    { id: 'cash', name: 'Cash (USD / ZiG)', type: 'CASH', surchargePct: 0.0, enabled: true, usage: 'BOTH' },
    { id: 'ecocash', name: 'EcoCash Mobile Money', type: 'MOBILE_WALLET', surchargePct: 2.5, enabled: true, usage: 'BOTH' },
    { id: 'telecash', name: 'Telecash Mobile', type: 'MOBILE_WALLET', surchargePct: 2.0, enabled: true, usage: 'CUSTOMER' },
    { id: 'onemoney', name: 'OneMoney NetOne', type: 'MOBILE_WALLET', surchargePct: 2.0, enabled: true, usage: 'CUSTOMER' },
    { id: 'omari', name: 'O\'Mari Mobile Wallet', type: 'MOBILE_WALLET', surchargePct: 1.8, enabled: true, usage: 'CUSTOMER' },
    { id: 'innbucks', name: 'InnBucks Retail Voucher', type: 'RETAIL_WALLET', surchargePct: 1.0, enabled: true, usage: 'BOTH' },
    { id: 'card_local', name: 'Debit / Credit Card (Local EFTPOS)', type: 'CARD', surchargePct: 1.5, enabled: true, usage: 'BOTH' },
    { id: 'zipit', name: 'Inter-Bank ZIPIT Transfer', type: 'BANK_INTERBANK', surchargePct: 1.0, enabled: true, usage: 'BOTH' },
    { id: 'rtgs', name: 'RTGS Electronic Bank Transfer', type: 'BANK_DOMESTIC', surchargePct: 0.5, enabled: true, usage: 'BOTH' },
    { id: 'nostro', name: 'Nostro FCA USD Wire', type: 'BANK_NOSTRO', surchargePct: 0.0, enabled: true, usage: 'SUPPLIER' },
    { id: 'intl_tt', name: 'International Telegraphic Wire (TT)', type: 'BANK_INTL', surchargePct: 3.0, enabled: true, usage: 'SUPPLIER' }
  ]);

  const [selectedGatewayId, setSelectedGatewayId] = useState('cash');

  // Policy Settings (Manager Editable)
  const [salesPolicy, setSalesPolicy] = useState({
    maxCashierDiscountPct: 5.0,
    highValueApprovalThreshold: 1000.00,
    standardTaxRatePct: 10.0,
    zigExchangeRate: 13.50,
    allowNegativeStockSale: false
  });

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

  // Cashier POS Handlers
  const activeGateway = gateways.find(g => g.id === selectedGatewayId) || gateways[0];

  const addToCart = (product) => {
    setValidationError('');
    const existing = cart.find(item => item.product_id === product.id);
    
    if (existing) {
      if (existing.quantity + 1 > product.stock_quantity && !salesPolicy.allowNegativeStockSale) {
        const msg = `Unable to add unit: ${product.name} has only ${product.stock_quantity} units available.`;
        setValidationError(msg);
        onShowToast?.(msg, 'danger');
        return;
      }
      setCart(cart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stock_quantity < 1 && !salesPolicy.allowNegativeStockSale) {
        const msg = `Cannot sell ${product.name}: Item is OUT OF STOCK.`;
        setValidationError(msg);
        onShowToast?.(msg, 'danger');
        return;
      }
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        unit_price: product.selling_price,
        stock_quantity: product.stock_quantity,
        quantity: 1
      }]);
    }
  };

  const updateCartQty = (productId, newQty) => {
    setValidationError('');
    const prod = products.find(p => p.id === productId);
    
    if (newQty > prod.stock_quantity && !salesPolicy.allowNegativeStockSale) {
      const msg = `Quantity limit exceeded: ${prod.name} has only ${prod.stock_quantity} units.`;
      setValidationError(msg);
      onShowToast?.(msg, 'danger');
      return;
    }

    if (newQty <= 0) {
      setCart(cart.filter(item => item.product_id !== productId));
    } else {
      setCart(cart.map(item => item.product_id === productId ? { ...item, quantity: newQty } : item));
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const tax = subtotal * (salesPolicy.standardTaxRatePct / 100);
  const surchargeAmount = (subtotal + tax) * (activeGateway.surchargePct / 100);
  const grandTotal = subtotal + tax + surchargeAmount;

  const handleCheckout = () => {
    if (cart.length === 0) return;

    // High Value Approval Trigger
    if (grandTotal > salesPolicy.highValueApprovalThreshold) {
      const largeSaleReq = {
        id: Date.now(),
        invoice_number: `INV-PEND-${Math.floor(1000 + Math.random() * 9000)}`,
        customer_name: customers.find(c => c.id === parseInt(customerId, 10))?.name || 'Walk-in Customer',
        total_amount: grandTotal,
        submitted_by: 'Cashier Staff',
        timestamp: new Date().toISOString(),
        items: cart.map(i => ({ product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price }))
      };
      setPendingLargeSales([largeSaleReq, ...pendingLargeSales]);
      setCart([]);
      onShowToast?.('warning', 'Manager Approval Required', `Sale total ($${grandTotal.toFixed(2)}) exceeds threshold of $${salesPolicy.highValueApprovalThreshold.toFixed(2)}. Submitted to Manager Queue.`);
      return;
    }

    const newSale = {
      id: Date.now(),
      invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_id: parseInt(customerId, 10),
      customer_name: customers.find(c => c.id === parseInt(customerId, 10))?.name || 'Walk-in Customer',
      total_amount: grandTotal,
      payment_status: 'PAID',
      payment_method: activeGateway.name,
      surcharge_applied: surchargeAmount,
      created_at: new Date().toISOString(),
      user_name: 'Charlie Staff',
      items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };

    onProcessSale?.(newSale);
    setActiveInvoice(newSale);
    setCart([]);
    onShowToast?.('success', 'Sale Processed', `Invoice ${newSale.invoice_number} created ($${grandTotal.toFixed(2)}).`);
  };

  // Manager Handlers
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // -------------------------------------------------------------
  // VIEW 1: EXECUTIVE MANAGER SALES GOVERNANCE & POLICY WORKBENCH
  // -------------------------------------------------------------
  if (isManager) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
              Sales Governance & Policy Control Workbench
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)' }}>
              Configure Payment Gateways, set Cashier Surcharges, define Discount Floors, and authorize High-Value Sales.
            </p>
          </div>
        </div>

        {/* Manager Navigation Bar */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-rule)', paddingBottom: '12px' }}>
          <button
            onClick={() => setManagerTab('gateways')}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              background: managerTab === 'gateways' ? 'var(--color-accent)' : 'var(--color-paper-2)',
              color: managerTab === 'gateways' ? '#fff' : 'var(--color-ink)', border: 'none'
            }}
          >
            💳 Payment Gateways & Surcharges ({gateways.filter(g => g.enabled).length} Active)
          </button>
          <button
            onClick={() => setManagerTab('policy_rules')}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              background: managerTab === 'policy_rules' ? 'var(--color-accent)' : 'var(--color-paper-2)',
              color: managerTab === 'policy_rules' ? '#fff' : 'var(--color-ink)', border: 'none'
            }}
          >
            ⚙️ Discount & Approval Rules
          </button>
          <button
            onClick={() => setManagerTab('approvals')}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              background: managerTab === 'approvals' ? 'var(--color-accent)' : 'var(--color-paper-2)',
              color: managerTab === 'approvals' ? '#fff' : 'var(--color-ink)', border: 'none'
            }}
          >
            🛡️ Pending Sale Approvals ({pendingLargeSales.length})
          </button>
          <button
            onClick={() => setManagerTab('ledger')}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              background: managerTab === 'ledger' ? 'var(--color-accent)' : 'var(--color-paper-2)',
              color: managerTab === 'ledger' ? '#fff' : 'var(--color-ink)', border: 'none'
            }}
          >
            📜 Verified Sales History Ledger
          </button>
        </div>

        {/* MANAGER TAB 1: PAYMENT GATEWAYS & SURCHARGES */}
        {managerTab === 'gateways' && (
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 14px 0' }}>
              Configure Payment Gateways & Surcharges (Customer & Supplier)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {gateways.map(g => (
                <div key={g.id} style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-xs)', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{g.name}</div>
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
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>SURCHARGE (%):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={g.surchargePct}
                      onChange={e => handleUpdateSurcharge(g.id, e.target.value)}
                      style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700' }}
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

        {/* MANAGER TAB 2: DISCOUNT & APPROVAL RULES */}
        {managerTab === 'policy_rules' && (
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px', maxWidth: '640px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0' }}>Sales Control Policy Parameters</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>MAX CASHIER DISCOUNT CEILING (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={salesPolicy.maxCashierDiscountPct}
                  onChange={e => setSalesPolicy({ ...salesPolicy, maxCashierDiscountPct: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px', fontWeight: '700' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>Cashiers cannot grant discounts above this threshold without manager sign-off.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>HIGH-VALUE SALE APPROVAL THRESHOLD ($)</label>
                <input
                  type="number"
                  step="100"
                  value={salesPolicy.highValueApprovalThreshold}
                  onChange={e => setSalesPolicy({ ...salesPolicy, highValueApprovalThreshold: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px', fontWeight: '700' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>Sales exceeding this total require manager authorization before completion.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>STANDARD TAX RATE (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={salesPolicy.standardTaxRatePct}
                  onChange={e => setSalesPolicy({ ...salesPolicy, standardTaxRatePct: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-canvas)', color: 'var(--color-text)', fontSize: '13px', fontWeight: '700' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <input
                  type="checkbox"
                  checked={salesPolicy.allowNegativeStockSale}
                  onChange={e => setSalesPolicy({ ...salesPolicy, allowNegativeStockSale: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label style={{ fontSize: '13px', fontWeight: '700' }}>Allow Cashier Sales of Out-Of-Stock Items (Negative Inventory)</label>
              </div>

              <button
                onClick={() => onShowToast?.('success', 'Policy Updated', 'Sales policy rules saved successfully.')}
                style={{ marginTop: '10px', padding: '10px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '700', cursor: 'pointer' }}
              >
                Save Sales Policy Rules
              </button>
            </div>
          </div>
        )}

        {/* MANAGER TAB 3: PENDING APPROVALS QUEUE */}
        {managerTab === 'approvals' && (
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 14px 0' }}>Pending High-Value & Discount Sale Approvals</h3>
            {pendingLargeSales.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                No pending high-value sales requiring manager sign-off.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left' }}>
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
                      <td style={{ padding: '10px' }}>{s.customer_name}</td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: '800' }}>${s.total_amount.toFixed(2)}</td>
                      <td style={{ padding: '10px' }}>{s.submitted_by}</td>
                      <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleApproveLargeSale(s.id)}
                          style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                        >
                          Approve Sale
                        </button>
                        <button
                          onClick={() => handleRejectLargeSale(s.id)}
                          style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                        >
                          Reject
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>Verified Completed Sales Ledger</h3>
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
                    <td style={{ padding: '10px' }}>{s.customer_name}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 800 }}>${s.total_amount.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>{s.payment_method}</td>
                    <td style={{ padding: '10px' }}>{s.user_name || 'Cashier Staff'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: FRONT-DESK CASHIER POS TERMINAL CHECKOUT (Staff / Sellers)
  // -------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Point of Sale (POS) Checkout Register</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            Process front-desk retail customer sales, collect payments, and print receipts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn ${staffTab === 'pos' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setStaffTab('pos')}
          >
            <ShoppingCart size={15} /> POS Terminal
          </button>
          <button 
            className={`btn ${staffTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setStaffTab('history')}
          >
            <Receipt size={15} /> Sales Receipts History
          </button>
        </div>
      </div>

      {staffTab === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          
          {/* Left Column: Product Selection Catalog */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-paper-surface)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-rule)' }}>
              <Search size={18} color="var(--color-ink-muted)" />
              <input
                type="text"
                placeholder="Search products by SKU or Name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--color-ink)', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
              {filteredProducts.map(p => (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  style={{
                    background: 'var(--color-paper-surface)',
                    border: '1px solid var(--color-rule)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    cursor: p.stock_quantity > 0 || salesPolicy.allowNegativeStockSale ? 'pointer' : 'not-allowed',
                    opacity: p.stock_quantity > 0 || salesPolicy.allowNegativeStockSale ? 1 : 0.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700 }}>{p.sku}</span>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--color-ink)' }}>{p.name}</h4>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)' }}>${p.selling_price.toFixed(2)}</span>
                    <span style={{ fontSize: '0.75rem', color: p.stock_quantity <= p.reorder_level ? 'var(--color-signal-red)' : 'var(--color-ink-muted)', fontWeight: 700 }}>
                      Stock: {p.stock_quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Checkout Cart & Gateway Selection */}
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Checkout Register</h3>

            {/* Customer Select */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>SELECT CUSTOMER</label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)', fontSize: '0.85rem' }}
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.customer_code || 'REG'})</option>
                ))}
              </select>
            </div>

            {/* Configured Payment Gateways */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink-muted)', display: 'block', marginBottom: '4px' }}>
                PAYMENT GATEWAY ({activeGateway.surchargePct > 0 ? `+${activeGateway.surchargePct}% Surcharge` : 'No Surcharge'})
              </label>
              <select
                value={selectedGatewayId}
                onChange={e => setSelectedGatewayId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-rule)', background: 'var(--color-paper-2)', color: 'var(--color-ink)', fontSize: '0.85rem', fontWeight: '700' }}
              >
                {gateways.filter(g => g.enabled && (g.usage === 'CUSTOMER' || g.usage === 'BOTH')).map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.surchargePct > 0 ? `(+${g.surchargePct}%)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-ink-dim)', fontSize: '0.85rem' }}>
                  Cart is empty. Click items to add.
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-paper-2)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                        ${item.unit_price.toFixed(2)} each
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateCartQty(item.product_id, item.quantity - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Minus size={12} /></button>
                      <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>{item.quantity}</span>
                      <button onClick={() => updateCartQty(item.product_id, item.quantity + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={12} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Complete Sale */}
            <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <span>Tax ({salesPolicy.standardTaxRatePct}%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              {activeGateway.surchargePct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'monospace', color: '#f59e0b' }}>
                  <span>Gateway Surcharge ({activeGateway.surchargePct}%):</span>
                  <span>+${surchargeAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-signal-green)', marginTop: '4px' }}>
                <span>GRAND TOTAL:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                style={{ width: '100%', marginTop: '10px', padding: '12px', fontSize: '0.95rem' }}
              >
                <CheckCircle size={18} /> Complete Sale (${grandTotal.toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      )}

      {staffTab === 'history' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>Verified Completed Sales Receipts</h3>
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
                  <td style={{ padding: '10px' }}>{s.customer_name}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 800 }}>${s.total_amount.toFixed(2)}</td>
                  <td style={{ padding: '10px' }}>{s.payment_method}</td>
                  <td style={{ padding: '10px' }}>{s.user_name || 'Cashier Staff'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeInvoice && (
        <ReceiptModal invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />
      )}
    </div>
  );
}
