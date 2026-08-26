import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  X, 
  AlertTriangle, 
  Barcode,
  Download
} from 'lucide-react';
import ThermalLabelModal from './ThermalLabelModal';

export default function ProductsView({ 
  products = [], 
  categories = [], 
  suppliers = [], 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  currentRole,
  onShowToast
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [thermalProduct, setThermalProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: categories?.[0]?.id || 1,
    supplier_id: suppliers?.[0]?.id || 1,
    purchase_price: '',
    selling_price: '',
    stock_quantity: 0,
    reorder_level: 5,
    unit: 'Units',
    barcode: ''
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      description: '',
      category_id: categories?.[0]?.id || 1,
      supplier_id: suppliers?.[0]?.id || 1,
      purchase_price: '',
      selling_price: '',
      stock_quantity: 10,
      reorder_level: 5,
      unit: 'Units',
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      supplier_id: product.supplier_id,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      reorder_level: product.reorder_level,
      unit: product.unit || 'Units',
      barcode: product.barcode || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        selling_price: parseFloat(formData.selling_price),
        stock_quantity: parseInt(formData.stock_quantity, 10),
        reorder_level: parseInt(formData.reorder_level, 10),
      });
      if (onShowToast) onShowToast('success', 'Product Updated', `Saved parameters for ${formData.name}.`);
    } else {
      onAddProduct({
        ...formData,
        id: Date.now(),
        purchase_price: parseFloat(formData.purchase_price),
        selling_price: parseFloat(formData.selling_price),
        stock_quantity: parseInt(formData.stock_quantity, 10),
        reorder_level: parseInt(formData.reorder_level, 10),
        created_at: new Date().toISOString()
      });
      if (onShowToast) onShowToast('success', 'Product Created', `Added ${formData.name} to SKU catalog.`);
    }
    setIsModalOpen(false);
  };

  const exportCSV = () => {
    const headers = ["SKU", "Name", "Category", "Stock", "Unit", "Buy Price", "Sell Price", "Barcode"];
    const rows = products.map(p => {
      const cat = categories.find(c => c.id === p.category_id)?.name || 'N/A';
      return [p.sku, `"${p.name}"`, `"${cat}"`, p.stock_quantity, p.unit, p.purchase_price, p.selling_price, p.barcode];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ims_product_catalog_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('info', 'CSV Exported', 'Product catalog downloaded successfully.');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.barcode.includes(searchTerm);
    const matchesCat = selectedCategory === 'ALL' || p.category_id === parseInt(selectedCategory, 10);
    const matchesLow = !onlyLowStock || p.stock_quantity <= p.reorder_level;
    return matchesSearch && matchesCat && matchesLow;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Products Catalog Management</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            Maintain SKU metadata, price margins, barcodes, and thermal label stickers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={15} /> Export Catalog CSV
          </button>

          {currentRole !== 'STAFF' && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={18} /> Add New Product
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="hm-panel" style={{ padding: '16px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '38px' }}
            placeholder="Search by Product Name, SKU, or Barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--color-ink-muted)" />
          <select
            className="input-field"
            style={{ width: '180px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`btn ${onlyLowStock ? 'btn-danger' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem' }}
          >
            <AlertTriangle size={14} /> {onlyLowStock ? 'Showing Low Stock' : 'Filter Low Stock'}
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="hm-panel" style={{ padding: '0px', overflow: 'hidden' }}>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Details</th>
                <th>Category</th>
                <th>Stock Level</th>
                <th>Buy Price</th>
                <th>Sell Price</th>
                <th>Margin</th>
                <th>Barcode Label</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-ink-dim)' }}>
                    No products matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const category = categories.find(c => c.id === product.category_id);
                  const margin = ((product.selling_price - product.purchase_price) / product.selling_price * 100).toFixed(1);
                  const isLow = product.stock_quantity <= product.reorder_level;

                  return (
                    <tr key={product.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>
                        {product.sku}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)' }}>{product.description}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{category?.name || 'Uncategorized'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>{product.stock_quantity}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)' }}>{product.unit}</span>
                          {isLow && (
                            <span className="badge badge-warning" title="Below Reorder Level">
                              <AlertTriangle size={12} /> Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>${product.purchase_price.toFixed(2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>${product.selling_price.toFixed(2)}</td>
                      <td>
                        <span style={{ color: margin > 20 ? 'var(--color-signal-green)' : 'var(--color-signal-amber)', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                          +{margin}%
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={() => setThermalProduct(product)}
                          title="Generate Thermal Label Sticker"
                        >
                          <Barcode size={14} color="var(--color-accent)" /> Label
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {currentRole !== 'STAFF' && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEdit(product)} title="Edit Product">
                              <Edit3 size={14} />
                            </button>
                          )}
                          {currentRole === 'ADMIN' && (
                            <button className="btn btn-sm btn-danger" onClick={() => {
                              onDeleteProduct(product.id);
                              if (onShowToast) onShowToast('danger', 'Product Deleted', `Removed ${product.name} from database.`);
                            }} title="Delete Product">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Product */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {editingProduct ? 'Edit Product Parameters' : 'Add New Product Record'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="input-label">SKU Code *</label>
                  <input
                    type="text"
                    className="input-field font-mono"
                    required
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Barcode / EAN *</label>
                  <input
                    type="text"
                    className="input-field font-mono"
                    required
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Product Name *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  placeholder="e.g. Lenovo ThinkPad X1 Carbon"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="input-label">Description</label>
                <textarea
                  className="input-field"
                  rows="2"
                  placeholder="Technical specifications, model info..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="input-label">Category *</label>
                  <select
                    className="input-field"
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: parseInt(e.target.value, 10) })}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Primary Supplier</label>
                  <select
                    className="input-field"
                    value={formData.supplier_id}
                    onChange={e => setFormData({ ...formData, supplier_id: parseInt(e.target.value, 10) })}
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="input-label">Buy Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field font-mono"
                    required
                    value={formData.purchase_price}
                    onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Sell Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field font-mono"
                    required
                    value={formData.selling_price}
                    onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Reorder Level *</label>
                  <input
                    type="number"
                    className="input-field font-mono"
                    required
                    value={formData.reorder_level}
                    onChange={e => setFormData({ ...formData, reorder_level: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thermal Label Generator */}
      {thermalProduct && (
        <ThermalLabelModal
          product={thermalProduct}
          onClose={() => setThermalProduct(null)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
}
