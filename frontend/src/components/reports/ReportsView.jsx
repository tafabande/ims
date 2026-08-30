import React from 'react';
import { BarChart3, TrendingUp, DollarSign, AlertTriangle, FileText, Download } from 'lucide-react';

export default function ReportsView({ products, sales, purchases, categories, onShowToast }) {
  // Financial Calculations
  const costValuation = products.reduce((acc, p) => acc + (p.stock_quantity * p.purchase_price), 0);
  const retailValuation = products.reduce((acc, p) => acc + (p.stock_quantity * p.selling_price), 0);
  const potentialProfit = retailValuation - costValuation;

  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  const totalPurchaseExpenses = purchases.reduce((acc, p) => acc + (p.total_amount || 0), 0);

  // Calculate actual COGS based on product cost basis
  const totalCOGS = sales.reduce((acc, sale) => {
    if (Array.isArray(sale.items) && sale.items.length > 0) {
      const saleCost = sale.items.reduce((itemAcc, item) => {
        const prod = products.find(p => p.id === item.product_id || p.name === item.name);
        const unitCost = prod?.purchase_price ?? (item.price ? item.price * 0.75 : 0);
        return itemAcc + (unitCost * (item.qty || item.quantity || 1));
      }, 0);
      return acc + saleCost;
    }
    return acc + ((sale.total_amount || 0) * 0.75);
  }, 0);
  const grossProfit = Math.max(0, totalSalesRevenue - totalCOGS);

  const lowStockItems = products.filter(p => p.stock_quantity <= p.reorder_level);

  const exportReportSummaryCSV = () => {
    const headers = ["Category", "SKU Count", "Units Stocked", "Cost Basis ($)", "Retail Value ($)", "Avg Margin (%)"];
    const rows = categories.map(cat => {
      const catProducts = products.filter(p => p.category_id === cat.id);
      const totalUnits = catProducts.reduce((acc, p) => acc + p.stock_quantity, 0);
      const catCost = catProducts.reduce((acc, p) => acc + (p.stock_quantity * p.purchase_price), 0);
      const catRetail = catProducts.reduce((acc, p) => acc + (p.stock_quantity * p.selling_price), 0);
      const avgMargin = catCost > 0 ? (((catRetail - catCost) / catRetail) * 100).toFixed(1) : 0;
      return [`"${cat.name}"`, catProducts.length, totalUnits, catCost.toFixed(2), catRetail.toFixed(2), avgMargin];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ims_executive_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('info', 'Report Exported', 'Downloaded executive category summary CSV.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Business Reports & Financial Analytics</h2>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            Comprehensive reporting on inventory valuation, profit & loss, and reorder projections.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={exportReportSummaryCSV}>
            <Download size={15} /> Export Report CSV
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <FileText size={16} /> Print Full PDF Manifest
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="hm-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>STOCK VALUATION (COST)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)', margin: '8px 0' }}>
            ${costValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)' }}>Cost Capital Stocked</div>
        </div>

        <div className="hm-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>RETAIL SALES VALUE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', margin: '8px 0' }}>
            ${retailValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)' }}>Expected full sell-through</div>
        </div>

        <div className="hm-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>GROSS SALES REVENUE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-green)', margin: '8px 0' }}>
            ${totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-signal-green)', fontFamily: 'var(--font-mono)' }}>From {sales.length} invoices</div>
        </div>

        <div className="hm-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>PROJECTED STOCK MARGIN</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-signal-cyan)', margin: '8px 0' }}>
            +${potentialProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-dim)', fontFamily: 'var(--font-mono)' }}>Gross profit potential</div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="hm-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>Category Inventory Distribution & Profitability</h3>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>SKU Count</th>
                <th>Units Stocked</th>
                <th>Cost Basis ($)</th>
                <th>Retail Value ($)</th>
                <th>Avg Margin</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => {
                const catProducts = products.filter(p => p.category_id === cat.id);
                const totalUnits = catProducts.reduce((acc, p) => acc + p.stock_quantity, 0);
                const catCost = catProducts.reduce((acc, p) => acc + (p.stock_quantity * p.purchase_price), 0);
                const catRetail = catProducts.reduce((acc, p) => acc + (p.stock_quantity * p.selling_price), 0);
                const avgMargin = catCost > 0 ? (((catRetail - catCost) / catRetail) * 100).toFixed(1) : 0;

                return (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 700 }}>{cat.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{catProducts.length} SKUs</td>
                    <td><span className="badge badge-info">{totalUnits} Units</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>${catCost.toFixed(2)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>${catRetail.toFixed(2)}</td>
                    <td style={{ color: 'var(--color-signal-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>+{avgMargin}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Procurement Recommendations */}
      <div className="hm-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--color-signal-amber)" /> Automated Low Stock Procurement Recommendations
        </h3>

        {lowStockItems.length === 0 ? (
          <div style={{ color: 'var(--color-ink-dim)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            No purchase recommendations required. All stock thresholds operating normally.
          </div>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Recommended Order Qty</th>
                  <th>Estimated Reorder Cost ($)</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map(item => {
                  const recQty = Math.max(10, (item.reorder_level * 3) - item.stock_quantity);
                  const estCost = recQty * item.purchase_price;

                  return (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>{item.sku}</td>
                      <td style={{ fontWeight: 700 }}>{item.name}</td>
                      <td><span className="badge badge-warning">{item.stock_quantity} {item.unit}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{item.reorder_level} {item.unit}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-signal-cyan)' }}>+{recQty} Units</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>${estCost.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
