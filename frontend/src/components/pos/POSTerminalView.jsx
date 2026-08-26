import React, { useState } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Receipt,
  CheckCircle,
  User,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import ReceiptModal from '../sales/ReceiptModal';

export default function POSTerminalView({
  products = [],
  customers = [],
  sales = [],
  onProcessSale,
  onShowToast,
  gateways = [
    { id: 'cash', name: 'Cash (USD / ZiG)', type: 'CASH', surchargePct: 0.0, enabled: true, usage: 'BOTH' },
    { id: 'ecocash', name: 'EcoCash Mobile Money', type: 'MOBILE_WALLET', surchargePct: 2.5, enabled: true, usage: 'BOTH' },
    { id: 'telecash', name: 'Telecash Mobile', type: 'MOBILE_WALLET', surchargePct: 2.0, enabled: true, usage: 'CUSTOMER' },
    { id: 'onemoney', name: 'OneMoney NetOne', type: 'MOBILE_WALLET', surchargePct: 2.0, enabled: true, usage: 'CUSTOMER' },
    { id: 'innbucks', name: 'InnBucks Retail Voucher', type: 'RETAIL_WALLET', surchargePct: 1.0, enabled: true, usage: 'BOTH' },
    { id: 'card_local', name: 'Debit / Credit Card (Local EFTPOS)', type: 'CARD', surchargePct: 1.5, enabled: true, usage: 'BOTH' },
    { id: 'zipit', name: 'Inter-Bank ZIPIT Transfer', type: 'BANK_INTERBANK', surchargePct: 1.0, enabled: true, usage: 'BOTH' },
    { id: 'rtgs', name: 'RTGS Electronic Bank Transfer', type: 'BANK_DOMESTIC', surchargePct: 0.5, enabled: true, usage: 'BOTH' }
  ],
  salesPolicy = {
    maxCashierDiscountPct: 5.0,
    highValueApprovalThreshold: 1000.00,
    standardTaxRatePct: 10.0,
    zigExchangeRate: 13.50,
    allowNegativeStockSale: false
  },
  onPendingApprovalSubmit
}) {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(customers[0]?.id || 1);
  const [selectedGatewayId, setSelectedGatewayId] = useState('cash');
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [validationError, setValidationError] = useState('');

  const activeGateway = gateways.find(g => g.id === selectedGatewayId) || gateways[0] || { surchargePct: 0, name: 'Cash' };

  const addToCart = (product) => {
    setValidationError('');
    const existing = cart.find(item => item.product_id === product.id);

    if (existing) {
      if (existing.quantity + 1 > product.stock_quantity && !salesPolicy.allowNegativeStockSale) {
        const msg = `Unable to add unit: ${product.name} has only ${product.stock_quantity} units available.`;
        setValidationError(msg);
        onShowToast?.('danger', 'Stock Exceeded', msg);
        return;
      }
      setCart(cart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stock_quantity < 1 && !salesPolicy.allowNegativeStockSale) {
        const msg = `Cannot sell ${product.name}: Item is OUT OF STOCK.`;
        setValidationError(msg);
        onShowToast?.('danger', 'Out of Stock', msg);
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

    if (newQty > (prod?.stock_quantity || 0) && !salesPolicy.allowNegativeStockSale) {
      const msg = `Quantity limit exceeded: ${prod?.name} has only ${prod?.stock_quantity} units available.`;
      setValidationError(msg);
      onShowToast?.('danger', 'Stock Exceeded', msg);
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
      onPendingApprovalSubmit?.(largeSaleReq);
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
      user_name: 'Cashier Staff',
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

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', margin: 0 }}>
            Point of Sale (POS) Checkout Register
          </h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Front-desk sales terminal for cashiers to process retail sales, collect payments, and issue customer receipts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('pos')}
          >
            <ShoppingCart size={15} /> POS Terminal
          </button>
          <button
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            <Receipt size={15} /> Sales Receipts History
          </button>
        </div>
      </div>

      {validationError && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-signal-red)', borderRadius: 'var(--radius-sm)', color: 'var(--color-signal-red)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      {activeTab === 'pos' && (
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
                    gap: '10px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700 }}>{p.sku}</span>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--color-ink)' }}>{p.name}</h4>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)' }}>${p.selling_price.toFixed(2)}</span>
                    <span style={{ fontSize: '0.75rem', color: p.stock_quantity <= (p.reorder_level || 0) ? 'var(--color-signal-red)' : 'var(--color-ink-muted)', fontWeight: 700 }}>
                      Stock: {p.stock_quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Checkout Cart & Gateway Selection */}
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Checkout Register</h3>

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
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-ink)' }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                        ${item.unit_price.toFixed(2)} each
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateCartQty(item.product_id, item.quantity - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)' }}><Minus size={12} /></button>
                      <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-ink)' }}>{item.quantity}</span>
                      <button onClick={() => updateCartQty(item.product_id, item.quantity + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)' }}><Plus size={12} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Complete Sale */}
            <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--color-ink)' }}>
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--color-ink)' }}>
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

      {activeTab === 'history' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', color: 'var(--color-ink)' }}>Verified Completed Sales Receipts</h3>
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

      {activeInvoice && (
        <ReceiptModal invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />
      )}
    </div>
  );
}
