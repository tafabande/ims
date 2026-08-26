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
  QrCode, 
  User, 
  Download,
  AlertTriangle,
  Printer
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import { can } from '../../utils/permissions';

export default function SalesView({ 
  products, 
  customers, 
  sales, 
  onProcessSale, 
  onExportCSV,
  currentRole,
  onShowToast
}) {
  const [activeTab, setActiveTab] = useState('pos'); // pos or history
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(customers[0]?.id || 1);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Manager Surcharge Setup State
  const [ecoSurchargePct, setEcoSurchargePct] = useState(2.5); // EcoCash 2.5% surcharge
  const [cardSurchargePct, setCardSurchargePct] = useState(1.5); // Card 1.5% surcharge
  const [showSurchargeModal, setShowSurchargeModal] = useState(false);

  const isManager = can(currentRole, 'attention.decide');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const addToCart = (product) => {
    setValidationError('');
    const existing = cart.find(item => item.product_id === product.id);
    
    if (existing) {
      if (existing.quantity + 1 > product.stock_quantity) {
        const msg = `Unable to add unit: ${product.name} has only ${product.stock_quantity} units available in stock. Reduce quantity or reorder stock.`;
        setValidationError(msg);
        if (onShowToast) onShowToast(msg, 'danger');
        return;
      }
      setCart(cart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stock_quantity < 1) {
        const msg = `Cannot sell ${product.name}: Item is currently OUT OF STOCK. Reorder stock to resume sales.`;
        setValidationError(msg);
        if (onShowToast) onShowToast(msg, 'danger');
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
    
    if (newQty > prod.stock_quantity) {
      const msg = `Quantity bound exceeded: ${prod.name} has only ${prod.stock_quantity} units available. Reduce cart quantity to ${prod.stock_quantity} or less.`;
      setValidationError(msg);
      if (onShowToast) onShowToast(msg, 'danger');
      return;
    }
    
    if (newQty <= 0) {
      setCart(cart.filter(item => item.product_id !== productId));
    } else {
      setCart(cart.map(item => item.product_id === productId ? { ...item, quantity: newQty } : item));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const tax = subtotal * 0.10; // 10% tax
  const surchargePct = paymentMethod === 'EcoCash Mobile Money' ? ecoSurchargePct : (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') ? cardSurchargePct : 0;
  const surchargeAmount = (subtotal + tax) * (surchargePct / 100);
  const grandTotal = subtotal + tax + surchargeAmount;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setValidationError('');

    // Double check stock
    for (const item of cart) {
      const prod = products.find(p => p.id === item.product_id);
      if (item.quantity > prod.stock_quantity) {
        const msg = `Sale blocked: ${prod.name} has only ${prod.stock_quantity} units available, but cart contains ${item.quantity}. Reduce quantity to ${prod.stock_quantity} or less.`;
        setValidationError(msg);
        if (onShowToast) onShowToast(msg, 'danger');
        return;
      }
    }

    const customer = customers.find(c => c.id === parseInt(customerId, 10));

    const newSale = {
      id: Date.now(),
      invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_id: parseInt(customerId, 10),
      customer_name: customer ? customer.name : 'Walk-in Customer',
      total_amount: grandTotal,
      payment_status: 'PAID',
      payment_method: paymentMethod,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      user_name: currentRole === 'ADMIN' ? 'Alice Admin' : currentRole === 'MANAGER' ? 'Bob Manager' : 'Charlie Staff',
      items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };

    onProcessSale(newSale);
    setActiveInvoice(newSale);
    setCart([]);
    if (onShowToast) onShowToast(`Sale completed successfully! Invoice ${newSale.invoice_number} created ($${grandTotal.toFixed(2)}).`, 'success');
  };

  const exportSalesCSV = () => {
    const headers = ["Invoice #", "Customer", "Total Amount", "Payment Method", "Issued By", "Timestamp"];
    const rows = sales.map(s => [
      s.invoice_number,
      `"${s.customer_name}"`,
      s.total_amount,
      s.payment_method,
      `"${s.user_name || s.created_by}"`,
      `"${new Date(s.created_at || s.timestamp).toLocaleString()}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Sales & POS Terminal</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            Point of Sale terminal, customer checkout, and tax receipt generator.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setActiveTab('pos')}
          >
            <ShoppingCart size={15} /> POS Terminal Checkout
          </button>
          <button 
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setActiveTab('history')}
          >
            <Receipt size={15} /> Sales History & Invoices ({sales.length})
          </button>
        </div>
      </div>

      {/* POS View Mode */}
      {activeTab === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left Column: Product Selection Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="hm-panel" style={{ padding: '14px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Search Product Name, SKU, or Scan Barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {validationError && (
              <div style={{
                background: 'var(--color-accent-subtle)',
                border: '1px solid var(--color-signal-red)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: 'var(--color-signal-red)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} /> {validationError}
              </div>
            )}

            {/* Product Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
              maxHeight: 'calc(100vh - 280px)',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {filteredProducts.map(product => {
                const isOut = product.stock_quantity === 0;
                const isLow = product.stock_quantity <= product.reorder_level;

                return (
                  <div
                    key={product.id}
                    className="hm-card"
                    onClick={() => !isOut && addToCart(product)}
                    style={{
                      padding: '14px',
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      opacity: isOut ? 0.5 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                      minHeight: '130px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700 }}>
                        {product.sku}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '2px', lineHeight: '1.2' }}>
                        {product.name}
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                          ${product.selling_price.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: isOut ? 'var(--color-signal-red)' : isLow ? 'var(--color-signal-amber)' : 'var(--color-ink-muted)' }}>
                          Stock: {product.stock_quantity} {product.unit}
                        </div>
                      </div>

                      <button
                        className={`btn btn-sm ${isOut ? 'btn-secondary' : 'btn-primary'}`}
                        disabled={isOut}
                        style={{ padding: '4px 8px' }}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Checkout Cart Summary */}
          <div className="hm-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 'calc(100vh - 210px)' }}>
            <div style={{ borderBottom: '1px solid var(--color-rule)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} color="var(--color-accent)" /> Active Cart Summary
              </h3>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                {cart.reduce((a, b) => a + b.quantity, 0)} Items
              </span>
            </div>

            {/* Customer & Payment Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label className="input-label">Customer Record</label>
                <select
                  className="input-field"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email || c.phone || 'Walk-in'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {['Cash', 'EcoCash Mobile Money', 'Credit Card', 'Debit Card'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '6px' }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-ink-dim)', fontSize: '0.85rem' }}>
                  Cart is empty.<br />Click products on the left to add items to checkout.
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-paper-surface)', borderRadius: 'var(--radius-xs)', padding: '2px' }}>
                        <button onClick={() => updateCartQty(item.product_id, item.quantity - 1)} style={{ background: 'none', border: 'none', color: 'var(--color-ink)', cursor: 'pointer', padding: '2px 4px' }}>
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', minWidth: '20px', textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button onClick={() => updateCartQty(item.product_id, item.quantity + 1)} style={{ background: 'none', border: 'none', color: 'var(--color-ink)', cursor: 'pointer', padding: '2px 4px' }}>
                          <Plus size={12} />
                        </button>
                      </div>

                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem', width: '60px', textAlign: 'right' }}>
                        ${(item.quantity * item.unit_price).toFixed(2)}
                      </div>

                      <button onClick={() => removeFromCart(item.product_id)} style={{ background: 'none', border: 'none', color: 'var(--color-signal-red)', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Complete Sale Button */}
            <div style={{ borderTop: '1px solid var(--color-rule)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>Estimated Tax (10%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)', marginTop: '4px' }}>
                <span>SALE TOTAL:</span>
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

      {/* Sales History View Mode */}
      {activeTab === 'history' && (
        <div className="hm-panel" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              Completed Sales Transactions Ledger
            </div>
            <button className="btn btn-secondary btn-sm" onClick={exportSalesCSV}>
              <Download size={14} /> Export Sales CSV
            </button>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Sale Date & Time</th>
                  <th>Customer Name</th>
                  <th>Payment Method</th>
                  <th>Issued By</th>
                  <th>Sale Total</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>
                      {sale.invoice_number}
                    </td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                      {new Date(sale.created_at || sale.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700 }}>{sale.customer_name}</td>
                    <td><span className="badge badge-info">{sale.payment_method}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{sale.user_name || sale.created_by || 'Cashier'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-signal-green)' }}>
                      ${sale.total_amount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveInvoice(sale)}
                      >
                        <Printer size={12} /> View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {activeInvoice && (
        <ReceiptModal
          sale={activeInvoice}
          onClose={() => setActiveInvoice(null)}
        />
      )}
    </div>
  );
}
