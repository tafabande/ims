import React, { useState } from 'react';
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  X,
  Download,
  PackageCheck
} from 'lucide-react';
import { can } from '../../utils/permissions';

export default function PurchasesView({ 
  purchases, 
  suppliers, 
  products, 
  onCreatePurchase, 
  onReceivePurchase, 
  currentRole,
  onShowToast
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receivingPo, setReceivingPo] = useState(null);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || 1);
  const [poItems, setPoItems] = useState([
    { product_id: products[0]?.id || 1, quantity: 10, unit_price: products[0]?.purchase_price || 100 }
  ]);

  const handleAddItem = () => {
    const defaultProduct = products[0];
    setPoItems([...poItems, { product_id: defaultProduct.id, quantity: 5, unit_price: defaultProduct.purchase_price }]);
  };

  const handleRemoveItem = (index) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...poItems];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === parseInt(value, 10));
      updated[index].product_id = parseInt(value, 10);
      updated[index].unit_price = prod ? prod.purchase_price : 0;
    } else {
      updated[index][field] = parseFloat(value) || 0;
    }
    setPoItems(updated);
  };

  const totalPoAmount = poItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === parseInt(supplierId, 10));

    const formattedItems = poItems.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      return {
        product_id: item.product_id,
        product_name: prod ? prod.name : 'Unknown',
        quantity: parseInt(item.quantity, 10),
        unit_price: parseFloat(item.unit_price)
      };
    });

    onCreatePurchase({
      supplier_id: parseInt(supplierId, 10),
      supplier_name: supplier ? supplier.name : 'Supplier',
      total_amount: totalPoAmount,
      items: formattedItems
    });

    setIsModalOpen(false);
    setPoItems([{ product_id: products[0]?.id || 1, quantity: 10, unit_price: products[0]?.purchase_price || 100 }]);
    if (onShowToast) onShowToast(`Issued Purchase Order for $${totalPoAmount.toFixed(2)}.`, 'success');
  };

  const confirmReceivePo = (po) => {
    setReceivingPo(po);
  };

  const executeReceivePo = () => {
    if (!receivingPo) return;
    onReceivePurchase(receivingPo.id);
    if (onShowToast) onShowToast(`Stock received and added to inventory for ${receivingPo.po_number}.`, 'success');
    setReceivingPo(null);
  };

  const exportCSV = () => {
    const headers = ["PO Number", "Supplier", "Status", "Total Value", "Created Date"];
    const rows = purchases.map(p => [p.po_number, `"${p.supplier_name}"`, p.status, p.total_amount, p.created_at]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchase_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Purchase Orders & Stock Inbound</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            Supplier procurements, receiving workflows, and line item manifests.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={15} /> Export Orders CSV
          </button>
          {can(currentRole, 'purchases.create') && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} /> Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* PO List Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {purchases.map(po => (
          <div key={po.id} className="hm-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-accent)' }}>
                  {po.po_number}
                </span>
                <span style={{ fontWeight: 700 }}>{po.supplier_name}</span>
                <span className={`badge ${po.status === 'RECEIVED' ? 'badge-success' : 'badge-warning'}`}>
                  {po.status === 'RECEIVED' ? <CheckCircle size={12} /> : <Clock size={12} />} {po.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>PO TOTAL VALUE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-signal-green)' }}>
                    ${po.total_amount.toFixed(2)}
                  </div>
                </div>

                {po.status === 'PENDING' && can(currentRole, 'purchases.receive') && (
                  <button 
                    className="btn btn-success"
                    onClick={() => confirmReceivePo(po)}
                    title="Receive goods and increment stock"
                  >
                    <PackageCheck size={16} /> Receive Stock
                  </button>
                )}
              </div>
            </div>

            {/* PO Line Items */}
            <div style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-ink-muted)', marginBottom: '8px' }}>
                LINE MANIFEST & EXPECTED QUANTITIES:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {po.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                      Expected: <strong>{item.quantity} units</strong> @ ${item.unit_price.toFixed(2)} = ${ (item.quantity * item.unit_price).toFixed(2) }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal 1: Issue PO */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '24px', maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create New Purchase Order</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">Select Vendor / Supplier *</label>
                <select
                  className="input-field"
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contact_person})</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>PO Line Items *</label>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={handleAddItem}>
                    + Add Item Row
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {poItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                      <select
                        className="input-field"
                        value={item.product_id}
                        onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        className="input-field font-mono"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                      />

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost $"
                        className="input-field font-mono"
                        value={item.unit_price}
                        onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                      />

                      <button type="button" onClick={() => handleRemoveItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-signal-red)', cursor: 'pointer' }}>
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-rule)', paddingTop: '12px', marginTop: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>PO TOTAL VALUE: </span>
                  <strong style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)' }}>
                    ${totalPoAmount.toFixed(2)}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Purchase Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Receive Stock Consequence Confirmation */}
      {receivingPo && (
        <div className="modal-overlay" onClick={() => setReceivingPo(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '24px', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Confirm Stock Inbound Receipt</h3>
              <button onClick={() => setReceivingPo(null)} style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-muted)', marginBottom: '16px' }}>
              You are receiving purchase order <strong>{receivingPo.po_number}</strong> from <strong>{receivingPo.supplier_name}</strong>.
            </p>

            <div style={{ background: 'var(--color-paper-2)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '8px' }}>
                INBOUND STOCK MANIFEST TO BE ADDED:
              </div>
              {receivingPo.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                  <span>{item.product_name}</span>
                  <span style={{ color: 'var(--color-signal-green)', fontWeight: 700 }}>+{item.quantity} units</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setReceivingPo(null)}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={executeReceivePo}>
                Receive Stock Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
